package com.vinyas.urlshortener.dto;

import java.time.Instant;

public record ResolvedUrl(String shortCode, String originalUrl, Instant expiresAt) {
}
