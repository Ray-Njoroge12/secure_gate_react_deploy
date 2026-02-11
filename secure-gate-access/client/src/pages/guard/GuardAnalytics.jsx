/**
 * @file GuardAnalytics.jsx
 * @description Phase G5 - Guard operational analytics dashboard
 * Shows insights, trends, and statistics for guard operations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Icon, Skeleton } from '../../components/ui';
import { useError } from '../../contexts/ErrorContext';
import { useLoading } from '../../contexts/LoadingContext';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import usePullToRefresh from '../../hooks/usePullToRefresh';
import OfflineBanner from '../../components/common/OfflineBanner';

const GuardAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const { handleApiError } = useError();
  const { setLoading, isLoading } = useLoading();
  const { isOnline, wasOffline } = useOnlineStatus();

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading('analytics', true);
      setFetchError(null);
      const response = await fetch(
        `/api/guard/analytics?fromDate=${dateRange.from}&toDate=${dateRange.to}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const result = await response.json();
        setAnalytics(result.data?.data || null);
      } else {
        throw new Error('Failed to fetch analytics');
      }
    } catch (error) {
      setFetchError(error.message || 'Failed to load analytics. Please try again.');
      handleApiError(error, 'Guard Analytics');
    } finally {
      setLoading('analytics', false);
    }
  }, [dateRange.from, dateRange.to, handleApiError, setLoading]);

  const { PullToRefreshIndicator } = usePullToRefresh(fetchAnalytics);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (!analytics && isLoading('analytics')) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>

        {/* Date Range Skeleton */}
        <Skeleton.Card>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
        </Skeleton.Card>

        {/* Key Metrics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton.Card>
            <Skeleton className="h-12 w-24 mb-2" />
            <Skeleton className="h-5 w-32" />
          </Skeleton.Card>
          <Skeleton.Card>
            <Skeleton className="h-12 w-24 mb-2" />
            <Skeleton className="h-5 w-32" />
          </Skeleton.Card>
          <Skeleton.Card>
            <Skeleton className="h-12 w-24 mb-2" />
            <Skeleton className="h-5 w-32" />
          </Skeleton.Card>
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton.Card>
            <Skeleton className="h-64 w-full" />
          </Skeleton.Card>
          <Skeleton.Card>
            <Skeleton className="h-64 w-full" />
          </Skeleton.Card>
        </div>
      </div>
    );
  }

  // Error state with retry
  if (fetchError && !isLoading('analytics')) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">Guard Analytics</h1>
            <p className="text-gray-600 dark:text-gray-200 mt-1">Operational insights and trends</p>
          </div>
        </div>
        <Card>
          <div className="text-center py-10" role="alert">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <Icon name="AlertCircle" className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to Load Analytics</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{fetchError}</p>
            <Button onClick={fetchAnalytics} variant="primary" size="sm">
              <Icon name="RefreshCw" className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <PullToRefreshIndicator />
      <OfflineBanner 
        isOnline={isOnline} 
        wasOffline={wasOffline} 
        onRetry={fetchAnalytics}
        message="You are offline. Analytics data may be stale."
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">Guard Analytics</h1>
          <p className="text-gray-600 dark:text-gray-200 mt-1">Operational insights and trends</p>
        </div>
        <Button onClick={fetchAnalytics} disabled={isLoading('analytics')} className="w-full sm:w-auto">
          {isLoading('analytics') ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card>
        <Card.Header>
          <Card.Title>Date Range</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="analytics-date-from" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
              <input
                id="analytics-date-from"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="mobile-input"
              />
            </div>
            <div>
              <label htmlFor="analytics-date-to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
              <input
                id="analytics-date-to"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="mobile-input"
              />
            </div>
          </div>
        </Card.Content>
      </Card>

      {analytics && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Icon name="Clock" className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {analytics.approvalStats.avgApprovalTimeMinutes}m
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-200">Avg Approval Time</div>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Icon name="Users" className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {analytics.approvalStats.totalApproved}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-200">Total Approvals</div>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Icon name="AlertCircle" className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {analytics.incidentsByCategory.reduce((sum, cat) => sum + cat.count, 0)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-200">Total Incidents</div>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Visitor Types */}
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <Icon name="BarChart3" className="w-5 h-5" />
                Visitor Types
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                    {analytics.visitorTypes.walkIns}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-400">Walk-Ins</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                    {analytics.visitorTypes.preRegistered}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-400">Pre-Registered</div>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Visits by Hour */}
          <Card>
            <Card.Header>
              <Card.Title>Visits by Hour of Day</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="space-y-2 overflow-x-auto">
                {analytics.visitsByHour.map(item => (
                  <div key={item.hour} className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <div className="w-12 sm:w-16 text-xs sm:text-sm text-gray-600 dark:text-gray-200 flex-shrink-0">{item.hour}:00</div>
                    <div className="flex-1">
                      <div
                        className="bg-blue-500 h-8 rounded flex items-center justify-end px-2 text-white text-sm font-medium"
                        style={{ width: `${Math.max(0, Math.min(100, (item.count / Math.max(1, ...analytics.visitsByHour.map(v => v.count))) * 100))}%` }}
                      >
                        {item.count}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>

          {/* Incidents by Category */}
          {analytics.incidentsByCategory.length > 0 && (
            <Card>
              <Card.Header>
                <Card.Title>Incidents by Category</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  {analytics.incidentsByCategory.map(incident => (
                    <div key={`${incident.category}-${incident.severity}`} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white capitalize">
                          {incident.category.replace('_', ' ')}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-200 capitalize">{incident.severity} severity</div>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{incident.count}</div>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          )}

          {/* Top Residents */}
          {analytics.topResidents.length > 0 && (
            <Card>
              <Card.Header>
                <Card.Title>Top Residents by Approvals</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  {analytics.topResidents.map((resident, index) => (
                    <div key={resident.email} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{resident.name}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-200">{resident.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">{resident.approvals}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-200">approvals</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default GuardAnalytics;
