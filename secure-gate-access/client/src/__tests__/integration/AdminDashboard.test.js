import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from '../../pages/admin/AdminDashboard';
import { useSearchData } from '../../hooks/useSearch';
import { AuthContext } from '../../contexts/AuthContext';

// Mock hooks
jest.mock('../../hooks/useSearch', () => ({
    useSearchData: jest.fn()
}));

// Mock API service to prevent actual calls
jest.mock('../../services/adminService', () => ({
    getMetrics: jest.fn().mockResolvedValue({}),
    getSystemHealth: jest.fn().mockResolvedValue({})
}));

// Mock child components to verify tab rendering logic
jest.mock('../../components/admin/AdminMetrics', () => () => <div data-testid="admin-metrics">Metrics</div>);
jest.mock('../../components/admin/AdminUserApprovals', () => () => <div data-testid="user-approvals">Approvals</div>);
jest.mock('../../components/admin/AuditLogs', () => () => <div data-testid="audit-logs">Audit Logs</div>);
jest.mock('../../components/common/OfflineIndicator', () => () => null);
jest.mock('../../pages/admin/PendingApprovals', () => () => <div data-testid="pending-approvals">Pending Approvals</div>);
jest.mock('../../components/admin/AnalyticsDashboard', () => () => <div data-testid="analytics-dashboard">Analytics Dashboard</div>);

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate
}));

describe('AdminDashboard Navigation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useSearchData.mockReturnValue({
            data: [],
            pagination: {},
            searchTerm: '',
            setSearchTerm: jest.fn(),
            filters: {},
            setFilters: jest.fn()
        });
    });

    const mockAuth = {
        user: { name: 'Admin User', role: 'admin' },
        isAuthenticated: true,
        checkAuthStatus: jest.fn(),
        logout: jest.fn()
    };

    const renderWithAuth = (component) => {
        return render(
            <AuthContext.Provider value={mockAuth}>
                <MemoryRouter>
                    {component}
                </MemoryRouter>
            </AuthContext.Provider>
        );
    };

    test('renders default overview tab when no prop provided', async () => {
        renderWithAuth(<AdminDashboard />);

        await waitFor(() => {
            expect(screen.getByTestId('admin-metrics')).toBeInTheDocument();
        });
    });

    test('renders specific tab content based on initialTab prop', async () => {
        renderWithAuth(<AdminDashboard initialTab="approvals" />);

        await waitFor(() => {
            expect(screen.getByTestId('user-approvals')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('admin-metrics')).not.toBeInTheDocument();
    });

    test('navigates to correct URL when tab is clicked', async () => {
        renderWithAuth(<AdminDashboard initialTab="overview" />);

        // Find the 'User Management' or valid tab button
        // Note: The actual label might be 'User Approvals' or similar based on your code
        const tabButton = screen.getByText('User Approvals');
        fireEvent.click(tabButton);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/approvals');
        });
    });
});
