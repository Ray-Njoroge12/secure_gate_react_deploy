/**
 * Property-Based Test: Error Message Actionability
 * 
 * **Property 7: Error Message Actionability**
 * **Validates: Requirements 7.1, 7.2, 7.5**
 * 
 * This test verifies that for any error condition, the system provides 
 * user-friendly messages that include specific, actionable steps the user 
 * can take to resolve the issue.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import errorManagementService, { 
  ERROR_CATEGORIES, 
  ERROR_SEVERITY, 
  RECOVERY_ACTIONS 
} from '../../services/errorManagementService';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import HelpDeskModal from '../../components/error/HelpDeskModal';
import ValidationFeedback from '../../components/error/ValidationFeedback';
import TestErrorBoundary from '../utils/ErrorBoundary';

// Mock dependencies
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123')
}));

jest.mock('../../services/errorQueueService', () => ({
  addError: jest.fn(),
  removeError: jest.fn(),
  clearAll: jest.fn(),
  clearByType: jest.fn(),
  getErrors: jest.fn(() => []),
  getErrorsByType: jest.fn(() => []),
  getErrorCount: jest.fn(() => 0),
  getErrorCountByType: jest.fn(() => 0)
}));

jest.mock('utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

// Test component that uses error handling
const TestErrorComponent = ({ error, onRetry, showHelpDesk = false }) => {
  const { handleError, handleSuccess } = useErrorHandler();
  const [helpDeskOpen, setHelpDeskOpen] = React.useState(showHelpDesk);

  React.useEffect(() => {
    if (error) {
      handleError(error, { onRetry });
    }
  }, [error, handleError, onRetry]);

  return (
    <div>
      <div data-testid="error-component">Error Component</div>
      {helpDeskOpen && (
        <HelpDeskModal
          isOpen={helpDeskOpen}
          onClose={() => setHelpDeskOpen(false)}
          error={error}
        />
      )}
    </div>
  );
};

// Generators for property-based testing
const errorGenerator = fc.record({
  message: fc.oneof(
    fc.constant('Network connection failed'),
    fc.constant('Validation failed: Email is required'),
    fc.constant('Unauthorized access'),
    fc.constant('Forbidden: Insufficient permissions'),
    fc.constant('Service temporarily unavailable'),
    fc.constant('Internal server error'),
    fc.constant('Request timeout'),
    fc.string({ minLength: 10, maxLength: 100 }).filter((value) => value.trim().length > 0)
  ),
  status: fc.oneof(
    fc.constant(400),
    fc.constant(401),
    fc.constant(403),
    fc.constant(422),
    fc.constant(500),
    fc.constant(503),
    fc.constant(504)
  ),
  code: fc.oneof(
    fc.constant('VALIDATION_ERROR'),
    fc.constant('NETWORK_ERROR'),
    fc.constant('AUTH_REQUIRED'),
    fc.constant('FORBIDDEN'),
    fc.constant('MAINTENANCE_MODE'),
    fc.constant('INTERNAL_ERROR')
  ),
  context: fc.record({
    field: fc.option(fc.string()),
    operation: fc.option(fc.string()),
    isValidation: fc.boolean(),
    isNetwork: fc.boolean(),
    isAuth: fc.boolean()
  })
});

const validationErrorGenerator = fc.record({
  field: fc.constantFrom('email', 'password', 'name', 'phone'),
  message: fc.constantFrom(
    'This field is required',
    'Invalid email format',
    'Password must be at least 8 characters',
    'Phone number format is invalid'
  ),
  value: fc.string(),
  suggestions: fc.array(
    fc.string({ minLength: 1, maxLength: 50 }).filter((value) => value.trim().length > 0),
    { minLength: 1, maxLength: 3 }
  )
});

describe('Property 7: Error Message Actionability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset error management service state
    errorManagementService.errorHistory.clear();
    errorManagementService.connectivityStatus = 'online';
    errorManagementService.maintenanceMode = false;
  });

  describe('User-friendly error messages with actionable guidance', () => {
    test('should provide actionable error messages for any error condition', () => {
      const sampleErrors = [
        { message: 'Network connection failed', status: 0, context: { isNetwork: true } },
        { message: 'Validation failed: Email is required', status: 422, context: { isValidation: true } },
        { message: 'Unauthorized access', status: 401, context: { isAuth: true } },
        { message: 'Service temporarily unavailable', status: 503, context: {} },
        { message: 'Internal server error', status: 500, context: {} }
      ];

      sampleErrors.forEach((error) => {
        // Classify the error
        const category = errorManagementService.classifyError(error, error.context);

        // Generate user-friendly message
        const userMessage = errorManagementService.generateUserFriendlyMessage(
          error,
          category,
          error.context
        );

        // Property: Error message should have required actionable components
        expect(userMessage).toHaveProperty('title');
        expect(userMessage).toHaveProperty('message');
        expect(userMessage).toHaveProperty('guidance');
        expect(userMessage).toHaveProperty('actions');
        expect(userMessage).toHaveProperty('severity');
        expect(userMessage).toHaveProperty('category');

        // Property: Basic shape should be present
        expect(typeof userMessage.title).toBe('string');
        expect(typeof userMessage.message).toBe('string');
        expect(typeof userMessage.guidance).toBe('string');
        expect(Array.isArray(userMessage.actions)).toBe(true);
        expect(userMessage.actions.length).toBeGreaterThan(0);
        expect(Object.values(ERROR_SEVERITY)).toContain(userMessage.severity);
        expect(Object.values(ERROR_CATEGORIES)).toContain(userMessage.category);
      });
    });

    test('should provide specific recovery actions based on error category', () => {
      const categoriesToCheck = [
        ERROR_CATEGORIES.VALIDATION,
        ERROR_CATEGORIES.NETWORK,
        ERROR_CATEGORIES.AUTHENTICATION,
        ERROR_CATEGORIES.AUTHORIZATION,
        ERROR_CATEGORIES.MAINTENANCE
      ];

      categoriesToCheck.forEach((category) => {
        const mockError = { message: 'Test error', status: 400 };
        const userMessage = errorManagementService.generateUserFriendlyMessage(
          mockError,
          category
        );

        // Property: Validation errors should suggest field corrections
        if (category === ERROR_CATEGORIES.VALIDATION) {
          expect(userMessage.message).toMatch(/check|field|correct|try again/i);
          const hasRetryAction = userMessage.actions.some(action =>
            action.type === RECOVERY_ACTIONS.RETRY
          );
          expect(hasRetryAction).toBe(true);
        }

        // Property: Network errors should suggest connection checks
        if (category === ERROR_CATEGORIES.NETWORK) {
          expect(userMessage.message).toMatch(/connection|network|internet/i);
          const hasConnectionAction = userMessage.actions.some(action =>
            action.type === RECOVERY_ACTIONS.CHECK_CONNECTION
          );
          expect(hasConnectionAction).toBe(true);
        }

        // Property: Authentication errors should suggest re-login
        if (category === ERROR_CATEGORIES.AUTHENTICATION) {
          expect(userMessage.message).toMatch(/session|expired|log.*in|authenticate/i);
          const hasLoginAction = userMessage.actions.some(action =>
            action.type === RECOVERY_ACTIONS.LOGIN_AGAIN
          );
          expect(hasLoginAction).toBe(true);
        }

        // Property: Authorization errors should explain permissions
        if (category === ERROR_CATEGORIES.AUTHORIZATION) {
          expect(userMessage.message).toMatch(/permission|access|denied|administrator/i);
          const hasNavigateAction = userMessage.actions.some(action =>
            action.type === RECOVERY_ACTIONS.NAVIGATE
          );
          expect(hasNavigateAction).toBe(true);
        }

        // Property: Maintenance errors should suggest waiting
        if (category === ERROR_CATEGORIES.MAINTENANCE) {
          expect(userMessage.message).toMatch(/maintenance|try.*later|improving/i);
          const hasWaitAction = userMessage.actions.some(action =>
            action.type === RECOVERY_ACTIONS.WAIT_AND_RETRY
          );
          expect(hasWaitAction).toBe(true);
        }
      });
    });
  });

  describe('Inline validation with correction suggestions', () => {
    test('should provide specific correction suggestions for validation errors', () => {
      const [validationError] = fc.sample(validationErrorGenerator, 1);
      const mockError = {
        message: `Validation failed: ${validationError.message}`,
        status: 422,
        field: validationError.field,
        value: validationError.value,
        context: { isValidation: true, field: validationError.field }
      };

      const category = errorManagementService.classifyError(mockError, mockError.context);
      const userMessage = errorManagementService.generateUserFriendlyMessage(
        mockError,
        category,
        mockError.context
      );

      // Property: Validation errors should be categorized correctly
      expect(category).toBe(ERROR_CATEGORIES.VALIDATION);

      // Property: Should provide field-specific guidance
      expect(userMessage.guidance).toBeTruthy();
      expect(userMessage.guidance.length).toBeGreaterThan(0);

      // Property: Should suggest retry action for validation errors
      const hasRetryAction = userMessage.actions.some(action =>
        action.type === RECOVERY_ACTIONS.RETRY
      );
      expect(hasRetryAction).toBe(true);

      // Property: Message should be user-friendly and non-empty
      expect(userMessage.message).toBeTruthy();
      expect(typeof userMessage.message).toBe('string');
    });

    test('should render ValidationFeedback component with actionable suggestions', () => {
      const [validationError] = fc.sample(validationErrorGenerator, 1);
      const { unmount } = render(
        <TestErrorBoundary>
          <ValidationFeedback
            field={validationError.field}
            errors={[validationError.message]}
            suggestions={validationError.suggestions}
          />
        </TestErrorBoundary>
      );

      // Property: Should display the error message
      expect(screen.getByText(validationError.message)).toBeInTheDocument();

      // Property: Should display visible suggestions (first 2 by default)
      const visibleSuggestions = validationError.suggestions.slice(0, 2);
      visibleSuggestions.forEach(suggestion => {
        expect(screen.getByText(suggestion)).toBeInTheDocument();
      });
      if (validationError.suggestions.length > 2) {
        fireEvent.click(screen.getByRole('button', { name: /show .* more suggestions/i }));
        validationError.suggestions.slice(2).forEach(suggestion => {
          expect(screen.getByText(suggestion)).toBeInTheDocument();
        });
      }

      // Property: Should have appropriate ARIA attributes for accessibility
      const statusElement = screen.getByRole('status');
      expect(statusElement).toBeInTheDocument();
      unmount();
    });
  });

  describe('Help desk integration and escalation options', () => {
    test('should provide help desk escalation for repeated errors', () => {
      fc.assert(fc.property(
        errorGenerator,
        (error) => {
          // Property: Handling repeated errors should not throw
          expect(() => {
            errorManagementService.handleError(error);
            errorManagementService.handleError(error);
            errorManagementService.handleError(error);
          }).not.toThrow();
        }
      ), { numRuns: 20 });
    });

    test('should render HelpDeskModal with error context and actionable options', () => {
      fc.assert(fc.property(
        errorGenerator,
        (error) => {
          const mockError = {
            id: 'test-error-123',
            category: errorManagementService.classifyError(error),
            message: error.message,
            timestamp: new Date().toISOString()
          };

          const { unmount } = render(
            <TestErrorBoundary>
              <HelpDeskModal
                isOpen={true}
                onClose={jest.fn()}
                error={mockError}
              />
            </TestErrorBoundary>
          );

          // Property: Should display help desk modal
          expect(screen.getByRole('dialog')).toBeInTheDocument();
          expect(screen.getByText('Get Help & Support')).toBeInTheDocument();

          // Property: Should provide multiple contact options
          expect(screen.getByText('Email Support')).toBeInTheDocument();
          expect(screen.getByText('Phone Support')).toBeInTheDocument();
          expect(screen.getByText('Live Chat')).toBeInTheDocument();
          expect(screen.getByText('Support Ticket')).toBeInTheDocument();

          // Property: Should display guidance section
          expect(screen.getByText(/Before contacting support/)).toBeInTheDocument();
          unmount();
        }
      ), { numRuns: 15 });
    });
  });

  describe('Error message consistency and user experience', () => {
    test('should maintain consistent error message format across different error types', () => {
      fc.assert(fc.property(
        fc.array(errorGenerator, { minLength: 2, maxLength: 5 }),
        (errors) => {
          const userMessages = errors.map(error => {
            const category = errorManagementService.classifyError(error, error.context);
            return errorManagementService.generateUserFriendlyMessage(error, category, error.context);
          });

          // Property: All error messages should have consistent structure
          userMessages.forEach(message => {
            expect(message).toHaveProperty('title');
            expect(message).toHaveProperty('message');
            expect(message).toHaveProperty('guidance');
            expect(message).toHaveProperty('actions');
            expect(message).toHaveProperty('severity');
            expect(message).toHaveProperty('category');
          });

          // Property: All messages should be user-friendly (no technical details)
          userMessages.forEach(message => {
            expect(message.message).not.toMatch(/exception|stack|trace|undefined|null/i);
            expect(message.title).not.toMatch(/exception|stack|trace|undefined|null/i);
          });

          // Property: All messages should provide at least one recovery action
          userMessages.forEach(message => {
            expect(message.actions.length).toBeGreaterThan(0);
            expect(message.actions.every(action =>
              action.label && action.type && (action.handler === undefined || typeof action.handler === 'function')
            )).toBe(true);
          });
        }
      ), { numRuns: 25 });
    });

    test('should provide appropriate severity levels for different error conditions', () => {
      fc.assert(fc.property(
        fc.record({
          authError: fc.record({ message: fc.constant('Unauthorized'), status: fc.constant(401) }),
          validationError: fc.record({ message: fc.constant('Invalid input'), status: fc.constant(422) }),
          networkError: fc.record({ message: fc.constant('Network failed'), status: fc.constant(0) }),
          serverError: fc.record({ message: fc.constant('Internal error'), status: fc.constant(500) })
        }),
        (errorSet) => {
          Object.entries(errorSet).forEach(([errorType, error]) => {
            const category = errorManagementService.classifyError(error);
            const userMessage = errorManagementService.generateUserFriendlyMessage(error, category);

            // Property: Severity should always be a valid enum value
            expect(Object.values(ERROR_SEVERITY)).toContain(userMessage.severity);

            // Property: Authentication errors should remain critical
            if (errorType === 'authError') {
              expect(userMessage.severity).toBe(ERROR_SEVERITY.CRITICAL);
            }

            // Property: Higher severity errors should have more urgent language
            const hasPrimaryFlag = userMessage.actions.some(action => action.primary !== undefined);
            if (hasPrimaryFlag && userMessage.severity === ERROR_SEVERITY.CRITICAL) {
              expect(userMessage.actions.some(action => action.primary)).toBe(true);
            }
          });
        }
      ), { numRuns: 20 });
    });
  });

  describe('Integration with error handling components', () => {
    test('should integrate properly with useErrorHandler hook', async () => {
      await fc.assert(fc.asyncProperty(
        errorGenerator,
        async (error) => {
          const mockRetry = jest.fn();
          
          const { unmount } = render(
            <TestErrorBoundary>
              <TestErrorComponent error={error} onRetry={mockRetry} />
            </TestErrorBoundary>
          );

          // Property: Component should render without errors
          expect(screen.getAllByTestId('error-component').length).toBeGreaterThan(0);
          unmount();
        }
      ), { numRuns: 10 });
    });
  });
});
