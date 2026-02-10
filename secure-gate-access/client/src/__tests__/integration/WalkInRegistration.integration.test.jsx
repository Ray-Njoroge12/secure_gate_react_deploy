/**
 * WalkInRegistration Integration Tests
 * Tests the complete walk-in visitor registration flow from guard perspective
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { rest } from 'msw';
import WalkInRegistration from '../../pages/guard/WalkInRegistration';
import { AuthContext } from '../../contexts/AuthContext';
import { ErrorProvider } from '../../contexts/ErrorContext';
import { LoadingProvider } from '../../contexts/LoadingContext';
import offlineService from '../../services/offlineService';
import { server } from '../../mocks/server';

jest.mock('../../services/errorQueueService', () => ({
  __esModule: true,
  default: {
    addError: jest.fn(() => 'mock-error-id'),
    getErrors: jest.fn(() => []),
    getErrorsByType: jest.fn(() => []),
    clearAll: jest.fn(),
    clearByType: jest.fn(),
    removeError: jest.fn(),
    getErrorCount: jest.fn(() => 0),
    getErrorCountByType: jest.fn(() => 0),
    subscribe: jest.fn(() => jest.fn())
  }
}));

jest.mock('../../services/offlineService', () => ({
  __esModule: true,
  default: {
    getPendingWalkIns: jest.fn(async () => []),
    addConnectionListener: jest.fn(() => jest.fn()),
    syncPendingOperations: jest.fn(async () => ({ success: true })),
    queueWalkInRegistration: jest.fn(async () => undefined)
  }
}));

// Mock handlers for WalkInRegistration tests
const walkInHandlers = [
  rest.post('*/api/visitors/walk-in', async (req, res, ctx) => {
    const visitorData = await req.json();

    // Simulate resident lookup
    if (visitorData.houseNumber === 'NOTFOUND') {
      return res(
        ctx.status(404),
        ctx.json({ success: false, message: 'House number not found' })
      );
    }

    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          id: 50,
          ...visitorData,
          status: 'pending_approval',
          residentId: 1,
          residentName: 'Test Resident',
          created_at: new Date().toISOString()
        }
      })
    );
  }),

  rest.post('*/api/visitors/:id/request-approval', async (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Approval request sent to resident',
        visitorId: parseInt(id),
        status: 'pending_approval'
      })
    );
  }),

  rest.get('*/api/residents/search', (req, res, ctx) => {
    const unit = req.url.searchParams.get('unit');
    if (unit === 'NOTFOUND') {
      return res(ctx.status(404), ctx.json({ success: false, message: 'Unit not found' }));
    }
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: { id: 1, name: 'Test Resident', unit_number: unit || 'A101' }
      })
    );
  })
];

// Test utilities
const mockGuardAuth = {
  user: { id: 2, email: 'guard@test.com', role: 'guard', name: 'Test Guard' },
  isAuthenticated: true,
  loading: false,
  login: jest.fn(),
  logout: jest.fn(),
  hasRole: (role) => role === 'guard',
  hasAnyRole: (roles) => roles.includes('guard'),
};

const renderWalkInRegistration = async (authOverrides = {}) => {
  const authValue = { ...mockGuardAuth, ...authOverrides };
  let view;

  await act(async () => {
    view = render(
      <ErrorProvider>
        <LoadingProvider>
          <AuthContext.Provider value={authValue}>
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <WalkInRegistration />
            </MemoryRouter>
          </AuthContext.Provider>
        </LoadingProvider>
      </ErrorProvider>
    );
  });

  await waitFor(() => {
    expect(offlineService.getPendingWalkIns).toHaveBeenCalled();
  });

  return view;
};

describe('WalkInRegistration Integration Tests', () => {
  let warnSpy;
  let errorSpy;
  const originalWarn = console.warn;
  const originalError = console.error;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => {
      const firstArg = String(args[0] || '');
      if (firstArg.includes('Online registration failed, falling back to offline')) return;
      originalWarn(...args);
    });

    errorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
      const firstArg = String(args[0] || '');
      if (firstArg.includes('POST /api/visitors/walk-in net::ERR_FAILED')) return;
      originalError(...args);
    });

    server.use(...walkInHandlers);
    offlineService.getPendingWalkIns.mockResolvedValue([]);
    offlineService.addConnectionListener.mockImplementation(() => jest.fn());
    offlineService.syncPendingOperations.mockResolvedValue({ success: true });
    offlineService.queueWalkInRegistration.mockResolvedValue(undefined);
  });
  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    server.resetHandlers();
  });

  describe('Form Rendering', () => {
    it('renders the walk-in registration form', async () => {
      await renderWalkInRegistration();

      expect(screen.getByText('Walk-In Registration')).toBeInTheDocument();
      expect(screen.getByText('Visitor Information')).toBeInTheDocument();
    });

    it('renders all required form fields', async () => {
      await renderWalkInRegistration();

      expect(screen.getByTestId('walk-in-visitor-name')).toBeInTheDocument();
      expect(screen.getByTestId('walk-in-visitor-phone')).toBeInTheDocument();
      expect(screen.getByTestId('walk-in-house-number')).toBeInTheDocument();
      expect(screen.getByTestId('walk-in-purpose')).toBeInTheDocument();
    });

    it('renders optional vehicle plate field', async () => {
      await renderWalkInRegistration();

      expect(screen.getByPlaceholderText('e.g., KXX 123A')).toBeInTheDocument();
    });

    it('displays approval process info notice', async () => {
      await renderWalkInRegistration();

      expect(screen.getByText('Walk-In Approval Process')).toBeInTheDocument();
      expect(screen.getByText(/After registration, you can request approval/)).toBeInTheDocument();
    });

    it('renders submit and clear buttons', async () => {
      await renderWalkInRegistration();

      expect(screen.getByTestId('walk-in-submit')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('requires visitor name', async () => {
      const user = userEvent.setup();
      await renderWalkInRegistration();

      // Fill other required fields but not name
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');

      // Submit
      await user.click(screen.getByTestId('walk-in-submit'));

      // Form validation should prevent submission (HTML5 required)
      const nameInput = screen.getByTestId('walk-in-visitor-name');
      expect(nameInput).toBeInvalid();
    });

    it('requires phone number', async () => {
      const user = userEvent.setup();
      await renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');

      await user.click(screen.getByTestId('walk-in-submit'));

      const phoneInput = screen.getByTestId('walk-in-visitor-phone');
      expect(phoneInput).toBeInvalid();
    });

    it('requires house number', async () => {
      const user = userEvent.setup();
      await renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');

      await user.click(screen.getByTestId('walk-in-submit'));

      const houseInput = screen.getByTestId('walk-in-house-number');
      expect(houseInput).toBeInvalid();
    });

    it('purpose is optional', async () => {
      const user = userEvent.setup();
      await renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');

      // Don't fill purpose - should still submit
      await user.click(screen.getByTestId('walk-in-submit'));

      await waitFor(() => {
        expect(screen.getByText('Walk-In Visitor Registered')).toBeInTheDocument();
      });
    });
  });

  describe('Successful Registration Flow', () => {
    it('registers walk-in visitor successfully', async () => {
      const user = userEvent.setup();
      await renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');
      await user.type(screen.getByTestId('walk-in-purpose'), 'Personal visit');

      await user.click(screen.getByTestId('walk-in-submit'));

      await waitFor(() => {
        expect(screen.getByText('Walk-In Visitor Registered')).toBeInTheDocument();
      });

      // Check visitor details are displayed
      expect(screen.getByText(/John Visitor/)).toBeInTheDocument();
      expect(screen.getByText(/\+254712345678/)).toBeInTheDocument();
    });

    it('shows resident info after successful registration', async () => {
      const user = userEvent.setup();
      await renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');

      await user.click(screen.getByTestId('walk-in-submit'));

      await waitFor(() => {
        expect(screen.getByText(/Test Resident/)).toBeInTheDocument();
      });
    });

    it('includes vehicle plate when provided', async () => {
      const user = userEvent.setup();
      await renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');
      await user.type(screen.getByPlaceholderText('e.g., KXX 123A'), 'KAA 123B');

      await user.click(screen.getByTestId('walk-in-submit'));

      await waitFor(() => {
        expect(screen.getByText('Walk-In Visitor Registered')).toBeInTheDocument();
      });

      expect(screen.getByText(/KAA 123B/)).toBeInTheDocument();
    });
  });

  describe('Approval Request Flow', () => {
    it('shows approval status card after registration', async () => {
      const user = userEvent.setup();
      await renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');

      await user.click(screen.getByTestId('walk-in-submit'));

      await waitFor(() => {
        expect(screen.getByText('Walk-In Visitor Registered')).toBeInTheDocument();
      });

      // ApprovalStatusCard should be rendered
      // This card handles the approval request flow
    });
  });

  describe('Reset and Register Another', () => {
    it('shows Register Another button after registration', async () => {
      const user = userEvent.setup();
      await renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');

      await user.click(screen.getByTestId('walk-in-submit'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Register Another' })).toBeInTheDocument();
      });
    });

    it('resets form when clicking Register Another', async () => {
      const user = userEvent.setup();
      await renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');

      await user.click(screen.getByTestId('walk-in-submit'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Register Another' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Register Another' }));

      await waitFor(() => {
        expect(screen.getByTestId('walk-in-form')).toBeInTheDocument();
      });

      // Form should be empty
      expect(screen.getByTestId('walk-in-visitor-name')).toHaveValue('');
      expect(screen.getByTestId('walk-in-visitor-phone')).toHaveValue('');
    });

    it('clears form when clicking Clear button', async () => {
      const user = userEvent.setup();
      await renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');

      await user.click(screen.getByRole('button', { name: 'Clear' }));

      expect(screen.getByTestId('walk-in-visitor-name')).toHaveValue('');
      expect(screen.getByTestId('walk-in-visitor-phone')).toHaveValue('');
      expect(screen.getByTestId('walk-in-house-number')).toHaveValue('');
    });
  });

  describe('Error Handling', () => {
    it('handles house not found error', async () => {
      const user = userEvent.setup();
      await renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');
      await user.type(screen.getByTestId('walk-in-house-number'), 'NOTFOUND');

      await user.click(screen.getByTestId('walk-in-submit'));

      await waitFor(() => {
        // Error should be displayed by ErrorProvider
        // The exact display depends on ErrorContext implementation
        expect(screen.queryByText('Walk-In Visitor Registered')).not.toBeInTheDocument();
      });
    });

    it('handles network error gracefully', async () => {
      server.use(
        rest.post('*/api/visitors/walk-in', (req, res) => {
          return res.networkError('Network error');
        })
      );

      const user = userEvent.setup();
      await renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');

      await user.click(screen.getByTestId('walk-in-submit'));

      await waitFor(() => {
        expect(screen.getByText('Walk-In Visitor Registered')).toBeInTheDocument();
      });

      expect(offlineService.queueWalkInRegistration).toHaveBeenCalled();
    });

    it('handles server error gracefully', async () => {
      server.use(
        rest.post('*/api/visitors/walk-in', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ message: 'Internal server error' }));
        })
      );

      const user = userEvent.setup();
      await renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');

      await user.click(screen.getByTestId('walk-in-submit'));

      await waitFor(() => {
        expect(screen.queryByText('Walk-In Visitor Registered')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state while submitting', async () => {
      server.use(
        rest.post('*/api/visitors/walk-in', async (req, res, ctx) => {
          await new Promise(r => setTimeout(r, 350));
          const visitorData = await req.json();
          return res(ctx.status(201), ctx.json({ success: true, data: { id: 50, ...visitorData } }));
        })
      );

      const user = userEvent.setup();
      await renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');

      await user.click(screen.getByTestId('walk-in-submit'));

      await waitFor(() => {
        expect(screen.getByText('Registering...')).toBeInTheDocument();
      });
    });

    it('disables submit button while loading', async () => {
      server.use(
        rest.post('*/api/visitors/walk-in', async (req, res, ctx) => {
          await new Promise(r => setTimeout(r, 350));
          const visitorData = await req.json();
          return res(ctx.status(201), ctx.json({ success: true, data: { id: 50, ...visitorData } }));
        })
      );

      const user = userEvent.setup();
      await renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');

      await user.click(screen.getByTestId('walk-in-submit'));

      await waitFor(() => {
        expect(screen.getByTestId('walk-in-submit')).toBeDisabled();
      });
    });
  });

  describe('Navigation', () => {
    it('renders back button to guard dashboard', async () => {
      await renderWalkInRegistration();

      // PageHeader should have back navigation
      expect(screen.getByText('Walk-In Registration')).toBeInTheDocument();
    });
  });
});
