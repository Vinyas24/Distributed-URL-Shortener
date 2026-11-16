package com.vinyas.urlshortener.exception;

import org.springframework.http.HttpStatus;

public class InvalidCustomCodeException extends ApiException {

    public InvalidCustomCodeException(String message) {
        super(HttpStatus.BAD_REQUEST, "INVALID_CUSTOM_CODE", message);
    }
}
