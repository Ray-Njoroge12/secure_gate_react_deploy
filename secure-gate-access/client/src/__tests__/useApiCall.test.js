import { renderHook, act, waitFor } from '@testing-library/react';
import { useApiCall } from '../useApiCall';

// Mock the logger to prevent errors
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock the error mapper
jest.mock('../../utils/errorMapper');

// Import the mocked module
import { handleApiError } from '../../utils/errorMapper';

describe('useApiCall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up the mock implementation
    handleApiError.mockImplementation((error, context) => `${context}: ${error.message}`);
  });

  it('initializes with default state', () => {
    const apiFunction = jest.fn();
    const { result } = renderHook(() => useApiCall(apiFunction));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.data).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
    expect(result.current.hasData).toBe(false);
  });

  it('executes API call successfully', async () => {
    const mockData = { id: 1, name: 'Test' };
    const apiFunction = jest.fn().mockResolvedValue(mockData);
    const { result } = renderHook(() => useApiCall(apiFunction));

    let executeResult;
    await act(async () => {
      executeResult = await result.current.execute('arg1', 'arg2');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.data).toEqual(mockData);
    expect(result.current.hasData).toBe(true);
    expect(executeResult).toEqual(mockData);
    expect(apiFunction).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('handles API call errors', async () => {
    const mockError = new Error('API Error');
    const apiFunction = jest.fn().mockRejectedValue(mockError);
    const { result } = renderHook(() => useApiCall(apiFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Expected to throw
      }
    });

    // Check if the mock was called
    expect(handleApiError).toHaveBeenCalledWith(mockError, 'API call');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('API call: API Error');
      expect(result.current.data).toBe(null);
      expect(result.current.hasError).toBe(true);
    });
  });

  it('calls success callback on successful execution', async () => {
    const mockData = { id: 1, name: 'Test' };
    const apiFunction = jest.fn().mockResolvedValue(mockData);
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useApiCall(apiFunction, { onSuccess }));

    await act(async () => {
      await result.current.execute('arg1', 'arg2');
    });

    expect(onSuccess).toHaveBeenCalledWith(mockData, 'arg1', 'arg2');
  });

  it('calls error callback on failed execution', async () => {
    const mockError = new Error('API Error');
    const apiFunction = jest.fn().mockRejectedValue(mockError);
    const onError = jest.fn();
    const { result } = renderHook(() => useApiCall(apiFunction, { onError }));

    await act(async () => {
      try {
        await result.current.execute('arg1', 'arg2');
      } catch (error) {
        // Expected to throw
      }
    });

    expect(onError).toHaveBeenCalledWith(mockError, 'arg1', 'arg2');
  });

  it('resets state when reset is called', async () => {
    const mockData = { id: 1, name: 'Test' };
    const apiFunction = jest.fn().mockResolvedValue(mockData);
    const { result } = renderHook(() => useApiCall(apiFunction));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toEqual(mockData);

    act(() => {
      result.current.reset();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.data).toBe(null);
  });

  it('clears error when clearError is called', async () => {
    const mockError = new Error('API Error');
    const apiFunction = jest.fn().mockRejectedValue(mockError);
    const { result } = renderHook(() => useApiCall(apiFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.hasError).toBe(true);
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe('');
    expect(result.current.hasError).toBe(false);
  });

  it('sets loading state during execution', async () => {
    let resolvePromise;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    const apiFunction = jest.fn().mockReturnValue(promise);
    const { result } = renderHook(() => useApiCall(apiFunction));

    act(() => {
      result.current.execute();
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise({ id: 1, name: 'Test' });
    });

    expect(result.current.loading).toBe(false);
  });

  it('handles multiple executions', async () => {
    const mockData1 = { id: 1, name: 'Test1' };
    const mockData2 = { id: 2, name: 'Test2' };
    const apiFunction = jest.fn()
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);
    const { result } = renderHook(() => useApiCall(apiFunction));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toEqual(mockData1);

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toEqual(mockData2);
    expect(apiFunction).toHaveBeenCalledTimes(2);
  });

  it('handles execution with different arguments', async () => {
    const apiFunction = jest.fn().mockResolvedValue({});
    const { result } = renderHook(() => useApiCall(apiFunction));

    await act(async () => {
      await result.current.execute('arg1');
    });

    await act(async () => {
      await result.current.execute('arg2', 'arg3');
    });

    expect(apiFunction).toHaveBeenNthCalledWith(1, 'arg1');
    expect(apiFunction).toHaveBeenNthCalledWith(2, 'arg2', 'arg3');
  });

  it('maintains referential stability of execute function', () => {
    const apiFunction = jest.fn();
    const { result, rerender } = renderHook(() => useApiCall(apiFunction));

    const execute1 = result.current.execute;
    rerender();
    const execute2 = result.current.execute;

    expect(execute1).toBe(execute2);
  });

  it('maintains referential stability of reset function', () => {
    const apiFunction = jest.fn();
    const { result, rerender } = renderHook(() => useApiCall(apiFunction));

    const reset1 = result.current.reset;
    rerender();
    const reset2 = result.current.reset;

    expect(reset1).toBe(reset2);
  });

  it('maintains referential stability of clearError function', () => {
    const apiFunction = jest.fn();
    const { result, rerender } = renderHook(() => useApiCall(apiFunction));

    const clearError1 = result.current.clearError;
    rerender();
    const clearError2 = result.current.clearError;

    expect(clearError1).toBe(clearError2);
  });
});

