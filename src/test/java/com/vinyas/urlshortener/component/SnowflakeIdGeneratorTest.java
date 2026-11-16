package com.vinyas.urlshortener.component;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import com.vinyas.urlshortener.config.IdGeneratorProperties;
import com.vinyas.urlshortener.exception.IdGenerationException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SnowflakeIdGeneratorTest {

    private static final long START = Instant.parse("2026-01-01T00:00:00Z").toEpochMilli();

    @Test
    void generatesUniqueIdsAcrossThreads() throws Exception {
        int threads = 8;
        int perThread = 10_000;
        SnowflakeIdGenerator generator = new SnowflakeIdGenerator(properties(1, 1000), Clock.systemUTC());
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<List<Long>>> futures = new ArrayList<>();

        try {
            for (int i = 0; i < threads; i++) {
                futures.add(executor.submit(() -> {
                    start.await();
                    List<Long> ids = new ArrayList<>(perThread);
                    for (int j = 0; j < perThread; j++) {
                        ids.add(generator.nextId());
                    }
                    return ids;
                }));
            }
            start.countDown();

            Set<Long> allIds = ConcurrentHashMap.newKeySet();
            for (Future<List<Long>> future : futures) {
                allIds.addAll(future.get(30, TimeUnit.SECONDS));
            }

            assertThat(allIds).hasSize(threads * perThread);
            assertThat(allIds).allMatch(id -> id > 0);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void idsAreMonotonicInOneThread() {
        SnowflakeIdGenerator generator = new SnowflakeIdGenerator(properties(1, 1000), Clock.systemUTC());
        long previous = generator.nextId();
        for (int i = 0; i < 10_000; i++) {
            long next = generator.nextId();
            assertThat(next).isGreaterThan(previous);
            previous = next;
        }
    }

    @Test
    void clockRollbackKeepsIdsUnique() {
        MutableClock clock = new MutableClock(START);
        SnowflakeIdGenerator generator = new SnowflakeIdGenerator(properties(1, 100), clock);

        long first = generator.nextId();
        clock.setMillis(START - 5_000);

        Set<Long> ids = new HashSet<>();
        ids.add(first);
        for (int i = 0; i < 100; i++) {
            ids.add(generator.nextId());
        }

        assertThat(ids).hasSize(101);
        assertThat(generator.nextId()).isGreaterThan(first);
    }

    @Test
    void clockRollbackAfterSequenceExhaustionFailsInsteadOfDuplicating() {
        MutableClock clock = new MutableClock(START);
        SnowflakeIdGenerator generator = new SnowflakeIdGenerator(properties(1, 50), clock);

        for (int i = 0; i < 4_095; i++) {
            generator.nextId();
        }
        clock.setMillis(START - 1_000);
        generator.nextId(); // last available sequence value for this logical millisecond

        assertThatThrownBy(generator::nextId).isInstanceOf(IdGenerationException.class);
    }

    @Test
    void differentWorkersProduceDifferentIds() {
        MutableClock clock = new MutableClock(START);
        SnowflakeIdGenerator workerOne = new SnowflakeIdGenerator(properties(1, 100), clock);
        SnowflakeIdGenerator workerTwo = new SnowflakeIdGenerator(properties(2, 100), clock);

        assertThat(workerOne.nextId()).isNotEqualTo(workerTwo.nextId());
    }

    @Test
    void missingWorkerIdFailsAtStartup() {
        assertThatThrownBy(() -> new SnowflakeIdGenerator(properties(null, 100), Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("WORKER_ID");
    }

    @Test
    void invalidWorkerIdFailsAtStartup() {
        assertThatThrownBy(() -> new SnowflakeIdGenerator(properties(-1, 100), Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new SnowflakeIdGenerator(properties(1024, 100), Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void invalidBackwardWaitFailsAtStartup() {
        assertThatThrownBy(() -> new SnowflakeIdGenerator(properties(1, 0), Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void generatedCodeFitsDatabaseColumn() {
        SnowflakeIdGenerator generator = new SnowflakeIdGenerator(properties(7, 100), Clock.systemUTC());
        String code = Base62.encode(generator.nextId());
        assertThat(code).matches("^[A-Za-z0-9_-]{3,15}$");
        assertThat(code).hasSizeLessThanOrEqualTo(11);
    }

    private static IdGeneratorProperties properties(Integer workerId, long maxWaitMs) {
        IdGeneratorProperties properties = new IdGeneratorProperties();
        properties.setWorkerId(workerId);
        properties.setMaxBackwardWaitMs(maxWaitMs);
        return properties;
    }

    private static final class MutableClock extends Clock {

        private volatile long millis;

        private MutableClock(long millis) {
            this.millis = millis;
        }

        private void setMillis(long millis) {
            this.millis = millis;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return Instant.ofEpochMilli(millis);
        }

        @Override
        public long millis() {
            return millis;
        }
    }
}
