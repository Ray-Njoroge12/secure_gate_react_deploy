import React from 'react';
import logger from '../../../utils/logger';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '../AuthContext';

// Test component that uses the auth context
const TestComponent = () => {
  const { 
    isAuthenticated, 
    user, 
    loading, 
    login, 
    logout, 
    register 
  } = useAuth();

  const handleLogin = async () => {
    try {
      await login('test@example.com', 'password123');
    } catch (error) {
      logger.error('Login failed:', error);
    }
  };

  const handleRegister = async () => {
    try {
      await register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'resident'
      });
    } catch (error) {
      logger.error('Registration failed:', error);
    }
  };

  return (
    <div>
      <div data-testid="auth-status">
        {loading ? 'Loading...' : isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      <div data-testid="user-info">
        {user ? `${user.name} (${user.role})` : 'No user'}
      </div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleRegister}>Register</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

// Mock fetch
global.fetch = jest.fn();

describe('AuthContext', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('AuthProvider', () => {
    it('provides auth context to children', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
      expect(screen.getByTestId('user-info')).toHaveTextContent('No user');
    });

    it('throws error when useAuth is used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const TestComponentWithoutProvider = () => {
        useAuth();
        return <div>Test</div>;
      };

      expect(() => {
        render(<TestComponentWithoutProvider />);
      }).toThrow('useAuth must be used within an AuthProvider');
      
      consoleError.mockRestore();
    });
  });

  describe('Authentication Flow', () => {
    it('handles successful login', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'resident'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUser,
            token: 'mock-token'
          }
        })
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');

      await act(async () => {
        await userEvent.click(screen.getByText('Login'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
        expect(screen.getByTestId('user-info')).toHaveTextContent('Test User (resident)');
      });
    });

    it('handles login failure', async () => {
      fetch.mockRejectedValueOnce(new Error('Login failed'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        await userEvent.click(screen.getByText('Login'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
        expect(screen.getByTestId('user-info')).toHaveTextContent('No user');
      });
    });

    it('handles successful registration', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'resident'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUser,
            token: 'mock-token'
          }
        })
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        await userEvent.click(screen.getByText('Register'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
        expect(screen.getByTestId('user-info')).toHaveTextContent('Test User (resident)');
      });
    });

    it('handles registration failure', async () => {
      fetch.mockRejectedValueOnce(new Error('Registration failed'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        await userEvent.click(screen.getByText('Register'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
        expect(screen.getByTestId('user-info')).toHaveTextContent('No user');
      });
    });

    it('handles logout', async () => {
      // First login
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'resident'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUser,
            token: 'mock-token'
          }
        })
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        await userEvent.click(screen.getByText('Login'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      });

      // Then logout
      await act(async () => {
        await userEvent.click(screen.getByText('Logout'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
        expect(screen.getByTestId('user-info')).toHaveTextContent('No user');
      });
    });
  });

  describe('Token Management', () => {
    it('loads user from localStorage on mount', () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'resident'
      };

      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('user', JSON.stringify(mockUser));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-info')).toHaveTextContent('Test User (resident)');
    });

    it('clears localStorage on logout', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'resident'
      };

      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('user', JSON.stringify(mockUser));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        await userEvent.click(screen.getByText('Logout'));
      });

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('shows loading state during authentication', async () => {
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      fetch.mockReturnValueOnce(promise);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        await userEvent.click(screen.getByText('Login'));
      });

      expect(screen.getByTestId('auth-status')).toHaveTextContent('Loading...');

      await act(async () => {
        resolvePromise({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              user: { id: 1, email: 'test@example.com', name: 'Test User', role: 'resident' },
              token: 'mock-token'
            }
          })
        });
      });
    });
  });
});

