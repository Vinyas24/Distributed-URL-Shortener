package com.vinyas.urlshortener.dto;

import java.time.Instant;
import java.util.List;

public record UrlDetailsResponse(
        String shortCode,
        String originalUrl,
        String shortUrl,
        long clicks,
        Instant createdAt,
        Instant expiresAt,
        boolean isCustom,
        boolean custom,
        List<DailyClickStat> clicksByDay,
        List<ReferrerStat> referrers
) {
    public UrlDetailsResponse(
            String shortCode,
            String originalUrl,
            String shortUrl,
            long clicks,
            Instant createdAt,
            Instant expiresAt,
            boolean isCustom,
            List<DailyClickStat> clicksByDay,
            List<ReferrerStat> referrers) {
        this(shortCode, originalUrl, shortUrl, clicks, createdAt, expiresAt, isCustom, isCustom, clicksByDay, referrers);
    }
}
