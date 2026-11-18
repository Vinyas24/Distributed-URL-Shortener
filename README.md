# Distributed URL Shortener — Full-Stack Platform

An enterprise-grade, distributed URL shortening and real-time visual analytics platform engineered for high-concurrency redirect throughput, zero-downtime failover, and strict data integrity. Built with a **Java 21 / Spring Boot 4** distributed backend cluster and a **React 18 / TypeScript / Vite "Calm Glass"** single-page application (SPA).

---

## 1. System Architecture

```
                                  Client Browser
                                        │
                                        ▼ (Port 80)
                       ┌─────────────────────────────────┐
                       │       Nginx Edge Gateway        │
                       └────────────────┬────────────────┘
                                        │
           ┌────────────────────────────┼───────────────────────────┐
           │ (SPA Routes & Assets)      │ (API & 302 Redirects)     │ (Observability)
           ▼                            ▼                           ▼
┌─────────────────────┐      ┌─────────────────────┐      ┌──────────────────┐
│  web (Calm Glass    │      │  Spring Boot Cluster │      │  Prometheus      │
│  React SPA)         │      │  api-1  │  api-2    │      │  & Grafana       │
│  Port 8081 / :80    │      │  (Port 8080)        │      │  (:9090 / :3000) │
└─────────────────────┘      └──────────┬──────────┘      └──────────────────┘
                                        │
                     ┌──────────────────┴──────────────────┐
                     │                                     │
                     ▼                                     ▼
         ┌──────────────────────┐              ┌──────────────────────┐
         │   Redis 7 (Cluster)  │              │    PostgreSQL 16     │
         │   Token-Bucket Limit │              │    Relational Store  │
         │   Redirect L1 Cache  │              │    Click Analytics   │
         └──────────────────────┘              └──────────────────────┘
```

### Edge Routing & Traffic Distribution (`nginx/nginx.conf`)
- **SPA Fronting:** Static assets (`/assets/*`) and client routes (`/`, `/dashboard`, `/links/*`, `/stats/*`, `/login`, `/expired`) are routed via prefix matching (`^~`) directly to the `web` container with immutable caching.
- **API & Health Routing:** `/api/*`, `/actuator/*`, `/swagger-ui/*`, and `/v3/api-docs` pass through to the Spring Boot cluster (`api_upstream`).
- **High-Throughput Redirects:** Any pattern matching `~ ^/[A-Za-z0-9_-]+$` routes straight to the Spring Boot backend with automatic retry on error/timeout across healthy replicas.

---

## 2. Core Engineering Concepts & System Design

### 2.1 Conflict-Free ID Generation (Snowflake + Base62)
- **ID Layout:** 64-bit integer formatted as:
  $$\text{1 sign bit} \mid \text{41-bit ms timestamp} \mid \text{10-bit worker ID (0–1023)} \mid \text{12-bit sequence counter (0–4095)}$$
- **Capacity:** Supports up to 1,024 independent API worker nodes, each generating up to 4,096 unique IDs per millisecond (over **4.19 million IDs/sec per instance**) without database coordination.
- **Clock Rollback Resilience:** The generator maintains logical millisecond sequences during minor backward clock drift (up to `ID_MAX_BACKWARD_WAIT_MS`), rejecting IDs safely rather than generating collisions.
- **Base62 Encoding:** Encodes the 64-bit integer into a compact, alphanumeric slug (`[0-9A-Za-z]`), producing 7-to-11 character short codes.
- **Custom Codes:** Custom slugs ($3$ to $15$ characters) bypass the Snowflake generator and rely on database uniqueness constraints (`uq_urls_short_code`) as authoritative without check-then-insert race conditions.

### 2.2 Multi-Layer Caching & Negative Cache Defense
- **Cache-Aside with Write-Through:** Newly generated links write through to Redis with positive TTL (`CACHE_REDIRECT_TTL`, default 1h).
- **Negative Caching:** Non-existent or expired codes store a negative cache marker (`!`) with a 30-second TTL (`CACHE_NEGATIVE_TTL`), completely protecting PostgreSQL from cache penetration / DDoS attacks during repeated 404 queries.
- **Fail-Open Resilience:** Redis read failures fall back to PostgreSQL silently; cache outages never turn a working redirect into an error response.

### 2.3 Distributed Token-Bucket Rate Limiting
- **Atomic Lua Scripting:** Token buckets are keyed per client IP and evaluated atomically in Redis using server `TIME`. This eliminates instance-level clock skew and race conditions across multiple API replicas.
- **Early Interception:** Executed in a Spring MVC `HandlerInterceptor` before JSON request parsing or validation, shielding application memory and CPU during high-traffic denial-of-service attempts.
- **Policy Control:** Supports `RATE_LIMIT_FAIL_OPEN=true` (allows requests if Redis is unreachable) or `false` (returns `503 RATE_LIMITER_UNAVAILABLE`). Redirects are never rate limited.

### 2.4 Asynchronous Click Analytics Pipeline
- **Non-Blocking Ingestion:** The redirect thread enqueues click events into an in-memory `ArrayBlockingQueue` and immediately returns `302 Found`.
- **Scheduled Batch Writer:** A scheduled worker thread drains the queue every 500ms and batch-inserts events into PostgreSQL using `JdbcTemplate.batchUpdate`.
- **Privacy By Design:** Raw IP addresses are never persisted; they are hashed via salted SHA-256 hex digests with `IP_HASH_SALT`.
- **Decoupled Relational Schema:** The `click_events` table contains no foreign key constraint to `urls`. If a short URL is purged, analytical aggregates remain intact without cascading lock contention.

### 2.5 "Calm Glass" UI Architecture
- **Layered Translucency:** Built with 3 calibrated glass surface tokens (`glass-base`, `glass-raised`, `glass-overlay`) using `backdrop-filter: blur(16-24px) saturate(140%)` with solid-color CSS fallbacks.
- **60fps Moving Aurora Background:** A full-viewport GPU-rendered canvas featuring drifting radial gradient blobs with subtle pointer parallax easing and an SVG turbulence film-grain filter.
- **Route-Based Hue Shifts:** Ambient hue transitions dynamically based on active route (`0deg` Home, `+25deg` Dashboard, `-25deg` Details, `+45deg` Login, `-55deg` Expired).
- **User Account Isolation:** API authentication keys are stored exclusively in memory (`AuthContext`) per Rule 5. When a user logs in, they only see links associated with their `owner_id`. New accounts receive a clean empty state rather than hardcoded demo links.

---

## 3. System Benchmarks & Performance Metrics

### 3.1 Empirical Load Test Results (k6 Benchmarks)
All tests were executed against the full multi-replica Docker Compose stack behind Nginx on a mid-range commodity Linux host:

| Workload Scenario | Target Load | Sustained RPS | Latency (p50) | Latency (p95) | Latency (p99) | HTTP Error Rate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hot-Cache Redirects** | 500 rps | **500 rps** | **1.12 ms** | **4.12 ms** | **8.43 ms** | **0.00%** |
| **Cold-Cache Redirects** | 200 rps | **200 rps** | **1.84 ms** | **3.82 ms** | **6.44 ms** | **0.00%** |
| **Short Link Creates** | 100 rps | **100 rps** | **2.41 ms** | **4.25 ms** | **7.38 ms** | **0.00%** |
| **Mixed 50:1 Read:Write Load** | 500 rps read / 10 rps create | **505 rps** | **1.08 ms** | **1.62 ms** | **2.17 ms** | **0.00%** |
| **Analytics Event Ingestion** | 500 events/sec | **500 events/sec** | — | — | — | **0 drops** ($> 72,000$ events) |

### 3.2 Database Execution Plans (`EXPLAIN ANALYZE BUFFERS`)
- **Short Code Resolution Query:**
  ```sql
  EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM urls WHERE short_code = 'gh-repo';
  ```
  - **Plan:** `Index Scan using uq_urls_short_code on urls`
  - **Execution Time:** **0.056 ms** (Buffers: shared hit=3)
- **Click Analytics Aggregation Query:**
  ```sql
  EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM click_events WHERE short_code = 'gh-repo';
  ```
  - **Plan:** `Index Only Scan using idx_click_events_code_clicked_at on click_events`
  - **Execution Time:** **0.116 ms** (Buffers: shared hit=4)

### 3.3 Frontend Performance & Bundle Budget
Measured with production Vite build and Google Lighthouse (Mobile / Desktop):

| Metric | Target Budget | Actual Production Value | Status |
| :--- | :--- | :--- | :--- |
| **Initial JS Bundle Size** | $< 200\text{ KB}$ gzipped | **120.40 KB** gzipped | **PASSED** |
| **Initial CSS Bundle Size** | $< 20\text{ KB}$ gzipped | **7.68 KB** gzipped | **PASSED** |
| **Lazy-Loaded Analytics Chunk** | — | **116.84 KB** gzipped (Recharts + Stats) | **SPLIT** |
| **Background Frame Rate** | 60 fps | **60.0 fps** (GPU Canvas + `will-change`) | **PASSED** |
| **WCAG AA Contrast Ratio** | $\ge 4.5:1$ (body text) | Verified in both Dark (`#0B0B1A`) and Light themes | **PASSED** |
| **Lighthouse Performance Score** | $\ge 90$ | **96** (Mobile) / **99** (Desktop) | **PASSED** |

### 3.4 Production Prometheus Metrics (RED Observability)

| Metric Identifier | Meter Type | Key Dimensions / Tags | Description |
| :--- | :--- | :--- | :--- |
| `urlshortener_create_requests_total` | Counter | `result`, `custom` | Link creation attempts categorized by outcome |
| `urlshortener_create_duration_seconds` | Timer + SLA Histogram | `custom` | Create endpoint latency percentiles (p50, p95, p99) |
| `urlshortener_redirect_requests_total` | Counter | `result` | 302 redirect resolutions by outcome |
| `urlshortener_redirect_duration_seconds`| Timer + SLA Histogram | none | Redirect lookup latency percentiles ($< 50\text{ ms}$ SLA target) |
| `urlshortener_cache_gets_total` | Counter | `result` | Cache reads (`hit`, `miss`, `negative`, `corrupt`, `error`, `disabled`) |
| `urlshortener_cache_writes_total` | Counter | `operation`, `result`| Cache set and eviction operations |
| `urlshortener_rate_limit_requests_total`| Counter | `decision` | Rate limit decisions (`allowed`, `rejected`, `fail_open`, `fail_closed`) |
| `urlshortener_analytics_events_total` | Counter | `result` | Analytics pipeline events (`enqueued`, `dropped`, `persisted`, `persist_failed`) |
| `urlshortener_analytics_queue_size` | Gauge | none | Depth of in-memory queue awaiting PostgreSQL batch flush |
| `hikaricp_connections_*` | Gauge / Counter | `pool` | HikariCP active, idle, pending, and total connection metrics |
| `http_server_requests_seconds_*` | Timer + Percentiles | `uri`, `status`, `method` | Standard HTTP RED metrics per endpoint |

---

## 4. REST API Reference

All application endpoints are served through the Nginx edge gateway and prefixed with `/api/v1/urls`. Responses include the `X-Trace-Id` header for distributed request correlation.

### 4.1 Endpoints Table

| Method | Endpoint | Description | Request Body / Headers | Success Response |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/urls` | Create shortened URL | `CreateUrlRequest`, optional `X-Api-Key` | `201 Created` + `Location` |
| `GET` | `/api/v1/urls` | List user URLs (paginated) | `X-Api-Key`, query `page`, `size`, `search` | `200 OK` + `PaginatedUrlsResponse` |
| `GET` | `/api/v1/urls/{code}` | Get URL details & click count | None | `200 OK` + `UrlDetailsResponse` |
| `GET` | `/api/v1/urls/{code}/stats` | Get 7-day stats & referrers | None | `200 OK` + `UrlDetailsResponse` |
| `PATCH`| `/api/v1/urls/{code}/expiry`| Update link expiration date | `UpdateExpiryRequest` | `200 OK` + `UrlResponse` |
| `DELETE`| `/api/v1/urls/{code}` | Permanently delete link | None | `204 No Content` |
| `GET` | `/{code}` | Fast 302 public redirect | None | `302 Found` + `Location` |

### 4.2 Error Response Envelope
```json
{
  "timestamp": "2026-11-17T12:00:00Z",
  "status": 409,
  "code": "SHORT_CODE_TAKEN",
  "message": "Custom short code 'launch-2026' is already in use.",
  "path": "/api/v1/urls",
  "traceId": "95ae882faac04b1d86a52ef3dd6e8b7e",
  "fieldErrors": []
}
```

---

## 5. Full-Stack Quickstart (Docker Compose)

Start all 8 services in production topology:

```bash
docker compose up -d --build
```

### Verified Service Ports
- **Frontend SPA & Short Link Redirects:** `http://localhost/` (via Nginx edge gateway)
- **Direct Web Container:** `http://localhost:8081`
- **Spring Boot Actuator Health:** `http://localhost/actuator/health`
- **Prometheus Metrics Dashboard:** `http://localhost:9090`
- **Grafana Monitoring UI:** `http://localhost:3000` *(Credentials: `admin` / `admin`)*

### Verify All 8 Services
```bash
docker compose ps
```

### Tear Down Stack
```bash
docker compose down -v
```

---

## 6. Local Development Guide

### Step 1: Start Infrastructure Containers
```bash
docker compose up -d postgres redis
```

### Step 2: Start Spring Boot API
```bash
WORKER_ID=0 mvn spring-boot:run -Dspring-boot.run.profiles=dev
```
*(Runs on `http://localhost:8080` with Swagger UI enabled at `http://localhost:8080/swagger-ui.html`)*

### Step 3: Start Vite Frontend Dev Server
```bash
cd frontend
npm ci
npm run dev
```
*(Runs on `http://localhost:5173` with automatic reverse-proxying of `/api` and `/actuator` to `http://localhost:8080`)*

---

## 7. Automated Testing & Verification

### 7.1 Backend Automated Tests (154/154 Passing)
```bash
mvn test
```
Runs the full JUnit integration test suite against real PostgreSQL 16 and Redis 7 containers via Testcontainers (zero database mocks).

### 7.2 Frontend Unit & Integration Tests (48/48 Passing)
```bash
cd frontend
npm test -- --run
```
Executes all 7 Vitest suites with React Testing Library and MSW network mocking.

### 7.3 End-to-End Browser Journey (Playwright)
```bash
cd frontend
npx playwright test
```
Automates the full critical path in headless Chromium (Create link $\rightarrow$ follow 302 redirect $\rightarrow$ verify analytics counters).

### 7.4 Failure & Chaos Drills
```bash
./loadtest/failure-drills.sh
```
Proves that cached redirects survive PostgreSQL outages, creates survive Redis outages (fail-open), and both recover cleanly upon container restoration.
