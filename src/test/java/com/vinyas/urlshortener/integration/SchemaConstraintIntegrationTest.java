package com.vinyas.urlshortener.integration;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SchemaConstraintIntegrationTest extends AbstractIntegrationTest {

    @Test
    void schemaObjectsExist() {
        assertThat(jdbcTemplate.queryForObject(
                "SELECT to_regclass('public.urls')", String.class)).isEqualTo("urls");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT to_regclass('public.click_events')", String.class)).isEqualTo("click_events");
        assertThat(jdbcTemplate.queryForObject("""
                SELECT count(*) FROM pg_indexes
                WHERE schemaname = 'public' AND indexname = 'idx_click_events_code_clicked_at'
                """, Integer.class)).isEqualTo(1);
    }

    @Test
    void defaultsAreApplied() {
        insertUrl(1L, "defaults", "https://1.1.1.1/defaults");

        assertThat(jdbcTemplate.queryForObject(
                "SELECT is_custom FROM urls WHERE id = 1", Boolean.class)).isFalse();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT created_at IS NOT NULL FROM urls WHERE id = 1", Boolean.class)).isTrue();
    }

    @Test
    void duplicateShortCodeIsRejectedByTheUniqueConstraint() {
        insertUrl(1L, "duplicate", "https://1.1.1.1/first");

        assertThatThrownBy(() -> insertUrl(2L, "duplicate", "https://1.1.1.1/second"))
                .isInstanceOf(DataAccessException.class);
    }

    @Test
    void shortCodeCharacterConstraintIsEnforced() {
        assertThatThrownBy(() -> insertUrl(1L, "bad code!", "https://1.1.1.1/x"))
                .isInstanceOf(DataAccessException.class);
        assertThatThrownBy(() -> insertUrl(2L, "bad.code", "https://1.1.1.1/x"))
                .isInstanceOf(DataAccessException.class);
    }

    @Test
    void shortCodeLengthConstraintIsEnforced() {
        assertThatThrownBy(() -> insertUrl(1L, "ab", "https://1.1.1.1/x"))
                .isInstanceOf(DataAccessException.class);
        assertThatThrownBy(() -> insertUrl(2L, "abcdefghijklmnop", "https://1.1.1.1/x"))
                .isInstanceOf(DataAccessException.class);
    }

    @Test
    void originalUrlLengthConstraintIsEnforced() {
        String tooLong = "https://1.1.1.1/" + "a".repeat(2048);

        assertThatThrownBy(() -> insertUrl(1L, "toolong1", tooLong))
                .isInstanceOf(DataAccessException.class);
    }

    @Test
    void originalUrlSchemeConstraintIsEnforced() {
        assertThatThrownBy(() -> insertUrl(1L, "ftpcode", "ftp://example.com/file"))
                .isInstanceOf(DataAccessException.class);
    }

    @Test
    void originalUrlNotNullConstraintIsEnforced() {
        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO urls (id, short_code, original_url) VALUES (?, ?, NULL)",
                1L, "nullurl"))
                .isInstanceOf(DataAccessException.class);
    }

    @Test
    void expiryMustBeAfterCreation() {
        assertThatThrownBy(() -> jdbcTemplate.update("""
                INSERT INTO urls (id, short_code, original_url, created_at, expires_at)
                VALUES (?, ?, ?, now() - interval '2 hours', now() - interval '3 hours')
                """, 1L, "badexpiry", "https://1.1.1.1/x"))
                .isInstanceOf(DataAccessException.class);
    }

    @Test
    void clickEventIpHashFormatIsEnforced() {
        assertThatThrownBy(() -> jdbcTemplate.update("""
                INSERT INTO click_events (short_code, clicked_at, ip_hash)
                VALUES (?, now(), ?)
                """, "event123", "not-a-hash"))
                .isInstanceOf(DataAccessException.class);
    }

    @Test
    void validClickEventCanBeInserted() {
        String hash = "a".repeat(64);
        jdbcTemplate.update("""
                INSERT INTO click_events (short_code, clicked_at, ip_hash, user_agent, referrer)
                VALUES (?, now(), ?, ?, ?)
                """, "event123", hash, "JUnit", "https://1.1.1.1/");

        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM click_events WHERE short_code = ?", Integer.class, "event123"))
                .isEqualTo(1);
    }

    private void insertUrl(long id, String shortCode, String originalUrl) {
        jdbcTemplate.update(
                "INSERT INTO urls (id, short_code, original_url) VALUES (?, ?, ?)",
                id, shortCode, originalUrl);
    }
}
