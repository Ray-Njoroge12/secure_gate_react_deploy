/**
 * useLoadingStates Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useLoadingStates, LOADING_TYPES, LOADING_PRIORITIES } from '../useLoadingStates';

// Mock the LoadingContext
jest.mock('../../contexts/LoadingContext', () => ({
  useLoading: () => ({
    isLoading: jest.fn(() => false),
    setLoading: jest.fn(),
    clearLoading: jest.fn(),
  }),
}));

describe('useLoadingStates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('initializes with default values', () => {
      const { result } = renderHook(() => useLoadingStates());

      expect(result.current.loadingState.isActive).toBe(false);
      expect(result.current.loadingState.type).toBe(LOADING_TYPES.INITIAL);
      expect(result.current.loadingState.priority).toBe(LOADING_PRIORITIES.NORMAL);
      expect(result.current.loadingState.message).toBe('Loading...');
      expect(result.current.loadingState.progress).toBe(0);
      expect(result.current.loadingState.error).toBe(null);
      expect(result.current.loadingState.success).toBe(false);
      expect(result.current.loadingState.cancelled).toBe(false);
    });

    it('initializes with custom options', () => {
      const options = {
        type: LOADING_TYPES.SUBMIT,
        priority: LOADING_PRIORITIES.HIGH,
        message: 'Submitting form...',
        showProgress: true,
        allowCancel: true,
        autoRetry: true,
        persistState: true,
      };

      const { result } = renderHook(() => useLoadingStates(options));

      expect(result.current.loadingState.type).toBe(LOADING_TYPES.SUBMIT);
      expect(result.current.loadingState.priority).toBe(LOADING_PRIORITIES.HIGH);
      expect(result.current.loadingState.message).toBe('Submitting form...');
    });
  });

  describe('Loading State Management', () => {
    it('starts loading', () => {
      const { result } = renderHook(() => useLoadingStates());

      act(() => {
        result.current.startLoading();
      });

      expect(result.current.loadingState.isActive).toBe(true);
      expect(result.current.loadingState.startTime).toBeDefined();
    });

    it('starts loading with custom message', () => {
      const { result } = renderHook(() => useLoadingStates());

      act(() => {
        result.current.startLoading('Custom loading message');
      });

      expect(result.current.loadingState.isActive).toBe(true);
      expect(result.current.loadingState.message).toBe('Custom loading message');
    });

    it('updates progress', () => {
      const { result } = renderHook(() => useLoadingStates({ showProgress: true }));

      act(() => {
        result.current.startLoading();
        result.current.updateProgress(50);
      });

      expect(result.current.loadingState.progress).toBe(50);
    });

    it('completes loading successfully', () => {
      const { result } = renderHook(() => useLoadingStates());

      act(() => {
        result.current.startLoading();
        result.current.completeLoading('Success!');
      });

      expect(result.current.loadingState.isActive).toBe(false);
      expect(result.current.loadingState.success).toBe(true);
      expect(result.current.loadingState.message).toBe('Success!');
      expect(result.current.loadingState.endTime).toBeDefined();
    });

    it('handles loading error', () => {
      const { result } = renderHook(() => useLoadingStates());

      act(() => {
        result.current.startLoading();
        result.current.handleError(new Error('Something went wrong'), 'Failed to load');
      });

      expect(result.current.loadingState.isActive).toBe(false);
      expect(result.current.loadingState.error).toBe('Something went wrong');
      expect(result.current.loadingState.message).toBe('Failed to load');
      expect(result.current.loadingState.endTime).toBeDefined();
    });

    it('cancels loading', () => {
      const { result } = renderHook(() => useLoadingStates());

      act(() => {
        result.current.startLoading();
        result.current.cancelLoading();
      });

      expect(result.current.loadingState.isActive).toBe(false);
      expect(result.current.loadingState.cancelled).toBe(true);
      expect(result.current.loadingState.endTime).toBeDefined();
    });

    it('resets loading state', () => {
      const { result } = renderHook(() => useLoadingStates());

      act(() => {
        result.current.startLoading();
        result.current.completeLoading({ success: true });
        result.current.resetLoading();
      });

      expect(result.current.loadingState.isActive).toBe(false);
      expect(result.current.loadingState.success).toBe(false);
      expect(result.current.loadingState.error).toBe(null);
      expect(result.current.loadingState.cancelled).toBe(false);
      expect(result.current.loadingState.progress).toBe(0);
    });
  });

  describe('Progress Monitoring', () => {
    it('sets up progress monitoring when showProgress is true', () => {
      const { result } = renderHook(() => useLoadingStates({ showProgress: true }));

      act(() => {
        result.current.startLoading();
      });

      // Fast-forward time to trigger progress update
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.loadingState.progress).toBeGreaterThan(0);
    });

    it('does not set up progress monitoring when showProgress is false', () => {
      const { result } = renderHook(() => useLoadingStates({ showProgress: false }));

      act(() => {
        result.current.startLoading();
      });

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.loadingState.progress).toBe(0);
    });
  });

  describe('Auto-retry Functionality', () => {
    it('sets up auto-retry when enabled', () => {
      const { result } = renderHook(() => useLoadingStates({ autoRetry: true }));

      act(() => {
        result.current.startLoading();
      });

      expect(result.current.loadingState.retryCount).toBe(0);
    });

    it('increments retry count on retry', () => {
      const { result } = renderHook(() => useLoadingStates({ autoRetry: true }));

      act(() => {
        result.current.startLoading();
        result.current.retry();
      });

      expect(result.current.loadingState.retryCount).toBe(1);
    });

    it('does not retry beyond max attempts', () => {
      const { result } = renderHook(() => useLoadingStates({ autoRetry: true }));

      act(() => {
        result.current.startLoading();
        // Simulate multiple retries
        for (let i = 0; i < 5; i++) {
          result.current.retry();
        }
      });

      expect(result.current.loadingState.retryCount).toBeLessThanOrEqual(3);
    });
  });

  describe('State Persistence', () => {
    beforeEach(() => {
      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
      });
    });

    it('persists state to localStorage when enabled', () => {
      const { result } = renderHook(() => useLoadingStates({ persistState: true }));

      act(() => {
        result.current.startLoading();
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'loading_initial',
        expect.stringContaining('"isActive":true')
      );
    });

    it('loads persisted state on mount', () => {
      const persistedState = JSON.stringify({
        isActive: true,
        type: LOADING_TYPES.SUBMIT,
        message: 'Persisted loading...',
      });

      localStorage.getItem.mockReturnValue(persistedState);

      const { result } = renderHook(() => useLoadingStates({ persistState: true }));

      expect(result.current.loadingState.isActive).toBe(true);
      expect(result.current.loadingState.type).toBe(LOADING_TYPES.SUBMIT);
      expect(result.current.loadingState.message).toBe('Persisted loading...');
    });

    it('handles invalid persisted state gracefully', () => {
      localStorage.getItem.mockReturnValue('invalid json');

      const { result } = renderHook(() => useLoadingStates({ persistState: true }));

      expect(result.current.loadingState.isActive).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('checks if loading is active', () => {
      const { result } = renderHook(() => useLoadingStates());

      expect(result.current.isActive).toBe(false);

      act(() => {
        result.current.startLoading();
      });

      expect(result.current.isActive).toBe(true);
    });

    it('checks if can cancel', () => {
      const { result } = renderHook(() => useLoadingStates({ allowCancel: true }));

      expect(result.current.canCancel).toBe(false);

      act(() => {
        result.current.startLoading();
      });

      expect(result.current.canCancel).toBe(true);
    });

    it('checks if can retry', () => {
      const { result } = renderHook(() => useLoadingStates({ autoRetry: true }));

      expect(result.current.canRetry).toBe(false);

      act(() => {
        result.current.startLoading();
        result.current.handleError(new Error('Test error'));
      });

      expect(result.current.canRetry).toBe(true);
    });

    it('checks if is long running', () => {
      const { result } = renderHook(() => useLoadingStates());
      const startTime = Date.now();

      act(() => {
        result.current.startLoading();
      });

      // Mock Date.now to simulate 6 seconds have passed
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => startTime + 6000);

      act(() => {
        // Trigger a re-render to recalculate duration
        result.current.updateProgress(50);
      });

      expect(result.current.isLongRunning).toBe(true);

      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it('checks success state', () => {
      const { result } = renderHook(() => useLoadingStates());

      expect(result.current.isSuccess).toBe(false);

      act(() => {
        result.current.completeLoading({ success: true });
      });

      expect(result.current.isSuccess).toBe(true);
    });

    it('checks error state', () => {
      const { result } = renderHook(() => useLoadingStates());

      expect(result.current.isError).toBe(false);

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      expect(result.current.isError).toBe(true);
    });

    it('checks cancelled state', () => {
      const { result } = renderHook(() => useLoadingStates());

      expect(result.current.isCancelled).toBe(false);

      act(() => {
        result.current.startLoading();
        result.current.cancelLoading();
      });

      expect(result.current.isCancelled).toBe(true);
    });
  });

  describe('Callback Functions', () => {
    it('calls onComplete callback', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() => useLoadingStates({ onComplete }));

      act(() => {
        result.current.startLoading();
        result.current.completeLoading({ success: true });
      });

      expect(onComplete).toHaveBeenCalledWith({ success: true, duration: 0 });
    });

    it('calls onError callback', () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useLoadingStates({ onError }));

      act(() => {
        result.current.startLoading();
        result.current.handleError(new Error('Test error'));
      });

      expect(onError).toHaveBeenCalledWith({ error: new Error('Test error'), duration: 0 });
    });

    it('calls onCancel callback', () => {
      const onCancel = jest.fn();
      const { result } = renderHook(() => useLoadingStates({ onCancel }));

      act(() => {
        result.current.startLoading();
        result.current.cancelLoading();
      });

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('cleans up timers on unmount', () => {
      const { result, unmount } = renderHook(() => useLoadingStates({ showProgress: true }));

      act(() => {
        result.current.startLoading();
      });

      unmount();

      // Should not throw or cause memory leaks
      expect(() => {
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });
  });
});
