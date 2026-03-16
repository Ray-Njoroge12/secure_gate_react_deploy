import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { waitFor } from '@testing-library/react';
import GuardDashboard from '../../pages/guard/GuardDashboard.jsx';
import { renderWithAuth } from '../../test-utils';

// Reuse same mocks as GuardDashboard.test.jsx
jest.mock('../../layouts/AppShell', () => ({ children, title }) => (
  <div><h1>{title}</h1>{children}</div>
));
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
    data, pagination: { currentPage: 1, totalPages: 1 },
    searchTerm: '', filters: {}, setSearchTerm: jest.fn(), setFilters: jest.fn(),
    clearFilters: jest.fn(), setPage: jest.fn(), isSearching: false, hasFilters: false,
    hasResults: (data || []).length > 0
  })
}));
jest.mock('../../services/notificationService', () => ({
  __esModule: true,
  default: { success: jest.fn(), warning: jest.fn(), error: jest.fn(), info: jest.fn() }
}));
jest.mock('../../components/common/LiveConnectionStatus', () => () => null);
jest.mock('../../components/guard/DashboardKPIs', () => () => null);
jest.mock('../../components/guard/QuickFilters', () => () => null);
jest.mock('../../components/guard/PendingApprovalsQueue', () => () => null);
jest.mock('../../components/guard/PanicButton', () => () => null);
jest.mock('../../components/guard/EmergencyAlertBanner', () => () => null);
jest.mock('../../components/guard/RecentVisitors', () => () => null);
jest.mock('../../components/guard/PendingDeliveries', () => () => null);
jest.mock('../../components/guard/VisitorDetailsModal', () => () => null);
jest.mock('../../components/common/OfflineIndicator', () => () => null);
jest.mock('../../components/common/AnnouncementsBanner', () => () => null);
jest.mock('../../components/common/OnboardingTour', () => () => null);
jest.mock('../../components/common/QuickActionMenu', () => () => null);
jest.mock('../../pages/guard/ManualCheck', () => () => null);
jest.mock('../../pages/guard/ScanQR', () => () => null);
jest.mock('../../pages/guard/Settings', () => () => null);
jest.mock('../../pages/guard/VisitorHistory', () => () => null);
jest.mock('../../components/Table', () => () => null);
jest.mock('../../components/ui', () => {
  const Card = ({ children }) => <div>{children}</div>;
  Card.Header = ({ children }) => <div>{children}</div>;
  Card.Title = ({ children }) => <div>{children}</div>;
  Card.Content = ({ children }) => <div>{children}</div>;
  return {
    __esModule: true, Card,
    Button: ({ children, onClick, disabled }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
    Badge: ({ children }) => <span>{children}</span>,
    SearchFilter: () => null, SearchResults: () => null, Pagination: () => null,
    Skeleton: () => null,
  };
});

// Track EventSource instantiations
let esInstances = [];

class MockEventSource {
  constructor(url) {
    this.url = url;
    this.onopen = null;
    this.onerror = null;
    this._listeners = {};
    esInstances.push(this);
  }
  addEventListener(type, fn) { this._listeners[type] = fn; }
  close() { this._closed = true; }
}

function renderDashboard() {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true, json: async () => ({ success: true, data: [] })
  });
  return renderWithAuth(
    <Routes><Route path="/dashboard/guard" element={<GuardDashboard />} /></Routes>,
    { route: '/dashboard/guard', auth: { user: { id: 'g1', role: 'guard' } } }
  );
}

describe('GuardDashboard SSE reconnect', () => {
  beforeEach(() => {
    esInstances = [];
    global.EventSource = MockEventSource;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('does not reconnect immediately after SSE error (has backoff)', async () => {
    renderDashboard();

    // Wait for initial EventSource to be created
    await waitFor(() => expect(esInstances.length).toBe(1));

    // Trigger SSE error
    esInstances[0].onerror?.({});

    // Should NOT reconnect within 500ms
    jest.advanceTimersByTime(500);
    expect(esInstances.length).toBe(1);

    // Should reconnect after ~1000ms (first backoff delay)
    jest.advanceTimersByTime(600);
    expect(esInstances.length).toBe(2);
  });

  test('backoff increases on consecutive errors', async () => {
    renderDashboard();
    await waitFor(() => expect(esInstances.length).toBe(1));

    // First error → reconnect after ~1s
    esInstances[0].onerror?.({});
    jest.advanceTimersByTime(1100);
    expect(esInstances.length).toBe(2);

    // Second error → reconnect after ~2s
    esInstances[1].onerror?.({});
    jest.advanceTimersByTime(1500);
    expect(esInstances.length).toBe(2); // not yet
    jest.advanceTimersByTime(600);
    expect(esInstances.length).toBe(3); // now
  });

  test('backoff resets on successful connection', async () => {
    renderDashboard();
    await waitFor(() => expect(esInstances.length).toBe(1));

    // First error → reconnect after 1s
    esInstances[0].onerror?.({});
    jest.advanceTimersByTime(1100);
    expect(esInstances.length).toBe(2);

    // Successful connection resets backoff
    esInstances[1].onopen?.();

    // Next error → should reconnect after ~1s again (reset)
    esInstances[1].onerror?.({});
    jest.advanceTimersByTime(1100);
    expect(esInstances.length).toBe(3);
  });
});
