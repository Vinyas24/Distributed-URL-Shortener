package com.vinyas.urlshortener.config;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class IdGeneratorPropertiesValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void missingWorkerIdIsRejected() {
        assertThat(validator.validate(properties(null))).isNotEmpty();
    }

    @Test
    void outOfRangeWorkerIdIsRejected() {
        assertThat(validator.validate(properties(-1))).isNotEmpty();
        assertThat(validator.validate(properties(1024))).isNotEmpty();
    }

    @Test
    void validWorkerIdIsAccepted() {
        assertThat(validator.validate(properties(0))).isEmpty();
        assertThat(validator.validate(properties(1023))).isEmpty();
    }

    private IdGeneratorProperties properties(Integer workerId) {
        IdGeneratorProperties properties = new IdGeneratorProperties();
        properties.setWorkerId(workerId);
        return properties;
    }
}
