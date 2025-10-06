// Error Boundary Components
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as NetworkErrorBoundary } from './NetworkErrorBoundary';
export { default as AuthErrorBoundary } from './AuthErrorBoundary';

// Error Context and Hooks
export { ErrorProvider, useError, withErrorHandling } from '../../contexts/ErrorContext';
export { useErrorHandler, useAsyncErrorHandler, useApiErrorHandler } from '../../hooks/useErrorHandler';

// Error Boundary Utilities
export const createErrorBoundary = (options = {}) => {
  const { level = 'page', fallback, onError } = options;
  
  return ({ children }) => (
    <ErrorBoundary level={level} fallback={fallback} onError={onError}>
      {children}
    </ErrorBoundary>
  );
};

export const withErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  const WithErrorBoundary = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithErrorBoundary;
};

// Error types for better error handling
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  AUTH: 'AUTH_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  SERVER: 'SERVER_ERROR',
  CLIENT: 'CLIENT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Error boundary configuration
export const ERROR_BOUNDARY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  logErrors: true,
  reportErrors: true,
  fallbackUI: true
};

export default {
  ErrorBoundary,
  NetworkErrorBoundary,
  AuthErrorBoundary,
  ErrorProvider,
  useError,
  withErrorHandling,
  useErrorHandler,
  useAsyncErrorHandler,
  useApiErrorHandler,
  createErrorBoundary,
  withErrorBoundary,
  ERROR_TYPES,
  ERROR_SEVERITY,
  ERROR_BOUNDARY_CONFIG
};
