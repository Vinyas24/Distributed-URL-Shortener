package com.vinyas.urlshortener.dto;

public record ReferrerStat(
        String source,
        long clicks,
        int percentage
) {
}
