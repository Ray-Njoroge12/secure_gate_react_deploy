import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from '../../utils/apiClient';
import logger from 'utils/logger';
import { useAuth } from "../../contexts/AuthContext";
import { useI18n } from "../../i18n/index.js";
import { useCurrentRole } from "../../hooks/useCurrentRole";
// AppShell removed - handled by Layout Route
import { Card, Button, SearchFilter, Pagination, Skeleton } from "../../components/ui";
import Table from "../../components/Table";
// Unused page imports removed
import notificationService from "../../services/notificationService";
import { useSearchData } from "../../hooks/useSearch";
import { useError } from "../../contexts/ErrorContext";
import { useLoading } from "../../contexts/LoadingContext";
import DashboardKPIs from "../../components/guard/DashboardKPIs"; // Phase G3
import QuickFilters from "../../components/guard/QuickFilters"; // Phase G3
import PendingApprovalsQueue from "../../components/guard/PendingApprovalsQueue"; // Phase G3
import { verifyOtp } from "../../services/visitorService";
import PanicButton from "../../components/guard/PanicButton"; // Phase 1.1: Emergency Panic Button
import EmergencyAlertBanner from "../../components/guard/EmergencyAlertBanner"; // Phase 1.1: Emergency Alerts
import RecentVisitors from "../../components/guard/RecentVisitors"; // Phase 1.3: Recent Visitors
import PendingDeliveries from "../../components/guard/PendingDeliveries"; // Phase 2.1: Delivery Management
import { getStatusChipClass, getStatusIcon } from "../../utils/statusColors"; // Phase A8
// Enhanced UI Components (merged from GuardDashboardEnhanced)
import LiveConnectionStatus from "../../components/common/LiveConnectionStatus";
import VisitorDetailsModal from "../../components/guard/VisitorDetailsModal";
// Phase 3: Privacy-First Features
import AnnouncementsBanner from "../../components/common/AnnouncementsBanner";
import OnboardingTour from "../../components/common/OnboardingTour";
import QuickActionMenu from "../../components/common/QuickActionMenu";
// Phase 1: Confirmation Dialog for destructive actions
import { useConfirmation } from "../../components/common/ConfirmationDialog";

export default function GuardDashboard() {
  const { user } = useAuth();
  const role = useCurrentRole();
  const navigate = useNavigate();
  const { handleApiError, clearAllErrors } = useError();
  const { setLoading, isLoading } = useLoading();
  const { confirm, dialogProps, Dialog: ConfirmDialog } = useConfirmation();
  const { t } = useI18n();

  const [active, setActive] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [toastFilter, setToastFilter] = useState(() => localStorage.getItem('toastFilter') || 'all'); // all|info|warning|error
  const [showFilters, setShowFilters] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState('all'); // Phase G3: Quick filter state
  const [isConnected, setIsConnected] = useState(true); // Live connection status
  const [selectedVisitor, setSelectedVisitor] = useState(null); // Visitor details modal
  const [initialLoad, setInitialLoad] = useState(true); // Track first load for skeleton
  const toastRef = React.useRef(null);

  // Search and filter configuration
  const searchFields = ['name', 'host', 'status'];
  const filterFields = [
    { key: 'status', label: 'Status', type: 'select' },
    { key: 'check_in_time', label: 'Check-in Time', type: 'date' },
    { key: 'check_out_time', label: 'Check-out Time', type: 'date' }
  ];

  // Use search hook
  const {
    data: filteredActive,
    pagination,
    searchTerm,
    setSearchTerm,
    setFilters,
    clearFilters,
    setPage,
    isSearching,
    hasFilters,
  } = useSearchData(active, searchFields, filterFields, {
    enablePagination: true,
    pageSize: 10
  });

  function statusChip(s) {
    // Phase A8: Using consistent status colors
    return <span className={getStatusChipClass(s, 'sm')}>{getStatusIcon(s)} {s || '-'}</span>;
  }

  function normalizeStatusValue(status) {
    return String(status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  }

  function canCheckInVisitor(visitor) {
    const normalizedStatus = normalizeStatusValue(visitor?.status);
    return normalizedStatus === 'CONFIRMED' || normalizedStatus === 'APPROVED';
  }

  function canCheckOutVisitor(visitor) {
    const normalizedStatus = normalizeStatusValue(visitor?.status);
    return normalizedStatus === 'ON_PREMISE' || normalizedStatus === 'CHECKED_IN' || (visitor?.check_in_time && !visitor?.check_out_time);
  }

  function canRevokeVisitor(visitor) {
    return normalizeStatusValue(visitor?.status) !== 'REVOKED';
  }

  const fetchActive = useCallback(async () => {
    try {
      setLoading('guardDashboard', true, { message: 'Loading active visitors...' });
      clearAllErrors();
      const res = await api.get('/api/visitors/active');
      const json = res.data;
      if (!json.success) throw new Error(json.error || 'Failed');
      setActive(json.data || []);
    } catch (e) {
      handleApiError(e, 'Guard Dashboard');
    } finally {
      setLoading('guardDashboard', false);
      setInitialLoad(false);
    }
  }, [clearAllErrors, handleApiError, setLoading]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S to scan QR
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        navigate('/dashboard/guard/scan-qr');
      }
      // Ctrl/Cmd + M to manual check
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        navigate('/dashboard/guard/manual-check');
      }
      // Ctrl/Cmd + R to refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (!isLoading('guardDashboard')) {
          fetchActive();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fetchActive, isLoading, navigate]);

  useEffect(() => { fetchActive(); }, [fetchActive]);

  // Subscribe to guard SSE for live updates with exponential backoff reconnect
  useEffect(() => {
    let es;
    let retryCount = 0;
    let retryTimer = null;

    const connectSSE = () => {
      try {
        es = new EventSource('/api/ws/guards', { withCredentials: false });

        es.onopen = () => {
          setIsConnected(true);
          retryCount = 0; // Reset backoff on successful connection
        };

        es.onerror = () => {
          setIsConnected(false);
          try { es.close(); } catch { /* ignore */ }
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          retryCount++;
          retryTimer = setTimeout(connectSSE, delay);
        };

        const onEvt = (evt) => {
          setIsConnected(true);
          try {
            const data = JSON.parse(evt.data || '{}');
            const map = {
              'visitor.check_in': 'Visitor checked in',
              'visitor.check_out': 'Visitor checked out',
              'visitor.revoked': 'Visitor revoked',
              'visitor.self_check_in': 'Visitor self check-in',
            };
            const msg = map[evt.type] || 'Event';
            const sev = (data && data.severity) || 'info';
            pushToast({ message: msg, severity: sev });
          } catch { /* ignore */ }
          fetchActive();
        };
        es.addEventListener('visitor.check_in', onEvt);
        es.addEventListener('visitor.check_out', onEvt);
        es.addEventListener('visitor.revoked', onEvt);
        es.addEventListener('visitor.self_check_in', onEvt);
      } catch {
        setIsConnected(false);
      }
    };

    connectSSE();
    return () => {
      clearTimeout(retryTimer);
      try { es && es.close(); } catch { /* ignore */ }
    };
  }, [fetchActive]);

  // Persist toast filter and auto-scroll to newest
  useEffect(() => { try { localStorage.setItem('toastFilter', toastFilter); } catch { } }, [toastFilter]);
  useEffect(() => {
    try { toastRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' }); } catch { }
  }, [toasts]);

  function pushToast(t) {
    const id = Math.random().toString(36).slice(2);
    const item = { id, persistent: false, ...t };
    setToasts((prev) => [item, ...prev].slice(0, 5));
    if (!item.persistent) {
      // Auto-remove after 4s
      setTimeout(() => {
        setToasts((prev) => prev.filter(x => x.id !== id));
      }, 4000);
    }
  }

  async function postAction(id, action) {
    const url = `/api/visitors/${id}/${action}`;
    const res = await api.post(url);
    const json = res.data;
    if (!json.success) throw new Error(json.error || 'Action failed');
    await fetchActive();
    return json;
  }

  const onCheckIn = async (id) => {
    try {
      const r = await postAction(id, 'check-in');
      if (r?.data?.already_checked_in) {
        notificationService.warning('Already Checked In', 'Visitor is already checked in');
      } else {
        notificationService.success('Check-in Successful', `Visitor ${id} has been checked in`);
      }
    } catch (e) {
      pushToast({ severity: 'error', message: `Check-in failed: ${e?.message || 'Please try again.'}`, persistent: true });
    }
  };

  const onCheckOut = async (id) => {
    try {
      const r = await postAction(id, 'check-out');
      if (r?.data?.already_checked_out) {
        notificationService.warning('Already Checked Out', 'Visitor is already checked out');
      } else {
        notificationService.success('Check-out Successful', `Visitor ${id} has been checked out`);
      }
    } catch (e) {
      pushToast({ severity: 'error', message: `Check-out failed: ${e?.message || 'Please try again.'}`, persistent: true });
    }
  };

  const onRevoke = async (id) => {
    const confirmed = await confirm({
      variant: 'warning',
      title: 'Revoke Visitor Access',
      message: `Are you sure you want to revoke visitor #${id}? They will no longer be able to enter the premises.`,
      confirmText: 'Revoke',
      cancelText: 'Cancel',
      showUndo: true,
    });
    if (!confirmed) return;

    try {
      await postAction(id, 'revoke');
      notificationService.warning('Visitor Revoked', `Visitor ${id} has been revoked`);
    } catch (e) {
      pushToast({ severity: 'error', message: `Revoke failed: ${e?.message || 'Please try again.'}`, persistent: true });
    }
  };

  // Phase G3: KPI filter click handler
  const handleKPIClick = (filterId) => {
    setActiveQuickFilter(filterId);
    // This only updates client-side filter state in the current implementation.
  };

  // Phase G3: Quick filter handler
  const handleQuickFilterChange = (filter) => {
    setActiveQuickFilter(filter.id);
    // In a full implementation, this would fetch filtered data from API
    // For now, we'll use the existing client-side filtering
  };

  // Phase G3: Clear filter handler
  const handleClearFilter = () => {
    setActiveQuickFilter('all');
    clearFilters();
  };

  // Skeleton Loading State for initial page load
  const DashboardSkeleton = () => (
    <div className="space-y-6 animate-in fade-in">
      {/* Connection Status Header Skeleton */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Quick Action Tiles Skeleton */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-100 dark:bg-slate-800 rounded-xl p-4 md:p-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <Skeleton className="w-12 h-12 md:w-14 md:h-14 rounded-xl" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Row Skeleton */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="p-4">
            <div className="text-center space-y-2">
              <Skeleton className="h-8 w-12 mx-auto" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
          </Card>
        ))}
      </div>

      {/* Status Overview Skeleton */}
      <Card>
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg text-center space-y-2">
                <Skeleton className="h-8 w-10 mx-auto" />
                <Skeleton className="h-4 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Visitor Table Skeleton */}
      <Card>
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  let panel = initialLoad && isLoading('guardDashboard') ? (
    <DashboardSkeleton />
  ) : (
    <div className="space-y-6">
      {/* Enhanced: Live Connection Status Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('dashboard.guard.guardStation')}</h2>
          <LiveConnectionStatus isConnected={isConnected} showLabel={true} />
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-300">
          {active.length} active visitor{active.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* MFA Setup Reminder Banner - Security Critical */}
      {user && !user.mfa_enabled && (
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4 mb-4 shadow-sm" role="alert">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold text-amber-800">
                🔒 {t('dashboard.guard.mfaNotEnabled')}
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  <strong>{t('dashboard.guard.mfaSecurityNotice')}</strong> {t('dashboard.guard.mfaRequiredForGuards')}
                </p>
              </div>
              <div className="mt-4 flex gap-3">
                <Button
                  onClick={() => navigate('/dashboard/guard/settings?tab=security')}
                  className="min-h-[44px] bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg shadow transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                  aria-label="Enable Multi-Factor Authentication now"
                >
                  {t('dashboard.common.enableMfaNow')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigate('/dashboard/guard/help/mfa-setup');
                  }}
                  className="min-h-[44px] text-amber-700 hover:text-amber-900 font-medium py-2 px-4 rounded-lg border border-amber-300 hover:bg-amber-100 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                  aria-label="Learn more about MFA setup"
                >
                  {t('dashboard.common.learnMore')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live toasts (severity-based) */}
      <div data-testid="toasts" ref={toastRef} className="fixed top-16 right-4 flex flex-col gap-2 z-50 max-w-sm max-h-80 overflow-y-auto">
        <div className="flex gap-2 justify-end mb-1">
          {['all', 'info', 'warning', 'error'].map(f => (
            <Button key={f} variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] text-xs px-3 py-2 rounded bg-gray-800 text-white"
              style={{ opacity: toastFilter === f ? 1 : 0.7 }} onClick={() => setToastFilter(f)}
              aria-label={`Filter toasts by ${f}`}
              aria-pressed={toastFilter === f}>
              {f.toUpperCase()}
            </Button>
          ))}
          <span aria-label="visible-toasts" className="ml-2 text-xs bg-gray-800 text-white rounded-full px-2 py-1">
            {toasts.filter(t => toastFilter === 'all' || t.severity === toastFilter).length}
          </span>
        </div>
        {toasts.filter(t => toastFilter === 'all' || t.severity === toastFilter).map(t => (
          <Toast
            key={t.id}
            severity={t.severity}
            message={t.message}
            persistent={Boolean(t.persistent)}
            onDismiss={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
          />
        ))}
      </div>

      {/* PHASE A4: Emphasize Scan QR and Manual Check - Mobile First */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 mb-6">
        {/* Primary: Scan QR */}
        <div
          data-tour="scan-qr"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/dashboard/guard/scan-qr')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/dashboard/guard/scan-qr'); } }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 md:p-6 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all shadow-lg text-white"
          aria-label="Scan QR code for quick check-in"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-xl flex items-center justify-center mb-2">
              <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 16h4m-4 0h4m-4 0v4m-4-4h4m-4 0h4" />
              </svg>
            </div>
            <h3 className="font-bold text-base md:text-lg">{t('dashboard.guard.scanQR')}</h3>
            <p className="text-xs md:text-sm text-blue-100 mt-1">{t('dashboard.guard.quickCheckin')}</p>
          </div>
        </div>

        {/* Secondary: Manual Check */}
        <div
          data-tour="manual-check"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/dashboard/guard/manual-check')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/dashboard/guard/manual-check'); } }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 md:p-6 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all shadow-lg text-white"
          aria-label="Manual check - search for a visitor"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-xl flex items-center justify-center mb-2">
              <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-base md:text-lg">{t('dashboard.guard.manualCheck')}</h3>
            <p className="text-xs md:text-sm text-green-100 mt-1">{t('dashboard.guard.searchVisitor')}</p>
          </div>
        </div>

        {/* Tertiary: Walk-In (less emphasis) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/dashboard/guard/walk-in')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/dashboard/guard/walk-in'); } }}
          className="bg-white dark:bg-slate-800 border-2 border-purple-200 rounded-xl p-4 md:p-6 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all col-span-2 md:col-span-1"
          aria-label="Walk-in registration for new visitors"
        >
          <div className="flex md:flex-col items-center md:text-center">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-3 md:mr-0 md:mb-2">
              <svg className="w-6 h-6 md:w-8 md:h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div className="flex-1 md:flex-none">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm md:text-base">{t('dashboard.guard.walkInRegistration')}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-200 md:mt-1">{t('dashboard.guard.newVisitor')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Row - Shift Management */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/dashboard/guard/shift-handover')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/dashboard/guard/shift-handover'); } }}
          className="bg-white dark:bg-slate-800 border border-indigo-200 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all"
          aria-label="Shift handover"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 hidden md:inline">{t('dashboard.guard.shiftHandover')}</span>
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100 md:hidden">{t('dashboard.guard.handover')}</span>
          </div>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/dashboard/guard/activity-log')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/dashboard/guard/activity-log'); } }}
          className="bg-white dark:bg-slate-800 border border-cyan-200 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-cyan-300 transition-all"
          aria-label="Activity log"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 hidden md:inline">{t('dashboard.guard.activityLog')}</span>
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100 md:hidden">{t('dashboard.guard.log')}</span>
          </div>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/dashboard/guard/bulk-checkout')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/dashboard/guard/bulk-checkout'); } }}
          className="bg-white dark:bg-slate-800 border border-orange-200 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-orange-300 transition-all"
          aria-label="Bulk checkout"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 hidden md:inline">{t('dashboard.guard.bulkCheckout')}</span>
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100 md:hidden">{t('dashboard.guard.bulk')}</span>
          </div>
        </div>
      </div>

      {/* Mobile Tip */}
      <div className="md:hidden bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <p className="text-xs text-blue-800">
          <span className="font-semibold">💡 Tip:</span> Use Scan QR for fastest check-ins
        </p>
      </div>

      {/* Phase G3: Dashboard KPIs */}
      <div data-tour="guard-dashboard-kpis">
        <DashboardKPIs onFilterClick={handleKPIClick} />
      </div>

      {/* Phase G3: Quick Filters */}
      <QuickFilters
        activeFilter={activeQuickFilter}
        onFilterChange={handleQuickFilterChange}
        onClearFilter={handleClearFilter}
      />

      {/* Phase G3: Pending Approvals Queue */}
      <div data-tour="expected-visitors">
        <PendingApprovalsQueue />
      </div>

      {/* Phase 1.3: Recent Visitors Quick Lookup */}
      <RecentVisitors
        onSelectVisitor={(visitor) => {
          // Navigate to check-in with visitor pre-selected
          navigate('/dashboard/guard/manual-check', {
            state: { selectedVisitor: visitor }
          });
        }}
        className="mb-6"
      />

      {/* Phase 2.1: Pending Deliveries */}
      <div className="mb-6">
        <PendingDeliveries />
      </div>

      {/* Search and Filters */}
      <SearchFilter
        data={active}
        searchFields={searchFields}
        filterFields={filterFields}
        onSearch={setSearchTerm}
        onFilter={setFilters}
        placeholder="Search visitors by name, host, or status..."
        showAdvanced={showFilters}
        enableSorting={true}
        enablePagination={false}
      />

      {/* Status Overview */}
      <Card>
        <Card.Header className="flex flex-row items-center justify-between">
          <Card.Title>{t('dashboard.guard.visitorStatus')}</Card.Title>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? t('dashboard.common.hideFilters') : t('dashboard.common.showFilters')}
          </Button>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatusBadge
              label={t('dashboard.guard.confirmed')}
              value={isSearching || hasFilters ? getFilteredStatusCount('CONFIRMED') : getStatusCount('CONFIRMED')}
              color="text-blue-600 bg-blue-50"
            />
            <StatusBadge
              label={t('dashboard.guard.onPremise')}
              value={isSearching || hasFilters ? getFilteredStatusCount('ON_PREMISE') : getStatusCount('ON_PREMISE')}
              color="text-green-600 bg-green-50"
            />
            <StatusBadge
              label={t('dashboard.guard.exited')}
              value={isSearching || hasFilters ? getFilteredStatusCount('EXITED') : getStatusCount('EXITED')}
              color="text-gray-600 dark:text-gray-200 bg-gray-50 dark:bg-slate-900"
            />
            <StatusBadge
              label={t('dashboard.guard.revoked')}
              value={isSearching || hasFilters ? getFilteredStatusCount('REVOKED') : getStatusCount('REVOKED')}
              color="text-red-600 bg-red-50"
            />
          </div>
          {(isSearching || hasFilters) && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-200">
              Showing {filteredActive.length} of {active.length} visitors
              {searchTerm && ` for "${searchTerm}"`}
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Active Visitors - Mobile Optimized */}
      <Card>
        <Card.Header className="flex flex-row items-center justify-between">
          <Card.Title>{t('dashboard.guard.activeVisitors')}</Card.Title>
          <Button variant="outline" size="sm" onClick={fetchActive} disabled={isLoading('guardDashboard')}>
            {isLoading('guardDashboard') ? t('dashboard.common.refreshing') : t('common.refresh')}
          </Button>
        </Card.Header>
        <Card.Content>
          {/* Error messages are now handled by ErrorContext */}

          <div className="md:hidden">
            {/* Mobile Cards */}
            {filteredActive.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {/* PHASE A5: Improved empty state messages */}
                {isSearching || hasFilters ? (
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium mb-1">{t('dashboard.common.noMatchCriteria')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-200 mb-3">
                      {t('dashboard.common.adjustSearchFilters')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        clearFilters();
                      }}
                    >
                      {t('dashboard.common.clearAllFilters')}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium mb-1">{t('dashboard.guard.noActiveVisitors')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-200">
                      {t('dashboard.guard.visitorsWillAppear')}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActive.map(v => (
                  <VisitorCard
                    key={v.id}
                    visitor={v}
                    onCheckIn={onCheckIn}
                    onCheckOut={onCheckOut}
                    onRevoke={onRevoke}
                    role={role}
                    onViewDetails={() => setSelectedVisitor(v)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="hidden md:block">
            {/* Desktop Table */}
            {filteredActive.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {/* PHASE A5: Improved empty state messages - Desktop */}
                {isSearching || hasFilters ? (
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium mb-1">{t('dashboard.common.noMatchCriteria')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-200 mb-3">
                      {t('dashboard.common.adjustSearchFilters')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        clearFilters();
                      }}
                    >
                      {t('dashboard.common.clearAllFilters')}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium mb-1">{t('dashboard.guard.noActiveVisitors')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-200">
                      {t('dashboard.guard.visitorsWillAppear')}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Table
                  headers={["Visitor", "Host", "In", "Out", "Status", "Actions"]}
                  rows={filteredActive.map(v => [
                    (v.name || `#${v.id}`),
                    (v.host ? mask(v.host) : '-'),
                    '' + (v.check_in_time || ''),
                    '' + (v.check_out_time || ''),
                    statusChip(v.status),
                    ((['guard', 'admin'].includes(role)) ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => onCheckIn(v.id)} disabled={!canCheckInVisitor(v)}>Check-in</Button>
                        <Button size="sm" onClick={() => onCheckOut(v.id)} disabled={!canCheckOutVisitor(v)}>Check-out</Button>
                        <Button size="sm" variant="destructive" onClick={() => onRevoke(v.id)} disabled={!canRevokeVisitor(v)}>Revoke</Button>
                      </div>
                    ) : null)
                  ])}
                  mobileCardView={false}
                />

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={pagination.currentPage}
                      totalPages={pagination.totalPages}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </Card.Content>
      </Card>
    </div>
  );

  function getStatusCount(status) {
    if (!Array.isArray(active)) return 0;
    return active.filter(v => normalizeStatusValue(v.status) === normalizeStatusValue(status)).length;
  }

  // Get filtered status counts
  function getFilteredStatusCount(status) {
    if (!Array.isArray(filteredActive)) return 0;
    return filteredActive.filter(v => normalizeStatusValue(v.status) === normalizeStatusValue(status)).length;
  }
  return (
    <div className="guard-dashboard-container">
      {/* Phase 4: Onboarding Tour for Guards */}
      <OnboardingTour
        role="guard"
        onComplete={() => logger.debug('Guard tour completed')}
      />

      {/* Phase 3: Offline Indicator */}


      {/* Phase 3: Community Announcements */}
      <AnnouncementsBanner showDismiss={true} className="mb-4" />

      {/* Phase 1.1: Emergency Alert Banner - Shows when there are active emergencies */}
      <EmergencyAlertBanner userRole={role} className="mb-4" />

      {/* Main Content */}
      <main id="main-content">
        {panel}
      </main>

      {/* Phase 4: Mobile Quick Action Menu */}
      <QuickActionMenu
        role="guard"
        showOnlyMobile={true}
      />

      {/* Phase 1.1: Floating Panic Button - Always visible for quick access */}
      <div data-tour="panic-button">
        <PanicButton
          floating={true}
          size="large"
          onStateChange={(state) => logger.debug('Panic button state:', state)}
        />
      </div>

      {/* Enhanced: Visitor Details Modal */}
      {selectedVisitor && (
        <VisitorDetailsModal
          visitor={selectedVisitor}
          onClose={() => setSelectedVisitor(null)}
          onCheckIn={onCheckIn}
          onCheckOut={onCheckOut}
          onVerify={async (id, otp) => {
            try {
              setLoading('verify', true);
              await verifyOtp(id, otp);
              notificationService.success('Verified', 'Visitor has been verified');
              fetchActive();
              setSelectedVisitor(null);
            } catch (e) {
              handleApiError(e, 'Verification Failed');
            } finally {
              setLoading('verify', false);
            }
          }}
          onDeny={onRevoke}
        />
      )}

      {/* Confirmation Dialog for destructive actions */}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

function mask(value) {
  if (!value) return '';
  if (String(value).includes('@')) return `${value[0]}***${value.slice(-1)}`;
  const d = String(value).replace(/\D+/g, '');
  return d.length >= 4 ? `${d.slice(0, 2)}***${d.slice(-2)}` : '***';
}

function StatusBadge({ label, value, color }) {
  return (
    <div className={`${color} p-3 rounded-lg text-center`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium">{label}</div>
    </div>
  );
}

function VisitorCard({ visitor, onCheckIn, onCheckOut, onRevoke, role, onViewDetails }) {
  const normalizedStatus = String(visitor?.status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const canCheckIn = normalizedStatus === 'CONFIRMED' || normalizedStatus === 'APPROVED';
  const canCheckOut = normalizedStatus === 'ON_PREMISE' || normalizedStatus === 'CHECKED_IN' || (visitor.check_in_time && !visitor.check_out_time);
  const canRevoke = normalizedStatus !== 'REVOKED';

  return (
    <div
      className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 space-y-3 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
      onClick={() => onViewDetails?.()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onViewDetails?.();
        }
      }}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{visitor.name || `#${visitor.id}`}</div>
          <div className="text-sm text-gray-500 dark:text-gray-300">Host: {visitor.host ? mask(visitor.host) : '-'}</div>
        </div>
        <div className="flex-shrink-0">
          <span className={getStatusChipClass(visitor.status, 'sm')}>{getStatusIcon(visitor.status)} {visitor.status || '-'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-200">
        <div>In: {visitor.check_in_time || '-'}</div>
        <div>Out: {visitor.check_out_time || '-'}</div>
      </div>

      {(['guard', 'admin'].includes(role)) && (
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={(event) => {
              event.stopPropagation();
              onCheckIn(visitor.id);
            }}
            disabled={!canCheckIn}
          >
            Check-in
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={(event) => {
              event.stopPropagation();
              onCheckOut(visitor.id);
            }}
            disabled={!canCheckOut}
          >
            Check-out
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            onClick={(event) => {
              event.stopPropagation();
              onRevoke(visitor.id);
            }}
            disabled={!canRevoke}
          >
            Revoke
          </Button>
        </div>
      )}
    </div>
  );
}

function Toast({ severity, message, persistent = false, onDismiss }) {
  const colors = { info: 'bg-blue-600', warning: 'bg-yellow-600', error: 'bg-red-600' };
  const bg = colors[severity] || 'bg-gray-600';
  return (
    <div data-testid="toast" className={`${bg} text-white p-3 rounded-lg shadow-lg min-w-64`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div data-testid="toast-title" className="font-bold text-sm opacity-95 mb-1 tracking-wide">
            {severity?.toUpperCase?.() || 'INFO'}
          </div>
          <div className="text-sm">{message}</div>
          {persistent && <div className="mt-1 text-xs opacity-90">Persistent alert</div>}
        </div>
        {persistent && (
          <button
            type="button"
            className="text-xs underline underline-offset-2 whitespace-nowrap"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
