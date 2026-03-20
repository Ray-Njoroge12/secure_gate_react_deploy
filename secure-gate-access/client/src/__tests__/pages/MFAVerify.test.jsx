import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MFAVerify from '../../pages/MFAVerify.jsx';

// Mock react-router-dom navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    state: { mfaSessionId: 'test-session-123', userId: 42, username: 'testuser' },
    pathname: '/mfa-verify'
  }),
}));

// Mock AuthContext
const mockCompleteMfa = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ completeMfa: mockCompleteMfa }),
}));

// Mock apiClient
jest.mock('../../utils/apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock Button component
jest.mock('../../components/ui/Button', () => {
  const Button = ({ children, onClick, type, disabled, ...rest }) => (
    <button type={type || 'button'} onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  );
  Button.displayName = 'Button';
  return Button;
});

import api from '../../utils/apiClient';

describe('MFAVerify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderMFAVerify = () =>
    render(
      <MemoryRouter initialEntries={['/mfa-verify']}>
        <MFAVerify />
      </MemoryRouter>
    );

  it('renders the MFA verification form', () => {
    renderMFAVerify();
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
  });

  it('calls completeMfa with user object on successful verification', async () => {
    const mockUser = { id: 1, role: 'resident', name: 'Test User' };
    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: { user: mockUser },
      },
    });

    const user = userEvent.setup();
    renderMFAVerify();

    const input = screen.getByLabelText(/Verification Code/i);
    await user.type(input, '123456');

    const submitButton = screen.getByText('Verify Code');
    await user.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/mfa/verify', {
        mfaSessionId: 'test-session-123',
        token: '123456',
        useBackupCode: false,
      });
      expect(mockCompleteMfa).toHaveBeenCalledWith(mockUser);
    });
  });

  it('navigates to /dashboard/resident after successful verification for resident role', async () => {
    const mockUser = { id: 1, role: 'resident', name: 'Test User' };
    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: { user: mockUser },
      },
    });

    const user = userEvent.setup();
    renderMFAVerify();

    const input = screen.getByLabelText(/Verification Code/i);
    await user.type(input, '123456');
    await user.click(screen.getByText('Verify Code'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/resident');
    });
  });

  it('navigates to /dashboard/admin for admin role', async () => {
    const mockUser = { id: 2, role: 'admin', name: 'Admin User' };
    api.post.mockResolvedValueOnce({
      data: { success: true, data: { user: mockUser } },
    });

    const user = userEvent.setup();
    renderMFAVerify();

    const input = screen.getByLabelText(/Verification Code/i);
    await user.type(input, '123456');
    await user.click(screen.getByText('Verify Code'));

    await waitFor(() => {
      expect(mockCompleteMfa).toHaveBeenCalledWith(mockUser);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin');
    });
  });

  it('navigates to /dashboard/guard for guard role', async () => {
    const mockUser = { id: 3, role: 'guard', name: 'Guard User' };
    api.post.mockResolvedValueOnce({
      data: { success: true, data: { user: mockUser } },
    });

    const user = userEvent.setup();
    renderMFAVerify();

    const input = screen.getByLabelText(/Verification Code/i);
    await user.type(input, '123456');
    await user.click(screen.getByText('Verify Code'));

    await waitFor(() => {
      expect(mockCompleteMfa).toHaveBeenCalledWith(mockUser);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/guard');
    });
  });

  it('does NOT call completeMfa when api returns no user', async () => {
    api.post.mockResolvedValueOnce({
      data: { success: true, data: {} },
    });

    const user = userEvent.setup();
    renderMFAVerify();

    const input = screen.getByLabelText(/Verification Code/i);
    await user.type(input, '123456');
    await user.click(screen.getByText('Verify Code'));

    await waitFor(() => {
      expect(mockCompleteMfa).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows error message on failed verification', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { message: 'Invalid code' } },
    });

    const user = userEvent.setup();
    renderMFAVerify();

    const input = screen.getByLabelText(/Verification Code/i);
    await user.type(input, '999999');
    await user.click(screen.getByText('Verify Code'));

    await waitFor(() => {
      expect(screen.getByText('Invalid code')).toBeInTheDocument();
      expect(mockCompleteMfa).not.toHaveBeenCalled();
    });
  });
});
