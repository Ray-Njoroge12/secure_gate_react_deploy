# Testing Guide

This document provides comprehensive guidance for testing the Secure Gate Access application.

## Table of Contents

- [Testing Strategy](#testing-strategy)
- [Test Setup](#test-setup)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [Accessibility Testing](#accessibility-testing)
- [Visual Regression Testing](#visual-regression-testing)
- [E2E Testing](#e2e-testing)
- [Performance Testing](#performance-testing)
- [Test Utilities](#test-utilities)
- [Best Practices](#best-practices)

## Testing Strategy

### Testing Pyramid

Our testing strategy follows the testing pyramid approach:

1. **Unit Tests (70%)**: Fast, isolated tests for individual components and functions
2. **Integration Tests (20%)**: Tests for component interactions and API integration
3. **E2E Tests (10%)**: Full user journey tests

### Test Coverage Goals

- **Overall Coverage**: 70%+
- **Component Coverage**: 80%+
- **Hook Coverage**: 90%+
- **Utility Function Coverage**: 95%+

## Test Setup

### Prerequisites

```bash
# Install dependencies
npm install

# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
```

### Configuration Files

#### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/**/*.spec.{js,jsx}',
    '!src/index.js',
    '!src/setupTests.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

#### Test Setup (`src/setupTests.js`)

```javascript
import '@testing-library/jest-dom';
import 'jest-axe/extend-expect';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

## Unit Testing

### Component Testing

#### Basic Component Test

```jsx
import { render, screen } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Component', () => {
  test('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    screen.getByRole('button').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('applies correct variant classes', () => {
    render(<Button variant="primary">Primary</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-brand-600');
  });

  test('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  test('shows loading state', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveClass('animate-spin');
  });
});
```

#### Component with Context Test

```jsx
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';
import { Dashboard } from '../Dashboard';

const renderWithAuth = (ui, { user = null } = {}) => {
  const Wrapper = ({ children }) => (
    <AuthProvider value={{ user, isAuthenticated: !!user }}>
      {children}
    </AuthProvider>
  );
  return render(ui, { wrapper: Wrapper });
};

describe('Dashboard', () => {
  test('renders user information when authenticated', () => {
    const user = { name: 'John Doe', email: 'john@example.com' };
    renderWithAuth(<Dashboard />, { user });
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  test('redirects to login when not authenticated', () => {
    renderWithAuth(<Dashboard />, { user: null });
    
    expect(screen.getByText('Please log in')).toBeInTheDocument();
  });
});
```

### Hook Testing

#### Custom Hook Test

```jsx
import { renderHook, act } from '@testing-library/react';
import { useCounter } from '../useCounter';

describe('useCounter Hook', () => {
  test('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  test('initializes with custom value', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  test('increments count', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });

  test('decrements count', () => {
    const { result } = renderHook(() => useCounter(5));
    
    act(() => {
      result.current.decrement();
    });
    
    expect(result.current.count).toBe(4);
  });

  test('resets count', () => {
    const { result } = renderHook(() => useCounter(5));
    
    act(() => {
      result.current.increment();
      result.current.reset();
    });
    
    expect(result.current.count).toBe(5);
  });
});
```

### Utility Function Testing

#### API Utility Test

```jsx
import { api } from '../utils/api';

// Mock fetch
global.fetch = jest.fn();

describe('API Utilities', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('makes GET request successfully', async () => {
    const mockData = { id: 1, name: 'Test' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await api.get('/test');
    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith('/api/test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  test('handles API errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(api.get('/test')).rejects.toThrow('Network error');
  });

  test('includes authorization header when token exists', async () => {
    localStorage.setItem('token', 'test-token');
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await api.get('/test');
    
    expect(fetch).toHaveBeenCalledWith('/api/test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
    });
  });
});
```

## Integration Testing

### Component Integration Test

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LoginPage } from '../pages/LoginPage';

const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Login Page Integration', () => {
  test('completes login flow successfully', async () => {
    // Mock API response
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          user: { id: 1, email: 'test@example.com' },
          token: 'test-token'
        }
      }),
    });

    renderWithProviders(<LoginPage />);

    // Fill in form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for navigation
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });

    // Verify API was called
    expect(fetch).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      }),
    });
  });

  test('handles login errors', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: 'Invalid credentials'
      }),
    });

    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' }
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
```

## Accessibility Testing

### Automated Accessibility Testing

```jsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '../Button';

expect.extend(toHaveNoViolations);

describe('Button Accessibility', () => {
  test('has no accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('has proper ARIA attributes', () => {
    render(
      <Button 
        aria-label="Save changes"
        aria-describedby="save-help"
      >
        Save
      </Button>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Save changes');
    expect(button).toHaveAttribute('aria-describedby', 'save-help');
  });

  test('supports keyboard navigation', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    button.focus();
    
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
    
    fireEvent.keyDown(button, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });
});
```

### Manual Accessibility Testing

#### Screen Reader Testing

1. **NVDA (Windows)**:
   - Download and install NVDA
   - Test all interactive elements
   - Verify proper heading structure
   - Check form labels and descriptions

2. **VoiceOver (macOS)**:
   - Enable VoiceOver (Cmd + F5)
   - Navigate through the application
   - Test all interactive elements
   - Verify proper focus management

#### Keyboard Navigation Testing

1. **Tab Navigation**:
   - Tab through all interactive elements
   - Verify logical tab order
   - Check focus indicators

2. **Keyboard Shortcuts**:
   - Test all keyboard shortcuts
   - Verify they work as expected
   - Check for conflicts

## Visual Regression Testing

### Setup with Chromatic

```javascript
// chromatic.config.js
module.exports = {
  projectToken: 'your-project-token',
  buildScriptName: 'build-storybook',
  storybookBuildDir: 'storybook-static',
  exitZeroOnChanges: true,
  exitZeroOnErrors: true,
  ignoreLastBuildOnBranch: 'main',
  autoAcceptChanges: 'main'
};
```

### Storybook Stories

```jsx
// Button.stories.js
import { Button } from './Button';

export default {
  title: 'Components/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component: 'A versatile button component with multiple variants and accessibility features.'
      }
    }
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger']
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl']
    }
  }
};

export const Primary = {
  args: {
    children: 'Primary Button',
    variant: 'primary'
  }
};

export const Secondary = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary'
  }
};

export const AllVariants = () => (
  <div className="space-y-4">
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="danger">Danger</Button>
  </div>
);
```

## E2E Testing

### Playwright Setup

```javascript
// playwright.config.js
module.exports = {
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ]
};
```

### E2E Test Example

```javascript
// tests/e2e/login.spec.js
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in login form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // Submit form
    await page.click('[data-testid="login-button"]');
    
    // Wait for navigation
    await expect(page).toHaveURL('/dashboard/resident');
    
    // Verify dashboard content
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    
    await page.click('[data-testid="login-button"]');
    
    // Wait for error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
  });
});
```

## Performance Testing

### React DevTools Profiler

```jsx
import { Profiler } from 'react';

const onRenderCallback = (id, phase, actualDuration) => {
  console.log('Component:', id, 'Phase:', phase, 'Duration:', actualDuration);
};

<Profiler id="Button" onRender={onRenderCallback}>
  <Button>Click me</Button>
</Profiler>
```

### Performance Test

```jsx
import { render, screen } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Performance', () => {
  test('renders quickly', () => {
    const start = performance.now();
    render(<Button>Click me</Button>);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(10); // Should render in less than 10ms
  });

  test('handles rapid clicks efficiently', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    const start = performance.now();
    
    // Simulate rapid clicks
    for (let i = 0; i < 100; i++) {
      fireEvent.click(button);
    }
    
    const end = performance.now();
    expect(end - start).toBeLessThan(100); // Should handle 100 clicks in less than 100ms
  });
});
```

## Test Utilities

### Custom Render Function

```jsx
// test-utils.js
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ErrorProvider } from '../contexts/ErrorContext';

const AllTheProviders = ({ children, user = null }) => {
  return (
    <BrowserRouter>
      <ErrorProvider>
        <AuthProvider value={{ user, isAuthenticated: !!user }}>
          {children}
        </AuthProvider>
      </ErrorProvider>
    </BrowserRouter>
  );
};

const customRender = (ui, options = {}) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### Mock Functions

```jsx
// mocks/api.js
export const mockAPI = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

// mocks/localStorage.js
export const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});
```

### Test Data Factories

```jsx
// test-data/factories.js
export const createUser = (overrides = {}) => ({
  id: '1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'resident',
  ...overrides
});

export const createVisitor = (overrides = {}) => ({
  id: '1',
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '+1234567890',
  status: 'confirmed',
  visitDate: '2024-01-15T10:00:00Z',
  ...overrides
});
```

## Best Practices

### Test Organization

1. **File Structure**:
   ```
   src/
   ├── components/
   │   └── Button/
   │       ├── Button.jsx
   │       ├── Button.test.jsx
   │       └── Button.stories.js
   ├── hooks/
   │   ├── useAuth.js
   │   └── useAuth.test.js
   └── utils/
       ├── api.js
       └── api.test.js
   ```

2. **Test Naming**:
   - Use descriptive test names
   - Group related tests with `describe`
   - Use `it` or `test` for individual test cases

### Test Writing Guidelines

1. **Arrange-Act-Assert Pattern**:
   ```jsx
   test('should increment counter when button is clicked', () => {
     // Arrange
     const { getByRole } = render(<Counter />);
     const button = getByRole('button');
     
     // Act
     fireEvent.click(button);
     
     // Assert
     expect(button).toHaveTextContent('1');
   });
   ```

2. **Test Behavior, Not Implementation**:
   ```jsx
   // Good: Tests behavior
   test('should show error message when form is invalid', () => {
     render(<Form />);
     fireEvent.click(screen.getByRole('button'));
     expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
   });
   
   // Bad: Tests implementation
   test('should call validateForm function', () => {
     const validateForm = jest.fn();
     render(<Form validateForm={validateForm} />);
     fireEvent.click(screen.getByRole('button'));
     expect(validateForm).toHaveBeenCalled();
   });
   ```

3. **Use Data Test IDs Sparingly**:
   ```jsx
   // Good: Use semantic queries
   screen.getByRole('button', { name: /submit/i });
   screen.getByLabelText(/email address/i);
   
   // Acceptable: Use data-testid for complex elements
   screen.getByTestId('user-profile-card');
   ```

### Coverage Guidelines

1. **Aim for High Coverage**:
   - Overall: 70%+
   - Components: 80%+
   - Hooks: 90%+
   - Utilities: 95%+

2. **Focus on Critical Paths**:
   - User authentication
   - Form submissions
   - Error handling
   - Navigation

3. **Test Edge Cases**:
   - Empty states
   - Error states
   - Loading states
   - Network failures

### Continuous Integration

1. **Pre-commit Hooks**:
   ```json
   {
     "husky": {
       "hooks": {
         "pre-commit": "npm run test:coverage && npm run lint"
       }
     }
   }
   ```

2. **GitHub Actions**:
   ```yaml
   name: Tests
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - uses: actions/setup-node@v2
         - run: npm install
         - run: npm run test:coverage
         - run: npm run test:e2e
   ```

## Running Tests

### Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test Button.test.jsx

# Run tests matching pattern
npm test -- --testNamePattern="Button"

# Run E2E tests
npm run test:e2e

# Run accessibility tests
npm run test:a11y
```

### Debugging Tests

1. **Debug Mode**:
   ```bash
   npm test -- --debug
   ```

2. **Verbose Output**:
   ```bash
   npm test -- --verbose
   ```

3. **Update Snapshots**:
   ```bash
   npm test -- --updateSnapshot
   ```

## Conclusion

This testing guide provides comprehensive coverage for testing the Secure Gate Access application. Follow these guidelines to ensure high-quality, maintainable tests that provide confidence in the application's functionality.

For questions or support, please refer to the main documentation or contact the development team.

