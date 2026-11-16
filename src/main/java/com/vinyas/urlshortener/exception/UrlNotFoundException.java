package com.vinyas.urlshortener.exception;

import org.springframework.http.HttpStatus;

public class UrlNotFoundException extends ApiException {

    public UrlNotFoundException() {
        super(HttpStatus.NOT_FOUND, "URL_NOT_FOUND", "Short code was not found");
    }
}
