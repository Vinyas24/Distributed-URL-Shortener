package com.vinyas.urlshortener.exception;

import org.springframework.http.HttpStatus;

public class IdGenerationException extends ApiException {

    public IdGenerationException(String message) {
        super(HttpStatus.SERVICE_UNAVAILABLE, "ID_GENERATION_FAILED", message);
    }

    public IdGenerationException(String message, Throwable cause) {
        super(HttpStatus.SERVICE_UNAVAILABLE, "ID_GENERATION_FAILED", message, cause);
    }
}
