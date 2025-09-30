import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import StatsCard from "../../components/StatsCard";
import Table from "../../components/Table";
import axios from "axios";

export default function AdminDashboard() {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token") || localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

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
        const res = await axios.get("/api/admin/metrics", { headers });
        if (!cancelled) setMetrics(res.data?.data || {});
      } catch (e) {
        if (!cancelled) setMetricsError("Failed to load metrics");
      } finally {
        if (!cancelled) setLoadingMetrics(false);
      }
    }
    loadMetrics();
    const id = setInterval(loadMetrics, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [headers]);

  useEffect(() => {
    let cancelled = false;
    async function loadLogs() {
      setLogsLoading(true); setLogsError(null);
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        const res = await axios.get(`/api/admin/audit-logs?${params}`, { headers });
        let rows = res.data?.data || [];
        // Client filters: action contains, user id contains, date (YYYY-MM-DD)
        const { action, user, date } = filters;
        if (action) rows = rows.filter(r => String(r.action || "").toLowerCase().includes(action.toLowerCase()));
        if (user) rows = rows.filter(r => String(r.user_id || "").toLowerCase().includes(user.toLowerCase()));
        if (date) rows = rows.filter(r => String(r.created_at || "").slice(0,10) === date);
        if (!cancelled) setLogs(rows);
      } catch (e) {
        if (!cancelled) setLogsError("Failed to load audit logs");
      } finally {
        if (!cancelled) setLogsLoading(false);
      }
    }
    loadLogs();
  }, [headers, page, limit, filters]);

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
    <div className="app-grid">
      <Sidebar role="admin" />
      <div>
        <Topbar title="Admin Dashboard" onLogout={onLogout} />
        <main className="main">
          <div className="grid four">
            <StatsCard title="Active Invites" value={String(metrics.invitesActive || 0)} loading={loadingMetrics} />
            <StatsCard title="Expired Invites" value={String(metrics.invitesExpired || 0)} loading={loadingMetrics} />
            <StatsCard title="Check-ins Today" value={String(metrics.checkinsToday || 0)} loading={loadingMetrics} />
            <StatsCard title="Failed OTPs" value={String(metrics.failedOtps || 0)} loading={loadingMetrics} />
          </div>

          {metricsError && <div className="error">{metricsError}</div>}

          <h3 style={{ marginTop: 16 }}>Audit Logs</h3>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <input placeholder="Filter action" value={filters.action} onChange={e=>setFilters(f=>({...f, action: e.target.value}))} />
            <input placeholder="Filter user id" value={filters.user} onChange={e=>setFilters(f=>({...f, user: e.target.value}))} />
            <input type="date" value={filters.date} onChange={e=>setFilters(f=>({...f, date: e.target.value}))} />
            <select value={limit} onChange={e=>{ setLimit(Number(e.target.value)||25); setPage(1); }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          {logsError && <div className="error">{logsError}</div>}
          <Table headers={auditHeaders} rows={auditRows} loading={logsLoading} />
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
            <span>Page {page}</span>
            <button onClick={()=>setPage(p=>p+1)}>Next</button>
          </div>
        </main>
      </div>
    </div>
  );
}
