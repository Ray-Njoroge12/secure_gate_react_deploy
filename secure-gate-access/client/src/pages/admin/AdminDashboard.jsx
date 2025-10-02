import React, { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import StatsCard from "../../components/StatsCard";
import Table from "../../components/Table";
import { getMetrics, getAuditLogs } from "../../services/adminService";
import { handleApiError } from "../../utils/errorMapper";
import logger from "../../utils/logger";

export default function AdminDashboard() {

  // Metrics state
  const [metrics, setMetrics] = useState({ invitesActive: 0, invitesExpired: 0, checkinsToday: 0, failedOtps: 0, invitesByStatus: [] });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState(null);

  // Audit logs state
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [filters, setFilters] = useState({ action: "", user: "", date: "" });
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);

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
        let rows = data || [];
        // Client filters: action contains, user id contains, date (YYYY-MM-DD)
        const { action, user, date } = filters;
        if (action) rows = rows.filter(r => String(r.action || "").toLowerCase().includes(action.toLowerCase()));
        if (user) rows = rows.filter(r => String(r.user_id || "").toLowerCase().includes(user.toLowerCase()));
        if (date) rows = rows.filter(r => String(r.created_at || "").slice(0,10) === date);
        if (!cancelled) setLogs(rows);
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
  }, [page, limit, filters]);

  const onLogout = () => { localStorage.clear(); window.location.href = "/login"; };

  const auditHeaders = ["Time", "User", "Action", "Entity", "Details", "IP"];
  const auditRows = logs.map(l => [
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
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
        </div>
        
        <div className="p-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text"
              placeholder="Filter action"
              value={filters.action}
              onChange={e => setFilters(f => ({...f, action: e.target.value}))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
            <input
              type="text"
              placeholder="Filter user ID"
              value={filters.user}
              onChange={e => setFilters(f => ({...f, user: e.target.value}))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
            <input
              type="date"
              value={filters.date}
              onChange={e => setFilters(f => ({...f, date: e.target.value}))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
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
          
          {logsError && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {logsError}
            </div>
          )}
          
          <Table headers={auditHeaders} rows={auditRows} loading={logsLoading} />
          
          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p-1))}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">Page {page}</span>
            <button
              onClick={() => setPage(p => p+1)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
