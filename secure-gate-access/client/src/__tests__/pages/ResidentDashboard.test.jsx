import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import ResidentDashboard from '../../pages/resident/ResidentDashboard.jsx';
import { renderWithAuth } from '../../test-utils';

jest.mock('../../layouts/AppShell', () => ({ children, title }) => (
  <div>
    <h1>{title}</h1>
    {children}
  </div>
));

jest.mock('lucide-react', () => ({
  __esModule: true,
  Settings: () => <svg data-testid="settings-icon" />
}));

jest.mock('../../hooks/useLoadingState', () => ({
  __esModule: true,
  useLoadingState: () => ({
    loading: false,
    startLoading: jest.fn(),
    stopLoading: jest.fn(),
    setLoadingError: jest.fn()
  })
}));

jest.mock('../../contexts/ErrorContext', () => {
  const handlers = {
    handleError: jest.fn(),
    handleApiError: jest.fn(),
    clearAllErrors: jest.fn()
  };

  return {
    __esModule: true,
    ErrorProvider: ({ children }) => children,
    useError: () => handlers
  };
});

jest.mock('../../services/notificationService', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

jest.mock('../../hooks/useVisitorEvents', () => ({
  __esModule: true,
  useResidentVisitorEvents: () => ({
    recentEvents: [],
    liveStats: {},
    connectionStatus: 'connected',
    lastUpdate: null,
    refreshStats: jest.fn(),
    clearEvents: jest.fn()
  })
}));

jest.mock('../../components/resident/DashboardWidgetCustomizer', () => ({
  __esModule: true,
  default: ({ isOpen }) => (isOpen ? <div>Widget Customizer</div> : null),
  useWidgetConfig: () => ({
    isWidgetVisible: () => true,
    refreshConfig: jest.fn(),
    getVisibleWidgets: () => []
  })
}));

jest.mock('../../components/resident/VisitorInsights', () => () => <div>VisitorInsights</div>);
jest.mock('../../components/resident/DeliveryList', () => () => <div>DeliveryList</div>);
jest.mock('../../components/resident/AutoApprovalRules', () => () => <div>AutoApprovalRules</div>);
jest.mock('../../components/resident/FavoriteVisitors', () => () => <div>FavoriteVisitors</div>);
jest.mock('../../components/dashboard/LiveVisitorFeed', () => ({
  __esModule: true,
  LiveVisitorFeed: () => <div>LiveVisitorFeed</div>,
  LiveStatsBar: () => <div>LiveStatsBar</div>
}));

jest.mock('../../components/common/OfflineIndicator', () => () => <div>OfflineIndicator</div>);
jest.mock('../../components/common/AnnouncementsBanner', () => () => <div>AnnouncementsBanner</div>);
jest.mock('../../components/common/OnboardingTour', () => () => <div>OnboardingTour</div>);
jest.mock('../../components/common/QuickActionMenu', () => () => <div>QuickActionMenu</div>);
jest.mock('../../components/settings/PrivacyDashboard', () => () => <div>PrivacyDashboard</div>);

jest.mock('../../components/ui', () => {
  const Card = ({ children }) => <div>{children}</div>;
  Card.Header = ({ children }) => <div>{children}</div>;
  Card.Title = ({ children }) => <div>{children}</div>;
  Card.Content = ({ children }) => <div>{children}</div>;

  const Skeleton = ({ children }) => <div>{children}</div>;
  Skeleton.List = () => <div>SkeletonList</div>;

  return {
    __esModule: true,
    Card,
    Skeleton,
    Icon: ({ name }) => <span data-testid={`icon-${name}`}>{name}</span>,
    Button: ({ children, onClick, disabled }) => (
      <button onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
    Badge: ({ children }) => <span>{children}</span>,
    SearchFilter: () => <div>SearchFilter</div>,
    SearchResults: () => <div>SearchResults</div>,
    Pagination: () => <div>Pagination</div>,
    UpcomingVisitsEmpty: () => <div>No upcoming visits</div>,
    RecentVisitorsEmpty: () => <div>No recent visitors</div>
  };
});

// AddVisitor page doesn't exist - removed from mocks
jest.mock('../../pages/resident/BulkInvite', () => () => <div>BulkInvite</div>);
jest.mock('../../pages/resident/VisitorHistory', () => () => <div>VisitorHistory</div>);

jest.mock('../../pages/resident/Settings', () => () => <div>Settings</div>);
jest.mock('../../pages/resident/QuickInvite', () => () => <div>QuickInvite</div>);
jest.mock('../../pages/resident/ResidentApprovalsPanel', () => () => <div>ResidentApprovalsPanel</div>);

describe('ResidentDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches visitors and renders dashboard shell', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (url === '/api/auth/me') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: { user: { id: 'u1', role: 'resident', mfa_enabled: true } }
          })
        };
      }

      if (url === '/api/visitors') {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 1,
                name: 'Upcoming Visitor',
                date_of_visit: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                time_of_visit: '10:00',
                status: 'Confirmed'
              },
              {
                id: 2,
                name: 'Checked In Visitor',
                check_in: new Date().toISOString(),
                status: 'Checked In'
              }
            ]
          })
        };
      }

      return {
        ok: true,
        json: async () => ({ data: [] })
      };
    });

    renderWithAuth(
      <Routes>
        <Route path="/dashboard/resident" element={<ResidentDashboard />} />
      </Routes>,
      { route: '/dashboard/resident', auth: { user: { id: 'u1', role: 'resident' } } }
    );

    // Wait for the dashboard to render - check for Quick Invite CTA
    await screen.findByText(/quick invite/i);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/visitors',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );
    });

    expect(screen.getByText(/quick invite/i)).toBeInTheDocument();

    fetchSpy.mockRestore();
  });

  // Note: Route-based conditional rendering is handled at App.js level, not within ResidentDashboard
  // Subpage routing tests should be in integration/routing tests
});
