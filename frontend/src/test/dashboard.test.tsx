import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '@/pages/DashboardPage';
import { ToastProvider } from '@/components/ui';
import { apiClient, type LinkItem } from '@/api/client';

const mockLinks: LinkItem[] = [
  {
    shortCode: 'gh-repo',
    originalUrl: 'https://github.com/vinyas24/distributed-url-shortener-enterprise',
    shortUrl: 'http://localhost/gh-repo',
    clicks: 1420,
    createdAt: '2026-11-10T12:00:00Z',
    expiresAt: null,
    isCustom: true,
  },
  {
    shortCode: 'docs-2026',
    originalUrl: 'https://spring.io/projects/spring-boot/documentation/v4',
    shortUrl: 'http://localhost/docs-2026',
    clicks: 890,
    createdAt: '2026-11-12T10:00:00Z',
    expiresAt: '2026-12-31T23:59:59Z',
    isCustom: true,
  },
  {
    shortCode: 'expired-demo',
    originalUrl: 'https://example.com/promotions/old-sale',
    shortUrl: 'http://localhost/expired-demo',
    clicks: 45,
    createdAt: '2026-11-01T08:00:00Z',
    expiresAt: '2026-11-05T00:00:00Z', // In past
    isCustom: false,
  },
];

const renderDashboard = () => {
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
        <MemoryRouter initialEntries={['/dashboard']}>
          <DashboardPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe('Dashboard & Link Management (Phase C)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    apiClient._resetStore(mockLinks);
  });

  it('renders KPI metrics and link table with columns', async () => {
    renderDashboard();

    // Wait for row contents to load
    expect(await screen.findByText('/gh-repo')).toBeInTheDocument();
    expect(screen.getAllByText('custom').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('/docs-2026')).toBeInTheDocument();
    expect(screen.getByText('/expired-demo')).toBeInTheDocument();

    // Check KPI cards
    expect(screen.getByText('Link Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Total Links')).toBeInTheDocument();
    expect(screen.getByText('Total Clicks')).toBeInTheDocument();
    expect(screen.getByText('Active Links')).toBeInTheDocument();

    // Check table headers
    expect(screen.getByRole('columnheader', { name: /short code/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /destination url/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /clicks/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /created/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /expires/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();

    // Destination URL rendered safely without innerHTML
    expect(
      screen.getByText('https://github.com/vinyas24/distributed-url-shortener-enterprise')
    ).toBeInTheDocument();

    // Check expiration badges
    expect(screen.getByText('Never')).toBeInTheDocument();
    expect(screen.getByText(/Expired/i)).toBeInTheDocument();
  });

  it('copies short URL to clipboard on copy button click', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

    renderDashboard();

    expect(await screen.findByText('/gh-repo')).toBeInTheDocument();

    const copyBtn = screen.getByRole('button', { name: /copy short url for gh-repo/i });
    await user.click(copyBtn);

    expect(writeTextSpy).toHaveBeenCalledWith('http://localhost/gh-repo');
    expect(await screen.findByText(/copied to clipboard/i)).toBeInTheDocument();
  });

  it('opens edit expiry modal and updates link expiration', async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(apiClient, 'updateExpiry').mockResolvedValueOnce({
      ...mockLinks[0],
      expiresAt: '2026-12-25T12:00:00.000Z',
    });

    renderDashboard();

    expect(await screen.findByText('/gh-repo')).toBeInTheDocument();

    // Open edit modal for gh-repo
    const editBtn = screen.getByRole('button', { name: /edit expiration for gh-repo/i });
    await user.click(editBtn);

    // Modal is opened
    expect(await screen.findByText('Edit Link Expiration')).toBeInTheDocument();

    // Set new future expiration via fireEvent to support datetime-local in jsdom
    const expiryInput = screen.getByLabelText(/expiration date & time/i);
    fireEvent.change(expiryInput, { target: { value: '2026-12-25T12:00' } });

    // Save changes
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('gh-repo', expect.stringContaining('2026-12-25'));
    });
  });

  it('opens delete confirmation modal and permanently deletes link', async () => {
    const user = userEvent.setup();
    const deleteSpy = vi.spyOn(apiClient, 'deleteUrl').mockResolvedValueOnce();

    renderDashboard();

    expect(await screen.findByText('/docs-2026')).toBeInTheDocument();

    // Open delete modal for docs-2026
    const deleteBtn = screen.getByRole('button', { name: /delete link docs-2026/i });
    await user.click(deleteBtn);

    // Modal is opened
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Delete Short Link')).toBeInTheDocument();
    expect(within(dialog).getByText(/\/docs-2026/)).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = within(dialog).getByRole('button', { name: 'Delete Link' });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('docs-2026');
    });
  });

  it('filters table rows based on search input', async () => {
    const user = userEvent.setup();
    renderDashboard();

    expect(await screen.findByText('/gh-repo')).toBeInTheDocument();
    expect(screen.getByText('/docs-2026')).toBeInTheDocument();

    // Type in search query
    const searchInput = screen.getByLabelText(/search links/i);
    await user.type(searchInput, 'github');

    await waitFor(() => {
      expect(screen.getByText('/gh-repo')).toBeInTheDocument();
      expect(screen.queryByText('/docs-2026')).not.toBeInTheDocument();
      expect(screen.queryByText('/expired-demo')).not.toBeInTheDocument();
    });

    // Clear search
    const clearBtn = screen.getByRole('button', { name: /clear/i });
    await user.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText('/docs-2026')).toBeInTheDocument();
    });
  });

  it('displays empty state when no links match search query', async () => {
    const user = userEvent.setup();
    renderDashboard();

    expect(await screen.findByText('/gh-repo')).toBeInTheDocument();

    const searchInput = screen.getByLabelText(/search links/i);
    await user.type(searchInput, 'nonexistent-query-xyz');

    await waitFor(() => {
      expect(screen.getByText(/no matching links found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
    });
  });

  it('displays polished empty state when link collection is empty', async () => {
    apiClient._resetStore([]);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/no short links yet/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /shorten a link/i })).toBeInTheDocument();
    });
  });
});
