# Error Boundary Components

This directory contains comprehensive error boundary components for the Secure Gate Access Control System. These components provide graceful error handling, user-friendly error messages, and automatic error reporting.

## Components

### ErrorBoundary
The main error boundary component that catches JavaScript errors anywhere in the component tree and displays a fallback UI.

**Features:**
- Page-level and component-level error handling
- Automatic error logging to backend
- Retry functionality with configurable limits
- User-friendly error messages
- Development vs production error details
- Custom fallback UI support

**Usage:**
```jsx
import { ErrorBoundary } from './components/ErrorBoundary';

// Page-level error boundary
<ErrorBoundary level="page">
  <YourComponent />
</ErrorBoundary>

// Component-level error boundary
<ErrorBoundary level="component">
  <YourComponent />
</ErrorBoundary>

// With custom fallback
<ErrorBoundary fallback={CustomErrorComponent}>
  <YourComponent />
</ErrorBoundary>
```

### NetworkErrorBoundary
Specialized error boundary for handling network-related errors.

**Features:**
- Detects network errors automatically
- Provides network troubleshooting steps
- Links to system status page
- Falls back to default error boundary for non-network errors

**Usage:**
```jsx
import { NetworkErrorBoundary } from './components/ErrorBoundary';

<NetworkErrorBoundary>
  <ComponentThatMakesNetworkCalls />
</NetworkErrorBoundary>
```

### AuthErrorBoundary
Specialized error boundary for handling authentication-related errors.

**Features:**
- Detects authentication errors (401, 403)
- Provides auth-specific error explanations
- Automatic logout and redirect to login
- Falls back to default error boundary for non-auth errors

**Usage:**
```jsx
import { AuthErrorBoundary } from './components/ErrorBoundary';

<AuthErrorBoundary>
  <ProtectedComponent />
</AuthErrorBoundary>
```

## Hooks

### useErrorHandler
Custom hook for handling errors in functional components.

**Usage:**
```jsx
import { useErrorHandler } from './hooks/useErrorHandler';

function MyComponent() {
  const { error, handleError, clearError, retry, hasError } = useErrorHandler();

  const handleAsyncOperation = async () => {
    try {
      await someAsyncOperation();
    } catch (err) {
      handleError(err, { context: 'async operation' });
    }
  };

  if (hasError) {
    return <div>Error: {error.message}</div>;
  }

  return <div>Normal content</div>;
}
```

### useAsyncErrorHandler
Hook specifically for handling async operations.

**Usage:**
```jsx
import { useAsyncErrorHandler } from './hooks/useErrorHandler';

function MyComponent() {
  const { executeAsync, error, hasError } = useAsyncErrorHandler();

  const handleClick = () => {
    executeAsync(
      () => fetch('/api/data'),
      {
        onSuccess: (data) => console.log('Success:', data),
        onError: (err) => console.log('Error:', err),
        retryable: true,
        maxRetries: 3
      }
    );
  };

  return <button onClick={handleClick}>Load Data</button>;
}
```

### useApiErrorHandler
Hook specifically for handling API errors.

**Usage:**
```jsx
import { useApiErrorHandler } from './hooks/useErrorHandler';

function MyComponent() {
  const { handleApiError, isNetworkError, isServerError, isAuthError } = useApiErrorHandler();

  const handleApiCall = async () => {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error('API Error');
    } catch (error) {
      if (isNetworkError(error)) {
        // Handle network error
      } else if (isServerError(error)) {
        // Handle server error
      } else if (isAuthError(error)) {
        // Handle auth error
      }
      handleApiError(error, { url: '/api/data', method: 'GET' });
    }
  };

  return <button onClick={handleApiCall}>Call API</button>;
}
```

## Context

### ErrorProvider
React context provider for global error state management.

**Usage:**
```jsx
import { ErrorProvider, useError } from './contexts/ErrorContext';

function App() {
  return (
    <ErrorProvider>
      <YourApp />
    </ErrorProvider>
  );
}

function SomeComponent() {
  const { error, setError, clearError } = useError();
  
  // Use error context
}
```

## Error Types

The error boundary system recognizes several error types:

- `NETWORK_ERROR`: Network connectivity issues
- `AUTH_ERROR`: Authentication/authorization errors
- `VALIDATION_ERROR`: Input validation errors
- `SERVER_ERROR`: Server-side errors (5xx)
- `CLIENT_ERROR`: Client-side errors (4xx)
- `UNKNOWN_ERROR`: Unrecognized errors

## Error Severity Levels

- `low`: Minor issues that don't affect core functionality
- `medium`: Issues that affect some functionality
- `high`: Issues that significantly impact user experience
- `critical`: Issues that prevent core functionality

## Configuration

Error boundaries can be configured with the following options:

```jsx
const ERROR_BOUNDARY_CONFIG = {
  maxRetries: 3,        // Maximum number of retry attempts
  retryDelay: 1000,     // Delay between retries (ms)
  logErrors: true,      // Whether to log errors to backend
  reportErrors: true,   // Whether to report errors to monitoring
  fallbackUI: true      // Whether to show fallback UI
};
```

## Error Logging

All errors are automatically logged to the backend with the following information:

- Error message and stack trace
- Component stack trace
- User ID and session information
- Timestamp and error ID
- Browser and device information
- URL and request context

## Styling

Error boundaries come with comprehensive CSS styling that includes:

- Responsive design for mobile and desktop
- Dark mode support
- Accessibility features
- Smooth animations and transitions
- Consistent design with the application theme

## Testing

Error boundaries are thoroughly tested with:

- Unit tests for all components
- Integration tests for error handling flows
- Mock error scenarios
- User interaction testing
- Accessibility testing

## Best Practices

1. **Wrap critical components**: Use error boundaries around components that are critical to the user experience.

2. **Use specialized boundaries**: Use NetworkErrorBoundary for network calls and AuthErrorBoundary for authentication flows.

3. **Provide meaningful fallbacks**: Create custom fallback components that provide helpful information to users.

4. **Log errors appropriately**: Ensure errors are logged with sufficient context for debugging.

5. **Test error scenarios**: Include error scenarios in your testing to ensure error boundaries work correctly.

6. **Monitor error rates**: Track error rates and patterns to identify systemic issues.

## Examples

### Basic Error Boundary
```jsx
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary level="page">
      <MainContent />
    </ErrorBoundary>
  );
}
```

### Nested Error Boundaries
```jsx
import { ErrorBoundary, NetworkErrorBoundary, AuthErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary level="page">
      <NetworkErrorBoundary>
        <AuthErrorBoundary>
          <MainContent />
        </AuthErrorBoundary>
      </NetworkErrorBoundary>
    </ErrorBoundary>
  );
}
```

### Custom Error Fallback
```jsx
const CustomErrorFallback = ({ error, onRetry, onGoHome }) => (
  <div className="custom-error">
    <h2>Something went wrong</h2>
    <p>{error.message}</p>
    <button onClick={onRetry}>Try Again</button>
    <button onClick={onGoHome}>Go Home</button>
  </div>
);

<ErrorBoundary fallback={CustomErrorFallback}>
  <YourComponent />
</ErrorBoundary>
```

### Using Error Hooks
```jsx
import { useErrorHandler } from './hooks/useErrorHandler';

function DataComponent() {
  const { error, handleError, retry, hasError } = useErrorHandler();

  const loadData = async () => {
    try {
      const data = await fetchData();
      setData(data);
    } catch (err) {
      handleError(err, { operation: 'loadData' });
    }
  };

  if (hasError) {
    return (
      <div>
        <p>Failed to load data: {error.message}</p>
        <button onClick={() => retry(loadData)}>Retry</button>
      </div>
    );
  }

  return <div>Data loaded successfully</div>;
}
```

## Troubleshooting

### Common Issues

1. **Error boundary not catching errors**: Ensure the error boundary wraps the component that might throw errors.

2. **Infinite retry loops**: Check that retry functions don't always throw errors.

3. **Missing error context**: Ensure error information is passed correctly to logging functions.

4. **Styling issues**: Check that CSS files are imported and error boundary classes are applied correctly.

### Debug Mode

Enable debug mode by setting `NODE_ENV=development` to see detailed error information in the browser console and error UI.

## Contributing

When adding new error boundary components or features:

1. Follow the existing patterns and naming conventions
2. Add comprehensive tests
3. Update documentation
4. Ensure accessibility compliance
5. Test in both development and production modes
