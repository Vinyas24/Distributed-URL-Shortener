package com.vinyas.urlshortener.config;

import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.EnvironmentAware;
import org.springframework.core.Ordered;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Validates WORKER_ID before the datasource and Flyway initialize.
 *
 * <p>Configuration-property validation would also catch this, but only when the ID generator
 * bean is created, which happens after Flyway has already connected to PostgreSQL. Failing in a
 * bean-factory post-processor makes a missing or invalid worker ID a true startup failure.</p>
 */
@Component
public class WorkerIdStartupValidator implements BeanFactoryPostProcessor, EnvironmentAware, Ordered {

    private static final int MAX_WORKER_ID = 1023;

    private Environment environment;

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) {
        String rawWorkerId = environment.getProperty("app.id-generator.worker-id");
        if (rawWorkerId == null || rawWorkerId.isBlank()) {
            throw new IllegalStateException(
                    "WORKER_ID is required and must be an integer between 0 and 1023");
        }
        try {
            int workerId = Integer.parseInt(rawWorkerId.trim());
            if (workerId < 0 || workerId > MAX_WORKER_ID) {
                throw new IllegalStateException(
                        "WORKER_ID must be between 0 and 1023, but was " + workerId);
            }
        } catch (NumberFormatException ex) {
            throw new IllegalStateException(
                    "WORKER_ID must be an integer between 0 and 1023, but was '" + rawWorkerId + "'",
                    ex);
        }
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
