package com.vinyas.urlshortener.component;

import java.util.concurrent.BlockingQueue;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

/**
 * Central place for application metrics.
 *
 * <p>Tag values are deliberately bounded: results, decisions and boolean flags only. Short codes,
 * URLs and client IPs are never used as tags, which keeps Prometheus cardinality predictable.</p>
 */
@Component
public class UrlShortenerMetrics {

    public static final String CREATE_REQUESTS = "urlshortener.create.requests";
    public static final String CREATE_DURATION = "urlshortener.create.duration";
    public static final String REDIRECT_REQUESTS = "urlshortener.redirect.requests";
    public static final String REDIRECT_DURATION = "urlshortener.redirect.duration";
    public static final String CACHE_GETS = "urlshortener.cache.gets";
    public static final String CACHE_WRITES = "urlshortener.cache.writes";
    public static final String RATE_LIMIT_REQUESTS = "urlshortener.rate_limit.requests";
    public static final String ANALYTICS_EVENTS = "urlshortener.analytics.events";
    public static final String ANALYTICS_QUEUE_SIZE = "urlshortener.analytics.queue.size";

    private final MeterRegistry registry;

    public UrlShortenerMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    public Timer.Sample startTimer() {
        return Timer.start(registry);
    }

    public void stopCreateTimer(Timer.Sample sample, boolean custom) {
        sample.stop(registry.timer(CREATE_DURATION, "custom", Boolean.toString(custom)));
    }

    public void stopRedirectTimer(Timer.Sample sample) {
        sample.stop(registry.timer(REDIRECT_DURATION));
    }

    public void recordCreate(String result, boolean custom) {
        registry.counter(
                CREATE_REQUESTS,
                "result", result,
                "custom", Boolean.toString(custom)).increment();
    }

    public void recordRedirect(String result) {
        registry.counter(REDIRECT_REQUESTS, "result", result).increment();
    }

    public void recordCacheGet(String result) {
        registry.counter(CACHE_GETS, "result", result).increment();
    }

    public void recordCacheWrite(String operation, String result) {
        registry.counter(
                CACHE_WRITES,
                "operation", operation,
                "result", result).increment();
    }

    public void recordRateLimit(String decision) {
        registry.counter(RATE_LIMIT_REQUESTS, "decision", decision).increment();
    }

    public void recordAnalytics(String result, long count) {
        registry.counter(ANALYTICS_EVENTS, "result", result).increment(count);
    }

    public void registerQueueGauge(BlockingQueue<?> queue) {
        Gauge.builder(ANALYTICS_QUEUE_SIZE, queue, BlockingQueue::size)
                .description("Click events waiting to be persisted")
                .register(registry);
    }
}
