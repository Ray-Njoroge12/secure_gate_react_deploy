import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithAuth } from '../../../test-utils';
import AuditLogs from '../../../pages/admin/AuditLogs';

// Register mocks — CRA's resetMocks:true clears mockResolvedValue before each test,
// so we re-establish them in beforeEach below
jest.mock('../../../services/adminService');
jest.mock('../../../contexts/ToastContext', () => {
  const toast = { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() };
  return {
    __esModule: true,
    useToast: () => ({ toast }),
  };
});
jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../../components/ui', () => {
  const Card = ({ children }) => <div>{children}</div>;
  Card.Content = ({ children }) => <div>{children}</div>;
  return {
    __esModule: true,
    Card,
    Button: ({ children, onClick, disabled, ...rest }) => (
      <button onClick={onClick} disabled={disabled} {...rest}>{children}</button>
    ),
    Badge: ({ children, variant }) => <span data-variant={variant}>{children}</span>,
    Skeleton: ({ className }) => <div className={className} data-testid="skeleton" />,
  };
});

const { getAuditLogs } = require('../../../services/adminService');

const mockLogsResponse = {
  success: true,
  data: {
    logs: [{
      id: '1',
      created_at: '2026-03-09T10:00:00Z',
      user_email: 'a@b.com',
      action: 'visitor.check_in',
      resource: 'visitor:123',
      ip_address: '1.2.3.4',
      outcome: 'success'
    }],
    total: 1,
    page: 1,
    per_page: 20
  }
};

const defaultAuth = { user: { id: '1', role: 'admin', estate_id: '1' } };

beforeEach(() => {
  getAuditLogs.mockResolvedValue(mockLogsResponse);
});

describe('AuditLogs', () => {
  test('renders audit log table', async () => {
    const { container } = renderWithAuth(<AuditLogs />, { auth: defaultAuth });
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    }, { timeout: 3000 });
    // eslint-disable-next-line testing-library/no-container
    const tableText = container.querySelector('table')?.textContent || '';
    expect(tableText).toContain('a@b.com');
    expect(tableText).toContain('1.2.3.4');
    expect(tableText).toContain('visitor:123');
  });

  test('renders date range filters', async () => {
    renderWithAuth(<AuditLogs />, { auth: defaultAuth });
    await waitFor(() => screen.getByLabelText(/date from/i));
    expect(screen.getByLabelText(/date to/i)).toBeInTheDocument();
  });

  test('renders CSV export button', async () => {
    renderWithAuth(<AuditLogs />, { auth: defaultAuth });
    await waitFor(() => screen.getByRole('button', { name: /export csv/i }));
  });

  test('renders action type filter', async () => {
    renderWithAuth(<AuditLogs />, { auth: defaultAuth });
    await waitFor(() => screen.getByLabelText(/action/i));
  });
});
