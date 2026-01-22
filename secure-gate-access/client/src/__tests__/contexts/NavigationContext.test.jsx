/**
 * Navigation Context Integration Tests
 * Verifies state updates, hooks, and navigation behavior
 */

import React, { useEffect } from 'react';
import { render, screen, act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { NavigationProvider, useNavigation, useBreadcrumbs, useNavigationHistory } from '../../contexts/NavigationContext';
import { generateBreadcrumbs } from '../../utils/navigationFlow';

// Mock utility to isolate context behavior
jest.mock('../../utils/navigationFlow', () => ({
    generateBreadcrumbs: jest.fn()
}));

// Test helper component to consume context
const TestComponent = ({ role }) => {
    const { setPageTitle, getNavigationAnalytics } = useNavigation();
    const { breadcrumbs } = useBreadcrumbs();
    const { navigationHistory } = useNavigationHistory();
    const location = useLocation();

    useEffect(() => {
        setPageTitle(`Page: ${location.pathname}`);
    }, [location, setPageTitle]);

    return (
        <div>
            <div data-testid="title">{document.title}</div>
            <div data-testid="breadcrumb-count">{breadcrumbs ? breadcrumbs.length : 'undefined'}</div>
            <div data-testid="history-count">{navigationHistory ? navigationHistory.length : 'undefined'}</div>
            <div data-testid="analytics">{JSON.stringify(getNavigationAnalytics())}</div>
        </div>
    );
};

// Wrapper for providers
const TestWrapper = ({ children, initialRoute = '/dashboard', role = 'resident' }) => (
    <MemoryRouter initialEntries={[initialRoute]}>
        <NavigationProvider userRole={role}>
            {children}
        </NavigationProvider>
    </MemoryRouter>
);

describe('Navigation Context Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // Restore mock implementation after clearing
        generateBreadcrumbs.mockImplementation((path, role) => [
            { label: 'Home', path: '/dashboard' },
            { label: 'Current', path: path }
        ]);
    });

    it('should initialize with default state', async () => {
        render(
            <TestWrapper>
                <TestComponent />
            </TestWrapper>
        );

        // Initially might be undefined or 0, but we expect it to eventually become 2 from the mock
        await waitFor(() => {
            expect(screen.getByTestId('breadcrumb-count')).toHaveTextContent('2');
        });

        expect(screen.getByTestId('history-count')).toHaveTextContent('1'); // Initial route
    });

    it('should update document title via setPageTitle', () => {
        render(
            <TestWrapper>
                <TestComponent />
            </TestWrapper>
        );

        expect(document.title).toContain('Page: /dashboard');
    });

    it('should throw error if used outside provider', () => {
        // Suppress console.error for this specific test as it expects an error
        const spy = jest.spyOn(console, 'error').mockImplementation(() => { });

        expect(() => renderHook(() => useNavigation())).toThrowError('useNavigation must be used within a NavigationProvider');

        spy.mockRestore();
    });

    it('should track navigation history', async () => {
        const HistoryTester = () => {
            const { navigateTo } = useNavigation();
            return (
                <button onClick={() => navigateTo('/new-page')}>Go</button>
            );
        };

        render(
            <TestWrapper>
                <TestComponent />
                <HistoryTester />
            </TestWrapper>
        );

        expect(screen.getByTestId('history-count')).toHaveTextContent('1');

        await act(async () => {
            screen.getByText('Go').click();
            // Wait for async state updates in context (setTimeout in navigateTo)
            await new Promise(r => setTimeout(r, 150));
        });

        expect(screen.getByTestId('history-count')).toHaveTextContent('2');
    });
});
