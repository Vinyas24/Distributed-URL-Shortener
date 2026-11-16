package com.vinyas.urlshortener.service;

import java.net.InetAddress;
import java.net.UnknownHostException;

import com.vinyas.urlshortener.component.HostResolver;
import com.vinyas.urlshortener.exception.InvalidUrlException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UrlValidatorTest {

    private static final HostResolver RESOLVER = host -> {
        if ("internal.example.com".equals(host)) {
            return new InetAddress[] {InetAddress.getByName("10.0.0.7")};
        }
        if ("127.0.0.1.nip.io".equals(host)) {
            return new InetAddress[] {InetAddress.getByName("127.0.0.1")};
        }
        if ("unresolvable.example.com".equals(host)) {
            throw new UnknownHostException(host);
        }
        return new InetAddress[] {InetAddress.getByName("93.184.216.34")};
    };

    private final UrlValidator validator = new UrlValidator(RESOLVER);

    @ParameterizedTest
    @ValueSource(strings = {
            "https://example.com",
            "http://example.com/path?q=1#fragment",
            "https://sub.example.co.uk/a/b",
            "https://1.1.1.1/path",
            "https://8.8.8.8:8443/path",
            "https://[2606:4700:4700::1111]/",
            "https://example.com./path",
            "https://example.com:443/path"
    })
    void acceptsPublicHttpUrls(String url) {
        assertThat(validator.validate(url)).isEqualTo(url);
    }

    @Test
    void trimsSurroundingWhitespace() {
        assertThat(validator.validate("  https://example.com/path  "))
                .isEqualTo("https://example.com/path");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "ftp://example.com/file",
            "javascript:alert(1)",
            "data:text/plain,hello",
            "file:///etc/passwd",
            "mailto:user@example.com",
            "example.com",
            "//example.com/path",
            "http://",
            "http:///path",
            "http://user:pass@example.com/",
            "http://example.com:0/",
            "http://example.com:70000/",
            "http://example.com/path with spaces",
            "http://localhost/",
            "http://LOCALHOST:8080/",
            "http://app.localhost/",
            "http://localhost.localdomain/",
            "http://foo.local/",
            "http://foo.internal/",
            "http://foo.home.arpa/",
            "http://foo.lan/",
            "http://foo.svc/",
            "http://127.0.0.1/",
            "http://127.1/",
            "http://127.0.0.1.nip.io/",
            "http://10.0.0.1/",
            "http://172.16.0.1/",
            "http://172.31.255.255/",
            "http://192.168.1.1/",
            "http://169.254.169.254/latest/meta-data",
            "http://0.0.0.0/",
            "http://100.64.0.1/",
            "http://192.0.2.1/",
            "http://198.18.0.1/",
            "http://198.51.100.1/",
            "http://203.0.113.1/",
            "http://224.0.0.1/",
            "http://255.255.255.255/",
            "http://0177.0.0.1/",
            "http://2130706433/",
            "http://1.2.3/",
            "http://[::1]/",
            "http://[::]/",
            "http://[fd00::1]/",
            "http://[fe80::1]/",
            "http://[2001:db8::1]/",
            "http://[::ffff:127.0.0.1]/",
            "http://[::ffff:10.0.0.1]/",
            "http://internal.example.com/",
            "http://unresolvable.example.com/"
    })
    void rejectsUnsafeOrMalformedUrls(String url) {
        assertThatThrownBy(() -> validator.validate(url))
                .isInstanceOf(InvalidUrlException.class);
    }

    @Test
    void rejectsNullAndBlankUrls() {
        assertThatThrownBy(() -> validator.validate(null)).isInstanceOf(InvalidUrlException.class);
        assertThatThrownBy(() -> validator.validate("")).isInstanceOf(InvalidUrlException.class);
        assertThatThrownBy(() -> validator.validate("   ")).isInstanceOf(InvalidUrlException.class);
    }

    @Test
    void rejectsUrlsLongerThan2048Characters() {
        String url = "https://example.com/" + "a".repeat(2048);
        assertThatThrownBy(() -> validator.validate(url))
                .isInstanceOf(InvalidUrlException.class)
                .hasMessageContaining("2048");
    }

    @Test
    void acceptsExactly2048Characters() {
        String prefix = "https://example.com/";
        String url = prefix + "a".repeat(2048 - prefix.length());
        assertThat(validator.validate(url)).hasSize(2048);
    }
}
