package com.vinyas.urlshortener.exception;

import org.springframework.http.HttpStatus;

public class InvalidUrlException extends ApiException {

    public InvalidUrlException(String message) {
        super(HttpStatus.BAD_REQUEST, "INVALID_URL", message);
    }
}
