import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { LoadingProvider, useLoading, withLoading } from '../LoadingContext';

// Test component that uses the loading context
const TestComponent = () => {
  const { setLoading, isLoading, getLoading } = useLoading();
  
  const handleStartLoading = () => {
    setLoading('test-key', true, { message: 'Test loading...' });
  };
  
  const handleStopLoading = () => {
    setLoading('test-key', false);
  };

  return (
    <div>
      <button onClick={handleStartLoading}>Start Loading</button>
      <button onClick={handleStopLoading}>Stop Loading</button>
      <div data-testid="loading-status">
        {isLoading('test-key') ? 'Loading' : 'Not Loading'}
      </div>
      <div data-testid="loading-message">
        {getLoading('test-key').message || 'No message'}
      </div>
    </div>
  );
};

// Component wrapped with withLoading HOC
const WrappedComponent = withLoading(() => <div>Wrapped Content</div>, 'wrapped-key');

describe('LoadingContext', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('LoadingProvider', () => {
    it('provides loading context to children', () => {
      render(
        <LoadingProvider>
          <TestComponent />
        </LoadingProvider>
      );
      
      expect(screen.getByText('Not Loading')).toBeInTheDocument();
    });

    it('throws error when useLoading is used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const TestComponentWithoutProvider = () => {
        useLoading();
        return <div>Test</div>;
      };

      expect(() => {
        render(<TestComponentWithoutProvider />);
      }).toThrow('useLoading must be used within a LoadingProvider');
      
      consoleError.mockRestore();
    });
  });

  describe('useLoading hook', () => {
    it('manages loading state for specific key', async () => {
      const user = userEvent.setup();
      
      render(
        <LoadingProvider>
          <TestComponent />
        </LoadingProvider>
      );

      expect(screen.getByTestId('loading-status')).toHaveTextContent('Not Loading');
      
      await user.click(screen.getByText('Start Loading'));
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Loading');
      expect(screen.getByTestId('loading-message')).toHaveTextContent('Test loading...');
      
      await user.click(screen.getByText('Stop Loading'));
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Not Loading');
    });

    it('manages global loading state', async () => {
      const user = userEvent.setup();
      
      const GlobalTestComponent = () => {
        const { setGlobalLoadingState, globalLoading } = useLoading();
        
        return (
          <div>
            <button onClick={() => setGlobalLoadingState(true, { message: 'Global loading...' })}>
              Start Global Loading
            </button>
            <button onClick={() => setGlobalLoadingState(false)}>
              Stop Global Loading
            </button>
            <div data-testid="global-status">
              {globalLoading ? 'Global Loading' : 'Not Global Loading'}
            </div>
          </div>
        );
      };

      render(
        <LoadingProvider>
          <GlobalTestComponent />
        </LoadingProvider>
      );

      expect(screen.getByTestId('global-status')).toHaveTextContent('Not Global Loading');
      
      await user.click(screen.getByText('Start Global Loading'));
      expect(screen.getByTestId('global-status')).toHaveTextContent('Global Loading');
      
      await user.click(screen.getByText('Stop Global Loading'));
      expect(screen.getByTestId('global-status')).toHaveTextContent('Not Global Loading');
    });

    it('manages loading queue', async () => {
      const user = userEvent.setup();
      
      const QueueTestComponent = () => {
        const { addToQueue, removeFromQueue, getQueueLength, getNextInQueue } = useLoading();
        
        return (
          <div>
            <button onClick={() => addToQueue('item1', { message: 'Item 1' })}>
              Add Item 1
            </button>
            <button onClick={() => addToQueue('item2', { message: 'Item 2' })}>
              Add Item 2
            </button>
            <button onClick={() => removeFromQueue('item1')}>
              Remove Item 1
            </button>
            <div data-testid="queue-length">{getQueueLength()}</div>
            <div data-testid="next-item">
              {getNextInQueue()?.key || 'None'}
            </div>
          </div>
        );
      };

      render(
        <LoadingProvider>
          <QueueTestComponent />
        </LoadingProvider>
      );

      expect(screen.getByTestId('queue-length')).toHaveTextContent('0');
      expect(screen.getByTestId('next-item')).toHaveTextContent('None');
      
      await user.click(screen.getByText('Add Item 1'));
      expect(screen.getByTestId('queue-length')).toHaveTextContent('1');
      expect(screen.getByTestId('next-item')).toHaveTextContent('item1');
      
      await user.click(screen.getByText('Add Item 2'));
      expect(screen.getByTestId('queue-length')).toHaveTextContent('2');
      expect(screen.getByTestId('next-item')).toHaveTextContent('item1');
      
      await user.click(screen.getByText('Remove Item 1'));
      expect(screen.getByTestId('queue-length')).toHaveTextContent('1');
      expect(screen.getByTestId('next-item')).toHaveTextContent('item2');
    });

    it('clears all loading states', async () => {
      const user = userEvent.setup();
      
      const ClearTestComponent = () => {
        const { setLoading, clearAllLoading, isLoading } = useLoading();
        
        const handleSetMultiple = () => {
          setLoading('key1', true);
          setLoading('key2', true);
          setLoading('key3', true);
        };
        
        return (
          <div>
            <button onClick={handleSetMultiple}>Set Multiple</button>
            <button onClick={clearAllLoading}>Clear All</button>
            <div data-testid="key1-status">{isLoading('key1') ? 'Loading' : 'Not Loading'}</div>
            <div data-testid="key2-status">{isLoading('key2') ? 'Loading' : 'Not Loading'}</div>
            <div data-testid="key3-status">{isLoading('key3') ? 'Loading' : 'Not Loading'}</div>
          </div>
        );
      };

      render(
        <LoadingProvider>
          <ClearTestComponent />
        </LoadingProvider>
      );

      await user.click(screen.getByText('Set Multiple'));
      expect(screen.getByTestId('key1-status')).toHaveTextContent('Loading');
      expect(screen.getByTestId('key2-status')).toHaveTextContent('Loading');
      expect(screen.getByTestId('key3-status')).toHaveTextContent('Loading');
      
      await user.click(screen.getByText('Clear All'));
      expect(screen.getByTestId('key1-status')).toHaveTextContent('Not Loading');
      expect(screen.getByTestId('key2-status')).toHaveTextContent('Not Loading');
      expect(screen.getByTestId('key3-status')).toHaveTextContent('Not Loading');
    });
  });

  describe('withLoading HOC', () => {
    it('wraps component with loading overlay', () => {
      render(
        <LoadingProvider>
          <WrappedComponent />
        </LoadingProvider>
      );
      
      expect(screen.getByText('Wrapped Content')).toBeInTheDocument();
    });
  });

  describe('Global loading overlay', () => {
    it('renders global loading overlay when global loading is true', () => {
      const GlobalLoadingComponent = () => {
        const { setGlobalLoadingState } = useLoading();
        
        React.useEffect(() => {
          setGlobalLoadingState(true, { message: 'Global loading...' });
        }, [setGlobalLoadingState]);
        
        return <div>Content</div>;
      };

      render(
        <LoadingProvider>
          <GlobalLoadingComponent />
        </LoadingProvider>
      );
      
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Global loading...')).toBeInTheDocument();
    });
  });
});

