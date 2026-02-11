// client/src/pages/admin/Reports.jsx
import React from 'react';
import Button from '../../components/ui/Button';

export default function Reports({ estateId }) {
  const params = new URLSearchParams(window.location.search);
  const [from, setFrom] = React.useState(params.get('from') || '');
  const [to, setTo] = React.useState(params.get('to') || '');
  const [status, setStatus] = React.useState(params.get('status') || '');
  const [host, setHost] = React.useState(params.get('host') || '');
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [aggregates, setAggregates] = React.useState({ counts: {}, dailyTotals: [], hostSummary: [], config: { hostFilterEnabled: true } });
  const [hostSortDir, setHostSortDir] = React.useState('desc'); // asc|desc
  const hostFilterEnabled = Boolean(aggregates?.config?.hostFilterEnabled ?? true);
  const showHostFilter = React.useMemo(() => hostFilterEnabled && (Boolean(host) || ((aggregates.hostSummary || []).length > 0)), [host, aggregates, hostFilterEnabled]);

  const buildQuery = () => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (status) q.set('status', status);
    if (host) q.set('host', host);
    if (estateId) q.set('siteId', estateId);
    return q.toString();
  };

  const exportCsv = () => {
    const q = buildQuery();
    window.location.href = `/api/visitors/reports?${q}&format=csv`;
  };
  const exportJson = async () => {
    const q = buildQuery();
    const res = await fetch(`/api/visitors/reports?${q}&format=json`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'visitors.json'; a.click(); URL.revokeObjectURL(url);
  };

  const refreshPreview = async () => {
    try {
      setLoading(true); setError('');
      const q = buildQuery();
      const headers = { 'Content-Type': 'application/json' };
      const [resRows, resAgg] = await Promise.all([
        fetch(`/api/visitors/reports?${q}&format=json`, { credentials: 'include', headers }),
        fetch(`/api/visitors/reports?${q}&mode=aggregates`, { credentials: 'include', headers })
      ]);
      const [jsonRows, jsonAgg] = await Promise.all([resRows.json(), resAgg.json()]);

      // Robust array extraction for rows
      let rowsData = [];
      if (jsonRows.success !== false) {
        if (Array.isArray(jsonRows)) {
          rowsData = jsonRows;
        } else if (Array.isArray(jsonRows.data)) {
          rowsData = jsonRows.data;
        } else if (Array.isArray(jsonRows.rows)) {
          rowsData = jsonRows.rows;
        }
      } else {
        throw new Error(jsonRows.error || 'Failed');
      }
      setRows(rowsData);

      // Robust extraction for aggregates
      let aggData = { counts: {}, dailyTotals: [], hostSummary: [], config: { hostFilterEnabled: true } };
      if (jsonAgg.success !== false) {
        aggData = jsonAgg.data || jsonAgg || aggData;
      }
      setAggregates(aggData);
    } catch (e) {
      setError(e.message);
      setRows([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { refreshPreview(); }, []);

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Visitor Reports</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Overview Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Overview</h2>
          <div className="flex flex-wrap gap-3">
            <StatusBadge label="CONFIRMED" value={aggregates.counts?.CONFIRMED || 0} className="bg-blue-500" />
            <StatusBadge label="ON_PREMISE" value={aggregates.counts?.ON_PREMISE || 0} className="bg-brand-500" />
            <StatusBadge label="EXITED" value={aggregates.counts?.EXITED || 0} className="bg-gray-500" />
            <StatusBadge label="REVOKED" value={aggregates.counts?.REVOKED || 0} className="bg-red-500" />
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Visitors per Day</h3>
            <div data-testid="daily-chart" className="grid gap-1.5 max-h-56 overflow-y-auto">
              {(() => {
                const rows = aggregates.dailyTotals || [];
                const max = Math.max(1, ...rows.map(r => Number(r.total) || 0));
                return rows.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-300 italic py-4 text-center">No data for selected period</p>
                ) : rows.map(r => (
                  <div key={r.date || r.day} className="flex items-center gap-2">
                    <div className="w-24 text-xs text-gray-500 dark:text-gray-300 shrink-0">{r.date || r.day}</div>
                    <div className="bg-gray-200 dark:bg-slate-700 rounded-md h-2.5 w-full relative">
                      <div className="bg-blue-500 h-full rounded-md transition-all" style={{ width: `${Math.round(((Number(r.total) || 0) / max) * 100)}%` }} />
                    </div>
                    <div className="w-9 text-right text-sm tabular-nums text-gray-700 dark:text-gray-300 shrink-0">{r.total}</div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Hosts Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Hosts (PII-safe)</h2>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-slate-800">
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">Host</th>
                  <th className="text-left py-2 px-2">
                    <Button data-testid="sort-host-total" className="font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors" onClick={() => setHostSortDir(d => d === 'desc' ? 'asc' : 'desc')}>
                      Invites {hostSortDir === 'desc' ? '▼' : '▲'}
                    </Button>
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">On Premise</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">Exited</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">Revoked</th>
                </tr>
              </thead>
              <tbody>
                {[...(aggregates.hostSummary || [])].sort((a, b) => hostSortDir === 'desc' ? (b.total || 0) - (a.total || 0) : (a.total || 0) - (b.total || 0)).map((h, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="py-2 px-2 text-gray-900 dark:text-gray-100">{h.host || '-'}</td>
                    <td className="py-2 px-2 font-medium text-gray-900 dark:text-gray-100">{h.total || 0}</td>
                    <td className="py-2 px-2 text-brand-600 dark:text-brand-400">{h.on_premise || 0}</td>
                    <td className="py-2 px-2 text-gray-500 dark:text-gray-300">{h.exited || 0}</td>
                    <td className="py-2 px-2 text-red-500">{h.revoked || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Export Panel */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Export</h2>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <label className="sr-only" htmlFor="report-from">From date</label>
          <input id="report-from" type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
          <label className="sr-only" htmlFor="report-to">To date</label>
          <input id="report-to" type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
          {showHostFilter && (
            <>
              <label className="sr-only" htmlFor="report-host">Host email</label>
              <input id="report-host" placeholder="Host email" value={host} onChange={e => setHost(e.target.value)} className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
            </>
          )}
          <label className="sr-only" htmlFor="report-status">Status filter</label>
          <select id="report-status" value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
            <option value="">Any status</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="ON_PREMISE">ON_PREMISE</option>
            <option value="EXITED">EXITED</option>
            <option value="REVOKED">REVOKED</option>
          </select>
          <Button variant="primary" size="sm" onClick={refreshPreview} disabled={loading}>
            {loading ? 'Refreshing…' : 'Preview'}
          </Button>
        </div>
        <div className="flex gap-3 mb-4">
          <Button variant="secondary" size="sm" onClick={exportCsv}>Export CSV</Button>
          <Button variant="secondary" size="sm" onClick={exportJson}>Export JSON</Button>
        </div>
        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-2 text-sm mb-4" role="alert">{error}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700">
                <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">ID</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">Name</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">Phone</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">Email</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">Host</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">Status</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">Date</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">Time</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">In</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">Out</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500 dark:text-gray-300 italic">{loading ? 'Loading…' : 'No records found'}</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className="py-2 px-2">{r.id}</td>
                  <td className="py-2 px-2">{r.name || ''}</td>
                  <td className="py-2 px-2">{r.phone || ''}</td>
                  <td className="py-2 px-2">{r.email || ''}</td>
                  <td className="py-2 px-2">{r.host || ''}</td>
                  <td className="py-2 px-2">{r.status || ''}</td>
                  <td className="py-2 px-2">{r.date_of_visit || ''}</td>
                  <td className="py-2 px-2">{r.time_of_visit || ''}</td>
                  <td className="py-2 px-2">{r.check_in_time || ''}</td>
                  <td className="py-2 px-2">{r.check_out_time || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/** Local status badge for report overview counts */
function StatusBadge({ label, value, className = '' }) {
  return (
    <div className={`${className} text-white px-3 py-2 rounded-lg min-w-[120px] inline-flex items-center justify-between gap-3`}>
      <span className="text-xs opacity-90">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
