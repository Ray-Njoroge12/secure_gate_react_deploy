/**
 * LoadingStatesIntegration Component Tests
 */

import React from 'react';
import logger from '../../../../utils/logger';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import '@testing-library/jest-dom';
import { 
  useLoadingIntegration,
  LoadingStatesProvider,
  PageLoadingWrapper,
  ComponentLoadingWrapper,
  ButtonLoadingWrapper,
  GlobalLoadingIndicator,
} from '../LoadingStatesIntegration';
import { LOADING_TYPES, LOADING_PRIORITIES } from '../../../hooks/useLoadingStates';

// Test component that uses the loading integration
const TestComponent = () => {
  const { 
    startLoading, 
    completeLoading, 
    getLoadingState, 
    isAnyLoading,
    clearLoading,
    setLoadingProgress,
    setLoadingMessage,
  } = useLoadingIntegration();

  const handleStartLoading = () => {
    startLoading('test-key', {
      type: LOADING_TYPES.SUBMIT,
      message: 'Testing...',
    });
  };

  const handleCompleteLoading = () => {
    completeLoading('test-key', { success: true });
  };

  const handleClearLoading = () => {
    clearLoading('test-key');
  };

  const handleSetProgress = () => {
    setLoadingProgress('test-key', 50);
  };

  const handleSetMessage = () => {
    setLoadingMessage('test-key', 'Updated message');
  };

  const loadingState = getLoadingState('test-key');

  return (
    <div>
      <div data-testid="loading-state">
        {loadingState.isLoading ? 'Loading' : 'Not Loading'}
      </div>
      <div data-testid="loading-progress">
        {loadingState.progress || 0}%
      </div>
      <div data-testid="loading-message">
        {loadingState.message || 'No message'}
      </div>
      <div data-testid="any-loading">
        {isAnyLoading() ? 'Any Loading' : 'No Loading'}
      </div>
      <button onClick={handleStartLoading}>Start Loading</button>
      <button onClick={handleCompleteLoading}>Complete Loading</button>
      <button onClick={handleClearLoading}>Clear Loading</button>
      <button onClick={handleSetProgress}>Set Progress</button>
      <button onClick={handleSetMessage}>Set Message</button>
    </div>
  );
};

describe('LoadingStatesIntegration', () => {
  describe('Provider and Context', () => {
    it('provides loading context to children', () => {
      render(
        <LoadingStatesProvider>
          <TestComponent />
        </LoadingStatesProvider>
      );

      expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading');
      expect(screen.getByTestId('any-loading')).toHaveTextContent('No Loading');
    });

    it('throws error when used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useLoadingIntegration must be used within a LoadingStatesProvider');
      
      consoleError.mockRestore();
    });
  });

  describe('Loading State Management', () => {
    it('starts loading for a specific key', () => {
      render(
        <LoadingStatesProvider>
          <TestComponent />
        </LoadingStatesProvider>
      );

      fireEvent.click(screen.getByText('Start Loading'));

      expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading');
      expect(screen.getByTestId('loading-message')).toHaveTextContent('Testing...');
      expect(screen.getByTestId('any-loading')).toHaveTextContent('Any Loading');
    });

    it('completes loading for a specific key', () => {
      render(
        <LoadingStatesProvider>
          <TestComponent />
        </LoadingStatesProvider>
      );

      fireEvent.click(screen.getByText('Start Loading'));
      fireEvent.click(screen.getByText('Complete Loading'));

      expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading');
      expect(screen.getByTestId('any-loading')).toHaveTextContent('No Loading');
    });

    it('clears loading for a specific key', () => {
      render(
        <LoadingStatesProvider>
          <TestComponent />
        </LoadingStatesProvider>
      );

      fireEvent.click(screen.getByText('Start Loading'));
      fireEvent.click(screen.getByText('Clear Loading'));

      expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading');
      expect(screen.getByTestId('any-loading')).toHaveTextContent('No Loading');
    });

    it('sets loading progress', () => {
      render(
        <LoadingStatesProvider>
          <TestComponent />
        </LoadingStatesProvider>
      );

      fireEvent.click(screen.getByText('Start Loading'));
      fireEvent.click(screen.getByText('Set Progress'));

      expect(screen.getByTestId('loading-progress')).toHaveTextContent('50%');
    });

    it('sets loading message', () => {
      render(
        <LoadingStatesProvider>
          <TestComponent />
        </LoadingStatesProvider>
      );

      fireEvent.click(screen.getByText('Start Loading'));
      fireEvent.click(screen.getByText('Set Message'));

      expect(screen.getByTestId('loading-message')).toHaveTextContent('Updated message');
    });
  });

  describe('Page Loading Wrapper', () => {
    it('renders children when not loading', () => {
      render(
        <LoadingStatesProvider>
          <PageLoadingWrapper loadingKey="page-loading">
            <div>Page Content</div>
          </PageLoadingWrapper>
        </LoadingStatesProvider>
      );

      expect(screen.getByText('Page Content')).toBeInTheDocument();
    });

    it('renders skeleton when loading', () => {
      const PageWithLoading = () => {
        const { startLoading } = useLoadingIntegration();

        React.useEffect(() => {
          startLoading('page-loading', {
            type: LOADING_TYPES.INITIAL,
            message: 'Loading page...',
          });
        }, [startLoading]);

        return (
          <PageLoadingWrapper loadingKey="page-loading" showSkeleton={true}>
            <div>Page Content</div>
          </PageLoadingWrapper>
        );
      };

      render(
        <LoadingStatesProvider>
          <PageWithLoading />
        </LoadingStatesProvider>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows custom loading message', () => {
      const PageWithCustomMessage = () => {
        const { startLoading } = useLoadingIntegration();

        React.useEffect(() => {
          startLoading('page-loading', {
            type: LOADING_TYPES.INITIAL,
            message: 'Custom loading message',
          });
        }, [startLoading]);

        return (
          <PageLoadingWrapper loadingKey="page-loading">
            <div>Page Content</div>
          </PageLoadingWrapper>
        );
      };

      render(
        <LoadingStatesProvider>
          <PageWithCustomMessage />
        </LoadingStatesProvider>
      );

      expect(screen.getByText('Custom loading message')).toBeInTheDocument();
    });
  });

  describe('Component Loading Wrapper', () => {
    it('renders children when not loading', () => {
      render(
        <LoadingStatesProvider>
          <ComponentLoadingWrapper loadingKey="component-loading">
            <div>Component Content</div>
          </ComponentLoadingWrapper>
        </LoadingStatesProvider>
      );

      expect(screen.getByText('Component Content')).toBeInTheDocument();
    });

    it('renders loading state when loading', () => {
      const ComponentWithLoading = () => {
        const { startLoading } = useLoadingIntegration();

        React.useEffect(() => {
          startLoading('component-loading', {
            type: LOADING_TYPES.SUBMIT,
            message: 'Loading component...',
          });
        }, [startLoading]);

        return (
          <ComponentLoadingWrapper loadingKey="component-loading">
            <div>Component Content</div>
          </ComponentLoadingWrapper>
        );
      };

      render(
        <LoadingStatesProvider>
          <ComponentWithLoading />
        </LoadingStatesProvider>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows progress when available', () => {
      const ComponentWithProgress = () => {
        const { startLoading, setLoadingProgress } = useLoadingIntegration();

        React.useEffect(() => {
          startLoading('component-loading', {
            type: LOADING_TYPES.UPLOAD,
            message: 'Uploading...',
          });
          setLoadingProgress('component-loading', 75);
        }, [startLoading, setLoadingProgress]);

        return (
          <ComponentLoadingWrapper loadingKey="component-loading">
            <div>Component Content</div>
          </ComponentLoadingWrapper>
        );
      };

      render(
        <LoadingStatesProvider>
          <ComponentWithProgress />
        </LoadingStatesProvider>
      );

      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('Button Loading Wrapper', () => {
    it('renders normal button when not loading', () => {
      const onClick = jest.fn();
      render(
        <LoadingStatesProvider>
          <ButtonLoadingWrapper loadingKey="button-loading" onClick={onClick}>
            Save
          </ButtonLoadingWrapper>
        </LoadingStatesProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Save');
      expect(button).not.toBeDisabled();

      fireEvent.click(button);
      expect(onClick).toHaveBeenCalled();
    });

    it('renders loading button when loading', () => {
      const onClick = jest.fn();
      const ButtonWithLoading = () => {
        const { startLoading } = useLoadingIntegration();

        React.useEffect(() => {
          startLoading('button-loading', {
            type: LOADING_TYPES.SUBMIT,
            message: 'Saving...',
          });
        }, [startLoading]);

        return (
          <ButtonLoadingWrapper loadingKey="button-loading" onClick={onClick}>
            Save
          </ButtonLoadingWrapper>
        );
      };

      render(
        <LoadingStatesProvider>
          <ButtonWithLoading />
        </LoadingStatesProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Saving...');
      expect(button).toBeDisabled();

      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('handles async button click', async () => {
      const onClick = jest.fn().mockResolvedValue(undefined);
      const AsyncButton = () => {
        const { startLoading, completeLoading } = useLoadingIntegration();

        const handleClick = async () => {
          startLoading('button-loading', {
            type: LOADING_TYPES.SUBMIT,
            message: 'Saving...',
          });

          try {
            await onClick();
            completeLoading('button-loading', { success: true });
          } catch (error) {
            completeLoading('button-loading', { success: false, error });
          }
        };

        return (
          <ButtonLoadingWrapper loadingKey="button-loading" onClick={handleClick}>
            Save
          </ButtonLoadingWrapper>
        );
      };

      render(
        <LoadingStatesProvider>
          <AsyncButton />
        </LoadingStatesProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onClick).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(button).toHaveTextContent('Save');
        expect(button).not.toBeDisabled();
      });
    });

    it('shows loading spinner in button', () => {
      const ButtonWithSpinner = () => {
        const { startLoading } = useLoadingIntegration();

        React.useEffect(() => {
          startLoading('button-loading', {
            type: LOADING_TYPES.SUBMIT,
            message: 'Saving...',
          });
        }, [startLoading]);

        return (
          <ButtonLoadingWrapper loadingKey="button-loading" showSpinner={true}>
            Save
          </ButtonLoadingWrapper>
        );
      };

      render(
        <LoadingStatesProvider>
          <ButtonWithSpinner />
        </LoadingStatesProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Saving...');
      expect(button.querySelector('[data-testid="loading-spinner"]')).toBeInTheDocument();
    });
  });

  describe('Global Loading Indicator', () => {
    it('does not render when no loading is active', () => {
      render(
        <LoadingStatesProvider>
          <GlobalLoadingIndicator />
        </LoadingStatesProvider>
      );

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('renders when loading is active', () => {
      const GlobalWithLoading = () => {
        const { startLoading } = useLoadingIntegration();

        React.useEffect(() => {
          startLoading('global-loading', {
            type: LOADING_TYPES.SUBMIT,
            message: 'Processing...',
          });
        }, [startLoading]);

        return <GlobalLoadingIndicator />;
      };

      render(
        <LoadingStatesProvider>
          <GlobalWithLoading />
        </LoadingStatesProvider>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows highest priority loading message', () => {
      const GlobalWithMultipleLoading = () => {
        const { startLoading } = useLoadingIntegration();

        React.useEffect(() => {
          startLoading('low-priority', {
            type: LOADING_TYPES.SEARCH,
            priority: LOADING_PRIORITIES.LOW,
            message: 'Searching...',
          });
          startLoading('high-priority', {
            type: LOADING_TYPES.SUBMIT,
            priority: LOADING_PRIORITIES.HIGH,
            message: 'Submitting...',
          });
        }, [startLoading]);

        return <GlobalLoadingIndicator />;
      };

      render(
        <LoadingStatesProvider>
          <GlobalWithMultipleLoading />
        </LoadingStatesProvider>
      );

      expect(screen.getByText('Submitting...')).toBeInTheDocument();
    });

    it('shows progress when available', () => {
      const GlobalWithProgress = () => {
        const { startLoading, setLoadingProgress } = useLoadingIntegration();

        React.useEffect(() => {
          startLoading('global-loading', {
            type: LOADING_TYPES.UPLOAD,
            message: 'Uploading...',
          });
          setLoadingProgress('global-loading', 60);
        }, [startLoading, setLoadingProgress]);

        return <GlobalLoadingIndicator />;
      };

      render(
        <LoadingStatesProvider>
          <GlobalWithProgress />
        </LoadingStatesProvider>
      );

      expect(screen.getByText('60%')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles loading errors gracefully', () => {
      const ErrorComponent = () => {
        const { startLoading, getLoadingState } = useLoadingIntegration();

        const handleStartWithError = () => {
          startLoading('error-key', {
            type: LOADING_TYPES.SUBMIT,
            message: 'Testing...',
            onError: (error) => {
              logger.error('Loading error:', error);
            },
          });
        };

        const loadingState = getLoadingState('error-key');

        return (
          <div>
            <div data-testid="error-state">
              {loadingState.error || 'No Error'}
            </div>
            <button onClick={handleStartWithError}>Start with Error</button>
          </div>
        );
      };

      render(
        <LoadingStatesProvider>
          <ErrorComponent />
        </LoadingStatesProvider>
      );

      fireEvent.click(screen.getByText('Start with Error'));
      expect(screen.getByTestId('error-state')).toHaveTextContent('No Error');
    });

    it('handles missing loading key gracefully', () => {
      const MissingKeyComponent = () => {
        const { getLoadingState } = useLoadingIntegration();
        const loadingState = getLoadingState('non-existent-key');

        return (
          <div data-testid="missing-key-state">
            {loadingState.isLoading ? 'Loading' : 'Not Loading'}
          </div>
        );
      };

      render(
        <LoadingStatesProvider>
          <MissingKeyComponent />
        </LoadingStatesProvider>
      );

      expect(screen.getByTestId('missing-key-state')).toHaveTextContent('Not Loading');
    });
  });

  describe('Performance', () => {
    it('does not cause unnecessary re-renders', () => {
      let renderCount = 0;
      const PerformanceComponent = () => {
        renderCount++;
        const { isAnyLoading } = useLoadingIntegration();

        return (
          <div data-testid="render-count">
            Renders: {renderCount}
          </div>
        );
      };

      render(
        <LoadingStatesProvider>
          <PerformanceComponent />
        </LoadingStatesProvider>
      );

      expect(screen.getByTestId('render-count')).toHaveTextContent('Renders: 1');
    });
  });

  describe('Cleanup', () => {
    it('cleans up timeouts on unmount', () => {
      const { unmount } = render(
        <LoadingStatesProvider>
          <TestComponent />
        </LoadingStatesProvider>
      );

      unmount();

      // Should not throw or cause memory leaks
      expect(() => {
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });
  });
});
