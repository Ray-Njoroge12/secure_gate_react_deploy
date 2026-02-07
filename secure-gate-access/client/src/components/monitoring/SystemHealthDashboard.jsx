/**
 * System Health Dashboard
 * Real-time monitoring dashboard for system health and performance metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { Alert, AlertDescription } from '../ui/Alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Server, Database, Wifi, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { systemHealthService } from '../../services/systemHealthService';
import './SystemHealthDashboard.css';

const SystemHealthDashboard = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [historicalData, setHistoricalData] = useState([]);

  // Fetch health data
  const fetchHealthData = useCallback(async () => {
    try {
      const response = await systemHealthService.getSystemHealth();
      setHealthData(response.data);
      
      // Add to historical data for charts
      setHistoricalData(prev => {
        const newData = [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          responseTime: response.data.responseTime,
          status: response.data.status === 'healthy' ? 100 : response.data.status === 'degraded' ? 50 : 0
        }];
        
        // Keep only last 20 data points
        return newData.slice(-20);
      });
      
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    fetchHealthData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchHealthData, autoRefresh, refreshInterval]);

  // Get status color and icon
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'healthy':
        return { color: 'green', icon: CheckCircle, text: 'Healthy' };
      case 'degraded':
        return { color: 'yellow', icon: AlertTriangle, text: 'Degraded' };
      case 'unhealthy':
        return { color: 'red', icon: XCircle, text: 'Unhealthy' };
      default:
        return { color: 'gray', icon: Clock, text: 'Unknown' };
    }
  };

  // Component status card
  const ComponentStatusCard = ({ component, data }) => {
    const statusDisplay = getStatusDisplay(data.status);
    const StatusIcon = statusDisplay.icon;

    return (
      <Card className="component-status-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium">{data.name}</h3>
          <StatusIcon className={`h-4 w-4 text-${statusDisplay.color}-500`} />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={statusDisplay.color === 'green' ? 'success' : statusDisplay.color === 'yellow' ? 'warning' : 'destructive'}
            >
              {statusDisplay.text}
            </Badge>
            {data.responseTime && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {data.responseTime}ms
              </span>
            )}
          </div>
          
          {data.details && (
            <div className="mt-2 space-y-1">
              {data.details.connectionPool && (
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  Pool: {data.details.connectionPool.total}/{data.details.connectionPool.max} 
                  ({data.details.connectionPool.utilization}%)
                </div>
              )}
              {data.details.memory && (
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  Memory: {data.details.memory.usage}%
                </div>
              )}
              {data.details.services && (
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  Services: {data.details.services.filter(s => s.status === 'healthy').length}/{data.details.services.length} healthy
                </div>
              )}
            </div>
          )}
          
          {data.error && (
            <div className="mt-2 text-xs text-red-600">
              {data.error}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // System metrics card
  const SystemMetricsCard = ({ metrics }) => {
    if (!metrics) return null;

    return (
      <Card className="system-metrics-card">
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center">
            <Server className="h-5 w-5 mr-2" />
            System Resources
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CPU Usage */}
            <div className="metric-item">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">CPU Usage</span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {Math.round(metrics.cpu.usage * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    metrics.cpu.usage > 0.8 ? 'bg-red-500' : 
                    metrics.cpu.usage > 0.6 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${metrics.cpu.usage * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {metrics.cpu.cores} cores
              </div>
            </div>

            {/* Memory Usage */}
            <div className="metric-item">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Memory Usage</span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {Math.round(metrics.memory.usage * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    metrics.memory.usage > 0.85 ? 'bg-red-500' : 
                    metrics.memory.usage > 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${metrics.memory.usage * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {Math.round(metrics.memory.used / 1024 / 1024 / 1024 * 100) / 100}GB / 
                {Math.round(metrics.memory.total / 1024 / 1024 / 1024 * 100) / 100}GB
              </div>
            </div>

            {/* Disk Usage */}
            <div className="metric-item">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Disk Usage</span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {Math.round(metrics.disk.usage * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    metrics.disk.usage > 0.9 ? 'bg-red-500' : 
                    metrics.disk.usage > 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${metrics.disk.usage * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Uptime: {Math.floor(metrics.uptime / 3600)}h {Math.floor((metrics.uptime % 3600) / 60)}m
          </div>
        </CardContent>
      </Card>
    );
  };

  // Alerts panel
  const AlertsPanel = ({ alerts }) => {
    if (!alerts || alerts.length === 0) {
      return (
        <Card className="alerts-panel">
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              System Alerts
            </h3>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
              No active alerts
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="alerts-panel">
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
            System Alerts ({alerts.length})
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <Alert key={index} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex justify-between items-start">
                    <div>
                      <strong>{alert.component}:</strong> {alert.message}
                    </div>
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Performance chart
  const PerformanceChart = () => {
    if (historicalData.length === 0) return null;

    return (
      <Card className="performance-chart">
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Response Time Trend
          </h3>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              {/* Chart library requires raw hex — aligned with --color-info */}
              <Line 
                type="monotone" 
                dataKey="responseTime" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
        <span className="ml-2">Loading system health data...</span>
      </div>
    );
  }

  if (error && !healthData) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load system health data: {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchHealthData}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const overallStatus = getStatusDisplay(healthData?.status);
  const OverallStatusIcon = overallStatus.icon;

  return (
    <div className="system-health-dashboard">
      {/* Header */}
      <div className="dashboard-header mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">System Health Dashboard</h1>
            <div className="flex items-center space-x-2">
              <OverallStatusIcon className={`h-6 w-6 text-${overallStatus.color}-500`} />
              <Badge 
                variant={overallStatus.color === 'green' ? 'success' : overallStatus.color === 'yellow' ? 'warning' : 'destructive'}
                className="text-sm"
              >
                {overallStatus.text}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Pause' : 'Resume'} Auto-refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHealthData}
              disabled={loading}
            >
              {loading ? <Spinner size="sm" /> : 'Refresh'}
            </Button>
          </div>
        </div>
        
        {healthData?.timestamp && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Last updated: {new Date(healthData.timestamp).toLocaleString()}
            {healthData.responseTime && (
              <span className="ml-4">
                Health check completed in {healthData.responseTime}ms
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="dashboard-content space-y-6">
        {/* Component Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {healthData?.components && Object.entries(healthData.components).map(([key, component]) => (
            <ComponentStatusCard key={key} component={key} data={component} />
          ))}
        </div>

        {/* System Metrics and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SystemMetricsCard metrics={healthData?.metrics} />
          <AlertsPanel alerts={healthData?.alerts} />
        </div>

        {/* Performance Chart */}
        <PerformanceChart />
      </div>
    </div>
  );
};

export default SystemHealthDashboard;