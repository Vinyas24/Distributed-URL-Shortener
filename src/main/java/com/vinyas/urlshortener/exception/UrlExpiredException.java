package com.vinyas.urlshortener.exception;

import org.springframework.http.HttpStatus;

public class UrlExpiredException extends ApiException {

    public UrlExpiredException() {
        super(HttpStatus.GONE, "URL_EXPIRED", "Short code has expired");
    }
}
