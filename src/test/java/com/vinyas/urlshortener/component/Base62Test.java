package com.vinyas.urlshortener.component;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class Base62Test {

    @Test
    void encodesKnownValues() {
        assertThat(Base62.encode(0)).isEqualTo("0");
        assertThat(Base62.encode(9)).isEqualTo("9");
        assertThat(Base62.encode(10)).isEqualTo("A");
        assertThat(Base62.encode(35)).isEqualTo("Z");
        assertThat(Base62.encode(36)).isEqualTo("a");
        assertThat(Base62.encode(61)).isEqualTo("z");
        assertThat(Base62.encode(62)).isEqualTo("10");
    }

    @Test
    void roundTripsValues() {
        long[] values = {0, 1, 61, 62, 63, 1_000_000, 123_456_789_012L, Long.MAX_VALUE};
        for (long value : values) {
            assertThat(Base62.decode(Base62.encode(value))).isEqualTo(value);
        }
    }

    @Test
    void generatedSnowflakeSizedValuesFitTheColumn() {
        assertThat(Base62.encode(Long.MAX_VALUE)).hasSizeLessThanOrEqualTo(11);
    }

    @Test
    void rejectsNegativeValues() {
        assertThatThrownBy(() -> Base62.encode(-1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsInvalidEncodedValues() {
        assertThatThrownBy(() -> Base62.decode("")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Base62.decode("!")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Base62.decode("zzzzzzzzzzzz"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
