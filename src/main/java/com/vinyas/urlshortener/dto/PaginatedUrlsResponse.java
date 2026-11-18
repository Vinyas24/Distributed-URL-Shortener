package com.vinyas.urlshortener.dto;

import java.util.List;

public record PaginatedUrlsResponse(
        List<LinkItemResponse> items,
        long total,
        int page,
        int totalPages
) {
}
