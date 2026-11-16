package com.vinyas.urlshortener.exception;

import org.springframework.http.HttpStatus;

public class ReservedCodeException extends ApiException {

    public ReservedCodeException(String shortCode) {
        super(HttpStatus.BAD_REQUEST, "RESERVED_CODE",
                "Short code '" + shortCode + "' is reserved");
    }
}
