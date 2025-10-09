import React from 'react';
import logger from 'utils/logger';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { LoadingProvider, useLoading } from '../../contexts/LoadingContext';

// Test component that uses the loading context
const TestComponent = () => {
  const { 
    setLoading, 
    isLoading, 
    setGlobalLoadingState, 
    addToQueue, 
    removeFromQueue,
    clearAllLoading,
    getLoadingMessage,
    getLoadingProgress,
    getQueueLength
  } = useLoading();

  const [loadingStates, setLoadingStates] = React.useState({});

  const handleSetLoading = () => {
    setLoading('test', true, { message: 'Loading test data...', progress: 50 });
  };

  const handleStopLoading = () => {
    setLoading('test', false);
  };

  const handleGlobalLoading = () => {
    setGlobalLoadingState(true, { message: 'Global loading...' });
  };

  const handleStopGlobalLoading = () => {
    setGlobalLoadingState(false);
  };

  const handleAddToQueue = () => {
    addToQueue('queue1', { message: 'Queue item 1' });
    addToQueue('queue2', { message: 'Queue item 2' });
  };

  const handleRemoveFromQueue = () => {
    removeFromQueue('queue1');
  };

  const handleClearAll = () => {
    clearAllLoading();
  };

  return (
    <div>
      <button onClick={handleSetLoading}>Start Loading</button>
      <button onClick={handleStopLoading}>Stop Loading</button>
      <button onClick={handleGlobalLoading}>Start Global Loading</button>
      <button onClick={handleStopGlobalLoading}>Stop Global Loading</button>
      <button onClick={handleAddToQueue}>Add to Queue</button>
      <button onClick={handleRemoveFromQueue}>Remove from Queue</button>
      <button onClick={handleClearAll}>Clear All</button>
      
      <div data-testid="loading-status">
        {isLoading('test') ? 'Loading' : 'Not Loading'}
      </div>
      
      <div data-testid="global-loading-status">
        {isLoading() ? 'Global Loading' : 'Not Global Loading'}
      </div>
      
      <div data-testid="loading-message">
        {getLoadingMessage('test')}
      </div>
      
      <div data-testid="loading-progress">
        {getLoadingProgress('test')}
      </div>
      
      <div data-testid="queue-length">
        {getQueueLength()}
      </div>
    </div>
  );
};

// Helper to render with LoadingProvider
const renderWithLoadingProvider = (ui) => {
  return render(
    <LoadingProvider>
      {ui}
    </LoadingProvider>
  );
};

describe('LoadingContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('provides loading context to children', () => {
    renderWithLoadingProvider(<TestComponent />);
    
    expect(screen.getByText('Start Loading')).toBeInTheDocument();
    expect(screen.getByText('Stop Loading')).toBeInTheDocument();
    expect(screen.getByText('Start Global Loading')).toBeInTheDocument();
    expect(screen.getByText('Stop Global Loading')).toBeInTheDocument();
  });

  test('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useLoading must be used within a LoadingProvider');

    console.error = originalError;
  });

  test('manages loading state for specific key', async () => {
    renderWithLoadingProvider(<TestComponent />);
    
    // Initially not loading
    expect(screen.getByTestId('loading-status')).toHaveTextContent('Not Loading');
    
    // Start loading
    fireEvent.click(screen.getByText('Start Loading'));
    
    await waitFor(() => {
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Loading');
      expect(screen.getByTestId('loading-message')).toHaveTextContent('Loading test data...');
      expect(screen.getByTestId('loading-progress')).toHaveTextContent('50');
    });
    
    // Stop loading
    fireEvent.click(screen.getByText('Stop Loading'));
    
    await waitFor(() => {
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Not Loading');
    });
  });

  test('manages global loading state', async () => {
    renderWithLoadingProvider(<TestComponent />);
    
    // Initially not global loading
    expect(screen.getByTestId('global-loading-status')).toHaveTextContent('Not Global Loading');
    
    // Start global loading
    fireEvent.click(screen.getByText('Start Global Loading'));
    
    await waitFor(() => {
      expect(screen.getByTestId('global-loading-status')).toHaveTextContent('Global Loading');
    });
    
    // Stop global loading
    fireEvent.click(screen.getByText('Stop Global Loading'));
    
    await waitFor(() => {
      expect(screen.getByTestId('global-loading-status')).toHaveTextContent('Not Global Loading');
    });
  });

  test('manages loading queue', async () => {
    renderWithLoadingProvider(<TestComponent />);
    
    // Initially empty queue
    expect(screen.getByTestId('queue-length')).toHaveTextContent('0');
    
    // Add items to queue
    fireEvent.click(screen.getByText('Add to Queue'));
    
    await waitFor(() => {
      expect(screen.getByTestId('queue-length')).toHaveTextContent('2');
    });
    
    // Remove item from queue
    fireEvent.click(screen.getByText('Remove from Queue'));
    
    await waitFor(() => {
      expect(screen.getByTestId('queue-length')).toHaveTextContent('1');
    });
  });

  test('clears all loading states', async () => {
    renderWithLoadingProvider(<TestComponent />);
    
    // Start loading and add to queue
    fireEvent.click(screen.getByText('Start Loading'));
    fireEvent.click(screen.getByText('Add to Queue'));
    
    await waitFor(() => {
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Loading');
      expect(screen.getByTestId('queue-length')).toHaveTextContent('2'); // 2 items added to queue
    });
    
    // Clear all
    fireEvent.click(screen.getByText('Clear All'));
    
    await waitFor(() => {
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Not Loading');
      expect(screen.getByTestId('queue-length')).toHaveTextContent('0');
    });
  });

  test('withLoading HOC works correctly', () => {
    const TestWrappedComponent = ({ loading }) => (
      <div data-testid="wrapped-content">
        {loading ? 'Loading...' : 'Content loaded'}
      </div>
    );

    const { withLoading } = require('../../contexts/LoadingContext');
    const WrappedComponent = withLoading(TestWrappedComponent, 'test');

    renderWithLoadingProvider(<WrappedComponent />);
    
    expect(screen.getByTestId('wrapped-content')).toHaveTextContent('Content loaded');
  });

  // useLoadingState hook test removed - hook not implemented yet

  test('handles multiple loading states simultaneously', async () => {
    const TestMultipleComponent = () => {
      const { setLoading, isLoading } = useLoading();

      const startMultiple = () => {
        setLoading('loading1', true, { message: 'Loading 1' });
        setLoading('loading2', true, { message: 'Loading 2' });
      };

      const stopMultiple = () => {
        setLoading('loading1', false);
        setLoading('loading2', false);
      };

      return (
        <div>
          <button onClick={startMultiple}>Start Multiple</button>
          <button onClick={stopMultiple}>Stop Multiple</button>
          <div data-testid="loading1">{isLoading('loading1') ? 'Loading 1' : 'Not Loading 1'}</div>
          <div data-testid="loading2">{isLoading('loading2') ? 'Loading 2' : 'Not Loading 2'}</div>
        </div>
      );
    };

    renderWithLoadingProvider(<TestMultipleComponent />);
    
    fireEvent.click(screen.getByText('Start Multiple'));
    
    await waitFor(() => {
      expect(screen.getByTestId('loading1')).toHaveTextContent('Loading 1');
      expect(screen.getByTestId('loading2')).toHaveTextContent('Loading 2');
    });
    
    fireEvent.click(screen.getByText('Stop Multiple'));
    
    await waitFor(() => {
      expect(screen.getByTestId('loading1')).toHaveTextContent('Not Loading 1');
      expect(screen.getByTestId('loading2')).toHaveTextContent('Not Loading 2');
    });
  });
});
