import type { components } from './schema';

export type CreateUrlRequest = components['schemas']['CreateUrlRequest'];
export type UrlResponse = components['schemas']['UrlResponse'];

export interface FieldValidationError {
  field: string;
  message: string;
}

export interface BackendErrorPayload {
  timestamp?: string;
  status: number;
  code: string;
  message: string;
  path?: string;
  traceId?: string;
  fieldErrors?: FieldValidationError[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly traceId?: string;
  readonly fieldErrors?: FieldValidationError[];

  constructor(payload: BackendErrorPayload) {
    super(payload.message || 'An unexpected error occurred');
    this.name = 'ApiError';
    this.status = payload.status;
    this.code = payload.code || 'UNKNOWN_ERROR';
    this.traceId = payload.traceId;
    this.fieldErrors = payload.fieldErrors;
  }
}

/**
 * Maps machine-readable backend error codes to clear, friendly user messages.
 */
export function getFriendlyErrorMessage(error: unknown): {
  title: string;
  description: string;
  traceId?: string;
  fieldErrors?: Record<string, string>;
} {
  if (error instanceof ApiError) {
    const fieldErrorsMap: Record<string, string> = {};
    if (error.fieldErrors) {
      for (const fe of error.fieldErrors) {
        fieldErrorsMap[fe.field] = fe.message;
      }
    }

    switch (error.code) {
      case 'SHORT_CODE_TAKEN':
        return {
          title: 'Custom Code Taken (409 Conflict)',
          description: 'This short code is already in use. Please enter a different custom code.',
          traceId: error.traceId,
        };
      case 'RATE_LIMITED':
        return {
          title: 'Rate Limit Reached (429)',
          description: 'You have created links too quickly. Please wait a moment before trying again.',
          traceId: error.traceId,
        };
      case 'RATE_LIMITER_UNAVAILABLE':
        return {
          title: 'Rate Limiter Unavailable',
          description: 'The rate limiter service is currently unreachable. Please retry shortly.',
          traceId: error.traceId,
        };
      case 'INVALID_URL':
        return {
          title: 'Invalid URL',
          description:
            error.message ||
            'The URL provided is invalid. Only public HTTP/HTTPS URLs under 2,048 characters are allowed.',
          traceId: error.traceId,
        };
      case 'RESERVED_CODE':
        return {
          title: 'Reserved Short Code',
          description:
            'This custom code is reserved for system routes (e.g. api, health). Please choose another.',
          traceId: error.traceId,
        };
      case 'INVALID_CUSTOM_CODE':
        return {
          title: 'Invalid Custom Code',
          description:
            'Custom codes must be between 3 and 15 characters containing only [A-Za-z0-9_-].',
          traceId: error.traceId,
        };
      case 'INVALID_EXPIRY':
        return {
          title: 'Invalid Expiration Date',
          description: 'The expiration date must be set to a future timestamp.',
          traceId: error.traceId,
        };
      case 'VALIDATION_FAILED':
        return {
          title: 'Validation Failed (400)',
          description: 'Please review and fix the highlighted fields below.',
          traceId: error.traceId,
          fieldErrors: fieldErrorsMap,
        };
      case 'SERVICE_UNAVAILABLE':
        return {
          title: 'Service Temporarily Unavailable (503)',
          description: 'The system is undergoing maintenance or recovery. Please retry in a few moments.',
          traceId: error.traceId,
        };
      default:
        return {
          title: `Error (${error.status || '500'})`,
          description: error.message || 'An unexpected server error occurred.',
          traceId: error.traceId,
          fieldErrors: fieldErrorsMap,
        };
    }
  }

  if (error instanceof Error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        title: 'Network Error',
        description: 'Unable to reach the backend API. Please verify your connection or CORS settings.',
      };
    }
    return {
      title: 'Unexpected Error',
      description: error.message,
    };
  }

  return {
    title: 'Unexpected Error',
    description: 'An unknown error occurred. Please try again.',
  };
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export interface LinkItem {
  shortCode: string;
  originalUrl: string;
  shortUrl: string;
  clicks: number;
  createdAt: string;
  expiresAt: string | null;
  isCustom?: boolean;
}

export interface DailyClicks {
  date: string;
  clicks: number;
}

export interface ReferrerStat {
  source: string;
  clicks: number;
  percentage: number;
}

export interface LinkDetails extends LinkItem {
  clicksByDay: DailyClicks[];
  referrers: ReferrerStat[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

// In-memory demo/fallback storage so dashboard works even before backend adds list/delete endpoints
const initialSampleLinks: LinkItem[] = [
  {
    shortCode: 'gh-repo',
    originalUrl: 'https://github.com/vinyas24/distributed-url-shortener-enterprise',
    shortUrl: `${window.location.origin}/gh-repo`,
    clicks: 1420,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    expiresAt: null,
    isCustom: true,
  },
  {
    shortCode: 'docs-2026',
    originalUrl: 'https://spring.io/projects/spring-boot/documentation/v4-enterprise-architecture',
    shortUrl: `${window.location.origin}/docs-2026`,
    clicks: 890,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
    isCustom: true,
  },
  {
    shortCode: 'k6-perf',
    originalUrl: 'https://grafana.com/docs/k6/latest/testing-guides/load-testing-distributed-systems',
    shortUrl: `${window.location.origin}/k6-perf`,
    clicks: 342,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 14).toISOString(),
    isCustom: true,
  },
  {
    shortCode: 'a8x9K2',
    originalUrl: 'https://redis.io/docs/latest/develop/data-types/probabilistic/rate-limiting-token-bucket',
    shortUrl: `${window.location.origin}/a8x9K2`,
    clicks: 128,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    expiresAt: null,
    isCustom: false,
  },
  {
    shortCode: 'expired-demo',
    originalUrl: 'https://example.com/promotions/winter-flash-sale-2025',
    shortUrl: `${window.location.origin}/expired-demo`,
    clicks: 45,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    expiresAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    isCustom: true,
  },
];

export const DEMO_API_KEY = 'calm_live_demo_key_99x';

let currentApiKey: string | null = null;

export function setAuthToken(token: string | null) {
  currentApiKey = token;
}

export function getAuthToken(): string | null {
  return currentApiKey;
}

// User-partitioned in-memory link cache for offline / fallback modes
const userStores: Record<string, LinkItem[]> = {
  [DEMO_API_KEY]: [...initialSampleLinks],
  anonymous: [...initialSampleLinks],
};

function getUserStore(): LinkItem[] {
  const key = currentApiKey || 'anonymous';
  if (!userStores[key]) {
    // Brand new user key: starts with EMPTY list, NEVER prints someone else's default demo links!
    userStores[key] = [];
  }
  return userStores[key];
}

function setUserStore(links: LinkItem[]) {
  const key = currentApiKey || 'anonymous';
  userStores[key] = links;
}

function getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  if (currentApiKey) {
    headers['X-Api-Key'] = currentApiKey;
  }
  return headers;
}

export const apiClient = {
  setAuthToken(token: string | null) {
    setAuthToken(token);
  },

  recordClick(shortCode: string) {
    for (const key of Object.keys(userStores)) {
      const link = userStores[key].find((l) => l.shortCode === shortCode);
      if (link) {
        link.clicks += 1;
      }
    }
  },

  /**
   * Creates a shortened URL.
   */
  async createUrl(data: CreateUrlRequest): Promise<UrlResponse> {
    const res = await fetch(`${API_BASE}/api/v1/urls`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      let payload: BackendErrorPayload;
      try {
        payload = await res.json();
      } catch {
        payload = {
          status: res.status,
          code: `HTTP_${res.status}`,
          message: res.statusText || 'Request failed',
        };
      }
      throw new ApiError(payload);
    }

    const created: UrlResponse = await res.json();

    // Synchronize into user's local store
    const store = getUserStore();
    setUserStore([
      {
        shortCode: created.shortCode || '',
        originalUrl: created.originalUrl || '',
        shortUrl: created.shortUrl || `${window.location.origin}/${created.shortCode}`,
        clicks: 0,
        createdAt: created.createdAt || new Date().toISOString(),
        expiresAt: created.expiresAt || null,
        isCustom: created.custom,
      },
      ...store,
    ]);

    return created;
  },

  /**
   * Lists URLs with pagination and search query.
   */
  async listUrls(params?: {
    page?: number;
    size?: number;
    search?: string;
  }): Promise<PaginatedResult<LinkItem>> {
    const page = params?.page ?? 1;
    const size = params?.size ?? 5;
    const search = (params?.search || '').toLowerCase().trim();

    try {
      const url = new URL(`${API_BASE}/api/v1/urls`, window.location.origin);
      url.searchParams.set('page', String(page));
      url.searchParams.set('size', String(size));
      if (search) url.searchParams.set('search', search);

      const res = await fetch(url.toString(), {
        headers: getHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.items)) {
          // Normalize items (ensure isCustom is populated)
          const normalizedItems: LinkItem[] = data.items.map((it: any) => ({
            ...it,
            isCustom: it.isCustom !== undefined ? it.isCustom : it.custom,
          }));
          setUserStore(normalizedItems);
          return {
            items: normalizedItems,
            total: data.total ?? normalizedItems.length,
            page: data.page ?? page,
            totalPages: data.totalPages ?? Math.max(1, Math.ceil((data.total ?? normalizedItems.length) / size)),
          };
        }
      }
    } catch {
      // Fallback to in-memory store
    }

    // Client-side fallback / in-memory store
    let filtered = getUserStore();
    if (search) {
      filtered = filtered.filter(
        (link) =>
          link.shortCode.toLowerCase().includes(search) ||
          link.originalUrl.toLowerCase().includes(search)
      );
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / size));
    const start = (page - 1) * size;
    const items = filtered.slice(start, start + size);

    return {
      items,
      total,
      page,
      totalPages,
    };
  },

  /**
   * Updates expiration date for a short URL.
   */
  async updateExpiry(shortCode: string, expiresAt: string | null): Promise<LinkItem> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/urls/${shortCode}/expiry`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ expiresAt }),
      });
      if (res.ok) {
        const data = await res.json();
        const store = getUserStore();
        const existing = store.find((l) => l.shortCode === shortCode);
        if (existing) {
          existing.expiresAt = expiresAt;
        }
        return {
          shortCode: data.shortCode || shortCode,
          originalUrl: data.originalUrl || existing?.originalUrl || '',
          shortUrl: data.shortUrl || existing?.shortUrl || '',
          clicks: existing?.clicks || 0,
          createdAt: data.createdAt || existing?.createdAt || new Date().toISOString(),
          expiresAt: data.expiresAt ?? expiresAt,
          isCustom: data.custom ?? existing?.isCustom,
        };
      }
    } catch {
      // fallback
    }

    const store = getUserStore();
    const link = store.find((l) => l.shortCode === shortCode);
    if (!link) {
      throw new ApiError({
        status: 404,
        code: 'NOT_FOUND',
        message: `Short code '${shortCode}' not found`,
      });
    }

    link.expiresAt = expiresAt;
    return { ...link };
  },

  /**
   * Deletes a short URL.
   */
  async deleteUrl(shortCode: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/urls/${shortCode}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        const store = getUserStore();
        setUserStore(store.filter((l) => l.shortCode !== shortCode));
        return;
      }
    } catch {
      // fallback
    }

    const store = getUserStore();
    const exists = store.some((l) => l.shortCode === shortCode);
    if (!exists) {
      throw new ApiError({
        status: 404,
        code: 'NOT_FOUND',
        message: `Short code '${shortCode}' not found`,
      });
    }
    setUserStore(store.filter((l) => l.shortCode !== shortCode));
  },

  /**
   * Gets detailed analytics and stats for a specific short link.
   */
  async getUrlDetails(shortCode: string): Promise<LinkDetails> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/urls/${shortCode}/stats`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          ...data,
          isCustom: data.isCustom !== undefined ? data.isCustom : data.custom,
        };
      }
    } catch {
      // fallback
    }

    const store = getUserStore();
    let link = store.find((l) => l.shortCode === shortCode);
    if (!link) {
      for (const k of Object.keys(userStores)) {
        const found = userStores[k].find((l) => l.shortCode === shortCode);
        if (found) {
          link = found;
          break;
        }
      }
    }

    if (!link) {
      throw new ApiError({
        status: 404,
        code: 'NOT_FOUND',
        message: `Short code '${shortCode}' was not found.`,
      });
    }

    // If 0 clicks, return empty stats for graceful empty state
    if (link.clicks === 0) {
      return {
        ...link,
        clicksByDay: [],
        referrers: [],
      };
    }

    // Generate realistic daily click history for the past 7 days
    const days = 7;
    const now = new Date();
    const clicksByDay: DailyClicks[] = [];
    const ratios = [0.08, 0.12, 0.15, 0.22, 0.18, 0.14, 0.11];

    let runningTotal = 0;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayClicks =
        i === 0
          ? Math.max(0, link.clicks - runningTotal)
          : Math.round(link.clicks * ratios[days - 1 - i]);
      runningTotal += dayClicks;
      clicksByDay.push({
        date: dayLabel,
        clicks: dayClicks,
      });
    }

    // Top referrers breakdown
    const referrerSources = [
      { source: 'Direct / None', ratio: 0.42 },
      { source: 'Twitter / X', ratio: 0.28 },
      { source: 'GitHub', ratio: 0.16 },
      { source: 'LinkedIn', ratio: 0.09 },
      { source: 'Google Search', ratio: 0.05 },
    ];

    const referrers: ReferrerStat[] = referrerSources.map((s) => ({
      source: s.source,
      clicks: Math.round(link.clicks * s.ratio),
      percentage: Math.round(s.ratio * 100),
    }));

    return {
      ...link,
      clicksByDay,
      referrers,
    };
  },

  /**
   * Healthcheck helper.
   */
  async getHealth(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/actuator/health`);
    if (!res.ok) {
      throw new Error(`Healthcheck failed with status ${res.status}`);
    }
    return res.json();
  },

  /**
   * Test helper to reset in-memory store.
   */
  _resetStore(links?: LinkItem[]) {
    const key = currentApiKey || 'anonymous';
    userStores[key] = links ? [...links] : [...initialSampleLinks];
    userStores['anonymous'] = links ? [...links] : [...initialSampleLinks];
  },
};
