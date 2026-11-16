package com.vinyas.urlshortener.integration;

import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ConcurrentCreateIntegrationTest extends AbstractIntegrationTest {

    @Test
    void concurrentCreatesWithTheSameCustomCodeProduceOne201AndTheRest409() throws Exception {
        int attempts = 8;
        String body = "{\"originalUrl\":\"https://1.1.1.1/race\",\"customCode\":\"race-code\"}";
        ExecutorService executor = Executors.newFixedThreadPool(attempts);
        CountDownLatch ready = new CountDownLatch(attempts);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<HttpResponse<String>>> futures = new ArrayList<>();

        try {
            for (int i = 0; i < attempts; i++) {
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    start.await();
                    return postJson("/api/v1/urls", body);
                }));
            }
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            List<HttpResponse<String>> responses = new ArrayList<>();
            for (Future<HttpResponse<String>> future : futures) {
                responses.add(future.get(15, TimeUnit.SECONDS));
            }

            long created = responses.stream().filter(r -> r.statusCode() == 201).count();
            long conflicts = responses.stream().filter(r -> r.statusCode() == 409).count();

            assertThat(created).isEqualTo(1);
            assertThat(conflicts).isEqualTo(attempts - 1);
            assertThat(responses.stream()
                    .filter(r -> r.statusCode() == 409)
                    .map(r -> jsonString(r.body(), "code")))
                    .containsOnly("CODE_ALREADY_EXISTS");
            assertThat(jdbcTemplate.queryForObject(
                    "SELECT count(*) FROM urls WHERE short_code = ?", Integer.class, "race-code"))
                    .isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }
}
