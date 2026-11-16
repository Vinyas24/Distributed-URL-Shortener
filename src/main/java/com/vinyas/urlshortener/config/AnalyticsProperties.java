package com.vinyas.urlshortener.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.analytics")
public class AnalyticsProperties {

    private boolean enabled = true;

    @Min(1)
    private int queueCapacity = 10_000;

    @Min(1)
    private int batchSize = 500;

    @Min(1)
    private long flushIntervalMs = 500;

    @NotBlank
    private String ipHashSalt = "local-dev-salt";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getQueueCapacity() {
        return queueCapacity;
    }

    public void setQueueCapacity(int queueCapacity) {
        this.queueCapacity = queueCapacity;
    }

    public int getBatchSize() {
        return batchSize;
    }

    public void setBatchSize(int batchSize) {
        this.batchSize = batchSize;
    }

    public long getFlushIntervalMs() {
        return flushIntervalMs;
    }

    public void setFlushIntervalMs(long flushIntervalMs) {
        this.flushIntervalMs = flushIntervalMs;
    }

    public String getIpHashSalt() {
        return ipHashSalt;
    }

    public void setIpHashSalt(String ipHashSalt) {
        this.ipHashSalt = ipHashSalt;
    }
}
