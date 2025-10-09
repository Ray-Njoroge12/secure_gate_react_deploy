/**
 * @fileoverview Performance Monitoring Hook
 * @description React hook for monitoring component performance and runtime metrics
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import { useEffect, useRef, useCallback } from 'react';
import performanceMonitor from '../utils/performanceMonitor';
import logger from 'utils/logger';

/**
 * Hook for monitoring component performance
 * @param {string} componentName - Name of the component
 * @param {Object} options - Monitoring options
 * @returns {Object} Performance monitoring utilities
 */
export const usePerformanceMonitoring = (componentName, options = {}) => {
  const {
    trackRenders = true,
    trackInteractions = true,
    trackMemory = false,
    logSlowRenders = true,
    slowRenderThreshold = 100
  } = options;

  const renderStartTime = useRef(null);
  const renderCount = useRef(0);
  const lastRenderTime = useRef(0);

  // Track component render time
  useEffect(() => {
    if (!trackRenders) return;

    const startTime = performance.now();
    renderStartTime.current = startTime;
    renderCount.current += 1;

    return () => {
      if (renderStartTime.current) {
        const renderTime = performance.now() - renderStartTime.current;
        lastRenderTime.current = renderTime;
        
        performanceMonitor.recordComponentRender(componentName, renderTime);
        
        if (logSlowRenders && renderTime > slowRenderThreshold) {
          logger.warn(`[PERFORMANCE] Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
        }
      }
    };
  });

  // Track memory usage if enabled
  useEffect(() => {
    if (!trackMemory || !performance.memory) return;

    const interval = setInterval(() => {
      const memoryInfo = {
        component: componentName,
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        timestamp: Date.now()
      };
      
      logger.debug(`[PERFORMANCE] Memory usage for ${componentName}:`, memoryInfo);
    }, 5000);

    return () => clearInterval(interval);
  }, [componentName, trackMemory]);

  // Get performance metrics for this component
  const getComponentMetrics = useCallback(() => {
    return performanceMonitor.getComponentReport(componentName);
  }, [componentName]);

  // Get overall performance summary
  const getPerformanceSummary = useCallback(() => {
    return performanceMonitor.getPerformanceSummary();
  }, []);

  // Clear metrics for this component
  const clearComponentMetrics = useCallback(() => {
    performanceMonitor.metrics.componentRenderTimes.delete(componentName);
    logger.debug(`[PERFORMANCE] Cleared metrics for ${componentName}`);
  }, [componentName]);

  // Track user interaction
  const trackInteraction = useCallback((interactionType, event) => {
    if (!trackInteractions) return;

    performanceMonitor.recordInteraction(interactionType, event);
  }, [trackInteractions]);

  // Get render statistics
  const getRenderStats = useCallback(() => {
    const metrics = getComponentMetrics();
    if (!metrics) return null;

    return {
      component: componentName,
      renderCount: renderCount.current,
      lastRenderTime: lastRenderTime.current,
      averageRenderTime: metrics.average,
      slowRenders: metrics.slowRenders,
      performance: metrics.average < 50 ? 'excellent' : 
                  metrics.average < 100 ? 'good' : 
                  metrics.average < 200 ? 'fair' : 'poor'
    };
  }, [componentName, getComponentMetrics]);

  // Check if component is performing well
  const isPerformingWell = useCallback(() => {
    const stats = getRenderStats();
    if (!stats) return true;
    
    return stats.performance === 'excellent' || stats.performance === 'good';
  }, [getRenderStats]);

  // Get performance recommendations
  const getRecommendations = useCallback(() => {
    const stats = getRenderStats();
    if (!stats) return [];

    const recommendations = [];

    if (stats.average > 100) {
      recommendations.push('Consider optimizing component rendering');
    }

    if (stats.slowRenders > stats.renderCount * 0.1) {
      recommendations.push('High number of slow renders detected');
    }

    if (stats.renderCount > 100) {
      recommendations.push('Component re-renders frequently - check dependencies');
    }

    return recommendations;
  }, [getRenderStats]);

  return {
    // Metrics
    getComponentMetrics,
    getPerformanceSummary,
    getRenderStats,
    isPerformingWell,
    getRecommendations,
    
    // Actions
    trackInteraction,
    clearComponentMetrics,
    
    // State
    renderCount: renderCount.current,
    lastRenderTime: lastRenderTime.current
  };
};

/**
 * Hook for monitoring specific user interactions
 * @param {string} componentName - Name of the component
 * @param {Object} options - Monitoring options
 * @returns {Object} Interaction monitoring utilities
 */
export const useInteractionMonitoring = (componentName, options = {}) => {
  const {
    trackClicks = true,
    trackKeyPresses = true,
    trackScrolls = false,
    trackResizes = false
  } = options;

  const interactionCount = useRef(0);
  const lastInteraction = useRef(null);

  // Track clicks
  useEffect(() => {
    if (!trackClicks) return;

    const handleClick = (event) => {
      interactionCount.current += 1;
      lastInteraction.current = {
        type: 'click',
        target: event.target,
        timestamp: Date.now()
      };
      
      performanceMonitor.recordInteraction('click', event);
    };

    document.addEventListener('click', handleClick, { passive: true });
    return () => document.removeEventListener('click', handleClick);
  }, [trackClicks]);

  // Track key presses
  useEffect(() => {
    if (!trackKeyPresses) return;

    const handleKeyPress = (event) => {
      interactionCount.current += 1;
      lastInteraction.current = {
        type: 'keypress',
        key: event.key,
        timestamp: Date.now()
      };
      
      performanceMonitor.recordInteraction('keypress', event);
    };

    document.addEventListener('keydown', handleKeyPress, { passive: true });
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [trackKeyPresses]);

  // Track scrolls
  useEffect(() => {
    if (!trackScrolls) return;

    const handleScroll = (event) => {
      interactionCount.current += 1;
      lastInteraction.current = {
        type: 'scroll',
        timestamp: Date.now()
      };
      
      performanceMonitor.recordInteraction('scroll', event);
    };

    document.addEventListener('scroll', handleScroll, { passive: true });
    return () => document.removeEventListener('scroll', handleScroll);
  }, [trackScrolls]);

  // Track resizes
  useEffect(() => {
    if (!trackResizes) return;

    const handleResize = (event) => {
      interactionCount.current += 1;
      lastInteraction.current = {
        type: 'resize',
        timestamp: Date.now()
      };
      
      performanceMonitor.recordInteraction('resize', event);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [trackResizes]);

  const getInteractionStats = useCallback(() => {
    return {
      component: componentName,
      totalInteractions: interactionCount.current,
      lastInteraction: lastInteraction.current
    };
  }, [componentName]);

  return {
    getInteractionStats,
    interactionCount: interactionCount.current,
    lastInteraction: lastInteraction.current
  };
};

/**
 * Hook for monitoring memory usage
 * @param {string} componentName - Name of the component
 * @param {Object} options - Monitoring options
 * @returns {Object} Memory monitoring utilities
 */
export const useMemoryMonitoring = (componentName, options = {}) => {
  const {
    trackMemory = true,
    memoryCheckInterval = 5000,
    logMemoryUsage = false
  } = options;

  const memorySamples = useRef([]);
  const maxSamples = 20;

  useEffect(() => {
    if (!trackMemory || !performance.memory) return;

    const checkMemory = () => {
      const memoryInfo = {
        component: componentName,
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };

      memorySamples.current.push(memoryInfo);
      
      // Keep only recent samples
      if (memorySamples.current.length > maxSamples) {
        memorySamples.current.shift();
      }

      if (logMemoryUsage) {
        logger.debug(`[PERFORMANCE] Memory usage for ${componentName}:`, memoryInfo);
      }
    };

    const interval = setInterval(checkMemory, memoryCheckInterval);
    return () => clearInterval(interval);
  }, [componentName, trackMemory, memoryCheckInterval, logMemoryUsage]);

  const getMemoryStats = useCallback(() => {
    if (memorySamples.current.length === 0) return null;

    const samples = memorySamples.current;
    const used = samples.map(s => s.used);
    const total = samples.map(s => s.total);

    return {
      component: componentName,
      samples: samples.length,
      currentUsed: samples[samples.length - 1]?.used || 0,
      currentTotal: samples[samples.length - 1]?.total || 0,
      averageUsed: used.reduce((sum, val) => sum + val, 0) / used.length,
      averageTotal: total.reduce((sum, val) => sum + val, 0) / total.length,
      minUsed: Math.min(...used),
      maxUsed: Math.max(...used),
      trend: samples.length > 1 ? 
        (samples[samples.length - 1].used - samples[0].used) / samples.length : 0
    };
  }, [componentName]);

  const checkMemoryLeak = useCallback(() => {
    const stats = getMemoryStats();
    if (!stats || stats.samples < 5) return false;

    // Check if memory usage is consistently increasing
    const recentSamples = memorySamples.current.slice(-5);
    const isIncreasing = recentSamples.every((curr, index) => {
      if (index === 0) return true;
      return curr.used > recentSamples[index - 1].used;
    });

    return isIncreasing;
  }, [getMemoryStats]);

  return {
    getMemoryStats,
    checkMemoryLeak,
    memorySamples: memorySamples.current
  };
};

export default usePerformanceMonitoring;