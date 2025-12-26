import { renderHook, act } from '@testing-library/react';
import { useDebounce, useDebouncedCallback, useDebouncedSearch } from '../../hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  test('updates value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 500 });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Advance time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });

  test('cancels previous timeout when value changes rapidly', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    rerender({ value: 'c' });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    rerender({ value: 'd' });
    
    // Only 400ms passed, debounced value should still be 'a'
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Now should be 'd' (the last value)
    expect(result.current).toBe('d');
  });

  test('uses default delay of 500ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated');
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('calls callback after delay', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current('arg1', 'arg2');
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('cancels previous call on rapid invocations', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current('first');
      result.current('second');
      result.current('third');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('third');
  });
});

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('initializes with empty search term', () => {
    const onSearch = jest.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useDebouncedSearch('', onSearch, 300));

    expect(result.current.searchTerm).toBe('');
    expect(result.current.isSearching).toBe(false);
  });

  test('updates search term and triggers search after debounce', async () => {
    const onSearch = jest.fn().mockResolvedValue(['result']);
    const { result } = renderHook(() => useDebouncedSearch('', onSearch, 300));

    act(() => {
      result.current.setSearchTerm('test');
    });

    expect(result.current.searchTerm).toBe('test');

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(onSearch).toHaveBeenCalledWith('test');
  });

  test('clearSearch resets search term', () => {
    const onSearch = jest.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useDebouncedSearch('initial', onSearch, 300));

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchTerm).toBe('');
  });

  test('calls onSearch with empty string when search term is cleared', async () => {
    const onSearch = jest.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useDebouncedSearch('test', onSearch, 300));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    act(() => {
      result.current.clearSearch();
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(onSearch).toHaveBeenCalledWith('');
  });
});
