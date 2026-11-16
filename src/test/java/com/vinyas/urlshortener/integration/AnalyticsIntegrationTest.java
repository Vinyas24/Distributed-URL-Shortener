package com.vinyas.urlshortener.integration;

import java.net.http.HttpResponse;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

class AnalyticsIntegrationTest extends AbstractIntegrationTest {

    @Test
    void successfulRedirectIsRecordedAsynchronously() throws Exception {
        HttpResponse<String> created = postJson(
                "/api/v1/urls",
                "{\"originalUrl\":\"https://1.1.1.1/click-target\",\"customCode\":\"click-me\"}");
        assertThat(created.statusCode()).isEqualTo(201);

        HttpResponse<String> redirect = getWithHeaders("/click-me", Map.of(
                "User-Agent", "JUnit-Agent",
                "Referer", "https://1.1.1.1/source"));
        assertThat(redirect.statusCode()).isEqualTo(302);

        await().atMost(5, TimeUnit.SECONDS).untilAsserted(() -> assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM click_events WHERE short_code = ?", Integer.class, "click-me"))
                .isEqualTo(1));

        Map<String, Object> event = jdbcTemplate.queryForMap("""
                SELECT ip_hash, user_agent, referrer
                FROM click_events
                WHERE short_code = ?
                """, "click-me");

        assertThat((String) event.get("ip_hash")).matches("^[0-9a-f]{64}$");
        assertThat(event.get("user_agent")).isEqualTo("JUnit-Agent");
        assertThat(event.get("referrer")).isEqualTo("https://1.1.1.1/source");
    }

    @Test
    void analyticsFailureDoesNotFailRedirects() throws Exception {
        HttpResponse<String> created = postJson(
                "/api/v1/urls",
                "{\"originalUrl\":\"https://1.1.1.1/analytics-down\",\"customCode\":\"analytics-down\"}");
        assertThat(created.statusCode()).isEqualTo(201);

        jdbcTemplate.execute("ALTER TABLE click_events RENAME TO click_events_backup");
        try {
            assertThat(get("/analytics-down").statusCode()).isEqualTo(302);

            // Let the scheduled flush try (and fail) against the missing table.
            Thread.sleep(500);
            assertThat(get("/analytics-down").statusCode()).isEqualTo(302);
        } finally {
            jdbcTemplate.execute("ALTER TABLE click_events_backup RENAME TO click_events");
        }
    }
}
