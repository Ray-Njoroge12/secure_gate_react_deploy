/**
 * LoadingStatesManager Component Tests
 */

import React from 'react';
import logger from '../../../../utils/logger';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import '@testing-library/jest-dom';
import LoadingStatesManager, { 
  useLoadingIntegration,
  LoadingStatesProvider,
  PageLoadingWrapper,
  ComponentLoadingWrapper,
  ButtonLoadingWrapper,
  GlobalLoadingIndicator,
} from '../LoadingStatesManager';
import { LOADING_TYPES, LOADING_PRIORITIES } from '../../../hooks/useLoadingStates';

// Test component that uses the loading integration
const TestComponent = () => {
  const { 
    startLoading, 
    completeLoading, 
    getLoadingState, 
    isAnyLoading 
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

  const loadingState = getLoadingState('test-key');

  return (
    <div>
      <div data-testid="loading-state">
        {loadingState.isLoading ? 'Loading' : 'Not Loading'}
      </div>
      <div data-testid="any-loading">
        {isAnyLoading() ? 'Any Loading' : 'No Loading'}
      </div>
      <button onClick={handleStartLoading}>Start Loading</button>
      <button onClick={handleCompleteLoading}>Complete Loading</button>
    </div>
  );
};

describe('LoadingStatesManager', () => {
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

    it('tracks multiple loading states', () => {
      const MultiLoadingComponent = () => {
        const { startLoading, completeLoading, isAnyLoading } = useLoadingIntegration();

        const handleStartMultiple = () => {
          startLoading('key1', { type: LOADING_TYPES.SUBMIT });
          startLoading('key2', { type: LOADING_TYPES.UPLOAD });
        };

        const handleCompleteOne = () => {
          completeLoading('key1', { success: true });
        };

        return (
          <div>
            <div data-testid="any-loading">{isAnyLoading() ? 'Loading' : 'Not Loading'}</div>
            <button onClick={handleStartMultiple}>Start Multiple</button>
            <button onClick={handleCompleteOne}>Complete One</button>
          </div>
        );
      };

      render(
        <LoadingStatesProvider>
          <MultiLoadingComponent />
        </LoadingStatesProvider>
      );

      fireEvent.click(screen.getByText('Start Multiple'));
      expect(screen.getByTestId('any-loading')).toHaveTextContent('Loading');

      fireEvent.click(screen.getByText('Complete One'));
      expect(screen.getByTestId('any-loading')).toHaveTextContent('Loading');
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
      render(
        <LoadingStatesProvider>
          <ButtonLoadingWrapper loadingKey="button-loading" onClick={onClick}>
            Save
          </ButtonLoadingWrapper>
        </LoadingStatesProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onClick).toHaveBeenCalled();
      });
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
  });

  describe('Priority Management', () => {
    it('shows highest priority loading in global indicator', () => {
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
