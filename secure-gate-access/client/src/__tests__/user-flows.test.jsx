import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { ErrorProvider } from '../../contexts/ErrorContext';
import { LoadingProvider } from '../../contexts/LoadingContext';
import { SearchProvider } from '../../contexts/SearchContext';
import { NavigationProvider } from '../../contexts/NavigationContext';
import { BrowserCompatibilityProvider } from '../../contexts/BrowserCompatibilityContext';
import App from '../../App';

// Mock API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Helper to render with all providers
const renderWithProviders = (ui, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(
    <ErrorProvider>
      <AuthProvider>
        <NavigationProvider>
          <LoadingProvider>
            <SearchProvider>
              <BrowserCompatibilityProvider>
                <Router>{ui}</Router>
              </BrowserCompatibilityProvider>
            </SearchProvider>
          </LoadingProvider>
        </NavigationProvider>
      </AuthProvider>
    </ErrorProvider>
  );
};

describe('User Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {});
    mockLocalStorage.removeItem.mockImplementation(() => {});
    mockLocalStorage.clear.mockImplementation(() => {});
  });

  describe('Resident Flow: Add Visitor → Generate Pass', () => {
    beforeEach(() => {
      // Mock successful API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { id: 'visitor-1', name: 'John Doe', inviteLink: 'https://example.com/invite/123' }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { id: 'pass-1', qrCode: 'qr-code-data' }
          })
        });
    });

    test('complete resident visitor creation flow', async () => {
      const user = userEvent.setup();
      
      // Mock authentication
      mockLocalStorage.getItem.mockReturnValue('resident-token');
      mockLocalStorage.getItem.mockReturnValueOnce('resident-token');
      mockLocalStorage.getItem.mockReturnValueOnce('resident');

      renderWithProviders(<App />, { route: '/dashboard/resident' });

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });

      // Navigate to add visitor
      const addVisitorLink = screen.getByText(/add visitor/i);
      await user.click(addVisitorLink);

      // Wait for add visitor page
      await waitFor(() => {
        expect(screen.getByText(/create visitor/i)).toBeInTheDocument();
      });

      // Fill out visitor form
      const nameInput = screen.getByLabelText(/full name/i);
      const phoneInput = screen.getByLabelText(/phone number/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const dateInput = screen.getByLabelText(/date of visit/i);
      const timeInput = screen.getByLabelText(/time of visit/i);
      const purposeInput = screen.getByLabelText(/purpose of visit/i);

      await user.type(nameInput, 'John Doe');
      await user.type(phoneInput, '0123456789');
      await user.type(emailInput, 'john@example.com');
      await user.type(dateInput, '2024-12-31');
      await user.type(timeInput, '14:00');
      await user.type(purposeInput, 'Meeting');

      // Submit form
      const submitButton = screen.getByText(/create visitor/i);
      await user.click(submitButton);

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/visitor created successfully/i)).toBeInTheDocument();
      });

      // Verify API calls were made
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/visitors'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer resident-token'
          })
        })
      );
    });

    test('handles form validation errors', async () => {
      const user = userEvent.setup();
      
      mockLocalStorage.getItem.mockReturnValue('resident-token');
      mockLocalStorage.getItem.mockReturnValueOnce('resident-token');
      mockLocalStorage.getItem.mockReturnValueOnce('resident');

      renderWithProviders(<App />, { route: '/resident/add-visitor' });

      // Try to submit empty form
      const submitButton = screen.getByText(/create visitor/i);
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    test('handles API errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock API error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      mockLocalStorage.getItem.mockReturnValue('resident-token');
      mockLocalStorage.getItem.mockReturnValueOnce('resident-token');
      mockLocalStorage.getItem.mockReturnValueOnce('resident');

      renderWithProviders(<App />, { route: '/resident/add-visitor' });

      // Fill out form
      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'John Doe');

      // Submit form
      const submitButton = screen.getByText(/create visitor/i);
      await user.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Guard Flow: Scan QR → Check-in', () => {
    beforeEach(() => {
      // Mock successful API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              { id: 'visitor-1', name: 'John Doe', status: 'CONFIRMED' }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { message: 'Visitor checked in successfully' }
          })
        });
    });

    test('complete guard check-in flow', async () => {
      const user = userEvent.setup();
      
      mockLocalStorage.getItem.mockReturnValue('guard-token');
      mockLocalStorage.getItem.mockReturnValueOnce('guard-token');
      mockLocalStorage.getItem.mockReturnValueOnce('guard');

      renderWithProviders(<App />, { route: '/dashboard/guard' });

      // Wait for guard dashboard
      await waitFor(() => {
        expect(screen.getByText(/active visitors/i)).toBeInTheDocument();
      });

      // Navigate to scan QR
      const scanQRLink = screen.getByText(/scan qr/i);
      await user.click(scanQRLink);

      // Wait for scan QR page
      await waitFor(() => {
        expect(screen.getByText(/scan qr code/i)).toBeInTheDocument();
      });

      // Simulate QR scan (in real app, this would be camera input)
      const qrInput = screen.getByLabelText(/qr code/i);
      await user.type(qrInput, 'visitor-1');

      // Submit check-in
      const checkInButton = screen.getByText(/check in/i);
      await user.click(checkInButton);

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/visitor checked in successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Admin Flow: View Metrics → Generate Report', () => {
    beforeEach(() => {
      // Mock successful API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              totalVisitors: 100,
              activeVisitors: 5,
              todayVisits: 15
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { reportUrl: 'https://example.com/report.pdf' }
          })
        });
    });

    test('complete admin metrics and report flow', async () => {
      const user = userEvent.setup();
      
      mockLocalStorage.getItem.mockReturnValue('admin-token');
      mockLocalStorage.getItem.mockReturnValueOnce('admin-token');
      mockLocalStorage.getItem.mockReturnValueOnce('admin');

      renderWithProviders(<App />, { route: '/dashboard/admin' });

      // Wait for admin dashboard
      await waitFor(() => {
        expect(screen.getByText(/admin dashboard/i)).toBeInTheDocument();
      });

      // Check metrics are displayed
      await waitFor(() => {
        expect(screen.getByText(/100/i)).toBeInTheDocument(); // totalVisitors
        expect(screen.getByText(/5/i)).toBeInTheDocument(); // activeVisitors
        expect(screen.getByText(/15/i)).toBeInTheDocument(); // todayVisits
      });

      // Navigate to reports
      const reportsLink = screen.getByText(/reports/i);
      await user.click(reportsLink);

      // Wait for reports page
      await waitFor(() => {
        expect(screen.getByText(/reports/i)).toBeInTheDocument();
      });

      // Generate report
      const generateReportButton = screen.getByText(/generate report/i);
      await user.click(generateReportButton);

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/report generated successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Flows', () => {
    test('handles network errors with retry', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      mockLocalStorage.getItem.mockReturnValue('resident-token');
      mockLocalStorage.getItem.mockReturnValueOnce('resident-token');
      mockLocalStorage.getItem.mockReturnValueOnce('resident');

      renderWithProviders(<App />, { route: '/resident/add-visitor' });

      // Fill out form
      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'John Doe');

      // Submit form
      const submitButton = screen.getByText(/create visitor/i);
      await user.click(submitButton);

      // Should show error with retry option
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByText(/retry/i)).toBeInTheDocument();
      });

      // Mock successful retry
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 'visitor-1', name: 'John Doe' }
        })
      });

      // Click retry
      const retryButton = screen.getByText(/retry/i);
      await user.click(retryButton);

      // Should show success
      await waitFor(() => {
        expect(screen.getByText(/visitor created successfully/i)).toBeInTheDocument();
      });
    });

    test('handles authentication errors with redirect', async () => {
      const user = userEvent.setup();
      
      // Mock authentication error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          success: false,
          error: 'Unauthorized'
        })
      });
      
      mockLocalStorage.getItem.mockReturnValue('invalid-token');
      mockLocalStorage.getItem.mockReturnValueOnce('invalid-token');
      mockLocalStorage.getItem.mockReturnValueOnce('resident');

      renderWithProviders(<App />, { route: '/dashboard/resident' });

      // Wait for authentication error
      await waitFor(() => {
        expect(screen.getByText(/unauthorized/i)).toBeInTheDocument();
      });

      // Should redirect to login
      expect(window.location.href).toContain('/login');
    });
  });

  describe('Loading States and User Feedback', () => {
    test('shows loading states during API calls', async () => {
      const user = userEvent.setup();
      
      // Mock delayed API response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { id: 'visitor-1' }
            })
          }), 1000)
        )
      );
      
      mockLocalStorage.getItem.mockReturnValue('resident-token');
      mockLocalStorage.getItem.mockReturnValueOnce('resident-token');
      mockLocalStorage.getItem.mockReturnValueOnce('resident');

      renderWithProviders(<App />, { route: '/resident/add-visitor' });

      // Fill out form
      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'John Doe');

      // Submit form
      const submitButton = screen.getByText(/create visitor/i);
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByText(/creating/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/visitor created successfully/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      mockLocalStorage.getItem.mockReturnValue('resident-token');
      mockLocalStorage.getItem.mockReturnValueOnce('resident-token');
      mockLocalStorage.getItem.mockReturnValueOnce('resident');

      renderWithProviders(<App />, { route: '/dashboard/resident' });

      // Test keyboard shortcuts
      await user.keyboard('{Control>}k{/Control}'); // Focus search
      await user.keyboard('{Control>}h{/Control}'); // Go to home
      await user.keyboard('{Control>}l{/Control}'); // Logout
      await user.keyboard('{Control>}b{/Control}'); // Toggle sidebar

      // Should not throw errors
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });

    test('supports screen reader navigation', async () => {
      mockLocalStorage.getItem.mockReturnValue('resident-token');
      mockLocalStorage.getItem.mockReturnValueOnce('resident-token');
      mockLocalStorage.getItem.mockReturnValueOnce('resident');

      renderWithProviders(<App />, { route: '/dashboard/resident' });

      // Check for ARIA attributes
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText(/main navigation/i)).toBeInTheDocument();
    });
  });
});




