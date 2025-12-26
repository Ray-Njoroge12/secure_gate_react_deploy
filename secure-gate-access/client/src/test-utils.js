import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from './contexts/AuthContext.js';
import { ErrorProvider } from './contexts/ErrorContext.jsx';

export function createAuthValue(overrides = {}) {
  const user = overrides.user ?? null;
  const loading = overrides.loading ?? false;
  const isAuthenticated = overrides.isAuthenticated ?? !!user;

  return {
    user,
    loading,
    isAuthenticated,
    login: overrides.login ?? jest.fn(),
    logout: overrides.logout ?? jest.fn(),
    register: overrides.register ?? jest.fn(),
    hasRole: overrides.hasRole ?? ((role) => user?.role === role),
    hasAnyRole: overrides.hasAnyRole ?? ((roles) => roles.includes(user?.role))
  };
}

export function renderWithRouter(ui, { route = '/' } = {}) {
  return render(
    <ErrorProvider>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </ErrorProvider>
  );
}

export function renderWithAuth(ui, { route = '/', auth = {} } = {}) {
  const value = createAuthValue(auth);
  return render(
    <ErrorProvider>
      <AuthContext.Provider value={value}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </AuthContext.Provider>
    </ErrorProvider>
  );
}

/**
 * Render with all providers (ErrorProvider + AuthProvider + Router)
 * Use this for testing pages that require all contexts
 */
export function renderWithProviders(ui, { route = '/', auth = {} } = {}) {
  const value = createAuthValue(auth);
  return render(
    <ErrorProvider>
      <AuthContext.Provider value={value}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </AuthContext.Provider>
    </ErrorProvider>
  );
}
