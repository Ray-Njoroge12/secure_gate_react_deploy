import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { LoadingProvider } from '../../contexts/LoadingContext';
import { useLoadingState } from '../../hooks/useLoadingState';
import LoadingStates from '../../components/ui/LoadingStates';
import Skeleton from '../../components/ui/Skeleton';

// Test component that demonstrates loading integration
const LoadingIntegrationTest = () => {
  const { loading, message, startLoading, stopLoading, setLoadingError } = useLoadingState();
  const [data, setData] = React.useState(null);

  const fetchData = async () => {
    try {
      startLoading({ message: 'Fetching data...', progress: 0 });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setData({ id: 1, name: 'Test Data' });
      stopLoading();
    } catch (error) {
      setLoadingError('Failed to fetch data');
    }
  };

  return (
    <div>
      <button onClick={fetchData}>Fetch Data</button>
      
      {loading && <div data-testid="loading-message">{message}</div>}
      
      <LoadingStates.Card loading={loading} skeleton>
        <div>
          <h3>Data Card</h3>
          {data ? (
            <p>Name: {data.name}</p>
          ) : (
            <p>No data available</p>
          )}
        </div>
      </LoadingStates.Card>
      
      <LoadingStates.List loading={loading} skeleton>
        <div>
          <h3>Data List</h3>
          {data ? (
            <ul>
              <li>ID: {data.id}</li>
              <li>Name: {data.name}</li>
            </ul>
          ) : (
            <p>No items to display</p>
          )}
        </div>
      </LoadingStates.List>
    </div>
  );
};

// Test component with multiple loading states
const MultipleLoadingTest = () => {
  const { loading: loading1, startLoading: start1, stopLoading: stop1 } = useLoadingState();
  const { loading: loading2, startLoading: start2, stopLoading: stop2 } = useLoadingState();
  const [data1, setData1] = React.useState(null);
  const [data2, setData2] = React.useState(null);

  const fetchData1 = async () => {
    start1({ message: 'Fetching data 1...' });
    await new Promise(resolve => setTimeout(resolve, 50));
    setData1({ id: 1, name: 'Data 1' });
    stop1();
  };

  const fetchData2 = async () => {
    start2({ message: 'Fetching data 2...' });
    await new Promise(resolve => setTimeout(resolve, 75));
    setData2({ id: 2, name: 'Data 2' });
    stop2();
  };

  const fetchBoth = async () => {
    await Promise.all([fetchData1(), fetchData2()]);
  };

  return (
    <div>
      <button onClick={fetchData1}>Fetch Data 1</button>
      <button onClick={fetchData2}>Fetch Data 2</button>
      <button onClick={fetchBoth}>Fetch Both</button>
      
      <div>
        <h3>Data 1</h3>
        <LoadingStates.Card loading={loading1} skeleton>
          {data1 ? <p>{data1.name}</p> : <p>No data</p>}
        </LoadingStates.Card>
      </div>
      
      <div>
        <h3>Data 2</h3>
        <LoadingStates.Card loading={loading2} skeleton>
          {data2 ? <p>{data2.name}</p> : <p>No data</p>}
        </LoadingStates.Card>
      </div>
    </div>
  );
};

// Test component with progress loading
const ProgressLoadingTest = () => {
  const { loading, startLoading, updateProgress, stopLoading } = useLoadingState();
  const [progress, setProgress] = React.useState(0);

  const startProgressLoading = async () => {
    startLoading({ message: 'Processing...', progress: 0 });
    
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 50));
      updateProgress(i, `Processing... ${i}%`);
      setProgress(i);
    }
    
    stopLoading();
  };

  return (
    <div>
      <button onClick={startProgressLoading}>Start Progress</button>
      
      {loading && (
        <LoadingStates.Progress 
          progress={progress} 
          message={`Processing... ${progress}%`}
          showPercentage
        />
      )}
      
      <div>
        <h3>Progress: {progress}%</h3>
      </div>
    </div>
  );
};

describe('Loading System Integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Loading Integration', () => {
    it('integrates loading state with skeleton components', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <LoadingProvider>
          <LoadingIntegrationTest />
        </LoadingProvider>
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
      expect(screen.getByText('No items to display')).toBeInTheDocument();

      await user.click(screen.getByText('Fetch Data'));
      
      // Should show skeleton loading
      expect(screen.getByText('Fetching data...')).toBeInTheDocument();
      
      // Wait for loading to complete
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Name: Test Data')).toBeInTheDocument();
        expect(screen.getByText('ID: 1')).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Loading States', () => {
    it('handles multiple independent loading states', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <LoadingProvider>
          <MultipleLoadingTest />
        </LoadingProvider>
      );

      // Start first loading
      await user.click(screen.getByText('Fetch Data 1'));
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Data 1')).toBeInTheDocument();
      });

      // Start second loading
      await user.click(screen.getByText('Fetch Data 2'));
      
      await act(async () => {
        jest.advanceTimersByTime(75);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Data 2')).toBeInTheDocument();
      });
    });

    it('handles concurrent loading operations', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <LoadingProvider>
          <MultipleLoadingTest />
        </LoadingProvider>
      );

      // Start both loadings concurrently
      await user.click(screen.getByText('Fetch Both'));
      
      await act(async () => {
        jest.advanceTimersByTime(75); // Wait for both to complete
      });
      
      await waitFor(() => {
        expect(screen.getByText('Data 1')).toBeInTheDocument();
        expect(screen.getByText('Data 2')).toBeInTheDocument();
      });
    });
  });

  describe('Progress Loading', () => {
    it('shows progress loading with updates', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <LoadingProvider>
          <ProgressLoadingTest />
        </LoadingProvider>
      );

      await user.click(screen.getByText('Start Progress'));
      
      // Check initial progress
      expect(screen.getByText('Processing... 0%')).toBeInTheDocument();
      expect(screen.getByText('Progress: 0%')).toBeInTheDocument();
      
      // Advance through progress
      for (let i = 10; i <= 100; i += 10) {
        await act(async () => {
          jest.advanceTimersByTime(50);
        });
        
        await waitFor(() => {
          expect(screen.getByText(`Processing... ${i}%`)).toBeInTheDocument();
          expect(screen.getByText(`Progress: ${i}%`)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('handles loading errors gracefully', async () => {
      const ErrorTestComponent = () => {
        const { loading, startLoading, setLoadingError } = useLoadingState();
        const [error, setError] = React.useState(null);

        const fetchWithError = async () => {
          startLoading({ message: 'Fetching...' });
          
          setTimeout(() => {
            setLoadingError('Network error');
            setError('Network error');
          }, 50);
        };

        return (
          <div>
            <button onClick={fetchWithError}>Fetch with Error</button>
            
            <LoadingStates.Card loading={loading} skeleton>
              <div>
                <h3>Data Card</h3>
                {error ? <p className="text-red-500">Error: {error}</p> : <p>No data</p>}
              </div>
            </LoadingStates.Card>
          </div>
        );
      };

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <LoadingProvider>
          <ErrorTestComponent />
        </LoadingProvider>
      );

      await user.click(screen.getByText('Fetch with Error'));
      
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Error: Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Skeleton Component Integration', () => {
    it('renders appropriate skeleton components for different content types', () => {
      render(
        <div>
          <Skeleton.Card showAvatar showActions lines={3} />
          <Skeleton.Table rows={3} columns={4} />
          <Skeleton.Form fields={4} showSubmit />
          <Skeleton.List items={5} showAvatar />
        </div>
      );

      // Check that skeleton components are rendered
      expect(screen.getAllByRole('generic')).toHaveLength(20); // Multiple skeleton elements
    });

    it('integrates skeleton components with loading states', () => {
      const { rerender } = render(
        <LoadingStates.Card loading skeleton>
          <div>Content</div>
        </LoadingStates.Card>
      );

      // Should show skeleton when loading
      expect(screen.getByRole('generic')).toHaveClass('bg-slate-800');

      rerender(
        <LoadingStates.Card loading={false} skeleton>
          <div>Content</div>
        </LoadingStates.Card>
      );

      // Should show content when not loading
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});

