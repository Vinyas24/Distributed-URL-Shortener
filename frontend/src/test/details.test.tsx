import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LinkDetailsPage } from '@/pages/LinkDetailsPage';
import { ToastProvider } from '@/components/ui';
import { apiClient, type LinkItem } from '@/api/client';

const mockLinkWithClicks: LinkItem = {
  shortCode: 'gh-repo',
  originalUrl: 'https://github.com/vinyas24/distributed-url-shortener-enterprise',
  shortUrl: 'http://localhost/gh-repo',
  clicks: 1420,
  createdAt: '2026-11-10T12:00:00Z',
  expiresAt: null,
  isCustom: true,
};

const mockLinkZeroClicks: LinkItem = {
  shortCode: 'new-launch',
  originalUrl: 'https://example.com/new-product-launch',
  shortUrl: 'http://localhost/new-launch',
  clicks: 0,
  createdAt: '2026-11-17T08:00:00Z',
  expiresAt: '2026-12-31T23:59:59Z',
  isCustom: true,
};

const renderDetails = (code: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[`/links/${code}`]}>
          <Routes>
            <Route path="/links/:code" element={<LinkDetailsPage />} />
            <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe('Link Details & Visual Analytics (Phase D)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    apiClient._resetStore([mockLinkWithClicks, mockLinkZeroClicks]);
  });

  it('renders quick-copy header, animated click counter, and analytics breakdown', async () => {
    renderDetails('gh-repo');

    // Header short code and destination
    expect(await screen.findByText('/gh-repo')).toBeInTheDocument();
    expect(
      screen.getByText('https://github.com/vinyas24/distributed-url-shortener-enterprise')
    ).toBeInTheDocument();
    expect(screen.getByText('custom slug')).toBeInTheDocument();
    expect(screen.getByText('Never Expires')).toBeInTheDocument();

    // Quick-copy and QR buttons
    expect(screen.getByRole('button', { name: /copy short link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /qr code/i })).toBeInTheDocument();

    // KPI cards & animated counter
    expect(screen.getByText('Total Lifetime Clicks')).toBeInTheDocument();
    expect(screen.getByText('7-Day Velocity')).toBeInTheDocument();
    expect(screen.getByText('Created On')).toBeInTheDocument();

    // Chart & Top Referrers
    expect(screen.getByText('Clicks Over Time')).toBeInTheDocument();
    expect(screen.getByText('Top Referrers')).toBeInTheDocument();
    expect(screen.getByText('Direct / None')).toBeInTheDocument();
    expect(screen.getByText('Twitter / X')).toBeInTheDocument();
  });

  it('copies short link to clipboard when clicking quick-copy button', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

    renderDetails('gh-repo');

    const copyBtn = await screen.findByRole('button', { name: /copy short link/i });
    await user.click(copyBtn);

    expect(writeTextSpy).toHaveBeenCalledWith('http://localhost/gh-repo');
    expect(await screen.findByText(/short link copied/i)).toBeInTheDocument();
  });

  it('opens and closes QR Code modal with download option', async () => {
    const user = userEvent.setup();
    renderDetails('gh-repo');

    const qrBtn = await screen.findByRole('button', { name: /qr code/i });
    await user.click(qrBtn);

    // Modal opens
    expect(await screen.findByText('QR Code for /gh-repo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download svg/i })).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /close modal/i });
    await user.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('QR Code for /gh-repo')).not.toBeInTheDocument();
    });
  });

  it('gracefully handles "no clicks yet" empty state for new links', async () => {
    renderDetails('new-launch');

    expect(await screen.findByText('/new-launch')).toBeInTheDocument();

    // Counter shows 0
    expect(screen.getByLabelText('0 clicks')).toBeInTheDocument();

    // Empty analytics banners
    expect(screen.getByText('Ready for incoming traffic')).toBeInTheDocument();
    expect(
      screen.getByText(/This short URL is active and healthy in the distributed cache/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy & share/i })).toBeInTheDocument();

    // Empty state in chart & referrers
    expect(screen.getByText('No clicks recorded yet')).toBeInTheDocument();
    expect(screen.getByText('No referrer data yet')).toBeInTheDocument();
  });

  it('displays friendly error state when short code is not found', async () => {
    renderDetails('non-existent-code');

    expect(await screen.findByRole('heading', { name: /Error \(404\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return to dashboard/i })).toBeInTheDocument();
  });
});
