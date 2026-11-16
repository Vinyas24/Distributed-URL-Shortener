import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const RATE = Number(__ENV.RATE || 50);
const DURATION = __ENV.DURATION || '30s';

export const options = {
  scenarios: {
    creates: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: Number(__ENV.PRE_ALLOCATED_VUS || 25),
      maxVUs: Number(__ENV.MAX_VUS || 200),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<250', 'p(99)<500'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

/**
 * Creates a new short URL per iteration. Each request uses a unique target URL, so no
 * deduplication or custom-code collisions can mask throughput.
 *
 * The create endpoint is rate limited per client IP. For a sustained create load test, run the
 * app with RATE_LIMIT_ENABLED=false or a high RATE_LIMIT_CREATE_CAPACITY/REFILL value.
 */
export default function () {
  const target = `https://1.1.1.1/load/create/${__VU}/${__ITER}`;
  const response = http.post(
    `${BASE_URL}/api/v1/urls`,
    JSON.stringify({ originalUrl: target }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'create' } }
  );

  check(response, {
    'status is 201': (res) => res.status === 201,
  });
}
