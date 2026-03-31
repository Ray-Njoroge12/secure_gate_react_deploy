import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';

import LoginPage from '../../pages/Login.jsx';
import RegistrationPage from '../../pages/Register.js';
import ResidentDashboard from '../../pages/resident/ResidentDashboard.jsx';
import GuardDashboard from '../../pages/guard/GuardDashboard.jsx';
import AdminDashboard from '../../pages/admin/AdminDashboard.jsx';
import { getMetrics, getAuditLogs } from '../../services/adminService';

import GradientButton from '../../components/ui/GradientButton.jsx';
import GradientCard from '../../components/ui/GradientCard.jsx';
import FloatingLabelInput from '../../components/ui/FloatingLabelInput.jsx';

import { renderWithAuth, renderWithRouter } from '../../test-utils';

jest.mock('../../layouts/AppShell', () => ({ children, title }) => (
  <div>
    <h1>{title}</h1>
    {children}
  </div>
));

jest.mock('../../services/adminService', () => ({
  __esModule: true,
  getMetrics: jest.fn(),
  getAuditLogs: jest.fn()
}));

jest.mock('../../contexts/ErrorContext.jsx', () => {
  const mockErrorContext = {
    logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
    errorQueueService: { addError: jest.fn(), clearErrors: jest.fn() }
  };

  const handlers = {
    handleError: jest.fn(),
    handleSuccess: jest.fn(),
    handleWarning: jest.fn(),
    clearAllErrors: jest.fn(),
    handleApiError: jest.fn()
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
  useSearchData: (data, _searchFields, _filterFields, options = {}) => ({
    data,
    pagination: { currentPage: 1, totalPages: 1, pageSize: options.pageSize || 25 },
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
  default: () => null,
  useWidgetConfig: () => ({
    isWidgetVisible: () => true,
    refreshConfig: jest.fn(),
    getVisibleWidgets: () => []
  })
}));

jest.mock('../../components/resident/VisitorInsights', () => () => <div />);
jest.mock('../../components/resident/DeliveryList', () => () => <div />);
jest.mock('../../components/resident/AutoApprovalRules', () => () => <div />);
jest.mock('../../components/resident/FavoriteVisitors', () => () => <div />);
jest.mock('../../components/dashboard/LiveVisitorFeed', () => ({
  __esModule: true,
  LiveVisitorFeed: () => <div />,
  LiveStatsBar: () => <div />
}));

// Prevent indexedDB usage from syncService (used by OfflineIndicator)
jest.mock('../../components/common/OfflineIndicator', () => () => <div />);
jest.mock('../../components/common/AnnouncementsBanner', () => () => <div />);

// Prevent pulling in components/ui/index.js via components/PageHeader.jsx
jest.mock('../../components/PageHeader', () => () => <div />);

// Common UX components may depend on UI exports (e.g., ActionBar) that we don't load in a11y tests
jest.mock('../../components/common/QuickActionMenu', () => () => <div />);
jest.mock('../../components/common/OnboardingTour', () => () => <div />);

jest.mock('../../components/common/LiveConnectionStatus', () => () => <div />);
jest.mock('../../components/guard/DashboardKPIs', () => () => <div />);
jest.mock('../../components/guard/QuickFilters', () => () => <div />);
jest.mock('../../components/guard/PendingApprovalsQueue', () => () => <div />);
jest.mock('../../components/guard/PanicButton', () => () => <div />);
jest.mock('../../components/guard/EmergencyAlertBanner', () => () => <div />);
jest.mock('../../components/guard/RecentVisitors', () => () => <div />);
jest.mock('../../components/guard/PendingDeliveries', () => () => <div />);
jest.mock('../../components/guard/VisitorDetailsModal', () => () => <div />);

jest.mock('../../components/admin/AnnouncementsAdmin', () => () => <div />);
jest.mock('../../components/admin/AnalyticsDashboard', () => () => <div />);

jest.mock('../../components/settings/PrivacyDashboard', () => () => <div />);

// AddVisitor page doesn't exist - removed from mocks
jest.mock('../../pages/resident/BulkInvite', () => () => <div />);
jest.mock('../../pages/resident/VisitorHistory', () => () => <div />);

jest.mock('../../pages/resident/Settings', () => () => <div />);
jest.mock('../../pages/resident/QuickInvite', () => () => <div />);
jest.mock('../../pages/resident/ResidentApprovalsPanel', () => () => <div />);

jest.mock('../../pages/guard/ManualCheck', () => () => <div />);
jest.mock('../../pages/guard/ScanQR', () => () => <div />);
jest.mock('../../pages/guard/Settings', () => () => <div />);
jest.mock('../../pages/guard/VisitorHistory', () => () => <div />);

jest.mock('../../components/Table', () => () => <div />);

jest.mock('../../components/ui', () => {
  const FloatingLabelInput = require('../../components/ui/FloatingLabelInput.jsx').default;
  const GradientButton = require('../../components/ui/GradientButton.jsx').default;
  const GradientCard = require('../../components/ui/GradientCard.jsx').default;
  const Icon = require('../../components/ui/Icon.jsx').default;

  const CheckboxModule = require('../../components/ui/Checkbox.jsx');
  const Checkbox = CheckboxModule.Checkbox || CheckboxModule.default;

  const Card = require('../../components/ui/Card.jsx').default;
  const Button = require('../../components/ui/Button.jsx').default;
  const Badge = require('../../components/ui/Badge.jsx').default;

  const Skeleton = () => <div />;
  Skeleton.List = () => <div />;

  return {
    __esModule: true,
    FloatingLabelInput,
    GradientButton,
    GradientCard,
    Icon,
    Checkbox,
    Card,
    Button,
    Badge,
    SearchFilter: () => <div />,
    SearchResults: () => <div />,
    Pagination: () => <div />,
    LoadingStates: () => <div />,
    Skeleton,
    UpcomingVisitsEmpty: () => <div />,
    RecentVisitorsEmpty: () => <div />
  };
});

class MockEventSource {
  constructor() {
    this.onopen = null;
    this.onerror = null;
  }
  addEventListener() { }
  close() { }
}

describe('Accessibility (jest-axe)', () => {
  beforeEach(() => {
    global.EventSource = MockEventSource;
  });

  test('LoginPage has no detectable a11y violations', async () => {
    const { container } = renderWithAuth(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login', auth: { isAuthenticated: false, user: null } }
    );

    expect(await screen.findByText('Welcome Back')).toBeInTheDocument();

    const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results).toHaveNoViolations();
  });

  test('RegistrationPage has no detectable a11y violations', async () => {
    const { container } = renderWithRouter(
      <Routes>
        <Route path="/register" element={<RegistrationPage />} />
      </Routes>,
      { route: '/register' }
    );

    expect(await screen.findByRole('button', { name: /create account/i })).toBeInTheDocument();

    const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results).toHaveNoViolations();
  });

  test('ResidentDashboard has no detectable a11y violations (mocked widgets)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] })
    });

    const { container } = renderWithAuth(
      <Routes>
        <Route path="/dashboard/resident" element={<ResidentDashboard />} />
      </Routes>,
      { route: '/dashboard/resident', auth: { user: { id: 'u1', role: 'resident' } } }
    );

    // Wait for the dashboard to render - check for Quick Invite CTA or Welcome message
    await screen.findByText(/quick invite/i);

    const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results).toHaveNoViolations();

    global.fetch.mockRestore();
  });

  test('GuardDashboard has no detectable a11y violations (mocked widgets)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });

    const { container } = renderWithAuth(
      <Routes>
        <Route path="/dashboard/guard" element={<GuardDashboard />} />
      </Routes>,
      { route: '/dashboard/guard', auth: { user: { id: 'g1', role: 'guard' } } }
    );

    // Wait for the dashboard to render - check for Guard Station header or empty state text
    await screen.findByText(/guard station/i);

    const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results).toHaveNoViolations();

    global.fetch.mockRestore();
  });

  test('AdminDashboard has no detectable a11y violations (mocked widgets)', async () => {
    getMetrics.mockResolvedValue({ invitesActive: 0, invitesExpired: 0, checkinsToday: 0, failedOtps: 0, invitesByStatus: [] });
    getAuditLogs.mockResolvedValue([]);

    const { container } = renderWithAuth(
      <Routes>
        <Route path="/dashboard/admin" element={<AdminDashboard />} />
      </Routes>,
      { route: '/dashboard/admin', auth: { user: { id: 'a1', role: 'admin' } } }
    );

    // Wait for the dashboard to render - use a stable current overview label
    await screen.findByText(/notification system status/i);

    const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results).toHaveNoViolations();
  });

  test('UI components have no detectable a11y violations', async () => {
    const { container } = render(
      <div>
        <GradientButton>Submit</GradientButton>
        <GradientCard>
          <GradientCard.Title>Title</GradientCard.Title>
          <GradientCard.Description>Description</GradientCard.Description>
        </GradientCard>
        <FloatingLabelInput id="email" label="Email" />
      </div>
    );

    const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results).toHaveNoViolations();
  });
});
