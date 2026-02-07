/**
 * @file IncidentList.jsx
 * @description Phase G4 - List and manage incidents
 * Shows all incidents with filtering and resolution capabilities
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, PageHeader } from '../../components/ui';
import { AlertCircle, Filter, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useError } from '../../contexts/ErrorContext';
import { useLoading } from '../../contexts/LoadingContext';

import ResolveIncidentModal from '../../components/guard/ResolveIncidentModal';
import { useAuth } from '../../contexts/AuthContext';

const IncidentList = () => {
  const [incidents, setIncidents] = useState([]);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    category: '',
    severity: '',
    resolved: ''
  });

  // State for resolution modal
  const [resolveModal, setResolveModal] = useState({
    isOpen: false,
    incident: null
  });

  const { handleApiError } = useError();
  const { setLoading, isLoading } = useLoading();
  const { user } = useAuth(); // Get current user for permission checks

  useEffect(() => {
    fetchIncidents();
  }, [filters]);

  const fetchIncidents = async () => {
    try {
      setLoading('incidents', true);

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/guard/incidents?${queryParams}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        // Backend wraps response in { data: { data: [...], pagination: ... } }
        setIncidents(result.data?.data || []);
      }
    } catch (error) {
      handleApiError(error, 'Incident List');
    } finally {
      setLoading('incidents', false);
    }
  };

  const handleResolveClick = (incident) => {
    setResolveModal({
      isOpen: true,
      incident
    });
  };

  const handleResolveComplete = (updatedIncident) => {
    // Update the incident in the local list
    setIncidents(prev => prev.map(inc =>
      inc.id === updatedIncident.id ? updatedIncident : inc
    ));
    // Optional: Show success toast via notification service if available
  };

  const canResolve = (incident) => {
    if (incident.resolved_at) return false;
    // Allow Admin OR the Guard who created it
    // Note: Assuming incident object has guard_id. If strict comparison fails due to type, try loose equality.
    return user?.role === 'admin' || user?.id === incident.guard_id;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severity] || colors.medium;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      suspicious: '🚨',
      document_issue: '📄',
      vehicle: '🚗',
      behavior: '⚠️',
      system_error: '💻',
      other: '📝'
    };
    return icons[category] || '📝';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <PageHeader
        title="Incident Reports"
        subtitle="View and manage guard incident reports"
        icon={<AlertTriangle className="w-6 h-6 text-orange-600" />}
        showBack={true}
        backTo="/dashboard/guard"
        actions={
          <Button onClick={fetchIncidents} disabled={isLoading('incidents')}>
            {isLoading('incidents') ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-8 space-y-6">
        {/* Filters */}
        <Card>
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md"
                >
                  <option value="">All Categories</option>
                  <option value="suspicious">Suspicious</option>
                  <option value="document_issue">Document Issue</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="behavior">Behavior</option>
                  <option value="system_error">System Error</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md"
                >
                  <option value="">All Levels</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={filters.resolved}
                  onChange={(e) => setFilters({ ...filters, resolved: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md"
                >
                  <option value="">All</option>
                  <option value="false">Open</option>
                  <option value="true">Resolved</option>
                </select>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Incidents List */}
        <Card>
          <Card.Header>
            <Card.Title>
              Incidents ({incidents.length})
            </Card.Title>
          </Card.Header>
          <Card.Content>
            {incidents.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-200">No incidents found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {incidents.map(incident => (
                  <div
                    key={incident.id}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{getCategoryIcon(incident.category)}</div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white capitalize">
                            {incident.category.replace('_', ' ')}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-200">
                            {new Date(incident.created_at).toLocaleString()}
                          </div>
                          {incident.guard_name && (
                            <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                              Reported by: {incident.guard_name}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getSeverityColor(incident.severity)}>
                          {incident.severity}
                        </Badge>
                        {incident.resolved_at ? (
                          <Badge variant="success">Resolved</Badge>
                        ) : (
                          <div className="flex gap-2">
                            <Badge variant="warning">Open</Badge>
                            {/* Resolve Button - Only for Owner or Admin */}
                            {canResolve(incident) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs px-2 border-green-600 text-green-700 hover:bg-green-50"
                                onClick={() => handleResolveClick(incident)}
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      {incident.description}
                    </div>

                    {incident.visitor_name && (
                      <div className="text-sm text-gray-600 dark:text-gray-200 mb-2">
                        Related to visitor: <strong>{incident.visitor_name}</strong>
                      </div>
                    )}

                    {incident.resolution && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                        <div className="text-xs font-medium text-green-900 mb-1">Resolution</div>
                        <div className="text-sm text-green-800">{incident.resolution}</div>
                        {incident.resolved_by_name && (
                          <div className="text-xs text-green-700 mt-1">
                            Resolved by: {incident.resolved_by_name} on {new Date(incident.resolved_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Resolution Modal */}
      {resolveModal.incident && (
        <ResolveIncidentModal
          isOpen={resolveModal.isOpen}
          incident={resolveModal.incident}
          onClose={() => setResolveModal({ isOpen: false, incident: null })}
          onResolve={handleResolveComplete}
        />
      )}
    </div>
  );
};

export default IncidentList;

