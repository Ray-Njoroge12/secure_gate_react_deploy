import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GuardDashboard from '../../pages/guard/GuardDashboard.jsx';
import { renderWithAuth } from '../../test-utils';
import notificationService from '../../services/notificationService';

jest.mock('../../layouts/AppShell', () => ({ children, title }) => (
  <div>
    <h1>{title}</h1>
    {children}
  </div>
));

jest.mock('../../contexts/ErrorContext', () => {
  const mockErrorContext = {
    logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
    errorQueueService: { addError: jest.fn(), clearErrors: jest.fn() }
  };
  
  const handlers = {
    handleError: jest.fn(),
    handleApiError: jest.fn(),
    clearAllErrors: jest.fn()
  };

  return {
    __esModule: true,
    ErrorProvider: ({ children }) => children,
    useError: () => handlers,
    __mockHandlers: handlers,
    ...mockErrorContext
  };
});

jest.mock('../../contexts/LoadingContext', () => {
  const handlers = {
    setLoading: jest.fn(),
    isLoading: jest.fn(() => false)
  };

  return {
    __esModule: true,
    useLoading: () => handlers,
    __mockHandlers: handlers
  };
});

jest.mock('../../hooks/useSearch', () => ({
  __esModule: true,
  useSearchData: (data) => ({
    data,
    pagination: { currentPage: 1, totalPages: 1 },
    searchTerm: '',
    filters: {},
    setSearchTerm: jest.fn(),
    setFilters: jest.fn(),
    clearFilters: jest.fn(),
    setPage: jest.fn(),
    isSearching: false,
    hasFilters: false,
    hasResults: (data || []).length > 0
  })
}));

jest.mock('../../services/notificationService', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

jest.mock('../../components/common/LiveConnectionStatus', () => () => <div>LiveConnectionStatus</div>);
jest.mock('../../components/guard/DashboardKPIs', () => () => <div>DashboardKPIs</div>);
jest.mock('../../components/guard/QuickFilters', () => () => <div>QuickFilters</div>);
jest.mock('../../components/guard/PendingApprovalsQueue', () => () => <div>PendingApprovalsQueue</div>);
jest.mock('../../components/guard/PanicButton', () => () => <div>PanicButton</div>);
jest.mock('../../components/guard/EmergencyAlertBanner', () => () => <div>EmergencyAlertBanner</div>);
jest.mock('../../components/guard/RecentVisitors', () => () => <div>RecentVisitors</div>);
jest.mock('../../components/guard/PendingDeliveries', () => () => <div>PendingDeliveries</div>);
jest.mock('../../components/guard/VisitorDetailsModal', () => () => <div>VisitorDetailsModal</div>);

jest.mock('../../components/common/OfflineIndicator', () => () => <div>OfflineIndicator</div>);
jest.mock('../../components/common/AnnouncementsBanner', () => () => <div>AnnouncementsBanner</div>);
jest.mock('../../components/common/OnboardingTour', () => () => <div>OnboardingTour</div>);
jest.mock('../../components/common/QuickActionMenu', () => () => <div>QuickActionMenu</div>);

jest.mock('../../pages/guard/ManualCheck', () => () => <div>ManualCheck</div>);
jest.mock('../../pages/guard/ScanQR', () => () => <div>ScanQR</div>);
jest.mock('../../pages/guard/Settings', () => () => <div>Settings</div>);
jest.mock('../../pages/guard/VisitorHistory', () => () => <div>VisitorHistory</div>);

jest.mock('../../components/Table', () => () => <div>Table</div>);

jest.mock('../../components/ui', () => {
  const Card = ({ children }) => <div>{children}</div>;
  Card.Header = ({ children }) => <div>{children}</div>;
  Card.Title = ({ children }) => <div>{children}</div>;
  Card.Content = ({ children }) => <div>{children}</div>;

  return {
    __esModule: true,
    Card,
    Button: ({ children, onClick, disabled }) => (
      <button onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
    Badge: ({ children }) => <span>{children}</span>,
    SearchFilter: () => <div>SearchFilter</div>,
    SearchResults: () => <div>SearchResults</div>,
    Pagination: () => <div>Pagination</div>
  };
});

class MockEventSource {
  constructor() {
    this.onopen = null;
    this.onerror = null;
  }
  addEventListener() {}
  close() {}
}

describe('GuardDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.EventSource = MockEventSource;
  });

  test('fetches active visitors and renders empty state when none exist', async () => {
    const emptyStateText = 'No active visitors right now';
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });

    renderWithAuth(
      <Routes>
        <Route path="/dashboard/guard" element={<GuardDashboard />} />
      </Routes>,
      { route: '/dashboard/guard', auth: { user: { id: 'g1', role: 'guard' } } }
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/visitors/active',
        expect.objectContaining({
          credentials: 'include',
          headers: expect.any(Object)
        })
      );
    });

    await waitFor(() => {
      expect(screen.queryAllByText(emptyStateText, { exact: false }).length).toBeGreaterThan(0);
    });

    fetchSpy.mockRestore();
  });

  test('check-in failure shows persistent dismissible toast', async () => {
    const user = userEvent.setup();
    const fetchSpy = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [{ id: 1, name: 'Visitor One', host: 'Host One', status: 'CONFIRMED' }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: 'Gate denied' })
      });

    renderWithAuth(
      <Routes>
        <Route path="/dashboard/guard" element={<GuardDashboard />} />
      </Routes>,
      { route: '/dashboard/guard', auth: { user: { id: 'g1', role: 'guard' } } }
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Check-in' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Check-in' }));

    expect(await screen.findByText(/Check-in failed:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    expect(notificationService.error).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  // Note: Route-based conditional rendering is handled at App.js level, not within GuardDashboard
  // Subpage routing tests should be in integration/routing tests
});
