package com.vinyas.urlshortener.exception;

import org.springframework.http.HttpStatus;

public class RateLimitedException extends ApiException {

    private final long retryAfterSeconds;
    private final int limit;

    public RateLimitedException(long retryAfterSeconds, int limit) {
        super(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                "Too many requests; retry after " + Math.max(1, retryAfterSeconds) + " second(s)");
        this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
        this.limit = limit;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }

    public int getLimit() {
        return limit;
    }
}
