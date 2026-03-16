import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../../pages/Login.jsx';
import { renderWithAuth } from '../../test-utils';
import { __mockHandlers as errorHandlers } from '../../contexts/ErrorContext.jsx';

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

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  test('login error is shown inline in the form', async () => {
    const login = jest.fn().mockRejectedValue(new Error('Invalid credentials'));

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
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(errorHandlers.handleError).not.toHaveBeenCalled();
  });

  test('forgot password flow calls API and returns to sign in', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'ok' })
      });

    renderWithAuth(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login', auth: { isAuthenticated: false, user: null } }
    );

    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));

    expect(screen.getByText('Reset Password')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/forgot-password'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include'
        })
      );
    });

    await waitFor(() => {
      expect(errorHandlers.handleSuccess).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    });

    fetchSpy.mockRestore();
    jest.useRealTimers();
  });
});
