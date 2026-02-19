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
import Table from '../../components/ui/ResponsiveTable';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import { format } from 'date-fns';

export default function IncidentManagement({ estateId }) {
  const { user } = useAuth();
  const { showError, showSuccess } = useError();
  const [activeTab, setActiveTab] = useState('open'); // open, under_review, resolved, all
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Confirmation Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({
    title: '',
    message: '',
    confirmText: 'Confirm',
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
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
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

  const headers = [
    { key: 'id', label: 'ID', priority: 1 },
    { key: 'type', label: 'Type', priority: 2 },
    {
      key: 'status',
      label: 'Status',
      priority: 1,
      render: (value) => {
        const map = {
          open: 'warning',
          assigned: 'info',
          in_progress: 'info',
          resolved: 'success',
          closed: 'neutral',
          escalated: 'danger'
        };
        return <Badge variant={map[value] || 'neutral'}>{value?.toUpperCase?.() || 'N/A'}</Badge>;
      }
    },
    {
      key: 'priority',
      label: 'Priority',
      priority: 1,
      render: (value) => {
        const map = {
          low: 'neutral',
          medium: 'info',
          high: 'warning',
          critical: 'danger'
        };
        return <Badge variant={map[value] || 'neutral'}>{value?.toUpperCase?.() || 'N/A'}</Badge>;
      }
    },
    { key: 'reported_by', label: 'Reported By', priority: 3 },
    { key: 'assigned_to', label: 'Assigned To', priority: 3 },
    { key: 'created_at', label: 'Date', priority: 2, render: (value) => value ? format(new Date(value), 'MMM d, HH:mm') : 'N/A' },
    {
      key: 'actions',
      label: 'Actions',
      priority: 1,
      render: (_, row) => (
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
          {row.status !== 'escalated' && row.status !== 'resolved' &&
            ['system', 'downtime', 'security_breach', 'infrastructure'].includes(row.category?.toLowerCase()) && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleAction(row, 'escalate', { reason: 'System escalation' })}
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
          <div className="text-sm text-gray-500">Under Review</div>
          <div className="text-2xl font-bold text-blue-600">{stats?.under_review || 0}</div>
        </Card>
        <Card className="p-4 bg-white dark:bg-slate-800">
          <div className="text-sm text-gray-500">Critical</div>
          <div className="text-2xl font-bold text-red-600">{stats?.critical || 0}</div>
        </Card>
        <Card className="p-4 bg-white dark:bg-slate-800">
          <div className="text-sm text-gray-500">SLA Breached</div>
          <div className="text-2xl font-bold text-orange-600">{stats?.sla_breached || 0}</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {['open', 'under_review', 'resolved', 'all'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab
              ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'
              }`}
          >
            {tab === 'under_review' ? 'Under Review' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <Table
          columns={headers}
          data={incidents.map(i => ({
            ...i,
            reported_by: i.reported_by_name || 'Unknown',
            assigned_to: i.assigned_name || 'Unassigned'
          }))}
          loading={loading}
        />
      </Card>

      <ConfirmationDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={dialogConfig.title}
        message={dialogConfig.message}
        confirmText={dialogConfig.confirmText}
        variant={dialogConfig.variant}
        onConfirm={dialogConfig.onConfirm}
      />
    </div>
  );
}
