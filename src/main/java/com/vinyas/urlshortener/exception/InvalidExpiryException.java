package com.vinyas.urlshortener.exception;

import org.springframework.http.HttpStatus;

public class InvalidExpiryException extends ApiException {

    public InvalidExpiryException(String message) {
        super(HttpStatus.BAD_REQUEST, "INVALID_EXPIRY", message);
    }
}
