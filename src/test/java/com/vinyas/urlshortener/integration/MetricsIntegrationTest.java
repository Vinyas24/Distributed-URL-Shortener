package com.vinyas.urlshortener.integration;

import java.net.http.HttpResponse;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that the Prometheus endpoint is exposed and that each instrumented code path publishes
 * a metric. Tag values are bounded, so short codes and URLs must never appear in the scrape output.
 */
class MetricsIntegrationTest extends AbstractIntegrationTest {

    private static final String SHORT_CODE = "metrics-demo";
    private static final String ORIGINAL_URL = "https://1.1.1.1/metrics-check";

    @Test
    void prometheusEndpointExposesApplicationMetrics() throws Exception {
        HttpResponse<String> created = postJson(
                "/api/v1/urls",
                "{\"originalUrl\":\"" + ORIGINAL_URL + "\",\"customCode\":\"" + SHORT_CODE + "\"}");
        assertThat(created.statusCode()).isEqualTo(201);

        // First redirect is a cache miss (DB fallback), the second is a cache hit.
        assertThat(get("/" + SHORT_CODE).statusCode()).isEqualTo(302);
        assertThat(get("/" + SHORT_CODE).statusCode()).isEqualTo(302);
        // Unknown code records a negative cache entry, then a second lookup hits it.
        assertThat(get("/does-not-exist").statusCode()).isEqualTo(404);
        assertThat(get("/does-not-exist").statusCode()).isEqualTo(404);

        HttpResponse<String> scrape = get("/actuator/prometheus");

        assertThat(scrape.statusCode()).isEqualTo(200);
        assertThat(scrape.headers().firstValue("Content-Type"))
                .hasValueSatisfying(value -> assertThat(value).contains("text/plain"));

        assertThat(scrape.body())
                .contains("urlshortener_create_requests_total")
                .contains("urlshortener_create_duration_seconds_count")
                .contains("urlshortener_create_duration_seconds_bucket")
                .contains("urlshortener_redirect_requests_total")
                .contains("urlshortener_redirect_duration_seconds_count")
                .contains("urlshortener_redirect_duration_seconds_bucket")
                .contains("urlshortener_cache_gets_total")
                .contains("urlshortener_cache_writes_total")
                .contains("urlshortener_rate_limit_requests_total")
                .contains("urlshortener_analytics_events_total")
                .contains("urlshortener_analytics_queue_size")
                .contains("http_server_requests_seconds_count")
                .contains("http_server_requests_seconds_bucket")
                .contains("hikaricp_connections_active")
                .contains("hikaricp_connections_idle");

        assertThat(scrape.body())
                .contains("application=\"url-shortener\"")
                .contains("result=\"success\"")
                .contains("decision=\"allowed\"")
                .contains("result=\"hit\"")
                .contains("result=\"miss\"")
                .contains("result=\"negative\"");

        // Bounded cardinality: identifiers must not leak into tags.
        assertThat(scrape.body())
                .doesNotContain(SHORT_CODE)
                .doesNotContain(ORIGINAL_URL);
    }
}
