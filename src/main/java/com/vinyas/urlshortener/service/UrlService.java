package com.vinyas.urlshortener.service;

import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;

import com.vinyas.urlshortener.component.Base62;
import com.vinyas.urlshortener.component.CachedRedirect;
import com.vinyas.urlshortener.component.RedirectCache;
import com.vinyas.urlshortener.component.SnowflakeIdGenerator;
import com.vinyas.urlshortener.component.UrlShortenerMetrics;
import com.vinyas.urlshortener.config.AppProperties;
import com.vinyas.urlshortener.dto.CreateUrlRequest;
import com.vinyas.urlshortener.dto.ResolvedUrl;
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
import org.springframework.dao.DataIntegrityViolationException;
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
    }

    public UrlResponse create(CreateUrlRequest request) {
        boolean custom = request.customCode() != null;
        Timer.Sample sample = metrics.startTimer();
        String result = "success";
        try {
            String originalUrl = urlValidator.validate(request.originalUrl());
            String customCode = customCodeValidator.validate(request.customCode());
            Instant expiresAt = validateExpiresAt(request.expiresAt());

            UrlResponse response = customCode != null
                    ? createWithCustomCode(originalUrl, customCode, expiresAt)
                    : createWithGeneratedCode(originalUrl, expiresAt);

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

    private UrlResponse createWithCustomCode(String originalUrl, String customCode, Instant expiresAt) {
        long id = idGenerator.nextId();
        try {
            return Objects.requireNonNull(transactionTemplate.execute(status -> {
                UrlEntity entity = new UrlEntity(id, customCode, originalUrl, true, expiresAt);
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

    private UrlResponse createWithGeneratedCode(String originalUrl, Instant expiresAt) {
        for (int attempt = 1; attempt <= MAX_GENERATED_ATTEMPTS; attempt++) {
            long id = idGenerator.nextId();
            String shortCode = Base62.encode(id);
            try {
                return Objects.requireNonNull(transactionTemplate.execute(status -> {
                    UrlEntity entity = new UrlEntity(id, shortCode, originalUrl, false, expiresAt);
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
