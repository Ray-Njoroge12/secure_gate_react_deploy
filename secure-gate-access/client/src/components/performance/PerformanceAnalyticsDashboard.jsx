/**
 * @fileoverview Performance Analytics Dashboard
 * @description Real-time performance monitoring dashboard for administrators
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import './PerformanceAnalyticsDashboard.css';

/**
 * Performance Analytics Dashboard Component
 * Implements requirements 6.5, 6.6, 15.2, 15.3
 */
const PerformanceAnalyticsDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [alertFilter, setAlertFilter] = useState('all');
  const eventSourceRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  // Color schemes for charts
  const colors = {
    primary: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    success: '#22c55e',
    secondary: '#6b7280'
  };

  const alertColors = {
    critical: '#dc2626',
    warning: '#d97706',
    info: '#2563eb'
  };

  /**
   * Initialize dashboard and start real-time monitoring
   */
  useEffect(() => {
    initializeMonitoring();
    
    return () => {
      cleanup();
    };
  }, []);

  /**
   * Initialize performance monitoring
   */
  const initializeMonitoring = useCallback(() => {
    // Connect to Server-Sent Events for real-time updates
    connectToEventStream();
    
    // Initial data fetch
    fetchInitialData();
    
    // Setup auto-refresh if enabled
    if (autoRefresh) {
      setupAutoRefresh();
    }
  }, [autoRefresh]);

  /**
   * Connect to real-time event stream
   */
  const connectToEventStream = () => {
    try {
      eventSourceRef.current = new EventSource('/api/admin/performance/stream');
      
      eventSourceRef.current.onopen = () => {
        setIsConnected(true);
        console.log('[PERFORMANCE] Connected to real-time stream');
      };
      
      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealtimeUpdate(data);
        } catch (error) {
          console.error('[PERFORMANCE] Error parsing event data:', error);
        }
      };
      
      eventSourceRef.current.onerror = (error) => {
        console.error('[PERFORMANCE] EventSource error:', error);
        setIsConnected(false);
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            connectToEventStream();
          }
        }, 5000);
      };
      
    } catch (error) {
      console.error('[PERFORMANCE] Failed to connect to event stream:', error);
      setIsConnected(false);
    }
  };

  /**
   * Handle real-time updates from server
   */
  const handleRealtimeUpdate = (data) => {
    if (data.type === 'metrics-update') {
      setMetrics(prevMetrics => ({
        ...prevMetrics,
        realTime: data.payload,
        lastUpdate: Date.now()
      }));
    } else if (data.type === 'alert-triggered') {
      setAlerts(prevAlerts => [data.payload, ...prevAlerts.slice(0, 49)]);
    } else if (data.type === 'alert-resolved') {
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === data.payload.id 
            ? { ...alert, resolved: true, resolvedAt: data.payload.resolvedAt }
            : alert
        )
      );
    }
  };

  /**
   * Fetch initial performance data
   */
  const fetchInitialData = async () => {
    try {
      const response = await fetch('/api/admin/performance/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.data);
        setAlerts(data.data.alerts || []);
      }
    } catch (error) {
      console.error('[PERFORMANCE] Error fetching initial data:', error);
    }
  };

  /**
   * Setup auto-refresh interval
   */
  const setupAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    refreshIntervalRef.current = setInterval(() => {
      if (!isConnected) {
        fetchInitialData();
      }
    }, 30000); // Refresh every 30 seconds if not connected to real-time stream
  };

  /**
   * Cleanup resources
   */
  const cleanup = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
  };

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  /**
   * Format duration in milliseconds
   */
  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  /**
   * Format bytes to human readable
   */
  const formatBytes = (bytes) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  /**
   * Get alert severity color
   */
  const getAlertColor = (severity) => {
    return alertColors[severity] || alertColors.info;
  };

  /**
   * Filter alerts based on selected filter
   */
  const filteredAlerts = alerts.filter(alert => {
    if (alertFilter === 'all') return true;
    if (alertFilter === 'active') return !alert.resolved;
    return alert.severity === alertFilter;
  });

  /**
   * Prepare chart data for trends
   */
  const prepareChartData = (trendData, timeRange) => {
    if (!trendData || trendData.length === 0) return [];
    
    const now = Date.now();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    
    const cutoff = now - timeRanges[timeRange];
    
    return trendData
      .filter(point => point.timestamp > cutoff)
      .map(point => ({
        ...point,
        time: formatTimestamp(point.timestamp)
      }));
  };

  if (!metrics) {
    return (
      <div className="performance-dashboard loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading performance metrics...</p>
        </div>
      </div>
    );
  }

  const { realTime, trends, thresholds, autoScaling } = metrics;

  return (
    <div className="performance-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Performance Analytics Dashboard</h1>
          <div className="header-controls">
            <div className="connection-status">
              <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? '● Live' : '○ Offline'}
              </span>
            </div>
            
            <select 
              value={selectedTimeRange} 
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="time-range-selector"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
            
            <button 
              className={`auto-refresh-toggle ${autoRefresh ? 'active' : ''}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              Auto Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-cards">
        <div className="metric-card">
          <div className="metric-header">
            <h3>Response Time</h3>
            <span className={`metric-status ${realTime.responseTime.current > thresholds.responseTime.warning ? 'warning' : 'good'}`}>
              {realTime.responseTime.current > thresholds.responseTime.critical ? 'Critical' : 
               realTime.responseTime.current > thresholds.responseTime.warning ? 'Warning' : 'Good'}
            </span>
          </div>
          <div className="metric-value">
            {formatDuration(realTime.responseTime.current)}
          </div>
          <div className="metric-details">
            <div>P95: {formatDuration(realTime.responseTime.p95)}</div>
            <div>P99: {formatDuration(realTime.responseTime.p99)}</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <h3>Throughput</h3>
            <span className="metric-status good">Active</span>
          </div>
          <div className="metric-value">
            {realTime.throughput.requestsPerSecond} req/s
          </div>
          <div className="metric-details">
            <div>Per minute: {realTime.throughput.requestsPerMinute}</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <h3>Error Rate</h3>
            <span className={`metric-status ${realTime.errorRate > thresholds.errorRate.warning ? 'warning' : 'good'}`}>
              {realTime.errorRate > thresholds.errorRate.critical ? 'Critical' : 
               realTime.errorRate > thresholds.errorRate.warning ? 'Warning' : 'Good'}
            </span>
          </div>
          <div className="metric-value">
            {(realTime.errorRate * 100).toFixed(2)}%
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <h3>CPU Usage</h3>
            <span className={`metric-status ${realTime.system.cpuUsage > thresholds.cpuUsage.warning ? 'warning' : 'good'}`}>
              {realTime.system.cpuUsage > thresholds.cpuUsage.critical ? 'Critical' : 
               realTime.system.cpuUsage > thresholds.cpuUsage.warning ? 'Warning' : 'Good'}
            </span>
          </div>
          <div className="metric-value">
            {realTime.system.cpuUsage.toFixed(1)}%
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <h3>Memory Usage</h3>
            <span className={`metric-status ${realTime.system.memoryUsage.percentage > thresholds.memoryUsage.warning ? 'warning' : 'good'}`}>
              {realTime.system.memoryUsage.percentage > thresholds.memoryUsage.critical ? 'Critical' : 
               realTime.system.memoryUsage.percentage > thresholds.memoryUsage.warning ? 'Warning' : 'Good'}
            </span>
          </div>
          <div className="metric-value">
            {realTime.system.memoryUsage.percentage.toFixed(1)}%
          </div>
          <div className="metric-details">
            <div>{formatBytes(realTime.system.memoryUsage.rss)}</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-container">
          <h3>Response Time Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={prepareChartData(trends.responseTime, selectedTimeRange)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip formatter={(value) => [formatDuration(value), 'Response Time']} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={colors.primary} 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Throughput Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={prepareChartData(trends.throughput, selectedTimeRange)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} req/s`, 'Throughput']} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={colors.info} 
                fill={colors.info}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>System Resources</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                data={prepareChartData(trends.cpuUsage, selectedTimeRange)}
                type="monotone" 
                dataKey="value" 
                stroke={colors.warning} 
                name="CPU Usage (%)"
                strokeWidth={2}
                dot={false}
              />
              <Line 
                data={prepareChartData(trends.memoryUsage, selectedTimeRange)}
                type="monotone" 
                dataKey="value" 
                stroke={colors.danger} 
                name="Memory Usage (%)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Error Rate Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={prepareChartData(trends.errorRate, selectedTimeRange)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip formatter={(value) => [`${(value * 100).toFixed(2)}%`, 'Error Rate']} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={colors.danger} 
                fill={colors.danger}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Auto Scaling Status */}
      {autoScaling.enabled && (
        <div className="auto-scaling-section">
          <h3>Auto Scaling Status</h3>
          <div className="scaling-info">
            <div className="scaling-metric">
              <label>Current Instances:</label>
              <span>{autoScaling.currentInstances}</span>
            </div>
            <div className="scaling-metric">
              <label>Min Instances:</label>
              <span>{autoScaling.minInstances}</span>
            </div>
            <div className="scaling-metric">
              <label>Max Instances:</label>
              <span>{autoScaling.maxInstances}</span>
            </div>
            <div className="scaling-metric">
              <label>Scale Up Threshold:</label>
              <span>{autoScaling.scaleUpThreshold}%</span>
            </div>
            <div className="scaling-metric">
              <label>Scale Down Threshold:</label>
              <span>{autoScaling.scaleDownThreshold}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Section */}
      <div className="alerts-section">
        <div className="alerts-header">
          <h3>Performance Alerts</h3>
          <div className="alert-filters">
            <select 
              value={alertFilter} 
              onChange={(e) => setAlertFilter(e.target.value)}
            >
              <option value="all">All Alerts</option>
              <option value="active">Active Only</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
            </select>
          </div>
        </div>
        
        <div className="alerts-list">
          {filteredAlerts.length === 0 ? (
            <div className="no-alerts">
              <p>No alerts match the current filter.</p>
            </div>
          ) : (
            filteredAlerts.map(alert => (
              <div 
                key={alert.id} 
                className={`alert-item ${alert.severity} ${alert.resolved ? 'resolved' : 'active'}`}
              >
                <div className="alert-content">
                  <div className="alert-header">
                    <span 
                      className="alert-severity" 
                      style={{ backgroundColor: getAlertColor(alert.severity) }}
                    >
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="alert-timestamp">
                      {formatTimestamp(alert.timestamp)}
                    </span>
                  </div>
                  <div className="alert-message">{alert.message}</div>
                  {alert.currentValue && alert.threshold && (
                    <div className="alert-details">
                      Current: {alert.currentValue} | Threshold: {alert.threshold}
                    </div>
                  )}
                  {alert.resolved && (
                    <div className="alert-resolved">
                      Resolved at {formatTimestamp(alert.resolvedAt)}
                    </div>
                  )}
                </div>
                {!alert.resolved && !alert.acknowledged && (
                  <button 
                    className="acknowledge-btn"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalyticsDashboard;