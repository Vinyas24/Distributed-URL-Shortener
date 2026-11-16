package com.vinyas.urlshortener.controller;

import java.net.URI;

import com.vinyas.urlshortener.component.ClickEventRecorder;
import com.vinyas.urlshortener.dto.ResolvedUrl;
import com.vinyas.urlshortener.service.UrlService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RedirectController {

    private final UrlService urlService;
    private final ClickEventRecorder clickEventRecorder;

    public RedirectController(UrlService urlService, ClickEventRecorder clickEventRecorder) {
        this.urlService = urlService;
        this.clickEventRecorder = clickEventRecorder;
    }

    @GetMapping("/{code}")
    public ResponseEntity<Void> redirect(@PathVariable String code, HttpServletRequest request) {
        ResolvedUrl target = urlService.resolve(code);
        clickEventRecorder.record(code, request);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(target.originalUrl()))
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header("X-Robots-Tag", "noindex")
                .build();
    }
}
