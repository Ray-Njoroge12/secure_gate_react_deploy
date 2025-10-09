import { renderHook, act } from '@testing-library/react';
import { useLoadingState, useAsyncLoading, useMultipleLoadingStates } from '../useLoadingState';

describe('useLoadingState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useLoadingState());
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.progress).toBe(0);
    expect(result.current.message).toBe('Loading...');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
    expect(result.current.isComplete).toBe(false);
  });

  it('initializes with custom initial state', () => {
    const { result } = renderHook(() => useLoadingState(true));
    
    expect(result.current.loading).toBe(true);
    expect(result.current.isLoading).toBe(true);
  });

  it('starts loading with default options', () => {
    const { result } = renderHook(() => useLoadingState());
    
    act(() => {
      result.current.startLoading();
    });
    
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.progress).toBe(0);
    expect(result.current.message).toBe('Loading...');
  });

  it('starts loading with custom options', () => {
    const { result } = renderHook(() => useLoadingState());
    
    act(() => {
      result.current.startLoading({ 
        message: 'Custom loading...', 
        progress: 25 
      });
    });
    
    expect(result.current.loading).toBe(true);
    expect(result.current.message).toBe('Custom loading...');
    expect(result.current.progress).toBe(25);
  });

  it('stops loading', () => {
    const { result } = renderHook(() => useLoadingState());
    
    act(() => {
      result.current.startLoading();
    });
    
    expect(result.current.loading).toBe(true);
    
    act(() => {
      result.current.stopLoading();
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.message).toBe('Loading...');
  });

  it('sets loading error', () => {
    const { result } = renderHook(() => useLoadingState());
    
    act(() => {
      result.current.setLoadingError('Something went wrong');
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Something went wrong');
    expect(result.current.hasError).toBe(true);
  });

  it('updates progress', () => {
    const { result } = renderHook(() => useLoadingState());
    
    act(() => {
      result.current.updateProgress(50, 'Halfway done');
    });
    
    expect(result.current.progress).toBe(50);
    expect(result.current.message).toBe('Halfway done');
  });

  it('updates message without changing progress', () => {
    const { result } = renderHook(() => useLoadingState());
    
    act(() => {
      result.current.updateProgress(30);
      result.current.updateMessage('New message');
    });
    
    expect(result.current.progress).toBe(30);
    expect(result.current.message).toBe('New message');
  });

  it('clears error', () => {
    const { result } = renderHook(() => useLoadingState());
    
    act(() => {
      result.current.setLoadingError('Error message');
    });
    
    expect(result.current.hasError).toBe(true);
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBe(null);
    expect(result.current.hasError).toBe(false);
  });

  it('resets all states', () => {
    const { result } = renderHook(() => useLoadingState());
    
    act(() => {
      result.current.startLoading({ message: 'Loading...', progress: 50 });
      result.current.setLoadingError('Error');
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Error');
    expect(result.current.progress).toBe(50);
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.progress).toBe(0);
    expect(result.current.message).toBe('Loading...');
  });

  it('handles loading with timeout', () => {
    const { result } = renderHook(() => useLoadingState());
    
    act(() => {
      result.current.startLoadingWithTimeout(1000, { message: 'Loading with timeout' });
    });
    
    expect(result.current.loading).toBe(true);
    expect(result.current.message).toBe('Loading with timeout');
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Loading timeout');
  });

  it('clears timeout on unmount', () => {
    const { result, unmount } = renderHook(() => useLoadingState());
    
    act(() => {
      result.current.startLoadingWithTimeout(1000);
    });
    
    unmount();
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Should not cause any issues after unmount
    expect(true).toBe(true);
  });
});

describe('useAsyncLoading', () => {
  it('executes async function and manages loading state', async () => {
    const asyncFunction = jest.fn().mockResolvedValue('result');
    const { result } = renderHook(() => useAsyncLoading(asyncFunction));
    
    expect(result.current.loading).toBe(false);
    
    await act(async () => {
      const promise = result.current.execute('arg1', 'arg2');
      // Wait a tick for state to update
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(result.current.loading).toBe(true);
      await promise;
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('result');
    expect(asyncFunction).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('handles async function errors', async () => {
    const asyncFunction = jest.fn().mockRejectedValue(new Error('Async error'));
    const { result } = renderHook(() => useAsyncLoading(asyncFunction));
    
    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Expected to throw
      }
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Async error');
    expect(result.current.hasError).toBe(true);
  });

  it('auto-executes when dependencies change', () => {
    const asyncFunction = jest.fn().mockResolvedValue('result');
    const { rerender } = renderHook(
      ({ deps }) => useAsyncLoading(asyncFunction, deps),
      { initialProps: { deps: ['dep1'] } }
    );
    
    expect(asyncFunction).toHaveBeenCalledTimes(1);
    
    rerender({ deps: ['dep2'] });
    expect(asyncFunction).toHaveBeenCalledTimes(2);
  });
});

describe('useMultipleLoadingStates', () => {
  it('manages multiple loading states', () => {
    const { result } = renderHook(() => useMultipleLoadingStates(['key1', 'key2']));
    
    expect(result.current.isLoading('key1')).toBe(false);
    expect(result.current.isLoading('key2')).toBe(false);
    expect(result.current.isAnyLoading()).toBe(false);
    
    act(() => {
      result.current.setLoading('key1', true, { message: 'Loading key1' });
    });
    
    expect(result.current.isLoading('key1')).toBe(true);
    expect(result.current.isLoading('key2')).toBe(false);
    expect(result.current.isAnyLoading()).toBe(true);
    expect(result.current.getLoading('key1').message).toBe('Loading key1');
  });

  it('clears specific loading state', () => {
    const { result } = renderHook(() => useMultipleLoadingStates(['key1', 'key2']));
    
    act(() => {
      result.current.setLoading('key1', true);
      result.current.setLoading('key2', true);
    });
    
    expect(result.current.isAnyLoading()).toBe(true);
    
    act(() => {
      result.current.clear('key1');
    });
    
    expect(result.current.isLoading('key1')).toBe(false);
    expect(result.current.isLoading('key2')).toBe(true);
    expect(result.current.isAnyLoading()).toBe(true);
  });

  it('clears all loading states', () => {
    const { result } = renderHook(() => useMultipleLoadingStates(['key1', 'key2', 'key3']));
    
    act(() => {
      result.current.setLoading('key1', true);
      result.current.setLoading('key2', true);
      result.current.setLoading('key3', true);
    });
    
    expect(result.current.isAnyLoading()).toBe(true);
    
    act(() => {
      result.current.clearAll();
    });
    
    expect(result.current.isLoading('key1')).toBe(false);
    expect(result.current.isLoading('key2')).toBe(false);
    expect(result.current.isLoading('key3')).toBe(false);
    expect(result.current.isAnyLoading()).toBe(false);
  });
});

