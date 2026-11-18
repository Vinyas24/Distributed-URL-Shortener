package com.vinyas.urlshortener.dto;

public record DailyClickStat(
        String date,
        long clicks
) {
}
