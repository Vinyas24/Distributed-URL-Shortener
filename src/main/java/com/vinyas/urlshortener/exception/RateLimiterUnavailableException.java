package com.vinyas.urlshortener.exception;

import org.springframework.http.HttpStatus;

public class RateLimiterUnavailableException extends ApiException {

    public RateLimiterUnavailableException() {
        super(HttpStatus.SERVICE_UNAVAILABLE, "RATE_LIMITER_UNAVAILABLE",
                "Rate limiter is temporarily unavailable");
    }
}
