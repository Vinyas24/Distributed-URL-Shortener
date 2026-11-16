#!/usr/bin/env bash
#
# Failure drills for the running application.
#
# Assumes:
#   - the app is running at $BASE_URL and uses the Redis/PostgreSQL services in docker-compose.yml
#   - docker compose is available and the services are up
#
# The script briefly stops Redis and PostgreSQL, verifies the documented behavior, and always
# restores both services on exit. It is safe to run repeatedly; drill codes are suffixed per run.
#
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
BASE_URL="${BASE_URL%/}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$SCRIPT_DIR/../docker-compose.yml}"
SUFFIX="$(printf '%04x' $(( $(date +%s) % 65536 )))"
BODY_FILE="$(mktemp)"
trap cleanup EXIT

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

pass() {
  printf '[PASS] %s\n' "$1"
}

fail() {
  printf '[FAIL] %s\n' "$1" >&2
  exit 1
}

info() {
  printf '[INFO] %s\n' "$1"
}

cleanup() {
  info "Restoring Redis and PostgreSQL"
  compose start redis postgres >/dev/null 2>&1 || true
  wait_for_redis >/dev/null 2>&1 || true
  wait_for_postgres >/dev/null 2>&1 || true
  rm -f "$BODY_FILE"
}

http_status() {
  curl -sS --max-time 20 -o "$BODY_FILE" -w '%{http_code}' "$@"
}

assert_status() {
  local expected="$1"
  local label="$2"
  shift 2
  local actual
  actual=$(http_status "$@") || fail "$label: curl failed"
  if [ "$actual" != "$expected" ]; then
    fail "$label: expected HTTP $expected, got $actual (body: $(cat "$BODY_FILE"))"
  fi
  pass "$label (HTTP $expected)"
}

assert_code() {
  local expected="$1"
  local label="$2"
  local actual
  actual=$(jq -r '.code // empty' "$BODY_FILE" 2>/dev/null || true)
  if [ "$actual" != "$expected" ]; then
    fail "$label: expected error code $expected, got '$actual' (body: $(cat "$BODY_FILE"))"
  fi
  pass "$label (code $expected)"
}

assert_redirect() {
  local code="$1"
  local label="$2"
  assert_status 302 "$label" "$BASE_URL/$code"
}

create_code() {
  local code="$1"
  http_status -X POST "$BASE_URL/api/v1/urls" \
    -H 'Content-Type: application/json' \
    -d "{\"originalUrl\":\"https://1.1.1.1/drill/$code\",\"customCode\":\"$code\"}"
}

wait_for_health() {
  for _ in $(seq 1 60); do
    if curl -sf --max-time 2 "$BASE_URL/actuator/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

wait_for_redis() {
  for _ in $(seq 1 30); do
    if compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
      return 0
    fi
    sleep 1
  done
  return 1
}

wait_for_postgres() {
  for _ in $(seq 1 60); do
    if compose exec -T postgres pg_isready -U urlshortener -d urlshortener >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

redis_cli() {
  compose exec -T redis redis-cli "$@"
}

clear_drill_state() {
  while IFS= read -r key; do
    [ -n "$key" ] && redis_cli DEL "$key" >/dev/null
  done < <(redis_cli --scan --pattern 'url:redirect:drill-*' 2>/dev/null || true)
  while IFS= read -r key; do
    [ -n "$key" ] && redis_cli DEL "$key" >/dev/null
  done < <(redis_cli --scan --pattern 'rate:create:*' 2>/dev/null || true)
}

BASELINE_CODE="drill-b-$SUFFIX"
CACHED_CODE="drill-c-$SUFFIX"
NEW_CODE="drill-n-$SUFFIX"
DB_DOWN_CODE="drill-d-$SUFFIX"
RECOVERY_CODE="drill-r-$SUFFIX"

info "Waiting for the application at $BASE_URL"
wait_for_health || fail "application is not healthy at $BASE_URL/actuator/health"
wait_for_redis || fail "Redis is not ready"
wait_for_postgres || fail "PostgreSQL is not ready"
pass "application and dependencies are healthy"

info "Clearing previous drill cache and rate-limit keys"
clear_drill_state

info "Baseline: create and redirect"
status=$(create_code "$BASELINE_CODE")
[ "$status" = 201 ] || fail "baseline create: expected 201, got $status (body: $(cat "$BODY_FILE"))"
pass "baseline create (HTTP 201)"
assert_redirect "$BASELINE_CODE" "baseline redirect"

status=$(create_code "$CACHED_CODE")
[ "$status" = 201 ] || fail "cached create: expected 201, got $status (body: $(cat "$BODY_FILE"))"
pass "cached create (HTTP 201)"
assert_redirect "$CACHED_CODE" "warm cached redirect"

info "Drill 1: Redis outage"
compose stop redis >/dev/null
pass "Redis stopped"

# The redirect cache and rate limiter are best-effort. A cached or DB-backed redirect must work.
assert_redirect "$BASELINE_CODE" "redirect with Redis down"

# The create endpoint follows the configured failure policy.
status=$(create_code "$NEW_CODE")
case "$status" in
  201)
    pass "create with Redis down (fail-open, HTTP 201)"
    assert_redirect "$NEW_CODE" "redirect of fail-open create"
    ;;
  503)
    assert_code RATE_LIMITER_UNAVAILABLE "create with Redis down (fail-closed)"
    ;;
  *)
    fail "create with Redis down: expected 201 (fail-open) or 503 (fail-closed), got $status (body: $(cat "$BODY_FILE"))"
    ;;
esac

compose start redis >/dev/null
wait_for_redis || fail "Redis did not become ready after restart"
pass "Redis restarted"

# Re-warm the cached code in case the restart lost the volatile cache entry. Lettuce may need a
# moment to reconnect, so retry the redirect until the cache entry is observable.
cached_present=false
for _ in $(seq 1 10); do
  status=$(http_status "$BASE_URL/$CACHED_CODE")
  if [ "$status" = 302 ] && redis_cli EXISTS "url:redirect:$CACHED_CODE" | grep -q 1; then
    cached_present=true
    break
  fi
  sleep 1
done
[ "$cached_present" = true ] \
  || fail "cached redirect after Redis restart: expected 302 and a cache entry"
pass "cached redirect after Redis restart (cache re-warmed)"

info "Drill 2: PostgreSQL outage"
redis_cli DEL "url:redirect:$BASELINE_CODE" >/dev/null
pass "evicted baseline code from the redirect cache"

compose stop postgres >/dev/null
pass "PostgreSQL stopped"

# Cached redirects do not touch PostgreSQL and must still return 302.
assert_redirect "$CACHED_CODE" "cached redirect with PostgreSQL down"

# An uncached redirect must hit PostgreSQL and fail as a stable 503.
assert_status 503 "uncached redirect with PostgreSQL down" "$BASE_URL/$BASELINE_CODE"
assert_code SERVICE_UNAVAILABLE "uncached redirect with PostgreSQL down"

# Create needs PostgreSQL, so it must fail as 503 rather than 500.
status=$(create_code "$DB_DOWN_CODE")
[ "$status" = 503 ] || fail "create with PostgreSQL down: expected 503, got $status (body: $(cat "$BODY_FILE"))"
assert_code SERVICE_UNAVAILABLE "create with PostgreSQL down"

compose start postgres >/dev/null
wait_for_postgres || fail "PostgreSQL did not become ready after restart"
pass "PostgreSQL restarted"

info "Recovery: create and redirect work again"
status=""
for _ in $(seq 1 20); do
  status=$(create_code "$RECOVERY_CODE")
  # 201 means the create succeeded; 409 means a retry raced an earlier successful insert.
  if [ "$status" = 201 ] || [ "$status" = 409 ]; then
    break
  fi
  sleep 1
done
case "$status" in
  201) pass "create recovered (HTTP 201)" ;;
  409) pass "create recovered (HTTP 409: code already created by a retry)" ;;
  *) fail "create did not recover after PostgreSQL restart: status=$status (body: $(cat "$BODY_FILE"))" ;;
esac
assert_redirect "$RECOVERY_CODE" "redirect after recovery"

info "All failure drills passed"
