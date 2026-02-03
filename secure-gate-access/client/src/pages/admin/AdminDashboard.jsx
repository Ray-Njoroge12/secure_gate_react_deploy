import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useCurrentRole } from "../../hooks/useCurrentRole";
// AppShell removed - handled by Layout Route
import AdminMetrics from '../../components/admin/AdminMetrics.jsx';
import AdminUserApprovals from '../../components/admin/AdminUserApprovals';
import AuditLogs from '../../components/admin/AuditLogs.jsx';
import {
  getMetrics,
  getAuditLogs,
  getNotificationQueueStats,
  getNotificationFailures,
  retryNotificationFailure,
  getHealthDetails,
  getEstateDetails,
  getAllEstates
} from "../../services/adminService";
import { handleApiError } from "../../utils/errorMapper";
import { useSearchData } from "../../hooks/useSearch";
import OfflineIndicator from "../../components/common/OfflineIndicator";
import AnnouncementsBanner from "../../components/common/AnnouncementsBanner";
import AnnouncementsAdmin from "../../components/admin/AnnouncementsAdmin";
// PrivacyDashboard moved to Settings tab
// Phase 4: Onboarding Tour
import OnboardingTour from "../../components/common/OnboardingTour";
// Analytics moved to Reports tab
import logger from 'utils/logger';
// PendingApprovals consolidated into AdminUserApprovals
import ManageGuards from './ManageGuards';
import ManageResidents from './ManageResidents';
import VisitorLog from './VisitorLog';
import Reports from './Reports';
import Settings from './Settings';
import Table from '../../components/Table';

export default function AdminDashboard({ initialTab = 'overview' }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const role = useCurrentRole();

  // Metrics state
  const [metrics, setMetrics] = useState({ invitesActive: 0, invitesExpired: 0, checkinsToday: 0, failedOtps: 0, invitesByStatus: [] });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState(null);

  // Notification queue state
  const [queueStats, setQueueStats] = useState(null);
  const [queueFailures, setQueueFailures] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState(null);
  const [retryingJobId, setRetryingJobId] = useState(null);

  // Health metrics state
  const [healthDetails, setHealthDetails] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState(null);

  // Estate Context State
  const [currentEstate, setCurrentEstate] = useState(null);
  const [availableEstates, setAvailableEstates] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + U to users
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        navigate('/dashboard/admin/users');
      }
      // Ctrl/Cmd + A to audit logs
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        navigate('/dashboard/admin/audit-logs');
      }
      // Ctrl/Cmd + S to settings
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        navigate('/dashboard/admin/settings');
      }
      // Ctrl/Cmd + R to refresh - reload page
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        window.location.reload();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loadingMetrics, navigate]);

  // Audit logs state
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync internal state with URL prop
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'approvals', label: 'User Approvals' },
    { id: 'guards', label: 'Guards' },
    { id: 'residents', label: 'Residents' },
    { id: 'visitors', label: 'Visitor Logs' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' }
  ];

  // Search and filter configuration for audit logs
  const searchFields = ['action', 'user_id', 'entity_type', 'entity_id', 'ip_address'];
  const filterFields = [
    { key: 'action', label: 'Action', type: 'select' },
    { key: 'entity_type', label: 'Entity Type', type: 'select' },
    { key: 'created_at', label: 'Date', type: 'date' }
  ];

  // Use search hook for audit logs
  const {
    data: filteredLogs,
    pagination,
    searchTerm,
    filters,
    setSearchTerm,
    setFilters,
    clearFilters,
    setPage: setSearchPage,
    isSearching,
    hasFilters,
    hasResults
  } = useSearchData(logs, searchFields, filterFields, {
    enablePagination: true,
    pageSize: limit
  });

  const [searchParams] = useSearchParams();
  // const siteId = searchParams.get('siteId'); // No longer directly using siteId from URL for most fetches

  // Load Metrics (Modified to support estate context)
  useEffect(() => {
    let cancelled = false;
    async function loadMetrics() {
      setLoadingMetrics(true); setMetricsError(null);
      try {
        const params = {};
        // If super admin and selected estate, pass siteId? 
        // Actually, authMiddleware now handles context via header if set, 
        // but our http client needs to know to set it.
        // For now, simpler: pass as query param if needed. 
        if (role === 'super_admin' && currentEstate) {
          params.siteId = currentEstate.id;
        } else if (!isSuperAdmin && currentEstate) {
          params.siteId = currentEstate.id; // For regular admin, ensure current estate is used
        }

        const data = await getMetrics(params);
        if (!cancelled) setMetrics(data || {});
      } catch (err) {
        if (!cancelled) {
          const errorMsg = handleApiError(err);
          setMetricsError(errorMsg);
          logger.error('Failed to load metrics:', err);
        }
      } finally {
        if (!cancelled) setLoadingMetrics(false);
      }
    }
    loadMetrics();
    const id = setInterval(loadMetrics, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [currentEstate, role, isSuperAdmin]); // Reload metrics when estate changes

  useEffect(() => {
    let cancelled = false;

    async function loadQueueData() {
      setQueueLoading(true);
      setQueueError(null);
      try {
        const params = currentEstate?.id ? { siteId: currentEstate.id } : {};
        const [stats, failures] = await Promise.all([
          getNotificationQueueStats(params),
          getNotificationFailures({ limit: 25, ...params })
        ]);
        if (!cancelled) {
          setQueueStats(stats?.data || stats);
          setQueueFailures(failures?.data || failures || []);
        }
      } catch (e) {
        if (!cancelled) {
          const errorMsg = handleApiError(e);
          setQueueError(errorMsg);
          logger.error('Failed to load queue data:', e);
        }
      } finally {
        if (!cancelled) setQueueLoading(false);
      }
    }
    loadQueueData();
    const id = setInterval(loadQueueData, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, [currentEstate?.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadHealthDetails() {
      setHealthLoading(true);
      setHealthError(null);
      try {
        const params = currentEstate?.id ? { siteId: currentEstate.id } : {};
        const details = await getHealthDetails(params);
        if (!cancelled) setHealthDetails(details);
      } catch (e) {
        if (!cancelled) {
          const errorMsg = handleApiError(e);
          setHealthError(errorMsg);
          logger.error('Failed to load health details:', e);
        }
      } finally {
        if (!cancelled) setHealthLoading(false);
      }
    }
    loadHealthDetails();
    const id = setInterval(loadHealthDetails, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, [currentEstate?.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadLogs() {
      setLogsLoading(true); setLogsError(null);
      try {
        const params = { page: String(page), limit: String(limit) };
        if (currentEstate?.id) params.siteId = currentEstate.id;
        const data = await getAuditLogs(params);
        if (!cancelled) setLogs(data || []);
      } catch (e) {
        if (!cancelled) {
          const errorMsg = handleApiError(e);
          setLogsError(errorMsg);
          logger.error('Failed to load audit logs:', e);
        }
      } finally {
        if (!cancelled) setLogsLoading(false);
      }
    }
    loadLogs();
  }, [page, limit, currentEstate?.id]);

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  const auditHeaders = ["Time", "User", "Action", "Entity", "Details", "IP"];
  const auditRows = filteredLogs.map(l => [
    l.created_at,
    l.user_id || "-",
    l.action,
    `${l.entity_type || "-"}:${l.entity_id || "-"}`,
    l.details ? JSON.stringify(l.details) : "",
    l.ip_address || ""
  ]);

  const queueHeaders = ["Failed At", "Type", "Recipient", "Error", "Actions"];
  const queueRows = queueFailures.map(item => [
    item.failedAt ? new Date(item.failedAt).toLocaleString() : "-",
    item.type || "-",
    item.recipient || "-",
    item.error || "-",
    <button
      key={`retry-${item.id}`}
      onClick={async () => {
        if (!item.id) return;
        setRetryingJobId(item.id);
        try {
          await retryNotificationFailure(item.id);
          const failures = await getNotificationFailures({ limit: 25 });
          setQueueFailures(failures?.data || failures || []);
        } catch (e) {
          setQueueError(handleApiError(e));
        } finally {
          setRetryingJobId(null);
        }
      }}
      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
      disabled={retryingJobId === item.id}
    >
      {retryingJobId === item.id ? 'Retrying...' : 'Retry'}
    </button>
  ]);

  const healthStatusColor = (status) => {
    if (status === 'healthy') return 'text-green-600 bg-green-50';
    if (status === 'degraded' || status === 'warning') return 'text-yellow-700 bg-yellow-50';
    if (status === 'unhealthy' || status === 'error') return 'text-red-600 bg-red-50';
    return 'text-gray-600 dark:text-gray-200 bg-gray-50';
  };

  const healthComponents = Object.entries(healthDetails?.components || {});

  return (
    <div className="admin-dashboard-container">
      {/* Phase 4: Onboarding Tour for Admins */}
      <OnboardingTour
        role="admin"
        onComplete={() => logger.debug('Admin tour completed')}
      />

      {/* Phase 3: Offline Indicator */}
      <OfflineIndicator />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            Admin Dashboard
            {currentEstate && !isSuperAdmin && (
              <span className="text-sm font-normal px-3 py-1 bg-green-100 text-green-800 rounded-full border border-green-200">
                {currentEstate.name}
              </span>
            )}
            {isSuperAdmin && (
              <select
                className="text-sm font-normal px-3 py-1 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                value={currentEstate?.id || ''}
                onChange={(e) => {
                  const selectedId = Number(e.target.value);
                  const selected = availableEstates.find(est => est.id === selectedId);
                  if (selected) {
                    setCurrentEstate(selected);
                    // TODO: Persist or set header
                    // For quick implementation, we rely on sending siteId param or reloading page with context?
                    // Ideally: http client interceptor checks localStorage.
                    // For now: Just passing params where possible.
                  }
                }}
              >
                <option value="">Select Estate</option>
                {availableEstates.map(est => (
                  <option key={est.id} value={est.id}>{est.name}</option>
                ))}
              </select>
            )}
            <span className={`text-xs px-2 py-1 rounded-full ${role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
              }`}>
              {role === 'super_admin' ? 'Super Admin' : 'Administrator'}
            </span>
          </h1>
        </div>

        {/* Super Admin Navigation */}
        {role === 'super_admin' && (
          <button
            onClick={() => navigate('/dashboard/super-admin')}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            ← Back to Global Dashboard
          </button>
        )}
      </div>

      {/* Phase 3: Community Announcements */}
      <AnnouncementsBanner showDismiss={true} className="mb-4" />

      {/* Tabs for Admin Dashboard */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                // Navigation updates URL -> App.js re-renders with new initialTab -> Effect updates activeTab
                const path = tab.id === 'overview' ? '/dashboard/admin' : `/dashboard/admin/${tab.id}`;
                navigate(path);
              }}
              className={`${activeTab === tab.id
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {
        activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Actions Panel */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-sm p-6 text-white">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/dashboard/admin/approvals')}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                >
                  ✓ Approve Users
                </button>
                <button
                  onClick={() => navigate('/dashboard/admin/visitors')}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                >
                  📋 View Today's Visitors
                </button>
                <button
                  onClick={() => navigate('/dashboard/admin/residents')}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                >
                  🏠 Manage Residents
                </button>
                <button
                  onClick={() => navigate('/dashboard/admin/reports')}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                >
                  📊 Generate Reports
                </button>
              </div>
            </div>

            {/* Admin Metrics - Essential */}
            <AdminMetrics metrics={metrics} loading={loadingMetrics} error={metricsError} />

            {/* Notification Queue Status - NEW/Restored */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${queueError ? 'bg-red-500' : 'bg-green-500'}`}></div>
                Notification System Status
              </h3>

              {queueError ? (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-200">
                  Error loading notification status: {queueError}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Active Jobs</span>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{queueStats?.active || 0}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Completed</span>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{queueStats?.completed || 0}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Failed</span>
                    <div className="text-2xl font-bold text-red-600">{queueStats?.failed || 0}</div>
                  </div>
                </div>
              )}

              {/* Failures Table if any */}
              {queueFailures.length > 0 && (
                <Table
                  headers={queueHeaders}
                  rows={queueRows}
                  loading={queueLoading}
                />
              )}
            </div>

            {/* User Approvals - Single widget only */}
            <AdminUserApprovals siteId={currentEstate?.id} />

            {/* Community Announcements - Essential for estates */}
            <div data-tour="announcements">
              <AnnouncementsAdmin />
            </div>
          </div>
        )
      }

      {
        activeTab === 'approvals' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">User Account Approvals</h3>
            <AdminUserApprovals siteId={currentEstate?.id} />
          </div>
        )
      }

      {activeTab === 'guards' && <ManageGuards estateId={currentEstate?.id} />}

      {
        activeTab === 'residents' && (
          <ManageResidents />
        )
      }

      {
        activeTab === 'visitors' && (
          <VisitorLog />
        )
      }

      {
        activeTab === 'reports' && (
          <Reports />
        )
      }

      {
        activeTab === 'settings' && (
          <Settings />
        )
      }
    </div >
  );
}
