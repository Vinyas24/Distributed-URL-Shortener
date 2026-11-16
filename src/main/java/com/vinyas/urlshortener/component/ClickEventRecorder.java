package com.vinyas.urlshortener.component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.atomic.AtomicLong;

import com.vinyas.urlshortener.config.AnalyticsProperties;
import jakarta.annotation.PreDestroy;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Bounded, asynchronous click-event recorder.
 *
 * <p>The redirect thread only offers an event to an in-memory queue. A scheduled batch job writes
 * the queue to PostgreSQL. If the queue is full or the database is unavailable, events are
 * dropped rather than delaying or failing the redirect.</p>
 */
@Component
public class ClickEventRecorder {

    private static final Logger log = LoggerFactory.getLogger(ClickEventRecorder.class);
    private static final String DEFAULT_SALT = "local-dev-salt";
    private static final String INSERT_SQL = """
            INSERT INTO click_events (short_code, clicked_at, ip_hash, user_agent, referrer)
            VALUES (?, ?, ?, ?, ?)
            """;
    private static final int MAX_USER_AGENT_LENGTH = 512;
    private static final int MAX_REFERRER_LENGTH = 1024;

    private final JdbcTemplate jdbcTemplate;
    private final AnalyticsProperties properties;
    private final Clock clock;
    private final UrlShortenerMetrics metrics;
    private final BlockingQueue<ClickEvent> queue;
    private final AtomicLong droppedEvents = new AtomicLong(0);
    private final AtomicLong failureLogs = new AtomicLong(0);

    public ClickEventRecorder(
            JdbcTemplate jdbcTemplate,
            AnalyticsProperties properties,
            Clock clock,
            UrlShortenerMetrics metrics) {
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;
        this.clock = clock;
        this.metrics = metrics;
        this.queue = new ArrayBlockingQueue<>(properties.getQueueCapacity());
        metrics.registerQueueGauge(queue);
        if (properties.isEnabled() && DEFAULT_SALT.equals(properties.getIpHashSalt())) {
            log.warn("app.analytics.ip-hash-salt is using the default value; set IP_HASH_SALT in production");
        }
    }

    public void record(String shortCode, HttpServletRequest request) {
        if (!properties.isEnabled() || !"GET".equalsIgnoreCase(request.getMethod())) {
            return;
        }
        try {
            ClickEvent event = new ClickEvent(
                    shortCode,
                    clock.instant(),
                    hashIp(request.getRemoteAddr()),
                    truncate(request.getHeader("User-Agent"), MAX_USER_AGENT_LENGTH),
                    truncate(request.getHeader("Referer"), MAX_REFERRER_LENGTH));
            if (queue.offer(event)) {
                metrics.recordAnalytics("enqueued", 1);
            } else {
                metrics.recordAnalytics("dropped", 1);
                long dropped = droppedEvents.incrementAndGet();
                if (dropped == 1 || dropped % 1000 == 0) {
                    log.warn("Click event queue is full; dropped {} event(s) so far", dropped);
                }
            }
        } catch (RuntimeException ex) {
            metrics.recordAnalytics("enqueue_failed", 1);
            log.warn("Failed to enqueue click event for short code '{}'", shortCode, ex);
        }
    }

    @Scheduled(fixedDelayString = "${app.analytics.flush-interval-ms:500}")
    public void flush() {
        if (!properties.isEnabled()) {
            return;
        }
        List<ClickEvent> batch = new ArrayList<>(Math.min(properties.getBatchSize(), 256));
        while (true) {
            batch.clear();
            int drained = queue.drainTo(batch, properties.getBatchSize());
            if (drained == 0) {
                return;
            }
            try {
                jdbcTemplate.batchUpdate(INSERT_SQL, batch, batch.size(), (statement, event) -> {
                    statement.setString(1, event.shortCode());
                    statement.setObject(2, OffsetDateTime.ofInstant(event.clickedAt(), ZoneOffset.UTC));
                    statement.setString(3, event.ipHash());
                    statement.setString(4, event.userAgent());
                    statement.setString(5, event.referrer());
                });
                metrics.recordAnalytics("persisted", batch.size());
            } catch (RuntimeException ex) {
                metrics.recordAnalytics("persist_failed", batch.size());
                long failures = failureLogs.incrementAndGet();
                log.error("Failed to persist {} click event(s); dropping this batch", batch.size(), ex);
                if (failures % 100 == 0) {
                    log.error("Click event persistence has failed {} times", failures);
                }
                return;
            }
        }
    }

    @PreDestroy
    public void flushOnShutdown() {
        flush();
    }

    private String hashIp(String remoteAddress) {
        String value = remoteAddress == null || remoteAddress.isBlank() ? "unknown" : remoteAddress.trim();
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(
                    (properties.getIpHashSalt() + ":" + value).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private static String truncate(String value, int maxLength) {
        if (value == null || value.isEmpty()) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private record ClickEvent(
            String shortCode,
            Instant clickedAt,
            String ipHash,
            String userAgent,
            String referrer) {
    }
}
