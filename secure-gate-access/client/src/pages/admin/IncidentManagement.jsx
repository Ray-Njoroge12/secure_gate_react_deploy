import React, { useState, useEffect, useCallback } from 'react';
import {
  getIncidents,
  getIncidentStats,
  updateIncidentStatus,
  assignIncident,
  escalateIncident
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
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleAction(row, 'assign', { assignee_id: user.id })}
              loading={actionLoading === row.id}
            >
              Assign to Me
            </Button>
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
    <div className="space-y-6">
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

      {/* Table */}
      <Card className="overflow-hidden">
        <Table
          headers={headers}
          rows={incidents.map(i => ({
            ...i,
            status: getStatusBadge(i.status),
            priority: getPriorityBadge(i.priority),
            reported_by: i.reported_by_name || 'Unknown',
            assigned_to: i.assigned_to_name || 'Unassigned'
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
