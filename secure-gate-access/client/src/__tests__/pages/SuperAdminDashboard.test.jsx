import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { server } from '../../mocks/server';
import { renderWithAuth } from '../../test-utils';
import SuperAdminDashboard from '../../pages/admin/SuperAdminDashboard';
import api from '../../utils/apiClient';

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
    get: jest.fn(),
  },
}));

const defaultAuth = { user: { id: '1', role: 'super_admin', estate_id: '1' } };

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockImplementation((url) => {
    if (url.includes('/api/mfa/status')) {
      return Promise.resolve({ data: { success: true, data: { mfaEnabled: false, mfaRequired: false } } });
    }
    if (url.includes('/api/admin/super-admin/overview')) {
      return Promise.resolve({
        data: {
          success: true,
          data: {
            stats: { totalEstates: 5, totalUsers: 100, totalVisitors: 500, totalIncidents: 3 },
            systemHealth: true
          }
        }
      });
    }
    if (url.includes('/api/admin/super-admin/estates')) {
      return Promise.resolve({ data: { success: true, data: [] } });
    }
    return Promise.resolve({ data: { success: true, data: {} } });
  });
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
    api.get.mockImplementation((url) => {
      if (url.includes('/api/mfa/status')) {
        return Promise.resolve({ data: { success: true, data: { mfaEnabled: false, mfaRequired: false } } });
      }
      if (url.includes('/api/admin/super-admin/overview')) {
        return Promise.reject(new Error('Failed to connect'));
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
    renderWithAuth(<SuperAdminDashboard />, { auth: defaultAuth });
    await waitFor(() => {
      expect(screen.getByText(/unable to load platform overview/i)).toBeInTheDocument();
    });
    // Our code should NOT call console.error — only logger.error
    const ourCalls = consoleSpy.mock.calls.filter(
      ([msg]) => typeof msg === 'string' && msg.includes('Failed to load super admin')
    );
    expect(ourCalls).toHaveLength(0);
    consoleSpy.mockRestore();
  });

  test('handles overview failures without logger.error noise', async () => {
    const loggerMod = require('../../utils/logger').default;
    jest.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockImplementation((url) => {
      if (url.includes('/api/mfa/status')) {
        return Promise.resolve({ data: { success: true, data: { mfaEnabled: false, mfaRequired: false } } });
      }
      if (url.includes('/api/admin/super-admin/overview')) {
        return Promise.reject(new Error('Failed to connect'));
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
    renderWithAuth(<SuperAdminDashboard />, { auth: defaultAuth });
    await waitFor(() => {
      expect(screen.getByText(/unable to load platform overview/i)).toBeInTheDocument();
    });
    expect(loggerMod.error).not.toHaveBeenCalled();
    console.error.mockRestore();
  });

  test('renders platform overview heading', async () => {
    renderWithAuth(<SuperAdminDashboard />, { auth: defaultAuth });
    await waitFor(() => screen.getByRole('heading', { name: 'Platform Overview' }));
  });

  test('shows persistent MFA banner when overview endpoint requires MFA setup', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/mfa/status')) {
        return Promise.resolve({ data: { success: true, data: { mfaEnabled: false, mfaRequired: true } } });
      }
      if (url.includes('/api/admin/super-admin/overview')) {
        return Promise.reject({
          response: {
            status: 403,
            data: {
              code: 'MFA_SETUP_REQUIRED',
              message: 'MFA setup required'
            }
          }
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    renderWithAuth(<SuperAdminDashboard />, { auth: defaultAuth });

    await waitFor(() => {
      expect(screen.getByText('MFA setup required')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Complete MFA Setup' })).toBeInTheDocument();

    const overviewCalls = api.get.mock.calls.filter(([url]) => String(url).includes('/api/admin/super-admin/overview'));
    expect(overviewCalls).toHaveLength(1);
  });
});
