package com.vinyas.urlshortener.component;

import java.time.Instant;

/**
 * Value stored in the redirect cache. A negative entry means "the database does not know this
 * code", which lets repeated 404s avoid hitting PostgreSQL.
 */
public record CachedRedirect(String originalUrl, Instant expiresAt, boolean negative) {

    public static CachedRedirect found(String originalUrl, Instant expiresAt) {
        return new CachedRedirect(originalUrl, expiresAt, false);
    }

    public static CachedRedirect notFound() {
        return new CachedRedirect(null, null, true);
    }
}
