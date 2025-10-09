import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import StatsCard from "../../components/StatsCard";
import Table from "../../components/Table";
import { SearchFilter, Pagination } from "../../components/ui";
import { getMetrics, getAuditLogs } from "../../services/adminService";
import { handleApiError } from "../../utils/errorMapper";
import logger from 'utils/logger';
import { useSearchData } from "../../hooks/useSearch";

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Metrics state
  const [metrics, setMetrics] = useState({ invitesActive: 0, invitesExpired: 0, checkinsToday: 0, failedOtps: 0, invitesByStatus: [] });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState(null);

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
      // Ctrl/Cmd + R to refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (!loadingMetrics) {
          loadMetrics();
        }
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

  const onLogout = () => { localStorage.clear(); window.location.href = "/login"; };

  const auditHeaders = ["Time", "User", "Action", "Entity", "Details", "IP"];
  const auditRows = filteredLogs.map(l => [
    l.created_at,
    l.user_id || "-",
    l.action,
    `${l.entity_type || "-"}:${l.entity_id || "-"}`,
    l.details ? JSON.stringify(l.details) : "",
    l.ip_address || ""
  ]);

  return (
    <AppShell role={localStorage.getItem('role') || 'admin'} title="Admin Dashboard" onLogout={onLogout}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard title="Active Invites" value={String(metrics.invitesActive || 0)} loading={loadingMetrics} />
        <StatsCard title="Expired Invites" value={String(metrics.invitesExpired || 0)} loading={loadingMetrics} />
        <StatsCard title="Check-ins Today" value={String(metrics.checkinsToday || 0)} loading={loadingMetrics} />
        <StatsCard title="Failed OTPs" value={String(metrics.failedOtps || 0)} loading={loadingMetrics} />
      </div>

      {metricsError && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {metricsError}
        </div>
      )}

      {/* Audit Logs Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-row items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={e => { setLimit(Number(e.target.value)||25); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>
        
        <div className="p-6">
          {/* Search and Filters */}
          <SearchFilter
            data={logs}
            searchFields={searchFields}
            filterFields={filterFields}
            onSearch={setSearchTerm}
            onFilter={setFilters}
            placeholder="Search audit logs by action, user, entity, or IP..."
            showAdvanced={showFilters}
            enableSorting={true}
            enablePagination={false}
          />
          
          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <div>
              {isSearching || hasFilters ? (
                <>
                  Showing {filteredLogs.length} of {logs.length} logs
                  {searchTerm && ` for "${searchTerm}"`}
                </>
              ) : (
                `Total: ${logs.length} logs`
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
          </div>
          
          {logsError && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {logsError}
            </div>
          )}
          
          {hasResults ? (
            <>
              <Table headers={auditHeaders} rows={auditRows} loading={logsLoading} />
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={setSearchPage}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mt-2">No audit logs found</h3>
              <p className="text-gray-600 mt-1">
                {isSearching || hasFilters ? 'Try adjusting your search terms or filters' : 'Audit logs will appear here as system activity occurs'}
              </p>
              {(isSearching || hasFilters) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    clearFilters();
                  }}
                  className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Clear search and filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
