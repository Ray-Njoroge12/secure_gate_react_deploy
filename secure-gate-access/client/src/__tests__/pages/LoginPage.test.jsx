import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../../pages/Login.jsx';
import { renderWithAuth } from '../../test-utils';
import { __mockHandlers as errorHandlers } from '../../contexts/ErrorContext.jsx';
import api from '../../utils/apiClient';

jest.mock('../../contexts/ErrorContext.jsx', () => {
  const mockErrorContext = {
    logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
    errorQueueService: { addError: jest.fn(), clearErrors: jest.fn() }
  };
  
  const handlers = {
    handleError: jest.fn(),
    handleSuccess: jest.fn(),
    handleWarning: jest.fn(),
    clearAllErrors: jest.fn()
  };

  return {
    __esModule: true,
    ErrorProvider: ({ children }) => children,
    useError: () => handlers,
    __mockHandlers: handlers,
    ...mockErrorContext
  };
});

jest.mock('../../utils/apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn()
  }
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.post.mockReset();
  });

  test('validates email and password on blur', async () => {
    const user = userEvent.setup();

    renderWithAuth(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login', auth: { isAuthenticated: false, user: null } }
    );

    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');

    await user.click(emailInput);
    await user.tab();

    expect(screen.getByText('Email is required')).toBeInTheDocument();

    await user.click(passwordInput);
    await user.tab();

    expect(screen.getByText('Password is required')).toBeInTheDocument();

    await user.clear(emailInput);
    await user.type(emailInput, 'invalid');
    await user.tab();

    expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
  });

  test('successful login redirects to role dashboard after delay', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const login = jest.fn().mockResolvedValue({ user: { role: 'resident' } });

    renderWithAuth(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard/resident" element={<div>Resident Dashboard</div>} />
      </Routes>,
      { route: '/login', auth: { login, isAuthenticated: false, user: null } }
    );

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');

    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(login).toHaveBeenCalledWith('test@example.com', 'password123', false);
    expect(errorHandlers.handleSuccess).toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    expect(screen.getByText('Resident Dashboard')).toBeInTheDocument();

    jest.useRealTimers();
  });

  test('when MFA is required, redirects to /mfa/verify', async () => {
    const login = jest.fn().mockResolvedValue({
      mfaRequired: true,
      userId: 'u1',
      username: 'test@example.com'
    });

    const user = userEvent.setup();

    renderWithAuth(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/mfa/verify" element={<div>MFA Verify</div>} />
      </Routes>,
      { route: '/login', auth: { login, isAuthenticated: false, user: null } }
    );

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');

    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('MFA Verify')).toBeInTheDocument();
  });

  test('login auth error is shown inline in form', async () => {
    const login = jest.fn().mockRejectedValue({ message: 'Invalid credentials', code: 'UNAUTHORIZED', status: 401 });

    const user = userEvent.setup();

    renderWithAuth(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login', auth: { login, isAuthenticated: false, user: null } }
    );

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');

    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(login).toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(errorHandlers.handleError).not.toHaveBeenCalled();
  });

  test('login message-based auth error is shown inline in form', async () => {
    const login = jest.fn().mockRejectedValue(new Error('Account locked. Contact admin.'));

    const user = userEvent.setup();

    renderWithAuth(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login', auth: { login, isAuthenticated: false, user: null } }
    );

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');

    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(login).toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent('Account locked. Contact admin.');
    expect(errorHandlers.handleError).not.toHaveBeenCalled();
  });

  test('rate limited login shows inline countdown', async () => {
    jest.useFakeTimers();
    const login = jest.fn().mockRejectedValue({
      message: 'Too many attempts',
      code: 'RATE_LIMITED',
      status: 429,
      retryAfter: 12
    });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderWithAuth(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login', auth: { login, isAuthenticated: false, user: null } }
    );

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Too many attempts')).toBeInTheDocument();
    expect(screen.getByText('Try again in 12s.')).toBeInTheDocument();
    expect(errorHandlers.handleError).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText('Try again in 11s.')).toBeInTheDocument();
    jest.useRealTimers();
  });

  test('login server error still uses global error handler', async () => {
    const login = jest.fn().mockRejectedValue({ message: 'Server error', code: 'SERVER_ERROR', status: 500 });

    const user = userEvent.setup();

    renderWithAuth(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login', auth: { login, isAuthenticated: false, user: null } }
    );

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');

    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(login).toHaveBeenCalled();
    expect(errorHandlers.handleError).toHaveBeenCalled();
  });

  test('forgot password flow calls API and returns to sign in', async () => {
    const user = userEvent.setup();

    api.post.mockResolvedValueOnce({
      data: { message: 'ok' }
    });

    renderWithAuth(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<LoginPage />} />
      </Routes>,
      { route: '/login', auth: { isAuthenticated: false, user: null } }
    );

    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));

    expect(screen.getByText('Reset Password')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/auth/forgot-password',
        { email: 'test@example.com' }
      );
    });

    await waitFor(() => {
      expect(errorHandlers.handleSuccess).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    });
  });

  test('forgot password API error is shown inline', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValueOnce({
      response: {
        data: { message: 'Reset request failed' }
      }
    });

    renderWithAuth(
      <Routes>
        <Route path="/forgot-password" element={<LoginPage />} />
      </Routes>,
      { route: '/forgot-password', auth: { isAuthenticated: false, user: null } }
    );

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Reset request failed');
    expect(errorHandlers.handleError).not.toHaveBeenCalled();
  });
});
