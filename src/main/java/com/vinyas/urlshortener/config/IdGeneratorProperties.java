package com.vinyas.urlshortener.config;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.id-generator")
public class IdGeneratorProperties {

    @NotNull
    @Min(0)
    @Max(1023)
    private Integer workerId;

    @Min(1)
    private long maxBackwardWaitMs = 1000;

    public Integer getWorkerId() {
        return workerId;
    }

    public void setWorkerId(Integer workerId) {
        this.workerId = workerId;
    }

    public long getMaxBackwardWaitMs() {
        return maxBackwardWaitMs;
    }

    public void setMaxBackwardWaitMs(long maxBackwardWaitMs) {
        this.maxBackwardWaitMs = maxBackwardWaitMs;
    }
}
