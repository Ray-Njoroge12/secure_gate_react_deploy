/**
 * @fileoverview Error handling tests for Secure Gate Access
 * @description Comprehensive tests for error handling system and retry mechanisms
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor  } from '../../test-utils';
import { MemoryRouter } from 'react-router-dom';
import { ErrorProvider, useError } from '../contexts/ErrorContext';
import { ErrorQueue } from '../components/ui';
import { createStandardError, retryOperation, ERROR_TYPES, ERROR_SEVERITY, EnhancedErrorHandler } from '../utils/errorHandling';
import { createApiErrorHandler, handleApiErrorWithRetry } from '../utils/apiErrorHandler';

// Test wrapper with ErrorProvider
const TestWrapper = ({ children }) => (
  <MemoryRouter>
    <ErrorProvider>
      {children}
    </ErrorProvider>
  </MemoryRouter>
);

// Test component that uses error context
const TestComponent = ({ onError }) => {
  const { handleError, handleApiError, handleNetworkError, handleAuthError } = useError();

  const triggerError = () => {
    handleError('Test error message');
  };

  const triggerApiError = () => {
    const error = new Error('API Error');
    error.response = { status: 500, data: { message: 'Server error' } };
    handleApiError(error, 'Test API call');
  };

  const triggerNetworkError = () => {
    const error = new Error('Network Error');
    error.name = 'NetworkError';
    handleNetworkError(error, 'Test network call');
  };

  const triggerAuthError = () => {
    const error = new Error('Unauthorized');
    error.response = { status: 401, data: { message: 'Token expired' } };
    handleAuthError(error, 'Test auth call');
  };

  return (
    <div>
      <button onClick={triggerError}>Trigger Error</button>
      <button onClick={triggerApiError}>Trigger API Error</button>
      <button onClick={triggerNetworkError}>Trigger Network Error</button>
      <button onClick={triggerAuthError}>Trigger Auth Error</button>
    </div>
  );
};

describe('Error Handling System', () => {
  describe('ErrorContext Integration', () => {
    it('should display errors in ErrorQueue', async () => {
      render(
        <TestWrapper>
          <TestComponent />
          <ErrorQueue />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('Trigger Error');
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Test error message')).toBeInTheDocument();
      });
    });

    it('should handle API errors with retry options', async () => {
      render(
        <TestWrapper>
          <TestComponent />
          <ErrorQueue />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('Trigger API Error');
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });
    });

    it('should handle network errors with retry', async () => {
      render(
        <TestWrapper>
          <TestComponent />
          <ErrorQueue />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('Trigger Network Error');
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });
    });

    it('should handle authentication errors with login redirect', async () => {
      render(
        <TestWrapper>
          <TestComponent />
          <ErrorQueue />
        </TestWrapper>
      );

      const triggerButton = screen.getByText('Trigger Auth Error');
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      });
    });
  });

  describe('Error Standardization', () => {
    it('should create standardized error object', () => {
      const originalError = new Error('Test error');
      const context = { component: 'TestComponent', action: 'testAction' };
      
      const standardError = createStandardError(originalError, context);

      expect(standardError).toHaveProperty('id');
      expect(standardError).toHaveProperty('message', 'Test error');
      expect(standardError).toHaveProperty('type');
      expect(standardError).toHaveProperty('severity');
      expect(standardError).toHaveProperty('context');
      expect(standardError).toHaveProperty('userMessage');
      expect(standardError).toHaveProperty('retryable');
    });

    it('should categorize error types correctly', () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';
      
      const standardError = createStandardError(networkError);
      expect(standardError.type).toBe(ERROR_TYPES.NETWORK);

      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      
      const validationStandardError = createStandardError(validationError);
      expect(validationStandardError.type).toBe(ERROR_TYPES.VALIDATION);
    });

    it('should determine error severity correctly', () => {
      const criticalError = new Error('Server error');
      criticalError.response = { status: 500 };
      
      const standardError = createStandardError(criticalError);
      expect(standardError.severity).toBe(ERROR_SEVERITY.CRITICAL);

      const lowSeverityError = new Error('Network error');
      lowSeverityError.name = 'NetworkError';
      
      const lowSeverityStandardError = createStandardError(lowSeverityError);
      expect(lowSeverityStandardError.severity).toBe(ERROR_SEVERITY.LOW);
    });
  });

  describe('Retry Mechanisms', () => {
    it('should retry operation with exponential backoff', async () => {
      let attemptCount = 0;
      const mockOperation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'Success';
      });

      const result = await retryOperation(mockOperation, {
        maxRetries: 3,
        baseDelay: 10, // Short delay for testing
        maxDelay: 100
      });

      expect(result).toBe('Success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(retryOperation(mockOperation, {
        maxRetries: 2,
        baseDelay: 10
      })).rejects.toThrow('Persistent failure');

      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      
      const mockOperation = jest.fn().mockRejectedValue(validationError);

      await expect(retryOperation(mockOperation, {
        maxRetries: 3,
        baseDelay: 10
      })).rejects.toThrow('Validation failed');

      expect(mockOperation).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('API Error Handler', () => {
    it('should handle API errors with retry', async () => {
      const apiErrorHandler = createApiErrorHandler();
      
      let attemptCount = 0;
      const mockApiCall = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          const error = new Error('Temporary API failure');
          error.response = { status: 500 };
          throw error;
        }
        return { data: 'Success' };
      });

      const result = await apiErrorHandler.handleWithRetry(
        new Error('Initial error'),
        { apiCall: mockApiCall }
      );

      expect(result).toEqual({ data: 'Success' });
      expect(mockApiCall).toHaveBeenCalledTimes(2);
    });

    it('should categorize API errors correctly', () => {
      const apiErrorHandler = createApiErrorHandler();

      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';
      expect(apiErrorHandler.categorizeErrorType(networkError)).toBe(ERROR_TYPES.NETWORK);

      const authError = new Error('Unauthorized');
      authError.response = { status: 401 };
      expect(apiErrorHandler.categorizeErrorType(authError)).toBe(ERROR_TYPES.AUTHENTICATION);

      const serverError = new Error('Internal server error');
      serverError.response = { status: 500 };
      expect(apiErrorHandler.categorizeErrorType(serverError)).toBe(ERROR_TYPES.SERVER);
    });

    it('should provide appropriate retry actions', () => {
      const apiErrorHandler = createApiErrorHandler();

      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';
      
      const actions = apiErrorHandler.getRetryActions(networkError);
      expect(actions).toHaveLength(2);
      expect(actions[0]).toHaveProperty('label', 'Retry');
      expect(actions[1]).toHaveProperty('label', 'Check Connection');

      const authError = new Error('Unauthorized');
      authError.response = { status: 401 };
      
      const authActions = apiErrorHandler.getRetryActions(authError);
      expect(authActions).toHaveLength(1);
      expect(authActions[0]).toHaveProperty('label', 'Login Again');
    });
  });

  describe('Error Queue Service', () => {
    beforeEach(() => {
      const errorQueueService = require('../services/errorQueueService').default;
      errorQueueService.clearAll();
    });

    it('should add and remove errors', () => {
      const errorQueueService = require('../services/errorQueueService').default;
      
      const errorId = errorQueueService.addError({
        message: 'Test error',
        type: 'error'
      });

      expect(errorQueueService.hasError(errorId)).toBe(true);
      expect(errorQueueService.getErrorCount()).toBe(1);

      errorQueueService.removeError(errorId);
      expect(errorQueueService.hasError(errorId)).toBe(false);
      expect(errorQueueService.getErrorCount()).toBe(0);
    });

    it('should limit maximum errors', () => {
      const errorQueueService = require('../services/errorQueueService').default;
      
      // Add more errors than max
      for (let i = 0; i < 10; i++) {
        errorQueueService.addError({
          message: `Error ${i}`,
          type: 'error'
        });
      }

      expect(errorQueueService.getErrorCount()).toBeLessThanOrEqual(5);
    });

    it('should clear errors by type', () => {
      const errorQueueService = require('../services/errorQueueService').default;
      
      // Clear any existing errors first
      errorQueueService.clearAll();
      
      errorQueueService.addError({ message: 'Error 1', type: 'error' });
      errorQueueService.addError({ message: 'Warning 1', type: 'warning' });
      errorQueueService.addError({ message: 'Error 2', type: 'error' });

      expect(errorQueueService.getErrorCount()).toBe(3);

      errorQueueService.clearByType('error');
      expect(errorQueueService.getErrorCount()).toBe(1);
      expect(errorQueueService.getErrorsByType('warning')).toHaveLength(1);
    });
  });

  describe('Error Recovery Actions', () => {
    it('should provide retry action for retryable errors', () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';
      
      const standardError = createStandardError(networkError);
      expect(standardError.retryable).toBe(true);
      expect(standardError.recoveryActions).toContainEqual(
        expect.objectContaining({ label: 'Retry' })
      );
    });

    it('should provide login action for auth errors', () => {
      const authError = new Error('Unauthorized');
      authError.response = { status: 401 };
      
      const standardError = createStandardError(authError);
      expect(standardError.recoveryActions).toContainEqual(
        expect.objectContaining({ label: 'Login Again' })
      );
    });

    it('should not provide retry action for validation errors', () => {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      
      const standardError = createStandardError(validationError);
      expect(standardError.retryable).toBe(false);
      expect(standardError.recoveryActions).toContainEqual(
        expect.objectContaining({ label: 'Fix Input' })
      );
    });
  });

  describe('Error Context Integration', () => {
    it('should provide all error handling methods', () => {
      const TestHookComponent = () => {
        const errorContext = useError();
        
        expect(errorContext).toHaveProperty('handleError');
        expect(errorContext).toHaveProperty('handleApiError');
        expect(errorContext).toHaveProperty('handleNetworkError');
        expect(errorContext).toHaveProperty('handleAuthError');
        expect(errorContext).toHaveProperty('handleValidationError');
        expect(errorContext).toHaveProperty('clearAllErrors');
        expect(errorContext).toHaveProperty('getErrorQueue');
        
        return <div>Test</div>;
      };

      render(
        <TestWrapper>
          <TestHookComponent />
        </TestWrapper>
      );
    });
  });
});
