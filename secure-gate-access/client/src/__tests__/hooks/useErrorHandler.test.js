import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import errorQueueService from '../../services/errorQueueService';

jest.mock('utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../services/errorQueueService', () => ({
  addError: jest.fn(() => 'error-123'),
  removeError: jest.fn(),
  clearAll: jest.fn(),
  clearByType: jest.fn(),
  getErrors: jest.fn(() => []),
  getErrorsByType: jest.fn(() => []),
  getErrorCount: jest.fn(() => 0),
  getErrorCountByType: jest.fn(() => 0)
}));

jest.mock('../../utils/errorMapper', () => ({
  handleApiError: jest.fn((error) => error.message || 'Unknown error')
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handleError with string message', () => {
    const { result } = renderHook(() => useErrorHandler({ context: 'TestContext' }));

    act(() => {
      result.current.handleError('Something went wrong');
    });

    expect(errorQueueService.addError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Something went wrong',
        type: 'error'
      })
    );
  });

  test('handleError with Error object', () => {
    const { result } = renderHook(() => useErrorHandler({ context: 'TestContext' }));

    act(() => {
      result.current.handleError(new Error('Test error'));
    });

    expect(errorQueueService.addError).toHaveBeenCalled();
  });

  test('handleError with custom options', () => {
    const { result } = renderHook(() => useErrorHandler());

    const onRetry = jest.fn();
    act(() => {
      result.current.handleError('Error message', {
        title: 'Custom Title',
        persistent: true,
        onRetry
      });
    });

    expect(errorQueueService.addError).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Custom Title',
        persistent: true,
        onRetry
      })
    );
  });

  test('handleError returns null when showToUser is false', () => {
    const { result } = renderHook(() => useErrorHandler({ showToUser: false }));

    let errorId;
    act(() => {
      errorId = result.current.handleError('Hidden error');
    });

    expect(errorQueueService.addError).not.toHaveBeenCalled();
    expect(errorId).toBeNull();
  });

  test('handleSuccess adds success message', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleSuccess('Operation successful');
    });

    expect(errorQueueService.addError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Operation successful',
        type: 'success',
        title: 'Success'
      })
    );
  });

  test('handleWarning adds warning message', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleWarning('This is a warning');
    });

    expect(errorQueueService.addError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'This is a warning',
        type: 'warning',
        title: 'Warning'
      })
    );
  });

  test('handleInfo adds info message', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleInfo('Information message');
    });

    expect(errorQueueService.addError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Information message',
        type: 'info',
        title: 'Information'
      })
    );
  });

  test('clearError removes specific error', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.clearError('error-456');
    });

    expect(errorQueueService.removeError).toHaveBeenCalledWith('error-456');
  });

  test('clearAllErrors removes all errors', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.clearAllErrors();
    });

    expect(errorQueueService.clearAll).toHaveBeenCalled();
  });

  test('clearErrorsByType removes errors of specific type', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.clearErrorsByType('warning');
    });

    expect(errorQueueService.clearByType).toHaveBeenCalledWith('warning');
  });

  test('getErrors returns all errors', () => {
    errorQueueService.getErrors.mockReturnValue([{ id: '1' }, { id: '2' }]);
    const { result } = renderHook(() => useErrorHandler());

    let errors;
    act(() => {
      errors = result.current.getErrors();
    });

    expect(errors).toEqual([{ id: '1' }, { id: '2' }]);
  });

  test('hasErrors returns true when errors exist', () => {
    errorQueueService.getErrorCount.mockReturnValue(2);
    const { result } = renderHook(() => useErrorHandler());

    let hasErrors;
    act(() => {
      hasErrors = result.current.hasErrors();
    });

    expect(hasErrors).toBe(true);
  });

  test('hasErrorsOfType checks specific type', () => {
    errorQueueService.getErrorCountByType.mockReturnValue(1);
    const { result } = renderHook(() => useErrorHandler());

    let hasWarnings;
    act(() => {
      hasWarnings = result.current.hasErrorsOfType('warning');
    });

    expect(hasWarnings).toBe(true);
    expect(errorQueueService.getErrorCountByType).toHaveBeenCalledWith('warning');
  });

  test('uses custom position from options', () => {
    const { result } = renderHook(() => useErrorHandler({ position: 'bottom-left' }));

    act(() => {
      result.current.handleError('Error');
    });

    expect(errorQueueService.addError).toHaveBeenCalledWith(
      expect.objectContaining({
        position: 'bottom-left'
      })
    );
  });
});
