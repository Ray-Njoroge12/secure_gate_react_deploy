/**
 * @file IncidentList.jsx
 * @description Phase G4 - List and manage incidents
 * Shows all incidents with filtering and resolution capabilities
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import OfflineBanner from '../../components/common/OfflineBanner';
import ResolveIncidentModal from '../../components/guard/ResolveIncidentModal';
import { Card, Button, Badge, PageHeader, Icon, Skeleton, EmptyState } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useError } from '../../contexts/ErrorContext';
import { useLoading } from '../../contexts/LoadingContext';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import usePullToRefresh from '../../hooks/usePullToRefresh';
import { formatIncidentDateTime, safeDisplayText, sanitizeIncidentForDisplay } from '../../utils/incidentDisplay';
import api from '../../utils/apiClient';

const IncidentList = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [fetchError, setFetchError] = useState(null);
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
  const { isOnline, wasOffline } = useOnlineStatus();

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading('incidents', true);
      setFetchError(null);

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await api.get(`/api/guard/incidents?${queryParams}`);
      const result = response.data;
      const payload = Array.isArray(result.data?.data) ? result.data.data : [];
      setIncidents(payload.map(sanitizeIncidentForDisplay));
    } catch (error) {
      setFetchError(error.message || 'Failed to load incidents. Please try again.');
      handleApiError(error, 'Incident List');
    } finally {
      setLoading('incidents', false);
    }
  }, [filters, handleApiError, setLoading]);

  const { PullToRefreshIndicator } = usePullToRefresh(fetchIncidents);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleResolveClick = (incident) => {
    setResolveModal({
      isOpen: true,
      incident
    });
  };

  const handleResolveComplete = (updatedIncident) => {
    // Update the incident in the local list
    setIncidents(prev => prev.map(inc =>
      inc.id === updatedIncident.id ? sanitizeIncidentForDisplay(updatedIncident) : inc
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

  const getCategoryIconName = (category) => {
    const icons = {
      suspicious: 'ShieldAlert',
      document_issue: 'FileWarning',
      vehicle: 'Car',
      behavior: 'AlertTriangle',
      system_error: 'Monitor',
      other: 'FileText'
    };
    return icons[category] || 'FileText';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900" data-tour="incident-report">
      <PageHeader
        title="Incident Reports"
        subtitle="View and manage guard incident reports"
        icon={<Icon name="AlertTriangle" className="w-6 h-6 text-orange-600" />}
        showBack={true}
        backTo="/dashboard/guard"
        actions={
          <Button onClick={fetchIncidents} disabled={isLoading('incidents')}>
            {isLoading('incidents') ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-8 space-y-6">
        {/* Pull to Refresh */}
        <PullToRefreshIndicator />

        {/* Offline Banner */}
        <OfflineBanner isOnline={isOnline} wasOffline={wasOffline} onRetry={fetchIncidents} />

        {/* Filters */}
        <Card>
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
              <Icon name="Filter" className="w-5 h-5" />
              Filters
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="mobile-select"
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
                  className="mobile-select"
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
                  className="mobile-select"
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
            {/* Skeleton Loading State */}
            {isLoading('incidents') && incidents.length === 0 && (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            )}

            {/* Error State with Retry */}
            {fetchError && !isLoading('incidents') && (
              <div className="text-center py-10" role="alert">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                  <Icon name="AlertCircle" className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to Load Incidents</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{fetchError}</p>
                <Button onClick={fetchIncidents} variant="primary" size="sm">
                  <Icon name="RefreshCw" className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}

            {/* Empty State with CTAs */}
            {!isLoading('incidents') && !fetchError && incidents.length === 0 && (
              <EmptyState
                icon="CheckCircle"
                title="All Clear!"
                message={
                  Object.values(filters).some(v => v) 
                    ? "No incidents match your filters. Try adjusting the criteria."
                    : "No incidents reported. Keep up the great work monitoring the premises!"
                }
                variant="success"
                actions={
                  Object.values(filters).some(v => v)
                    ? [
                        {
                          label: 'Clear Filters',
                          onClick: () => setFilters({
                            fromDate: '',
                            toDate: '',
                            category: '',
                            severity: '',
                            resolved: ''
                          }),
                          variant: 'outline'
                        }
                      ]
                    : [
                        {
                          label: 'Report New Incident',
                          onClick: () => navigate('/dashboard/guard'),
                          variant: 'primary',
                          icon: 'AlertTriangle'
                        }
                      ]
                }
              />
            )}

            {/* Incidents List */}
            {!isLoading('incidents') && incidents.length > 0 && (
              <div className="space-y-4">
                {incidents.map(incident => (
                  <div
                    key={incident.id}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow touch-active"
                  >
                    {/* Mobile: stacked layout */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700">
                        <Icon name={getCategoryIconName(incident.category)} className="w-5 h-5 text-gray-700 dark:text-gray-300" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white capitalize">
                          {safeDisplayText(incident.category, 'unknown').replace('_', ' ')}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-200">
                          {formatIncidentDateTime(incident.created_at)}
                        </div>
                        {incident.guard_name && (
                          <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                            Reported by: {safeDisplayText(incident.guard_name)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Badges row — wraps on mobile */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge className={getSeverityColor(incident.severity)}>
                        {safeDisplayText(incident.severity, 'medium')}
                      </Badge>
                      {incident.resolved_at ? (
                        <Badge variant="success">Resolved</Badge>
                      ) : (
                        <>
                          <Badge variant="warning">Open</Badge>
                          {canResolve(incident) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2 border-green-600 text-green-700 hover:bg-green-50 min-h-[28px]"
                              onClick={() => handleResolveClick(incident)}
                            >
                              Resolve
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                    <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      {safeDisplayText(incident.description)}
                    </div>

                    {incident.visitor_name && (
                      <div className="text-sm text-gray-600 dark:text-gray-200 mb-2">
                        Related to visitor: <strong>{safeDisplayText(incident.visitor_name)}</strong>
                      </div>
                    )}

                    {incident.resolution && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                        <div className="text-xs font-medium text-green-900 mb-1">Resolution</div>
                        <div className="text-sm text-green-800">{safeDisplayText(incident.resolution)}</div>
                        {incident.resolved_by_name && (
                          <div className="text-xs text-green-700 mt-1">
                            Resolved by: {safeDisplayText(incident.resolved_by_name)} on {formatIncidentDateTime(incident.resolved_at)}
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
