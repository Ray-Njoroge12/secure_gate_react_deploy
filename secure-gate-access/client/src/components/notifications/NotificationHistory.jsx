/**
 * @file NotificationHistory.jsx
 * @description Searchable notification history component with filtering and analytics
 * Features:
 * - Searchable notification logs
 * - Advanced filtering options
 * - Export capabilities
 * - Analytics dashboard
 */

import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, subDays, startOfDay, endOfDay } from 'date-fns';
import Icon from '../ui/Icon';
import api from '../../utils/apiClient';
import intelligentNotificationService from '../../services/intelligentNotificationService';
import logger from '../../utils/logger';
import Button from '../ui/Button';

const NotificationHistory = () => {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // View mode
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'analytics'

  useEffect(() => {
    loadNotificationHistory();
    loadAnalytics();
  }, [dateRange]);

  useEffect(() => {
    applyFilters();
  }, [notifications, searchTerm, typeFilter, statusFilter, channelFilter]);

  /**
   * Load notification history from API
   */
  const loadNotificationHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/api/intelligent-notifications/history', {
          startDate: dateRange.start,
          endDate: dateRange.end,
          limit: 1000 // Load more for client-side filtering
        });
      
      const data = response.data;
      
      if (data.success) {
        setNotifications(data.data.notifications || []);
      } else {
        throw new Error(data.error || 'Failed to load notifications');
      }
    } catch (err) {
      logger.error('Failed to load notification history', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load analytics data
   */
  const loadAnalytics = async () => {
    try {
      const days = Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24));
      const analyticsData = await intelligentNotificationService.getAnalytics(days);
      setAnalytics(analyticsData);
    } catch (err) {
      logger.error('Failed to load analytics', err);
    }
  };

  /**
   * Apply filters to notifications
   */
  const applyFilters = () => {
    let filtered = [...notifications];
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(notification => 
        notification.title?.toLowerCase().includes(term) ||
        notification.message?.toLowerCase().includes(term) ||
        notification.type?.toLowerCase().includes(term)
      );
    }
    
    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(notification => notification.type === typeFilter);
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(notification => notification.status === statusFilter);
    }
    
    // Channel filter
    if (channelFilter !== 'all') {
      filtered = filtered.filter(notification => 
        notification.channels?.includes(channelFilter)
      );
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    setFilteredNotifications(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  /**
   * Export notifications to CSV
   */
  const exportToCSV = () => {
    try {
      const headers = [
        'Date',
        'Type',
        'Title',
        'Message',
        'Status',
        'Channels',
        'Priority',
        'Read At'
      ];
      
      const csvData = filteredNotifications.map(notification => [
        format(parseISO(notification.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        notification.type,
        notification.title,
        notification.message,
        notification.status,
        notification.channels?.join(', ') || '',
        notification.priority || 'normal',
        notification.readAt ? format(parseISO(notification.readAt), 'yyyy-MM-dd HH:mm:ss') : ''
      ]);
      
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `notification-history-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      logger.info('Notification history exported to CSV', {
        count: filteredNotifications.length
      });
    } catch (err) {
      logger.error('Failed to export notifications', err);
      setError('Failed to export notifications');
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <Icon name="CheckCircle" className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <Icon name="XCircle" className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Icon name="Clock" className="h-5 w-5 text-yellow-500" />;
      default:
        return <Icon name="AlertTriangle" className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
    }
  };

  /**
   * Get priority badge color
   */
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 5: // EMERGENCY
        return 'bg-red-100 text-red-800';
      case 4: // CRITICAL
        return 'bg-orange-100 text-orange-800';
      case 3: // HIGH
        return 'bg-yellow-100 text-yellow-800';
      case 2: // NORMAL
        return 'bg-blue-100 text-blue-800';
      case 1: // LOW
        return 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200';
    }
  };

  /**
   * Get priority label
   */
  const getPriorityLabel = (priority) => {
    const labels = {
      5: 'Emergency',
      4: 'Critical',
      3: 'High',
      2: 'Normal',
      1: 'Low'
    };
    return labels[priority] || 'Normal';
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotifications = filteredNotifications.slice(startIndex, endIndex);

  // Get unique values for filters
  const notificationTypes = useMemo(() => {
    const types = [...new Set(notifications.map(n => n.type))];
    return types.sort();
  }, [notifications]);

  const channels = useMemo(() => {
    const allChannels = notifications.flatMap(n => n.channels || []);
    return [...new Set(allChannels)].sort();
  }, [notifications]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-300">Loading notification history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notification History</h2>
          <p className="text-gray-600 dark:text-gray-300">
            View and analyze your notification history and delivery patterns
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setViewMode(viewMode === 'list' ? 'analytics' : 'list')}
          >
            {viewMode === 'list' ? (
              <>
                <Icon name="BarChart3" className="h-4 w-4 mr-2" />
                Analytics
              </>
            ) : (
              <>
                <Icon name="Clock" className="h-4 w-4 mr-2" />
                History
              </>
            )}
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            onClick={exportToCSV}
            disabled={filteredNotifications.length === 0}
          >
            <Icon name="Download" className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <Icon name="XCircle" className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'analytics' ? (
        <NotificationAnalytics analytics={analytics} />
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search
                </label>
                <div className="relative">
                  <Icon name="Search" className="h-5 w-5 text-gray-400 dark:text-gray-300 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search notifications..."
                    className="pl-10 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="all">All Types</option>
                  {notificationTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            {/* Channel Filter */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Channel
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={channelFilter === 'all' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setChannelFilter('all')}
                  className="rounded-full"
                >
                  All Channels
                </Button>
                {channels.map(channel => (
                  <Button
                    key={channel}
                    variant={channelFilter === channel ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setChannelFilter(channel)}
                    className="rounded-full"
                  >
                    {channel}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredNotifications.length)} of {filteredNotifications.length} notifications
            </span>
            <span>
              Total: {notifications.length} notifications
            </span>
          </div>

          {/* Notification List */}
          <div className="bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-md">
            {currentNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="Clock" className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No notifications found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Try adjusting your filters or date range.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                {currentNotifications.map((notification) => (
                  <li key={notification.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        {getStatusIcon(notification.status)}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {notification.title}
                            </h4>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                              {getPriorityLabel(notification.priority)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{notification.type}</span>
                            <span>•</span>
                            <span>{format(parseISO(notification.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                            {notification.channels && (
                              <>
                                <span>•</span>
                                <span>{notification.channels.join(', ')}</span>
                              </>
                            )}
                            {notification.readAt && (
                              <>
                                <span>•</span>
                                <span className="text-green-600">
                                  Read {format(parseISO(notification.readAt), 'MMM dd, HH:mm')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              <div className="flex items-center space-x-2">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Notification Analytics Component
 */
const NotificationAnalytics = ({ analytics }) => {
  if (!analytics) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Icon name="Clock" className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Notifications</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {analytics.summary?.totalNotifications || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Icon name="CheckCircle" className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Delivery Rate</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {analytics.summary?.deliveryRate || 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Icon name="AlertTriangle" className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Failed</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {analytics.summary?.failedNotifications || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Icon name="BarChart3" className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg Engagement</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {analytics.engagement?.length > 0 
                  ? (analytics.engagement.reduce((sum, item) => sum + parseFloat(item.engagementRate), 0) / analytics.engagement.length).toFixed(1)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Engagement by Type */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Engagement by Notification Type</h3>
        <div className="space-y-4">
          {analytics.engagement?.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.notificationType}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {item.engagementRate}% engagement
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min(item.engagementRate, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>{item.deliveredCount} delivered</span>
                  <span>{item.clickedCount} clicked</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hourly Distribution */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Notification Activity by Hour</h3>
        <div className="grid grid-cols-12 gap-1">
          {analytics.hourlyDistribution?.map((item, index) => (
            <div key={index} className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.hour}</div>
              <div
                className="bg-blue-200 rounded"
                style={{
                  height: `${Math.max(item.notificationsSent / Math.max(...analytics.hourlyDistribution.map(h => h.notificationsSent)) * 60, 4)}px`
                }}
                title={`${item.notificationsSent} notifications, ${item.readRate}% read rate`}
              ></div>
              <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">{item.notificationsSent}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificationHistory;
