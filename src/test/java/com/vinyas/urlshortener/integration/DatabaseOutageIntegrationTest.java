package com.vinyas.urlshortener.integration;

import java.net.http.HttpResponse;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Stops a real PostgreSQL container mid-test to prove the database-outage contract:
 *
 * <ul>
 *   <li>a cached redirect keeps working (302) with the database down,</li>
 *   <li>an uncached redirect fails as 503 {@code SERVICE_UNAVAILABLE},</li>
 *   <li>a create fails as 503 {@code SERVICE_UNAVAILABLE}.</li>
 * </ul>
 *
 * <p>The container is dedicated to this class, so stopping it cannot disturb the shared
 * containers used by the rest of the suite.</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@TestPropertySource(properties = {
        "spring.datasource.hikari.connection-timeout=750",
        "spring.datasource.hikari.validation-timeout=250",
        "app.analytics.enabled=false",
        "app.rate-limit.enabled=false"
})
class DatabaseOutageIntegrationTest extends AbstractHttpIntegrationTest {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16")
            .withDatabaseName("urlshortener")
            .withUsername("test")
            .withPassword("test");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.data.redis.host", TestInfrastructure.REDIS::getHost);
        registry.add("spring.data.redis.port", TestInfrastructure::redisPort);
    }

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Test
    @Timeout(60)
    void cachedRedirectsSurviveOutageAndUncachedWorkReturns503() throws Exception {
        assertThat(create("db-outage").statusCode()).isEqualTo(201);
        assertThat(create("db-cached").statusCode()).isEqualTo(201);

        // Write-through means both codes are cached before the outage.
        assertThat(redisTemplate.hasKey("url:redirect:db-outage")).isTrue();
        assertThat(redisTemplate.hasKey("url:redirect:db-cached")).isTrue();

        POSTGRES.stop();

        // Cached redirects never touch PostgreSQL and must keep working.
        HttpResponse<String> cached = get("/db-cached");
        assertThat(cached.statusCode()).isEqualTo(302);
        assertThat(cached.headers().firstValue("Location")).contains("https://1.1.1.1/outage/db-cached");

        // Remove the cache entry so the next redirect has to query the database.
        redisTemplate.delete("url:redirect:db-outage");

        HttpResponse<String> uncached = get("/db-outage");
        assertThat(uncached.statusCode()).isEqualTo(503);
        assertThat(jsonString(uncached.body(), "code")).isEqualTo("SERVICE_UNAVAILABLE");
        assertThat(jsonString(uncached.body(), "traceId")).isNotBlank();

        HttpResponse<String> create = create("db-create");
        assertThat(create.statusCode()).isEqualTo(503);
        assertThat(jsonString(create.body(), "code")).isEqualTo("SERVICE_UNAVAILABLE");
        assertThat(jsonString(create.body(), "traceId")).isNotBlank();
    }

    private HttpResponse<String> create(String customCode) throws Exception {
        return postJson(
                "/api/v1/urls",
                "{\"originalUrl\":\"https://1.1.1.1/outage/" + customCode + "\","
                        + "\"customCode\":\"" + customCode + "\"}");
    }
}
