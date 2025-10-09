import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';

const PerformanceContext = createContext(null);

export const PerformanceProvider = ({ children, options = {} }) => {
  const {
    enableMemoryMonitoring = true,
    enableBundleAnalysis = true,
    enableBudgetChecking = true,
    refreshInterval = 5000,
    logToConsole = false
  } = options;

  const performanceMonitoring = usePerformanceMonitoring({
    enableMemoryMonitoring,
    enableBundleAnalysis,
    enableBudgetChecking,
    refreshInterval,
    logToConsole
  });

  const [performanceSettings, setPerformanceSettings] = useState({
    enableMonitoring: false,
    showDashboard: false,
    alertThresholds: {
      memoryUsage: 80, // 80%
      renderTime: 16, // 16ms
      bundleSize: 500000 // 500KB
    }
  });

  const [alerts, setAlerts] = useState([]);

  // Check for performance alerts
  const checkAlerts = useCallback(() => {
    const newAlerts = [];

    // Memory usage alert
    if (performanceMonitoring.memoryUsage) {
      const usagePercentage = (performanceMonitoring.memoryUsage.usedJSHeapSize / performanceMonitoring.memoryUsage.jsHeapSizeLimit) * 100;
      if (usagePercentage > performanceSettings.alertThresholds.memoryUsage) {
        newAlerts.push({
          type: 'memory',
          severity: 'warning',
          message: `Memory usage is at ${usagePercentage.toFixed(1)}%`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Bundle size alert
    if (performanceMonitoring.bundleSize) {
      if (performanceMonitoring.bundleSize.totalSize > performanceSettings.alertThresholds.bundleSize) {
        newAlerts.push({
          type: 'bundle',
          severity: 'warning',
          message: `Bundle size is ${(performanceMonitoring.bundleSize.totalSize / 1024).toFixed(1)}KB`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Budget violations alert
    if (performanceMonitoring.budgetViolations && !performanceMonitoring.budgetViolations.withinBudget) {
      newAlerts.push({
        type: 'budget',
        severity: 'error',
        message: `${performanceMonitoring.budgetViolations.violations.length} budget violations detected`,
        timestamp: new Date().toISOString()
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev, ...newAlerts]);
    }
  }, [performanceMonitoring, performanceSettings.alertThresholds]);

  // Check alerts when performance data changes
  useEffect(() => {
    if (performanceSettings.enableMonitoring) {
      checkAlerts();
    }
  }, [performanceMonitoring, performanceSettings.enableMonitoring, checkAlerts]);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Clear specific alert
  const clearAlert = useCallback((alertIndex) => {
    setAlerts(prev => prev.filter((_, index) => index !== alertIndex));
  }, []);

  // Update performance settings
  const updateSettings = useCallback((newSettings) => {
    setPerformanceSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  }, []);

  // Toggle monitoring
  const toggleMonitoring = useCallback(() => {
    performanceMonitoring.toggleMonitoring();
    updateSettings({ enableMonitoring: !performanceSettings.enableMonitoring });
  }, [performanceMonitoring, performanceSettings.enableMonitoring, updateSettings]);

  // Toggle dashboard
  const toggleDashboard = useCallback(() => {
    updateSettings({ showDashboard: !performanceSettings.showDashboard });
  }, [performanceSettings.showDashboard, updateSettings]);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const summary = {
      isMonitoring: performanceSettings.enableMonitoring,
      hasAlerts: alerts.length > 0,
      alertCount: alerts.length,
      memoryUsage: performanceMonitoring.memoryUsage ? 
        (performanceMonitoring.memoryUsage.usedJSHeapSize / performanceMonitoring.memoryUsage.jsHeapSizeLimit) * 100 : 0,
      bundleSize: performanceMonitoring.bundleSize ? performanceMonitoring.bundleSize.totalSize : 0,
      budgetViolations: performanceMonitoring.budgetViolations ? 
        performanceMonitoring.budgetViolations.violations.length : 0
    };

    return summary;
  }, [performanceSettings.enableMonitoring, alerts, performanceMonitoring]);

  const value = {
    // Performance data
    ...performanceMonitoring,
    
    // Settings
    performanceSettings,
    updateSettings,
    
    // Alerts
    alerts,
    clearAlerts,
    clearAlert,
    
    // Actions
    toggleMonitoring,
    toggleDashboard,
    
    // Utilities
    getPerformanceSummary
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};

export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};

export default PerformanceContext;

