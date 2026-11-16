package com.vinyas.urlshortener.component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import com.vinyas.urlshortener.config.CacheProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Best-effort read-through cache for redirects.
 *
 * <p>Every Redis interaction is wrapped: a cache outage must never turn a working redirect into
 * an error. Callers treat an empty result as a cache miss and fall back to PostgreSQL. The value
 * format is {@code <expiresAtEpochMillis|->|<originalUrl>}; the negative marker is {@code !}.</p>
 */
@Component
public class RedirectCache {

    private static final Logger log = LoggerFactory.getLogger(RedirectCache.class);
    private static final String NEGATIVE_MARKER = "!";
    private static final String NO_EXPIRY = "-";
    private static final long FAILURE_LOG_INTERVAL_NANOS = TimeUnit.SECONDS.toNanos(10);

    private final StringRedisTemplate redisTemplate;
    private final CacheProperties properties;
    private final Clock clock;
    private final UrlShortenerMetrics metrics;
    private final AtomicLong lastFailureLogNanos = new AtomicLong(0);

    public RedirectCache(
            StringRedisTemplate redisTemplate,
            CacheProperties properties,
            Clock clock,
            UrlShortenerMetrics metrics) {
        this.redisTemplate = redisTemplate;
        this.properties = properties;
        this.clock = clock;
        this.metrics = metrics;
    }

    public Optional<CachedRedirect> get(String shortCode) {
        if (!properties.isEnabled()) {
            metrics.recordCacheGet("disabled");
            return Optional.empty();
        }
        try {
            String value = redisTemplate.opsForValue().get(key(shortCode));
            if (value == null) {
                metrics.recordCacheGet("miss");
                return Optional.empty();
            }
            if (NEGATIVE_MARKER.equals(value)) {
                metrics.recordCacheGet("negative");
                return Optional.of(CachedRedirect.notFound());
            }
            CachedRedirect cached = decode(value);
            if (cached == null) {
                metrics.recordCacheGet("corrupt");
                log.warn("Discarding corrupt redirect cache entry for short code '{}'", shortCode);
                redisTemplate.delete(key(shortCode));
                return Optional.empty();
            }
            metrics.recordCacheGet("hit");
            return Optional.of(cached);
        } catch (RuntimeException ex) {
            metrics.recordCacheGet("error");
            logFailure("read", shortCode, ex);
            return Optional.empty();
        }
    }

    public void put(String shortCode, String originalUrl, Instant expiresAt) {
        if (!properties.isEnabled()) {
            metrics.recordCacheWrite("put", "disabled");
            return;
        }
        Duration ttl = ttlFor(expiresAt);
        if (ttl.isZero() || ttl.isNegative() || ttl.toMillis() < 1) {
            metrics.recordCacheWrite("put", "skipped");
            return;
        }
        try {
            redisTemplate.opsForValue().set(key(shortCode), encode(originalUrl, expiresAt), ttl);
            metrics.recordCacheWrite("put", "success");
        } catch (RuntimeException ex) {
            metrics.recordCacheWrite("put", "error");
            logFailure("write", shortCode, ex);
        }
    }

    public void putNegative(String shortCode) {
        if (!properties.isEnabled()) {
            metrics.recordCacheWrite("put_negative", "disabled");
            return;
        }
        try {
            redisTemplate.opsForValue().set(key(shortCode), NEGATIVE_MARKER, properties.getNegativeTtl());
            metrics.recordCacheWrite("put_negative", "success");
        } catch (RuntimeException ex) {
            metrics.recordCacheWrite("put_negative", "error");
            logFailure("negative write", shortCode, ex);
        }
    }

    public void evict(String shortCode) {
        if (!properties.isEnabled()) {
            metrics.recordCacheWrite("evict", "disabled");
            return;
        }
        try {
            redisTemplate.delete(key(shortCode));
            metrics.recordCacheWrite("evict", "success");
        } catch (RuntimeException ex) {
            metrics.recordCacheWrite("evict", "error");
            logFailure("delete", shortCode, ex);
        }
    }

    private String key(String shortCode) {
        return properties.getKeyPrefix() + shortCode;
    }

    private Duration ttlFor(Instant expiresAt) {
        if (expiresAt == null) {
            return properties.getRedirectTtl();
        }
        Duration untilExpiry = Duration.between(clock.instant(), expiresAt);
        if (untilExpiry.isZero() || untilExpiry.isNegative()) {
            return Duration.ZERO;
        }
        return untilExpiry.compareTo(properties.getRedirectTtl()) < 0
                ? untilExpiry
                : properties.getRedirectTtl();
    }

    private String encode(String originalUrl, Instant expiresAt) {
        String expiry = expiresAt == null ? NO_EXPIRY : Long.toString(expiresAt.toEpochMilli());
        return expiry + "|" + originalUrl;
    }

    private CachedRedirect decode(String value) {
        int separator = value.indexOf('|');
        if (separator <= 0 || separator == value.length() - 1) {
            return null;
        }
        String expiry = value.substring(0, separator);
        String originalUrl = value.substring(separator + 1);
        try {
            Instant expiresAt = NO_EXPIRY.equals(expiry)
                    ? null
                    : Instant.ofEpochMilli(Long.parseLong(expiry));
            return CachedRedirect.found(originalUrl, expiresAt);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private void logFailure(String operation, String shortCode, RuntimeException ex) {
        long now = System.nanoTime();
        long previous = lastFailureLogNanos.get();
        if (now - previous >= FAILURE_LOG_INTERVAL_NANOS && lastFailureLogNanos.compareAndSet(previous, now)) {
            log.warn("Redis redirect cache {} failed for short code '{}'; falling back to PostgreSQL",
                    operation, shortCode, ex);
        } else {
            log.debug("Redis redirect cache {} failed for short code '{}'", operation, shortCode, ex);
        }
    }
}
