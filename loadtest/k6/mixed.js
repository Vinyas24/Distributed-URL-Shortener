/**
 * Phase 7 — Mixed 50:1 read:write load scenario.
 *
 * Simulates realistic traffic: a small create stream alongside a heavy redirect stream.
 *
 * Usage:
 *   k6 run -e BASE_URL=http://localhost -e REDIRECT_RATE=500 -e CREATE_RATE=10 \
 *           -e DURATION=60s loadtest/k6/mixed.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost').replace(/\/$/, '');
const REDIRECT_RATE = Number(__ENV.REDIRECT_RATE || 500);
const CREATE_RATE   = Number(__ENV.CREATE_RATE   || 10);
const DURATION      = __ENV.DURATION || '60s';
const SEED_COUNT    = Number(__ENV.SEED_COUNT || 300);

export const options = {
  scenarios: {
    redirects: {
      executor: 'constant-arrival-rate',
      rate: REDIRECT_RATE,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: 100,
      maxVUs: 1000,
      exec: 'doRedirect',
    },
    creates: {
      executor: 'constant-arrival-rate',
      rate: CREATE_RATE,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: 20,
      maxVUs: 100,
      exec: 'doCreate',
    },
  },
  thresholds: {
    'http_req_duration{name:redirect}': ['p(50)<20', 'p(95)<50', 'p(99)<100'],
    'http_req_duration{name:create}':   ['p(95)<300', 'p(99)<600'],
    'http_req_failed{name:redirect}':   ['rate<0.01'],
    'http_req_failed{name:create}':     ['rate<0.05'],
    checks: ['rate>0.98'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  const codes = [];
  const deadline = Date.now() + 180_000; // 3 min max seeding

  while (codes.length < SEED_COUNT) {
    if (Date.now() > deadline) {
      throw new Error(`Seeded only ${codes.length}/${SEED_COUNT} codes before deadline`);
    }
    const r = http.post(
      `${BASE_URL}/api/v1/urls`,
      JSON.stringify({ originalUrl: `https://1.1.1.1/seed/${codes.length}` }),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'seed' } }
    );
    if (r.status === 201) {
      codes.push(r.json('shortCode'));
    } else if (r.status === 429) {
      sleep(1);
    } else {
      throw new Error(`Seed failed: ${r.status} ${r.body}`);
    }
  }
  console.log(`Seeded ${codes.length} codes`);
  return { codes };
}

export function doRedirect(data) {
  const code = data.codes[Math.floor(Math.random() * data.codes.length)];
  const r = http.get(`${BASE_URL}/${code}`, {
    redirects: 0,
    tags: { name: 'redirect' },
  });
  check(r, {
    'redirect 302': (res) => res.status === 302,
    'Location present': (res) => Boolean(res.headers['Location']),
  });
}

export function doCreate(data) {
  const r = http.post(
    `${BASE_URL}/api/v1/urls`,
    JSON.stringify({ originalUrl: `https://1.1.1.1/load/create/${Date.now()}/${Math.random()}` }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'create' } }
  );
  check(r, { 'create 201': (res) => res.status === 201 });
}
