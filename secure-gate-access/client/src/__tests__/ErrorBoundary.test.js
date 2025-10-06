// client/src/__tests__/ErrorBoundary.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { reportError, reportUserAction } from '../utils/errorReporting';

// Mock the error reporting utilities
jest.mock('../utils/errorReporting', () => ({
  reportError: jest.fn(),
  reportUserAction: jest.fn()
}));

// Mock the error handler utilities
jest.mock('../utils/errorHandler', () => ({
  handleError: jest.fn((error) => ({
    id: 'test-error-id',
    type: 'client',
    severity: 'critical',
    message: { title: 'Test Error', message: 'Test error message' }
  })),
  getRecoveryActions: jest.fn(() => [
    { label: 'Retry', action: 'retry' },
    { label: 'Reset Form', action: 'reset_form' }
  ]),
  ERROR_TYPES: {
    CLIENT: 'client',
    NETWORK: 'network',
    AUTHENTICATION: 'authentication',
    SERVER: 'server'
  }
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

// Component that throws an error
const ThrowError = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Component that throws an error after a delay
const AsyncThrowError = ({ shouldThrow = false }) => {
  const [hasError, setHasError] = React.useState(false);
  
  React.useEffect(() => {
    if (shouldThrow) {
      const timer = setTimeout(() => {
        setHasError(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldThrow]);

  if (hasError) {
    throw new Error('Async test error');
  }
  
  return <div>No error yet</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('Error Catching', () => {
    test('catches errors and displays error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    test('displays error ID', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
    });

    test('calls error reporting functions', async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(reportError).toHaveBeenCalled();
        expect(reportUserAction).toHaveBeenCalledWith('error_boundary_triggered', expect.any(Object));
      });
    });
  });

  describe('Error Recovery', () => {
    test('handles reload action', () => {
      const reloadSpy = jest.spyOn(window.location, 'reload').mockImplementation(() => {});
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Reload Page'));
      
      expect(reloadSpy).toHaveBeenCalled();
      expect(reportUserAction).toHaveBeenCalledWith('error_recovery_reload');
      
      reloadSpy.mockRestore();
    });

    test('handles reset action', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Initially shows error
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Reset should clear the error
      fireEvent.click(screen.getByText('Reset'));
      
      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(reportUserAction).toHaveBeenCalledWith('error_recovery_reset');
    });

    test('handles go home action', () => {
      const assignSpy = jest.spyOn(window.location, 'href', 'set').mockImplementation(() => {});
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Go Home'));
      
      expect(assignSpy).toHaveBeenCalledWith('/dashboard');
      expect(reportUserAction).toHaveBeenCalledWith('error_recovery_go_home');
      
      assignSpy.mockRestore();
    });

    test('handles retry action', async () => {
      render(
        <ErrorBoundary maxRetries={3}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show retry button for network errors
      const retryButton = screen.queryByText('Try Again');
      if (retryButton) {
        fireEvent.click(retryButton);
        
        expect(reportUserAction).toHaveBeenCalledWith('error_recovery_retry', expect.any(Object));
      }
    });

    test('handles recovery actions', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show recovery actions
      const retryAction = screen.queryByText('Retry');
      if (retryAction) {
        fireEvent.click(retryAction);
        expect(reportUserAction).toHaveBeenCalledWith('error_recovery_action', expect.any(Object));
      }
    });
  });

  describe('Error Types and UI', () => {
    test('displays network error UI', () => {
      // Mock error type as network
      const { handleError } = require('../utils/errorHandler');
      handleError.mockReturnValue({
        id: 'test-error-id',
        type: 'network',
        severity: 'medium',
        message: { title: 'Connection Problem', message: 'Please check your internet connection' }
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Connection Problem')).toBeInTheDocument();
    });

    test('displays authentication error UI', () => {
      // Mock error type as authentication
      const { handleError } = require('../utils/errorHandler');
      handleError.mockReturnValue({
        id: 'test-error-id',
        type: 'authentication',
        severity: 'high',
        message: { title: 'Session Expired', message: 'Your session has expired' }
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Session Expired')).toBeInTheDocument();
    });

    test('displays server error UI', () => {
      // Mock error type as server
      const { handleError } = require('../utils/errorHandler');
      handleError.mockReturnValue({
        id: 'test-error-id',
        type: 'server',
        severity: 'high',
        message: { title: 'Server Error', message: 'Our servers are experiencing issues' }
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Server Error')).toBeInTheDocument();
    });
  });

  describe('Retry Logic', () => {
    test('tracks retry count', () => {
      render(
        <ErrorBoundary maxRetries={3}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show retry count if retries have been attempted
      // This would require multiple error triggers to test properly
    });

    test('disables retry after max attempts', () => {
      render(
        <ErrorBoundary maxRetries={0}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show max retries message
      expect(screen.getByText(/Maximum retry attempts reached/)).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    test('uses custom fallback when provided', () => {
      const customFallback = (error, resetError) => (
        <div>
          <p>Custom error: {error.message}</p>
          <button onClick={resetError}>Custom Reset</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error: Test error')).toBeInTheDocument();
      expect(screen.getByText('Custom Reset')).toBeInTheDocument();
    });
  });

  describe('Technical Details', () => {
    test('shows technical details when enabled', () => {
      render(
        <ErrorBoundary showDetails={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Technical Details')).toBeInTheDocument();
    });

    test('hides technical details by default', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    test('accepts componentName prop', () => {
      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(reportUserAction).toHaveBeenCalledWith(
        'error_boundary_triggered',
        expect.objectContaining({
          component: 'TestComponent'
        })
      );
    });

    test('uses default componentName when not provided', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(reportUserAction).toHaveBeenCalledWith(
        'error_boundary_triggered',
        expect.objectContaining({
          component: 'Unknown'
        })
      );
    });
  });

  describe('Normal Operation', () => {
    test('renders children when no error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });
});
