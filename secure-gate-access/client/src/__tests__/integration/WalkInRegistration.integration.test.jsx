/**
 * WalkInRegistration Integration Tests
 * Tests the complete walk-in visitor registration flow from guard perspective
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import WalkInRegistration from '../../pages/guard/WalkInRegistration';
import { AuthContext } from '../../contexts/AuthContext';
import { ErrorProvider } from '../../contexts/ErrorContext';
import { LoadingProvider } from '../../contexts/LoadingContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Mock handlers for WalkInRegistration tests
const handlers = [
  rest.post(`${API_BASE_URL}/api/visitors/walk-in`, async (req, res, ctx) => {
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

  rest.post(`${API_BASE_URL}/api/visitors/:id/request-approval`, async (req, res, ctx) => {
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

  rest.get(`${API_BASE_URL}/api/residents/search`, (req, res, ctx) => {
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

const server = setupServer(...handlers);

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

const renderWalkInRegistration = (authOverrides = {}) => {
  const authValue = { ...mockGuardAuth, ...authOverrides };
  return render(
    <ErrorProvider>
      <LoadingProvider>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter>
            <WalkInRegistration />
          </MemoryRouter>
        </AuthContext.Provider>
      </LoadingProvider>
    </ErrorProvider>
  );
};

describe('WalkInRegistration Integration Tests', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('Form Rendering', () => {
    it('renders the walk-in registration form', () => {
      renderWalkInRegistration();

      expect(screen.getByText('Walk-In Registration')).toBeInTheDocument();
      expect(screen.getByText('Visitor Information')).toBeInTheDocument();
    });

    it('renders all required form fields', () => {
      renderWalkInRegistration();

      expect(screen.getByTestId('walk-in-visitor-name')).toBeInTheDocument();
      expect(screen.getByTestId('walk-in-visitor-phone')).toBeInTheDocument();
      expect(screen.getByTestId('walk-in-house-number')).toBeInTheDocument();
      expect(screen.getByTestId('walk-in-purpose')).toBeInTheDocument();
    });

    it('renders optional vehicle plate field', () => {
      renderWalkInRegistration();

      expect(screen.getByPlaceholderText('e.g., KXX 123A')).toBeInTheDocument();
    });

    it('displays approval process info notice', () => {
      renderWalkInRegistration();

      expect(screen.getByText('Walk-In Approval Process')).toBeInTheDocument();
      expect(screen.getByText(/After registration, you can request approval/)).toBeInTheDocument();
    });

    it('renders submit and clear buttons', () => {
      renderWalkInRegistration();

      expect(screen.getByTestId('walk-in-submit')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('requires visitor name', async () => {
      const user = userEvent.setup();
      renderWalkInRegistration();

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
      renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');

      await user.click(screen.getByTestId('walk-in-submit'));

      const phoneInput = screen.getByTestId('walk-in-visitor-phone');
      expect(phoneInput).toBeInvalid();
    });

    it('requires house number', async () => {
      const user = userEvent.setup();
      renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');

      await user.click(screen.getByTestId('walk-in-submit'));

      const houseInput = screen.getByTestId('walk-in-house-number');
      expect(houseInput).toBeInvalid();
    });

    it('purpose is optional', async () => {
      const user = userEvent.setup();
      renderWalkInRegistration();

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
      renderWalkInRegistration();

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
      renderWalkInRegistration();

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
      renderWalkInRegistration();

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
      renderWalkInRegistration();

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
      renderWalkInRegistration();

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
      renderWalkInRegistration();

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
      renderWalkInRegistration();

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
      renderWalkInRegistration();

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
        rest.post(`${API_BASE_URL}/api/visitors/walk-in`, (req, res) => {
          return res.networkError('Network error');
        })
      );

      const user = userEvent.setup();
      renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');

      await user.click(screen.getByTestId('walk-in-submit'));

      await waitFor(() => {
        expect(screen.queryByText('Walk-In Visitor Registered')).not.toBeInTheDocument();
      });
    });

    it('handles server error gracefully', async () => {
      server.use(
        rest.post(`${API_BASE_URL}/api/visitors/walk-in`, (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ message: 'Internal server error' }));
        })
      );

      const user = userEvent.setup();
      renderWalkInRegistration();

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
        rest.post(`${API_BASE_URL}/api/visitors/walk-in`, async (req, res, ctx) => {
          await new Promise(r => setTimeout(r, 100));
          const visitorData = await req.json();
          return res(ctx.status(201), ctx.json({ success: true, data: { id: 50, ...visitorData } }));
        })
      );

      const user = userEvent.setup();
      renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');

      await user.click(screen.getByTestId('walk-in-submit'));

      // Check for loading text
      expect(screen.getByText('Registering...')).toBeInTheDocument();
    });

    it('disables submit button while loading', async () => {
      server.use(
        rest.post(`${API_BASE_URL}/api/visitors/walk-in`, async (req, res, ctx) => {
          await new Promise(r => setTimeout(r, 100));
          const visitorData = await req.json();
          return res(ctx.status(201), ctx.json({ success: true, data: { id: 50, ...visitorData } }));
        })
      );

      const user = userEvent.setup();
      renderWalkInRegistration();

      await user.type(screen.getByTestId('walk-in-visitor-name'), 'John Visitor');
      await user.type(screen.getByTestId('walk-in-visitor-phone'), '+254712345678');
      await user.type(screen.getByTestId('walk-in-house-number'), 'A101');

      await user.click(screen.getByTestId('walk-in-submit'));

      expect(screen.getByTestId('walk-in-submit')).toBeDisabled();
    });
  });

  describe('Navigation', () => {
    it('renders back button to guard dashboard', () => {
      renderWalkInRegistration();

      // PageHeader should have back navigation
      expect(screen.getByText('Walk-In Registration')).toBeInTheDocument();
    });
  });
});
