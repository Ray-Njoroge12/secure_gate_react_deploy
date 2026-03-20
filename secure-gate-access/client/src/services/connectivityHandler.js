/**
 * Enhanced Connectivity Handler
 * 
 * Network error detection and user guidance for connectivity issues
 * Requirement 7.5: Network error detection and user guidance for connectivity issues
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import errorQueueService from './errorQueueService.js';
import retryMechanismService from './retryMechanismService.js';

// Connection types
export const CONNECTION_TYPES = {
  ETHERNET: 'ethernet',
  WIFI: 'wifi',
  CELLULAR: 'cellular',
  BLUETOOTH: 'bluetooth',
  UNKNOWN: 'unknown'
};

// Connection quality levels
export const CONNECTION_QUALITY = {
  EXCELLENT: 'excellent',  // < 50ms RTT, > 10 Mbps
  GOOD: 'good',           // < 100ms RTT, > 5 Mbps
  FAIR: 'fair',           // < 200ms RTT, > 1 Mbps
  POOR: 'poor',           // < 500ms RTT, > 0.5 Mbps
  VERY_POOR: 'very_poor', // > 500ms RTT, < 0.5 Mbps
  OFFLINE: 'offline'      // No connection
};

// Network error types
export const NETWORK_ERROR_TYPES = {
  OFFLINE: 'offline',
  TIMEOUT: 'timeout',
  DNS_FAILURE: 'dns_failure',
  SSL_ERROR: 'ssl_error',
  SERVER_UNREACHABLE: 'server_unreachable',
  RATE_LIMITED: 'rate_limited',
  PROXY_ERROR: 'proxy_error',
  CORS_ERROR: 'cors_error'
};

class ConnectivityHandler {
  constructor() {
    this.isOnline = navigator.onLine;
    this.connectionInfo = this.getConnectionInfo();
    this.connectionQuality = CONNECTION_QUALITY.UNKNOWN;
    this.networkHistory = [];
    this.activeConnectivityIssues = new Map();
    this.connectivityCallbacks = new Set();
    this.performanceMetrics = {
      rtt: [],
      bandwidth: [],
      packetLoss: 0,
      jitter: 0
    };
    
    this._intervals = [];

    this.config = {
      healthCheckUrl: '/api/health',
      healthCheckInterval: 30000, // 30 seconds
      performanceTestInterval: 60000, // 1 minute
      maxHistoryEntries: 100,
      rttThresholds: {
        excellent: 50,
        good: 100,
        fair: 200,
        poor: 500
      },
      bandwidthThresholds: {
        excellent: 10, // Mbps
        good: 5,
        fair: 1,
        poor: 0.5
      }
    };

    this.initializeConnectivityMonitoring();
  }

  /**
   * Initialize connectivity monitoring
   */
  initializeConnectivityMonitoring() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnlineEvent.bind(this));
    window.addEventListener('offline', this.handleOfflineEvent.bind(this));

    // Listen for connection changes
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', this.handleConnectionChange.bind(this));
    }

    // Start periodic health checks
    this.startHealthChecks();

    // Start performance monitoring
    this.startPerformanceMonitoring();

    // Listen for fetch errors
    this.interceptFetchErrors();

    logger.debug('[CONNECTIVITY] Connectivity handler initialized');
  }

  /**
   * Get current connection information
   */
  getConnectionInfo() {
    if ('connection' in navigator) {
      const conn = navigator.connection;
      return {
        type: conn.type || CONNECTION_TYPES.UNKNOWN,
        effectiveType: conn.effectiveType || '4g',
        downlink: conn.downlink || 10,
        rtt: conn.rtt || 100,
        saveData: conn.saveData || false
      };
    }

    return {
      type: CONNECTION_TYPES.UNKNOWN,
      effectiveType: '4g',
      downlink: 10,
      rtt: 100,
      saveData: false
    };
  }

  /**
   * Handle online event
   */
  handleOnlineEvent() {
    this.isOnline = true;
    this.connectionInfo = this.getConnectionInfo();
    
    this.recordNetworkEvent('online', {
      previousState: 'offline',
      connectionInfo: this.connectionInfo
    });

    // Clear offline issues
    this.resolveConnectivityIssue('offline');

    // Show connection restored notification
    this.showConnectivityNotification({
      type: 'success',
      title: 'Connection Restored',
      message: 'Your internet connection has been restored.',
      guidance: 'All features are now available. Any pending actions will be retried automatically.',
      autoClose: true,
      autoCloseDelay: 5000
    });

    // Trigger retry for failed operations
    retryMechanismService.retryFailedOperations('connectivity_restored');

    // Notify callbacks
    this.notifyCallbacks('online', { connectionInfo: this.connectionInfo });

    logger.info('[CONNECTIVITY] Connection restored');
  }

  /**
   * Handle offline event
   */
  handleOfflineEvent() {
    this.isOnline = false;
    this.connectionQuality = CONNECTION_QUALITY.OFFLINE;
    
    this.recordNetworkEvent('offline', {
      previousState: 'online',
      lastConnectionInfo: this.connectionInfo
    });

    // Create offline connectivity issue
    this.createConnectivityIssue('offline', {
      type: NETWORK_ERROR_TYPES.OFFLINE,
      severity: 'high',
      message: 'No internet connection detected',
      guidance: this.getOfflineGuidance(),
      persistent: true
    });

    // Notify callbacks
    this.notifyCallbacks('offline', { 
      lastConnectionInfo: this.connectionInfo 
    });

    logger.warn('[CONNECTIVITY] Connection lost');
  }

  /**
   * Handle connection change
   */
  handleConnectionChange() {
    const previousInfo = { ...this.connectionInfo };
    this.connectionInfo = this.getConnectionInfo();
    
    this.recordNetworkEvent('connection_change', {
      previousInfo,
      newInfo: this.connectionInfo
    });

    // Assess connection quality
    this.assessConnectionQuality();

    // Check if connection quality significantly changed
    const qualityChanged = this.hasSignificantQualityChange(previousInfo, this.connectionInfo);
    
    if (qualityChanged) {
      this.handleConnectionQualityChange();
    }

    // Notify callbacks
    this.notifyCallbacks('connection_change', {
      previousInfo,
      newInfo: this.connectionInfo,
      quality: this.connectionQuality
    });

    logger.debug('[CONNECTIVITY] Connection changed:', {
      from: previousInfo,
      to: this.connectionInfo,
      quality: this.connectionQuality
    });
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks() {
    const performHealthCheck = async () => {
      try {
        const startTime = performance.now();
        
        const response = await fetch(this.config.healthCheckUrl, {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        const endTime = performance.now();
        const rtt = endTime - startTime;

        if (response.ok) {
          this.recordSuccessfulHealthCheck(rtt);
          this.resolveConnectivityIssue('health_check_failed');
        } else {
          this.handleHealthCheckFailure(response.status, rtt);
        }

      } catch (error) {
        this.handleHealthCheckError(error);
      }
    };

    // Initial health check
    performHealthCheck();

    // Set up periodic checks
    this._intervals.push(setInterval(performHealthCheck, this.config.healthCheckInterval));
  }

  /**
   * Record successful health check
   */
  recordSuccessfulHealthCheck(rtt) {
    this.performanceMetrics.rtt.push(rtt);
    
    // Keep only recent RTT measurements
    if (this.performanceMetrics.rtt.length > 50) {
      this.performanceMetrics.rtt.shift();
    }

    // Update connection quality based on RTT
    this.assessConnectionQuality();

    this.recordNetworkEvent('health_check_success', { rtt });
  }

  /**
   * Handle health check failure
   */
  handleHealthCheckFailure(status, rtt) {
    const errorType = this.classifyHttpError(status);
    
    this.createConnectivityIssue('health_check_failed', {
      type: errorType,
      severity: 'medium',
      message: `Server responded with status ${status}`,
      guidance: this.getHttpErrorGuidance(status),
      details: { status, rtt }
    });

    this.recordNetworkEvent('health_check_failure', { status, rtt, errorType });
  }

  /**
   * Handle health check error
   */
  handleHealthCheckError(error) {
    const errorType = this.classifyNetworkError(error);
    
    this.createConnectivityIssue('health_check_error', {
      type: errorType,
      severity: errorType === NETWORK_ERROR_TYPES.OFFLINE ? 'high' : 'medium',
      message: this.getNetworkErrorMessage(errorType),
      guidance: this.getNetworkErrorGuidance(errorType),
      details: { 
        errorName: error.name,
        errorMessage: error.message 
      }
    });

    this.recordNetworkEvent('health_check_error', { 
      errorType, 
      errorName: error.name,
      errorMessage: error.message 
    });
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    const performPerformanceTest = async () => {
      if (!this.isOnline) return;

      try {
        // Test download speed with a small resource
        const testUrl = '/api/health?test=performance';
        const startTime = performance.now();
        
        const response = await fetch(testUrl, {
          cache: 'no-cache',
          signal: AbortSignal.timeout(15000)
        });

        const endTime = performance.now();
        const rtt = endTime - startTime;
        
        if (response.ok) {
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            const bytes = parseInt(contentLength);
            const seconds = rtt / 1000;
            const bandwidth = (bytes * 8) / (seconds * 1000000); // Mbps
            
            this.performanceMetrics.bandwidth.push(bandwidth);
            
            // Keep only recent measurements
            if (this.performanceMetrics.bandwidth.length > 20) {
              this.performanceMetrics.bandwidth.shift();
            }
          }

          this.assessConnectionQuality();
        }

      } catch (error) {
        logger.debug('[CONNECTIVITY] Performance test failed:', error);
      }
    };

    // Run performance test periodically
    this._intervals.push(setInterval(performPerformanceTest, this.config.performanceTestInterval));
  }

  /**
   * Assess connection quality
   */
  assessConnectionQuality() {
    if (!this.isOnline) {
      this.connectionQuality = CONNECTION_QUALITY.OFFLINE;
      return;
    }

    const avgRtt = this.getAverageRtt();
    const avgBandwidth = this.getAverageBandwidth();

    // Determine quality based on RTT and bandwidth
    if (avgRtt < this.config.rttThresholds.excellent && 
        avgBandwidth > this.config.bandwidthThresholds.excellent) {
      this.connectionQuality = CONNECTION_QUALITY.EXCELLENT;
    } else if (avgRtt < this.config.rttThresholds.good && 
               avgBandwidth > this.config.bandwidthThresholds.good) {
      this.connectionQuality = CONNECTION_QUALITY.GOOD;
    } else if (avgRtt < this.config.rttThresholds.fair && 
               avgBandwidth > this.config.bandwidthThresholds.fair) {
      this.connectionQuality = CONNECTION_QUALITY.FAIR;
    } else if (avgRtt < this.config.rttThresholds.poor && 
               avgBandwidth > this.config.bandwidthThresholds.poor) {
      this.connectionQuality = CONNECTION_QUALITY.POOR;
    } else {
      this.connectionQuality = CONNECTION_QUALITY.VERY_POOR;
    }
  }

  /**
   * Get average RTT
   */
  getAverageRtt() {
    if (this.performanceMetrics.rtt.length === 0) {
      return this.connectionInfo.rtt || 100;
    }

    const sum = this.performanceMetrics.rtt.reduce((a, b) => a + b, 0);
    return sum / this.performanceMetrics.rtt.length;
  }

  /**
   * Get average bandwidth
   */
  getAverageBandwidth() {
    if (this.performanceMetrics.bandwidth.length === 0) {
      return this.connectionInfo.downlink || 10;
    }

    const sum = this.performanceMetrics.bandwidth.reduce((a, b) => a + b, 0);
    return this.performanceMetrics.bandwidth.length > 0 ? sum / this.performanceMetrics.bandwidth.length : 0;
  }

  /**
   * Check if connection quality significantly changed
   */
  hasSignificantQualityChange(previousInfo, newInfo) {
    const rttChange = Math.abs((newInfo.rtt || 100) - (previousInfo.rtt || 100));
    const bandwidthChange = Math.abs((newInfo.downlink || 10) - (previousInfo.downlink || 10));
    
    return rttChange > 100 || bandwidthChange > 2; // Significant thresholds
  }

  /**
   * Handle connection quality change
   */
  handleConnectionQualityChange() {
    const qualityInfo = this.getConnectionQualityInfo();
    
    if (this.connectionQuality === CONNECTION_QUALITY.POOR || 
        this.connectionQuality === CONNECTION_QUALITY.VERY_POOR) {
      
      this.createConnectivityIssue('poor_connection', {
        type: NETWORK_ERROR_TYPES.TIMEOUT,
        severity: 'medium',
        message: qualityInfo.message,
        guidance: qualityInfo.guidance,
        autoResolve: true,
        autoResolveDelay: 60000 // Auto-resolve after 1 minute
      });
    } else {
      this.resolveConnectivityIssue('poor_connection');
    }
  }

  /**
   * Get connection quality information
   */
  getConnectionQualityInfo() {
    const avgRtt = this.getAverageRtt();
    const avgBandwidth = this.getAverageBandwidth();

    switch (this.connectionQuality) {
      case CONNECTION_QUALITY.EXCELLENT:
        return {
          message: 'Excellent connection quality detected.',
          guidance: 'All features are available with optimal performance.'
        };
      case CONNECTION_QUALITY.GOOD:
        return {
          message: 'Good connection quality detected.',
          guidance: 'All features are available with good performance.'
        };
      case CONNECTION_QUALITY.FAIR:
        return {
          message: 'Fair connection quality detected.',
          guidance: 'Some features may load more slowly than usual.'
        };
      case CONNECTION_QUALITY.POOR:
        return {
          message: `Slow connection detected (${Math.round(avgRtt)}ms response time).`,
          guidance: 'We\'ve optimized the interface for your connection speed. Some features may be limited.'
        };
      case CONNECTION_QUALITY.VERY_POOR:
        return {
          message: `Very slow connection detected (${Math.round(avgRtt)}ms response time).`,
          guidance: 'We\'ve enabled data-saving mode. Only essential features are available.'
        };
      default:
        return {
          message: 'Connection quality unknown.',
          guidance: 'Monitoring connection performance...'
        };
    }
  }

  /**
   * Intercept fetch errors for better error handling
   */
  interceptFetchErrors() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Handle HTTP errors
        if (!response.ok) {
          this.handleFetchHttpError(response, args[0]);
        }
        
        return response;
      } catch (error) {
        this.handleFetchNetworkError(error, args[0]);
        throw error;
      }
    };
  }

  /**
   * Handle fetch HTTP errors
   */
  handleFetchHttpError(response, url) {
    const errorType = this.classifyHttpError(response.status);
    
    // Only create issues for server errors, not client errors
    if (response.status >= 500) {
      this.createConnectivityIssue(`http_error_${response.status}`, {
        type: errorType,
        severity: 'medium',
        message: `Server error: ${response.status} ${response.statusText}`,
        guidance: this.getHttpErrorGuidance(response.status),
        details: { 
          status: response.status,
          statusText: response.statusText,
          url: url.toString()
        },
        autoResolve: true,
        autoResolveDelay: 30000
      });
    }
  }

  /**
   * Handle fetch network errors
   */
  handleFetchNetworkError(error, url) {
    const errorType = this.classifyNetworkError(error);
    
    this.createConnectivityIssue(`network_error_${errorType}`, {
      type: errorType,
      severity: errorType === NETWORK_ERROR_TYPES.OFFLINE ? 'high' : 'medium',
      message: this.getNetworkErrorMessage(errorType),
      guidance: this.getNetworkErrorGuidance(errorType),
      details: {
        errorName: error.name,
        errorMessage: error.message,
        url: url.toString()
      },
      autoResolve: errorType !== NETWORK_ERROR_TYPES.OFFLINE,
      autoResolveDelay: 30000
    });
  }

  /**
   * Classify HTTP error
   */
  classifyHttpError(status) {
    if (status === 429) return NETWORK_ERROR_TYPES.RATE_LIMITED;
    if (status === 502 || status === 503 || status === 504) return NETWORK_ERROR_TYPES.SERVER_UNREACHABLE;
    if (status >= 500) return NETWORK_ERROR_TYPES.SERVER_UNREACHABLE;
    
    return NETWORK_ERROR_TYPES.SERVER_UNREACHABLE;
  }

  /**
   * Classify network error
   */
  classifyNetworkError(error) {
    const errorMessage = error.message.toLowerCase();
    
    if (error.name === 'AbortError' || errorMessage.includes('timeout')) {
      return NETWORK_ERROR_TYPES.TIMEOUT;
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return NETWORK_ERROR_TYPES.OFFLINE;
    }
    
    if (errorMessage.includes('dns') || errorMessage.includes('resolve')) {
      return NETWORK_ERROR_TYPES.DNS_FAILURE;
    }
    
    if (errorMessage.includes('ssl') || errorMessage.includes('certificate')) {
      return NETWORK_ERROR_TYPES.SSL_ERROR;
    }
    
    if (errorMessage.includes('cors')) {
      return NETWORK_ERROR_TYPES.CORS_ERROR;
    }
    
    if (errorMessage.includes('proxy')) {
      return NETWORK_ERROR_TYPES.PROXY_ERROR;
    }
    
    return NETWORK_ERROR_TYPES.SERVER_UNREACHABLE;
  }

  /**
   * Get network error message
   */
  getNetworkErrorMessage(errorType) {
    const messages = {
      [NETWORK_ERROR_TYPES.OFFLINE]: 'No internet connection detected',
      [NETWORK_ERROR_TYPES.TIMEOUT]: 'Request timed out',
      [NETWORK_ERROR_TYPES.DNS_FAILURE]: 'Unable to resolve server address',
      [NETWORK_ERROR_TYPES.SSL_ERROR]: 'Secure connection failed',
      [NETWORK_ERROR_TYPES.SERVER_UNREACHABLE]: 'Server is temporarily unavailable',
      [NETWORK_ERROR_TYPES.RATE_LIMITED]: 'Too many requests - please wait',
      [NETWORK_ERROR_TYPES.PROXY_ERROR]: 'Proxy connection failed',
      [NETWORK_ERROR_TYPES.CORS_ERROR]: 'Cross-origin request blocked'
    };
    
    return messages[errorType] || 'Network error occurred';
  }

  /**
   * Get network error guidance
   */
  getNetworkErrorGuidance(errorType) {
    const guidance = {
      [NETWORK_ERROR_TYPES.OFFLINE]: this.getOfflineGuidance(),
      [NETWORK_ERROR_TYPES.TIMEOUT]: 'The request took too long to complete. Check your connection speed and try again.',
      [NETWORK_ERROR_TYPES.DNS_FAILURE]: 'Unable to find the server. Check your DNS settings or try using a different network.',
      [NETWORK_ERROR_TYPES.SSL_ERROR]: 'Secure connection could not be established. Check your system date/time and try again.',
      [NETWORK_ERROR_TYPES.SERVER_UNREACHABLE]: 'The server is temporarily unavailable. Please try again in a few minutes.',
      [NETWORK_ERROR_TYPES.RATE_LIMITED]: 'You\'ve made too many requests. Please wait a moment before trying again.',
      [NETWORK_ERROR_TYPES.PROXY_ERROR]: 'Proxy connection failed. Check your proxy settings or try without a proxy.',
      [NETWORK_ERROR_TYPES.CORS_ERROR]: 'Request blocked by browser security. This is likely a temporary server issue.'
    };
    
    return guidance[errorType] || 'Please check your internet connection and try again.';
  }

  /**
   * Get HTTP error guidance
   */
  getHttpErrorGuidance(status) {
    if (status === 429) {
      return 'You\'ve made too many requests. Please wait a moment before trying again.';
    } else if (status >= 500 && status < 600) {
      return 'The server is experiencing issues. Please try again in a few minutes.';
    } else if (status === 502 || status === 503 || status === 504) {
      return 'The server is temporarily unavailable. Please try again shortly.';
    }
    
    return 'A server error occurred. Please try again or contact support if the problem persists.';
  }

  /**
   * Get offline guidance
   */
  getOfflineGuidance() {
    return 'Check your internet connection. You can continue using some features offline, and your changes will sync when you\'re back online.';
  }

  /**
   * Create connectivity issue
   */
  createConnectivityIssue(issueId, issueInfo) {
    const issue = {
      id: issueId,
      ...issueInfo,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.activeConnectivityIssues.set(issueId, issue);

    // Show notification
    this.showConnectivityNotification({
      id: `connectivity_${issueId}`,
      type: this.getNotificationType(issueInfo.severity),
      title: 'Connection Issue',
      message: issueInfo.message,
      guidance: issueInfo.guidance,
      persistent: issueInfo.persistent || false,
      autoClose: !issueInfo.persistent,
      autoCloseDelay: 8000,
      actions: this.getConnectivityActions(issueInfo.type)
    });

    // Auto-resolve if configured
    if (issueInfo.autoResolve && issueInfo.autoResolveDelay) {
      setTimeout(() => {
        this.resolveConnectivityIssue(issueId);
      }, issueInfo.autoResolveDelay);
    }

    logger.warn('[CONNECTIVITY] Connectivity issue created:', {
      issueId,
      type: issueInfo.type,
      severity: issueInfo.severity
    });
  }

  /**
   * Resolve connectivity issue
   */
  resolveConnectivityIssue(issueId) {
    if (this.activeConnectivityIssues.has(issueId)) {
      const issue = this.activeConnectivityIssues.get(issueId);
      issue.resolved = true;
      issue.resolvedAt = new Date().toISOString();
      
      this.activeConnectivityIssues.delete(issueId);
      
      // Remove notification
      errorQueueService.removeError(`connectivity_${issueId}`);
      
      logger.info('[CONNECTIVITY] Connectivity issue resolved:', { issueId });
    }
  }

  /**
   * Show connectivity notification
   */
  showConnectivityNotification(notification) {
    errorQueueService.addError(notification);
  }

  /**
   * Get notification type based on severity
   */
  getNotificationType(severity) {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'warning';
    }
  }

  /**
   * Get connectivity actions
   */
  getConnectivityActions(errorType) {
    const actions = [];

    if (errorType === NETWORK_ERROR_TYPES.OFFLINE) {
      actions.push({
        type: 'check_connection',
        label: 'Check Connection',
        handler: () => this.testConnection()
      });
      
      actions.push({
        type: 'offline_mode',
        label: 'Continue Offline',
        handler: () => this.enableOfflineMode()
      });
    } else {
      actions.push({
        type: 'retry',
        label: 'Retry',
        handler: () => window.location.reload()
      });
      
      actions.push({
        type: 'check_connection',
        label: 'Test Connection',
        handler: () => this.testConnection()
      });
    }

    return actions;
  }

  /**
   * Test connection manually
   */
  async testConnection() {
    try {
      const startTime = performance.now();
      
      const response = await fetch(this.config.healthCheckUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(10000)
      });

      const endTime = performance.now();
      const rtt = endTime - startTime;

      if (response.ok) {
        this.showConnectivityNotification({
          id: 'connection_test_success',
          type: 'success',
          title: 'Connection Test Successful',
          message: `Connection is working (${Math.round(rtt)}ms response time).`,
          autoClose: true,
          autoCloseDelay: 5000
        });
        
        // Clear connectivity issues
        this.activeConnectivityIssues.clear();
        
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this.showConnectivityNotification({
        id: 'connection_test_failed',
        type: 'error',
        title: 'Connection Test Failed',
        message: `Unable to reach server: ${error.message}`,
        guidance: 'Please check your internet connection and try again.',
        autoClose: true,
        autoCloseDelay: 8000
      });
      
      return false;
    }
  }

  /**
   * Enable offline mode
   */
  enableOfflineMode() {
    // Notify other services about offline mode
    window.dispatchEvent(new CustomEvent('offlineModeEnabled', {
      detail: { timestamp: new Date().toISOString() }
    }));

    this.showConnectivityNotification({
      id: 'offline_mode_enabled',
      type: 'info',
      title: 'Offline Mode Enabled',
      message: 'You can continue using available features offline.',
      guidance: 'Your changes will be saved and synced when you\'re back online.',
      autoClose: true,
      autoCloseDelay: 5000
    });

    logger.info('[CONNECTIVITY] Offline mode enabled');
  }

  /**
   * Record network event
   */
  recordNetworkEvent(type, data = {}) {
    const event = {
      id: uuidv4(),
      type,
      timestamp: new Date().toISOString(),
      connectionInfo: this.connectionInfo,
      connectionQuality: this.connectionQuality,
      isOnline: this.isOnline,
      ...data
    };

    this.networkHistory.push(event);

    // Keep history size manageable
    if (this.networkHistory.length > this.config.maxHistoryEntries) {
      this.networkHistory.shift();
    }

    logger.debug('[CONNECTIVITY] Network event recorded:', {
      type,
      quality: this.connectionQuality,
      isOnline: this.isOnline
    });
  }

  /**
   * Register connectivity callback
   */
  onConnectivityChange(callback) {
    this.connectivityCallbacks.add(callback);
    
    return () => {
      this.connectivityCallbacks.delete(callback);
    };
  }

  /**
   * Notify all registered callbacks
   */
  notifyCallbacks(event, data) {
    this.connectivityCallbacks.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        logger.error('[CONNECTIVITY] Callback error:', error);
      }
    });
  }

  /**
   * Get current connectivity status
   */
  getConnectivityStatus() {
    return {
      isOnline: this.isOnline,
      connectionInfo: this.connectionInfo,
      connectionQuality: this.connectionQuality,
      activeIssues: Array.from(this.activeConnectivityIssues.values()),
      performanceMetrics: {
        averageRtt: this.getAverageRtt(),
        averageBandwidth: this.getAverageBandwidth(),
        ...this.performanceMetrics
      }
    };
  }

  /**
   * Get network history
   */
  getNetworkHistory() {
    return [...this.networkHistory];
  }

  /**
   * Clear network history
   */
  clearNetworkHistory() {
    this.networkHistory = [];
  }

  /**
   * Cleanup resources
   */
  destroy() {
    (this._intervals || []).forEach(id => clearInterval(id));
    this._intervals = [];

    window.removeEventListener('online', this.handleOnlineEvent);
    window.removeEventListener('offline', this.handleOfflineEvent);

    if ('connection' in navigator) {
      navigator.connection.removeEventListener('change', this.handleConnectionChange);
    }

    this.connectivityCallbacks.clear();
    this.activeConnectivityIssues.clear();

    logger.debug('[CONNECTIVITY] Connectivity handler destroyed');
  }
}

// Create singleton instance
const connectivityHandler = new ConnectivityHandler();

export default connectivityHandler;