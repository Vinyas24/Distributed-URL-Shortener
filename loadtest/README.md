# Load and failure testing

Scripts for exercising the URL shortener under sustained traffic and for verifying its behavior
when Redis or PostgreSQL disappears.

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) for the load scripts
- Docker with Compose for the failure drills
- The application running and pointed at the Compose Redis/PostgreSQL services

Start the dependencies from the repository root:

```bash
docker compose up -d
```

Run the application with a high create limit (or disable it) so the load generator measures the
application rather than the rate limiter:

```bash
WORKER_ID=0 \
DB_URL=jdbc:postgresql://localhost:5432/urlshortener \
DB_USERNAME=urlshortener DB_PASSWORD=urlshortener \
RATE_LIMIT_CREATE_CAPACITY=100000 \
RATE_LIMIT_CREATE_REFILL_PER_SECOND=100000 \
java -jar target/url-shortener-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

For pure create throughput, set `RATE_LIMIT_ENABLED=false`. For redirect throughput the limiter is
irrelevant because redirects are never rate limited.

## Redirect load

`loadtest/k6/redirect.js` seeds short codes through the public API, then drives constant-arrival-rate
redirects against the seeded codes. Because creates are write-through, the steady state measures
the Redis cache path.

```bash
k6 run \
  -e BASE_URL=http://localhost:8080 \
  -e SEED_COUNT=500 \
  -e RATE=500 \
  -e DURATION=60s \
  loadtest/k6/redirect.js
```

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:8080` | Application under test |
| `SEED_COUNT` | `200` | Number of short codes created in `setup()` |
| `RATE` | `300` | Redirects per second |
| `DURATION` | `30s` | Scenario duration |
| `PRE_ALLOCATED_VUS` / `MAX_VUS` | `50` / `500` | k6 virtual-user bounds |
| `MAX_SEED_SECONDS` | `120` | Seed deadline before failing |

Thresholds fail the run when `http_req_failed >= 1%`, `p(95) >= 150 ms`, `p(99) >= 300 ms`, or
check success is below 99%.

To measure the cold-cache path, flush the redirect cache after seeding and before the run:

```bash
docker compose exec -T redis sh -c \
  "redis-cli --scan --pattern 'url:redirect:*' | xargs -r redis-cli DEL"
```

The first request per code then falls back to PostgreSQL and repopulates Redis.

## Create load

`loadtest/k6/create.js` creates a unique URL per iteration:

```bash
k6 run \
  -e BASE_URL=http://localhost:8080 \
  -e RATE=100 \
  -e DURATION=60s \
  loadtest/k6/create.js
```

Thresholds fail the run when `http_req_failed >= 1%`, `p(95) >= 250 ms`, `p(99) >= 500 ms`, or
the 201 check rate is below 99%. A high 429 rate means the create rate limiter is active; raise
`RATE_LIMIT_CREATE_CAPACITY` / `RATE_LIMIT_CREATE_REFILL_PER_SECOND` or disable the limiter.

## Failure drills

The drill script stops and restarts the Compose Redis and PostgreSQL services while the app keeps
running. It always restores both services on exit, including on failure.

```bash
./loadtest/failure-drills.sh
```

It verifies:

1. **Baseline** — create returns `201`, redirect returns `302`.
2. **Redis outage**
   - Redirects still return `302` (cache failure falls back to PostgreSQL).
   - Creates follow the configured policy: `201` with fail-open (default) or
     `503 RATE_LIMITER_UNAVAILABLE` with fail-closed.
3. **PostgreSQL outage**
   - A cached redirect still returns `302` and never touches the database.
   - An uncached redirect returns `503 SERVICE_UNAVAILABLE`.
   - A create returns `503 SERVICE_UNAVAILABLE`, not `500`.
4. **Recovery** — after PostgreSQL restarts, creates and redirects succeed again without an
   application restart.

The script assumes the app uses the services defined in `docker-compose.yml`. Override `BASE_URL`
or `COMPOSE_FILE` if needed:

```bash
BASE_URL=http://localhost:18080 COMPOSE_FILE=/path/to/docker-compose.yml \
  ./loadtest/failure-drills.sh
```

## Interpreting results

- Redirect throughput is bounded by Redis round trips and Tomcat threads; watch
  `http_server_requests_seconds_*` and `urlshortener_cache_gets_total` in `/actuator/prometheus`.
- Create throughput includes a PostgreSQL insert, a Redis write-through, and an analytics enqueue;
  watch `urlshortener_create_duration_seconds` and `urlshortener_analytics_queue_size`.
- A growing `urlshortener_analytics_queue_size` during a load test means the batch writer cannot
  keep up; increase `ANALYTICS_BATCH_SIZE` or reduce `ANALYTICS_FLUSH_INTERVAL_MS`.
- During the Redis drill, creates take roughly one extra second because the cache and limiter
  each wait for the configured Redis timeout.

## Empirical Load Test Results (Phase 7)

Tested against the full Compose stack: 2 API replicas (`api-1`, `api-2`) load-balanced by Nginx, backed by PostgreSQL 16 and Redis 7.

### 1. Latency Percentiles Summary

| Scenario | Target Rate | Throughput | p50 (med) | p90 | p95 | p99 | Max | Error Rate |
|---|---|---|---|---|---|---|---|---|
| **Hot-cache Redirects** (`redirect.js`) | 500 req/s | 477.5 req/s | 1.49 ms | 2.77 ms | 3.58 ms | **8.43 ms** | 257.95 ms | 0.00% |
| **Cold-cache Redirects** (flushed cache) | 200 req/s | 198.3 req/s | 1.50 ms | 2.09 ms | 2.34 ms | **6.44 ms** | 16.51 ms | 0.00% |
| **Creates** (`create.js`) | 100 req/s | 100.0 req/s | 4.55 ms | 5.78 ms | 6.21 ms | **7.38 ms** | 21.18 ms | 0.00% |
| **Mixed 50:1 — Redirects** (`mixed.js`) | 500 req/s | 495.0 req/s | 1.04 ms | 1.54 ms | 1.72 ms | **2.17 ms** | 34.54 ms | 0.00% |
| **Mixed 50:1 — Creates** (`mixed.js`) | 10 req/s | 10.0 req/s | 3.76 ms | 4.82 ms | 5.16 ms | **7.03 ms** | 18.07 ms | 0.00% |

> **p99 Redirect Target (<50 ms):** **PASSED.** Measured redirect p99 is **2.17 ms** (mixed) and **8.43 ms** (sustained 500 rps), well within the 50 ms budget.

### 2. Async Click Recording Under Load

During the 30,000+ request runs:
- `urlshortener_analytics_events_total{result="enqueued"}`: **72,002**
- `urlshortener_analytics_events_total{result="persisted"}`: **72,002**
- `urlshortener_analytics_queue_size`: **0**
- Drops: **0**
- 100% of click events were asynchronously drained and batch-persisted to PostgreSQL with zero backpressure on redirects.

### 3. PostgreSQL Query Plan Verification (`EXPLAIN ANALYZE`)

#### URL Lookup by Short Code (`urls` table)
```sql
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, short_code, original_url, expires_at, is_custom, owner_id, created_at 
FROM urls WHERE short_code = 'multi-test-1';
```
```text
Index Scan using uq_urls_short_code on urls  (cost=0.28..8.30 rows=1 width=217) (actual time=0.022..0.023 rows=1 loops=1)
  Index Cond: ((short_code)::text = 'multi-test-1'::text)
  Buffers: shared hit=3
Planning Time: 0.316 ms
Execution Time: 0.056 ms
```
- **Index Scan**: `uq_urls_short_code` (no Seq Scan). Execution time: **0.056 ms**.

#### Click Analytics Query (`click_events` table)
```sql
EXPLAIN (ANALYZE, BUFFERS) 
SELECT date_trunc('day', clicked_at) as day, count(*) 
FROM click_events WHERE short_code = 'multi-test-1' 
GROUP BY day ORDER BY day;
```
```text
GroupAggregate  (cost=20.11..21.59 rows=74 width=16) (actual time=0.061..0.061 rows=1 loops=1)
  Group Key: (date_trunc('day'::text, clicked_at))
  Buffers: shared hit=7
  ->  Sort  (cost=20.11..20.29 rows=74 width=8) (actual time=0.057..0.057 rows=2 loops=1)
        Sort Key: (date_trunc('day'::text, clicked_at))
        Sort Method: quicksort  Memory: 25kB
        Buffers: shared hit=7
        ->  Index Only Scan using idx_click_events_code_clicked_at on click_events  (cost=0.42..17.81 rows=74 width=8) (actual time=0.042..0.043 rows=2 loops=1)
              Index Cond: (short_code = 'multi-test-1'::text)
              Heap Fetches: 0
              Buffers: shared hit=4
Planning Time: 0.509 ms
Execution Time: 0.116 ms
```
- **Index Only Scan**: `idx_click_events_code_clicked_at` (0 heap fetches). Execution time: **0.116 ms**.

