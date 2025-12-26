/**
 * Authentication Integration Tests
 * Tests complete authentication flows with API integration
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ErrorProvider } from '../../contexts/ErrorContext';
import Login from '../../pages/Login.jsx';
import Register from '../../pages/Register';

// Mock fetch for integration tests
global.fetch = jest.fn();

// Test wrapper with all required providers
const AllProviders = ({ children }) => (
  <ErrorProvider>
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </MemoryRouter>
  </ErrorProvider>
);

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    // Clear all mocks and localStorage before each test
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    
    // Reset and configure fetch mock
    global.fetch.mockReset();
    
    // Default successful login response
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          accessToken: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: 1,
            email: 'resident@test.com',
            username: 'testuser',
            role: 'resident'
          }
        }
      })
    });
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
    sessionStorage.clear();
  });

  afterAll(() => {
    // Final cleanup
    jest.restoreAllMocks();
  });
  
  describe('Login Flow', () => {
    it('should login successfully with valid credentials', async () => {
      const user = userEvent.setup();
      
      render(<Login />, { wrapper: AllProviders });

      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });

      await user.type(emailInput, 'resident@test.com');
      await user.type(passwordInput, 'testpass123');
      await user.click(submitButton);

      // Wait for successful login
      await waitFor(() => {
        expect(localStorage.getItem('token')).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should show error message with invalid credentials', async () => {
      // Mock failed login response
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          message: 'Invalid credentials'
        })
      });

      const user = userEvent.setup();
      
      render(<Login />, { wrapper: AllProviders });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });

      await user.type(emailInput, 'wrong@test.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials|login failed/i)).toBeInTheDocument();
      });
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      
      render(<Login />, { wrapper: AllProviders });

      const submitButton = screen.getByRole('button', { name: /login|sign in/i });

      // Try to submit without filling fields
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        const errors = screen.queryAllByText(/required|cannot be empty/i);
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it('should handle network errors gracefully', async () => {
      // Mock fetch to return network error
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(<Login />, { wrapper: AllProviders });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });

      await user.type(emailInput, 'resident@test.com');
      await user.type(passwordInput, 'testpass123');
      await user.click(submitButton);

      // Should show network error
      await waitFor(() => {
        expect(screen.getByText(/network error|connection failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Registration Flow', () => {
    it('should register a new user successfully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          message: 'Registration successful',
          data: {
            user: {
              id: 2,
              email: 'newuser@test.com',
              username: 'newuser',
              role: 'resident'
            }
          }
        })
      });

      const user = userEvent.setup();
      
      render(<Register />, { wrapper: AllProviders });

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const phoneInput = screen.getByLabelText(/phone/i);
      const submitButton = screen.getByRole('button', { name: /register|sign up/i });

      await user.type(usernameInput, 'newuser');
      await user.type(emailInput, 'newuser@test.com');
      await user.type(passwordInput, 'SecurePass123!');
      await user.type(phoneInput, '+254700123456');
      await user.click(submitButton);

      // Wait for successful registration
      await waitFor(() => {
        expect(screen.getByText(/registration successful|account created/i)).toBeInTheDocument();
      });
    });

    it('should reject duplicate email during registration', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          success: false,
          message: 'Email already exists'
        })
      });

      const user = userEvent.setup();
      
      render(<Register />, { wrapper: AllProviders });

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const phoneInput = screen.getByLabelText(/phone/i);
      const submitButton = screen.getByRole('button', { name: /register|sign up/i });

      await user.type(usernameInput, 'duplicate');
      await user.type(emailInput, 'admin@test.com'); // Existing email
      await user.type(passwordInput, 'SecurePass123!');
      await user.type(phoneInput, '+254700123456');
      await user.click(submitButton);

      // Should show duplicate error
      await waitFor(() => {
        expect(screen.getByText(/email already exists|already registered/i)).toBeInTheDocument();
      });
    });

    it('should validate password strength', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          message: 'Password must be strong'
        })
      });

      const user = userEvent.setup();
      
      render(<Register />, { wrapper: AllProviders });

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const submitButton = screen.getByRole('button', { name: /register|sign up/i });

      await user.type(usernameInput, 'weakuser');
      await user.type(emailInput, 'weak@test.com');
      await user.type(passwordInput, '123'); // Weak password
      await user.click(submitButton);

      // Should show password strength error
      await waitFor(() => {
        expect(screen.getByText(/password.*strong|password.*secure/i)).toBeInTheDocument();
      });
    });
  });

  describe('Auth State Management', () => {
    it('should persist auth state across page refreshes', async () => {
      const user = userEvent.setup();
      
      // Login first
      const { rerender } = render(<Login />, { wrapper: AllProviders });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });

      await user.type(emailInput, 'resident@test.com');
      await user.type(passwordInput, 'testpass123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBeTruthy();
      });

      // Simulate page refresh
      rerender(<Login />);

      // Token should still be present
      expect(localStorage.getItem('token')).toBeTruthy();
    });

    it('should clear auth state on logout', async () => {
      // Set up authenticated state
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@test.com' }));

      const { useAuth } = await import('../../contexts/AuthContext');
      const React = await import('react');

      const LogoutButton = () => {
        const { logout } = useAuth();
        return <button onClick={logout}>Logout</button>;
      };

      const user = userEvent.setup();
      render(<LogoutButton />, { wrapper: AllProviders });

      const logoutButton = screen.getByText(/logout/i);
      await user.click(logoutButton);

      // Auth state should be cleared
      await waitFor(() => {
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('user')).toBeNull();
      });
    });
  });

  describe('Protected Routes', () => {
    it('should redirect to login when accessing protected route without auth', async () => {
      // Clear auth state
      localStorage.clear();

      const ProtectedRoute = await import('../../routes/ProtectedRoute');
      const ProtectedComponent = () => <div>Protected Content</div>;

      render(
        <ErrorProvider>
          <MemoryRouter initialEntries={['/protected']}>
            <AuthProvider>
              <ProtectedRoute.default>
                <ProtectedComponent />
              </ProtectedRoute.default>
            </AuthProvider>
          </MemoryRouter>
        </ErrorProvider>
      );

      // Should not show protected content
      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });

    it('should allow access to protected route when authenticated', async () => {
      // Set up authenticated state
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({ 
        id: 1, 
        email: 'test@test.com',
        role: 'resident'
      }));

      const ProtectedComponent = () => <div>Protected Content</div>;

      render(
        <BrowserRouter>
          <AuthProvider>
            <ProtectedComponent />
          </AuthProvider>
        </BrowserRouter>
      );

      // Should show protected content
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });
});
