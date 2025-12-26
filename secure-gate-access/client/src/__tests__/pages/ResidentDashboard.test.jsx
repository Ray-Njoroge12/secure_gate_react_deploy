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

jest.mock('../../pages/resident/AddVisitor', () => () => <div>AddVisitor</div>);
jest.mock('../../pages/resident/BulkInvite', () => () => <div>BulkInvite</div>);
jest.mock('../../pages/resident/VisitorHistory', () => () => <div>VisitorHistory</div>);
jest.mock('../../pages/resident/GeneratePass', () => () => <div>GeneratePass</div>);
jest.mock('../../pages/resident/Settings', () => () => <div>Settings</div>);
jest.mock('../../pages/resident/QuickInvite', () => () => <div>QuickInvite</div>);
jest.mock('../../pages/resident/ResidentApprovalsPanel', () => () => <div>ResidentApprovalsPanel</div>);

describe('ResidentDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches visitors and renders dashboard shell', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
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
    });

    renderWithAuth(
      <Routes>
        <Route path="/dashboard/resident" element={<ResidentDashboard />} />
      </Routes>,
      { route: '/dashboard/resident', auth: { user: { id: 'u1', role: 'resident' } } }
    );

    expect(await screen.findByText('Resident Dashboard')).toBeInTheDocument();

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

  test('renders alternate panels when route matches resident subpages', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] })
    });

    renderWithAuth(
      <Routes>
        <Route path="/resident/add-visitor" element={<ResidentDashboard />} />
      </Routes>,
      { route: '/resident/add-visitor', auth: { user: { id: 'u1', role: 'resident' } } }
    );

    expect(await screen.findByText('AddVisitor')).toBeInTheDocument();

    global.fetch.mockRestore();
  });
});
