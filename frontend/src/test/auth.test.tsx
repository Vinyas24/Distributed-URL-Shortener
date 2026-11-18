import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { ToastProvider } from '@/components/ui';

const TestApp: React.FC<{ initialEntries?: string[] }> = ({ initialEntries = ['/login'] }) => {
  return (
    <AuthProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>
                    <h2>Protected Dashboard View</h2>
                    <LogoutButton />
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </AuthProvider>
  );
};

const LogoutButton: React.FC = () => {
  const { logout, user } = useAuth();
  return (
    <div>
      <span>Logged in as: {user?.name}</span>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
};

describe('Authentication & Protected Routes (Phase C)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders login screen with API key input and actions', () => {
    render(<TestApp initialEntries={['/login']} />);

    expect(screen.getByLabelText(/backend api key/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /authenticate & continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fill demo api key/i })).toBeInTheDocument();
  });

  it('validates API key length (< 8 characters rejected)', async () => {
    const user = userEvent.setup();
    render(<TestApp initialEntries={['/login']} />);

    const input = screen.getByLabelText(/backend api key/i);
    await user.type(input, 'short');

    const submitBtn = screen.getByRole('button', { name: /authenticate & continue/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('fills demo API key on clicking demo button', async () => {
    const user = userEvent.setup();
    render(<TestApp initialEntries={['/login']} />);

    const demoBtn = screen.getByRole('button', { name: /fill demo api key/i });
    await user.click(demoBtn);

    const input = screen.getByLabelText(/backend api key/i) as HTMLInputElement;
    expect(input.value).toContain('calm_live_demo_key_99x');
  });

  it('authenticates user and redirects to protected dashboard', async () => {
    const user = userEvent.setup();
    render(<TestApp initialEntries={['/login']} />);

    const demoBtn = screen.getByRole('button', { name: /fill demo api key/i });
    await user.click(demoBtn);

    const submitBtn = screen.getByRole('button', { name: /authenticate & continue/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Protected Dashboard View')).toBeInTheDocument();
      expect(screen.getByText(/Logged in as: Demo Engineer/i)).toBeInTheDocument();
    });

    // RULE 5: Token must NOT be stored in localStorage or sessionStorage
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('apiKey')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();
  });

  it('redirects unauthenticated users trying to access protected dashboard', async () => {
    render(<TestApp initialEntries={['/dashboard']} />);

    await waitFor(() => {
      // Must be redirected to /login
      expect(screen.getByLabelText(/backend api key/i)).toBeInTheDocument();
      expect(screen.queryByText('Protected Dashboard View')).not.toBeInTheDocument();
    });
  });

  it('allows user to log out and protects route again', async () => {
    const user = userEvent.setup();
    render(<TestApp initialEntries={['/login']} />);

    // Log in
    await user.click(screen.getByRole('button', { name: /fill demo api key/i }));
    await user.click(screen.getByRole('button', { name: /authenticate & continue/i }));

    expect(await screen.findByText('Protected Dashboard View')).toBeInTheDocument();

    // Log out
    const logoutBtn = screen.getByRole('button', { name: /sign out/i });
    await user.click(logoutBtn);

    // Protected view unmounts
    await waitFor(() => {
      expect(screen.queryByText('Protected Dashboard View')).not.toBeInTheDocument();
    });
  });
});
