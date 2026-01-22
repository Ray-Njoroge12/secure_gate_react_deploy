/**
 * Navigation Integration Tests
 * Verifies role-based routing and redirection logic
 */

import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ErrorProvider } from '../../contexts/ErrorContext';
import ProtectedRoute from '../../routes/ProtectedRoute';
import { server } from '../../mocks/server';
import { rest } from 'msw';

// Helper component to display current location
const LocationDisplay = () => {
    const location = useLocation();
    return <div data-testid="location-display">{location.pathname}</div>;
};

// Mock Components for Dashboards
const Login = () => <div>Login Page</div>;
const ResidentDashboard = () => <div>Resident Dashboard</div>;
const GuardDashboard = () => <div>Guard Dashboard</div>;
const AdminDashboard = () => <div>Admin Dashboard</div>;

// Test Wrapper with configurable initial route
const TestWrapper = ({ initialRoute = '/' }) => (
    <ErrorProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route
                        path="/dashboard/resident"
                        element={
                            <ProtectedRoute allowedRoles={['resident']}>
                                <ResidentDashboard />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/guard"
                        element={
                            <ProtectedRoute allowedRoles={['guard']}>
                                <GuardDashboard />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/admin"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Helper to verify redirects */}
                    <Route path="*" element={<LocationDisplay />} />
                </Routes>
                <LocationDisplay />
            </AuthProvider>
        </MemoryRouter>
    </ErrorProvider>
);

describe('Role-Based Navigation Integration Tests', () => {

    beforeEach(() => {
        cleanup();
        jest.clearAllMocks();
        localStorage.clear();
    });

    const mockUser = (role) => {
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost';
        server.use(
            rest.get(`${API_BASE_URL}/api/auth/me`, (req, res, ctx) => {
                return res(
                    ctx.status(200),
                    ctx.json({
                        success: true,
                        data: {
                            user: { id: 1, role: role, username: 'testuser' }
                        }
                    })
                );
            })
        );
    };

    describe('Unauthenticated Access', () => {
        it('should redirect to login when accessing protected resident route', async () => {
            render(<TestWrapper initialRoute="/dashboard/resident" />);

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
        });

        it('should redirect to login when accessing protected guard route', async () => {
            render(<TestWrapper initialRoute="/dashboard/guard" />);

            await waitFor(() => {
                expect(screen.getByText('Login Page')).toBeInTheDocument();
            });
        });
    });

    describe('Resident Role Access', () => {
        beforeEach(() => mockUser('resident'));

        it('should allow access to resident dashboard', async () => {
            render(<TestWrapper initialRoute="/dashboard/resident" />);

            await waitFor(() => {
                expect(screen.getByText('Resident Dashboard')).toBeInTheDocument();
            });
        });

        it('should redirect to resident dashboard when accessing guard dashboard', async () => {
            render(<TestWrapper initialRoute="/dashboard/guard" />);

            // Should eventually end up at Resident Dashboard because ProtectedRoute redirects unauthorized roles to their specific dashboard
            await waitFor(() => {
                expect(screen.getByText('Resident Dashboard')).toBeInTheDocument();
            });
        });

        it('should redirect to resident dashboard when accessing admin dashboard', async () => {
            render(<TestWrapper initialRoute="/dashboard/admin" />);

            await waitFor(() => {
                expect(screen.getByText('Resident Dashboard')).toBeInTheDocument();
            });
        });
    });

    describe('Guard Role Access', () => {
        beforeEach(() => mockUser('guard'));

        it('should allow access to guard dashboard', async () => {
            render(<TestWrapper initialRoute="/dashboard/guard" />);

            await waitFor(() => {
                expect(screen.getByText('Guard Dashboard')).toBeInTheDocument();
            });
        });

        it('should redirect to guard dashboard when accessing resident dashboard', async () => {
            render(<TestWrapper initialRoute="/dashboard/resident" />);

            await waitFor(() => {
                expect(screen.getByText('Guard Dashboard')).toBeInTheDocument();
            });
        });
    });

    describe('Admin Role Access', () => {
        beforeEach(() => mockUser('admin'));

        it('should allow access to admin dashboard', async () => {
            render(<TestWrapper initialRoute="/dashboard/admin" />);

            await waitFor(() => {
                expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
            });
        });

        it('should redirect to admin dashboard when accessing resident dashboard', async () => {
            render(<TestWrapper initialRoute="/dashboard/resident" />);

            await waitFor(() => {
                expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
            });
        });
    });
});
