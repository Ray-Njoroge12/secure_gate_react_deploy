/**
 * @fileoverview Network Condition Monitor Component
 * @description Monitors network conditions and provides graceful degradation
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useContext, createContext } from 'react';
import performanceService from '../../services/performanceService.js';
import logger from '../../utils/logger.js';
import './NetworkConditionMonitor.css';
import Button from '../ui/Button';

// Network Context
const NetworkContext = createContext({
  isOnline: true,
  connectionType: 'unknown',
  effectiveType: '4g',
  downlink: 10,
  rtt: 100,
  saveData: false,
  performanceLevel: 'high',
  degradationLevel: 'none'
});

/**
 * Network Condition Provider
 */
export const NetworkProvider = ({ children }) => {
  const [networkState, setNetworkState] = useState({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false,
    performanceLevel: 'high',
    degradationLevel: 'none'
  });

  const [showNetworkBanner, setShowNetworkBanner] = useState(false);
  const [networkHistory, setNetworkHistory] = useState([]);

  useEffect(() => {
    initializeNetworkMonitoring();
    return () => cleanupNetworkMonitoring();
  }, []);

  /**
   * Initialize network monitoring
   */
  const initializeNetworkMonitoring = () => {
    // Monitor online/offline status
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor connection changes
    if ('connection' in navigator) {
      const connection = navigator.connection;
      connection.addEventListener('change', handleConnectionChange);
      
      // Initial connection state
      updateConnectionInfo(connection);
    }

    // Monitor network performance
    startNetworkPerformanceMonitoring();
    
    logger.debug('[NETWORK] Network monitoring initialized');
  };

  /**
   * Cleanup network monitoring
   */
  const cleanupNetworkMonitoring = () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);

    if ('connection' in navigator) {
      navigator.connection.removeEventListener('change', handleConnectionChange);
    }
  };

  /**
   * Handle online event
   */
  const handleOnline = () => {
    setNetworkState(prev => ({ ...prev, isOnline: true }));
    setShowNetworkBanner(true);
    
    // Auto-hide banner after 3 seconds
    setTimeout(() => setShowNetworkBanner(false), 3000);
    
    recordNetworkEvent('online');
    logger.info('[NETWORK] Connection restored');
  };

  /**
   * Handle offline event
   */
  const handleOffline = () => {
    setNetworkState(prev => ({ 
      ...prev, 
      isOnline: false,
      degradationLevel: 'offline'
    }));
    setShowNetworkBanner(true);
    
    recordNetworkEvent('offline');
    logger.warn('[NETWORK] Connection lost');
  };

  /**
   * Handle connection change
   */
  const handleConnectionChange = () => {
    if ('connection' in navigator) {
      updateConnectionInfo(navigator.connection);
    }
  };

  /**
   * Update connection information
   */
  const updateConnectionInfo = (connection) => {
    const newState = {
      connectionType: connection.type || 'unknown',
      effectiveType: connection.effectiveType || '4g',
      downlink: connection.downlink || 10,
      rtt: connection.rtt || 100,
      saveData: connection.saveData || false
    };

    // Determine performance level and degradation
    const { performanceLevel, degradationLevel } = determinePerformanceLevel(newState);
    
    setNetworkState(prev => ({
      ...prev,
      ...newState,
      performanceLevel,
      degradationLevel
    }));

    // Show banner for significant changes
    if (degradationLevel !== 'none') {
      setShowNetworkBanner(true);
      setTimeout(() => setShowNetworkBanner(false), 5000);
    }

    recordNetworkEvent('change', newState);
    
    // Notify performance service
    performanceService.adjustPerformanceSettings(newState);
  };

  /**
   * Determine performance level based on connection
   */
  const determinePerformanceLevel = (connectionInfo) => {
    const { effectiveType, downlink, rtt, saveData } = connectionInfo;
    
    let performanceLevel = 'high';
    let degradationLevel = 'none';

    if (saveData) {
      performanceLevel = 'low';
      degradationLevel = 'data-saver';
    } else if (effectiveType === 'slow-2g') {
      performanceLevel = 'low';
      degradationLevel = 'severe';
    } else if (effectiveType === '2g') {
      performanceLevel = 'low';
      degradationLevel = 'high';
    } else if (effectiveType === '3g' || downlink < 1.5 || rtt > 300) {
      performanceLevel = 'medium';
      degradationLevel = 'moderate';
    } else if (rtt > 150 || downlink < 5) {
      performanceLevel = 'medium';
      degradationLevel = 'mild';
    }

    return { performanceLevel, degradationLevel };
  };

  /**
   * Start network performance monitoring
   */
  const startNetworkPerformanceMonitoring = () => {
    // Monitor actual network performance through API calls
    const monitorPerformance = async () => {
      try {
        const startTime = performance.now();
        const response = await fetch('/api/health', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        const endTime = performance.now();
        
        const actualRtt = endTime - startTime;
        
        // Update performance metrics
        performanceService.recordMetric('network_performance', {
          rtt: actualRtt,
          success: response.ok,
          timestamp: Date.now()
        });

        // Adjust degradation based on actual performance
        if (actualRtt > 2000) {
          setNetworkState(prev => ({
            ...prev,
            degradationLevel: 'severe'
          }));
        } else if (actualRtt > 1000) {
          setNetworkState(prev => ({
            ...prev,
            degradationLevel: 'moderate'
          }));
        }
        
      } catch (error) {
        // Network error - likely offline or very poor connection
        setNetworkState(prev => ({
          ...prev,
          degradationLevel: 'severe'
        }));
      }
    };

    // Monitor every 30 seconds
    const intervalId = setInterval(monitorPerformance, 30000);
    
    // Initial check
    monitorPerformance();
    
    return () => clearInterval(intervalId);
  };

  /**
   * Record network event
   */
  const recordNetworkEvent = (type, data = {}) => {
    const event = {
      type,
      timestamp: Date.now(),
      ...data
    };

    setNetworkHistory(prev => {
      const newHistory = [...prev, event];
      // Keep only last 50 events
      return newHistory.slice(-50);
    });

    performanceService.recordMetric('network_events', event);
  };

  return (
    <NetworkContext.Provider value={networkState}>
      {children}
      {showNetworkBanner && (
        <NetworkBanner 
          networkState={networkState}
          onDismiss={() => setShowNetworkBanner(false)}
        />
      )}
    </NetworkContext.Provider>
  );
};

/**
 * Network Banner Component
 */
const NetworkBanner = ({ networkState, onDismiss }) => {
  const { isOnline, degradationLevel, effectiveType } = networkState;

  const getBannerConfig = () => {
    if (!isOnline) {
      return {
        type: 'offline',
        icon: '📡',
        title: 'You\'re offline',
        message: 'Some features may not be available. We\'ll sync your changes when you\'re back online.',
        className: 'network-banner--offline'
      };
    }

    switch (degradationLevel) {
      case 'severe':
        return {
          type: 'severe',
          icon: '🐌',
          title: 'Slow connection detected',
          message: 'We\'ve optimized the experience for your connection speed.',
          className: 'network-banner--severe'
        };
      case 'high':
        return {
          type: 'high',
          icon: '⚠️',
          title: 'Limited connectivity',
          message: 'Some features are disabled to improve performance.',
          className: 'network-banner--high'
        };
      case 'moderate':
        return {
          type: 'moderate',
          icon: '📶',
          title: 'Optimizing for your connection',
          message: 'We\'ve adjusted settings to work better on your network.',
          className: 'network-banner--moderate'
        };
      case 'data-saver':
        return {
          type: 'data-saver',
          icon: '💾',
          title: 'Data saver mode active',
          message: 'Reduced data usage mode is enabled.',
          className: 'network-banner--data-saver'
        };
      default:
        return {
          type: 'online',
          icon: '✅',
          title: 'Connection restored',
          message: 'All features are now available.',
          className: 'network-banner--online'
        };
    }
  };

  const config = getBannerConfig();

  return (
    <div className={`network-banner ${config.className}`}>
      <div className="network-banner__content">
        <span className="network-banner__icon">{config.icon}</span>
        <div className="network-banner__text">
          <div className="network-banner__title">{config.title}</div>
          <div className="network-banner__message">{config.message}</div>
        </div>
      </div>
      <Button 
        className="network-banner__dismiss"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        ×
      </Button>
    </div>
  );
};

/**
 * Hook to use network context
 */
export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

/**
 * Hook for network-aware components
 */
export const useNetworkAware = (options = {}) => {
  const network = useNetwork();
  const {
    disableOnOffline = false,
    reduceOnSlow = true,
    showOfflineMessage = true
  } = options;

  const shouldDisable = disableOnOffline && !network.isOnline;
  const shouldReduce = reduceOnSlow && ['severe', 'high'].includes(network.degradationLevel);
  
  return {
    ...network,
    shouldDisable,
    shouldReduce,
    showOfflineMessage: showOfflineMessage && !network.isOnline,
    isSlowConnection: ['severe', 'high', 'moderate'].includes(network.degradationLevel)
  };
};

/**
 * Higher-order component for network-aware components
 */
export const withNetworkAwareness = (WrappedComponent, options = {}) => {
  return function NetworkAwareComponent(props) {
    const networkProps = useNetworkAware(options);
    
    return (
      <WrappedComponent 
        {...props} 
        network={networkProps}
      />
    );
  };
};

export default NetworkProvider;