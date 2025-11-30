/**
 * @file IncidentWorkflowDashboard.jsx
 * @description Complete incident workflow management system
 * Phase A4: Incident Workflow & Escalations
 * 
 * Features:
 * - Incident queue with filtering
 * - Status workflow management
 * - Assignment and escalation
 * - SLA tracking
 * - Comment threads
 * - Bulk actions
 */

import React, { useState, useEffect } from 'react';
import IncidentDetailModal from './IncidentDetailModal';
import './IncidentWorkflowDashboard.css';

const IncidentWorkflowDashboard = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [guards, setGuards] = useState([]);
  const [stats, setStats] = useState(null);

  const filterOptions = [
    { id: 'all', label: 'All Open', icon: '📋' },
    { id: 'critical', label: 'Critical', icon: '🔴' },
    { id: 'assigned_to_me', label: 'Assigned to Me', icon: '👤' },
    { id: 'unassigned', label: 'Unassigned', icon: '⚪' },
    { id: 'sla_breached', label: 'SLA Breached', icon: '⚠️' }
  ];

  useEffect(() => {
    fetchIncidents();
    fetchGuards();
    fetchStats();
  }, [activeFilter]);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (activeFilter === 'critical') {
        params.append('severity', 'critical');
      } else if (activeFilter === 'assigned_to_me') {
        params.append('assignedToMe', 'true');
      } else if (activeFilter === 'unassigned') {
        params.append('unassigned', 'true');
      } else if (activeFilter === 'sla_breached') {
        params.append('slaBreached', 'true');
      }
      
      const response = await fetch(`/api/admin/incidents/queue?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to fetch incidents');

      const data = await response.json();
      setIncidents(data.data || []);
    } catch (err) {
      console.error('Error fetching incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuards = async () => {
    try {
      const response = await fetch('/api/admin/users?role=guard', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setGuards(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching guards:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/incidents/stats', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleStatusChange = async (incidentId, newStatus) => {
    try {
      const response = await fetch(`/api/admin/incidents/${incidentId}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update status');

      await fetchIncidents();
      await fetchStats();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleAssignment = async (incidentId, guardId) => {
    try {
      const response = await fetch(`/api/admin/incidents/${incidentId}/assign`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: guardId })
      });

      if (!response.ok) throw new Error('Failed to assign incident');

      await fetchIncidents();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleEscalate = async (incidentId, escalateTo) => {
    try {
      const response = await fetch(`/api/admin/incidents/${incidentId}/escalate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escalateTo })
      });

      if (!response.ok) throw new Error('Failed to escalate incident');

      await fetchIncidents();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const openIncidentDetail = (incident) => {
    setSelectedIncident(incident);
    setShowDetailModal(true);
  };

  const getSeverityClass = (severity) => {
    return `severity-${severity}`;
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return icons[severity] || '⚪';
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      open: 'status-open',
      under_review: 'status-review',
      escalated: 'status-escalated',
      closed: 'status-closed',
      cancelled: 'status-cancelled'
    };
    return classes[status] || 'status-open';
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="incident-workflow">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading incidents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="incident-workflow">
      {/* Header */}
      <div className="workflow-header">
        <div className="header-left">
          <h1>🚨 Incident Workflow</h1>
          <p className="subtitle">Manage incidents through their lifecycle</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon open">📋</div>
            <div className="stat-content">
              <h3>Open Incidents</h3>
              <p className="stat-value">{stats.open || 0}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon critical">🔴</div>
            <div className="stat-content">
              <h3>Critical</h3>
              <p className="stat-value">{stats.critical || 0}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon review">👁️</div>
            <div className="stat-content">
              <h3>Under Review</h3>
              <p className="stat-value">{stats.under_review || 0}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon sla">⚠️</div>
            <div className="stat-content">
              <h3>SLA Breached</h3>
              <p className="stat-value">{stats.sla_breached || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {filterOptions.map(option => (
          <button
            key={option.id}
            className={`filter-tab ${activeFilter === option.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(option.id)}
          >
            <span className="filter-icon">{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>

      {/* Incidents List */}
      <div className="incidents-container">
        {incidents.length === 0 ? (
          <div className="empty-state">
            <p>No incidents matching this filter.</p>
          </div>
        ) : (
          <div className="incidents-grid">
            {incidents.map(incident => (
              <div 
                key={incident.id} 
                className="incident-card"
                onClick={() => openIncidentDetail(incident)}
              >
                {/* Card Header */}
                <div className="incident-card-header">
                  <div className="incident-title-row">
                    <span className={`severity-badge ${getSeverityClass(incident.severity)}`}>
                      {getSeverityIcon(incident.severity)} {incident.severity}
                    </span>
                    <span className={`status-badge ${getStatusBadgeClass(incident.status)}`}>
                      {incident.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="incident-title">
                    #{incident.id} - {incident.category?.replace('_', ' ') || 'Incident'}
                  </h3>
                </div>

                {/* Card Body */}
                <div className="incident-card-body">
                  <p className="incident-description">
                    {incident.description || 'No description provided'}
                  </p>

                  <div className="incident-meta">
                    <div className="meta-item">
                      <span className="meta-label">Reported:</span>
                      <span className="meta-value">{getTimeAgo(incident.created_at)}</span>
                    </div>
                    {incident.assigned_to && (
                      <div className="meta-item">
                        <span className="meta-label">Assigned to:</span>
                        <span className="meta-value">{incident.assigned_name || 'N/A'}</span>
                      </div>
                    )}
                    {incident.priority && (
                      <div className="meta-item">
                        <span className="meta-label">Priority:</span>
                        <span className="priority-value">P{incident.priority}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="incident-card-actions" onClick={(e) => e.stopPropagation()}>
                  {incident.status === 'open' && (
                    <>
                      <button
                        className="btn-action btn-review"
                        onClick={() => handleStatusChange(incident.id, 'under_review')}
                      >
                        Review
                      </button>
                      {!incident.assigned_to && (
                        <select
                          className="assign-select"
                          onChange={(e) => handleAssignment(incident.id, e.target.value)}
                          defaultValue=""
                        >
                          <option value="" disabled>Assign to...</option>
                          {guards.map(guard => (
                            <option key={guard.id} value={guard.id}>
                              {guard.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                  
                  {incident.status === 'under_review' && (
                    <>
                      <button
                        className="btn-action btn-escalate"
                        onClick={() => handleEscalate(incident.id, 'security_lead')}
                      >
                        Escalate
                      </button>
                      <button
                        className="btn-action btn-close"
                        onClick={() => handleStatusChange(incident.id, 'closed')}
                      >
                        Close
                      </button>
                    </>
                  )}

                  {incident.status === 'escalated' && (
                    <button
                      className="btn-action btn-close"
                      onClick={() => handleStatusChange(incident.id, 'closed')}
                    >
                      Resolve
                    </button>
                  )}
                </div>

                {/* SLA Warning */}
                {incident.sla_breached && (
                  <div className="sla-warning">
                    ⚠️ SLA Breached - Overdue by {incident.overdue_minutes}m
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          guards={guards}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedIncident(null);
            fetchIncidents();
          }}
          onUpdate={fetchIncidents}
        />
      )}
    </div>
  );
};

export default IncidentWorkflowDashboard;
