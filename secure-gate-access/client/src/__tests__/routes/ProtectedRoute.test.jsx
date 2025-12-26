import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { screen } from '@testing-library/react';
import ProtectedRoute from '../../routes/ProtectedRoute.jsx';
import { renderWithAuth } from '../../test-utils';

describe('ProtectedRoute', () => {
  test('shows loading spinner while auth is loading', () => {
    renderWithAuth(
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <div>Protected</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      {
        route: '/protected',
        auth: { loading: true, isAuthenticated: false, user: null }
      }
    );

    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  test('redirects unauthenticated users to /login', () => {
    renderWithAuth(
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <div>Protected</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      {
        route: '/protected',
        auth: { loading: false, isAuthenticated: false, user: null }
      }
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  test('redirects authenticated users with disallowed role to their dashboard', () => {
    renderWithAuth(
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <div>Protected</div>
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard/guard" element={<div>Guard Dashboard</div>} />
      </Routes>,
      {
        route: '/protected',
        auth: { loading: false, isAuthenticated: true, user: { id: 1, role: 'guard' } }
      }
    );

    expect(screen.getByText('Guard Dashboard')).toBeInTheDocument();
  });
});
