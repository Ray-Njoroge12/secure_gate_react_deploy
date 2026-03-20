import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useI18n } from "../../i18n/index.js";
import { useCurrentRole } from "../../hooks/useCurrentRole";
// AppShell removed - handled by Layout Route
import AdminMetrics from '../../components/admin/AdminMetrics.jsx';
import AdminUserApprovals from '../../components/admin/AdminUserApprovals';
import {
  getMetrics,
  getNotificationQueueStats,
  getNotificationFailures,
  retryNotificationFailure,
  getHealthDetails,
  getEstateDetails,
  getAllEstates
} from "../../services/adminService";
import { handleApiError } from "../../utils/errorMapper";
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
import AuditLogs from './AuditLogs';
import Settings from './Settings';
import Table from '../../components/Table';
import Button from '../../components/ui/Button';

export default function AdminDashboard({ initialTab = 'overview' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { logout } = useAuth();
  const role = useCurrentRole();
  const { t } = useI18n();
  const selectedSiteId = searchParams.get('siteId');

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

  const appendSiteId = useCallback((path, estateIdOverride = currentEstate?.id) => {
    if (role !== 'super_admin' || !estateIdOverride) {
      return path;
    }
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}siteId=${encodeURIComponent(estateIdOverride)}`;
  }, [role, currentEstate?.id]);

  const withEstateParams = useCallback((params = {}) => {
    if (!currentEstate?.id) {
      return params;
    }
    return { ...params, siteId: currentEstate.id };
  }, [currentEstate?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + U to user approvals
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        navigate(appendSiteId('/dashboard/admin/approvals'));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [appendSiteId, navigate]);

  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync internal state with URL prop
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const tabs = [
    { id: 'overview', label: t('dashboard.admin.overview') },
    { id: 'approvals', label: t('dashboard.admin.approvals') },
    { id: 'guards', label: t('dashboard.admin.guards') },
    { id: 'residents', label: t('dashboard.admin.residents') },
    { id: 'visitors', label: t('dashboard.admin.visitorLogs') },
    { id: 'reports', label: t('dashboard.admin.reports') },
    { id: 'audit', label: t('dashboard.admin.auditLogs') },
    { id: 'settings', label: t('dashboard.admin.settings') }
  ];

  useEffect(() => {
    const tourSupportedTabs = new Set(['overview', 'guards', 'residents', 'visitors', 'reports', 'settings']);
    const handleTourTabSwitch = (event) => {
      if (!event?.detail) {
        return;
      }

      const tab = event?.detail?.tab;
      if (!tab || !tourSupportedTabs.has(tab)) {
        return;
      }

      setActiveTab(tab);
      const path = tab === 'overview' ? '/dashboard/admin' : `/dashboard/admin/${tab}`;
      navigate(appendSiteId(path), { replace: true });
    };

    window.addEventListener('securegate-tour-admin-tab', handleTourTabSwitch);
    return () => window.removeEventListener('securegate-tour-admin-tab', handleTourTabSwitch);
  }, [appendSiteId, navigate]);

  useEffect(() => {
    let cancelled = false;

    async function initializeEstateContext() {
      try {
        if (role === 'super_admin') {
          setIsSuperAdmin(true);
          const estates = await getAllEstates();
          if (cancelled) return;

          const normalizedEstates = Array.isArray(estates) ? estates : [];
          setAvailableEstates(normalizedEstates);

          const parsedSiteId = Number(selectedSiteId);
          const selectedEstate = Number.isInteger(parsedSiteId)
            ? normalizedEstates.find((estate) => Number(estate.id) === parsedSiteId)
            : null;

          setCurrentEstate(selectedEstate || normalizedEstates[0] || null);
          return;
        }

        setIsSuperAdmin(false);
        setAvailableEstates([]);
        const estateInfo = await getEstateDetails();
        if (!cancelled) {
          setCurrentEstate(estateInfo || null);
        }
      } catch (err) {
        if (!cancelled) {
          logger.error('Failed to initialize estate context:', err);
          setCurrentEstate(null);
        }
      }
    }

    initializeEstateContext();
    return () => {
      cancelled = true;
    };
  }, [role, selectedSiteId]);

  // Load Metrics (Modified to support estate context)
  useEffect(() => {
    let cancelled = false;
    async function loadMetrics() {
      setLoadingMetrics(true); setMetricsError(null);
      try {
        const params = withEstateParams();
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
  }, [currentEstate?.id]); // Reload metrics when estate changes

  useEffect(() => {
    let cancelled = false;

    async function loadQueueData() {
      setQueueLoading(true);
      setQueueError(null);
      try {
        const params = withEstateParams();
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
        const params = withEstateParams();
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

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  const queueHeaders = ["Failed At", "Type", "Recipient", "Error", "Actions"];
  const queueRows = queueFailures.map(item => [
    item.failedAt ? new Date(item.failedAt).toLocaleString() : "-",
    item.type || "-",
    item.recipient || "-",
    item.error || "-",
    <Button
      key={`retry-${item.id}`}
      variant="ghost"
      size="sm"
      onClick={async () => {
        if (!item.id) return;
        setRetryingJobId(item.id);
        try {
          await retryNotificationFailure(item.id);
          const failures = await getNotificationFailures(withEstateParams({ limit: 25 }));
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
      {retryingJobId === item.id ? t('dashboard.admin.retrying') : t('dashboard.admin.retry')}
    </Button>
  ]);

  const healthStatusColor = (status) => {
    if (status === 'healthy') return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    if (status === 'degraded' || status === 'warning') return 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    if (status === 'unhealthy' || status === 'error') return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    return 'text-gray-600 dark:text-gray-200 bg-gray-50 dark:bg-slate-900';
  };

  const healthComponents = Object.entries(healthDetails?.components || {});

  return (
    <div className="admin-dashboard-container" data-tour="admin-dashboard">
      {/* Phase 4: Onboarding Tour for Admins */}
      <OnboardingTour
        role="admin"
        onComplete={() => logger.debug('Admin tour completed')}
      />

      {/* Phase 3: Offline Indicator */}
      <OfflineIndicator />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            {t('dashboard.admin.adminDashboard')}
            {currentEstate && !isSuperAdmin && (
              <span className="text-sm font-normal px-3 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-800 dark:text-brand-300 rounded-full border border-brand-200 dark:border-brand-700">
                {currentEstate.name}
              </span>
            )}
            {isSuperAdmin && (
              <select
                className="text-sm font-normal px-3 py-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={currentEstate?.id || ''}
                onChange={(e) => {
                  const selectedId = Number(e.target.value);
                  const selected = availableEstates.find((est) => Number(est.id) === selectedId);
                  if (selected) {
                    setCurrentEstate(selected);
                    const currentPath = activeTab === 'overview' ? '/dashboard/admin' : `/dashboard/admin/${activeTab}`;
                    navigate(appendSiteId(currentPath, selected.id), { replace: true });
                  }
                }}
              >
                <option value="">{t('dashboard.admin.selectEstate')}</option>
                {availableEstates.map(est => (
                  <option key={est.id} value={est.id}>{est.name}</option>
                ))}
              </select>
            )}
            <span className={`text-xs px-2 py-1 rounded-full ${role === 'super_admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
              }`}>
              {role === 'super_admin' ? t('dashboard.admin.superAdmin') : t('dashboard.admin.administrator')}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/dashboard/admin/help/security')}
            className="flex items-center text-sm font-medium"
          >
            {t('dashboard.common.securityHelp')}
          </Button>
          {role === 'super_admin' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/dashboard/super-admin')}
              className="flex items-center bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              ← {t('dashboard.admin.backToGlobalDashboard')}
            </Button>
          )}
        </div>
      </div>

      {/* Phase 3: Community Announcements */}
      <AnnouncementsBanner showDismiss={true} className="mb-4" />

      {/* Tabs for Admin Dashboard */}
      <div className="mb-6 border-b border-gray-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" role="tablist" aria-label="Admin dashboard sections">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              id={`admin-tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`admin-tabpanel-${tab.id}`}
              onClick={() => {
                // Navigation updates URL -> App.js re-renders with new initialTab -> Effect updates activeTab
                const path = tab.id === 'overview' ? '/dashboard/admin' : `/dashboard/admin/${tab.id}`;
                navigate(appendSiteId(path));
              }}
              className={`${activeTab === tab.id
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300 dark:text-gray-300 dark:hover:text-gray-200 dark:hover:border-gray-600'
                } h-auto rounded-none whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </Button>
          ))}
        </nav>
      </div>

      {
        activeTab === 'overview' && (
          <div
            id="admin-tabpanel-overview"
            role="tabpanel"
            aria-labelledby="admin-tab-overview"
            className="space-y-6"
          >
            {/* Quick Actions Panel */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-sm p-6 text-white">
              <h2 className="text-lg font-semibold mb-4">{t('dashboard.admin.quickActions')}</h2>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(appendSiteId('/dashboard/admin/approvals'))}
                  className="bg-white/20 hover:bg-white/30 text-sm font-medium transition-colors"
                >
                  ✓ {t('dashboard.admin.approveUsers')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(appendSiteId('/dashboard/admin/visitors'))}
                  className="bg-white/20 hover:bg-white/30 text-sm font-medium transition-colors"
                >
                  📋 {t('dashboard.admin.viewTodaysVisitors')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(appendSiteId('/dashboard/admin/residents'))}
                  className="bg-white/20 hover:bg-white/30 text-sm font-medium transition-colors"
                >
                  🏠 {t('dashboard.admin.manageResidents')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(appendSiteId('/dashboard/admin/reports'))}
                  className="bg-white/20 hover:bg-white/30 text-sm font-medium transition-colors"
                >
                  📊 {t('dashboard.admin.generateReports')}
                </Button>
              </div>
            </div>

            {/* Admin Metrics - Essential */}
            <AdminMetrics metrics={metrics} loading={loadingMetrics} error={metricsError} />

            {/* Notification Queue Status - NEW/Restored */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${queueError ? 'bg-red-500' : 'bg-green-500'}`}></div>
                {t('dashboard.admin.notificationSystemStatus')}
              </h3>

              {queueError ? (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg text-sm border border-red-200 dark:border-red-800">
                  Error loading notification status: {queueError}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
                    <span className="text-gray-500 dark:text-gray-300 text-sm">{t('dashboard.admin.activeJobs')}</span>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{queueStats?.active || 0}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
                    <span className="text-gray-500 dark:text-gray-300 text-sm">{t('dashboard.admin.completed')}</span>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{queueStats?.completed || 0}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
                    <span className="text-gray-500 dark:text-gray-300 text-sm">{t('dashboard.admin.failed')}</span>
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
          <div id="admin-tabpanel-approvals" role="tabpanel" aria-labelledby="admin-tab-approvals" className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('dashboard.admin.userAccountApprovals')}</h3>
            <AdminUserApprovals siteId={currentEstate?.id} />
          </div>
        )
      }

      {activeTab === 'guards' && (
        <div id="admin-tabpanel-guards" role="tabpanel" aria-labelledby="admin-tab-guards">
          <ManageGuards estateId={currentEstate?.id} />
        </div>
      )}

      {
        activeTab === 'residents' && (
          <div id="admin-tabpanel-residents" role="tabpanel" aria-labelledby="admin-tab-residents">
            <ManageResidents estateId={currentEstate?.id} />
          </div>
        )
      }

      {
        activeTab === 'visitors' && (
          <div id="admin-tabpanel-visitors" role="tabpanel" aria-labelledby="admin-tab-visitors">
            <VisitorLog estateId={currentEstate?.id} />
          </div>
        )
      }

      {
        activeTab === 'reports' && (
          <div id="admin-tabpanel-reports" role="tabpanel" aria-labelledby="admin-tab-reports">
            <Reports estateId={currentEstate?.id} />
          </div>
        )
      }

      {
        activeTab === 'audit' && (
          <div id="admin-tabpanel-audit" role="tabpanel" aria-labelledby="admin-tab-audit">
            <AuditLogs />
          </div>
        )
      }

      {
        activeTab === 'settings' && (
          <div id="admin-tabpanel-settings" role="tabpanel" aria-labelledby="admin-tab-settings">
            <Settings estateId={currentEstate?.id} />
          </div>
        )
      }
    </div >
  );
}
