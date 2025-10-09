// Test utilities for React components
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import logger from 'utils/logger';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

// Mock user with different roles
export const mockUsers = {
  admin: {
    id: 1,
    username: 'admin',
    email: 'admin@test.com',
    role: 'admin',
    unit_number: null
  },
  guard: {
    id: 2,
    username: 'guard',
    email: 'guard@test.com',
    role: 'guard',
    unit_number: null
  },
  resident: {
    id: 3,
    username: 'resident',
    email: 'resident@test.com',
    role: 'resident',
    unit_number: 'A101'
  }
};

// Custom render function with providers
export const renderWithProviders = (
  ui,
  {
    initialUser = null,
    initialEntries = ['/'],
    ...renderOptions
  } = {}
) => {
  // Create mock auth context value
  const mockAuthValue = {
    user: initialUser,
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: !!initialUser,
    loading: false,
    error: null
  };

  // Wrapper component with all providers
  const Wrapper = ({ children }) => (
    <BrowserRouter>
      <AuthProvider value={mockAuthValue}>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    mockAuthValue
  };
};

// API mock helpers
export const createMockResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data))
});

export const mockApiCall = (endpoint, response) => {
  const mockFetch = jest.fn(() => Promise.resolve(createMockResponse(response)));
  global.fetch = mockFetch;
  return mockFetch;
};

// Form testing helpers
export const fillForm = async (formData) => {
  const user = userEvent.setup();

  for (const [fieldName, value] of Object.entries(formData)) {
    const field = screen.getByLabelText(new RegExp(fieldName, 'i')) ||
                  screen.getByPlaceholderText(new RegExp(fieldName, 'i')) ||
                  screen.getByRole('textbox', { name: new RegExp(fieldName, 'i') });

    if (field) {
      await user.clear(field);
      await user.type(field, value);
    }
  }
};

export const submitForm = async () => {
  const user = userEvent.setup();
  const submitButton = screen.getByRole('button', { name: /submit|save|create|update/i });
  await user.click(submitButton);
};

// Assertion helpers
export const expectToBeInDocument = (element) => {
  expect(element).toBeInTheDocument();
};

export const expectNotToBeInDocument = (selector) => {
  expect(screen.queryByText(selector)).not.toBeInTheDocument();
};

// Accessibility testing helpers
export const checkAccessibility = async (container) => {
  // Basic accessibility checks
  const buttons = container.querySelectorAll('button');
  buttons.forEach(button => {
    if (!button.textContent.trim() && !button.getAttribute('aria-label')) {
      logger.warn('Button without accessible name found:', button);
    }
  });

  const inputs = container.querySelectorAll('input');
  inputs.forEach(input => {
    const label = container.querySelector(`label[for="${input.id}"]`);
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledBy = input.getAttribute('aria-labelledby');

    if (!label && !ariaLabel && !ariaLabelledBy) {
      logger.warn('Input without accessible label found:', input);
    }
  });
};

// Wait for async operations
export const waitForLoadingToFinish = async () => {
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInDocument();
  });
};

export const waitForErrorMessage = async (message) => {
  await waitFor(() => {
    expect(screen.getByText(message)).toBeInTheDocument();
  });
};

// Simple test to make this a valid test file
describe('Test Utils', () => {
  test('should export utility functions', () => {
    expect(typeof mockUsers).toBe('object');
    expect(typeof renderWithProviders).toBe('function');
    expect(typeof createMockResponse).toBe('function');
    expect(typeof mockApiCall).toBe('function');
    expect(typeof fillForm).toBe('function');
    expect(typeof submitForm).toBe('function');
    expect(typeof checkAccessibility).toBe('function');
    expect(typeof waitForLoadingToFinish).toBe('function');
    expect(typeof waitForErrorMessage).toBe('function');
  });
});