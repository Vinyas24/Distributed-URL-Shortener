package com.vinyas.urlshortener.component;

import com.vinyas.urlshortener.dto.RateLimitResult;
import com.vinyas.urlshortener.exception.RateLimitedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Applies the create-endpoint rate limit before request-body parsing and validation, so an
 * exhausted client cannot force JSON deserialization work.
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final CreateRateLimiter rateLimiter;

    public RateLimitInterceptor(CreateRateLimiter rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        RateLimitResult result = rateLimiter.check(request);
        if (!result.allowed()) {
            throw new RateLimitedException(result.retryAfterSeconds(), result.limit());
        }

        response.setHeader(CreateRateLimiter.LIMIT_HEADER, Integer.toString(result.limit()));
        response.setHeader(CreateRateLimiter.REMAINING_HEADER, Integer.toString(result.remaining()));
        return true;
    }
}
