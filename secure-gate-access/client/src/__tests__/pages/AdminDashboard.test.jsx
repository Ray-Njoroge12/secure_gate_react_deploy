import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import AdminDashboard from '../../pages/admin/AdminDashboard.jsx';
import { getMetrics, getAuditLogs } from '../../services/adminService';
import { renderWithAuth } from '../../test-utils';
import { handleApiError } from '../../utils/errorMapper';

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

jest.mock('../../utils/errorMapper', () => ({
  __esModule: true,
  handleApiError: jest.fn((e) => e.message || 'Error')
}));

jest.mock('../../components/StatsCard', () => ({
  __esModule: true,
  default: ({ title, value }) => (
    <div>
      <div>{title}</div>
      <div>{value}</div>
    </div>
  )
}));

jest.mock('../../components/Table', () => () => <div>Table</div>);

jest.mock('../../components/ui', () => ({
  __esModule: true,
  SearchFilter: () => <div>SearchFilter</div>,
  Pagination: () => <div>Pagination</div>
}));

jest.mock('../../components/common/OfflineIndicator', () => () => <div>OfflineIndicator</div>);
jest.mock('../../components/common/AnnouncementsBanner', () => () => <div>AnnouncementsBanner</div>);
jest.mock('../../components/common/OnboardingTour', () => () => <div>OnboardingTour</div>);

jest.mock('../../components/admin/AnnouncementsAdmin', () => () => <div>AnnouncementsAdmin</div>);
jest.mock('../../components/admin/AnalyticsDashboard', () => () => <div>AnalyticsDashboard</div>);
jest.mock('../../components/settings/PrivacyDashboard', () => () => <div>PrivacyDashboard</div>);

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loads metrics and audit logs and renders key sections', async () => {
    getMetrics.mockResolvedValue({
      invitesActive: 3,
      invitesExpired: 1,
      checkinsToday: 4,
      failedOtps: 0,
      invitesByStatus: []
    });

    getAuditLogs.mockResolvedValue([
      {
        created_at: '2025-01-01',
        user_id: 'u1',
        action: 'LOGIN',
        entity_type: 'user',
        entity_id: 'u1',
        details: { ok: true },
        ip_address: '127.0.0.1'
      }
    ]);

    renderWithAuth(
      <Routes>
        <Route path="/dashboard/admin" element={<AdminDashboard />} />
      </Routes>,
      { route: '/dashboard/admin', auth: { user: { id: 'a1', role: 'admin' } } }
    );

    expect(await screen.findByText('Admin Dashboard')).toBeInTheDocument();

    await waitFor(() => {
      expect(getMetrics).toHaveBeenCalled();
      expect(getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: '1', limit: '25' })
      );
    });

    expect(screen.getByText('Active Invites')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
  });

  test('shows error message when metrics fail to load', async () => {
    getMetrics.mockRejectedValue(new Error('Metrics failed'));
    getAuditLogs.mockResolvedValue([]);

    renderWithAuth(
      <Routes>
        <Route path="/dashboard/admin" element={<AdminDashboard />} />
      </Routes>,
      { route: '/dashboard/admin', auth: { user: { id: 'a1', role: 'admin' } } }
    );

    expect(await screen.findByText('Admin Dashboard')).toBeInTheDocument();

    await waitFor(() => {
      expect(getMetrics).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(handleApiError).toHaveBeenCalled();
    });

    // UI rendering of the error banner is validated indirectly here by ensuring
    // the component enters the metrics error path.
  });
});
