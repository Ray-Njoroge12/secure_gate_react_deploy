# Testing Guide

This guide provides comprehensive instructions for testing the Secure Gate Access application, including unit tests, integration tests, accessibility tests, and performance tests.

## Table of Contents

- [Testing Setup](#testing-setup)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [Accessibility Testing](#accessibility-testing)
- [Responsive Testing](#responsive-testing)
- [Performance Testing](#performance-testing)
- [Cross-Browser Testing](#cross-browser-testing)
- [Test Utilities](#test-utilities)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Testing Setup

### Prerequisites

Ensure you have the following installed:
- Node.js 16+
- npm or yarn
- Chrome/Chromium for browser testing
- Jest and React Testing Library (already configured)

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- --testPathPattern=Button.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should render"
```

### Test Configuration

The testing setup is configured in `package.json`:

```json
{
  "jest": {
    "collectCoverageFrom": [
      "src/**/*.{js,jsx}",
      "!src/**/*.test.{js,jsx}",
      "!src/index.js"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 70,
        "functions": 70,
        "lines": 70,
        "statements": 70
      }
    }
  }
}
```

## Unit Testing

### Component Testing

Test individual components in isolation using React Testing Library.

#### Basic Component Test

```jsx
// Button.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../ui/Button';

describe('Button Component', () => {
  test('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  test('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

#### Testing with Context

```jsx
// ComponentWithContext.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorProvider } from '../contexts/ErrorContext';
import { MyComponent } from '../MyComponent';

const renderWithContext = (component) => {
  return render(
    <ErrorProvider>
      {component}
    </ErrorProvider>
  );
};

test('renders with error context', () => {
  renderWithContext(<MyComponent />);
  expect(screen.getByText('My Component')).toBeInTheDocument();
});
```

#### Testing Custom Hooks

```jsx
// useError.test.js
import { renderHook, act } from '@testing-library/react';
import { ErrorProvider, useError } from '../contexts/ErrorContext';

const wrapper = ({ children }) => (
  <ErrorProvider>{children}</ErrorProvider>
);

test('should add and remove errors', () => {
  const { result } = renderHook(() => useError(), { wrapper });

  act(() => {
    result.current.addError({
      id: '1',
      message: 'Test error',
      type: 'error'
    });
  });

  expect(result.current.errors).toHaveLength(1);
  expect(result.current.errors[0].message).toBe('Test error');

  act(() => {
    result.current.removeError('1');
  });

  expect(result.current.errors).toHaveLength(0);
});
```

### Utility Function Testing

```jsx
// validationRules.test.js
import { validationFunctions } from '../utils/validationRules';

describe('Validation Functions', () => {
  test('required validation', () => {
    expect(validationFunctions.required('')).toBe('This field is required');
    expect(validationFunctions.required('value')).toBe(null);
  });

  test('email validation', () => {
    expect(validationFunctions.email('invalid')).toBe('Please enter a valid email');
    expect(validationFunctions.email('test@example.com')).toBe(null);
  });

  test('minLength validation', () => {
    const minLength8 = validationFunctions.minLength(8);
    expect(minLength8('short')).toBe('Must be at least 8 characters');
    expect(minLength8('longenough')).toBe(null);
  });
});
```

## Integration Testing

### User Flow Testing

Test complete user workflows by simulating user interactions.

```jsx
// visitor-registration.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorProvider, LoadingProvider } from '../contexts';
import { VisitorRegistration } from '../pages/VisitorRegistration';

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <ErrorProvider>
        <LoadingProvider>
          {component}
        </LoadingProvider>
      </ErrorProvider>
    </BrowserRouter>
  );
};

test('complete visitor registration flow', async () => {
  renderWithProviders(<VisitorRegistration />);

  // Fill out form
  fireEvent.change(screen.getByLabelText(/name/i), {
    target: { value: 'John Doe' }
  });
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'john@example.com' }
  });
  fireEvent.change(screen.getByLabelText(/phone/i), {
    target: { value: '123-456-7890' }
  });

  // Submit form
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));

  // Wait for success message
  await waitFor(() => {
    expect(screen.getByText(/visitor registered successfully/i)).toBeInTheDocument();
  });
});
```

### API Integration Testing

```jsx
// api-integration.test.jsx
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { render, screen, waitFor } from '@testing-library/react';
import { VisitorList } from '../pages/VisitorList';

const server = setupServer(
  rest.get('/api/visitors', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: [
          { id: 1, name: 'John Doe', email: 'john@example.com' }
        ]
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('loads and displays visitors', async () => {
  render(<VisitorList />);

  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

## Accessibility Testing

### Using jest-axe

Test for accessibility violations using jest-axe.

```jsx
// accessibility.test.jsx
import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '../ui/Button';

expect.extend(toHaveNoViolations);

test('Button should not have accessibility violations', async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Keyboard Navigation Testing

```jsx
// keyboard-navigation.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../ui/Modal';

test('Modal can be closed with Escape key', async () => {
  const user = userEvent.setup();
  const onClose = jest.fn();
  
  render(
    <Modal isOpen={true} onClose={onClose}>
      <div>Modal content</div>
    </Modal>
  );

  await user.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalled();
});

test('Focus is trapped in modal', async () => {
  const user = userEvent.setup();
  
  render(
    <Modal isOpen={true} onClose={jest.fn()}>
      <button>First button</button>
      <button>Second button</button>
    </Modal>
  );

  const firstButton = screen.getByText('First button');
  const secondButton = screen.getByText('Second button');

  firstButton.focus();
  await user.tab();
  expect(secondButton).toHaveFocus();

  await user.tab();
  expect(firstButton).toHaveFocus(); // Focus should wrap around
});
```

### ARIA Testing

```jsx
// aria-labels.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from '../ui/Button';

test('Button has proper ARIA attributes', () => {
  render(
    <Button aria-label="Close dialog" disabled>
      <CloseIcon />
    </Button>
  );

  const button = screen.getByRole('button');
  expect(button).toHaveAttribute('aria-label', 'Close dialog');
  expect(button).toHaveAttribute('disabled');
});
```

## Responsive Testing

### Screen Size Testing

```jsx
// responsive.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '../components/Sidebar';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query === '(min-width: 1024px)',
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

test('Sidebar is hidden on mobile', () => {
  // Simulate mobile viewport
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375,
  });

  render(<Sidebar />);
  expect(screen.getByRole('navigation')).toHaveClass('hidden');
});
```

### Touch Target Testing

```jsx
// touch-targets.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from '../ui/Button';

test('Button meets minimum touch target size', () => {
  render(<Button>Click me</Button>);
  
  const button = screen.getByRole('button');
  const styles = window.getComputedStyle(button);
  
  // Check minimum dimensions (44px is WCAG minimum)
  expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
  expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(44);
});
```

## Performance Testing

### Component Performance

```jsx
// performance.test.jsx
import React from 'react';
import { render } from '@testing-library/react';
import { performance } from 'perf_hooks';
import { ExpensiveComponent } from '../ExpensiveComponent';

test('Component renders within performance budget', () => {
  const start = performance.now();
  render(<ExpensiveComponent data={largeDataSet} />);
  const end = performance.now();
  
  const renderTime = end - start;
  expect(renderTime).toBeLessThan(100); // 100ms budget
});
```

### Memory Leak Testing

```jsx
// memory-leaks.test.jsx
import React from 'react';
import { render, unmount } from '@testing-library/react';
import { ComponentWithEventListeners } from '../ComponentWithEventListeners';

test('Component cleans up event listeners on unmount', () => {
  const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
  const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
  
  const { unmount } = render(<ComponentWithEventListeners />);
  expect(addEventListenerSpy).toHaveBeenCalled();
  
  unmount();
  expect(removeEventListenerSpy).toHaveBeenCalled();
});
```

## Cross-Browser Testing

### Browser Compatibility Testing

```jsx
// browser-compatibility.test.js
import { browserDetection } from '../utils/browserDetection';

// Mock different user agents
const mockUserAgent = (userAgent) => {
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    value: userAgent,
  });
};

test('detects Chrome correctly', () => {
  mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  const browserInfo = browserDetection.getBrowserInfo();
  expect(browserInfo.name).toBe('Chrome');
  expect(browserInfo.version).toBe(91);
});

test('detects Firefox correctly', () => {
  mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0');
  
  const browserInfo = browserDetection.getBrowserInfo();
  expect(browserInfo.name).toBe('Firefox');
  expect(browserInfo.version).toBe(89);
});
```

## Test Utilities

### Custom Render Function

Create a custom render function with all providers:

```jsx
// test-utils.jsx
import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorProvider } from '../contexts/ErrorContext';
import { LoadingProvider } from '../contexts/LoadingContext';
import { SearchProvider } from '../contexts/SearchContext';

const AllTheProviders = ({ children }) => {
  return (
    <BrowserRouter>
      <ErrorProvider>
        <LoadingProvider>
          <SearchProvider>
            {children}
          </SearchProvider>
        </LoadingProvider>
      </ErrorProvider>
    </BrowserRouter>
  );
};

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### Mock Functions

```jsx
// mocks.js
// Mock localStorage
export const mockLocalStorage = () => {
  const store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { Object.keys(store).forEach(key => delete store[key]); }),
  };
};

// Mock fetch
export const mockFetch = (data, status = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    })
  );
};
```

## Best Practices

### Test Organization

1. **Group related tests** using `describe` blocks
2. **Use descriptive test names** that explain what is being tested
3. **Follow the AAA pattern**: Arrange, Act, Assert
4. **Keep tests focused** on a single behavior
5. **Use meaningful assertions** with specific error messages

### Test Data

1. **Use realistic test data** that matches production scenarios
2. **Create reusable test fixtures** for common data structures
3. **Use factories** for generating test data
4. **Clean up test data** after each test

### Performance

1. **Mock expensive operations** like API calls and file I/O
2. **Use `act()`** when testing state updates
3. **Clean up timers and intervals** in `afterEach`
4. **Avoid testing implementation details** - focus on behavior

### Accessibility

1. **Test with screen readers** when possible
2. **Verify keyboard navigation** works correctly
3. **Check color contrast** meets WCAG standards
4. **Test with different zoom levels**

## Troubleshooting

### Common Issues

#### Tests timing out
```jsx
// Increase timeout for slow tests
test('slow test', async () => {
  // test code
}, 10000); // 10 second timeout
```

#### Async operations not completing
```jsx
// Use waitFor for async operations
import { waitFor } from '@testing-library/react';

test('async operation', async () => {
  render(<AsyncComponent />);
  
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

#### Context not available
```jsx
// Wrap component with context provider
const renderWithContext = (component) => {
  return render(
    <MyContextProvider>
      {component}
    </MyContextProvider>
  );
};
```

#### Mock not working
```jsx
// Ensure mocks are reset between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Debugging Tests

1. **Use `screen.debug()`** to see the rendered DOM
2. **Add `console.log`** statements for debugging
3. **Use `--verbose`** flag for detailed test output
4. **Check test coverage** to identify untested code

### Performance Issues

1. **Profile tests** to identify slow operations
2. **Use `--maxWorkers=1`** for debugging
3. **Mock heavy dependencies** like large datasets
4. **Consider test parallelization** for large test suites

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm ci
      - run: npm test -- --coverage --watchAll=false
      - uses: codecov/codecov-action@v3
```

### Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test -- --watchAll=false"
    }
  }
}
```

This testing guide provides comprehensive coverage for all aspects of testing the Secure Gate Access application. Follow these practices to ensure robust, maintainable, and reliable tests.



