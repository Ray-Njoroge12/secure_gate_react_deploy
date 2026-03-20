import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  getIncidents,
  getIncidentStats,
  updateIncidentStatus,
  assignIncident,
  escalateIncident,
  getUsers
} from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { useError } from '../../contexts/ErrorContext';
import Table from '../../components/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import { format } from 'date-fns';

export default function IncidentManagement({ estateId }) {
  const { user } = useAuth();
  const { showError, showSuccess } = useError();
  const [activeTab, setActiveTab] = useState('open'); // open, assigned, resolved, all
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Guards list for assignment dropdown
  const [guards, setGuards] = useState([]);
  const [assignDropdownOpen, setAssignDropdownOpen] = useState(null); // incident id or null
  const [assignSearch, setAssignSearch] = useState('');
  const assignDropdownRef = useRef(null);

  // Search
  const [incidentSearch, setIncidentSearch] = useState('');
  const [debouncedIncidentSearch, setDebouncedIncidentSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedIncidentSearch(incidentSearch), 300);
    return () => clearTimeout(timer);
  }, [incidentSearch]);

  const filteredIncidents = useMemo(() => {
    if (!debouncedIncidentSearch.trim()) return incidents;
    const q = debouncedIncidentSearch.toLowerCase();
    return incidents.filter(inc =>
      (inc.type || '').toLowerCase().includes(q) ||
      (inc.reported_by_name || '').toLowerCase().includes(q) ||
      (inc.description || '').toLowerCase().includes(q) ||
      (inc.notes || '').toLowerCase().includes(q) ||
      (inc.location || '').toLowerCase().includes(q)
    );
  }, [incidents, debouncedIncidentSearch]);

  // Confirmation Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    variant: 'danger',
    onConfirm: () => { }
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statsData = await getIncidentStats({ estate_id: estateId });
      setStats(statsData);

      const params = { estate_id: estateId };
      if (activeTab !== 'all') {
        params.status = activeTab;
      }
      const incidentsData = await getIncidents(params);
      setIncidents(incidentsData || []);
    } catch (err) {
      showError('Failed to fetch incidents', err);
    } finally {
      setLoading(false);
    }
  }, [estateId, activeTab, showError]);

  useEffect(() => {
    if (estateId) {
      fetchData();
    }
  }, [fetchData, estateId]);

  // Fetch guards for assignment dropdown
  useEffect(() => {
    if (!estateId) return;
    const fetchGuards = async () => {
      try {
        const data = await getUsers({ role: 'guard', estate_id: estateId });
        const guardList = Array.isArray(data) ? data : data?.users || data?.data || [];
        setGuards(guardList.filter(u => u.status === 'active' || !u.status));
      } catch {
        // Silently fail - dropdown will just be empty
        setGuards([]);
      }
    };
    fetchGuards();
  }, [estateId]);

  // Close assign dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(e.target)) {
        setAssignDropdownOpen(null);
        setAssignSearch('');
      }
    };
    if (assignDropdownOpen !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [assignDropdownOpen]);

  const filteredGuards = guards.filter(g => {
    const label = `${g.full_name || g.name || ''} (${g.username || ''})`.toLowerCase();
    return label.includes(assignSearch.toLowerCase());
  });

  const getGuardDisplayName = (guardId) => {
    const guard = guards.find(g => g.id === guardId);
    return guard ? `${guard.full_name || guard.name || guard.username}` : null;
  };

  const handleAction = (incident, action, payload = {}) => {
    setDialogConfig({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Incident`,
      message: `Are you sure you want to ${action} incident #${incident.id}?`,
      confirmLabel: action.charAt(0).toUpperCase() + action.slice(1),
      variant: action === 'resolve' ? 'success' : 'primary',
      onConfirm: async () => {
        setActionLoading(incident.id);
        try {
          if (action === 'assign') {
            await assignIncident(incident.id, payload);
          } else if (action === 'escalate') {
            await escalateIncident(incident.id, payload);
          } else if (action === 'resolve' || action === 'close') {
            await updateIncidentStatus(incident.id, { status: 'resolved' });
          } else {
            await updateIncidentStatus(incident.id, payload);
          }
          showSuccess(`Incident ${action}ed successfully`);
          fetchData();
        } catch (err) {
          showError(`Failed to ${action} incident`, err);
        } finally {
          setActionLoading(null);
          setDialogOpen(false);
        }
      }
    });
    setDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    const map = {
      open: 'warning',
      assigned: 'info',
      in_progress: 'info',
      resolved: 'success',
      closed: 'neutral',
      escalated: 'danger'
    };
    return <Badge variant={map[status] || 'neutral'}>{status.toUpperCase()}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const map = {
      low: 'neutral',
      medium: 'info',
      high: 'warning',
      critical: 'danger'
    };
    return <Badge variant={map[priority] || 'neutral'}>{priority.toUpperCase()}</Badge>;
  };

  const headers = [
    { key: 'id', label: 'ID' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'reported_by', label: 'Reported By' },
    { key: 'assigned_to', label: 'Assigned To' },
    { key: 'created_at', label: 'Date', render: (row) => format(new Date(row.created_at), 'MMM d, HH:mm') },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {row.status === 'open' && (
            <div className="relative" ref={assignDropdownOpen === row.id ? assignDropdownRef : undefined}>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setAssignDropdownOpen(assignDropdownOpen === row.id ? null : row.id);
                  setAssignSearch('');
                }}
                loading={actionLoading === row.id}
              >
                Assign
              </Button>
              {assignDropdownOpen === row.id && (
                <div className="absolute z-50 mt-1 w-64 bg-white dark:bg-slate-800 shadow-lg rounded-md border border-gray-200 dark:border-slate-600 overflow-hidden">
                  <div className="p-2 border-b border-gray-200 dark:border-slate-600">
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Search guards..."
                      value={assignSearch}
                      onChange={(e) => setAssignSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <ul className="max-h-48 overflow-y-auto py-1">
                    {filteredGuards.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No guards found</li>
                    ) : (
                      filteredGuards.map(guard => (
                        <li
                          key={guard.id}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-900/20 text-gray-900 dark:text-gray-100"
                          onClick={() => {
                            setAssignDropdownOpen(null);
                            setAssignSearch('');
                            handleAction(row, 'assign', { assignee_id: guard.id });
                          }}
                        >
                          {guard.full_name || guard.name || guard.username} ({guard.username})
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
          {row.status !== 'resolved' && row.status !== 'closed' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction(row, 'resolve')}
              loading={actionLoading === row.id}
            >
              Resolve
            </Button>
          )}
          {row.status !== 'escalated' && row.status !== 'resolved' && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleAction(row, 'escalate', { reason: 'Admin escalation' })}
              loading={actionLoading === row.id}
            >
              Escalate
            </Button>
          )}
        </div>
      )
    }
  ];

  if (!estateId) return <div className="text-gray-500">Select an estate to view incidents.</div>;

  return (
    <div className="space-y-6" data-tour="incident-management">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-slate-800">
          <div className="text-sm text-gray-500">Open Incidents</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.open || 0}</div>
        </Card>
        <Card className="p-4 bg-white dark:bg-slate-800">
          <div className="text-sm text-gray-500">In Progress</div>
          <div className="text-2xl font-bold text-blue-600">{stats?.in_progress || 0}</div>
        </Card>
        <Card className="p-4 bg-white dark:bg-slate-800">
          <div className="text-sm text-gray-500">Critical</div>
          <div className="text-2xl font-bold text-red-600">{stats?.critical || 0}</div>
        </Card>
        <Card className="p-4 bg-white dark:bg-slate-800">
          <div className="text-sm text-gray-500">Resolved Today</div>
          <div className="text-2xl font-bold text-green-600">{stats?.resolved_today || 0}</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {['open', 'assigned', 'resolved', 'all'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'
              }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="search"
          placeholder="Search incidents by type, reporter, description..."
          value={incidentSearch}
          onChange={(e) => setIncidentSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>
      {debouncedIncidentSearch && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Showing {filteredIncidents.length} of {incidents.length} incidents
          {filteredIncidents.length === 0 && (
            <button onClick={() => setIncidentSearch('')} className="ml-2 text-brand-600 hover:underline">Clear search</button>
          )}
        </p>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <Table
          headers={headers}
          rows={filteredIncidents.map(i => ({
            ...i,
            status: getStatusBadge(i.status),
            priority: getPriorityBadge(i.priority),
            reported_by: i.reported_by_name || 'Unknown',
            assigned_to: i.assigned_to_name || getGuardDisplayName(i.assigned_to) || (i.assigned_to ? `ID: ${i.assigned_to}` : 'Unassigned')
          }))}
          loading={loading}
          emptyMessage="No incidents found."
        />
      </Card>

      <ConfirmationDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={dialogConfig.title}
        message={dialogConfig.message}
        confirmLabel={dialogConfig.confirmLabel}
        variant={dialogConfig.variant}
        onConfirm={dialogConfig.onConfirm}
      />
    </div>
  );
}
