package com.vinyas.urlshortener.controller;

import com.vinyas.urlshortener.dto.CreateUrlRequest;
import com.vinyas.urlshortener.dto.PaginatedUrlsResponse;
import com.vinyas.urlshortener.dto.UpdateExpiryRequest;
import com.vinyas.urlshortener.dto.UrlDetailsResponse;
import com.vinyas.urlshortener.dto.UrlResponse;
import com.vinyas.urlshortener.service.UrlService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/urls")
public class UrlController {

    private final UrlService urlService;

    public UrlController(UrlService urlService) {
        this.urlService = urlService;
    }

    @PostMapping
    public ResponseEntity<UrlResponse> create(
            @Valid @RequestBody CreateUrlRequest request,
            @RequestHeader(value = "X-Api-Key", required = false) String apiKey) {
        UrlResponse response = urlService.create(request, apiKey);
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.LOCATION, response.shortUrl())
                .body(response);
    }

    @GetMapping
    public ResponseEntity<PaginatedUrlsResponse> list(
            @RequestHeader(value = "X-Api-Key", required = false) String apiKey,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "5") int size) {
        PaginatedUrlsResponse response = urlService.listUrls(apiKey, search, page, size);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{code}")
    public ResponseEntity<UrlDetailsResponse> getDetails(@PathVariable String code) {
        UrlDetailsResponse response = urlService.getStats(code);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{code}/stats")
    public ResponseEntity<UrlDetailsResponse> getStats(@PathVariable String code) {
        UrlDetailsResponse response = urlService.getStats(code);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{code}/expiry")
    public ResponseEntity<UrlResponse> updateExpiry(
            @PathVariable String code,
            @RequestBody UpdateExpiryRequest request) {
        UrlResponse response = urlService.updateExpiry(code, request.expiresAt());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{code}")
    public ResponseEntity<Void> delete(@PathVariable String code) {
        urlService.delete(code);
        return ResponseEntity.noContent().build();
    }
}
