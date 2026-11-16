package com.vinyas.urlshortener.service;

import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.vinyas.urlshortener.component.HostResolver;
import com.vinyas.urlshortener.exception.InvalidUrlException;
import org.springframework.stereotype.Component;

/**
 * Strict URL validation for the create endpoint.
 *
 * <p>Only absolute http/https URLs with a public host are accepted. The redirect endpoint
 * never fetches the target URL, but blocking internal destinations here prevents the shortener
 * from being used as a convenient internal-network launcher.</p>
 */
@Component
public class UrlValidator {

    private static final int MAX_LENGTH = 2048;
    private static final Pattern IPV4_LITERAL =
            Pattern.compile("^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$");
    private static final Pattern NUMERIC_HOST = Pattern.compile("^[0-9.]+$");

    private static final Set<String> BLOCKED_HOSTS = Set.of(
            "localhost",
            "localhost.localdomain",
            "ip6-localhost",
            "ip6-loopback",
            "metadata",
            "metadata.google.internal",
            "kubernetes.default",
            "kubernetes.default.svc");

    private static final Set<String> BLOCKED_SUFFIXES = Set.of(
            ".localhost",
            ".local",
            ".localdomain",
            ".internal",
            ".home.arpa",
            ".lan",
            ".corp",
            ".intranet",
            ".private",
            ".svc");

    private final HostResolver hostResolver;

    public UrlValidator(HostResolver hostResolver) {
        this.hostResolver = hostResolver;
    }

    /**
     * @return the trimmed URL that should be persisted
     */
    public String validate(String rawUrl) {
        if (rawUrl == null) {
            throw new InvalidUrlException("originalUrl is required");
        }
        String value = rawUrl.trim();
        if (value.isEmpty()) {
            throw new InvalidUrlException("originalUrl is required");
        }
        if (value.length() > MAX_LENGTH) {
            throw new InvalidUrlException("originalUrl must not exceed " + MAX_LENGTH + " characters");
        }

        URI uri;
        try {
            uri = new URI(value);
        } catch (URISyntaxException ex) {
            throw new InvalidUrlException("originalUrl must be a valid absolute URL");
        }

        String scheme = uri.getScheme();
        if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
            throw new InvalidUrlException("originalUrl must use http or https");
        }
        if (!uri.isAbsolute() || uri.getRawAuthority() == null) {
            throw new InvalidUrlException("originalUrl must be a valid absolute URL");
        }
        if (uri.getUserInfo() != null) {
            throw new InvalidUrlException("originalUrl must not contain user credentials");
        }
        if (uri.getHost() == null || uri.getHost().isBlank()) {
            throw new InvalidUrlException("originalUrl must include a host");
        }
        int port = uri.getPort();
        if (port == 0 || port > 65535) {
            throw new InvalidUrlException("originalUrl contains an invalid port");
        }

        String host = normalizeHost(uri.getHost());
        if (host.isEmpty()) {
            throw new InvalidUrlException("originalUrl must include a host");
        }
        if (isBlockedHostname(host)) {
            throw internalHostException();
        }

        if (IPV4_LITERAL.matcher(host).matches()) {
            if (isInternal(parseIpv4(host))) {
                throw internalHostException();
            }
        } else if (NUMERIC_HOST.matcher(host).matches()) {
            // Reject non-canonical numeric forms such as 127.1, 2130706433, or 1.2.3.
            throw new InvalidUrlException("originalUrl contains an invalid IPv4 address");
        } else if (host.indexOf(':') >= 0) {
            if (isInternal(parseIpv6(host))) {
                throw internalHostException();
            }
        } else {
            InetAddress[] addresses;
            try {
                addresses = hostResolver.resolve(host);
            } catch (UnknownHostException ex) {
                throw new InvalidUrlException("originalUrl host could not be resolved");
            }
            if (addresses == null || addresses.length == 0) {
                throw new InvalidUrlException("originalUrl host could not be resolved");
            }
            for (InetAddress address : addresses) {
                if (isInternal(address)) {
                    throw internalHostException();
                }
            }
        }

        return value;
    }

    private String normalizeHost(String host) {
        String normalized = host.trim().toLowerCase(Locale.ROOT);
        if (normalized.startsWith("[") && normalized.endsWith("]")) {
            normalized = normalized.substring(1, normalized.length() - 1);
        }
        while (normalized.endsWith(".")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private boolean isBlockedHostname(String host) {
        if (BLOCKED_HOSTS.contains(host)) {
            return true;
        }
        for (String suffix : BLOCKED_SUFFIXES) {
            if (host.endsWith(suffix)) {
                return true;
            }
        }
        return false;
    }

    private InetAddress parseIpv4(String host) {
        Matcher matcher = IPV4_LITERAL.matcher(host);
        if (!matcher.matches()) {
            throw new InvalidUrlException("originalUrl contains an invalid IPv4 address");
        }
        byte[] bytes = new byte[4];
        for (int i = 0; i < 4; i++) {
            String part = matcher.group(i + 1);
            if (part.length() > 1 && part.startsWith("0")) {
                throw new InvalidUrlException("originalUrl contains a non-canonical IPv4 address");
            }
            int octet = Integer.parseInt(part);
            if (octet > 255) {
                throw new InvalidUrlException("originalUrl contains an invalid IPv4 address");
            }
            bytes[i] = (byte) octet;
        }
        try {
            return InetAddress.getByAddress(bytes);
        } catch (UnknownHostException ex) {
            throw new InvalidUrlException("originalUrl contains an invalid IPv4 address");
        }
    }

    private InetAddress parseIpv6(String host) {
        if (host.indexOf('%') >= 0) {
            throw new InvalidUrlException("originalUrl must not contain an IPv6 zone identifier");
        }
        try {
            InetAddress address = InetAddress.getByName(host);
            if (!(address instanceof Inet6Address)) {
                throw new InvalidUrlException("originalUrl contains an invalid IPv6 address");
            }
            return address;
        } catch (UnknownHostException ex) {
            throw new InvalidUrlException("originalUrl contains an invalid IPv6 address");
        }
    }

    private InvalidUrlException internalHostException() {
        return new InvalidUrlException(
                "originalUrl must not point to a loopback, private, link-local, or reserved host");
    }

    private boolean isInternal(InetAddress address) {
        if (address.isAnyLocalAddress()
                || address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isMulticastAddress()) {
            return true;
        }

        byte[] bytes = address.getAddress();
        if (address instanceof Inet4Address) {
            return isReservedIpv4(bytes);
        }
        if (address instanceof Inet6Address) {
            int first = bytes[0] & 0xff;
            if ((first & 0xfe) == 0xfc) {
                return true; // fc00::/7 unique-local
            }
            if ((bytes[0] & 0xff) == 0x20
                    && (bytes[1] & 0xff) == 0x01
                    && (bytes[2] & 0xff) == 0x0d
                    && (bytes[3] & 0xff) == 0xb8) {
                return true; // 2001:db8::/32 documentation
            }
            if (isIpv4MappedOrCompatible(bytes)) {
                return isReservedIpv4(new byte[] {bytes[12], bytes[13], bytes[14], bytes[15]});
            }
        }
        return false;
    }

    private boolean isIpv4MappedOrCompatible(byte[] bytes) {
        for (int i = 0; i < 10; i++) {
            if (bytes[i] != 0) {
                return false;
            }
        }
        if ((bytes[10] & 0xff) == 0xff && (bytes[11] & 0xff) == 0xff) {
            return true;
        }
        return bytes[10] == 0 && bytes[11] == 0;
    }

    private boolean isReservedIpv4(byte[] bytes) {
        int first = bytes[0] & 0xff;
        int second = bytes[1] & 0xff;
        int third = bytes[2] & 0xff;

        if (first == 0) {
            return true; // 0.0.0.0/8
        }
        if (first == 10) {
            return true; // 10.0.0.0/8
        }
        if (first == 100 && second >= 64 && second <= 127) {
            return true; // 100.64.0.0/10 carrier-grade NAT
        }
        if (first == 127) {
            return true; // 127.0.0.0/8
        }
        if (first == 169 && second == 254) {
            return true; // 169.254.0.0/16 link-local
        }
        if (first == 172 && second >= 16 && second <= 31) {
            return true; // 172.16.0.0/12
        }
        if (first == 192 && second == 168) {
            return true; // 192.168.0.0/16
        }
        if (first == 192 && second == 0 && third == 0) {
            return true; // 192.0.0.0/24
        }
        if (first == 192 && second == 0 && third == 2) {
            return true; // 192.0.2.0/24 documentation
        }
        if (first == 192 && second == 88 && third == 99) {
            return true; // 192.88.99.0/24 6to4 relay
        }
        if (first == 198 && (second == 18 || second == 19)) {
            return true; // 198.18.0.0/15 benchmarking
        }
        if (first == 198 && second == 51 && third == 100) {
            return true; // 198.51.100.0/24 documentation
        }
        if (first == 203 && second == 0 && third == 113) {
            return true; // 203.0.113.0/24 documentation
        }
        return first >= 224; // multicast, reserved, broadcast
    }
}
