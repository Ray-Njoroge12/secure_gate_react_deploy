import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { server } from '../../mocks/server';
import { renderWithAuth } from '../../test-utils';
import IntegrationsHub from '../../pages/admin/IntegrationsHub';

// Mock ToastContext
const mockToast = { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() };
jest.mock('../../contexts/ToastContext', () => ({
  __esModule: true,
  useToast: () => ({ toast: mockToast }),
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

// Mock logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

// Mock useModalAccessibility
jest.mock('../../hooks/useModalAccessibility', () => ({
  __esModule: true,
  default: () => ({ modalRef: { current: null } }),
}));

// Mock CSS import
jest.mock('../../pages/admin/IntegrationsHub.css', () => ({}));

// Mock Button
jest.mock('../../components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick, disabled, type, className, ...rest }) => (
    <button onClick={onClick} disabled={disabled} type={type} className={className} {...rest}>
      {children}
    </button>
  ),
}));

const defaultAuth = { user: { id: '1', role: 'admin', estate_id: '1' } };

beforeEach(() => {
  jest.clearAllMocks();
  server.use(
    rest.get('*/api/admin/webhooks', (req, res, ctx) =>
      res(ctx.status(200), ctx.json({ data: [] }))
    ),
    rest.get('*/api/admin/automations', (req, res, ctx) =>
      res(ctx.status(200), ctx.json({ data: [] }))
    ),
    rest.get('*/api/admin/api-keys', (req, res, ctx) =>
      res(ctx.status(200), ctx.json({ data: [] }))
    )
  );
});

describe('IntegrationsHub', () => {
  test('does not use window.alert or window.confirm anywhere', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
    renderWithAuth(<IntegrationsHub />, { auth: defaultAuth });
    await waitFor(() => screen.getByText(/integrations hub/i));
    expect(alertSpy).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  test('uses logger.error instead of console.error on failure', async () => {
    const loggerMod = require('../../utils/logger').default;
    server.use(
      rest.get('*/api/admin/webhooks', (req, res) =>
        res.networkError('Failed to connect')
      )
    );
    // Suppress MSW's own console.error for network errors
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderWithAuth(<IntegrationsHub />, { auth: defaultAuth });
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    // Our code should use logger, not console.error
    expect(loggerMod.error).toHaveBeenCalledWith('IntegrationsHub:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  test('renders the integrations hub heading', async () => {
    renderWithAuth(<IntegrationsHub />, { auth: defaultAuth });
    await waitFor(() => screen.getByText(/integrations hub/i));
  });
});
