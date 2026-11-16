CREATE TABLE urls (
    id           BIGINT PRIMARY KEY,
    short_code   VARCHAR(15) NOT NULL,
    original_url TEXT NOT NULL,
    is_custom    BOOLEAN NOT NULL DEFAULT FALSE,
    owner_id     VARCHAR(64),
    expires_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_urls_short_code UNIQUE (short_code),
    CONSTRAINT ck_urls_short_code_format
        CHECK (short_code ~ '^[A-Za-z0-9_-]{3,15}$'),
    CONSTRAINT ck_urls_original_url_length
        CHECK (char_length(original_url) BETWEEN 1 AND 2048),
    CONSTRAINT ck_urls_original_url_scheme
        CHECK (original_url ~* '^https?://'),
    CONSTRAINT ck_urls_expires_after_created
        CHECK (expires_at IS NULL OR expires_at > created_at)
);

CREATE TABLE click_events (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    short_code  VARCHAR(15) NOT NULL,
    clicked_at  TIMESTAMPTZ NOT NULL,
    ip_hash     VARCHAR(64),
    user_agent  TEXT,
    referrer    TEXT,

    CONSTRAINT ck_click_events_ip_hash
        CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX idx_click_events_code_clicked_at
    ON click_events (short_code, clicked_at);
