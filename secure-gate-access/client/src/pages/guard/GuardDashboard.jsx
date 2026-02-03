import React, { useEffect, useMemo, useState } from "react";
import { navigateTo } from "../../utils/appNavigation";
import { useLocation, useNavigate } from "react-router-dom";
import logger from 'utils/logger';
import { useAuth } from "../../contexts/AuthContext";
import { useCurrentRole } from "../../hooks/useCurrentRole";
// AppShell removed - handled by Layout Route
import { Card, Button, Badge, SearchFilter, SearchResults, Pagination } from "../../components/ui";
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
import OfflineIndicator from "../../components/common/OfflineIndicator";
import AnnouncementsBanner from "../../components/common/AnnouncementsBanner";
import OnboardingTour from "../../components/common/OnboardingTour";
import QuickActionMenu from "../../components/common/QuickActionMenu";

export default function GuardDashboard() {
  const { logout } = useAuth();
  const role = useCurrentRole();
  const location = useLocation();
  const navigate = useNavigate();
  const { handleError, handleApiError, clearAllErrors } = useError();
  const { setLoading, isLoading } = useLoading();

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  const [active, setActive] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [toastFilter, setToastFilter] = useState(() => localStorage.getItem('toastFilter') || 'all'); // all|info|warning|error
  const [showFilters, setShowFilters] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState('all'); // Phase G3: Quick filter state
  const [isConnected, setIsConnected] = useState(true); // Live connection status
  const [selectedVisitor, setSelectedVisitor] = useState(null); // Visitor details modal
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
    filters,
    setSearchTerm,
    setFilters,
    clearFilters,
    setPage,
    isSearching,
    hasFilters,
    hasResults
  } = useSearchData(active, searchFields, filterFields, {
    enablePagination: true,
    pageSize: 10
  });

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
  }, [isLoading, navigate]);

  function statusChip(s) {
    // Phase A8: Using consistent status colors
    return <span className={getStatusChipClass(s, 'sm')}>{getStatusIcon(s)} {s || '-'}</span>;
  }

  async function fetchActive() {
    try {
      setLoading('guardDashboard', true, { message: 'Loading active visitors...' });
      clearAllErrors();
      const res = await fetch('/api/visitors/active', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      setActive(json.data || []);
    } catch (e) {
      handleApiError(e, 'Guard Dashboard');
    } finally {
      setLoading('guardDashboard', false);
    }
  }

  useEffect(() => { fetchActive(); }, []);

  // Subscribe to guard SSE for live updates
  useEffect(() => {
    let es;
    try {
      es = new EventSource('/api/ws/guards', { withCredentials: false });

      // Track connection status
      es.onopen = () => setIsConnected(true);
      es.onerror = () => setIsConnected(false);

      const onEvt = (evt) => {
        setIsConnected(true); // Receiving events means we're connected
        try {
          const data = JSON.parse(evt.data || '{}');
          // Minimal toast based on severity; never show PII
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
    return () => { try { es && es.close(); } catch { } };
  }, []);

  // Persist toast filter and auto-scroll to newest
  useEffect(() => { try { localStorage.setItem('toastFilter', toastFilter); } catch { } }, [toastFilter]);
  useEffect(() => {
    try { toastRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' }); } catch { }
  }, [toasts]);

  function pushToast(t) {
    const id = Math.random().toString(36).slice(2);
    const item = { id, ...t };
    setToasts((prev) => [item, ...prev].slice(0, 5));
    // Auto-remove after 4s
    setTimeout(() => {
      setToasts((prev) => prev.filter(x => x.id !== id));
    }, 4000);
  }

  async function postAction(id, action) {
    const url = `/api/visitors/${id}/${action}`;
    const headers = { 'Content-Type': 'application/json' };
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers
    });
    const json = await res.json();
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
        fetchActive(); // Refresh the list
      }
    } catch (e) {
      notificationService.error('Check-in Failed', e.message);
    }
  };

  const onCheckOut = async (id) => {
    try {
      const r = await postAction(id, 'check-out');
      if (r?.data?.already_checked_out) {
        notificationService.warning('Already Checked Out', 'Visitor is already checked out');
      } else {
        notificationService.success('Check-out Successful', `Visitor ${id} has been checked out`);
        fetchActive(); // Refresh the list
      }
    } catch (e) {
      notificationService.error('Check-out Failed', e.message);
    }
  };

  const onRevoke = async (id) => {
    if (!window.confirm('Revoke this visitor?')) return;
    try {
      await postAction(id, 'revoke');
      notificationService.warning('Visitor Revoked', `Visitor ${id} has been revoked`);
      fetchActive(); // Refresh the list
    } catch (e) {
      notificationService.error('Revoke Failed', e.message);
    }
  };

  // Phase G3: KPI filter click handler
  const handleKPIClick = (filterId) => {
    setActiveQuickFilter(filterId);
    // Apply filter based on KPI clicked
    const filterMap = {
      'on_premise': { status: 'on_premise' },
      'arriving': { fromDate: new Date().toISOString().split('T')[0], toDate: new Date().toISOString().split('T')[0] },
      'pending': { status: 'pending_approval' },
      'denied': { status: 'rejected', fromDate: new Date().toISOString().split('T')[0], toDate: new Date().toISOString().split('T')[0] }
    };
    // This would trigger a refetch with the filter - for now just set the active filter state
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

  let panel = (
    <div className="space-y-6">
      {/* Enhanced: Live Connection Status Header */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Guard Station</h2>
          <LiveConnectionStatus isConnected={isConnected} showLabel={true} />
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-300">
          {active.length} active visitor{active.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Live toasts (severity-based) */}
      <div data-testid="toasts" ref={toastRef} className="fixed top-16 right-4 flex flex-col gap-2 z-50 max-w-sm max-h-80 overflow-y-auto">
        <div className="flex gap-2 justify-end mb-1">
          {['all', 'info', 'warning', 'error'].map(f => (
            <button key={f} className="min-h-[44px] min-w-[44px] text-xs px-3 py-2 rounded opacity-70 hover:opacity-100 bg-gray-800 text-white"
              style={{ opacity: toastFilter === f ? 1 : 0.7 }} onClick={() => setToastFilter(f)}>
              {f.toUpperCase()}
            </button>
          ))}
          <span aria-label="visible-toasts" className="ml-2 text-xs bg-gray-800 text-white rounded-full px-2 py-1">
            {toasts.filter(t => toastFilter === 'all' || t.severity === toastFilter).length}
          </span>
        </div>
        {toasts.filter(t => toastFilter === 'all' || t.severity === toastFilter).map(t => (
          <Toast key={t.id} severity={t.severity} message={t.message} />
        ))}
      </div>

      {/* PHASE A4: Emphasize Scan QR and Manual Check - Mobile First */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 mb-6">
        {/* Primary: Scan QR */}
        <div
          data-tour="scan-qr"
          onClick={() => navigate('/dashboard/guard/scan-qr')}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 md:p-6 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all shadow-lg text-white"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-xl flex items-center justify-center mb-2">
              <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 16h4m-4 0h4m-4 0v4m-4-4h4m-4 0h4" />
              </svg>
            </div>
            <h3 className="font-bold text-base md:text-lg">Scan QR</h3>
            <p className="text-xs md:text-sm text-blue-100 mt-1">Quick check-in</p>
          </div>
        </div>

        {/* Secondary: Manual Check */}
        <div
          data-tour="manual-check"
          onClick={() => navigate('/dashboard/guard/manual-check')}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 md:p-6 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all shadow-lg text-white"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-xl flex items-center justify-center mb-2">
              <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-base md:text-lg">Manual Check</h3>
            <p className="text-xs md:text-sm text-green-100 mt-1">Search visitor</p>
          </div>
        </div>

        {/* Tertiary: Walk-In (less emphasis) */}
        <div
          onClick={() => navigate('/dashboard/guard/walk-in')}
          className="bg-white border-2 border-purple-200 rounded-xl p-4 md:p-6 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all col-span-2 md:col-span-1"
        >
          <div className="flex md:flex-col items-center md:text-center">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-3 md:mr-0 md:mb-2">
              <svg className="w-6 h-6 md:w-8 md:h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div className="flex-1 md:flex-none">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm md:text-base">Walk-In Registration</h3>
              <p className="text-xs text-gray-600 dark:text-gray-200 md:mt-1">New visitor</p>
            </div>
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
      <DashboardKPIs onFilterClick={handleKPIClick} />

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
          <Card.Title>Visitor Status</Card.Title>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatusBadge
              label="Confirmed"
              value={isSearching || hasFilters ? getFilteredStatusCount('CONFIRMED') : getStatusCount('CONFIRMED')}
              color="text-blue-600 bg-blue-50"
            />
            <StatusBadge
              label="On Premise"
              value={isSearching || hasFilters ? getFilteredStatusCount('ON_PREMISE') : getStatusCount('ON_PREMISE')}
              color="text-green-600 bg-green-50"
            />
            <StatusBadge
              label="Exited"
              value={isSearching || hasFilters ? getFilteredStatusCount('EXITED') : getStatusCount('EXITED')}
              color="text-gray-600 dark:text-gray-200 bg-gray-50"
            />
            <StatusBadge
              label="Revoked"
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
          <Card.Title>Active Visitors</Card.Title>
          <Button variant="outline" size="sm" onClick={fetchActive} disabled={isLoading('guardDashboard')}>
            {isLoading('guardDashboard') ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Card.Header>
        <Card.Content>
          {/* Error messages are now handled by ErrorContext */}

          <div className="md:hidden">
            {/* Mobile Cards */}
            {filteredActive.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {/* PHASE A5: Improved empty state messages */}
                {isSearching || hasFilters ? (
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium mb-1">No visitors match your criteria</p>
                    <p className="text-sm text-gray-600 dark:text-gray-200 mb-3">
                      Try adjusting your search or filters
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        clearFilters();
                      }}
                    >
                      Clear all filters
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium mb-1">No active visitors right now</p>
                    <p className="text-sm text-gray-600 dark:text-gray-200">
                      Visitors will appear here when they check in
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
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {/* PHASE A5: Improved empty state messages - Desktop */}
                {isSearching || hasFilters ? (
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium mb-1">No visitors match your criteria</p>
                    <p className="text-sm text-gray-600 dark:text-gray-200 mb-3">
                      Try adjusting your search or filters
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        clearFilters();
                      }}
                    >
                      Clear all filters
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium mb-1">No active visitors right now</p>
                    <p className="text-sm text-gray-600 dark:text-gray-200">
                      Visitors will appear here when they check in
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
                        <Button size="sm" onClick={() => onCheckIn(v.id)} disabled={v.status !== 'CONFIRMED'}>Check-in</Button>
                        <Button size="sm" onClick={() => onCheckOut(v.id)} disabled={!(v.status === 'ON_PREMISE' || (v.check_in_time && !v.check_out_time))}>Check-out</Button>
                        <Button size="sm" variant="destructive" onClick={() => onRevoke(v.id)} disabled={v.status === 'REVOKED'}>Revoke</Button>
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
    return active.filter(v => v.status === status).length;
  }

  // Get filtered status counts
  function getFilteredStatusCount(status) {
    if (!Array.isArray(filteredActive)) return 0;
    return filteredActive.filter(v => v.status === status).length;
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
    </div>
  );
}

function mask(value) {
  if (!value) return '';
  if (String(value).includes('@')) return `${value[0]}***${value.slice(-1)}`;
  const d = String(value).replace(/\D+/g, '');
  return d.length >= 4 ? `${d.slice(0, 2)}***${d.slice(-2)}` : '***';
}

// Mobile-First Components
function QuickActionTile({ href, icon, title, subtitle, color }) {
  return (
    <div
      onClick={() => navigateTo(href)}
      className="cursor-pointer"
    >
      <div className={`${color} text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-200 h-full`}>
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="opacity-90">{icon}</div>
          <div className="font-semibold text-lg">{title}</div>
          <div className="text-sm opacity-80">{subtitle}</div>
        </div>
      </div>
    </div>
  );
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
  const canCheckIn = visitor.status === 'CONFIRMED';
  const canCheckOut = visitor.status === 'ON_PREMISE' || (visitor.check_in_time && !visitor.check_out_time);
  const canRevoke = visitor.status !== 'REVOKED';

  return (
    <div
      className="border border-gray-200 rounded-lg p-4 space-y-3 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
      onClick={() => onViewDetails?.()}
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
        <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" className="flex-1" onClick={() => onCheckIn(visitor.id)} disabled={!canCheckIn}>
            Check-in
          </Button>
          <Button size="sm" className="flex-1" onClick={() => onCheckOut(visitor.id)} disabled={!canCheckOut}>
            Check-out
          </Button>
          <Button size="sm" variant="destructive" className="flex-1" onClick={() => onRevoke(visitor.id)} disabled={!canRevoke}>
            Revoke
          </Button>
        </div>
      )}
    </div>
  );
}

function Toast({ severity, message }) {
  const colors = { info: 'bg-blue-600', warning: 'bg-yellow-600', error: 'bg-red-600' };
  const bg = colors[severity] || 'bg-gray-600';
  return (
    <div data-testid="toast" className={`${bg} text-white p-3 rounded-lg shadow-lg min-w-64`}>
      <div data-testid="toast-title" className="font-bold text-sm opacity-95 mb-1 tracking-wide">
        {severity?.toUpperCase?.() || 'INFO'}
      </div>
      <div className="text-sm">{message}</div>
    </div>
  );
}
