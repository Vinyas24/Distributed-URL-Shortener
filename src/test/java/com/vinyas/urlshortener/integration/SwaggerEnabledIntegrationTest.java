package com.vinyas.urlshortener.integration;

import java.net.http.HttpResponse;

import org.junit.jupiter.api.Test;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles("dev")
@TestPropertySource(properties = "app.id-generator.worker-id=0")
class SwaggerEnabledIntegrationTest extends AbstractIntegrationTest {

    @Test
    void openApiDocsAreAvailableInTheDevProfile() throws Exception {
        HttpResponse<String> response = get("/v3/api-docs");

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("\"openapi\"");
    }
}
