/**
 * Load Balancer Dashboard
 * Comprehensive load balancer monitoring and management interface
 */

import React, { useState, useEffect } from 'react';
import logger from 'utils/logger';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { Alert, AlertDescription } from './ui/Alert';
import { 
  Server, 
  Activity, 
  Settings, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  BarChart3,
  Zap,
  Clock,
  Users,
  Globe,
  Shield,
  Play,
  Pause
} from 'lucide-react';

const LoadBalancerDashboard = () => {
  const [loadBalancerData, setLoadBalancerData] = useState(null);
  const [servers, setServers] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [algorithms, setAlgorithms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchLoadBalancerData();
    const interval = setInterval(fetchLoadBalancerData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchLoadBalancerData = async () => {
    try {
      setLoading(true);
      const [statusRes, algorithmsRes] = await Promise.all([
        fetch('/api/load-balancer/status', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/load-balancer/algorithms', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const status = await statusRes.json();
      const algorithms = await algorithmsRes.json();

      setLoadBalancerData(status.data);
      setServers(status.data?.servers || []);
      setStatistics(status.data?.loadBalancer);
      setAlgorithms(algorithms.data || []);
    } catch (error) {
      logger.error('Failed to fetch load balancer data:', error);
      setMessage('Failed to load load balancer data');
    } finally {
      setLoading(false);
    }
  };

  const toggleServer = async (serverId, enabled) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/load-balancer/servers/${serverId}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ enabled })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(result.message);
        fetchLoadBalancerData(); // Refresh data
      } else {
        setMessage(`Failed to toggle server: ${result.message}`);
      }
    } catch (error) {
      logger.error('Failed to toggle server:', error);
      setMessage('Failed to toggle server');
    } finally {
      setLoading(false);
    }
  };

  const changeAlgorithm = async (algorithm) => {
    try {
      setLoading(true);
      const response = await fetch('/api/load-balancer/algorithm', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ algorithm })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(result.message);
        fetchLoadBalancerData(); // Refresh data
      } else {
        setMessage(`Failed to change algorithm: ${result.message}`);
      }
    } catch (error) {
      logger.error('Failed to change algorithm:', error);
      setMessage('Failed to change algorithm');
    } finally {
      setLoading(false);
    }
  };

  const toggleStickySessions = async (enabled) => {
    try {
      setLoading(true);
      const response = await fetch('/api/load-balancer/sticky-sessions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ enabled })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(result.message);
        fetchLoadBalancerData(); // Refresh data
      } else {
        setMessage(`Failed to toggle sticky sessions: ${result.message}`);
      }
    } catch (error) {
      logger.error('Failed to toggle sticky sessions:', error);
      setMessage('Failed to toggle sticky sessions');
    } finally {
      setLoading(false);
    }
  };

  const forceHealthCheck = async (serverId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/load-balancer/servers/${serverId}/health-check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(result.message);
        fetchLoadBalancerData(); // Refresh data
      } else {
        setMessage(`Failed to perform health check: ${result.message}`);
      }
    } catch (error) {
      logger.error('Failed to perform health check:', error);
      setMessage('Failed to perform health check');
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
      case 'backup':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'unknown':
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
      case 'backup':
        return 'bg-blue-100 text-blue-800';
      case 'unknown':
        return 'bg-yellow-100 text-yellow-800';
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

  if (loading && !loadBalancerData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Load Balancer Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button onClick={fetchLoadBalancerData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="outline" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {statistics?.algorithm || 'Unknown'} Algorithm
          </Badge>
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
          <TabsTrigger value="servers">Servers</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics?.health?.totalServers || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statistics?.health?.healthyServers || 0} healthy
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(statistics?.health?.successRate || 0).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Health check success rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatTime(statistics?.health?.averageResponseTime || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average server response
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(statistics?.sessionCount || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statistics?.stickySessions ? 'Sticky enabled' : 'Sticky disabled'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Server Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {servers.slice(0, 5).map((server) => (
                    <div key={server.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(server.status)}
                        <span className="font-medium">{server.id}</span>
                        <span className="text-sm text-muted-foreground">
                          {server.host}:{server.port}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(server.status)}>
                          {server.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => forceHealthCheck(server.id)}
                          disabled={loading}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Load Balancer Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Algorithm</span>
                    <Badge variant="outline">{statistics?.algorithm || 'Unknown'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Sticky Sessions</span>
                    <Badge variant={statistics?.stickySessions ? 'default' : 'outline'}>
                      {statistics?.stickySessions ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Health Checks</span>
                    <Badge variant="outline">
                      {statistics?.health?.totalChecks || 0} total
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Failed Checks</span>
                    <Badge variant="outline">
                      {statistics?.health?.failedChecks || 0} failed
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="servers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Server Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {servers.map((server) => (
                  <div key={server.id} className="p-4 border rounded">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(server.status)}
                        <div>
                          <h3 className="font-semibold">{server.id}</h3>
                          <p className="text-sm text-muted-foreground">
                            {server.host}:{server.port}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(server.status)}>
                          {server.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleServer(server.id, !server.enabled)}
                          disabled={loading}
                        >
                          {server.enabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          {server.enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => forceHealthCheck(server.id)}
                          disabled={loading}
                        >
                          <RefreshCw className="h-3 w-3" />
                          Check
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Response Time</div>
                        <div className="text-muted-foreground">
                          {formatTime(server.responseTime || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Weight</div>
                        <div className="text-muted-foreground">{server.weight || 1}</div>
                      </div>
                      <div>
                        <div className="font-medium">Success Rate</div>
                        <div className="text-muted-foreground">
                          {(server.successRate || 0).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Last Check</div>
                        <div className="text-muted-foreground">
                          {server.lastCheck ? new Date(server.lastCheck).toLocaleTimeString() : 'Never'}
                        </div>
                      </div>
                    </div>
                    
                    {server.lastError && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        <strong>Last Error:</strong> {server.lastError}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Load Balancer Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Load Balancing Algorithm</h4>
                <div className="flex flex-wrap gap-2">
                  {algorithms.map((algorithm) => (
                    <Button
                      key={algorithm}
                      variant={statistics?.algorithm === algorithm ? 'default' : 'outline'}
                      onClick={() => changeAlgorithm(algorithm)}
                      disabled={loading}
                    >
                      {algorithm.replace('_', ' ').toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Sticky Sessions</h4>
                <div className="flex items-center space-x-4">
                  <Button
                    variant={statistics?.stickySessions ? 'default' : 'outline'}
                    onClick={() => toggleStickySessions(true)}
                    disabled={loading}
                  >
                    Enable
                  </Button>
                  <Button
                    variant={!statistics?.stickySessions ? 'default' : 'outline'}
                    onClick={() => toggleStickySessions(false)}
                    disabled={loading}
                  >
                    Disable
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Current: {statistics?.stickySessions ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Health Check Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Check Interval</div>
                    <div className="text-muted-foreground">30 seconds</div>
                  </div>
                  <div>
                    <div className="font-medium">Check Timeout</div>
                    <div className="text-muted-foreground">5 seconds</div>
                  </div>
                  <div>
                    <div className="font-medium">Failure Threshold</div>
                    <div className="text-muted-foreground">3 failures</div>
                  </div>
                  <div>
                    <div className="font-medium">Recovery Threshold</div>
                    <div className="text-muted-foreground">2 successes</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Load Balancer Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium">Total Requests</div>
                    <div className="text-2xl font-bold">
                      {formatNumber(statistics?.servers?.reduce((sum, s) => sum + (s.totalRequests || 0), 0) || 0)}
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium">Active Connections</div>
                    <div className="text-2xl font-bold">
                      {statistics?.servers?.reduce((sum, s) => sum + (s.activeConnections || 0), 0) || 0}
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium">Total Errors</div>
                    <div className="text-2xl font-bold">
                      {formatNumber(statistics?.servers?.reduce((sum, s) => sum + (s.errors || 0), 0) || 0)}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Server Performance</h4>
                  <div className="space-y-2">
                    {statistics?.servers?.map((server) => (
                      <div key={server.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{server.id}</span>
                          <Badge className={getStatusColor('healthy')}>
                            {server.totalRequests || 0} requests
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Avg: {formatTime(server.averageResponseTime || 0)} | 
                          Errors: {server.errors || 0} | 
                          Rate: {(server.errorRate || 0).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoadBalancerDashboard;
