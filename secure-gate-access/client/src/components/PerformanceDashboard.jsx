import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge } from './ui';
import { 
  analyzeBundleSize, 
  performanceMonitor 
} from '../utils/bundleOptimizer';

const PerformanceDashboard = ({ isOpen, onClose }) => {
  const [performanceData, setPerformanceData] = useState({
    bundleSize: null,
    memoryUsage: null,
    componentTree: null,
    bundleComposition: null,
    budgetViolations: null
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Collect performance data
  const collectPerformanceData = useCallback(() => {
    const bundleSize = analyzeBundleSize();
    const memoryUsage = performanceMonitor.getMemoryUsage();
    
    // Component tree analysis - analyze React component hierarchy
    const componentTree = {
      totalComponents: document.querySelectorAll('[data-testid]').length,
      depth: 5, // Estimated component tree depth
      renderCount: performanceMonitor.getRenderCount?.() || 0,
      lastUpdated: new Date().toISOString()
    };
    
    // Bundle composition analysis - analyze chunk sizes
    const bundleComposition = {
      main: bundleSize?.main || 0,
      vendor: bundleSize?.vendor || 0,
      chunks: bundleSize?.chunks || [],
      totalSize: bundleSize?.total || 0,
      lastUpdated: new Date().toISOString()
    };
    
    // Budget checking - compare against performance budgets
    const budgetViolations = {
      bundleSize: bundleSize?.total > 500000 ? {
        actual: bundleSize.total,
        budget: 500000,
        violation: bundleSize.total - 500000
      } : null,
      memoryUsage: memoryUsage?.used > 50 ? {
        actual: memoryUsage.used,
        budget: 50,
        violation: memoryUsage.used - 50
      } : null,
      lastChecked: new Date().toISOString()
    };

    setPerformanceData({
      bundleSize,
      memoryUsage,
      componentTree,
      bundleComposition,
      budgetViolations
    });
  }, []);

  // Start/stop monitoring
  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
      setIsMonitoring(false);
    } else {
      collectPerformanceData();
      const interval = setInterval(collectPerformanceData, 5000); // Every 5 seconds
      setRefreshInterval(interval);
      setIsMonitoring(true);
    }
  }, [isMonitoring, refreshInterval, collectPerformanceData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  // Initial data collection
  useEffect(() => {
    collectPerformanceData();
  }, [collectPerformanceData]);

  if (!isOpen) return null;

  const formatBytes = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatPercentage = (value, total) => {
    if (!value || !total) return 'N/A';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
            <div className="flex items-center gap-4">
              <Button
                onClick={toggleMonitoring}
                variant={isMonitoring ? "destructive" : "primary"}
                size="sm"
              >
                {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
              </Button>
              <Button onClick={onClose} variant="ghost" size="sm">
                Close
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Bundle Size Analysis */}
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold">Bundle Size Analysis</h3>
            </Card.Header>
            <Card.Content>
              {performanceData.bundleSize ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatBytes(performanceData.bundleSize.totalSize)}
                      </div>
                      <div className="text-sm text-gray-500">Total Bundle Size</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {performanceData.bundleSize.scripts.length}
                      </div>
                      <div className="text-sm text-gray-500">Scripts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {performanceData.bundleSize.stylesheets.length}
                      </div>
                      <div className="text-sm text-gray-500">Stylesheets</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Script Sizes:</h4>
                    {performanceData.bundleSize.scripts.map((script, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm font-mono truncate">{script.src.split('/').pop()}</span>
                        <Badge variant="outline">{formatBytes(script.size)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Bundle size data not available
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Memory Usage */}
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold">Memory Usage</h3>
            </Card.Header>
            <Card.Content>
              {performanceData.memoryUsage ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {formatBytes(performanceData.memoryUsage.usedJSHeapSize)}
                      </div>
                      <div className="text-sm text-gray-500">Used Heap</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatBytes(performanceData.memoryUsage.totalJSHeapSize)}
                      </div>
                      <div className="text-sm text-gray-500">Total Heap</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {formatPercentage(performanceData.memoryUsage.usedJSHeapSize, performanceData.memoryUsage.jsHeapSizeLimit)}
                      </div>
                      <div className="text-sm text-gray-500">Usage %</div>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, (performanceData.memoryUsage.usedJSHeapSize / performanceData.memoryUsage.jsHeapSizeLimit) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Memory usage data not available
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Component Tree Analysis */}
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold">Component Tree Analysis</h3>
            </Card.Header>
            <Card.Content>
              {performanceData.componentTree ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {performanceData.componentTree.totalElements}
                      </div>
                      <div className="text-sm text-gray-500">Total Elements</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {performanceData.componentTree.performanceIssues.length}
                      </div>
                      <div className="text-sm text-gray-500">Performance Issues</div>
                    </div>
                  </div>
                  
                  {performanceData.componentTree.performanceIssues.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-600">Issues Found:</h4>
                      {performanceData.componentTree.performanceIssues.map((issue, index) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                          <div className="font-medium text-red-800">{issue.type}</div>
                          <div className="text-sm text-red-600">{issue.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {performanceData.componentTree.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-blue-600">Recommendations:</h4>
                      {performanceData.componentTree.recommendations.map((rec, index) => (
                        <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded">
                          <div className="text-sm text-blue-800">{rec}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Component tree data not available
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Budget Violations */}
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold">Performance Budget</h3>
            </Card.Header>
            <Card.Content>
              {performanceData.budgetViolations ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={performanceData.budgetViolations.withinBudget ? "success" : "destructive"}>
                      {performanceData.budgetViolations.withinBudget ? 'Within Budget' : 'Budget Exceeded'}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {performanceData.budgetViolations.violations.length} violations
                    </span>
                  </div>
                  
                  {performanceData.budgetViolations.violations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-600">Violations:</h4>
                      {performanceData.budgetViolations.violations.map((violation, index) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                          <div className="font-medium text-red-800">{violation.type}</div>
                          <div className="text-sm text-red-600">{violation.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Budget analysis not available
                </div>
              )}
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;