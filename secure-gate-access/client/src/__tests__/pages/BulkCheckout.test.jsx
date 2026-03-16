import React from 'react';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import { rest } from 'msw';
import { server } from '../../mocks/server';
import { renderWithAuth } from '../../test-utils';
import BulkCheckout from '../../pages/guard/BulkCheckout';

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
  SENSITIVE_OPERATIONS: { BULK_CHECKOUT: 'bulk_checkout' },
}));
jest.mock('../../components/common/ConfirmationDialog', () => ({
  __esModule: true,
  useConfirmation: () => ({
    confirm: jest.fn().mockResolvedValue(true),
    dialogProps: {},
    Dialog: () => null,
  }),
}));
jest.mock('../../hooks/useOnlineStatus', () => ({ __esModule: true, default: () => true }));
jest.mock('../../components/common/OfflineBanner', () => ({ __esModule: true, default: () => null }));
jest.mock('../../hooks/usePullToRefresh', () => ({
  __esModule: true,
  default: () => ({ PullToRefreshIndicator: () => null, isRefreshing: false }),
}));
jest.mock('../../components/ui', () => {
  const Card = ({ children }) => <div>{children}</div>;
  Card.Header = ({ children }) => <div>{children}</div>;
  Card.Content = ({ children }) => <div>{children}</div>;
  return {
    __esModule: true, Card,
    Button: ({ children, onClick, disabled, ...rest }) => (
      <button onClick={onClick} disabled={disabled} {...rest}>{children}</button>
    ),
    Badge: ({ children }) => <span>{children}</span>,
    Skeleton: () => null,
    EmptyState: ({ message }) => <div>{message}</div>,
  };
});
jest.mock('../../components/PageHeader', () => ({
  __esModule: true,
  default: ({ title, children }) => <div><h1>{title}</h1>{children}</div>,
}));

const mockVisitors = [
  { id: 'v1', name: 'John Doe', phone: '+254712345678', status: 'CHECKED_IN', check_in: '2026-03-09T08:00:00Z' },
  { id: 'v2', name: 'Jane Smith', phone: '+254712345679', status: 'CHECKED_IN', check_in: '2026-03-09T09:00:00Z' },
];

const defaultAuth = { user: { id: 'g1', role: 'guard', estate_id: '1' } };

let bulkOpsCalls = [];

beforeEach(() => {
  bulkOpsCalls = [];
  // Override the default MSW handler which returns a bare array (not { success, data })
  server.use(
    rest.get('*/api/visitors/active', (req, res, ctx) =>
      res(ctx.status(200), ctx.json({ success: true, data: mockVisitors }))
    ),
    rest.post('*/api/bulk-operations/execute', async (req, res, ctx) => {
      const body = await req.json();
      bulkOpsCalls.push(body);
      return res(ctx.status(200), ctx.json({
        success: true,
        data: {
          results: {
            success: [{ id: 'v1' }, { id: 'v2' }],
            failed: [],
            skipped: []
          }
        }
      }));
    })
  );
});

describe('BulkCheckout', () => {
  test('calls single bulk endpoint instead of N individual endpoints', async () => {
    await act(async () => {
      renderWithAuth(<BulkCheckout />, { auth: defaultAuth });
    });

    // Wait for visitors to load — component renders mobile+desktop views (duplicates)
    await waitFor(() => {
      expect(screen.getAllByLabelText(/select john doe/i).length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    // Select all visitors
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
    fireEvent.click(selectAllCheckbox);

    // Click checkout button
    const checkoutBtn = screen.getByRole('button', { name: /checkout selected/i });
    await act(async () => {
      fireEvent.click(checkoutBtn);
    });

    // Verify bulk endpoint was called with correct payload
    await waitFor(() => {
      expect(bulkOpsCalls.length).toBeGreaterThan(0);
      expect(bulkOpsCalls[0].operationType).toBe('checkout_visitors');
      expect(bulkOpsCalls[0].itemIds).toEqual(expect.arrayContaining(['v1', 'v2']));
    });
  });
});
