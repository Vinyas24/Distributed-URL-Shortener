package com.vinyas.urlshortener.integration;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.data.redis.host=127.0.0.1",
        "spring.data.redis.port=1",
        "spring.data.redis.timeout=200ms",
        "spring.data.redis.connect-timeout=200ms",
        "app.analytics.enabled=false"
})
class HealthReadinessFailureIntegrationTest {

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", TestInfrastructure.POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", TestInfrastructure.POSTGRES::getUsername);
        registry.add("spring.datasource.password", TestInfrastructure.POSTGRES::getPassword);
    }

    @Value("${local.server.port}")
    private int port;

    @Test
    void livenessStaysUpWhileReadinessFailsWhenRedisIsDown() throws Exception {
        // Liveness must remain 200 UP (the process is not dead and should not be killed)
        HttpRequest livenessReq = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/actuator/health/liveness"))
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();
        HttpResponse<String> liveness = HTTP.send(livenessReq, HttpResponse.BodyHandlers.ofString());
        assertThat(liveness.statusCode()).isEqualTo(200);
        assertThat(liveness.body()).contains("\"status\":\"UP\"");

        // Readiness must return 503 DOWN (unready to accept regular traffic that requires Redis)
        HttpRequest readinessReq = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/actuator/health/readiness"))
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();
        HttpResponse<String> readiness = HTTP.send(readinessReq, HttpResponse.BodyHandlers.ofString());
        assertThat(readiness.statusCode()).isEqualTo(503);
        assertThat(readiness.body()).contains("\"status\":\"DOWN\"");
    }
}
