package com.vinyas.urlshortener.service;

import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import com.vinyas.urlshortener.component.Base62;
import com.vinyas.urlshortener.component.CachedRedirect;
import com.vinyas.urlshortener.component.ClickEventRecorder;
import com.vinyas.urlshortener.component.RedirectCache;
import com.vinyas.urlshortener.component.SnowflakeIdGenerator;
import com.vinyas.urlshortener.component.UrlShortenerMetrics;
import com.vinyas.urlshortener.config.AppProperties;
import com.vinyas.urlshortener.dto.CreateUrlRequest;
import com.vinyas.urlshortener.dto.DailyClickStat;
import com.vinyas.urlshortener.dto.LinkItemResponse;
import com.vinyas.urlshortener.dto.PaginatedUrlsResponse;
import com.vinyas.urlshortener.dto.ReferrerStat;
import com.vinyas.urlshortener.dto.ResolvedUrl;
import com.vinyas.urlshortener.dto.UrlDetailsResponse;
import com.vinyas.urlshortener.dto.UrlResponse;
import com.vinyas.urlshortener.entity.UrlEntity;
import com.vinyas.urlshortener.exception.ApiException;
import com.vinyas.urlshortener.exception.CodeAlreadyExistsException;
import com.vinyas.urlshortener.exception.IdGenerationException;
import com.vinyas.urlshortener.exception.InvalidExpiryException;
import com.vinyas.urlshortener.exception.UrlExpiredException;
import com.vinyas.urlshortener.exception.UrlNotFoundException;
import com.vinyas.urlshortener.repository.UrlRepository;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class UrlService {

    private static final Logger log = LoggerFactory.getLogger(UrlService.class);
    private static final int MAX_GENERATED_ATTEMPTS = 3;
    private static final Pattern SHORT_CODE_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{3,15}$");
    private static final long MIN_EXPIRY_LEAD_SECONDS = 1;

    private final UrlRepository urlRepository;
    private final SnowflakeIdGenerator idGenerator;
    private final UrlValidator urlValidator;
    private final CustomCodeValidator customCodeValidator;
    private final AppProperties appProperties;
    private final RedirectCache redirectCache;
    private final UrlShortenerMetrics metrics;
    private final Clock clock;
    private final TransactionTemplate transactionTemplate;
    private final JdbcTemplate jdbcTemplate;
    private final ClickEventRecorder clickEventRecorder;

    @Autowired
    public UrlService(
            UrlRepository urlRepository,
            SnowflakeIdGenerator idGenerator,
            UrlValidator urlValidator,
            CustomCodeValidator customCodeValidator,
            AppProperties appProperties,
            RedirectCache redirectCache,
            UrlShortenerMetrics metrics,
            Clock clock,
            PlatformTransactionManager transactionManager,
            JdbcTemplate jdbcTemplate,
            ClickEventRecorder clickEventRecorder) {
        this.urlRepository = urlRepository;
        this.idGenerator = idGenerator;
        this.urlValidator = urlValidator;
        this.customCodeValidator = customCodeValidator;
        this.appProperties = appProperties;
        this.redirectCache = redirectCache;
        this.metrics = metrics;
        this.clock = clock;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.transactionTemplate.setTimeout(5);
        this.jdbcTemplate = jdbcTemplate;
        this.clickEventRecorder = clickEventRecorder;
    }

    public UrlService(
            UrlRepository urlRepository,
            SnowflakeIdGenerator idGenerator,
            UrlValidator urlValidator,
            CustomCodeValidator customCodeValidator,
            AppProperties appProperties,
            RedirectCache redirectCache,
            UrlShortenerMetrics metrics,
            Clock clock,
            PlatformTransactionManager transactionManager) {
        this(urlRepository, idGenerator, urlValidator, customCodeValidator, appProperties,
                redirectCache, metrics, clock, transactionManager, null, null);
    }

    public UrlResponse create(CreateUrlRequest request) {
        return create(request, null);
    }

    public UrlResponse create(CreateUrlRequest request, String ownerId) {
        boolean custom = request.customCode() != null;
        Timer.Sample sample = metrics.startTimer();
        String result = "success";
        try {
            String originalUrl = urlValidator.validate(request.originalUrl());
            String customCode = customCodeValidator.validate(request.customCode());
            Instant expiresAt = validateExpiresAt(request.expiresAt());

            UrlResponse response = customCode != null
                    ? createWithCustomCode(originalUrl, customCode, expiresAt, ownerId)
                    : createWithGeneratedCode(originalUrl, expiresAt, ownerId);

            // Write-through: also replaces any negative cache entry for this code.
            redirectCache.put(response.shortCode(), response.originalUrl(), response.expiresAt());
            return response;
        } catch (ApiException ex) {
            result = ex.getCode();
            throw ex;
        } catch (RuntimeException ex) {
            result = "INTERNAL_ERROR";
            throw ex;
        } finally {
            metrics.recordCreate(result, custom);
            metrics.stopCreateTimer(sample, custom);
        }
    }

    public PaginatedUrlsResponse listUrls(String ownerId, String search, int page, int size) {
        if (clickEventRecorder != null) {
            clickEventRecorder.flush();
        }

        List<UrlEntity> all;
        if (ownerId != null && !ownerId.isBlank()) {
            all = new ArrayList<>(urlRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId));
            if (all.isEmpty() && "calm_live_demo_key_99x".equals(ownerId)) {
                all = seedDemoLinksIfEmpty();
            }
        } else {
            all = new ArrayList<>(urlRepository.findAll());
            all.sort((a, b) -> {
                Instant ca = a.getCreatedAt() != null ? a.getCreatedAt() : Instant.EPOCH;
                Instant cb = b.getCreatedAt() != null ? b.getCreatedAt() : Instant.EPOCH;
                return cb.compareTo(ca);
            });
        }

        if (search != null && !search.isBlank()) {
            String term = search.trim().toLowerCase();
            all = all.stream()
                    .filter(u -> u.getShortCode().toLowerCase().contains(term) ||
                            u.getOriginalUrl().toLowerCase().contains(term))
                    .collect(Collectors.toList());
        }

        int total = all.size();
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, size);
        int totalPages = Math.max(1, (int) Math.ceil((double) total / safeSize));
        int fromIndex = Math.min((safePage - 1) * safeSize, total);
        int toIndex = Math.min(fromIndex + safeSize, total);

        List<UrlEntity> pageSlice = (fromIndex < total) ? all.subList(fromIndex, toIndex) : Collections.emptyList();

        List<LinkItemResponse> items = pageSlice.stream().map(entity -> {
            long clicks = countClicksForCode(entity.getShortCode());
            return new LinkItemResponse(
                    entity.getShortCode(),
                    entity.getOriginalUrl(),
                    appProperties.baseUrl() + "/" + entity.getShortCode(),
                    clicks,
                    entity.getCreatedAt() != null ? entity.getCreatedAt() : clock.instant(),
                    entity.getExpiresAt(),
                    entity.isCustom());
        }).collect(Collectors.toList());

        return new PaginatedUrlsResponse(items, total, safePage, totalPages);
    }

    public UrlDetailsResponse getStats(String shortCode) {
        if (clickEventRecorder != null) {
            clickEventRecorder.flush();
        }

        UrlEntity entity = urlRepository.findByShortCode(shortCode)
                .orElseThrow(UrlNotFoundException::new);

        long totalClicks = countClicksForCode(shortCode);

        List<DailyClickStat> dailyClicks = new ArrayList<>();
        List<ReferrerStat> referrers = new ArrayList<>();

        if (jdbcTemplate != null && totalClicks > 0) {
            Instant sevenDaysAgo = clock.instant().minus(7, ChronoUnit.DAYS);
            try {
                jdbcTemplate.query(
                        "SELECT to_char(clicked_at AT TIME ZONE 'UTC', 'Mon DD') as dt, date_trunc('day', clicked_at AT TIME ZONE 'UTC') as d, count(*) as cnt " +
                        "FROM click_events WHERE short_code = ? AND clicked_at >= ? " +
                        "GROUP BY to_char(clicked_at AT TIME ZONE 'UTC', 'Mon DD'), date_trunc('day', clicked_at AT TIME ZONE 'UTC') " +
                        "ORDER BY d ASC",
                        rs -> {
                            dailyClicks.add(new DailyClickStat(rs.getString("dt"), rs.getLong("cnt")));
                        },
                        shortCode, Timestamp.from(sevenDaysAgo)
                );
            } catch (Exception ex) {
                log.warn("Failed to query daily clicks for short code '{}'", shortCode, ex);
            }

            try {
                final long finalTotal = totalClicks;
                jdbcTemplate.query(
                        "SELECT COALESCE(NULLIF(referrer, ''), 'Direct / None') as ref, count(*) as cnt " +
                        "FROM click_events WHERE short_code = ? " +
                        "GROUP BY ref ORDER BY cnt DESC LIMIT 5",
                        rs -> {
                            long cnt = rs.getLong("cnt");
                            int pct = (int) Math.round(((double) cnt / finalTotal) * 100.0);
                            referrers.add(new ReferrerStat(rs.getString("ref"), cnt, pct));
                        },
                        shortCode
                );
            } catch (Exception ex) {
                log.warn("Failed to query referrers for short code '{}'", shortCode, ex);
            }
        }

        return new UrlDetailsResponse(
                entity.getShortCode(),
                entity.getOriginalUrl(),
                appProperties.baseUrl() + "/" + entity.getShortCode(),
                totalClicks,
                entity.getCreatedAt() != null ? entity.getCreatedAt() : clock.instant(),
                entity.getExpiresAt(),
                entity.isCustom(),
                dailyClicks,
                referrers);
    }

    public UrlResponse updateExpiry(String shortCode, Instant expiresAt) {
        UrlEntity entity = urlRepository.findByShortCode(shortCode)
                .orElseThrow(UrlNotFoundException::new);

        Instant validated = validateExpiresAt(expiresAt);
        entity.setExpiresAt(validated);
        urlRepository.saveAndFlush(entity);

        redirectCache.put(entity.getShortCode(), entity.getOriginalUrl(), entity.getExpiresAt());
        return toResponse(entity);
    }

    public void delete(String shortCode) {
        UrlEntity entity = urlRepository.findByShortCode(shortCode)
                .orElseThrow(UrlNotFoundException::new);

        if (jdbcTemplate != null) {
            jdbcTemplate.update("DELETE FROM click_events WHERE short_code = ?", shortCode);
        }
        urlRepository.delete(entity);
        redirectCache.evict(shortCode);
    }

    private long countClicksForCode(String shortCode) {
        if (jdbcTemplate == null) {
            return 0;
        }
        try {
            Long count = jdbcTemplate.queryForObject(
                    "SELECT count(*) FROM click_events WHERE short_code = ?", Long.class, shortCode);
            return count != null ? count : 0;
        } catch (Exception ex) {
            return 0;
        }
    }

    private List<UrlEntity> seedDemoLinksIfEmpty() {
        try {
            long id1 = idGenerator.nextId();
            UrlEntity e1 = new UrlEntity(id1, "gh-repo", "https://github.com/vinyas24/distributed-url-shortener-enterprise", true, null, "calm_live_demo_key_99x");
            urlRepository.saveAndFlush(e1);
            redirectCache.put(e1.getShortCode(), e1.getOriginalUrl(), e1.getExpiresAt());

            long id2 = idGenerator.nextId();
            UrlEntity e2 = new UrlEntity(id2, "docs-2026", "https://spring.io/projects/spring-boot/documentation/v4-enterprise-architecture", true, clock.instant().plus(30, ChronoUnit.DAYS), "calm_live_demo_key_99x");
            urlRepository.saveAndFlush(e2);
            redirectCache.put(e2.getShortCode(), e2.getOriginalUrl(), e2.getExpiresAt());

            return List.of(e1, e2);
        } catch (Exception ex) {
            log.warn("Could not seed demo links: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    public ResolvedUrl resolve(String shortCode) {
        Timer.Sample sample = metrics.startTimer();
        String result = "success";
        try {
            if (shortCode == null || !SHORT_CODE_PATTERN.matcher(shortCode).matches()) {
                throw new UrlNotFoundException();
            }

            Optional<CachedRedirect> cached = redirectCache.get(shortCode);
            if (cached.isPresent()) {
                CachedRedirect value = cached.get();
                if (value.negative()) {
                    throw new UrlNotFoundException();
                }
                if (isExpired(value.expiresAt())) {
                    throw new UrlExpiredException();
                }
                return new ResolvedUrl(shortCode, value.originalUrl(), value.expiresAt());
            }

            Optional<UrlEntity> found = urlRepository.findByShortCode(shortCode);
            if (found.isEmpty()) {
                redirectCache.putNegative(shortCode);
                throw new UrlNotFoundException();
            }

            UrlEntity entity = found.get();
            if (isExpired(entity.getExpiresAt())) {
                throw new UrlExpiredException();
            }
            redirectCache.put(shortCode, entity.getOriginalUrl(), entity.getExpiresAt());
            return new ResolvedUrl(shortCode, entity.getOriginalUrl(), entity.getExpiresAt());
        } catch (ApiException ex) {
            result = ex.getCode();
            throw ex;
        } catch (RuntimeException ex) {
            result = "INTERNAL_ERROR";
            throw ex;
        } finally {
            metrics.recordRedirect(result);
            metrics.stopRedirectTimer(sample);
        }
    }

    private boolean isExpired(Instant expiresAt) {
        return expiresAt != null && !expiresAt.isAfter(clock.instant());
    }

    private UrlResponse createWithCustomCode(String originalUrl, String customCode, Instant expiresAt, String ownerId) {
        long id = idGenerator.nextId();
        try {
            return Objects.requireNonNull(transactionTemplate.execute(status -> {
                UrlEntity entity = new UrlEntity(id, customCode, originalUrl, true, expiresAt, ownerId);
                urlRepository.saveAndFlush(entity);
                return toResponse(entity);
            }));
        } catch (DataIntegrityViolationException ex) {
            if (isShortCodeUniqueViolation(ex)) {
                throw new CodeAlreadyExistsException(customCode);
            }
            throw ex;
        }
    }

    private UrlResponse createWithGeneratedCode(String originalUrl, Instant expiresAt, String ownerId) {
        for (int attempt = 1; attempt <= MAX_GENERATED_ATTEMPTS; attempt++) {
            long id = idGenerator.nextId();
            String shortCode = Base62.encode(id);
            try {
                return Objects.requireNonNull(transactionTemplate.execute(status -> {
                    UrlEntity entity = new UrlEntity(id, shortCode, originalUrl, false, expiresAt, ownerId);
                    urlRepository.saveAndFlush(entity);
                    return toResponse(entity);
                }));
            } catch (DataIntegrityViolationException ex) {
                if (!isUniqueViolation(ex)) {
                    throw ex;
                }
                log.warn("Generated short code collision on attempt {}/{} for code '{}'",
                        attempt, MAX_GENERATED_ATTEMPTS, shortCode, ex);
            }
        }
        throw new IdGenerationException(
                "Unable to allocate a unique short code after " + MAX_GENERATED_ATTEMPTS + " attempts");
    }

    private Instant validateExpiresAt(Instant expiresAt) {
        if (expiresAt == null) {
            return null;
        }
        Instant minimum = clock.instant().plusSeconds(MIN_EXPIRY_LEAD_SECONDS);
        if (!expiresAt.isAfter(minimum)) {
            throw new InvalidExpiryException(
                    "expiresAt must be at least " + MIN_EXPIRY_LEAD_SECONDS + " seconds in the future");
        }
        return expiresAt;
    }

    private UrlResponse toResponse(UrlEntity entity) {
        Instant createdAt = entity.getCreatedAt() != null ? entity.getCreatedAt() : clock.instant();
        return new UrlResponse(
                entity.getShortCode(),
                appProperties.baseUrl() + "/" + entity.getShortCode(),
                entity.getOriginalUrl(),
                entity.isCustom(),
                createdAt,
                entity.getExpiresAt());
    }

    private boolean isUniqueViolation(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof SQLException sqlException
                    && "23505".equals(sqlException.getSQLState())) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private boolean isShortCodeUniqueViolation(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof SQLException sqlException
                    && "23505".equals(sqlException.getSQLState())) {
                String message = sqlException.getMessage();
                return message != null
                        && (message.contains("uq_urls_short_code") || message.contains("short_code"));
            }
            current = current.getCause();
        }
        return false;
    }
}
