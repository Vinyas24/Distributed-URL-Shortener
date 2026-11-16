package com.vinyas.urlshortener.dto;

import java.time.Instant;

public record UrlResponse(
        String shortCode,
        String shortUrl,
        String originalUrl,
        boolean custom,
        Instant createdAt,
        Instant expiresAt) {
}
