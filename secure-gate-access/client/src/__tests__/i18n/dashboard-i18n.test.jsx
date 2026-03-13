import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock i18n to verify t() is called with dashboard keys
const mockT = jest.fn((key) => `[${key}]`);
jest.mock('../../i18n/index.js', () => ({
  useI18n: () => ({
    t: mockT,
    language: 'en',
    setLanguage: jest.fn(),
    formatDate: jest.fn((d) => String(d)),
    formatRelativeTime: jest.fn(() => 'just now'),
    isRTL: false,
    direction: 'ltr'
  }),
  I18nProvider: ({ children }) => children,
  LanguageSelector: () => null
}));

// Mock contexts
jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({ user: { id: 1, name: 'Test Guard', mfa_enabled: true }, logout: jest.fn() }),
}));

jest.mock('../../hooks/useCurrentRole', () => ({
  __esModule: true,
  useCurrentRole: () => 'guard',
}));

jest.mock('../../contexts/ErrorContext', () => ({
  __esModule: true,
  ErrorProvider: ({ children }) => children,
  useError: () => ({ handleError: jest.fn(), handleApiError: jest.fn(), clearAllErrors: jest.fn() }),
}));

jest.mock('../../contexts/LoadingContext', () => ({
  __esModule: true,
  useLoading: () => ({ setLoading: jest.fn(), isLoading: jest.fn(() => false) }),
}));

jest.mock('../../hooks/useSearch', () => ({
  __esModule: true,
  useSearchData: (data) => ({
    data: data || [],
    pagination: { currentPage: 1, totalPages: 1 },
    searchTerm: '',
    filters: {},
    setSearchTerm: jest.fn(),
    setFilters: jest.fn(),
    clearFilters: jest.fn(),
    setPage: jest.fn(),
    isSearching: false,
    hasFilters: false,
    hasResults: false,
  }),
}));

jest.mock('../../services/notificationService', () => ({
  __esModule: true,
  default: { success: jest.fn(), warning: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('../../services/visitorService', () => ({
  __esModule: true,
  verifyOtp: jest.fn(),
}));

// Mock guard sub-components
jest.mock('../../components/guard/DashboardKPIs', () => () => null);
jest.mock('../../components/guard/QuickFilters', () => () => null);
jest.mock('../../components/guard/PendingApprovalsQueue', () => () => null);
jest.mock('../../components/guard/PanicButton', () => () => null);
jest.mock('../../components/guard/EmergencyAlertBanner', () => () => null);
jest.mock('../../components/guard/RecentVisitors', () => () => null);
jest.mock('../../components/guard/PendingDeliveries', () => () => null);
jest.mock('../../components/guard/VisitorDetailsModal', () => () => null);
jest.mock('../../components/common/LiveConnectionStatus', () => () => null);
jest.mock('../../components/common/OfflineIndicator', () => () => null);
jest.mock('../../components/common/AnnouncementsBanner', () => () => null);
jest.mock('../../components/common/OnboardingTour', () => () => null);
jest.mock('../../components/common/QuickActionMenu', () => () => null);
jest.mock('../../components/common/ConfirmationDialog', () => ({
  __esModule: true,
  useConfirmation: () => ({
    confirm: jest.fn().mockResolvedValue(true),
    dialogProps: {},
    Dialog: () => null,
  }),
}));

jest.mock('../../components/Table', () => () => null);

jest.mock('../../components/ui', () => {
  const Card = ({ children }) => <div>{children}</div>;
  Card.Header = ({ children }) => <div>{children}</div>;
  Card.Title = ({ children }) => <div>{children}</div>;
  Card.Content = ({ children }) => <div>{children}</div>;
  return {
    __esModule: true,
    Card,
    Button: ({ children, onClick, disabled }) => (
      <button onClick={onClick} disabled={disabled}>{children}</button>
    ),
    Badge: ({ children }) => <span>{children}</span>,
    SearchFilter: () => null,
    SearchResults: () => null,
    Pagination: () => null,
    Skeleton: () => null,
  };
});

jest.mock('../../utils/statusColors', () => ({
  __esModule: true,
  getStatusChipClass: () => 'chip',
  getStatusIcon: () => '',
}));

jest.mock('utils/logger', () => ({
  __esModule: true,
  default: { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

// Mock fetch for active visitors endpoint
beforeAll(() => {
  global.fetch = jest.fn().mockResolvedValue({
    json: () => Promise.resolve({ success: true, data: [] }),
  });
  global.EventSource = class {
    constructor() { this.onopen = null; this.onerror = null; }
    addEventListener() {}
    close() {}
  };
});

afterAll(() => {
  delete global.fetch;
  delete global.EventSource;
});

describe('Dashboard i18n', () => {
  beforeEach(() => {
    mockT.mockClear();
    mockT.mockImplementation((key) => `[${key}]`);
  });

  test('GuardDashboard uses t() for UI strings', async () => {
    // Dynamic import after mocks are set up
    const GuardDashboard = (await import('../../pages/guard/GuardDashboard')).default;

    render(
      <MemoryRouter>
        <GuardDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      const calledKeys = mockT.mock.calls.map((c) => c[0]);
      expect(calledKeys.some((k) => k.startsWith('dashboard.'))).toBe(true);
    });
  });

  test('GuardDashboard calls t() with guard-specific dashboard keys', async () => {
    const GuardDashboard = (await import('../../pages/guard/GuardDashboard')).default;

    render(
      <MemoryRouter>
        <GuardDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      const calledKeys = mockT.mock.calls.map((c) => c[0]);
      expect(calledKeys.some((k) => k.startsWith('dashboard.guard.'))).toBe(true);
    });
  });
});
