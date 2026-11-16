# Distributed URL Shortener

Production-style URL shortener built with Java 21 and Spring Boot 4.

**Phase 7 (current):** Load and performance testing. Empirical k6 scenarios executed against the
full multi-replica Compose stack: hot-cache redirects (500 rps, p99 = 8.43 ms), cold-cache redirects
(200 rps, p99 = 6.44 ms), creates (100 rps, p99 = 7.38 ms), and mixed 50:1 read:write traffic
(505 rps sustained, redirect p99 = 2.17 ms, 0% errors across 30,000+ requests). Zero click event drops
across 72,000+ events. PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)` verified: Index Scan on `uq_urls_short_code`
(0.056 ms execution) and Index Only Scan on `idx_click_events_code_clicked_at` (0.116 ms execution).

**Phase 6:** Full Observability. RED metrics per endpoint with percentiles/SLA histograms,
cache hit ratios, click-queue depth and drop counters, and HikariCP connection pool usage exposed to
Prometheus. Structured JSON logging (Logstash format) with MDC `traceId` propagation. Separate
Actuator liveness (`/actuator/health/liveness`) and readiness (`/actuator/health/readiness` probing
PostgreSQL and Redis) checks. Full Prometheus and Grafana monitoring stack provisioned in Docker Compose
with a pre-configured service dashboard.

**Phase 5:** Multi-instance Docker Compose deployment. A multi-stage Dockerfile builds a non-root
production image. Nginx load-balances across API replicas with zero-downtime failover for redirects.
Deterministic worker IDs per replica, service healthchecks gating startup dependencies, graceful
shutdown, and safe Hikari pool sizing.

**Phase 4:** Observability. Micrometer instruments create, redirect, cache, rate-limit and
analytics paths, and the Prometheus endpoint exposes them at `/actuator/prometheus` with bounded
tag cardinality.

**Phase 3:** Distributed Redis token-bucket rate limit on the create endpoint. Limits are shared
across instances via a Lua script and the policy is configurable (fail-open by default, fail-closed
available). Redirects are never rate limited.

**Phase 2:** Redis read-through redirect cache and asynchronous click analytics. Redis and the
analytics writer are strictly best-effort: neither can fail a redirect.

## Stack

- Java 21, Maven
- Spring Boot 4.1.2 (`spring-boot-starter-webmvc`)
- PostgreSQL 16, Flyway, Spring Data JPA / Hibernate
- Redis 7, Spring Data Redis (Lettuce)
- Micrometer + Prometheus registry
- Testcontainers (real PostgreSQL and Redis, no database mocks)
- k6 load scripts and a Docker Compose failure-drill script
- springdoc OpenAPI (dev profile only)

## Run locally (single instance)

```bash
docker compose up -d postgres redis
WORKER_ID=0 mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Or with the packaged jar:

```bash
mvn -DskipTests package
WORKER_ID=0 DB_URL=jdbc:postgresql://localhost:5432/urlshortener \
DB_USERNAME=urlshortener DB_PASSWORD=urlshortener \
java -jar target/url-shortener-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

## Run with multiple replicas (Phase 5 — Docker Compose full stack)

Build the image and start two API replicas behind Nginx:

```bash
docker compose up --build --scale api=2
```

The load balancer listens on **port 80**. All traffic enters through Nginx; API containers do not
publish a host port. Swagger UI is disabled in `prod`; use `http://localhost/actuator/health` to
verify liveness.

Scale to three replicas at runtime (no restart needed):

```bash
docker compose up --scale api=3 --no-recreate
```

Stop everything and remove volumes:

```bash
docker compose down -v
```

### Worker ID assignment

Each replica's hostname is `api-N` (assigned by Docker Compose when scaling). The Compose
entrypoint wrapper extracts the numeric suffix and sets `WORKER_ID=N`, so replicas `api-1`,
`api-2`, `api-3` get `WORKER_ID` 1, 2, 3 respectively. All values are within the valid range of
`0`–`1023`.

### Hikari pool sizing

PostgreSQL's default `max_connections` is **100**. Each API replica opens at most `DB_POOL_SIZE`
connections (default **10**). Keep `replicas × DB_POOL_SIZE ≤ 95` (5 reserved for admin).
For 3 replicas: 3 × 10 = 30 — well within the limit.
Raise `DB_POOL_SIZE` only after increasing PostgreSQL `max_connections`.

`WORKER_ID` is mandatory and must be unique per instance (`0`–`1023`). Startup fails before the
datasource initializes if it is missing or invalid. Flyway owns the schema; Hibernate runs with
`ddl-auto=validate`.

### Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `WORKER_ID` | none (required) | Snowflake worker ID, `0`–`1023` |
| `ID_MAX_BACKWARD_WAIT_MS` | `1000` | Max clock-rollback wait before failing |
| `DB_URL` | `jdbc:postgresql://localhost:5432/urlshortener` | JDBC URL |
| `DB_USERNAME` | `urlshortener` | Database user |
| `DB_PASSWORD` | empty | Database password |
| `APP_BASE_URL` | `http://localhost:8080` | Prefix used to build `shortUrl` |
| `CORS_ALLOWED_ORIGINS` | empty | Comma-separated origins, `/api/**` only |
| `SERVER_PORT` | `8080` | HTTP port |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | Redis connection (cache + rate limiting) |
| `REDIS_PASSWORD` | empty | Redis password |
| `REDIS_TIMEOUT` | `500ms` | Redis command timeout |
| `CACHE_ENABLED` | `true` | Disable the redirect cache |
| `CACHE_REDIRECT_TTL` | `1h` | Maximum positive cache TTL |
| `CACHE_NEGATIVE_TTL` | `30s` | TTL for cached 404s |
| `ANALYTICS_ENABLED` | `true` | Disable click analytics |
| `ANALYTICS_QUEUE_CAPACITY` | `10000` | Bounded in-memory click queue |
| `ANALYTICS_BATCH_SIZE` | `500` | Rows per batch insert |
| `ANALYTICS_FLUSH_INTERVAL_MS` | `500` | Batch flush interval |
| `IP_HASH_SALT` | `local-dev-salt` | Salt for SHA-256 IP hashing; set in production |
| `RATE_LIMIT_ENABLED` | `true` | Enable create-endpoint rate limiting |
| `RATE_LIMIT_FAIL_OPEN` | `true` | Allow creates when Redis is unavailable (`false` → 503) |
| `RATE_LIMIT_CREATE_CAPACITY` | `20` | Token bucket burst capacity per IP |
| `RATE_LIMIT_CREATE_REFILL_PER_SECOND` | `5` | Tokens refilled per second per IP |

Swagger UI is available only in `dev`: `http://localhost:8080/swagger-ui.html`.

## API

### Create a short URL

```http
POST /api/v1/urls
Content-Type: application/json

{
  "originalUrl": "https://example.com/some/page",
  "customCode": "launch-2026",
  "expiresAt": "2027-01-01T00:00:00Z"
}
```

`customCode` and `expiresAt` are optional. Successful creation returns `201 Created`, a
`Location` header, and the rate-limit headers `X-RateLimit-Limit` / `X-RateLimit-Remaining`.
When the per-IP bucket is empty the endpoint returns `429` with `Retry-After` and
`X-RateLimit-Remaining: 0`. The response body is:

```json
{
  "shortCode": "launch-2026",
  "shortUrl": "http://localhost:8080/launch-2026",
  "originalUrl": "https://example.com/some/page",
  "custom": true,
  "createdAt": "2026-11-16T06:30:00Z",
  "expiresAt": "2027-01-01T00:00:00Z"
}
```

### Redirect

```http
GET /{code}
```

Returns `302 Found` with the original URL in `Location`. Responses are marked `no-store` and
`X-Robots-Tag: noindex`.

Redirects are read-only with respect to the `urls` table: the code is resolved from Redis first,
then PostgreSQL on a miss, and the click is handed to an in-memory queue. A scheduled batch job
writes `click_events`; Redis or analytics failures are logged and never change the response.

### Errors

All errors use the same envelope and include the `X-Trace-Id` header:

```json
{
  "timestamp": "2026-11-16T06:30:00Z",
  "status": 409,
  "code": "CODE_ALREADY_EXISTS",
  "message": "Short code 'launch-2026' is already in use",
  "path": "/api/v1/urls",
  "traceId": "3f0c...",
  "fieldErrors": []
}
```

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_URL` | Not a public http/https URL |
| 400 | `INVALID_CUSTOM_CODE` | Code is not 3–15 `[A-Za-z0-9_-]` |
| 400 | `RESERVED_CODE` | Code collides with an app route |
| 400 | `INVALID_EXPIRY` | Expiry is not at least 1 second in the future |
| 400 | `VALIDATION_ERROR` | Bean validation failed |
| 400 | `MALFORMED_JSON` | Missing or unreadable request body |
| 404 | `URL_NOT_FOUND` | Unknown or malformed short code |
| 404 | `ROUTE_NOT_FOUND` | No route matches |
| 405 | `METHOD_NOT_ALLOWED` | Unsupported HTTP method |
| 409 | `CODE_ALREADY_EXISTS` | Custom code already taken |
| 409 | `CONSTRAINT_VIOLATION` | Other database constraint violation |
| 410 | `URL_EXPIRED` | Code exists but has expired |
| 429 | `RATE_LIMITED` | Per-IP create bucket exhausted |
| 500 | `INTERNAL_ERROR` | Unexpected failure |
| 503 | `ID_GENERATION_FAILED` | Snowflake clock/sequence failure |
| 503 | `RATE_LIMITER_UNAVAILABLE` | Fail-closed policy and Redis is unreachable |
| 503 | `SERVICE_UNAVAILABLE` | Database is temporarily unavailable |

## Observability

Actuator exposes `health`, `info` and `prometheus`.

### Probes

Separate liveness and readiness health groups are configured:

- `GET /actuator/health/liveness`: Probes internal process liveness (`livenessState`). Returns `200 UP` as long as the process is alive.
- `GET /actuator/health/readiness`: Probes operational readiness (`readinessState`, `db`, `redis`). Returns `200 UP` when healthy; returns `503 DOWN` if PostgreSQL or Redis is unreachable so the load balancer diverts traffic.

### Structured Logging

In production (`prod` profile), logs are emitted to console in single-line structured JSON (**Logstash** format) via Spring Boot's native structured logging (`logging.structured.format.console=logstash`). MDC attribute `traceId` is included as a top-level JSON field in every log entry for distributed request tracing.

### Prometheus & Grafana Monitoring

Docker Compose provisions Prometheus and Grafana automatically:

- **Prometheus UI:** `http://localhost:9090` (scrapes `api-1:8080/actuator/prometheus` and `api-2:8080/actuator/prometheus` every 5s)
- **Grafana UI:** `http://localhost:3000` (credentials: `admin` / `admin`, auto-provisioned with the Prometheus data source and pre-configured starter dashboard `URL Shortener – Service Observability`).

#### Tracked Metrics

| Metric | Type | Tags | Meaning |
| --- | --- | --- | --- |
| `urlshortener_create_requests_total` | counter | `result`, `custom` | Create attempts by outcome |
| `urlshortener_create_duration_seconds` | timer + SLA histogram | `custom` | Create latency & percentiles |
| `urlshortener_redirect_requests_total` | counter | `result` | Redirect lookups by outcome |
| `urlshortener_redirect_duration_seconds` | timer + SLA histogram | none | Redirect latency & percentiles (<50ms target) |
| `urlshortener_cache_gets_total` | counter | `result` | Cache reads (`hit`, `miss`, `negative`, `corrupt`, `error`, `disabled`) |
| `urlshortener_cache_writes_total` | counter | `operation`, `result` | Cache writes and evictions |
| `urlshortener_rate_limit_requests_total` | counter | `decision` | Limiter decisions (`allowed`, `rejected`, `fail_open`, `fail_closed`, `disabled`) |
| `urlshortener_analytics_events_total` | counter | `result` | Click pipeline (`enqueued`, `dropped`, `enqueue_failed`, `persisted`, `persist_failed`) |
| `urlshortener_analytics_queue_size` | gauge | none | Events waiting to be persisted |
| `hikaricp_connections_*` | gauge / counter | `pool` | HikariCP active, idle, pending, and total connections |
| `http_server_requests_seconds_*` | timer + percentiles | `uri`, `status`, `method` | Standard HTTP RED metrics |

Every custom meter carries `application="url-shortener"` from `management.metrics.tags.application`. Tag values are bounded enums and booleans; short codes, URLs and client IPs are never used as tags.

Metrics are observational only: a metrics failure cannot change a create or redirect response. Restrict `/actuator/**` at the network or ingress layer in production.

## Load and failure testing

See [`loadtest/README.md`](loadtest/README.md) for prerequisites, tuning, and result
interpretation.

### k6 load scripts

- `loadtest/k6/redirect.js` seeds short codes through the API, then drives constant-arrival-rate
  redirects against them.
- `loadtest/k6/create.js` creates a unique short URL per iteration.

```bash
k6 run -e BASE_URL=http://localhost:8080 \
  -e SEED_COUNT=500 -e RATE=500 -e DURATION=60s loadtest/k6/redirect.js

k6 run -e BASE_URL=http://localhost:8080 \
  -e RATE=100 -e DURATION=60s loadtest/k6/create.js
```

Both scripts fail the run on error-rate, latency, or check-rate threshold violations. For create
load, disable the create limiter or raise `RATE_LIMIT_CREATE_CAPACITY` and
`RATE_LIMIT_CREATE_REFILL_PER_SECOND`.

### Failure drills

```bash
./loadtest/failure-drills.sh
```

The script stops and restarts the Compose Redis and PostgreSQL services and verifies:

- redirects survive a Redis outage through the PostgreSQL fallback;
- creates follow the configured policy: `201` with fail-open or `503 RATE_LIMITER_UNAVAILABLE`
  with fail-closed;
- cached redirects survive a PostgreSQL outage without touching the database;
- uncached redirects and creates return `503 SERVICE_UNAVAILABLE`, not `500`;
- creates and redirects recover after PostgreSQL restarts without an application restart.

The integration suite also stops a real PostgreSQL container in
`DatabaseOutageIntegrationTest`.

## Design notes

- **IDs:** Snowflake layout `41-bit ms timestamp | 10-bit worker | 12-bit sequence`, Base62
  encoded. The generator is synchronized; on clock rollback it keeps the logical timestamp and
  consumes the sequence, then fails after the configured wait instead of risking duplicates.
- **No deduplication:** every create produces a new code, including identical target URLs.
- **Constraints are authoritative:** duplicate custom codes surface as SQLState `23505` and map
  to `409`; there is no check-then-insert race.
- **Validation:** absolute `http`/`https` URLs only, max 2048 characters, no user info, and
  loopback/private/link-local/reserved destinations are rejected.
- **Schema:** `urls` plus an append-only `click_events` table. `click_events` intentionally has
  no foreign key to `urls` so analytics writes never fail after a URL is deleted.
- **Redirect cache:** cache-aside with write-through on create. Positive entries store the URL and
  expiry and are capped at `CACHE_REDIRECT_TTL`; unknown codes get a short negative entry so
  repeated 404s do not hit PostgreSQL. Creating a code replaces any negative entry. Every Redis
  call catches failures and falls back to the database.
- **Click analytics:** the redirect thread only enqueues into a bounded queue. A scheduled batch
  writer inserts rows; if the queue is full or the database write fails, events are dropped and
  logged. IPs are never stored raw, only salted SHA-256 hex hashes.
- **Create rate limiting:** a Redis token bucket keyed by client IP. The bucket update is a single
  Lua script using Redis `TIME`, so all instances share state without clock skew. The limiter runs
  in an MVC interceptor before JSON parsing and validation. Redis errors follow
  `RATE_LIMIT_FAIL_OPEN`; the default is fail-open to keep the API available, while fail-closed
  returns `503 RATE_LIMITER_UNAVAILABLE`. Redirects are not rate limited.
- **Proxy awareness:** rate-limit and analytics client identity use the servlet remote address.
  In production, run behind a proxy that sets forwarded headers and keep
  `server.forward-headers-strategy=framework` so the address is the real client.

## Tests

```bash
mvn test
```

The suite runs against real PostgreSQL and Redis containers and covers ID generation,
URL/custom-code validation, create/redirect behavior, malformed input, CORS, health, Swagger
profile gating, schema constraints, an 8-way concurrent race for the same custom code (exactly
one `201`, the rest `409`), cache write-through and negative entries, cache-served redirects
after the database row is removed, asynchronous click persistence, analytics failure isolation,
redirects with Redis unreachable, create rate limiting (`429` + `Retry-After`), bucket refill,
rate-limit-before-validation, redirect exemption, and fail-closed `503` behavior. A real
PostgreSQL container is stopped mid-test to prove that cached redirects keep returning `302` while
uncached redirects and creates return `503 SERVICE_UNAVAILABLE`. Observability tests scrape
`/actuator/prometheus` and assert every instrumented path publishes its meter, that standard HTTP
metrics are present, and that short codes and URLs never appear as tag values.
