/**
 * @fileoverview Activity Log Page for Guards
 * @description Displays guard activity history including check-ins, check-outs, 
 * incidents, and other actions during shifts
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useError } from '../../contexts/ErrorContext';
import { useLoading } from '../../contexts/LoadingContext';
import { Card, Button, Badge, SearchFilter } from '../../components/ui';
import PageHeader from '../../components/PageHeader';
import logger from '../../utils/logger';

// Icons
const ActivityIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const CheckInIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
  </svg>
);

const CheckOutIcon = () => (
  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const WalkInIcon = () => (
  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
);

const QRIcon = () => (
  <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
  </svg>
);

const HandoverIcon = () => (
  <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

// Activity type configurations
const ACTIVITY_TYPES = {
  check_in: { icon: CheckInIcon, label: 'Check-In', color: 'green' },
  check_out: { icon: CheckOutIcon, label: 'Check-Out', color: 'red' },
  walk_in: { icon: WalkInIcon, label: 'Walk-In Registration', color: 'blue' },
  qr_scan: { icon: QRIcon, label: 'QR Scan', color: 'purple' },
  incident: { icon: AlertIcon, label: 'Incident', color: 'yellow' },
  handover: { icon: HandoverIcon, label: 'Handover', color: 'indigo' },
  shift_start: { icon: CheckInIcon, label: 'Shift Started', color: 'green' },
  shift_end: { icon: CheckOutIcon, label: 'Shift Ended', color: 'red' },
};

export default function ActivityLog() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { handleApiError } = useError();
  const { setLoading, isLoading } = useLoading();

  // State
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [filters, setFilters] = useState({
    type: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    checkIns: 0,
    checkOuts: 0,
    incidents: 0,
    walkIns: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0
  });

  // Fetch activity log
  const fetchActivities = useCallback(async () => {
    try {
      setLoading('activityLog', true);

      // In a real implementation, this would call a dedicated activity log endpoint
      // For now, we'll aggregate from multiple sources
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch visitor check-ins/check-outs
      const visitorsRes = await fetch(`/api/visitors/history?start_date=${weekAgo}&end_date=${today}`, {
        credentials: 'include'
      });
      const visitorsJson = await visitorsRes.json();

      // Transform visitor data to activity format
      const visitorActivities = [];
      if (visitorsJson.success && visitorsJson.data) {
        visitorsJson.data.forEach(visitor => {
          if (visitor.check_in) {
            visitorActivities.push({
              id: `checkin-${visitor.id}`,
              type: 'check_in',
              timestamp: visitor.check_in,
              details: {
                visitorName: visitor.name,
                visitorId: visitor.id,
                hostName: visitor.host_name,
                hostUnit: visitor.host_unit
              },
              description: `Checked in visitor: ${visitor.name}`
            });
          }
          if (visitor.check_out) {
            visitorActivities.push({
              id: `checkout-${visitor.id}`,
              type: 'check_out',
              timestamp: visitor.check_out,
              details: {
                visitorName: visitor.name,
                visitorId: visitor.id
              },
              description: `Checked out visitor: ${visitor.name}`
            });
          }
          if (visitor.is_walk_in) {
            visitorActivities.push({
              id: `walkin-${visitor.id}`,
              type: 'walk_in',
              timestamp: visitor.created_at,
              details: {
                visitorName: visitor.name,
                visitorId: visitor.id,
                purpose: visitor.purpose
              },
              description: `Registered walk-in: ${visitor.name}`
            });
          }
        });
      }

      // Fetch shifts for shift start/end activities
      const shiftsRes = await fetch(`/api/guards/shifts?start_date=${weekAgo}&end_date=${today}`, {
        credentials: 'include'
      });
      const shiftsJson = await shiftsRes.json();

      const shiftActivities = [];
      if (shiftsJson.success && shiftsJson.data) {
        shiftsJson.data
          .filter(shift => shift.guard_id === user.id)
          .forEach(shift => {
            if (shift.actual_start_time) {
              shiftActivities.push({
                id: `shiftstart-${shift.id}`,
                type: 'shift_start',
                timestamp: shift.actual_start_time,
                details: {
                  shiftType: shift.shift_type,
                  post: shift.post_location
                },
                description: `Started ${shift.shift_type} shift at ${shift.post_location || 'Main Gate'}`
              });
            }
            if (shift.actual_end_time) {
              shiftActivities.push({
                id: `shiftend-${shift.id}`,
                type: 'shift_end',
                timestamp: shift.actual_end_time,
                details: {
                  shiftType: shift.shift_type
                },
                description: `Ended ${shift.shift_type} shift`
              });
            }
          });
      }

      // Combine all activities and sort by timestamp
      const allActivities = [...visitorActivities, ...shiftActivities]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setActivities(allActivities);
      setFilteredActivities(allActivities);

      // Calculate stats
      setStats({
        total: allActivities.length,
        checkIns: allActivities.filter(a => a.type === 'check_in').length,
        checkOuts: allActivities.filter(a => a.type === 'check_out').length,
        incidents: allActivities.filter(a => a.type === 'incident').length,
        walkIns: allActivities.filter(a => a.type === 'walk_in').length
      });

      setPagination(prev => ({ ...prev, total: allActivities.length }));

    } catch (error) {
      handleApiError(error, 'Activity Log');
      logger.error('Failed to fetch activity log:', error);
    } finally {
      setLoading('activityLog', false);
    }
  }, [user, handleApiError, setLoading]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Apply filters
  useEffect(() => {
    let filtered = [...activities];

    if (filters.type !== 'all') {
      filtered = filtered.filter(a => a.type === filters.type);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(a => new Date(a.timestamp) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59);
      filtered = filtered.filter(a => new Date(a.timestamp) <= toDate);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(a =>
        a.description.toLowerCase().includes(searchLower) ||
        (a.details?.visitorName?.toLowerCase().includes(searchLower))
      );
    }

    setFilteredActivities(filtered);
    setPagination(prev => ({ ...prev, total: filtered.length, page: 1 }));
  }, [activities, filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Export activity log
  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Type', 'Description', 'Details'].join(','),
      ...filteredActivities.map(a => [
        new Date(a.timestamp).toISOString(),
        ACTIVITY_TYPES[a.type]?.label || a.type,
        `"${a.description}"`,
        `"${JSON.stringify(a.details || {})}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Paginate activities
  const paginatedActivities = filteredActivities.slice(
    (pagination.page - 1) * pagination.pageSize,
    pagination.page * pagination.pageSize
  );

  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title="Activity Log"
        description="View your shift activities and history"
        backTo="/dashboard/guard"
      />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Activities</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.checkIns}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Check-Ins</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.checkOuts}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Check-Outs</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.walkIns}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Walk-Ins</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.incidents}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Incidents</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search activities..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FilterIcon />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <DownloadIcon className="mr-2" />
              Export
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Activity Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Types</option>
                  {Object.entries(ACTIVITY_TYPES).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({ type: 'all', dateFrom: '', dateTo: '', search: '' })}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Activity List */}
        <Card className="divide-y divide-gray-200 dark:divide-gray-700">
          {isLoading('activityLog') ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Loading activities...</p>
            </div>
          ) : paginatedActivities.length === 0 ? (
            <div className="p-8 text-center">
              <ActivityIcon className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500 dark:text-gray-400">No activities found.</p>
            </div>
          ) : (
            paginatedActivities.map((activity) => {
              const config = ACTIVITY_TYPES[activity.type] || { icon: ActivityIcon, label: activity.type, color: 'gray' };
              const IconComponent = config.icon;

              return (
                <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-${config.color}-100 dark:bg-${config.color}-900/20 flex items-center justify-center`}>
                      <IconComponent />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.description}
                        </p>
                        <Badge variant={config.color} size="sm">
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {formatTime(activity.timestamp)}
                      </p>
                      {activity.details && Object.keys(activity.details).length > 0 && (
                        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                          {activity.details.visitorName && (
                            <span className="mr-3">Visitor: {activity.details.visitorName}</span>
                          )}
                          {activity.details.hostUnit && (
                            <span className="mr-3">Unit: {activity.details.hostUnit}</span>
                          )}
                          {activity.details.purpose && (
                            <span>Purpose: {activity.details.purpose}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
