import { http, HttpResponse } from 'msw';

export const mockUrlsStore = [
  {
    shortCode: 'msw-active',
    originalUrl: 'https://example.com/msw-target',
    shortUrl: 'http://localhost/msw-active',
    clicks: 520,
    createdAt: '2026-11-15T10:00:00Z',
    expiresAt: null,
    isCustom: true,
  },
];

export const handlers = [
  // 1. Create URL
  http.post('*/api/v1/urls', async ({ request }) => {
    const body = (await request.json()) as {
      originalUrl?: string;
      customCode?: string;
      expiresAt?: string;
    };

    if (body.customCode === 'taken-code') {
      return HttpResponse.json(
        {
          timestamp: new Date().toISOString(),
          status: 409,
          code: 'SHORT_CODE_TAKEN',
          message: 'The short code "taken-code" is already registered.',
          traceId: 'tr_msw_conflict_409',
        },
        { status: 409 }
      );
    }

    if (body.originalUrl?.includes('trigger-rate-limit')) {
      return HttpResponse.json(
        {
          timestamp: new Date().toISOString(),
          status: 429,
          code: 'RATE_LIMITED',
          message: 'Rate limit exceeded. Try again in a few moments.',
          traceId: 'tr_msw_rate_429',
        },
        { status: 429 }
      );
    }

    const shortCode = body.customCode || 'msw-gen123';
    return HttpResponse.json(
      {
        shortCode,
        shortUrl: `http://localhost/${shortCode}`,
        originalUrl: body.originalUrl,
        custom: Boolean(body.customCode),
        createdAt: new Date().toISOString(),
        expiresAt: body.expiresAt || null,
      },
      { status: 201 }
    );
  }),

  // 2. List URLs
  http.get('*/api/v1/urls', ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase() || '';

    let items = mockUrlsStore;
    if (search) {
      items = items.filter(
        (i) => i.shortCode.includes(search) || i.originalUrl.includes(search)
      );
    }

    return HttpResponse.json({
      items,
      total: items.length,
      page: 1,
      totalPages: 1,
    });
  }),

  // 3. Stats details
  http.get('*/api/v1/urls/:code/stats', ({ params }) => {
    const { code } = params;
    if (code === 'not-found-code') {
      return HttpResponse.json(
        {
          status: 404,
          code: 'NOT_FOUND',
          message: `Short code '${code}' not found`,
          traceId: 'tr_msw_404',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      shortCode: code,
      originalUrl: 'https://example.com/msw-stats',
      shortUrl: `http://localhost/${code}`,
      clicks: 850,
      createdAt: '2026-11-10T12:00:00Z',
      expiresAt: null,
      isCustom: true,
      clicksByDay: [
        { date: 'Nov 11', clicks: 120 },
        { date: 'Nov 12', clicks: 150 },
        { date: 'Nov 13', clicks: 190 },
        { date: 'Nov 14', clicks: 210 },
        { date: 'Nov 15', clicks: 180 },
      ],
      referrers: [
        { source: 'Direct / None', clicks: 400, percentage: 47 },
        { source: 'Twitter / X', clicks: 250, percentage: 29 },
        { source: 'GitHub', clicks: 200, percentage: 24 },
      ],
    });
  }),

  // 4. Update Expiry
  http.patch('*/api/v1/urls/:code/expiry', async ({ params, request }) => {
    const { code } = params;
    const body = (await request.json()) as { expiresAt?: string | null };

    return HttpResponse.json({
      shortCode: code,
      originalUrl: 'https://example.com/target',
      shortUrl: `http://localhost/${code}`,
      clicks: 100,
      createdAt: '2026-11-01T00:00:00Z',
      expiresAt: body.expiresAt ?? null,
      isCustom: true,
    });
  }),

  // 5. Delete URL
  http.delete('*/api/v1/urls/:code', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // 6. Actuator Health
  http.get('*/actuator/health', () => {
    return HttpResponse.json({ status: 'UP' });
  }),
];
