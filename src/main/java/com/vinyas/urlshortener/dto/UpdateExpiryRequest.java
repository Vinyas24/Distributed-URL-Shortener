package com.vinyas.urlshortener.dto;

import java.time.Instant;

public record UpdateExpiryRequest(
        Instant expiresAt
) {
}
