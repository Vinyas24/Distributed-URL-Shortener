package com.vinyas.urlshortener.service;

import java.util.regex.Pattern;

import com.vinyas.urlshortener.exception.InvalidCustomCodeException;
import com.vinyas.urlshortener.exception.ReservedCodeException;
import org.springframework.stereotype.Component;

@Component
public class CustomCodeValidator {

    private static final Pattern CUSTOM_CODE_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{3,15}$");

    private final ReservedWords reservedWords;

    public CustomCodeValidator(ReservedWords reservedWords) {
        this.reservedWords = reservedWords;
    }

    /**
     * @return the validated code, or {@code null} when no custom code was supplied
     */
    public String validate(String shortCode) {
        if (shortCode == null) {
            return null;
        }
        if (reservedWords.isReserved(shortCode)) {
            throw new ReservedCodeException(shortCode);
        }
        if (!CUSTOM_CODE_PATTERN.matcher(shortCode).matches()) {
            throw new InvalidCustomCodeException(
                    "customCode must be 3 to 15 characters using A-Z, a-z, 0-9, '_' or '-'");
        }
        return shortCode;
    }
}
