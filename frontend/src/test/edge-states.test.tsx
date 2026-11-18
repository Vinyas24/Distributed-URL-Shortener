import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ExpiredPage } from '@/pages/ExpiredPage';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const FaultyComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    const error = new Error('Simulated runtime failure in child component');
    (error as unknown as { traceId?: string }).traceId = 'tr_simulated_999';
    throw error;
  }
  return <div>Component rendered successfully</div>;
};

describe('Edge States, Error Boundary & Offline Banner (Phase E)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Not Found Page (404)', () => {
    it('renders 404 illustration, title, and navigation buttons', () => {
      render(
        <MemoryRouter initialEntries={['/not-existing-path']}>
          <NotFoundPage />
        </MemoryRouter>
      );

      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to home/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
    });
  });

  describe('Expired Link Page', () => {
    it('renders expired notice without code if none specified', () => {
      render(
        <MemoryRouter initialEntries={['/expired']}>
          <ExpiredPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /link has expired/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /shorten new link/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
    });

    it('renders specific expired code when provided in query string', () => {
      render(
        <MemoryRouter initialEntries={['/expired?code=black-friday-2025']}>
          <ExpiredPage />
        </MemoryRouter>
      );

      expect(screen.getByText('/black-friday-2025')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /link has expired/i })).toBeInTheDocument();
    });
  });

  describe('Offline Banner', () => {
    it('shows banner when offline event fires and restores when online', async () => {
      render(<OfflineBanner />);

      // Initially online - banner not in document
      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      // Trigger offline event
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      // Banner appears
      expect(await screen.findByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/you are currently offline/i)).toBeInTheDocument();

      // Trigger online event
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      // Shows restored notification
      await waitFor(() => {
        expect(screen.getByText(/connection restored/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundary with Trace ID', () => {
    it('catches render errors and displays diagnostic trace ID and recovery actions', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();
      const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

      render(
        <ErrorBoundary>
          <FaultyComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error boundary view rendered
      expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
      expect(screen.getByText('tr_simulated_999')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /return to home/i })).toBeInTheDocument();

      // Test copy trace ID
      const copyBtn = screen.getByRole('button', { name: /copy trace id/i });
      await user.click(copyBtn);
      expect(writeTextSpy).toHaveBeenCalledWith('tr_simulated_999');

      consoleErrorSpy.mockRestore();
    });

    it('renders normal children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <FaultyComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
    });
  });
});
