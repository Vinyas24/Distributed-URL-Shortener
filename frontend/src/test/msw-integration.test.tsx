import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { apiClient, ApiError } from '@/api/client';
import { server } from './mocks/server';

describe('MSW API Mock Integration (Phase F)', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('creates a short URL through MSW network interceptor', async () => {
    const res = await apiClient.createUrl({
      originalUrl: 'https://example.com/msw-test-flow',
      customCode: 'msw-flow',
    });

    expect(res.shortCode).toBe('msw-flow');
    expect(res.shortUrl).toBe('http://localhost/msw-flow');
    expect(res.custom).toBe(true);
  });

  it('correctly maps 409 conflict error code from MSW mock', async () => {
    try {
      await apiClient.createUrl({
        originalUrl: 'https://example.com/conflict-test',
        customCode: 'taken-code',
      });
      expect.fail('Should have thrown an ApiError');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(409);
      expect(apiErr.code).toBe('SHORT_CODE_TAKEN');
      expect(apiErr.traceId).toBe('tr_msw_conflict_409');
    }
  });

  it('correctly maps 429 rate limit error code from MSW mock', async () => {
    try {
      await apiClient.createUrl({
        originalUrl: 'https://example.com/trigger-rate-limit',
      });
      expect.fail('Should have thrown an ApiError');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(429);
      expect(apiErr.code).toBe('RATE_LIMITED');
      expect(apiErr.traceId).toBe('tr_msw_rate_429');
    }
  });

  it('fetches link details and stats through MSW network interceptor', async () => {
    const details = await apiClient.getUrlDetails('msw-stats-code');

    expect(details.shortCode).toBe('msw-stats-code');
    expect(details.clicks).toBe(850);
    expect(details.clicksByDay.length).toBe(5);
    expect(details.referrers.length).toBe(3);
    expect(details.referrers[0].source).toBe('Direct / None');
  });

  it('checks actuator health through MSW network interceptor', async () => {
    const health = await apiClient.getHealth();
    expect(health.status).toBe('UP');
  });
});
