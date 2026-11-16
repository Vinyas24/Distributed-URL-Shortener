package com.vinyas.urlshortener.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;

public record CreateUrlRequest(
        @NotBlank(message = "originalUrl is required")
        String originalUrl,
        String customCode,
        Instant expiresAt) {
}
