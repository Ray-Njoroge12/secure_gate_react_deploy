import React from 'react';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { server } from '../../mocks/server';
import { renderWithAuth } from '../../test-utils';
import ManualCheck from '../../pages/guard/ManualCheck';

// Mock dependencies with stable references
jest.mock('../../contexts/ErrorContext', () => {
  const handlers = { handleApiError: jest.fn(), handleError: jest.fn(), clearAllErrors: jest.fn() };
  return { __esModule: true, ErrorProvider: ({ children }) => children, useError: () => handlers };
});
jest.mock('../../contexts/LoadingContext', () => {
  const handlers = { setLoading: jest.fn(), isLoading: jest.fn(() => false) };
  return { __esModule: true, useLoading: () => handlers };
});
jest.mock('../../services/notificationService', () => ({
  __esModule: true,
  default: { success: jest.fn(), warning: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock('../../components/guard/MFAVerificationModal', () => ({
  __esModule: true,
  useMFAVerification: () => ({
    requestVerification: jest.fn().mockResolvedValue({ verified: true }),
    MFAModal: () => null,
  }),
  SENSITIVE_OPERATIONS: {},
}));
jest.mock('../../components/common/ConfirmationDialog', () => ({
  __esModule: true,
  useConfirmation: () => ({
    confirm: jest.fn().mockResolvedValue(true),
    dialogProps: {},
    Dialog: () => null,
  }),
}));
jest.mock('../../components/ui', () => {
  const Card = ({ children }) => <div>{children}</div>;
  Card.Header = ({ children }) => <div>{children}</div>;
  Card.Title = ({ children }) => <div>{children}</div>;
  Card.Content = ({ children }) => <div>{children}</div>;
  return {
    __esModule: true, Card,
    Button: ({ children, onClick, disabled, type, ...rest }) => (
      <button onClick={onClick} disabled={disabled} type={type} {...rest}>{children}</button>
    ),
    Badge: ({ children }) => <span>{children}</span>,
    Skeleton: () => null,
    PageHeader: ({ title, children }) => <div><h1>{title}</h1>{children}</div>,
    Icon: ({ name }) => <span data-icon={name} />,
    EmptyState: ({ message }) => <div>{message}</div>,
  };
});
jest.mock('../../components/guard/IncidentModal', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/statusColors', () => ({ getStatusChipClass: () => '' }));
jest.mock('../../services/visitorService', () => ({ verifyOtp: jest.fn() }));
jest.mock('../../hooks/useOnlineStatus', () => ({ __esModule: true, default: () => true }));
jest.mock('../../components/common/OfflineBanner', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/guardScanUtils', () => ({
  normalizeVisitorStatus: (s) => s,
  formatVisitorStatus: (s) => s,
  canVisitorCheckIn: () => true,
  canVisitorCheckOut: () => false,
}));
jest.mock('../../utils/appNavigation', () => ({ navigateTo: jest.fn() }));

const defaultAuth = { user: { id: 'g1', role: 'guard', estate_id: '1' } };

describe('ManualCheck OTP search', () => {
  test('sends ?search= query to server instead of fetching all visitors', async () => {
    let capturedSearchParam = null;

    server.use(
      rest.get('*/api/visitors', (req, res, ctx) => {
        capturedSearchParam = req.url.searchParams.get('search');
        return res(ctx.status(200), ctx.json({
          success: true,
          data: [{
            id: 'v1', name: 'OTP Visitor', phone: '+254712345678',
            status: 'OTP_SENT', check_in: null
          }]
        }));
      })
    );

    await act(async () => {
      renderWithAuth(<ManualCheck />, { auth: defaultAuth });
    });

    // Type a 6-digit OTP and submit search
    const searchInput = screen.getByPlaceholderText(/search|enter/i);
    await userEvent.type(searchInput, '123456');
    const searchBtn = screen.getByRole('button', { name: /search/i });
    await act(async () => {
      fireEvent.click(searchBtn);
    });

    // Verify the server received the search query
    await waitFor(() => {
      expect(capturedSearchParam).toBe('123456');
    });
  });

  test('sends ?search= for name queries too', async () => {
    let capturedSearchParam = null;

    server.use(
      rest.get('*/api/visitors', (req, res, ctx) => {
        capturedSearchParam = req.url.searchParams.get('search');
        return res(ctx.status(200), ctx.json({
          success: true,
          data: [{ id: 'v2', name: 'John Doe', phone: '+254712345678', status: 'APPROVED' }]
        }));
      })
    );

    await act(async () => {
      renderWithAuth(<ManualCheck />, { auth: defaultAuth });
    });

    const searchInput = screen.getByPlaceholderText(/search|enter/i);
    await userEvent.type(searchInput, 'John');
    const searchBtn = screen.getByRole('button', { name: /search/i });
    await act(async () => {
      fireEvent.click(searchBtn);
    });

    await waitFor(() => {
      expect(capturedSearchParam).toBe('John');
    });
  });
});
