import React, { useState, useEffect, useCallback, memo } from 'react';
import { Card, Button, Badge } from './ui';
import { performanceMonitor } from '../utils/bundleOptimizer';

/**
 * Performance monitoring component for development and debugging
 * @param {Object} props - Component props
 * @param {boolean} props.show - Whether to show the monitor
 * @param {string} props.position - Position of the monitor (top-right, bottom-right, etc.)
 * @param {boolean} props.autoRefresh - Whether to auto-refresh metrics
 * @param {number} props.refreshInterval - Refresh interval in milliseconds
 * @returns {JSX.Element} Performance monitor component
 */
const PerformanceMonitor = memo(({
  show = false,
  position = 'top-right',
  autoRefresh = true,
  refreshInterval = 5000,
  className = ''
}) => {
  const [metrics, setMetrics] = useState({
    memory: null,
    loading: null,
    renderCount: 0,
    lastUpdate: null
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const updateMetrics = useCallback(async () => {
    const memory = performanceMonitor.getMemoryUsage();
    const loading = await performanceMonitor.getLoadingPerformance();
    
    setMetrics(prev => ({
      memory,
      loading,
      renderCount: prev.renderCount + 1,
      lastUpdate: new Date()
    }));
  }, []);

  useEffect(() => {
    if (show && autoRefresh) {
      updateMetrics();
      const interval = setInterval(updateMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [show, autoRefresh, refreshInterval, updateMetrics]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms) => {
    return `${ms.toFixed(2)}ms`;
  };

  const getMemoryUsagePercentage = () => {
    if (!metrics.memory) return 0;
    return (metrics.memory.used / metrics.memory.limit) * 100;
  };

  const getMemoryStatus = () => {
    const percentage = getMemoryUsagePercentage();
    if (percentage > 80) return 'critical';
    if (percentage > 60) return 'warning';
    return 'good';
  };

  if (!show) return null;

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div className={`fixed z-50 ${positionClasses[position]} ${className}`}>
      <Card className="w-80 bg-white shadow-lg border">
        <Card.Header className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Performance Monitor</h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1"
            >
              {isExpanded ? '−' : '+'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={updateMetrics}
              className="p-1"
            >
              ↻
            </Button>
          </div>
        </Card.Header>

        <Card.Content className="space-y-3">
          {/* Memory Usage */}
          {metrics.memory && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Memory Usage</span>
                <Badge 
                  variant={getMemoryStatus() === 'critical' ? 'error' : 
                          getMemoryStatus() === 'warning' ? 'warning' : 'success'}
                  size="sm"
                >
                  {getMemoryUsagePercentage().toFixed(1)}%
                </Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    getMemoryStatus() === 'critical' ? 'bg-red-500' :
                    getMemoryStatus() === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${getMemoryUsagePercentage()}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">
                {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.limit)}
              </div>
            </div>
          )}

          {/* Loading Performance */}
          {metrics.loading && (
            <div className="space-y-2">
              <span className="text-xs text-gray-600">Loading Performance</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">DOM Ready:</span>
                  <span className="ml-1 font-mono">{formatTime(metrics.loading.domContentLoaded)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Load Complete:</span>
                  <span className="ml-1 font-mono">{formatTime(metrics.loading.loadComplete)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Resources:</span>
                  <span className="ml-1 font-mono">{metrics.loading.totalResources}</span>
                </div>
                <div>
                  <span className="text-gray-500">Total Size:</span>
                  <span className="ml-1 font-mono">{formatBytes(metrics.loading.totalResourceSize)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Expanded Details */}
          {isExpanded && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-xs text-gray-600">
                <div>Updates: {metrics.renderCount}</div>
                <div>Last Update: {metrics.lastUpdate?.toLocaleTimeString()}</div>
              </div>
              
              {/* Performance Tips */}
              <div className="text-xs text-gray-500 space-y-1">
                <div className="font-semibold">Tips:</div>
                <div>• Use React.memo for expensive components</div>
                <div>• Implement code splitting for large bundles</div>
                <div>• Optimize images and assets</div>
                <div>• Use lazy loading for non-critical components</div>
              </div>
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';

export default PerformanceMonitor;



