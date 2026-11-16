package com.vinyas.urlshortener.component;

/**
 * Base62 codec used for generated short codes.
 *
 * <p>The alphabet is {@code 0-9A-Za-z}. A positive signed 64-bit value needs at most
 * 11 characters, which fits comfortably in the {@code VARCHAR(15)} database column.</p>
 */
public final class Base62 {

    private static final char[] ALPHABET =
            "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".toCharArray();
    private static final int BASE = ALPHABET.length;
    private static final int[] LOOKUP = new int[128];

    static {
        java.util.Arrays.fill(LOOKUP, -1);
        for (int i = 0; i < ALPHABET.length; i++) {
            LOOKUP[ALPHABET[i]] = i;
        }
    }

    private Base62() {
    }

    public static String encode(long value) {
        if (value < 0) {
            throw new IllegalArgumentException("Base62 cannot encode a negative value");
        }
        if (value == 0) {
            return "0";
        }
        char[] buffer = new char[11];
        int position = buffer.length;
        long remaining = value;
        while (remaining > 0) {
            buffer[--position] = ALPHABET[(int) (remaining % BASE)];
            remaining /= BASE;
        }
        return new String(buffer, position, buffer.length - position);
    }

    public static long decode(String encoded) {
        if (encoded == null || encoded.isEmpty()) {
            throw new IllegalArgumentException("Base62 value must not be empty");
        }
        long result = 0;
        for (int i = 0; i < encoded.length(); i++) {
            char character = encoded.charAt(i);
            int digit = character < LOOKUP.length ? LOOKUP[character] : -1;
            if (digit < 0) {
                throw new IllegalArgumentException("Invalid Base62 character: " + character);
            }
            if (result > (Long.MAX_VALUE - digit) / BASE) {
                throw new IllegalArgumentException("Base62 value overflows a signed long");
            }
            result = result * BASE + digit;
        }
        return result;
    }
}
