import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
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

jest.mock('../../utils/passwordValidator.js', () => ({
  __esModule: true,
  default: {
    getErrorMessage: jest.fn(() => null),
    calculateStrength: jest.fn(() => 3),
    isValid: jest.fn(() => true)
  }
}));

jest.mock('../../components/PasswordStrengthIndicator.jsx', () => () => <div>Password Strength</div>);
jest.mock('../../components/PasswordRequirements.jsx', () => () => <div>Password Requirements</div>);
jest.mock('../../components/QRCodeDisplay.jsx', () => () => <div>QR Code</div>);

jest.mock('../../layouts/AuthLayout.jsx', () => ({ children }) => <div>{children}</div>);

jest.mock('../../services/passService.js', () => ({
  completeInvite: jest.fn(),
  getBulkInvite: jest.fn(),
  visitorVerifyOtp: jest.fn(),
  resendVisitorOtp: jest.fn()
}));

jest.mock('../../utils/apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn()
  }
}));

// Mock fetch globally before any tests run
const mockFetch = jest.fn().mockImplementation((url) => {
  if (url.includes('/api/estates/available')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: { estates: [{ id: 1, name: 'Test Estate' }] } })
    });
  }
  if (url.includes('/api/auth/register')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ message: 'Registration successful' })
    });
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
  });
});

describe('RegistrationPage', () => {
  // Increase timeout for these tests since userEvent typing is slow
  jest.setTimeout(30000);

  beforeAll(() => {
    global.fetch = mockFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('renders registration form with required fields', () => {
    renderWithRouter(
      <Routes>
        <Route path="/register" element={<RegistrationPage />} />
      </Routes>,
      { route: '/register' }
    );

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/estate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/house number/i)).toBeInTheDocument();
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

  test('successful registration calls API with form data', async () => {
    const { fireEvent } = await import('@testing-library/react');

    renderWithRouter(
      <Routes>
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { route: '/register' }
    );

    // Use fireEvent for faster input
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/house number/i), { target: { value: 'A1' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '0712345678' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password@123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password@123' } });

    const estateSelect = screen.getByLabelText(/estate/i);
    await waitFor(() => {
      expect(estateSelect).not.toBeDisabled();
    });
    fireEvent.change(estateSelect, { target: { value: '1' } });

    // Check the privacy checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/register'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  // Note: Password indicator tests are slow due to userEvent typing simulation.
  // Using fireEvent for direct value changes instead of simulating real typing.
  test('password mismatch shows error indicator', async () => {
    const { fireEvent } = await import('@testing-library/react');

    renderWithRouter(
      <Routes>
        <Route path="/register" element={<RegistrationPage />} />
      </Routes>,
      { route: '/register' }
    );

    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);

    fireEvent.change(passwordInput, { target: { value: 'Password@123' } });
    fireEvent.change(confirmInput, { target: { value: 'Different@123' } });

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  test('password match shows success indicator', async () => {
    const { fireEvent } = await import('@testing-library/react');

    renderWithRouter(
      <Routes>
        <Route path="/register" element={<RegistrationPage />} />
      </Routes>,
      { route: '/register' }
    );

    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);

    fireEvent.change(passwordInput, { target: { value: 'Password@123' } });
    fireEvent.change(confirmInput, { target: { value: 'Password@123' } });

    await waitFor(() => {
      expect(screen.getByText(/passwords match/i)).toBeInTheDocument();
    });
  });
});
