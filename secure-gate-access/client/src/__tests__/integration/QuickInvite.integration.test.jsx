/**
 * QuickInvite Integration Tests
 * Tests the complete visitor invitation flow from the resident perspective
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { rest } from 'msw';
import QuickInvite from '../../pages/resident/QuickInvite';
import { AuthContext } from '../../contexts/AuthContext';
import { ErrorProvider } from '../../contexts/ErrorContext';
import { server } from '../../mocks/server';

// Note: Uses global MSW server from mocks/server.js with handlers from mocks/handlers.js

// Test utilities
const mockAuthValue = {
  user: { id: 1, email: 'resident@test.com', role: 'resident', name: 'Test Resident' },
  isAuthenticated: true,
  loading: false,
  login: jest.fn(),
  logout: jest.fn(),
  hasRole: (role) => role === 'resident',
  hasAnyRole: (roles) => roles.includes('resident'),
};

const renderQuickInvite = (authOverrides = {}) => {
  const authValue = { ...mockAuthValue, ...authOverrides };
  return render(
    <ErrorProvider>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <QuickInvite />
        </MemoryRouter>
      </AuthContext.Provider>
    </ErrorProvider>
  );
};

describe('QuickInvite Integration Tests', () => {
  // Global MSW server from setupTests.js handles beforeAll/afterAll
  // server.resetHandlers() is called in setupTests.js afterEach

  describe('Form Rendering', () => {
    it('renders the quick invite form with all fields', () => {
      renderQuickInvite();

      expect(screen.getByText('Quick Invite')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0712 345 678')).toBeInTheDocument();
      expect(screen.getByText('When are they visiting?')).toBeInTheDocument();
    });

    it('renders date selection chips (Today, Tomorrow, etc)', () => {
      renderQuickInvite();

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Tomorrow')).toBeInTheDocument();
      expect(screen.getByText('Pick Date')).toBeInTheDocument();
    });

    it('renders time selection chips (Morning, Afternoon, Evening)', () => {
      renderQuickInvite();

      expect(screen.getByText('Morning')).toBeInTheDocument();
      expect(screen.getByText('Afternoon')).toBeInTheDocument();
      expect(screen.getByText('Evening')).toBeInTheDocument();
      expect(screen.getByText('Pick Time')).toBeInTheDocument();
    });

    it('renders back to dashboard button', () => {
      renderQuickInvite();

      expect(screen.getByLabelText('Back to dashboard')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows error when submitting without name', async () => {
      const user = userEvent.setup();
      renderQuickInvite();

      // Fill phone but not name
      await user.type(screen.getByPlaceholderText('0712 345 678'), '0712345678');

      // Select a date
      await user.click(screen.getByText('Today'));

      // Submit
      await user.click(screen.getByRole('button', { name: /send invite/i }));

      await waitFor(() => {
        expect(screen.getByText('Guest name is required')).toBeInTheDocument();
      });
    });

    it('shows error when submitting without phone', async () => {
      const user = userEvent.setup();
      renderQuickInvite();

      // Fill name but not phone
      await user.type(screen.getByPlaceholderText('John Doe'), 'Test Visitor');

      // Select a date
      await user.click(screen.getByText('Today'));

      // Submit
      await user.click(screen.getByRole('button', { name: /send invite/i }));

      await waitFor(() => {
        expect(screen.getByText('Phone number is required')).toBeInTheDocument();
      });
    });

    it('shows error for invalid Kenyan phone format', async () => {
      const user = userEvent.setup();
      renderQuickInvite();

      await user.type(screen.getByPlaceholderText('John Doe'), 'Test Visitor');
      await user.type(screen.getByPlaceholderText('0712 345 678'), '123456');
      await user.click(screen.getByText('Today'));

      await user.click(screen.getByRole('button', { name: /send invite/i }));

      await waitFor(() => {
        expect(screen.getByText('Enter a valid Kenyan phone number')).toBeInTheDocument();
      });
    });

    it('shows error when no date is selected', async () => {
      const user = userEvent.setup();
      renderQuickInvite();

      await user.type(screen.getByPlaceholderText('John Doe'), 'Test Visitor');
      await user.type(screen.getByPlaceholderText('0712 345 678'), '0712345678');

      await user.click(screen.getByRole('button', { name: /send invite/i }));

      await waitFor(() => {
        expect(screen.getByText("Please select when they're visiting")).toBeInTheDocument();
      });
    });

    it('accepts valid Kenyan phone number with +254 prefix', async () => {
      const user = userEvent.setup();
      renderQuickInvite();

      await user.type(screen.getByPlaceholderText('John Doe'), 'Test Visitor');
      await user.type(screen.getByPlaceholderText('0712 345 678'), '+254712345678');
      await user.click(screen.getByText('Today'));

      await user.click(screen.getByRole('button', { name: /send invite/i }));

      // Should not show phone validation error
      await waitFor(() => {
        expect(screen.queryByText('Enter a valid Kenyan phone number')).not.toBeInTheDocument();
      });
    });
  });

  describe('Date and Time Selection', () => {
    it('selects Today date chip and updates form', async () => {
      const user = userEvent.setup();
      renderQuickInvite();

      const todayChip = screen.getByText('Today').closest('button');
      await user.click(todayChip);

      expect(todayChip).toHaveClass('border-green-500');
    });

    it('selects Tomorrow date chip and updates form', async () => {
      const user = userEvent.setup();
      renderQuickInvite();

      const tomorrowChip = screen.getByText('Tomorrow').closest('button');
      await user.click(tomorrowChip);

      expect(tomorrowChip).toHaveClass('border-green-500');
    });

    it('shows custom date picker when Pick Date is selected', async () => {
      const user = userEvent.setup();
      renderQuickInvite();

      await user.click(screen.getByText('Pick Date'));

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: '' }) || screen.getByDisplayValue('')).toBeInTheDocument();
      });
    });

    it('selects Morning time chip', async () => {
      const user = userEvent.setup();
      renderQuickInvite();

      const morningChip = screen.getByText('Morning').closest('button');
      await user.click(morningChip);

      expect(morningChip).toHaveClass('border-green-500');
    });

    it('selects Afternoon time chip', async () => {
      const user = userEvent.setup();
      renderQuickInvite();

      const afternoonChip = screen.getByText('Afternoon').closest('button');
      await user.click(afternoonChip);

      expect(afternoonChip).toHaveClass('border-green-500');
    });
  });

  describe('Successful Invitation Flow', () => {
    it('submits form successfully and shows success screen', async () => {
      const user = userEvent.setup();
      renderQuickInvite();

      // Fill out form
      await user.type(screen.getByPlaceholderText('John Doe'), 'Test Visitor');
      await user.type(screen.getByPlaceholderText('0712 345 678'), '0712345678');
      await user.click(screen.getByText('Today'));
      await user.click(screen.getByText('Morning'));

      // Submit
      await user.click(screen.getByRole('button', { name: /send invite/i }));

      // Wait for success screen
      await waitFor(() => {
        expect(screen.getByText('Invite sent! 🎉')).toBeInTheDocument();
      });

      // Check success details
      expect(screen.getByText(/Test Visitor will receive an SMS/)).toBeInTheDocument();
      expect(screen.getByText('What happens next?')).toBeInTheDocument();
    });

    it('shows share options on success', async () => {
      const user = userEvent.setup();
      renderQuickInvite();

      // Fill and submit
      await user.type(screen.getByPlaceholderText('John Doe'), 'Test Visitor');
      await user.type(screen.getByPlaceholderText('0712 345 678'), '0712345678');
      await user.click(screen.getByText('Today'));
      await user.click(screen.getByRole('button', { name: /send invite/i }));

      await waitFor(() => {
        expect(screen.getByText(/Send via WhatsApp/)).toBeInTheDocument();
      });

      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });

    it('shows invite another guest button on success', async () => {
      const user = userEvent.setup();
      renderQuickInvite();

      // Fill and submit
      await user.type(screen.getByPlaceholderText('John Doe'), 'Test Visitor');
      await user.type(screen.getByPlaceholderText('0712 345 678'), '0712345678');
      await user.click(screen.getByText('Today'));
      await user.click(screen.getByRole('button', { name: /send invite/i }));

      await waitFor(() => {
        expect(screen.getByText('Invite Another Guest')).toBeInTheDocument();
      });
    });

    it('resets form when clicking invite another', async () => {
      const user = userEvent.setup();
      renderQuickInvite();

      // Fill and submit
      await user.type(screen.getByPlaceholderText('John Doe'), 'Test Visitor');
      await user.type(screen.getByPlaceholderText('0712 345 678'), '0712345678');
      await user.click(screen.getByText('Today'));
      await user.click(screen.getByRole('button', { name: /send invite/i }));

      await waitFor(() => {
        expect(screen.getByText('Invite Another Guest')).toBeInTheDocument();
      });

      // Click invite another
      await user.click(screen.getByText('Invite Another Guest'));

      // Should show form again with empty fields
      await waitFor(() => {
        expect(screen.getByPlaceholderText('John Doe')).toHaveValue('');
      });
    });
  });

  describe('Error Handling', () => {
    it('displays server error message on API failure', async () => {
      server.use(
        rest.post('/api/visitors', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ success: false, message: 'Server error occurred' })
          );
        })
      );

      const user = userEvent.setup();
      renderQuickInvite();

      // Fill and submit
      await user.type(screen.getByPlaceholderText('John Doe'), 'Test Visitor');
      await user.type(screen.getByPlaceholderText('0712 345 678'), '0712345678');
      await user.click(screen.getByText('Today'));
      await user.click(screen.getByRole('button', { name: /send invite/i }));

      await waitFor(() => {
        // Should show an error (the exact text depends on errorMapper)
        const errorElement = document.querySelector('.bg-red-50');
        expect(errorElement).toBeInTheDocument();
      });
    });

    it('handles network error gracefully', async () => {
      server.use(
        rest.post('/api/visitors', (req, res) => {
          return res.networkError('Network error');
        })
      );

      const user = userEvent.setup();
      renderQuickInvite();

      // Fill and submit
      await user.type(screen.getByPlaceholderText('John Doe'), 'Test Visitor');
      await user.type(screen.getByPlaceholderText('0712 345 678'), '0712345678');
      await user.click(screen.getByText('Today'));
      await user.click(screen.getByRole('button', { name: /send invite/i }));

      await waitFor(() => {
        const errorElement = document.querySelector('.bg-red-50');
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  describe('Unit PIN Sharing', () => {
    it('shows unit PIN field when checkbox is checked', async () => {
      const user = userEvent.setup();
      renderQuickInvite();

      // Find and click the checkbox
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Unit PIN (e.g. A12)')).toBeInTheDocument();
      });
    });

    it('requires unit PIN when sharing is enabled', async () => {
      const user = userEvent.setup();
      renderQuickInvite();

      // Fill form
      await user.type(screen.getByPlaceholderText('John Doe'), 'Test Visitor');
      await user.type(screen.getByPlaceholderText('0712 345 678'), '0712345678');
      await user.click(screen.getByText('Today'));

      // Enable unit PIN sharing but don't fill it
      await user.click(screen.getByRole('checkbox'));

      // Submit
      await user.click(screen.getByRole('button', { name: /send invite/i }));

      await waitFor(() => {
        expect(screen.getByText('Unit PIN is required when sharing residence details')).toBeInTheDocument();
      });
    });

    it('submits successfully with unit PIN', async () => {
      const user = userEvent.setup();
      renderQuickInvite();

      // Fill form
      await user.type(screen.getByPlaceholderText('John Doe'), 'Test Visitor');
      await user.type(screen.getByPlaceholderText('0712 345 678'), '0712345678');
      await user.click(screen.getByText('Today'));

      // Enable unit PIN sharing and fill it
      await user.click(screen.getByRole('checkbox'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Unit PIN (e.g. A12)')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Unit PIN (e.g. A12)'), 'A12');

      // Submit
      await user.click(screen.getByRole('button', { name: /send invite/i }));

      await waitFor(() => {
        expect(screen.getByText('Invite sent! 🎉')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state while submitting', async () => {
      // Delay the response
      server.use(
        rest.post('/api/visitors', async (req, res, ctx) => {
          await new Promise(r => setTimeout(r, 100));
          const visitorData = await req.json();
          return res(
            ctx.status(201),
            ctx.json({
              id: 123,
              ...visitorData,
              status: 'pending_confirmation',
              inviteCode: 'TEST123ABC'
            })
          );
        })
      );

      const user = userEvent.setup();
      renderQuickInvite();

      // Fill form
      await user.type(screen.getByPlaceholderText('John Doe'), 'Test Visitor');
      await user.type(screen.getByPlaceholderText('0712 345 678'), '0712345678');
      await user.click(screen.getByText('Today'));

      // Submit
      await user.click(screen.getByRole('button', { name: /send invite/i }));

      // Check for loading text
      expect(screen.getByText('Sending Invite...')).toBeInTheDocument();
    });

    it('disables form inputs while loading', async () => {
      server.use(
        rest.post('/api/visitors', async (req, res, ctx) => {
          await new Promise(r => setTimeout(r, 100));
          const visitorData = await req.json();
          return res(ctx.status(201), ctx.json({ id: 123, ...visitorData }));
        })
      );

      const user = userEvent.setup();
      renderQuickInvite();

      // Fill form
      await user.type(screen.getByPlaceholderText('John Doe'), 'Test Visitor');
      await user.type(screen.getByPlaceholderText('0712 345 678'), '0712345678');
      await user.click(screen.getByText('Today'));

      // Submit
      await user.click(screen.getByRole('button', { name: /send invite/i }));

      // Check inputs are disabled
      expect(screen.getByPlaceholderText('John Doe')).toBeDisabled();
      expect(screen.getByPlaceholderText('0712 345 678')).toBeDisabled();
    });
  });
});
