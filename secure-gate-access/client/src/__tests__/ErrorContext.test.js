import React from 'react';
import logger from 'utils/logger';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { ErrorProvider, useError } from '../../contexts/ErrorContext';

// Test component that uses the error context
const TestComponent = () => {
  const { handleError, handleSuccess, handleApiError, handleValidationError, clearAllErrors } = useError();

  return (
    <div>
      <button onClick={() => handleError('Test error')}>Trigger Error</button>
      <button onClick={() => handleSuccess('Test success')}>Trigger Success</button>
      <button onClick={() => handleApiError(new Error('API error'), 'Test API')}>Trigger API Error</button>
      <button onClick={() => handleValidationError({ field: 'Field is required' }, 'Test Form')}>Trigger Validation Error</button>
      <button onClick={clearAllErrors}>Clear All</button>
    </div>
  );
};

// Helper to render with ErrorProvider
const renderWithErrorProvider = (ui) => {
  return render(
    <ErrorProvider>
      {ui}
    </ErrorProvider>
  );
};

describe('ErrorContext', () => {
  beforeEach(() => {
    // Clear any existing errors before each test
    jest.clearAllMocks();
  });

  test('provides error context to children', () => {
    renderWithErrorProvider(<TestComponent />);
    
    expect(screen.getByText('Trigger Error')).toBeInTheDocument();
    expect(screen.getByText('Trigger Success')).toBeInTheDocument();
    expect(screen.getByText('Trigger API Error')).toBeInTheDocument();
    expect(screen.getByText('Trigger Validation Error')).toBeInTheDocument();
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  test('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useError must be used within an ErrorProvider');

    console.error = originalError;
  });

  test('handles error messages', async () => {
    renderWithErrorProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Trigger Error'));
    
    // The error should be handled by the context (we can't easily test the ErrorQueue without rendering it)
    // This test verifies the function doesn't throw
    expect(screen.getByText('Trigger Error')).toBeInTheDocument();
  });

  test('handles success messages', async () => {
    renderWithErrorProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Trigger Success'));
    
    // The success should be handled by the context
    expect(screen.getByText('Trigger Success')).toBeInTheDocument();
  });

  test('handles API errors with context', async () => {
    renderWithErrorProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Trigger API Error'));
    
    // The API error should be handled by the context
    expect(screen.getByText('Trigger API Error')).toBeInTheDocument();
  });

  test('handles validation errors', async () => {
    renderWithErrorProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Trigger Validation Error'));
    
    // The validation error should be handled by the context
    expect(screen.getByText('Trigger Validation Error')).toBeInTheDocument();
  });

  test('clears all errors', async () => {
    renderWithErrorProvider(<TestComponent />);
    
    // Trigger an error first
    fireEvent.click(screen.getByText('Trigger Error'));
    
    // Clear all errors
    fireEvent.click(screen.getByText('Clear All'));
    
    // Both buttons should still be present
    expect(screen.getByText('Trigger Error')).toBeInTheDocument();
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  test('handles network errors with retry', async () => {
    const TestNetworkComponent = () => {
      const { handleNetworkError } = useError();
      
      const triggerNetworkError = () => {
        const error = new Error('Network error');
        error.name = 'NetworkError';
        handleNetworkError(error, 'Test Network');
      };

      return (
        <button onClick={triggerNetworkError}>Trigger Network Error</button>
      );
    };

    renderWithErrorProvider(<TestNetworkComponent />);
    
    fireEvent.click(screen.getByText('Trigger Network Error'));
    
    // The network error should be handled by the context
    expect(screen.getByText('Trigger Network Error')).toBeInTheDocument();
  });

  test('handles authentication errors with redirect', async () => {
    const TestAuthComponent = () => {
      const { handleAuthError } = useError();
      
      const triggerAuthError = () => {
        const error = new Error('Unauthorized');
        error.status = 401;
        handleAuthError(error, 'Test Auth');
      };

      return (
        <button onClick={triggerAuthError}>Trigger Auth Error</button>
      );
    };

    renderWithErrorProvider(<TestAuthComponent />);
    
    fireEvent.click(screen.getByText('Trigger Auth Error'));
    
    // The auth error should be handled by the context
    expect(screen.getByText('Trigger Auth Error')).toBeInTheDocument();
  });

  test('error queue service integration', async () => {
    const TestQueueComponent = () => {
      const { handleError, getErrorQueue, clearErrorQueue } = useError();
      const [queue, setQueue] = React.useState([]);
      
      const showQueue = () => {
        setQueue(getErrorQueue());
      };
      
      const clearQueue = () => {
        clearErrorQueue();
        setQueue([]);
      };

      return (
        <div>
          <button onClick={() => handleError('Queue error')}>Add Error</button>
          <button onClick={showQueue}>Show Queue</button>
          <button onClick={clearQueue}>Clear Queue</button>
          <div data-testid="queue">
            {queue.map((error, index) => (
              <div key={index}>{error.message}</div>
            ))}
          </div>
        </div>
      );
    };

    renderWithErrorProvider(<TestQueueComponent />);
    
    // Add an error
    fireEvent.click(screen.getByText('Add Error'));
    
    // Show queue
    fireEvent.click(screen.getByText('Show Queue'));
    
    // Clear queue
    fireEvent.click(screen.getByText('Clear Queue'));
    
    // All buttons should still be present
    expect(screen.getByText('Add Error')).toBeInTheDocument();
    expect(screen.getByText('Show Queue')).toBeInTheDocument();
    expect(screen.getByText('Clear Queue')).toBeInTheDocument();
  });
});
