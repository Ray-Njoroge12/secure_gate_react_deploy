import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { server } from '../../mocks/server';
import { renderWithAuth } from '../../test-utils';
import ResidentApprovalsPanel from '../../pages/resident/ResidentApprovalsPanel';

// Mock useWebSocket — track calls while returning expected shape
const mockAddEventListener = jest.fn(() => () => {});
const mockUseWebSocketCalls = [];
jest.mock('../../hooks/useWebSocket', () => ({
  __esModule: true,
  default: (opts) => {
    mockUseWebSocketCalls.push(opts);
    return { addEventListener: mockAddEventListener };
  },
}));

// Mock ToastContext
const mockToast = { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() };
jest.mock('../../contexts/ToastContext', () => ({
  __esModule: true,
  useToast: () => ({ toast: mockToast }),
}));

// Mock pushNotificationService
jest.mock('../../services/pushNotificationService', () => ({
  __esModule: true,
  default: {
    getPermissionStatus: jest.fn(() => 'default'),
    subscribe: jest.fn().mockResolvedValue({}),
    isSupported: true,
  },
}));
const mockPushService = require('../../services/pushNotificationService').default;

// Mock UI components to simplify rendering
jest.mock('../../components/ui', () => {
  const Card = ({ children, className }) => <div className={className}>{children}</div>;
  Card.Content = ({ children, className }) => <div className={className}>{children}</div>;
  return {
    __esModule: true,
    Card,
    Button: ({ children, onClick, disabled, variant, className }) => (
      <button onClick={onClick} disabled={disabled} className={className} data-variant={variant}>
        {children}
      </button>
    ),
    Badge: ({ children }) => <span>{children}</span>,
    ErrorDisplay: ({ message }) => <div role="alert">{message}</div>,
    SuccessDisplay: ({ message }) => <div>{message}</div>,
    Icon: ({ name }) => <span>{name}</span>,
  };
});

// Mock Modal
jest.mock('../../components/ui/Modal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose: _onClose, children, title }) => {
    if (!isOpen) return null;
    return (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    );
  },
}));

const mockApproval = {
  id: '123',
  name: 'John Doe',
  phone: '+254712345678',
  purpose: 'Delivery',
  approval_requested_at: new Date().toISOString(),
  status: 'pending_approval'
};

const defaultAuth = { user: { id: '1', role: 'resident', estate_id: '1' } };

beforeEach(() => {
  jest.clearAllMocks();
  mockUseWebSocketCalls.length = 0;
  // Restore mocks cleared by clearAllMocks — subscribe must return a thenable
  mockPushService.getPermissionStatus.mockReturnValue('default');
  mockPushService.subscribe.mockResolvedValue({});

  // Set up MSW handler for pending approvals
  server.use(
    rest.get('*/api/visitors/pending-approvals', (req, res, ctx) => {
      return res(ctx.status(200), ctx.json({ data: [mockApproval] }));
    })
  );
});

describe('ResidentApprovalsPanel', () => {
  // Task 2 - Rejection modal tests
  test('shows rejection modal instead of window.prompt when Decline is clicked', async () => {
    const promptSpy = jest.spyOn(window, 'prompt');
    renderWithAuth(<ResidentApprovalsPanel />, { auth: defaultAuth });
    await waitFor(() => screen.getByText('John Doe'));
    fireEvent.click(screen.getByRole('button', { name: /decline/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(promptSpy).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  test('submits rejection with reason from modal', async () => {
    let capturedBody = null;
    server.use(
      rest.get('*/api/visitors/pending-approvals', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ data: [mockApproval] }));
      }),
      rest.post('*/api/visitors/123/reject', async (req, res, ctx) => {
        capturedBody = await req.json();
        return res(ctx.status(200), ctx.json({ success: true }));
      })
    );

    renderWithAuth(<ResidentApprovalsPanel />, { auth: defaultAuth });
    await waitFor(() => screen.getByText('John Doe'));
    fireEvent.click(screen.getByRole('button', { name: /decline/i }));
    await userEvent.type(screen.getByLabelText(/rejection reason/i), 'Not expecting this person');
    fireEvent.click(screen.getByRole('button', { name: /confirm decline/i }));
    await waitFor(() => {
      expect(capturedBody).toBeTruthy();
      expect(capturedBody.reason).toBe('Not expecting this person');
    });
  });

  // Task 3 - WebSocket subscription test
  test('connects to WebSocket with subscribeVisitors: true', async () => {
    renderWithAuth(<ResidentApprovalsPanel />, { auth: defaultAuth });
    await waitFor(() => {
      const wsCall = mockUseWebSocketCalls.find(c => c !== undefined);
      expect(wsCall).toBeDefined();
      expect(wsCall.subscribeVisitors).toBe(true);
    });
  });

  // Task 4 - Push notification tests
  test('subscribes to push notifications on mount when permission is granted', async () => {
    mockPushService.getPermissionStatus.mockReturnValue('granted');
    renderWithAuth(<ResidentApprovalsPanel />, { auth: defaultAuth });
    await waitFor(() => expect(mockPushService.subscribe).toHaveBeenCalled());
  });

  test('does not subscribe to push when permission is not granted', async () => {
    mockPushService.getPermissionStatus.mockReturnValue('denied');
    renderWithAuth(<ResidentApprovalsPanel />, { auth: defaultAuth });
    await waitFor(() => screen.getByText('John Doe'));
    expect(mockPushService.subscribe).not.toHaveBeenCalled();
  });
});
