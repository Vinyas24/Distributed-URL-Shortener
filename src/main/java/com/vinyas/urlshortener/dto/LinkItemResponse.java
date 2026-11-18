package com.vinyas.urlshortener.dto;

import java.time.Instant;

public record LinkItemResponse(
        String shortCode,
        String originalUrl,
        String shortUrl,
        long clicks,
        Instant createdAt,
        Instant expiresAt,
        boolean isCustom,
        boolean custom
) {
    public LinkItemResponse(String shortCode, String originalUrl, String shortUrl, long clicks, Instant createdAt, Instant expiresAt, boolean isCustom) {
        this(shortCode, originalUrl, shortUrl, clicks, createdAt, expiresAt, isCustom, isCustom);
    }
}
