import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { validateUrlShortenForm } from '@/utils/validation';
import { ShortenForm } from '@/components/shorten/ShortenForm';
import { ToastProvider } from '@/components/ui';
import { apiClient, ApiError } from '@/api/client';

describe('Shorten Form & Validation (Phase B)', () => {
  describe('Form Validation Logic', () => {
    it('accepts valid public https and http URLs', () => {
      const res1 = validateUrlShortenForm('https://github.com/vinyas');
      expect(res1.isValid).toBe(true);
      expect(res1.errors.originalUrl).toBeUndefined();

      const res2 = validateUrlShortenForm('http://example.com/docs?id=123');
      expect(res2.isValid).toBe(true);
    });

    it('rejects URLs missing protocol or malformed', () => {
      const res = validateUrlShortenForm('ftp://files.example.com');
      expect(res.isValid).toBe(false);
      expect(res.errors.originalUrl).toMatch(/http:\/\/ or https:\/\//);
    });

    it('rejects localhost, loopback and private IPs (SSRF check)', () => {
      const local1 = validateUrlShortenForm('http://localhost:8080/admin');
      expect(local1.isValid).toBe(false);
      expect(local1.errors.originalUrl).toMatch(/Localhost and private IP/);

      const local2 = validateUrlShortenForm('http://127.0.0.1:5432');
      expect(local2.isValid).toBe(false);

      const local3 = validateUrlShortenForm('http://192.168.1.1/router');
      expect(local3.isValid).toBe(false);
    });

    it('validates custom codes (3-15 chars, [A-Za-z0-9_-])', () => {
      const valid = validateUrlShortenForm('https://example.com', 'launch-2026');
      expect(valid.isValid).toBe(true);

      const tooShort = validateUrlShortenForm('https://example.com', 'ab');
      expect(tooShort.isValid).toBe(false);
      expect(tooShort.errors.customCode).toBeDefined();

      const invalidChars = validateUrlShortenForm('https://example.com', 'bad code!');
      expect(invalidChars.isValid).toBe(false);
    });

    it('rejects reserved words for custom code', () => {
      const reserved = validateUrlShortenForm('https://example.com', 'actuator');
      expect(reserved.isValid).toBe(false);
      expect(reserved.errors.customCode).toMatch(/reserved/i);
    });

    it('rejects past expiration date', () => {
      const pastDate = new Date(Date.now() - 3600_000).toISOString();
      const res = validateUrlShortenForm('https://example.com', undefined, pastDate);
      expect(res.isValid).toBe(false);
      expect(res.errors.expiresAt).toMatch(/future/i);
    });
  });

  describe('ShortenForm UI Component', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('renders input, toggle options, and submit button', () => {
      render(
        <ToastProvider>
          <ShortenForm />
        </ToastProvider>
      );

      expect(screen.getByLabelText(/destination url/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /shorten link/i })).toBeInTheDocument();
      expect(screen.getByText(/custom short code & expiration/i)).toBeInTheDocument();
    });

    it('expands custom code and expiration accordion on click', async () => {
      const user = userEvent.setup();
      render(
        <ToastProvider>
          <ShortenForm />
        </ToastProvider>
      );

      const accordionBtn = screen.getByText(/custom short code & expiration/i);
      await user.click(accordionBtn);

      await waitFor(() => {
        expect(screen.getByLabelText(/custom short code/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/expiration date/i)).toBeInTheDocument();
      });
    });

    it('successfully creates short link and transitions to success view', async () => {
      const user = userEvent.setup();
      vi.spyOn(apiClient, 'createUrl').mockResolvedValueOnce({
        shortCode: 'my-custom-code',
        shortUrl: 'http://localhost/my-custom-code',
        originalUrl: 'https://example.com/target',
        custom: true,
        createdAt: new Date().toISOString(),
      });

      render(
        <ToastProvider>
          <ShortenForm />
        </ToastProvider>
      );

      const urlInput = screen.getByLabelText(/destination url/i);
      await user.type(urlInput, 'https://example.com/target');

      const submitBtn = screen.getByRole('button', { name: /shorten link/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/link created successfully/i)).toBeInTheDocument();
        expect(screen.getByText('http://localhost/my-custom-code')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /qr code/i })).toBeInTheDocument();
      });
    });

    it('displays inline error alert on 409 Conflict (SHORT_CODE_TAKEN)', async () => {
      const user = userEvent.setup();
      vi.spyOn(apiClient, 'createUrl').mockRejectedValueOnce(
        new ApiError({
          status: 409,
          code: 'SHORT_CODE_TAKEN',
          message: 'Code is already in use',
          traceId: 'tr-abc-123',
        })
      );

      render(
        <ToastProvider>
          <ShortenForm />
        </ToastProvider>
      );

      const urlInput = screen.getByLabelText(/destination url/i);
      await user.type(urlInput, 'https://example.com/target');

      const submitBtn = screen.getByRole('button', { name: /shorten link/i });
      await user.click(submitBtn);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(within(alert).getByText(/Custom Code Taken \(409 Conflict\)/i)).toBeInTheDocument();
        expect(within(alert).getByText(/Trace ID: tr-abc-123/i)).toBeInTheDocument();
      });
    });

    it('displays inline error alert on 429 Rate Limit (RATE_LIMITED)', async () => {
      const user = userEvent.setup();
      vi.spyOn(apiClient, 'createUrl').mockRejectedValueOnce(
        new ApiError({
          status: 429,
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          traceId: 'tr-rate-999',
        })
      );

      render(
        <ToastProvider>
          <ShortenForm />
        </ToastProvider>
      );

      const urlInput = screen.getByLabelText(/destination url/i);
      await user.type(urlInput, 'https://example.com/target');

      const submitBtn = screen.getByRole('button', { name: /shorten link/i });
      await user.click(submitBtn);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(within(alert).getByText(/Rate Limit Reached \(429\)/i)).toBeInTheDocument();
      });
    });
  });
});
