import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute } from '../ProtectedRoute';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

const buildContextValue = (overrides: Partial<ReturnType<typeof useAuth>> = {}) => ({
  user: null,
  loading: false,
  login: vi.fn(),
  signup: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  requestPasswordReset: vi.fn(),
  completePasswordReset: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  ...overrides,
}) as ReturnType<typeof useAuth>;

const renderProtectedRoute = () =>
  render(
    <MemoryRouter
      initialEntries={['/vault']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/vault"
          element={
            <ProtectedRoute>
              <div>Secret Area</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ProtectedRoute', () => {
  afterEach(() => {
    mockedUseAuth.mockReset();
    vi.clearAllMocks();
  });

  it('shows a loading indicator while authentication resolves', () => {
    mockedUseAuth.mockReturnValue(buildContextValue({ loading: true }));

    const { container } = renderProtectedRoute();

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('redirects to the login route when no user is present', () => {
    mockedUseAuth.mockReturnValue(buildContextValue({ user: null, loading: false }));

    renderProtectedRoute();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders protected children when a user is authenticated', () => {
    mockedUseAuth.mockReturnValue(
      buildContextValue({
        user: { id: 'user-123', email: 'user@example.com', name: 'Test User' },
      }),
    );

    renderProtectedRoute();

    expect(screen.getByText('Secret Area')).toBeInTheDocument();
  });
});
