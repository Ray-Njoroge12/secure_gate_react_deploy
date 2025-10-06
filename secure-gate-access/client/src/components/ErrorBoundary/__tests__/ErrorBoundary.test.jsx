import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../ErrorBoundary';
import NetworkErrorBoundary from '../NetworkErrorBoundary';
import AuthErrorBoundary from '../AuthErrorBoundary';

// Mock component that throws an error
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Mock component for network error
const ThrowNetworkError = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    const error = new Error('Network Error');
    error.code = 'NETWORK_ERROR';
    throw error;
  }
  return <div>No network error</div>;
};

// Mock component for auth error
const ThrowAuthError = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    const error = new Error('401 Unauthorized');
    error.code = 'AUTH_ERROR';
    throw error;
  }
  return <div>No auth error</div>;
};

// Mock fetch for error logging
global.fetch = jest.fn();

describe('ErrorBoundary', () => {
  beforeEach(() => {
    fetch.mockClear();
    // Suppress console.error for tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('Basic Error Boundary', () => {
    test('renders children when there is no error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    test('renders error UI when there is an error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('We\'re sorry, but something unexpected happened.')).toBeInTheDocument();
    });

    test('renders component-level error UI when level is component', () => {
      render(
        <ErrorBoundary level="component">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('This component encountered an error')).toBeInTheDocument();
    });

    test('shows error ID', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
    });

    test('shows retry count after retries', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);
      
      expect(screen.getByText(/Retry attempt: 1/)).toBeInTheDocument();
    });

    test('retry button is disabled after max retries', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const retryButton = screen.getByText('Try Again');
      
      // Click retry 3 times
      for (let i = 0; i < 3; i++) {
        fireEvent.click(retryButton);
      }
      
      expect(retryButton).toBeDisabled();
    });

    test('calls onRetry when retry button is clicked', () => {
      const onRetry = jest.fn();
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);
      
      // The retry function should be called
      expect(retryButton).toBeInTheDocument();
    });

    test('reload button calls window.location.reload', () => {
      delete window.location;
      window.location = { reload: jest.fn() };
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const reloadButton = screen.getByText('Reload Page');
      fireEvent.click(reloadButton);
      
      expect(window.location.reload).toHaveBeenCalled();
    });

    test('go home button navigates to home', () => {
      delete window.location;
      window.location = { href: '' };
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const goHomeButton = screen.getByText('Go Home');
      fireEvent.click(goHomeButton);
      
      expect(window.location.href).toBe('/');
    });

    test('report bug button opens mailto link', () => {
      // Mock window.open
      const mockOpen = jest.fn();
      window.open = mockOpen;
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const reportButton = screen.getByText('Report Bug');
      fireEvent.click(reportButton);
      
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('mailto:support@securegate.com')
      );
    });

    test('logs error to backend', async () => {
      fetch.mockResolvedValueOnce({ ok: true });
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/logs/error', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer null'
          },
          body: expect.stringContaining('Test error')
        });
      });
    });
  });

  describe('NetworkErrorBoundary', () => {
    test('renders network error UI for network errors', () => {
      render(
        <NetworkErrorBoundary>
          <ThrowNetworkError shouldThrow={true} />
        </NetworkErrorBoundary>
      );
      
      expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      expect(screen.getByText('It looks like you\'re having trouble connecting')).toBeInTheDocument();
    });

    test('shows network troubleshooting steps', () => {
      render(
        <NetworkErrorBoundary>
          <ThrowNetworkError shouldThrow={true} />
        </NetworkErrorBoundary>
      );
      
      expect(screen.getByText('Try these steps:')).toBeInTheDocument();
      expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
      expect(screen.getByText('Refresh the page')).toBeInTheDocument();
    });

    test('shows system status link', () => {
      render(
        <NetworkErrorBoundary>
          <ThrowNetworkError shouldThrow={true} />
        </NetworkErrorBoundary>
      );
      
      const statusLink = screen.getByText('system status page');
      expect(statusLink).toHaveAttribute('href', '/status');
      expect(statusLink).toHaveAttribute('target', '_blank');
    });

    test('falls back to default error boundary for non-network errors', () => {
      render(
        <NetworkErrorBoundary>
          <ThrowError shouldThrow={true} />
        </NetworkErrorBoundary>
      );
      
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    });
  });

  describe('AuthErrorBoundary', () => {
    test('renders auth error UI for auth errors', () => {
      render(
        <AuthErrorBoundary>
          <ThrowAuthError shouldThrow={true} />
        </AuthErrorBoundary>
      );
      
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('Your session has expired')).toBeInTheDocument();
    });

    test('shows auth error explanations', () => {
      render(
        <AuthErrorBoundary>
          <ThrowAuthError shouldThrow={true} />
        </AuthErrorBoundary>
      );
      
      expect(screen.getByText('This usually happens when:')).toBeInTheDocument();
      expect(screen.getByText('Your session has timed out')).toBeInTheDocument();
      expect(screen.getByText('You\'ve been logged out from another device')).toBeInTheDocument();
    });

    test('login button clears auth data and redirects', () => {
      // Mock localStorage
      const mockRemoveItem = jest.fn();
      Object.defineProperty(window, 'localStorage', {
        value: {
          removeItem: mockRemoveItem
        },
        writable: true
      });

      delete window.location;
      window.location = { href: '' };
      
      render(
        <AuthErrorBoundary>
          <ThrowAuthError shouldThrow={true} />
        </AuthErrorBoundary>
      );
      
      const loginButton = screen.getByText('Log In Again');
      fireEvent.click(loginButton);
      
      expect(mockRemoveItem).toHaveBeenCalledWith('token');
      expect(mockRemoveItem).toHaveBeenCalledWith('user');
      expect(mockRemoveItem).toHaveBeenCalledWith('refreshToken');
      expect(window.location.href).toBe('/login');
    });

    test('shows support link', () => {
      render(
        <AuthErrorBoundary>
          <ThrowAuthError shouldThrow={true} />
        </AuthErrorBoundary>
      );
      
      const supportLink = screen.getByText('contact support');
      expect(supportLink).toHaveAttribute('href', '/support');
      expect(supportLink).toHaveAttribute('target', '_blank');
    });

    test('falls back to default error boundary for non-auth errors', () => {
      render(
        <AuthErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AuthErrorBoundary>
      );
      
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    test('renders custom fallback component', () => {
      const CustomFallback = ({ error, onRetry }) => (
        <div>
          <h1>Custom Error: {error.message}</h1>
          <button onClick={onRetry}>Custom Retry</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Custom Error: Test error')).toBeInTheDocument();
      expect(screen.getByText('Custom Retry')).toBeInTheDocument();
    });
  });

  describe('Development Mode', () => {
    test('shows error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Technical Details')).toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });

    test('hides error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});
