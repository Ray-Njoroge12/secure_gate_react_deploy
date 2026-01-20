import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
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
  getHealthDetails
} from "../../services/adminService";
import { handleApiError } from "../../utils/errorMapper";
import { useSearchData } from "../../hooks/useSearch";
import OfflineIndicator from "../../components/common/OfflineIndicator";
import AnnouncementsBanner from "../../components/common/AnnouncementsBanner";
import AnnouncementsAdmin from "../../components/admin/AnnouncementsAdmin";
import PrivacyDashboard from "../../components/settings/PrivacyDashboard";
// Phase 4: Onboarding Tour
import OnboardingTour from "../../components/common/OnboardingTour";
// Phase 4: Analytics Dashboard
import AnalyticsDashboard from "../../components/admin/AnalyticsDashboard";
import logger from 'utils/logger';
import PendingApprovals from './PendingApprovals';
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
    { id: 'users', label: 'User Management' },
    { id: 'guards', label: 'Guard Management' },
    { id: 'residents', label: 'Resident Management' },
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

  useEffect(() => {
    let cancelled = false;
    async function loadMetrics() {
      setLoadingMetrics(true); setMetricsError(null);
      try {
        const data = await getMetrics();
        if (!cancelled) setMetrics(data || {});
      } catch (e) {
        if (!cancelled) {
          const errorMsg = handleApiError(e);
          setMetricsError(errorMsg);
          logger.error('Failed to load metrics:', e);
        }
      } finally {
        if (!cancelled) setLoadingMetrics(false);
      }
    }
    loadMetrics();
    const id = setInterval(loadMetrics, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadQueueData() {
      setQueueLoading(true);
      setQueueError(null);
      try {
        const [stats, failures] = await Promise.all([
          getNotificationQueueStats(),
          getNotificationFailures({ limit: 25 })
        ]);
        if (!cancelled) {
          setQueueStats(stats?.data || stats);
          setQueueFailures(failures?.data || failures || []);
        }
      } catch (e) {
        if (!cancelled) {
          setQueueError(handleApiError(e));
          logger.error('Failed to load queue data:', e);
        }
      } finally {
        if (!cancelled) setQueueLoading(false);
      }
    }

    loadQueueData();
    const id = setInterval(loadQueueData, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHealthDetails() {
      setHealthLoading(true);
      setHealthError(null);
      try {
        const details = await getHealthDetails();
        if (!cancelled) setHealthDetails(details);
      } catch (e) {
        if (!cancelled) {
          setHealthError(handleApiError(e));
          logger.error('Failed to load health details:', e);
        }
      } finally {
        if (!cancelled) setHealthLoading(false);
      }
    }

    loadHealthDetails();
    const id = setInterval(loadHealthDetails, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadLogs() {
      setLogsLoading(true); setLogsError(null);
      try {
        const params = { page: String(page), limit: String(limit) };
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
  }, [page, limit]);

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

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <AdminMetrics />

          {/* Pending User Approvals Widget */}
          <PendingApprovals />

          <AdminUserApprovals />

          {/* Health Metrics Section */}
          <div id="health-metrics" data-tour="health-metrics" className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Health Metrics</h2>
                <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">Live component status and environment checks</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${healthStatusColor(healthDetails?.status)}`}>
                {healthDetails?.status || (healthLoading ? 'loading' : 'unknown')}
              </span>
            </div>
            <div className="p-6">
              {healthError && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                  {healthError}
                </div>
              )}
              {healthLoading ? (
                <div className="text-sm text-gray-500 dark:text-gray-300">Loading health details...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {healthComponents.length === 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-300">No component health data available.</div>
                  )}
                  {healthComponents.map(([component, detail]) => (
                    <div key={component} className="border border-gray-200 rounded-md p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{component.replace(/_/g, ' ')}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${healthStatusColor(detail?.status)}`}>
                          {detail?.status || 'unknown'}
                        </span>
                      </div>
                      {detail?.message && <p className="text-xs text-gray-600 dark:text-gray-200">{detail.message}</p>}
                      {detail?.metrics && (
                        <pre className="mt-2 text-xs text-gray-500 dark:text-gray-300 whitespace-pre-wrap">
                          {JSON.stringify(detail.metrics, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notification Queue Failures */}
          <div id="queue-failures" data-tour="queue-failures" className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Queue Failures</h2>
                <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">Retry failed SMS/email deliveries from the dead-letter queue</p>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-200">
                DLQ: {queueStats?.deadLetter?.total ?? 0} total / {queueStats?.deadLetter?.waiting ?? 0} waiting
              </div>
            </div>
            <div className="p-6">
              {queueError && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                  {queueError}
                </div>
              )}
              {queueLoading ? (
                <div className="text-sm text-gray-500 dark:text-gray-300">Loading queue failures...</div>
              ) : (
                <Table headers={queueHeaders} rows={queueRows} loading={queueLoading} />
              )}
              {!queueLoading && queueFailures.length === 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-300 mt-4">No failed notifications in the dead-letter queue.</div>
              )}
            </div>
          </div>

          {/* Phase 3: Community Announcements Admin */}
          <div data-tour="announcements">
            <AnnouncementsAdmin />
          </div>

          {/* Phase 4: Analytics Dashboard */}
          <div data-tour="analytics">
            <AnalyticsDashboard />
          </div>

          {/* Phase 3: Privacy Dashboard (Admin View) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Privacy & Data Management</h2>
              <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">System-wide privacy controls and data subject request management</p>
            </div>
            <div className="p-6">
              <PrivacyDashboard isAdmin={true} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">User Account Approvals</h3>
          <AdminUserApprovals />
        </div>
      )}
    </div>
  );
}
