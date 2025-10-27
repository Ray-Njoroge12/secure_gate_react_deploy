/**
 * Performance Monitoring Hook
 * 
 * React hook for monitoring component performance and Web Vitals
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { performanceMonitor, PerformanceTracker } from '../utils/performanceMonitoring';

/**
 * Hook for monitoring component performance
 */
export function usePerformanceMonitor(componentName) {
  const [metrics, setMetrics] = useState({});
  const [isMonitoring, setIsMonitoring] = useState(false);
  const renderStartTime = useRef(null);
  const renderCount = useRef(0);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    renderStartTime.current = performance.now();
    PerformanceTracker.mark(`${componentName}-render-start`);
  }, [componentName]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;
      PerformanceTracker.mark(`${componentName}-render-end`);
      PerformanceTracker.measure(`${componentName}-render-time`, 
        `${componentName}-render-start`, 
        `${componentName}-render-end`);

      setMetrics(prev => ({
        ...prev,
        renderTime,
        renderCount: ++renderCount.current
      }));

      // Report slow renders
      if (renderTime > 16) { // More than 16ms (60 FPS threshold)
        console.warn(`Slow render detected in ${componentName}: ${renderTime}ms`);
      }
    }
    setIsMonitoring(false);
  }, [componentName]);

  // Monitor component mount/unmount
  useEffect(() => {
    startMonitoring();
    return stopMonitoring;
  }, [startMonitoring, stopMonitoring]);

  // Monitor re-renders
  useEffect(() => {
    if (isMonitoring) {
      stopMonitoring();
    }
  });

  return {
    metrics,
    startMonitoring,
    stopMonitoring,
    isMonitoring
  };
}

/**
 * Hook for monitoring Web Vitals
 */
export function useWebVitals() {
  const [vitals, setVitals] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Wait for initial load
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // Get current metrics
    const currentMetrics = performanceMonitor.getMetrics();
    setVitals(currentMetrics);

    // Set up periodic updates
    const interval = setInterval(() => {
      const updatedMetrics = performanceMonitor.getMetrics();
      setVitals(updatedMetrics);
    }, 5000);

    return () => clearInterval(interval);
  }, [isLoaded]);

  const getVitalStatus = useCallback((vital, value) => {
    if (!value) return 'pending';
    
    const thresholds = {
      FCP: 1800,
      LCP: 2500,
      FID: 100,
      CLS: 0.1,
      TTFB: 800
    };

    const threshold = thresholds[vital];
    if (!threshold) return 'unknown';

    if (value <= threshold) return 'good';
    if (value <= threshold * 1.5) return 'needs-improvement';
    return 'poor';
  }, []);

  const formatValue = useCallback((vital, value) => {
    if (!value) return 'N/A';

    switch (vital) {
      case 'FCP':
      case 'LCP':
      case 'TTFB':
        return `${Math.round(value)}ms`;
      case 'FID':
        return `${Math.round(value)}ms`;
      case 'CLS':
        return value.toFixed(3);
      case 'FPS':
        return `${Math.round(value)} FPS`;
      case 'MEMORY_USED':
      case 'BUNDLE_SIZE':
        return `${Math.round(value / 1024)}KB`;
      default:
        return value.toString();
    }
  }, []);

  return {
    vitals,
    getVitalStatus,
    formatValue,
    isLoaded
  };
}

/**
 * Hook for monitoring network performance
 */
export function useNetworkPerformance() {
  const [networkInfo, setNetworkInfo] = useState({});
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    // Get network information if available
    if ('connection' in navigator) {
      const connection = navigator.connection;
      setConnectionType(connection.effectiveType || 'unknown');
      
      setNetworkInfo({
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      });

      // Listen for connection changes
      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || 'unknown');
        setNetworkInfo({
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        });
      };

      connection.addEventListener('change', handleConnectionChange);
      return () => connection.removeEventListener('change', handleConnectionChange);
    }
  }, []);

  return {
    networkInfo,
    connectionType
  };
}

/**
 * Hook for monitoring memory usage
 */
export function useMemoryUsage() {
  const [memoryInfo, setMemoryInfo] = useState({});
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('memory' in performance) {
      setIsSupported(true);
      
      const updateMemoryInfo = () => {
        const memory = performance.memory;
        setMemoryInfo({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        });
      };

      updateMemoryInfo();
      
      // Update every 5 seconds
      const interval = setInterval(updateMemoryInfo, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  const formatBytes = useCallback((bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }, []);

  return {
    memoryInfo,
    isSupported,
    formatBytes
  };
}

/**
 * Hook for monitoring component render performance
 */
export function useRenderPerformance(componentName) {
  const [renderMetrics, setRenderMetrics] = useState({
    renderCount: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    minRenderTime: Infinity
  });
  
  const renderTimes = useRef([]);
  const startTime = useRef(null);

  useEffect(() => {
    startTime.current = performance.now();
    PerformanceTracker.mark(`${componentName}-mount-start`);
  }, [componentName]);

  useEffect(() => {
    if (startTime.current) {
      const renderTime = performance.now() - startTime.current;
      PerformanceTracker.mark(`${componentName}-mount-end`);
      PerformanceTracker.measure(`${componentName}-mount-time`, 
        `${componentName}-mount-start`, 
        `${componentName}-mount-end`);

      renderTimes.current.push(renderTime);
      
      // Keep only last 10 render times
      if (renderTimes.current.length > 10) {
        renderTimes.current.shift();
      }

      const times = renderTimes.current;
      const average = times.reduce((sum, time) => sum + time, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);

      setRenderMetrics({
        renderCount: times.length,
        averageRenderTime: Math.round(average),
        maxRenderTime: Math.round(max),
        minRenderTime: Math.round(min)
      });
    }
  });

  return renderMetrics;
}

/**
 * Hook for monitoring API performance
 */
export function useAPIPerformance() {
  const [apiMetrics, setApiMetrics] = useState([]);
  const [averageResponseTime, setAverageResponseTime] = useState(0);

  const trackAPICall = useCallback(async (apiCall, endpoint) => {
    const startTime = performance.now();
    PerformanceTracker.mark(`${endpoint}-start`);

    try {
      const result = await apiCall();
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      PerformanceTracker.mark(`${endpoint}-end`);
      PerformanceTracker.measure(`${endpoint}-duration`, 
        `${endpoint}-start`, 
        `${endpoint}-end`);

      const metric = {
        endpoint,
        responseTime: Math.round(responseTime),
        timestamp: new Date().toISOString(),
        success: true
      };

      setApiMetrics(prev => {
        const updated = [...prev, metric];
        // Keep only last 20 API calls
        if (updated.length > 20) {
          updated.shift();
        }
        return updated;
      });

      // Update average response time
      setAverageResponseTime(prev => {
        const allTimes = [...apiMetrics, metric].map(m => m.responseTime);
        return Math.round(allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length);
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const metric = {
        endpoint,
        responseTime: Math.round(responseTime),
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      };

      setApiMetrics(prev => [...prev, metric]);
      throw error;
    }
  }, [apiMetrics]);

  return {
    apiMetrics,
    averageResponseTime,
    trackAPICall
  };
}

/**
 * Hook for monitoring user interactions
 */
export function useInteractionPerformance() {
  const [interactionMetrics, setInteractionMetrics] = useState({});
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (!isTracking) return;

    const trackInteraction = (event) => {
      const startTime = performance.now();
      
      // Track click, keydown, scroll events
      if (['click', 'keydown', 'scroll'].includes(event.type)) {
        const metric = {
          type: event.type,
          target: event.target.tagName,
          timestamp: startTime,
          delay: 0 // Will be updated when interaction completes
        };

        // Measure interaction delay
        requestAnimationFrame(() => {
          const endTime = performance.now();
          const delay = endTime - startTime;
          
          setInteractionMetrics(prev => ({
            ...prev,
            [event.type]: {
              ...prev[event.type],
              count: (prev[event.type]?.count || 0) + 1,
              totalDelay: (prev[event.type]?.totalDelay || 0) + delay,
              averageDelay: ((prev[event.type]?.totalDelay || 0) + delay) / 
                           ((prev[event.type]?.count || 0) + 1)
            }
          }));
        });
      }
    };

    document.addEventListener('click', trackInteraction);
    document.addEventListener('keydown', trackInteraction);
    document.addEventListener('scroll', trackInteraction);

    return () => {
      document.removeEventListener('click', trackInteraction);
      document.removeEventListener('keydown', trackInteraction);
      document.removeEventListener('scroll', trackInteraction);
    };
  }, [isTracking]);

  const startTracking = useCallback(() => {
    setIsTracking(true);
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  return {
    interactionMetrics,
    startTracking,
    stopTracking,
    isTracking
  };
}

// Export all hooks
export {
  usePerformanceMonitor,
  useWebVitals,
  useNetworkPerformance,
  useMemoryUsage,
  useRenderPerformance,
  useAPIPerformance,
  useInteractionPerformance
};
