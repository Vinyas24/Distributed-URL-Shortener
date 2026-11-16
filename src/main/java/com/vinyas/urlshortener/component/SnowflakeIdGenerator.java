package com.vinyas.urlshortener.component;

import java.time.Clock;
import java.time.Instant;
import java.util.concurrent.TimeUnit;

import com.vinyas.urlshortener.config.IdGeneratorProperties;
import com.vinyas.urlshortener.exception.IdGenerationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Thread-safe Snowflake-style identifier generator.
 *
 * <pre>
 * 0 | 41-bit timestamp (ms since 2025-01-01T00:00:00Z) | 10-bit worker | 12-bit sequence
 * </pre>
 *
 * <p>The generator is intentionally synchronized. At the target create rate of roughly
 * 100 requests/second, lock contention is negligible compared with a database insert, and a
 * single monitor makes the rollback invariants much easier to audit.</p>
 */
@Component
public class SnowflakeIdGenerator {

    private static final Logger log = LoggerFactory.getLogger(SnowflakeIdGenerator.class);

    static final long EPOCH_MS = Instant.parse("2025-01-01T00:00:00Z").toEpochMilli();
    static final int WORKER_ID_BITS = 10;
    static final int SEQUENCE_BITS = 12;
    static final int SEQUENCE_MASK = (1 << SEQUENCE_BITS) - 1;
    static final int MAX_WORKER_ID = (1 << WORKER_ID_BITS) - 1;
    static final int WORKER_ID_SHIFT = SEQUENCE_BITS;
    static final int TIMESTAMP_SHIFT = WORKER_ID_BITS + SEQUENCE_BITS;
    static final long MAX_TIMESTAMP = (1L << 41) - 1;

    private final int workerId;
    private final long maxBackwardWaitMs;
    private final Clock clock;

    private long lastTimestamp = -1L;
    private long sequence = 0L;

    public SnowflakeIdGenerator(IdGeneratorProperties properties, Clock clock) {
        Integer configuredWorkerId = properties.getWorkerId();
        if (configuredWorkerId == null) {
            throw new IllegalStateException("WORKER_ID is required and must be an integer between 0 and 1023");
        }
        if (configuredWorkerId < 0 || configuredWorkerId > MAX_WORKER_ID) {
            throw new IllegalStateException(
                    "WORKER_ID must be between 0 and 1023, but was " + configuredWorkerId);
        }
        if (properties.getMaxBackwardWaitMs() <= 0) {
            throw new IllegalStateException("app.id-generator.max-backward-wait-ms must be positive");
        }
        this.workerId = configuredWorkerId;
        this.maxBackwardWaitMs = properties.getMaxBackwardWaitMs();
        this.clock = clock;
        log.info("Snowflake ID generator initialized with workerId={}", workerId);
    }

    public synchronized long nextId() {
        long now = clock.millis();

        if (now < lastTimestamp) {
            // Never move the logical clock backwards. Keep consuming the current sequence so
            // IDs remain unique and monotonic while waiting for the wall clock to catch up.
            if (sequence < SEQUENCE_MASK) {
                sequence++;
            } else {
                now = waitForNextMillis(lastTimestamp);
                lastTimestamp = now;
                sequence = 0;
            }
        } else if (now == lastTimestamp) {
            sequence = (sequence + 1) & SEQUENCE_MASK;
            if (sequence == 0) {
                now = waitForNextMillis(lastTimestamp);
                lastTimestamp = now;
            }
        } else {
            lastTimestamp = now;
            sequence = 0;
        }

        long timestamp = lastTimestamp - EPOCH_MS;
        if (timestamp < 0) {
            throw new IdGenerationException("System clock is before the configured Snowflake epoch");
        }
        if (timestamp > MAX_TIMESTAMP) {
            throw new IdGenerationException("Snowflake timestamp bits exhausted");
        }

        return (timestamp << TIMESTAMP_SHIFT) | ((long) workerId << WORKER_ID_SHIFT) | sequence;
    }

    private long waitForNextMillis(long lastTimestamp) {
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(maxBackwardWaitMs);
        long now = clock.millis();
        while (now <= lastTimestamp) {
            if (System.nanoTime() >= deadline) {
                throw new IdGenerationException(
                        "System clock moved backwards or stalled for more than "
                                + maxBackwardWaitMs + " ms; refusing to generate duplicate IDs");
            }
            try {
                Thread.sleep(1L);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                throw new IdGenerationException("Interrupted while waiting for the system clock to advance", ex);
            }
            now = clock.millis();
        }
        return now;
    }

    public int getWorkerId() {
        return workerId;
    }
}
