/**
 * @file GuardAnalytics.jsx
 * @description Phase G5 - Guard operational analytics dashboard
 * Shows insights, trends, and statistics for guard operations
 */

import React, { useState, useEffect } from 'react';
import { Card, Button } from '../../components/ui';
import { TrendingUp, Clock, Users, AlertCircle, BarChart3 } from 'lucide-react';
import { useError } from '../../contexts/ErrorContext';
import { useLoading } from '../../contexts/LoadingContext';

const GuardAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const { handleApiError } = useError();
  const { setLoading, isLoading } = useLoading();

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading('analytics', true);
      const response = await fetch(
        `/api/guard/analytics?fromDate=${dateRange.from}&toDate=${dateRange.to}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const result = await response.json();
        // Backend returns { data: { data: { ...analysis... } } }
        setAnalytics(result.data?.data || null);
      }
    } catch (error) {
      handleApiError(error, 'Guard Analytics');
    } finally {
      setLoading('analytics', false);
    }
  };

  if (!analytics && isLoading('analytics')) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Guard Analytics</h1>
          <p className="text-gray-600 dark:text-gray-200 mt-1">Operational insights and trends</p>
        </div>
        <Button onClick={fetchAnalytics} disabled={isLoading('analytics')}>
          {isLoading('analytics') ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card>
        <Card.Header>
          <Card.Title>Date Range</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200"
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
                    <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
                    <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
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
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
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
                <BarChart3 className="w-5 h-5" />
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
              <div className="space-y-2">
                {analytics.visitsByHour.map(item => (
                  <div key={item.hour} className="flex items-center gap-4">
                    <div className="w-16 text-sm text-gray-600 dark:text-gray-200">{item.hour}:00</div>
                    <div className="flex-1">
                      <div
                        className="bg-blue-500 h-8 rounded flex items-center justify-end px-2 text-white text-sm font-medium"
                        style={{ width: `${(item.count / Math.max(...analytics.visitsByHour.map(v => v.count))) * 100}%` }}
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
