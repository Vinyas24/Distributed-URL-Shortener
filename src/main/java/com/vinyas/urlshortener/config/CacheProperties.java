package com.vinyas.urlshortener.config;

import java.time.Duration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.cache")
public class CacheProperties {

    private boolean enabled = true;

    @NotNull
    private Duration redirectTtl = Duration.ofHours(1);

    @NotNull
    private Duration negativeTtl = Duration.ofSeconds(30);

    @NotBlank
    private String keyPrefix = "url:redirect:";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Duration getRedirectTtl() {
        return redirectTtl;
    }

    public void setRedirectTtl(Duration redirectTtl) {
        this.redirectTtl = redirectTtl;
    }

    public Duration getNegativeTtl() {
        return negativeTtl;
    }

    public void setNegativeTtl(Duration negativeTtl) {
        this.negativeTtl = negativeTtl;
    }

    public String getKeyPrefix() {
        return keyPrefix;
    }

    public void setKeyPrefix(String keyPrefix) {
        this.keyPrefix = keyPrefix;
    }
}
