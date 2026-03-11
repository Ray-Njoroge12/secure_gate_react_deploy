import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { server } from '../../mocks/server';
import { renderWithAuth } from '../../test-utils';
import SuperAdminDashboard from '../../pages/admin/SuperAdminDashboard';

// Mock logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

// Mock ConfirmationDialog
jest.mock('../../components/common/ConfirmationDialog', () => ({
  __esModule: true,
  useConfirmation: () => ({
    confirm: jest.fn().mockResolvedValue(true),
    dialogProps: {},
    Dialog: () => null,
  }),
}));

// Mock child components to simplify
jest.mock('../../components/modals/AddEstateModal', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../components/modals/DecommissionEstateModal', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock UI components
jest.mock('../../components/ui/GradientButton', () => ({
  __esModule: true,
  default: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
}));
jest.mock('../../components/ui', () => ({
  __esModule: true,
  GradientCard: ({ children, className }) => <div className={className}>{children}</div>,
}));
jest.mock('../../components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, disabled, ...rest }) => (
    <button onClick={onClick} disabled={disabled} {...rest}>{children}</button>
  ),
}));
jest.mock('../../components/ui/Icon', () => ({
  __esModule: true,
  default: ({ name }) => <span data-icon={name} />,
}));

// Mock apiClient
jest.mock('../../utils/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: { success: true, data: { mfaEnabled: false, mfaRequired: false } } }),
  },
}));

const defaultAuth = { user: { id: '1', role: 'super_admin', estate_id: '1' } };

beforeEach(() => {
  jest.clearAllMocks();
  server.use(
    rest.get('*/api/admin/super-admin/overview', (req, res, ctx) =>
      res(ctx.status(200), ctx.json({
        success: true,
        data: {
          stats: { totalEstates: 5, totalUsers: 100, totalVisitors: 500, totalIncidents: 3 },
          systemHealth: true
        }
      }))
    ),
    rest.get('*/api/admin/super-admin/estates', (req, res, ctx) =>
      res(ctx.status(200), ctx.json({ success: true, data: [] }))
    )
  );
});

describe('SuperAdminDashboard', () => {
  test('does not call console.error on load failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    server.use(
      rest.get('*/api/admin/super-admin/overview', (req, res) =>
        res.networkError('Failed to connect')
      )
    );
    renderWithAuth(<SuperAdminDashboard />, { auth: defaultAuth });
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
    // Our code should NOT call console.error — only logger.error
    const ourCalls = consoleSpy.mock.calls.filter(
      ([msg]) => typeof msg === 'string' && msg.includes('Failed to load super admin')
    );
    expect(ourCalls).toHaveLength(0);
    consoleSpy.mockRestore();
  });

  test('uses logger.error on dashboard load failure', async () => {
    const loggerMod = require('../../utils/logger').default;
    jest.spyOn(console, 'error').mockImplementation(() => {});
    server.use(
      rest.get('*/api/admin/super-admin/overview', (req, res) =>
        res.networkError('Failed to connect')
      )
    );
    renderWithAuth(<SuperAdminDashboard />, { auth: defaultAuth });
    await waitFor(() => {
      expect(loggerMod.error).toHaveBeenCalledWith(
        'SuperAdmin: Failed to load dashboard data:',
        expect.any(Error)
      );
    });
    console.error.mockRestore();
  });

  test('renders platform overview heading', async () => {
    renderWithAuth(<SuperAdminDashboard />, { auth: defaultAuth });
    await waitFor(() => screen.getByRole('heading', { name: 'Platform Overview' }));
  });
});
