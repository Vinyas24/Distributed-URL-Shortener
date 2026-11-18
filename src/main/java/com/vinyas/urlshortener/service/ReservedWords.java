package com.vinyas.urlshortener.service;

import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Component;

@Component
public class ReservedWords {

    private static final Set<String> RESERVED = Set.of(
            "api",
            "actuator",
            "swagger",
            "swagger-ui",
            "v3",
            "openapi",
            "health",
            "healthz",
            "readyz",
            "livez",
            "favicon.ico",
            "robots.txt",
            "sitemap.xml",
            "well-known",
            ".well-known",
            "error",
            "metrics",
            "prometheus",
            "docs",
            "admin",
            "static",
            "assets",
            "login",
            "logout",
            "dashboard",
            "links",
            "stats",
            "expired",
            "signup",
            "register",
            "urls",
            "redirect",
            "redirects",
            "shortener",
            "oauth",
            "graphql",
            "status",
            "q",
            "r");

    public boolean isReserved(String shortCode) {
        return shortCode != null && RESERVED.contains(shortCode.toLowerCase(Locale.ROOT));
    }

    public Set<String> all() {
        return RESERVED;
    }
}
