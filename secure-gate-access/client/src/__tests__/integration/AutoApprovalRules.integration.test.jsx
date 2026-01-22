/**
 * AutoApprovalRules Integration Tests
 * Tests the complete auto-approval rule management flow
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import AutoApprovalRules from '../../components/resident/AutoApprovalRules';
import { AuthContext } from '../../contexts/AuthContext';
import { ErrorProvider } from '../../contexts/ErrorContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Mock data
const mockRules = [
  {
    id: 1,
    ruleName: 'Mom Weekly Visit',
    matchCriteria: { visitorName: 'Jane Doe', visitorPhone: '+254700111111', category: 'family' },
    timeRestrictions: { days: ['sat', 'sun'], start_time: '09:00', end_time: '18:00' },
    isActive: true,
    matchCount: 5,
    lastMatchedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 2,
    ruleName: 'Plumber Service',
    matchCriteria: { visitorName: null, visitorPhone: '+254700222222', category: 'service' },
    timeRestrictions: {},
    isActive: false,
    matchCount: 2,
    lastMatchedAt: null
  }
];

const mockCategories = [
  { id: 'family', label: 'Family' },
  { id: 'friend', label: 'Friend' },
  { id: 'service', label: 'Service' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'custom', label: 'Custom' }
];

// Mock handlers
const handlers = [
  rest.get(`${API_BASE_URL}/api/auto-approval/rules`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true, data: mockRules }));
  }),

  rest.get(`${API_BASE_URL}/api/auto-approval/categories`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true, categories: mockCategories }));
  }),

  rest.post(`${API_BASE_URL}/api/auto-approval/rules`, async (req, res, ctx) => {
    const ruleData = await req.json();
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          id: 3,
          ruleName: ruleData.ruleName,
          matchCriteria: {
            visitorName: ruleData.visitorName,
            visitorPhone: ruleData.visitorPhone,
            category: ruleData.category
          },
          timeRestrictions: ruleData.timeRestrictions || {},
          isActive: true,
          matchCount: 0
        }
      })
    );
  }),

  rest.put(`${API_BASE_URL}/api/auto-approval/rules/:id`, async (req, res, ctx) => {
    const { id } = req.params;
    const updates = await req.json();
    return res(ctx.status(200), ctx.json({ success: true, data: { id: parseInt(id), ...updates } }));
  }),

  rest.delete(`${API_BASE_URL}/api/auto-approval/rules/:id`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true, message: 'Rule deleted' }));
  }),

  rest.post(`${API_BASE_URL}/api/auto-approval/rules/:id/toggle`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true }));
  }),

  rest.get(`${API_BASE_URL}/api/auto-approval/export`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ rules: mockRules, exportedAt: new Date().toISOString() }));
  })
];

const server = setupServer(...handlers);

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

const renderAutoApprovalRules = (authOverrides = {}) => {
  const authValue = { ...mockAuthValue, ...authOverrides };
  return render(
    <ErrorProvider>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <AutoApprovalRules />
        </MemoryRouter>
      </AuthContext.Provider>
    </ErrorProvider>
  );
};

describe('AutoApprovalRules Integration Tests', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('Loading and Display', () => {
    it('renders loading state initially', () => {
      renderAutoApprovalRules();

      // Should show loading skeleton
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders rules list after loading', async () => {
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('Mom Weekly Visit')).toBeInTheDocument();
      });

      expect(screen.getByText('Plumber Service')).toBeInTheDocument();
    });

    it('renders header with title and action buttons', async () => {
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('🤖 Auto-Approval Rules')).toBeInTheDocument();
      });

      expect(screen.getByText('+ Add Rule')).toBeInTheDocument();
      expect(screen.getByText('📥 Export')).toBeInTheDocument();
    });

    it('displays privacy information section', async () => {
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('🔒 Privacy Protection')).toBeInTheDocument();
      });

      expect(screen.getByText(/Your rules are.*encrypted/)).toBeInTheDocument();
    });

    it('displays rule details correctly', async () => {
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('Mom Weekly Visit')).toBeInTheDocument();
      });

      // Check active status
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Paused')).toBeInTheDocument();

      // Check match criteria
      expect(screen.getByText(/Name: Jane Doe/)).toBeInTheDocument();
    });

    it('displays usage statistics for rules', async () => {
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('Mom Weekly Visit')).toBeInTheDocument();
      });

      expect(screen.getByText(/Used 5 times/)).toBeInTheDocument();
      expect(screen.getByText(/Used 2 times/)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no rules exist', async () => {
      server.use(
        rest.get(`${API_BASE_URL}/api/auto-approval/rules`, (req, res, ctx) => {
          return res(ctx.status(200), ctx.json({ success: true, data: [] }));
        })
      );

      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('No auto-approval rules yet')).toBeInTheDocument();
      });

      expect(screen.getByText('Create rules to automatically approve trusted visitors')).toBeInTheDocument();
    });
  });

  describe('Create Rule', () => {
    it('opens create modal when clicking Add Rule', async () => {
      const user = userEvent.setup();
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('+ Add Rule')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Add Rule'));

      await waitFor(() => {
        expect(screen.getByText('Create Auto-Approval Rule')).toBeInTheDocument();
      });
    });

    it('creates a new rule successfully', async () => {
      const user = userEvent.setup();
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('+ Add Rule')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Add Rule'));

      await waitFor(() => {
        expect(screen.getByText('Create Auto-Approval Rule')).toBeInTheDocument();
      });

      // Fill form
      await user.type(screen.getByPlaceholderText("e.g., Mom's weekly visit"), 'Brother Visit');
      await user.type(screen.getByPlaceholderText('Visitor name (partial match)'), 'John Smith');
      await user.type(screen.getByPlaceholderText('Visitor phone number'), '+254700333333');

      // Submit
      await user.click(screen.getByRole('button', { name: 'Create Rule' }));

      // Modal should close and rules should refresh
      await waitFor(() => {
        expect(screen.queryByText('Create Auto-Approval Rule')).not.toBeInTheDocument();
      });
    });

    it('shows validation for required rule name', async () => {
      const user = userEvent.setup();
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('+ Add Rule')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Add Rule'));

      await waitFor(() => {
        expect(screen.getByText('Create Auto-Approval Rule')).toBeInTheDocument();
      });

      // Try to submit without rule name
      await user.click(screen.getByRole('button', { name: 'Create Rule' }));

      // Form should show validation (HTML5 required)
      const ruleNameInput = screen.getByPlaceholderText("e.g., Mom's weekly visit");
      expect(ruleNameInput).toBeInvalid();
    });

    it('closes modal when clicking Cancel', async () => {
      const user = userEvent.setup();
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('+ Add Rule')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Add Rule'));

      await waitFor(() => {
        expect(screen.getByText('Create Auto-Approval Rule')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(screen.queryByText('Create Auto-Approval Rule')).not.toBeInTheDocument();
      });
    });
  });

  describe('Time Restrictions', () => {
    it('allows selecting days of week', async () => {
      const user = userEvent.setup();
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('+ Add Rule')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Add Rule'));

      await waitFor(() => {
        expect(screen.getByText('Create Auto-Approval Rule')).toBeInTheDocument();
      });

      // Find and click day buttons
      const monButton = screen.getByRole('button', { name: 'Mon' });
      const friButton = screen.getByRole('button', { name: 'Fri' });

      await user.click(monButton);
      await user.click(friButton);

      expect(monButton).toHaveClass('bg-blue-500');
      expect(friButton).toHaveClass('bg-blue-500');
    });

    it('allows setting time range', async () => {
      const user = userEvent.setup();
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('+ Add Rule')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Add Rule'));

      await waitFor(() => {
        expect(screen.getByText('Create Auto-Approval Rule')).toBeInTheDocument();
      });

      // Find time inputs
      const timeInputs = screen.getAllByRole('textbox').filter(input =>
        input.getAttribute('type') === 'time'
      ) || document.querySelectorAll('input[type="time"]');

      // Time inputs exist
      expect(document.querySelectorAll('input[type="time"]').length).toBe(2);
    });
  });

  describe('Toggle Rule', () => {
    it('toggles rule active state', async () => {
      const user = userEvent.setup();
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('Mom Weekly Visit')).toBeInTheDocument();
      });

      // Find toggle button (the first one that is green/active)
      const toggleButtons = screen.getAllByRole('button').filter(
        btn => btn.className.includes('rounded-full') && btn.className.includes('h-6')
      );

      expect(toggleButtons.length).toBeGreaterThan(0);

      await user.click(toggleButtons[0]);

      // Server should be called, rules should refresh
      // We can verify by checking the component re-renders
      await waitFor(() => {
        expect(screen.getByText('Mom Weekly Visit')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Rule', () => {
    it('shows confirmation dialog when deleting', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('Mom Weekly Visit')).toBeInTheDocument();
      });

      // Find delete button (🗑️)
      const deleteButtons = screen.getAllByRole('button').filter(
        btn => btn.textContent === '🗑️'
      );

      expect(deleteButtons.length).toBeGreaterThan(0);

      await user.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalledWith('Delete this auto-approval rule?');

      confirmSpy.mockRestore();
    });

    it('deletes rule when confirmed', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('Mom Weekly Visit')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button').filter(
        btn => btn.textContent === '🗑️'
      );

      await user.click(deleteButtons[0]);

      // Server should be called, rules should refresh
      await waitFor(() => {
        expect(screen.getByText('Mom Weekly Visit')).toBeInTheDocument();
      });

      confirmSpy.mockRestore();
    });

    it('does not delete rule when cancelled', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('Mom Weekly Visit')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button').filter(
        btn => btn.textContent === '🗑️'
      );

      await user.click(deleteButtons[0]);

      // Rule should still be visible
      expect(screen.getByText('Mom Weekly Visit')).toBeInTheDocument();

      confirmSpy.mockRestore();
    });
  });

  describe('Edit Rule', () => {
    it('opens edit modal with rule data', async () => {
      const user = userEvent.setup();
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('Mom Weekly Visit')).toBeInTheDocument();
      });

      // Find edit button (✏️)
      const editButtons = screen.getAllByRole('button').filter(
        btn => btn.textContent === '✏️'
      );

      expect(editButtons.length).toBeGreaterThan(0);

      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Rule')).toBeInTheDocument();
      });

      // Check that form is pre-filled
      expect(screen.getByDisplayValue('Mom Weekly Visit')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    });

    it('updates rule successfully', async () => {
      const user = userEvent.setup();
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('Mom Weekly Visit')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button').filter(
        btn => btn.textContent === '✏️'
      );

      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Rule')).toBeInTheDocument();
      });

      // Update the rule name
      const ruleNameInput = screen.getByDisplayValue('Mom Weekly Visit');
      await user.clear(ruleNameInput);
      await user.type(ruleNameInput, 'Mom Weekend Visit');

      await user.click(screen.getByRole('button', { name: 'Update Rule' }));

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Edit Rule')).not.toBeInTheDocument();
      });
    });
  });

  describe('Export Rules', () => {
    it('triggers download when clicking export', async () => {
      const user = userEvent.setup();

      // Mock URL methods
      const originalCreateObjectURL = global.URL.createObjectURL;
      const originalRevokeObjectURL = global.URL.revokeObjectURL;
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();

      // Mock createElement only for 'a' tags
      const originalCreateElement = document.createElement.bind(document);
      const mockClick = jest.fn();
      const mockAnchor = { href: '', download: '', click: mockClick };

      document.createElement = jest.fn((tagName) => {
        if (tagName === 'a') {
          return mockAnchor;
        }
        return originalCreateElement(tagName);
      });

      try {
        renderAutoApprovalRules();

        await waitFor(() => {
          expect(screen.getByText('📥 Export')).toBeInTheDocument();
        });

        await user.click(screen.getByText('📥 Export'));

        await waitFor(() => {
          expect(mockClick).toHaveBeenCalled();
        }, { timeout: 5000 });

        expect(mockAnchor.download).toBe('auto-approval-rules-export.json');
      } finally {
        // Cleanup - always restore
        document.createElement = originalCreateElement;
        global.URL.createObjectURL = originalCreateObjectURL;
        global.URL.revokeObjectURL = originalRevokeObjectURL;
      }
    });
  });

  describe('Error Handling', () => {
    it('displays error when loading rules fails', async () => {
      server.use(
        rest.get(`${API_BASE_URL}/api/auto-approval/rules`, (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ success: false, message: 'Server error' }));
        })
      );

      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('Failed to load rules')).toBeInTheDocument();
      });
    });

    it('displays error when toggle fails', async () => {
      server.use(
        rest.post(`${API_BASE_URL}/api/auto-approval/rules/:id/toggle`, (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ success: false }));
        })
      );

      const user = userEvent.setup();
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('Mom Weekly Visit')).toBeInTheDocument();
      });

      const toggleButtons = screen.getAllByRole('button').filter(
        btn => btn.className.includes('rounded-full') && btn.className.includes('h-6')
      );

      await user.click(toggleButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Failed to toggle rule')).toBeInTheDocument();
      });
    });

    it('displays error when create fails', async () => {
      server.use(
        rest.post(`${API_BASE_URL}/api/auto-approval/rules`, (req, res, ctx) => {
          return res(ctx.status(400), ctx.json({ error: 'Invalid rule data' }));
        })
      );

      const user = userEvent.setup();
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('+ Add Rule')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Add Rule'));

      await waitFor(() => {
        expect(screen.getByText('Create Auto-Approval Rule')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText("e.g., Mom's weekly visit"), 'Test Rule');
      await user.click(screen.getByRole('button', { name: 'Create Rule' }));

      await waitFor(() => {
        expect(screen.getByText('Invalid rule data')).toBeInTheDocument();
      });
    });
  });

  describe('Category Display', () => {
    it('displays correct category icons', async () => {
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('Mom Weekly Visit')).toBeInTheDocument();
      });

      // Family icon should be present for first rule
      expect(screen.getByText('👨‍👩‍👧‍👦')).toBeInTheDocument();

      // Service icon for second rule
      expect(screen.getByText('🔧')).toBeInTheDocument();
    });
  });

  describe('Time Restrictions Display', () => {
    it('displays time restrictions correctly', async () => {
      renderAutoApprovalRules();

      await waitFor(() => {
        expect(screen.getByText('Mom Weekly Visit')).toBeInTheDocument();
      });

      // Should show day and time restrictions
      expect(screen.getByText(/SAT, SUN/i)).toBeInTheDocument();
      expect(screen.getByText(/09:00 - 18:00/)).toBeInTheDocument();

      // For rule without restrictions, should show "Anytime"
      expect(screen.getByText('📅 Anytime')).toBeInTheDocument();
    });
  });
});
