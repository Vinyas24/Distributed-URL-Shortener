package com.vinyas.urlshortener.component;

import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import com.vinyas.urlshortener.config.RateLimitProperties;
import com.vinyas.urlshortener.dto.RateLimitResult;
import com.vinyas.urlshortener.exception.RateLimiterUnavailableException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

/**
 * Distributed token-bucket limiter for the create endpoint.
 *
 * <p>All state lives in Redis and the bucket is updated by a single Lua script, so multiple
 * application instances share one limit. Redis server time is used inside the script, which
 * avoids relying on wall clocks that differ between instances.</p>
 *
 * <p>When Redis is unavailable the configured policy applies: fail-open (default) allows the
 * request and logs the failure, while fail-closed returns 503.</p>
 */
@Component
public class CreateRateLimiter {

    public static final String LIMIT_HEADER = "X-RateLimit-Limit";
    public static final String REMAINING_HEADER = "X-RateLimit-Remaining";

    private static final Logger log = LoggerFactory.getLogger(CreateRateLimiter.class);
    private static final long FAILURE_LOG_INTERVAL_NANOS = TimeUnit.SECONDS.toNanos(10);

    private static final String SCRIPT_TEXT = """
            local key = KEYS[1]
            local capacity = tonumber(ARGV[1])
            local refill_per_second = tonumber(ARGV[2])
            local ttl_ms = tonumber(ARGV[3])

            local time = redis.call('TIME')
            local now_ms = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)

            local data = redis.call('HMGET', key, 'tokens', 'ts')
            local tokens = tonumber(data[1])
            local last_refill_ms = tonumber(data[2])

            if tokens == nil then
                tokens = capacity
                last_refill_ms = now_ms
            end

            local elapsed_ms = math.max(0, now_ms - last_refill_ms)
            tokens = math.min(capacity, tokens + (elapsed_ms / 1000.0) * refill_per_second)

            local allowed = 0
            local retry_after_ms = 0
            if tokens >= 1 then
                tokens = tokens - 1
                allowed = 1
            else
                retry_after_ms = math.ceil(((1 - tokens) / refill_per_second) * 1000)
            end

            redis.call('HSET', key, 'tokens', tokens, 'ts', now_ms)
            redis.call('PEXPIRE', key, ttl_ms)
            return {allowed, retry_after_ms, math.floor(tokens)}
            """;

    @SuppressWarnings("rawtypes")
    private static final DefaultRedisScript<List> SCRIPT =
            new DefaultRedisScript<>(SCRIPT_TEXT, List.class);

    private final StringRedisTemplate redisTemplate;
    private final RateLimitProperties properties;
    private final UrlShortenerMetrics metrics;
    private final int capacity;
    private final double refillPerSecond;
    private final long ttlMs;
    private final AtomicLong lastFailureLogNanos = new AtomicLong(0);

    public CreateRateLimiter(
            StringRedisTemplate redisTemplate,
            RateLimitProperties properties,
            UrlShortenerMetrics metrics) {
        this.redisTemplate = redisTemplate;
        this.properties = properties;
        this.metrics = metrics;
        this.capacity = properties.getCreate().getCapacity();
        this.refillPerSecond = properties.getCreate().getRefillPerSecond();
        if (capacity < 1 || refillPerSecond <= 0) {
            throw new IllegalStateException(
                    "app.rate-limit.create.capacity must be positive and refill-per-second must be > 0");
        }
        this.ttlMs = (long) Math.ceil(capacity / refillPerSecond * 1000.0) + 1000L;
    }

    public RateLimitResult check(HttpServletRequest request) {
        if (!properties.isEnabled()) {
            metrics.recordRateLimit("disabled");
            return RateLimitResult.allowed(capacity, capacity);
        }

        String key = properties.getKeyPrefix() + clientId(request);
        try {
            List<?> result = redisTemplate.execute(
                    SCRIPT,
                    List.of(key),
                    Integer.toString(capacity),
                    Double.toString(refillPerSecond),
                    Long.toString(ttlMs));

            if (result == null || result.size() < 3) {
                throw new IllegalStateException("Rate limit script returned an unexpected result");
            }

            boolean allowed = asLong(result.get(0)) == 1L;
            long retryAfterMs = asLong(result.get(1));
            int remaining = (int) asLong(result.get(2));

            if (allowed) {
                metrics.recordRateLimit("allowed");
                return RateLimitResult.allowed(capacity, remaining);
            }
            long retryAfterSeconds = Math.max(1L, (retryAfterMs + 999L) / 1000L);
            metrics.recordRateLimit("rejected");
            return RateLimitResult.rejected(capacity, retryAfterSeconds);
        } catch (RuntimeException ex) {
            logFailure(key, ex);
            if (properties.isFailOpen()) {
                metrics.recordRateLimit("fail_open");
                return RateLimitResult.allowed(capacity, capacity);
            }
            metrics.recordRateLimit("fail_closed");
            throw new RateLimiterUnavailableException();
        }
    }

    private String clientId(HttpServletRequest request) {
        String remoteAddress = request.getRemoteAddr();
        return remoteAddress == null || remoteAddress.isBlank() ? "unknown" : remoteAddress.trim();
    }

    private static long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text) {
            return Long.parseLong(text);
        }
        throw new IllegalStateException("Unexpected rate limit script value: " + value);
    }

    private void logFailure(String key, RuntimeException ex) {
        long now = System.nanoTime();
        long previous = lastFailureLogNanos.get();
        if (now - previous >= FAILURE_LOG_INTERVAL_NANOS && lastFailureLogNanos.compareAndSet(previous, now)) {
            log.warn("Redis rate limiter failed for key '{}'; policy={}",
                    key, properties.isFailOpen() ? "fail-open" : "fail-closed", ex);
        } else {
            log.debug("Redis rate limiter failed for key '{}'", key, ex);
        }
    }
}
