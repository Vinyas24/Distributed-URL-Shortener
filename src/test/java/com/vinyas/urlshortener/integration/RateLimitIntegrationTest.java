package com.vinyas.urlshortener.integration;

import java.net.http.HttpResponse;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

@TestPropertySource(properties = {
        "app.rate-limit.create.capacity=2",
        "app.rate-limit.create.refill-per-second=1",
        "app.rate-limit.fail-open=true"
})
class RateLimitIntegrationTest extends AbstractIntegrationTest {

    @Test
    void exhaustedBucketReturns429BeforeValidationAndDoesNotCreateRows() throws Exception {
        assertThat(create().statusCode()).isEqualTo(201);
        assertThat(create().statusCode()).isEqualTo(201);

        Integer rowsBefore = jdbcTemplate.queryForObject("SELECT count(*) FROM urls", Integer.class);

        // Invalid payload: the interceptor must reject before body parsing/validation.
        HttpResponse<String> limited = postJson(
                "/api/v1/urls", "{\"originalUrl\":\"ftp://example.com/not-allowed\"}");

        assertThat(limited.statusCode()).isEqualTo(429);
        assertThat(jsonString(limited.body(), "code")).isEqualTo("RATE_LIMITED");
        assertThat(jsonString(limited.body(), "traceId")).isNotBlank();
        assertThat(limited.headers().firstValue("Retry-After"))
                .hasValueSatisfying(value -> assertThat(Long.parseLong(value)).isGreaterThanOrEqualTo(1));
        assertThat(limited.headers().firstValue("X-RateLimit-Limit")).contains("2");
        assertThat(limited.headers().firstValue("X-RateLimit-Remaining")).contains("0");
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM urls", Integer.class))
                .isEqualTo(rowsBefore);
    }

    @Test
    void redirectsAreNotRateLimited() throws Exception {
        HttpResponse<String> created = postJson(
                "/api/v1/urls",
                "{\"originalUrl\":\"https://1.1.1.1/redirect-not-limited\",\"customCode\":\"limited-redir\"}");
        assertThat(created.statusCode()).isEqualTo(201);
        assertThat(create().statusCode()).isEqualTo(201);
        assertThat(create().statusCode()).isEqualTo(429);

        HttpResponse<String> redirect = get("/limited-redir");

        assertThat(redirect.statusCode()).isEqualTo(302);
        assertThat(redirect.headers().firstValue("Location")).contains("https://1.1.1.1/redirect-not-limited");
    }

    @Test
    void bucketRefillsOverTime() throws Exception {
        assertThat(create().statusCode()).isEqualTo(201);
        assertThat(create().statusCode()).isEqualTo(201);
        assertThat(create().statusCode()).isEqualTo(429);

        await().atMost(5, TimeUnit.SECONDS).pollInterval(200, TimeUnit.MILLISECONDS)
                .untilAsserted(() -> assertThat(create().statusCode()).isEqualTo(201));
    }

    @Test
    void allowedResponsesExposeRateLimitHeaders() throws Exception {
        HttpResponse<String> created = create();

        assertThat(created.statusCode()).isEqualTo(201);
        assertThat(created.headers().firstValue("X-RateLimit-Limit")).contains("2");
        assertThat(created.headers().firstValue("X-RateLimit-Remaining")).contains("1");
    }

    private HttpResponse<String> create() throws Exception {
        return postJson("/api/v1/urls", "{\"originalUrl\":\"https://1.1.1.1/rate-limit\"}");
    }
}
