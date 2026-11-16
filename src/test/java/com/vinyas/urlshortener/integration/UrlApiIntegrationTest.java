package com.vinyas.urlshortener.integration;

import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

import static org.assertj.core.api.Assertions.assertThat;

class UrlApiIntegrationTest extends AbstractIntegrationTest {

    @Test
    void createReturns201AndRedirectsWith302() throws Exception {
        HttpResponse<String> created = postJson(
                "/api/v1/urls",
                createBody("https://1.1.1.1/articles/123", null, null));

        assertThat(created.statusCode()).isEqualTo(201);
        String code = jsonString(created.body(), "shortCode");
        assertThat(code).matches("^[A-Za-z0-9_-]{3,15}$");
        assertThat(created.body()).contains("\"originalUrl\":\"https://1.1.1.1/articles/123\"");
        assertThat(created.body()).contains("\"custom\":false");
        assertThat(jsonString(created.body(), "createdAt")).isNotBlank();
        assertThat(created.headers().firstValue(HttpHeaders.LOCATION))
                .hasValueSatisfying(location -> assertThat(location).endsWith("/" + code));
        assertThat(created.headers().firstValue("X-Trace-Id")).isPresent();

        HttpResponse<String> redirect = get("/" + code);

        assertThat(redirect.statusCode()).isEqualTo(302);
        assertThat(redirect.headers().firstValue(HttpHeaders.LOCATION))
                .contains("https://1.1.1.1/articles/123");
        assertThat(redirect.headers().firstValue(HttpHeaders.CACHE_CONTROL)).contains("no-store");
        assertThat(redirect.headers().firstValue("X-Trace-Id")).isPresent();
    }

    @Test
    void createWithCustomCodeReturnsThatCode() throws Exception {
        HttpResponse<String> created = postJson(
                "/api/v1/urls",
                createBody("https://1.1.1.1/custom-target", "launch-2026", null));

        assertThat(created.statusCode()).isEqualTo(201);
        assertThat(jsonString(created.body(), "shortCode")).isEqualTo("launch-2026");
        assertThat(created.body()).contains("\"custom\":true");

        assertThat(get("/launch-2026").statusCode()).isEqualTo(302);
    }

    @Test
    void sameOriginalUrlGetsANewCodeEveryTime() throws Exception {
        String originalUrl = "https://1.1.1.1/no-dedup";

        String firstCode = jsonString(
                postJson("/api/v1/urls", createBody(originalUrl, null, null)).body(), "shortCode");
        String secondCode = jsonString(
                postJson("/api/v1/urls", createBody(originalUrl, null, null)).body(), "shortCode");

        assertThat(firstCode).isNotEqualTo(secondCode);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM urls WHERE original_url = ?", Integer.class, originalUrl))
                .isEqualTo(2);
    }

    @Test
    void expiredCodeReturns410() throws Exception {
        jdbcTemplate.update("""
                INSERT INTO urls (id, short_code, original_url, is_custom, created_at, expires_at)
                VALUES (?, ?, ?, FALSE, now() - interval '2 hours', now() - interval '1 hour')
                """, 900001L, "expired1", "https://1.1.1.1/expired");

        HttpResponse<String> response = get("/expired1");

        assertThat(response.statusCode()).isEqualTo(410);
        assertThat(jsonString(response.body(), "code")).isEqualTo("URL_EXPIRED");
        assertThat(jsonString(response.body(), "traceId")).isNotBlank();
    }

    @Test
    void unknownCodeReturns404() throws Exception {
        HttpResponse<String> response = get("/missing123");

        assertThat(response.statusCode()).isEqualTo(404);
        assertThat(jsonString(response.body(), "code")).isEqualTo("URL_NOT_FOUND");
        assertThat(jsonString(response.body(), "traceId")).isNotBlank();
        assertThat(response.headers().firstValue("X-Trace-Id")).isPresent();
    }

    @Test
    void malformedCodeReturns404() throws Exception {
        HttpResponse<String> response = get("/ab");

        assertThat(response.statusCode()).isEqualTo(404);
        assertThat(jsonString(response.body(), "code")).isEqualTo("URL_NOT_FOUND");
    }

    @Test
    void malformedJsonReturns400() throws Exception {
        HttpResponse<String> response = postJson("/api/v1/urls", "{\"originalUrl\":");

        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(jsonString(response.body(), "code")).isEqualTo("MALFORMED_JSON");
        assertThat(jsonString(response.body(), "traceId")).isNotBlank();
    }

    @Test
    void unknownJsonFieldReturns400() throws Exception {
        HttpResponse<String> response = postJson(
                "/api/v1/urls",
                "{\"originalUrl\":\"https://1.1.1.1/x\",\"unexpected\":1}");

        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(jsonString(response.body(), "traceId")).isNotBlank();
    }

    @Test
    void wrongMethodReturns405() throws Exception {
        HttpResponse<String> response = putJson("/api/v1/urls", "{}");

        assertThat(response.statusCode()).isEqualTo(405);
        assertThat(jsonString(response.body(), "code")).isEqualTo("METHOD_NOT_ALLOWED");
        assertThat(response.headers().firstValue(HttpHeaders.ALLOW)).hasValueSatisfying(
                allow -> assertThat(allow).contains("POST"));
    }

    @Test
    void unknownRouteReturns404() throws Exception {
        HttpResponse<String> response = get("/api/v1/nope");

        assertThat(response.statusCode()).isEqualTo(404);
        assertThat(jsonString(response.body(), "code")).isEqualTo("ROUTE_NOT_FOUND");
        assertThat(jsonString(response.body(), "traceId")).isNotBlank();
    }

    @Test
    void invalidUrlsReturn400() throws Exception {
        assertThat(postJson("/api/v1/urls", createBody("http://localhost/x", null, null)).statusCode())
                .isEqualTo(400);
        HttpResponse<String> response = postJson(
                "/api/v1/urls", createBody("ftp://example.com/x", null, null));
        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(jsonString(response.body(), "code")).isEqualTo("INVALID_URL");
    }

    @Test
    void reservedCustomCodeReturns400() throws Exception {
        HttpResponse<String> response = postJson(
                "/api/v1/urls", createBody("https://1.1.1.1/x", "api", null));

        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(jsonString(response.body(), "code")).isEqualTo("RESERVED_CODE");
    }

    @Test
    void invalidCustomCodeReturns400() throws Exception {
        HttpResponse<String> response = postJson(
                "/api/v1/urls", createBody("https://1.1.1.1/x", "ab", null));

        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(jsonString(response.body(), "code")).isEqualTo("INVALID_CUSTOM_CODE");
    }

    @Test
    void expiryMustBeInTheFuture() throws Exception {
        HttpResponse<String> response = postJson(
                "/api/v1/urls",
                createBody("https://1.1.1.1/x", null, Instant.now().minusSeconds(30)));

        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(jsonString(response.body(), "code")).isEqualTo("INVALID_EXPIRY");
    }

    @Test
    void createWithExpiryPersistsIt() throws Exception {
        Instant expiresAt = Instant.now().plus(1, ChronoUnit.DAYS);

        HttpResponse<String> response = postJson(
                "/api/v1/urls", createBody("https://1.1.1.1/expiring", null, expiresAt));

        assertThat(response.statusCode()).isEqualTo(201);
        assertThat(jsonString(response.body(), "expiresAt")).isNotBlank();
        String code = jsonString(response.body(), "shortCode");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM urls WHERE short_code = ? AND expires_at IS NOT NULL",
                Integer.class, code)).isEqualTo(1);
    }

    @Test
    void corsAppliesToApiRoutesOnly() throws Exception {
        String code = jsonString(
                postJson("/api/v1/urls", createBody("https://1.1.1.1/cors", null, null)).body(),
                "shortCode");

        HttpResponse<String> preflight = options("/api/v1/urls", "http://localhost:3000");
        assertThat(preflight.statusCode()).isEqualTo(200);
        assertThat(preflight.headers().firstValue(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN))
                .contains("http://localhost:3000");

        HttpResponse<String> redirect = get("/" + code, "http://localhost:3000");
        assertThat(redirect.statusCode()).isEqualTo(302);
        assertThat(redirect.headers().firstValue(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN)).isEmpty();
    }

    @Test
    void healthEndpointIsUp() throws Exception {
        HttpResponse<String> response = get("/actuator/health");

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("\"status\":\"UP\"");
    }

    @Test
    void swaggerIsDisabledOutsideTheDevProfile() throws Exception {
        assertThat(get("/v3/api-docs").statusCode()).isEqualTo(404);
    }

    private static String createBody(String originalUrl, String customCode, Instant expiresAt) {
        StringBuilder body = new StringBuilder("{\"originalUrl\":\"").append(originalUrl).append('"');
        if (customCode != null) {
            body.append(",\"customCode\":\"").append(customCode).append('"');
        }
        if (expiresAt != null) {
            body.append(",\"expiresAt\":\"").append(expiresAt).append('"');
        }
        return body.append('}').toString();
    }
}
