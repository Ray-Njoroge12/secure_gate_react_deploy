/**
 * Analytics Dashboard Component
 * Comprehensive analytics covering user adoption, feature usage, and system performance
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { 
  Users, Activity, TrendingUp, Clock, Star, AlertTriangle,
  BarChart3, PieChart, LineChart, Target, CheckCircle, XCircle
} from 'lucide-react';
import { 
  LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts';
import { analyticsService } from '../../services/analyticsService';
import { userFeedbackService } from '../../services/userFeedbackService';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [feedbackAnalytics, setFeedbackAnalytics] = useState(null);
  const [launchReadiness, setLaunchReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const timeRanges = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' }
  ];

  const colors = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    purple: '#8b5cf6'
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedTimeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const dateFrom = getDateFromRange(selectedTimeRange);
      const filters = { dateFrom };

      const [analytics, feedback, readiness] = await Promise.all([
        analyticsService.getAnalyticsDashboard(filters),
        userFeedbackService.getFeedbackAnalytics(filters),
        analyticsService.getLaunchReadinessIndicators()
      ]);

      setAnalyticsData(analytics);
      setFeedbackAnalytics(feedback);
      setLaunchReadiness(readiness);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDateFromRange = (range) => {
    const now = new Date();
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return colors.success;
      case 'warning': return colors.warning;
      case 'not_ready': return colors.danger;
      default: return colors.info;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'not_ready': return XCircle;
      default: return Clock;
    }
  };

  const MetricCard = ({ title, value, change, icon: Icon, color = colors.primary }) => (
    <Card className="metric-card">
      <CardContent className="metric-content">
        <div className="metric-header">
          <div className="metric-icon" style={{ backgroundColor: `${color}20` }} aria-hidden="true">
            <Icon className="icon" style={{ color }} aria-hidden="true" />
          </div>
          <div className="metric-info">
            <h3 className="metric-title">{title}</h3>
            <div className="metric-value">{value}</div>
            {change && (
              <div className={`metric-change ${change >= 0 ? 'positive' : 'negative'}`}>
                <TrendingUp className="change-icon" aria-hidden="true" />
                {Math.abs(change)}% vs last period
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const LaunchReadinessCard = ({ title, indicator }) => {
    const StatusIcon = getStatusIcon(indicator.status);
    const statusColor = getStatusColor(indicator.status);

    return (
      <Card className="readiness-card">
        <CardContent className="readiness-content">
          <div className="readiness-header">
            <h4 className="readiness-title">{title}</h4>
            <div className="readiness-status">
              <StatusIcon className="status-icon" style={{ color: statusColor }} />
              <Badge 
                variant={indicator.status === 'ready' ? 'success' : indicator.status === 'warning' ? 'warning' : 'destructive'}
              >
                {indicator.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
          <div className="readiness-score">
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ 
                  width: `${indicator.score}%`,
                  backgroundColor: statusColor
                }}
              />
            </div>
            <span className="score-text">{indicator.score}%</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner" />
        <p>Loading analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-error">
        <AlertTriangle className="error-icon" />
        <h3>Failed to load analytics</h3>
        <p>{error}</p>
        <Button onClick={loadAnalyticsData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">Analytics Dashboard</h1>
          <div className="header-controls">
            <div className="time-range-selector">
              {timeRanges.map((range) => (
                <button
                  key={range.value}
                  className={`time-range-button ${selectedTimeRange === range.value ? 'active' : ''}`}
                  onClick={() => setSelectedTimeRange(range.value)}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <Button onClick={loadAnalyticsData} variant="outline">
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="analytics-tabs">
        <TabsList className="tabs-list">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
          <TabsTrigger value="features">Feature Usage</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="readiness">Launch Readiness</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="tab-content">
          <div className="metrics-grid">
            <MetricCard
              title="Total Users"
              value={formatNumber(analyticsData?.userAdoption?.totalUsers || 0)}
              change={12}
              icon={Users}
              color={colors.primary}
            />
            <MetricCard
              title="Active Users"
              value={formatNumber(analyticsData?.userAdoption?.activeUsers || 0)}
              change={8}
              icon={Activity}
              color={colors.success}
            />
            <MetricCard
              title="Top Feature"
              value={analyticsData?.featureUsage?.topFeatures?.[0]?.name || 'N/A'}
              icon={Target}
              color={colors.purple}
            />
            <MetricCard
              title="Avg Rating"
              value={feedbackAnalytics?.overview?.avg_rating ? 
                `${parseFloat(feedbackAnalytics.overview.avg_rating).toFixed(1)}/5` : 'N/A'}
              icon={Star}
              color={colors.warning}
            />
          </div>

          {/* Charts */}
          <div className="charts-grid">
            <Card className="chart-card">
              <CardHeader>
                <h3>User Growth Trend</h3>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData?.userAdoption?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stroke={colors.primary} 
                      fill={`${colors.primary}20`} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="chart-card">
              <CardHeader>
                <h3>Feature Usage Distribution</h3>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={analyticsData?.featureUsage?.topFeatures?.slice(0, 6) || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="usageCount"
                      nameKey="name"
                    >
                      {analyticsData?.featureUsage?.topFeatures?.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={Object.values(colors)[index % Object.values(colors).length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Launch Readiness Tab */}
        <TabsContent value="readiness" className="tab-content">
          <div className="readiness-overview">
            <Card className="overall-readiness">
              <CardHeader>
                <h2>Overall Launch Readiness</h2>
              </CardHeader>
              <CardContent>
                <div className="overall-score">
                  <div className="score-circle">
                    <div className="score-number">{launchReadiness?.overall?.score || 0}%</div>
                    <div className="score-label">Ready</div>
                  </div>
                  <div className="readiness-status">
                    <Badge 
                      variant={launchReadiness?.overall?.readyForLaunch ? 'success' : 'warning'}
                      className="status-badge"
                    >
                      {launchReadiness?.overall?.readyForLaunch ? 'Ready for Launch' : 'Not Ready'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="readiness-indicators">
            <LaunchReadinessCard 
              title="User Adoption" 
              indicator={launchReadiness?.userAdoption || {}} 
            />
            <LaunchReadinessCard 
              title="System Performance" 
              indicator={launchReadiness?.systemPerformance || {}} 
            />
            <LaunchReadinessCard 
              title="Feature Usage" 
              indicator={launchReadiness?.featureUsage || {}} 
            />
          </div>
        </TabsContent>

        {/* Other tabs would be implemented similarly */}
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;