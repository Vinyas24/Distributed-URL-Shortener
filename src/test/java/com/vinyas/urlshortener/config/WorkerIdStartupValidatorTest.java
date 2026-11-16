package com.vinyas.urlshortener.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WorkerIdStartupValidatorTest {

    @Test
    void missingWorkerIdFailsBeforeStartup() {
        assertThatThrownBy(() -> validate(new MockEnvironment()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("WORKER_ID");
    }

    @Test
    void blankWorkerIdFailsBeforeStartup() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("app.id-generator.worker-id", " ");

        assertThatThrownBy(() -> validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("WORKER_ID");
    }

    @Test
    void nonNumericWorkerIdFailsBeforeStartup() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("app.id-generator.worker-id", "abc");

        assertThatThrownBy(() -> validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("WORKER_ID");
    }

    @Test
    void outOfRangeWorkerIdFailsBeforeStartup() {
        MockEnvironment tooLow = new MockEnvironment()
                .withProperty("app.id-generator.worker-id", "-1");
        MockEnvironment tooHigh = new MockEnvironment()
                .withProperty("app.id-generator.worker-id", "1024");

        assertThatThrownBy(() -> validate(tooLow)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> validate(tooHigh)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void validWorkerIdIsAccepted() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("app.id-generator.worker-id", "42");

        assertThatCode(() -> validate(environment)).doesNotThrowAnyException();
    }

    private void validate(MockEnvironment environment) {
        WorkerIdStartupValidator validator = new WorkerIdStartupValidator();
        validator.setEnvironment(environment);
        validator.postProcessBeanFactory(new DefaultListableBeanFactory());
    }
}
