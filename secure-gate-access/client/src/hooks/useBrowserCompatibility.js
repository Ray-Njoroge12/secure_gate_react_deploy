import { useState, useEffect } from 'react';
import logger from 'utils/logger';
import browserCompatibility from '../utils/browserCompatibility';

export const useBrowserCompatibility = () => {
  const [browserInfo, setBrowserInfo] = useState(null);
  const [capabilities, setCapabilities] = useState(null);
  const [issues, setIssues] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeCompatibility = () => {
      try {
        const info = browserCompatibility.getBrowserInfo();
        const caps = browserCompatibility.getCapabilities();
        const browserIssues = browserCompatibility.getKnownIssues();
        const browserRecommendations = browserCompatibility.getRecommendations();

        setBrowserInfo(info);
        setCapabilities(caps);
        setIssues(browserIssues);
        setRecommendations(browserRecommendations);

        // Apply browser-specific fixes
        browserCompatibility.applyBrowserFixes();

        // Add browser classes to document
        const classes = browserCompatibility.getBrowserClasses();
        document.documentElement.classList.add(...classes);

        setIsLoading(false);
      } catch (error) {
        logger.error('Browser compatibility initialization failed:', error);
        setIsLoading(false);
      }
    };

    initializeCompatibility();
  }, []);

  // Check if a specific feature is supported
  const supportsFeature = (feature) => {
    if (!capabilities) return false;
    return capabilities.features[feature] || false;
  };

  // Check if browser meets minimum requirements
  const meetsRequirements = () => {
    if (!capabilities) return false;
    return capabilities.meetsRequirements;
  };

  // Get browser-specific CSS classes
  const getBrowserClasses = () => {
    if (!browserInfo) return [];
    return browserCompatibility.getBrowserClasses();
  };

  // Get issues by severity
  const getIssuesBySeverity = (severity) => {
    return issues.filter(issue => issue.type === severity);
  };

  // Get recommendations by type
  const getRecommendationsByType = (type) => {
    return recommendations.filter(rec => rec.type === type);
  };

  // Check if there are critical issues
  const hasCriticalIssues = () => {
    return issues.some(issue => issue.type === 'error');
  };

  // Check if there are warnings
  const hasWarnings = () => {
    return issues.some(issue => issue.type === 'warning');
  };

  // Get browser performance level
  const getPerformanceLevel = () => {
    if (!capabilities) return 'unknown';
    
    const { features } = capabilities;
    if (features.hardwareConcurrency) {
      const cores = navigator.hardwareConcurrency;
      if (cores >= 8) return 'high';
      if (cores >= 4) return 'medium';
      return 'low';
    }
    
    return 'unknown';
  };

  // Get memory level
  const getMemoryLevel = () => {
    if (!capabilities) return 'unknown';
    
    const { features } = capabilities;
    if (features.deviceMemory) {
      const memory = navigator.deviceMemory;
      if (memory >= 8) return 'high';
      if (memory >= 4) return 'medium';
      return 'low';
    }
    
    return 'unknown';
  };

  // Get network quality
  const getNetworkQuality = () => {
    if (!capabilities) return 'unknown';
    
    const { features } = capabilities;
    if (features.networkInfo && navigator.connection) {
      const connection = navigator.connection;
      const effectiveType = connection.effectiveType;
      
      switch (effectiveType) {
        case '4g':
          return 'excellent';
        case '3g':
          return 'good';
        case '2g':
          return 'poor';
        case 'slow-2g':
          return 'very-poor';
        default:
          return 'unknown';
      }
    }
    
    return 'unknown';
  };

  // Get browser-specific recommendations
  const getBrowserSpecificRecommendations = () => {
    if (!browserInfo) return [];
    
    const { browser, version } = browserInfo;
    const recs = [];
    
    // Chrome recommendations
    if (browser === 'chrome') {
      if (parseFloat(version) < 90) {
        recs.push({
          type: 'update',
          message: 'Chrome version is outdated. Please update to version 90 or later.',
          priority: 'high'
        });
      }
    }
    
    // Firefox recommendations
    if (browser === 'firefox') {
      if (parseFloat(version) < 88) {
        recs.push({
          type: 'update',
          message: 'Firefox version is outdated. Please update to version 88 or later.',
          priority: 'high'
        });
      }
    }
    
    // Safari recommendations
    if (browser === 'safari') {
      if (parseFloat(version) < 14) {
        recs.push({
          type: 'update',
          message: 'Safari version is outdated. Please update to version 14 or later.',
          priority: 'high'
        });
      }
    }
    
    // Edge recommendations
    if (browser === 'edge') {
      if (parseFloat(version) < 90) {
        recs.push({
          type: 'update',
          message: 'Edge version is outdated. Please update to version 90 or later.',
          priority: 'high'
        });
      }
    }
    
    // IE recommendations
    if (browser === 'ie') {
      recs.push({
        type: 'browser',
        message: 'Internet Explorer is not supported. Please use a modern browser.',
        priority: 'critical'
      });
    }
    
    return recs;
  };

  // Get performance recommendations
  const getPerformanceRecommendations = () => {
    const recs = [];
    const performanceLevel = getPerformanceLevel();
    const memoryLevel = getMemoryLevel();
    const networkQuality = getNetworkQuality();
    
    // Performance recommendations
    if (performanceLevel === 'low') {
      recs.push({
        type: 'performance',
        message: 'Your device has limited processing power. Some features may be slower.',
        suggestion: 'Consider closing other applications to improve performance.'
      });
    }
    
    // Memory recommendations
    if (memoryLevel === 'low') {
      recs.push({
        type: 'memory',
        message: 'Your device has limited memory. Some features may not work optimally.',
        suggestion: 'Consider closing other browser tabs to free up memory.'
      });
    }
    
    // Network recommendations
    if (networkQuality === 'poor' || networkQuality === 'very-poor') {
      recs.push({
        type: 'network',
        message: 'Your connection is slow. Some features may load slowly.',
        suggestion: 'Consider using a faster internet connection for better experience.'
      });
    }
    
    return recs;
  };

  // Get all recommendations
  const getAllRecommendations = () => {
    return [
      ...getBrowserSpecificRecommendations(),
      ...getPerformanceRecommendations(),
      ...recommendations
    ];
  };

  // Check if browser is supported
  const isSupported = () => {
    return meetsRequirements() && !hasCriticalIssues();
  };

  // Get browser status
  const getBrowserStatus = () => {
    if (isLoading) return 'loading';
    if (hasCriticalIssues()) return 'error';
    if (hasWarnings()) return 'warning';
    if (isSupported()) return 'success';
    return 'error';
  };

  // Get status message
  const getStatusMessage = () => {
    const status = getBrowserStatus();
    
    switch (status) {
      case 'loading':
        return 'Checking browser compatibility...';
      case 'error':
        return 'Your browser is not supported. Please use a modern browser.';
      case 'warning':
        return 'Your browser has some compatibility issues. Some features may not work correctly.';
      case 'success':
        return 'Your browser is fully supported.';
      default:
        return 'Browser compatibility check failed.';
    }
  };

  return {
    // State
    browserInfo,
    capabilities,
    issues,
    recommendations,
    isLoading,
    
    // Computed values
    isSupported: isSupported(),
    browserStatus: getBrowserStatus(),
    statusMessage: getStatusMessage(),
    hasCriticalIssues: hasCriticalIssues(),
    hasWarnings: hasWarnings(),
    performanceLevel: getPerformanceLevel(),
    memoryLevel: getMemoryLevel(),
    networkQuality: getNetworkQuality(),
    
    // Methods
    supportsFeature,
    meetsRequirements,
    getBrowserClasses,
    getIssuesBySeverity,
    getRecommendationsByType,
    getBrowserSpecificRecommendations,
    getPerformanceRecommendations,
    getAllRecommendations
  };
};

export default useBrowserCompatibility;

