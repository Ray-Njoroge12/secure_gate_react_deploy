/**
 * @file AuditLogs.jsx
 * @description Admin audit log viewer with date/action filters and CSV export
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge, Skeleton } from '../../components/ui';
import { getAuditLogs } from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext.jsx';
import logger from '../../utils/logger.js';

const ACTION_TYPES = [
  'all', 'visitor.check_in', 'visitor.check_out', 'user.login',
  'user.logout', 'visitor.created', 'visitor.approved', 'visitor.rejected'
];

export default function AuditLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', action: 'all' });
  const perPage = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: perPage };
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      if (filters.action !== 'all') params.action = filters.action;
      const res = await getAuditLogs(params);
      const data = res?.data || res || {};
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setTotal(data.total || 0);
    } catch (err) {
      logger.error('Failed to load audit logs:', err);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, filters, toast]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / perPage);

  const exportCSV = () => {
    const rows = logs.map(l =>
      [l.created_at, l.user_email, l.action, l.resource, l.ip_address, l.outcome].join(',')
    );
    const csv = ['Timestamp,User,Action,Resource,IP,Outcome', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{total} total events</p>
        </div>
        <Button onClick={exportCSV} variant="outline" aria-label="Export CSV">Export CSV</Button>
      </div>

      <Card>
        <div className="p-4 flex gap-4 flex-wrap items-end">
          <div>
            <label htmlFor="date-from" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Date From</label>
            <input
              id="date-from"
              type="date"
              value={filters.dateFrom}
              onChange={e => { setFilters(f => ({ ...f, dateFrom: e.target.value })); setPage(1); }}
              className="border rounded px-2 py-1 dark:bg-slate-800 dark:border-slate-600"
            />
          </div>
          <div>
            <label htmlFor="date-to" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Date To</label>
            <input
              id="date-to"
              type="date"
              value={filters.dateTo}
              onChange={e => { setFilters(f => ({ ...f, dateTo: e.target.value })); setPage(1); }}
              className="border rounded px-2 py-1 dark:bg-slate-800 dark:border-slate-600"
            />
          </div>
          <div>
            <label htmlFor="action-filter" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Action</label>
            <select
              id="action-filter"
              value={filters.action}
              onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1); }}
              className="border rounded px-2 py-1 dark:bg-slate-800 dark:border-slate-600"
            >
              {ACTION_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b dark:border-slate-700">
                  <th className="px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Timestamp</th>
                  <th className="px-4 py-2 font-medium text-gray-500 dark:text-gray-400">User</th>
                  <th className="px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Action</th>
                  <th className="px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Resource</th>
                  <th className="px-4 py-2 font-medium text-gray-500 dark:text-gray-400">IP</th>
                  <th className="px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No audit logs found
                    </td>
                  </tr>
                ) : logs.map(log => (
                  <tr key={log.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-4 py-2 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2">{log.user_email}</td>
                    <td className="px-4 py-2 font-mono text-xs">{log.action}</td>
                    <td className="px-4 py-2 font-mono text-xs">{log.resource}</td>
                    <td className="px-4 py-2 font-mono">{log.ip_address}</td>
                    <td className="px-4 py-2">
                      <Badge variant={log.outcome === 'success' ? 'success' : 'danger'}>{log.outcome}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 flex items-center justify-between border-t dark:border-slate-700">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
