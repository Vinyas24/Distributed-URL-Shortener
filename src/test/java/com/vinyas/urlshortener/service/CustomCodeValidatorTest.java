package com.vinyas.urlshortener.service;

import com.vinyas.urlshortener.exception.InvalidCustomCodeException;
import com.vinyas.urlshortener.exception.ReservedCodeException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CustomCodeValidatorTest {

    private final CustomCodeValidator validator = new CustomCodeValidator(new ReservedWords());

    @Test
    void nullMeansNoCustomCode() {
        assertThat(validator.validate(null)).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc", "ABC", "123", "a_b-C9", "abcdefghijklmno"})
    void acceptsValidCodes(String code) {
        assertThat(validator.validate(code)).isEqualTo(code);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "ab", "abcdefghijklmnop", "bad code", "bad.code", "bad/code", "ümlaut", "a b"})
    void rejectsInvalidCodes(String code) {
        assertThatThrownBy(() -> validator.validate(code))
                .isInstanceOf(InvalidCustomCodeException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"api", "API", "actuator", "swagger-ui", "v3", "health", "metrics", "urls", "admin", "favicon.ico"})
    void rejectsReservedCodesCaseInsensitively(String code) {
        assertThatThrownBy(() -> validator.validate(code))
                .isInstanceOf(ReservedCodeException.class);
    }
}
