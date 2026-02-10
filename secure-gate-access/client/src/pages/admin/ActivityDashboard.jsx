import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Icon } from '../../components/ui';
import Button from '../../components/ui/Button';
import axios from 'axios';
import './ActivityDashboard.css';


const ActivityDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [period, setPeriod] = useState('7d');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchAllData, 60000);
    return () => clearInterval(interval);
  }, [period]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [summaryRes, trendsRes, anomaliesRes, feedRes] = await Promise.all([
        axios.get('/api/admin/activity/summary', { withCredentials: true }),
        axios.get(`/api/admin/activity/trends?period=${period}`, { withCredentials: true }),
        axios.get('/api/admin/activity/anomalies', { withCredentials: true }),
        axios.get('/api/admin/activity/feed?limit=20', { withCredentials: true })
      ]);

      setSummary(summaryRes.data.data);
      setTrends(trendsRes.data.data);
      setAnomalies(anomaliesRes.data.data.anomalies);
      setActivityFeed(feedRes.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching activity data:', err);
      setError(err.response?.data?.message || 'Failed to load activity data');
    } finally {
      setLoading(false);
    }
  };

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
      <div className="activity-dashboard">
        <Card>
          <CardContent>
            <div className="text-center py-8 text-red-500">
              <Icon name="AlertTriangle" className="h-12 w-12 mx-auto mb-3" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="activity-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Icon name="Activity" className="h-6 w-6" />
          Activity Dashboard
        </h1>
        <div className="flex gap-2">
          <label htmlFor="activity-period" className="sr-only">
            Filter activity period
          </label>
          <select
            id="activity-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchAllData}
            disabled={loading}
          >
            <Icon name="RefreshCw" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="summary-grid">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last 24 Hours</p>
                  <p className="text-3xl font-bold">{summary.last24h}</p>
                </div>
                <Icon name="Clock" className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last 7 Days</p>
                  <p className="text-3xl font-bold">{summary.last7d}</p>
                </div>
                <Icon name="TrendingUp" className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approvals</p>
                  <p className="text-3xl font-bold">{summary.pendingApprovals}</p>
                </div>
                <Icon name="Users" className="h-10 w-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Visitors Today</p>
                  <p className="text-3xl font-bold">{summary.visitorsToday}</p>
                </div>
                <Icon name="CheckCircle" className="h-10 w-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Anomalies Alert */}
      {anomalies.length > 0 && (
        <Card className="anomalies-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="AlertTriangle" className="h-5 w-5 text-orange-500" />
              Detected Anomalies
              <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                {anomalies.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {anomalies.map((anomaly, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg flex items-start gap-3 ${getSeverityColor(anomaly.severity)}`}
                >
                  <Icon name="AlertTriangle" className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium capitalize">
                      {anomaly.type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm mt-1">{anomaly.message}</p>
                    <p className="text-xs mt-1 opacity-75">
                      {formatTimestamp(anomaly.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Activity Feed */}
        <Card className="activity-feed-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="activity-feed">
              {activityFeed.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No recent activity</p>
              ) : (
                activityFeed.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon">
                      {getOutcomeIcon(activity.outcome)}
                    </div>
                    <div className="activity-content">
                      <p className="activity-message">
                        <span className="font-medium">{activity.username || 'System'}</span>
                        {' '}{activity.message || activity.action}
                      </p>
                      <div className="activity-meta">
                        <span className="activity-resource">{activity.resource}</span>
                        <span className="activity-time">{formatTimestamp(activity.timestamp)}</span>
                        {activity.ip_address && (
                          <span className="activity-ip">{activity.ip_address}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trends Chart */}
        {trends && (
          <Card className="trends-card">
            <CardHeader>
              <CardTitle>Activity Trends ({period})</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Action Breakdown */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Top Actions</h3>
                <div className="space-y-2">
                  {trends.actionBreakdown.slice(0, 5).map((action, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{action.action}</span>
                          <span className="font-medium">{action.count}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{
                              width: `${(action.count / trends.actionBreakdown[0].count) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most Active Users */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Most Active Users</h3>
                <div className="space-y-2">
                  {trends.activeUsers.slice(0, 5).map((user, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.username}</span>
                        <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-slate-700 rounded">
                          {user.role}
                        </span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400">{user.activity_count} actions</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ActivityDashboard;
