/**
 * Authentication Integration Tests
 * Tests complete authentication flows with API integration via MSW
 */

import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ErrorProvider } from '../../contexts/ErrorContext';
import Login from '../../pages/Login.jsx';
import Register from '../../pages/Register';
import ErrorQueue from '../../components/ErrorQueue';
import { server } from '../../mocks/server';
import { rest } from 'msw';

// PROPERLY IMPORT THE REAL SERVICE
jest.unmock('../../services/errorQueueService');
jest.unmock('../../services/errorQueueService.js');
import errorQueueService from '../../services/errorQueueService';

console.log('[DIAGNOSTIC] Real Service:', errorQueueService);

const TestWrapper = ({ children, initialRoute = '/login' }) => (
  <ErrorProvider>
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard/resident" element={<div>Resident Dashboard</div>} />
          <Route path="/dashboard/guard" element={<div>Guard Dashboard</div>} />
          <Route path="/dashboard/admin" element={<div>Admin Dashboard</div>} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
        {children}
        <ErrorQueue />
      </AuthProvider>
    </MemoryRouter>
  </ErrorProvider>
);

describe('Authentication Integration Tests', () => {
  // Stateful mock storage
  let mockErrors = [];
  let mockSubscribers = new Set();

  const notify = () => {
    mockSubscribers.forEach(cb => {
      try { cb([...mockErrors]); } catch (e) { }
    });
  };

  beforeEach(() => {
    // Reset React state
    cleanup();
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    // Reset mock state
    mockErrors = [];
    mockSubscribers = new Set();

    // Setup spies on the Singleton instance
    // Note: We mock implementation so the real methods are NOT called.

    jest.spyOn(errorQueueService, 'addError').mockImplementation((error) => {
      const id = Math.random().toString(36).substring(7);
      mockErrors.push({ ...error, id });
      notify();
      return id;
    });

    jest.spyOn(errorQueueService, 'getErrors').mockImplementation(() => [...mockErrors]);

    jest.spyOn(errorQueueService, 'clearAll').mockImplementation(() => {
      mockErrors = [];
      notify();
    });

    jest.spyOn(errorQueueService, 'removeError').mockImplementation((id) => {
      mockErrors = mockErrors.filter(e => e.id !== id);
      notify();
    });

    jest.spyOn(errorQueueService, 'subscribe').mockImplementation((callback) => {
      mockSubscribers.add(callback);
      callback([...mockErrors]);
      return () => {
        mockSubscribers.delete(callback);
      };
    });

    jest.spyOn(errorQueueService, 'getErrorCount').mockImplementation(() => mockErrors.length);
    jest.spyOn(errorQueueService, 'getErrorsByType').mockImplementation((type) => mockErrors.filter(e => e.type === type));
    jest.spyOn(errorQueueService, 'clearByType').mockImplementation((type) => {
      mockErrors = mockErrors.filter(e => e.type !== type);
      notify();
    });
    jest.spyOn(errorQueueService, 'getErrorCountByType').mockImplementation((type) => mockErrors.filter(e => e.type === type).length);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Login Flow', () => {
    it('should login successfully with valid credentials', async () => {
      const user = userEvent.setup();

      render(<TestWrapper initialRoute="/login" />);

      const emailInput = await screen.findByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in|login/i });

      await user.type(emailInput, 'resident@test.com');
      await user.type(passwordInput, 'testpass123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Resident Dashboard')).toBeInTheDocument();
      });
    });

    it('should show error message with invalid credentials', async () => {
      const user = userEvent.setup();

      render(<TestWrapper initialRoute="/login" />);

      const emailInput = await screen.findByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in|login/i });

      await user.type(emailInput, 'wrong@test.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      // Handle potential multiple elements (toast + inline) and generic text
      const errorMessages = await screen.findAllByText(/Invalid credentials|Login Failed|unexpected error/i, {}, { timeout: 3000 });
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    it('should handle network errors gracefully', async () => {
      server.use(
        rest.post('*/api/auth/login', (req, res, ctx) => {
          return res.networkError('Failed to connect');
        })
      );

      const user = userEvent.setup();
      render(<TestWrapper initialRoute="/login" />);

      const emailInput = await screen.findByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in|login/i });

      await user.type(emailInput, 'resident@test.com');
      await user.type(passwordInput, 'testpass123');
      await user.click(submitButton);

      const errorMessages = await screen.findAllByText(/Failed to connect|Network Error|Login Failed/i, {}, { timeout: 3000 });
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Registration Flow', () => {
    it('should register a new user successfully', async () => {
      const user = userEvent.setup();

      render(<TestWrapper initialRoute="/register" />);

      const usernameInput = await screen.findByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const phoneInput = screen.getByLabelText(/phone/i);
      const houseInput = screen.getByLabelText(/house/i);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      const privacyCheckbox = screen.getByLabelText(/i agree to the/i);

      await user.type(usernameInput, 'newuser');
      await user.type(emailInput, 'newuser@test.com');
      await user.type(passwordInput, 'SecurePass123!');
      await user.type(confirmPasswordInput, 'SecurePass123!');
      await user.type(phoneInput, '+254700123456');
      await user.type(houseInput, 'H101');

      await user.click(privacyCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Registration successful/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should reject duplicate email', async () => {
      const user = userEvent.setup();

      render(<TestWrapper initialRoute="/register" />);

      const usernameInput = await screen.findByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const phoneInput = screen.getByLabelText(/phone/i);
      const houseInput = screen.getByLabelText(/house/i);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      const privacyCheckbox = screen.getByLabelText(/i agree to the/i);

      await user.type(usernameInput, 'duplicate');
      await user.type(emailInput, 'duplicate@test.com');
      await user.type(passwordInput, 'SecurePass123!');
      await user.type(confirmPasswordInput, 'SecurePass123!');
      await user.type(phoneInput, '+254700123456');
      await user.type(houseInput, 'H101');

      await user.click(privacyCheckbox);
      await user.click(submitButton);

      const errorMessages = await screen.findAllByText(/email.*already.*(exist|register)/i, {}, { timeout: 3000 });
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Protected Routes', () => {
    it('should allow access when authenticated', async () => {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost';
      server.use(
        rest.get(`${API_BASE_URL}/api/auth/me`, (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.json({
              success: true,
              data: {
                user: { id: 1, role: 'resident', username: 'test' }
              }
            })
          );
        })
      );

      const ProtectedComponent = () => <div>Protected Content</div>;
      const ProtectedRoute = require('../../routes/ProtectedRoute').default;

      render(
        <ErrorProvider>
          <MemoryRouter initialEntries={['/protected']}>
            <AuthProvider>
              <Routes>
                <Route path="/protected" element={
                  <ProtectedRoute>
                    <ProtectedComponent />
                  </ProtectedRoute>
                } />
                <Route path="/login" element={<div>Login Page</div>} />
              </Routes>
              <ErrorQueue />
            </AuthProvider>
          </MemoryRouter>
        </ErrorProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('should redirect to login when unauthenticated', async () => {
      const ProtectedComponent = () => <div>Protected Content</div>;
      const ProtectedRoute = require('../../routes/ProtectedRoute').default;

      render(
        <ErrorProvider>
          <MemoryRouter initialEntries={['/protected']}>
            <AuthProvider>
              <Routes>
                <Route path="/protected" element={
                  <ProtectedRoute>
                    <ProtectedComponent />
                  </ProtectedRoute>
                } />
                <Route path="/login" element={<div>Login Page</div>} />
              </Routes>
              <ErrorQueue />
            </AuthProvider>
          </MemoryRouter>
        </ErrorProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });
    });
  });
});
