package com.vinyas.urlshortener.integration;

import org.testcontainers.containers.GenericContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Shared containers for the integration-test JVM. Static containers are started once and kept
 * alive so cached Spring contexts never point at a stopped port.
 */
public final class TestInfrastructure {

    public static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16")
            .withDatabaseName("urlshortener")
            .withUsername("test")
            .withPassword("test");

    public static final GenericContainer<?> REDIS = new GenericContainer<>(
            DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379);

    static {
        POSTGRES.start();
        REDIS.start();
    }

    private TestInfrastructure() {
    }

    public static int redisPort() {
        return REDIS.getMappedPort(6379);
    }
}
