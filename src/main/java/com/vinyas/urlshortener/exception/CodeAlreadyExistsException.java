package com.vinyas.urlshortener.exception;

import org.springframework.http.HttpStatus;

public class CodeAlreadyExistsException extends ApiException {

    public CodeAlreadyExistsException(String shortCode) {
        super(HttpStatus.CONFLICT, "CODE_ALREADY_EXISTS",
                "Short code '" + shortCode + "' is already in use");
    }
}
