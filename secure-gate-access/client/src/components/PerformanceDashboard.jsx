/**
 * Performance Dashboard
 * Comprehensive performance monitoring and optimization interface
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Activity, 
  Database, 
  Zap, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Settings,
  Trash2
} from 'lucide-react';

const PerformanceDashboard = () => {
  const [performanceData, setPerformanceData] = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [slowQueries, setSlowQueries] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPerformanceData();
    const interval = setInterval(fetchPerformanceData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const [statusRes, endpointsRes, slowQueriesRes, recommendationsRes] = await Promise.all([
        fetch('/api/performance/status', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/performance/endpoints?limit=10', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/performance/slow-queries?limit=10', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/performance/recommendations', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const status = await statusRes.json();
      const endpoints = await endpointsRes.json();
      const slowQueries = await slowQueriesRes.json();
      const recommendations = await recommendationsRes.json();

      setPerformanceData(status.data);
      setEndpoints(endpoints.data || []);
      setSlowQueries(slowQueries.data || []);
      setRecommendations(recommendations.data?.recommendations || []);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
      setMessage('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async (prefix = null) => {
    try {
      setLoading(true);
      const response = await fetch('/api/performance/cache/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ prefix })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(result.message);
        fetchPerformanceData(); // Refresh data
      } else {
        setMessage(`Failed to clear cache: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      setMessage('Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  const resetMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/performance/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage('Performance metrics reset successfully');
        fetchPerformanceData(); // Refresh data
      } else {
        setMessage(`Failed to reset metrics: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to reset metrics:', error);
      setMessage('Failed to reset metrics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTime = (ms) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${ms.toFixed(2)}ms`;
  };

  if (loading && !performanceData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Performance Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button onClick={fetchPerformanceData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={resetMetrics} variant="outline" disabled={loading}>
            <Trash2 className="h-4 w-4 mr-2" />
            Reset Metrics
          </Button>
        </div>
      </div>

      {message && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(performanceData?.middleware?.overall?.requests || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average: {formatTime(performanceData?.middleware?.overall?.averageResponseTime || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(performanceData?.middleware?.overall?.errorRate || 0).toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {performanceData?.middleware?.overall?.errors || 0} errors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Slow Requests</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performanceData?.middleware?.overall?.slowRequests || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  > 1000ms response time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(performanceData?.cache?.hitRate || 0).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {performanceData?.cache?.hits || 0} hits / {performanceData?.cache?.misses || 0} misses
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(performanceData?.cache?.isConnected ? 'healthy' : 'unhealthy')}
                      <span>Cache</span>
                    </div>
                    <Badge className={getStatusColor(performanceData?.cache?.isConnected ? 'healthy' : 'unhealthy')}>
                      {performanceData?.cache?.isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(performanceData?.database?.health?.status || 'unknown')}
                      <span>Database</span>
                    </div>
                    <Badge className={getStatusColor(performanceData?.database?.health?.status || 'unknown')}>
                      {performanceData?.database?.health?.status || 'Unknown'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Endpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {endpoints.slice(0, 5).map((endpoint, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium text-sm">{endpoint.endpoint}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(endpoint.averageTime)} avg
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{endpoint.count}</div>
                        <div className="text-xs text-muted-foreground">requests</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Endpoint Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {endpoints.map((endpoint, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <div className="font-medium">{endpoint.endpoint}</div>
                      <div className="text-sm text-muted-foreground">
                        {endpoint.count} requests • {formatTime(endpoint.averageTime)} avg
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{endpoint.slowCount}</div>
                        <div className="text-xs text-muted-foreground">slow</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{endpoint.errorCount}</div>
                        <div className="text-xs text-muted-foreground">errors</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium">Total Queries</div>
                    <div className="text-2xl font-bold">
                      {formatNumber(performanceData?.performance?.database?.queries || 0)}
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium">Avg Query Time</div>
                    <div className="text-2xl font-bold">
                      {formatTime(performanceData?.performance?.database?.averageQueryTime || 0)}
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium">Connection Pools</div>
                    <div className="text-2xl font-bold">
                      {Object.keys(performanceData?.database?.pools || {}).length}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Slow Queries</h4>
                  <div className="space-y-2">
                    {slowQueries.map((query, index) => (
                      <div key={index} className="p-2 border rounded text-sm">
                        <div className="font-mono text-xs bg-gray-100 p-2 rounded mb-1">
                          {query.query}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Count: {query.count}</span>
                          <span>Avg: {formatTime(query.avgTime)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cache Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium">Hit Rate</div>
                    <div className="text-2xl font-bold">
                      {(performanceData?.cache?.hitRate || 0).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium">Hits</div>
                    <div className="text-2xl font-bold">
                      {formatNumber(performanceData?.cache?.hits || 0)}
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="p-3 border rounded">
                      <div className="text-sm font-medium">Misses</div>
                      <div className="text-2xl font-bold">
                        {formatNumber(performanceData?.cache?.misses || 0)}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium">Sets</div>
                    <div className="text-2xl font-bold">
                      {formatNumber(performanceData?.cache?.sets || 0)}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => clearCache()} disabled={loading}>
                    Clear All Cache
                  </Button>
                  <Button onClick={() => clearCache('user')} variant="outline" disabled={loading}>
                    Clear User Cache
                  </Button>
                  <Button onClick={() => clearCache('visitor')} variant="outline" disabled={loading}>
                    Clear Visitor Cache
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No performance issues detected!</p>
                  </div>
                ) : (
                  recommendations.map((rec, index) => (
                    <div key={index} className="p-4 border rounded">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getSeverityColor(rec.severity)}>
                            {rec.severity}
                          </Badge>
                          <span className="font-medium">{rec.type.replace('_', ' ').toUpperCase()}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{rec.message}</p>
                      <div className="flex items-center space-x-4 text-xs">
                        <span>Current: {rec.currentValue}</span>
                        <span>Target: {rec.targetValue}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;
