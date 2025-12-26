import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegistrationPage from '../../pages/Register.js';
import { renderWithRouter } from '../../test-utils';

jest.mock('utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

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

jest.mock('../../utils/phoneValidator.js', () => ({
  __esModule: true,
  default: {
    getErrorMessage: jest.fn(() => null),
    toInternational: jest.fn((phone) => `+254${String(phone).replace(/^0/, '')}`)
  }
}));

describe('RegistrationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders registration form with required fields', () => {
    renderWithRouter(
      <Routes>
        <Route path="/register" element={<RegistrationPage />} />
      </Routes>,
      { route: '/register' }
    );

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/residential area/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  test('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();

    renderWithRouter(
      <Routes>
        <Route path="/register" element={<RegistrationPage />} />
      </Routes>,
      { route: '/register' }
    );

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    });
  });

  test('successful registration redirects to login', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Registration successful' })
    });

    renderWithRouter(
      <Routes>
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { route: '/register' }
    );

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/residential area/i), 'Test Area');
    await user.type(screen.getByLabelText(/house number/i), 'A1');
    await user.type(screen.getByLabelText(/phone number/i), '0712345678');
    await user.type(screen.getByLabelText(/^password$/i), 'Password@123');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password@123');

    const checkbox = screen.getByLabelText(/i agree to the/i);
    await user.click(checkbox);

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/register'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Login Page')).toBeInTheDocument();

    fetchSpy.mockRestore();
    jest.useRealTimers();
  });

  test('password mismatch shows error indicator', async () => {
    const user = userEvent.setup();

    renderWithRouter(
      <Routes>
        <Route path="/register" element={<RegistrationPage />} />
      </Routes>,
      { route: '/register' }
    );

    await user.type(screen.getByLabelText(/^password$/i), 'Password@123');
    await user.type(screen.getByLabelText(/confirm password/i), 'Different@123');

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  test('password match shows success indicator', async () => {
    const user = userEvent.setup();

    renderWithRouter(
      <Routes>
        <Route path="/register" element={<RegistrationPage />} />
      </Routes>,
      { route: '/register' }
    );

    await user.type(screen.getByLabelText(/^password$/i), 'Password@123');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password@123');

    expect(screen.getByText(/passwords match/i)).toBeInTheDocument();
  });
});
