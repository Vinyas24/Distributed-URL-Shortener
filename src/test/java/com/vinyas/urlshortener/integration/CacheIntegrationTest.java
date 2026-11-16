package com.vinyas.urlshortener.integration;

import java.net.http.HttpResponse;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CacheIntegrationTest extends AbstractIntegrationTest {

    @Test
    void createWritesThroughToCacheAndCachedRedirectSurvivesRowDeletion() throws Exception {
        String originalUrl = "https://1.1.1.1/cached-target";
        HttpResponse<String> created = postJson(
                "/api/v1/urls",
                "{\"originalUrl\":\"" + originalUrl + "\",\"customCode\":\"cached-code\"}");

        assertThat(created.statusCode()).isEqualTo(201);
        assertThat(redisTemplate.hasKey("url:redirect:cached-code")).isTrue();

        // If the redirect still works without the database row, it was served from Redis.
        jdbcTemplate.update("DELETE FROM urls WHERE short_code = ?", "cached-code");
        HttpResponse<String> fromCache = get("/cached-code");

        assertThat(fromCache.statusCode()).isEqualTo(302);
        assertThat(fromCache.headers().firstValue("Location")).contains(originalUrl);

        redisTemplate.delete("url:redirect:cached-code");
        assertThat(get("/cached-code").statusCode()).isEqualTo(404);
    }

    @Test
    void negativeCacheEntryIsReplacedWhenTheCodeIsCreated() throws Exception {
        assertThat(get("/later-code").statusCode()).isEqualTo(404);
        assertThat(redisTemplate.opsForValue().get("url:redirect:later-code")).isEqualTo("!");

        HttpResponse<String> created = postJson(
                "/api/v1/urls",
                "{\"originalUrl\":\"https://1.1.1.1/later\",\"customCode\":\"later-code\"}");

        assertThat(created.statusCode()).isEqualTo(201);
        assertThat(redisTemplate.opsForValue().get("url:redirect:later-code"))
                .contains("https://1.1.1.1/later");
        assertThat(get("/later-code").statusCode()).isEqualTo(302);
    }
}
