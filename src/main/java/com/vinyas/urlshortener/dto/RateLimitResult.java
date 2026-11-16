package com.vinyas.urlshortener.dto;

public record RateLimitResult(boolean allowed, int limit, int remaining, long retryAfterSeconds) {

    public static RateLimitResult allowed(int limit, int remaining) {
        return new RateLimitResult(true, limit, Math.max(0, remaining), 0);
    }

    public static RateLimitResult rejected(int limit, long retryAfterSeconds) {
        return new RateLimitResult(false, limit, 0, Math.max(1, retryAfterSeconds));
    }
}
