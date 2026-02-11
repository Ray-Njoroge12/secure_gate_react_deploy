import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Icon } from '../../components/ui';
import Button from '../../components/ui/Button';
import {
  getActivitySummary,
  getActivityTrends,
  getActivityAnomalies,
  getActivityFeed
} from '../../services/adminService';
import './ActivityDashboard.css';

const ActivityDashboard = ({ estateId }) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [period, setPeriod] = useState('7d');
  const [error, setError] = useState(null);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { period };
      if (estateId) {
        params.siteId = estateId;
        params.estate_id = estateId; // Send both just in case backend expects one or other
      }

      const [summaryRes, trendsRes, anomaliesRes, feedRes] = await Promise.all([
        getActivitySummary(params),
        getActivityTrends(params),
        getActivityAnomalies(params),
        getActivityFeed({ ...params, limit: 20 })
      ]);

      setSummary(summaryRes?.data || summaryRes); // Handle potential response wrapper variations
      setTrends(trendsRes?.data || trendsRes);
      setAnomalies((anomaliesRes?.data?.anomalies || anomaliesRes?.anomalies) || []);
      setActivityFeed(feedRes?.data || feedRes || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching activity data:', err);
      // Don't show error if we have partial data or if it's just a 404 on a specific endpoint
      if (!summary && !trends) {
        setError(err.message || 'Failed to load activity data');
      }
    } finally {
      setLoading(false);
    }
  }, [period, estateId]);

  useEffect(() => {
    fetchAllData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchAllData, 60000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30';
      case 'medium': return 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30';
      case 'low': return 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30';
      default: return 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700';
    }
  };

  const getOutcomeIcon = (outcome) => {
    switch (outcome) {
      case 'success': return <Icon name="CheckCircle" className="h-4 w-4 text-green-500" />;
      case 'fail': return <Icon name="XCircle" className="h-4 w-4 text-red-500" />;
      case 'warning': return <Icon name="AlertTriangle" className="h-4 w-4 text-yellow-500" />;
      default: return <Icon name="Activity" className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading && !summary) {
    return (
      <div className="activity-dashboard">
        <div className="text-center py-8">
          <Icon name="RefreshCw" className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading activity data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="activity-dashboard p-6">
        <Card>
          <CardContent>
            <div className="text-center py-8 text-red-500">
              <Icon name="AlertTriangle" className="h-12 w-12 mx-auto mb-3" />
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchAllData}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="activity-dashboard space-y-6">
      {/* Header */}
      <div className="dashboard-header flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Icon name="Activity" className="h-5 w-5" />
          System Activity
        </h2>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAllData}
            disabled={loading}
          >
            <Icon name="RefreshCw" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Last 24 Hours</p>
                <p className="text-2xl font-bold">{summary.last24h}</p>
              </div>
              <Icon name="Clock" className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Last 7 Days</p>
                <p className="text-2xl font-bold">{summary.last7d}</p>
              </div>
              <Icon name="TrendingUp" className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold">{summary.pendingApprovals}</p>
              </div>
              <Icon name="Users" className="h-8 w-8 text-orange-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Visitors Today</p>
                <p className="text-2xl font-bold">{summary.visitorsToday}</p>
              </div>
              <Icon name="CheckCircle" className="h-8 w-8 text-purple-500 opacity-20" />
            </div>
          </Card>
        </div>
      )}

      {/* Anomalies Alert */}
      {anomalies && anomalies.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-center gap-2 font-medium text-orange-800 dark:text-orange-200 mb-2">
            <Icon name="AlertTriangle" className="h-5 w-5" />
            Detected Anomalies ({anomalies.length})
          </div>
          <div className="space-y-2">
            {anomalies.map((anomaly, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg flex items-start gap-3 bg-white dark:bg-slate-800/50`}
              >
                <Icon name="AlertTriangle" className="h-4 w-4 flex-shrink-0 mt-0.5 text-orange-500" />
                <div className="flex-1 text-sm">
                  <p className="font-medium capitalize">
                    {anomaly.type?.replace(/_/g, ' ')}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">{anomaly.message}</p>
                  <p className="text-xs mt-1 opacity-75">
                    {formatTimestamp(anomaly.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {activityFeed.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">No recent activity</p>
                ) : (
                  activityFeed.map((activity) => (
                    <div key={activity.id} className="flex gap-4 pb-4 border-b border-gray-100 dark:border-slate-700 last:border-0">
                      <div className="mt-1">
                        {getOutcomeIcon(activity.outcome)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {activity.username || 'System'}
                          <span className="font-normal text-gray-500 dark:text-gray-400 ml-1">
                            {activity.message || activity.action}
                          </span>
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span className="bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{activity.resource}</span>
                          <span>•</span>
                          <span>{formatTimestamp(activity.timestamp)}</span>
                          {activity.ip_address && (
                            <>
                              <span>•</span>
                              <span>{activity.ip_address}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trends Chart */}
        {trends && (
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Activity Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Action Breakdown */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Top Actions</h3>
                  <div className="space-y-3">
                    {trends.actionBreakdown?.slice(0, 5).map((action, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{action.action}</span>
                          <span className="font-medium">{action.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{
                              width: `${(action.count / (trends.actionBreakdown[0]?.count || 1)) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Most Active Users */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Most Active Users</h3>
                  <div className="space-y-3">
                    {trends.activeUsers?.slice(0, 5).map((user, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">
                            {user.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="font-medium truncate max-w-[100px]">{user.username}</span>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">{user.activity_count} actions</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityDashboard;
