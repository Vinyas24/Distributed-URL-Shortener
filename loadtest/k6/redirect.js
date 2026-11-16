import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const SEED_COUNT = Number(__ENV.SEED_COUNT || 200);
const RATE = Number(__ENV.RATE || 300);
const DURATION = __ENV.DURATION || '30s';
const MAX_SEED_SECONDS = Number(__ENV.MAX_SEED_SECONDS || 120);

export const options = {
  scenarios: {
    redirects: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: Number(__ENV.PRE_ALLOCATED_VUS || 50),
      maxVUs: Number(__ENV.MAX_VUS || 500),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<150', 'p(99)<300'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

/**
 * Seeds redirect targets through the public API and returns their generated short codes.
 * If the create rate limiter is enabled, 429 responses are retried until MAX_SEED_SECONDS.
 * Disable rate limiting (or raise its capacity) for fast seeding.
 */
export function setup() {
  const codes = [];
  const deadline = Date.now() + MAX_SEED_SECONDS * 1000;

  while (codes.length < SEED_COUNT) {
    if (Date.now() > deadline) {
      throw new Error(
        `Seeded ${codes.length}/${SEED_COUNT} codes before the ${MAX_SEED_SECONDS}s deadline. ` +
          'Disable rate limiting or raise RATE_LIMIT_CREATE_CAPACITY for the load environment.'
      );
    }

    const response = http.post(
      `${BASE_URL}/api/v1/urls`,
      JSON.stringify({ originalUrl: `https://1.1.1.1/load/seed/${codes.length}` }),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'seed_create' } }
    );

    if (response.status === 201) {
      codes.push(response.json('shortCode'));
      continue;
    }

    if (response.status === 429) {
      sleep(1);
      continue;
    }

    throw new Error(`Seed create failed: status=${response.status} body=${response.body}`);
  }

  console.log(`Seeded ${codes.length} short codes for the redirect scenario`);
  return { codes };
}

export default function (data) {
  const code = data.codes[Math.floor(Math.random() * data.codes.length)];
  const response = http.get(`${BASE_URL}/${code}`, {
    redirects: 0,
    tags: { name: 'redirect' },
  });

  check(response, {
    'status is 302': (res) => res.status === 302,
    'Location header is present': (res) => Boolean(res.headers['Location']),
  });
}
