import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import App from '../../App';
import { AuthContext } from '../../contexts/AuthContext';
import { ErrorProvider } from '../../contexts/ErrorContext';

// Mock child components to avoid deep rendering and focusing on routing
jest.mock('../../pages/Login', () => () => <div data-testid="login-page">Login Page</div>);
jest.mock('../../pages/admin/AdminDashboard', () => () => <div data-testid="admin-dashboard">Admin Dashboard</div>);
jest.mock('../../pages/resident/ResidentDashboard', () => () => <div data-testid="resident-dashboard">Resident Dashboard</div>);
jest.mock('../../pages/guard/GuardDashboard', () => () => <div data-testid="guard-dashboard">Guard Dashboard</div>);

// Mock other providers/components used in App
jest.mock('../../components/ui/Toast', () => ({ ToastContainer: () => null }));
jest.mock('../../components/ErrorQueue', () => () => null);
jest.mock('../../components/BrowserCompatibilityWarning', () => () => null);
jest.mock('../../components/ErrorQueue', () => () => null);
jest.mock('../../components/BrowserCompatibilityWarning', () => () => null);
jest.mock('../../components/CookieConsentBanner', () => () => null);
jest.mock('../../contexts/RootProvider', () => ({ children }) => <div>{children}</div>);
jest.mock('../../layouts/AppShell', () => ({ children }) => <div>{children}</div>);

// Mock Page Components to avoid loading real dependencies
jest.mock('../../pages/admin/AdminDashboard', () => () => <div data-testid="admin-dashboard">Admin Dashboard</div>);
jest.mock('../../pages/guard/GuardDashboard', () => () => <div data-testid="guard-dashboard">Guard Dashboard</div>);
jest.mock('../../pages/Login', () => () => <div data-testid="login-page">Login Page</div>);
jest.mock('../../pages/EstateRequired', () => () => <div data-testid="estate-required">Estate Required</div>);

// Helper to render App with specific auth state
const renderWithAuth = (initialEntries = ['/'], authValue = {}) => {
    const defaultAuth = {
        isAuthenticated: false,
        user: null,
        loading: false,
        checkAuthStatus: jest.fn(),
        login: jest.fn(),
        logout: jest.fn(),
        ...authValue
    };

    return render(
        <AuthContext.Provider value={defaultAuth}>
            <ErrorProvider>
                <MemoryRouter initialEntries={initialEntries}>
                    <App />
                </MemoryRouter>
            </ErrorProvider>
        </AuthContext.Provider>
    );
};

describe('App Routing & Access Control', () => {
    // 1. Public Routes
    test('renders login page on default route', async () => {
        renderWithAuth(['/login']);
        // Wait for lazy load
        await waitFor(() => expect(screen.getByTestId('login-page')).toBeInTheDocument());
    });

    // 2. Protected Routes - Unauthenticated
    test('redirects unauthenticated user to login when trying to access protected route', async () => {
        renderWithAuth(['/dashboard/admin']);
        // Should be redirected to login
        await waitFor(() => expect(screen.getByTestId('login-page')).toBeInTheDocument());
    });

    // 3. Protected Routes - Authorized (Admin)
    test('renders admin dashboard for authenticated admin user', async () => {
        const adminUser = { role: 'admin', name: 'Admin user' };
        renderWithAuth(['/dashboard/admin'], { isAuthenticated: true, user: adminUser });

        await waitFor(() => expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument());
    });

    // 4. Protected Routes - Authorized (Resident)
    test('renders resident dashboard for authenticated resident user', async () => {
        const residentUser = { role: 'resident', name: 'Resident user' };
        renderWithAuth(['/dashboard/resident'], { isAuthenticated: true, user: residentUser });

        await waitFor(() => expect(screen.getByTestId('resident-dashboard')).toBeInTheDocument());
    });

    // 5. Protected Routes - Unauthorized (Role Mismatch)
    // Note: Your ProtectedRoute implementation determines behavior here. 
    // Typically it might redirect to unauthorized or home. 
    // Adjust expectation based on actual ProtectedRoute logic.
    test('blocks resident from accessing admin dashboard', async () => {
        const residentUser = { role: 'resident', name: 'Resident user' };
        renderWithAuth(['/dashboard/admin'], { isAuthenticated: true, user: residentUser });

        // Assuming ProtectedRoute redirects to home or stays on login if not authorized
        // Or displays an Unauthorized message.
        // For this test, we verify Admin Dashboard is NOT present.
        await waitFor(() => {
            expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument();
        });
    });
});
