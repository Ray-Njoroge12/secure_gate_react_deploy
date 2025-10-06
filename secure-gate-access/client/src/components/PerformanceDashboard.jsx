// client/src/components/PerformanceDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button } from './ui';
import { 
  performanceMonitor, 
  getBundleAnalytics, 
  getMemoryUsage,
  usePerformanceDebug 
} from '../utils/performanceOptimization';
import { measureWebVitals } from '../hooks/usePerformanceMonitoring';

const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState({});
  const [webVitals, setWebVitals] = useState({});
  const [bundleInfo, setBundleInfo] = useState(null);
  const [memoryInfo, setMemoryInfo] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Performance debugging for this component
  const { renderCount } = usePerformanceDebug('PerformanceDashboard', process.env.NODE_ENV === 'development');

  // Update metrics periodically
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getAllStats());
      setBundleInfo(getBundleAnalytics());
      setMemoryInfo(getMemoryUsage());
    };

    updateMetrics();
    
    if (isMonitoring) {
      const interval = setInterval(updateMetrics, 1000);
      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  // Measure Web Vitals
  useEffect(() => {
    measureWebVitals((metric) => {
      setWebVitals(prev => ({
        ...prev,
        [metric.name]: {
          value: metric.value,
          delta: metric.delta,
          id: metric.id,
          navigationType: metric.navigationType
        }
      }));
    });
  }, []);

  // Calculate performance score
  const performanceScore = useMemo(() => {
    const scores = [];
    
    // Web Vitals scores
    if (webVitals.LCP) {
      const lcpScore = webVitals.LCP.value < 2500 ? 100 : 
                      webVitals.LCP.value < 4000 ? 75 : 
                      webVitals.LCP.value < 6000 ? 50 : 25;
      scores.push(lcpScore);
    }
    
    if (webVitals.FID) {
      const fidScore = webVitals.FID.value < 100 ? 100 : 
                      webVitals.FID.value < 300 ? 75 : 
                      webVitals.FID.value < 500 ? 50 : 25;
      scores.push(fidScore);
    }
    
    if (webVitals.CLS) {
      const clsScore = webVitals.CLS.value < 0.1 ? 100 : 
                      webVitals.CLS.value < 0.25 ? 75 : 
                      webVitals.CLS.value < 0.4 ? 50 : 25;
      scores.push(clsScore);
    }

    // Memory usage score
    if (memoryInfo) {
      const memoryUsagePercent = (memoryInfo.used / memoryInfo.limit) * 100;
      const memoryScore = memoryUsagePercent < 50 ? 100 : 
                         memoryUsagePercent < 75 ? 75 : 
                         memoryUsagePercent < 90 ? 50 : 25;
      scores.push(memoryScore);
    }

    return scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  }, [webVitals, memoryInfo]);

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
        <div className="flex space-x-2">
          <Button
            variant={isMonitoring ? "primary" : "outline"}
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setMetrics({});
              setWebVitals({});
              performanceMonitor.metrics.clear();
            }}
          >
            Clear Data
          </Button>
        </div>
      </div>

      {/* Performance Score */}
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold">Overall Performance Score</h2>
        </Card.Header>
        <Card.Content>
          <div className="text-center">
            <div className={`text-6xl font-bold ${getScoreColor(performanceScore)}`}>
              {performanceScore}
            </div>
            <p className="text-gray-600 mt-2">out of 100</p>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className={`h-4 rounded-full transition-all duration-500 ${
                    performanceScore >= 90 ? 'bg-green-500' :
                    performanceScore >= 70 ? 'bg-yellow-500' :
                    performanceScore >= 50 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${performanceScore}%` }}
                ></div>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Web Vitals */}
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold">Web Vitals</h2>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(webVitals).map(([name, metric]) => (
              <div key={name} className="text-center p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700">{name}</h3>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {formatDuration(metric.value)}
                </div>
                <div className="text-sm text-gray-500">
                  ID: {metric.id}
                </div>
              </div>
            ))}
          </div>
          {Object.keys(webVitals).length === 0 && (
            <p className="text-gray-500 text-center py-4">
              Web Vitals will appear here after page load
            </p>
          )}
        </Card.Content>
      </Card>

      {/* Memory Usage */}
      {memoryInfo && (
        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold">Memory Usage</h2>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Used</span>
                <span className="font-mono">{formatBytes(memoryInfo.used * 1024 * 1024)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Total</span>
                <span className="font-mono">{formatBytes(memoryInfo.total * 1024 * 1024)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Limit</span>
                <span className="font-mono">{formatBytes(memoryInfo.limit * 1024 * 1024)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(memoryInfo.used / memoryInfo.limit) * 100}%` }}
                ></div>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Bundle Analysis */}
      {bundleInfo && (
        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold">Bundle Analysis</h2>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{bundleInfo.jsFiles}</div>
                <div className="text-sm text-gray-600">JS Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{bundleInfo.cssFiles}</div>
                <div className="text-sm text-gray-600">CSS Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{bundleInfo.totalJSSize}KB</div>
                <div className="text-sm text-gray-600">JS Size</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{bundleInfo.totalCSSSize}KB</div>
                <div className="text-sm text-gray-600">CSS Size</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-lg font-semibold text-gray-900">
                Total Bundle Size: {bundleInfo.totalSize}KB
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Performance Metrics */}
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold">Component Performance</h2>
        </Card.Header>
        <Card.Content>
          {Object.keys(metrics).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(metrics).map(([key, stats]) => {
                if (!stats) return null;
                const [type, name] = key.split('_');
                return (
                  <div key={key} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{name}</h3>
                      <span className="text-sm text-gray-500 capitalize">{type}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Count</div>
                        <div className="font-mono">{stats.count}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Average</div>
                        <div className="font-mono">{formatDuration(stats.average)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Min</div>
                        <div className="font-mono">{formatDuration(stats.min)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Max</div>
                        <div className="font-mono">{formatDuration(stats.max)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No performance metrics recorded yet
            </p>
          )}
        </Card.Content>
      </Card>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold">Debug Information</h2>
          </Card.Header>
          <Card.Content>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Component Renders:</span>
                <span className="font-mono">{renderCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monitoring:</span>
                <span className={isMonitoring ? 'text-green-600' : 'text-gray-600'}>
                  {isMonitoring ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default PerformanceDashboard;