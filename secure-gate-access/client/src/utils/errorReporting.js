// client/src/utils/errorReporting.js
import logger from './logger';

/**
 * Enhanced error reporting utility for production error tracking
 * Integrates with error reporting services and provides analytics
 */

class ErrorReporter {
  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'production';
    this.errorQueue = [];
    this.maxQueueSize = 50;
    this.flushInterval = 30000; // 30 seconds
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    
    // Start periodic flush if enabled
    if (this.isEnabled) {
      this.startPeriodicFlush();
    }
  }

  /**
   * Report an error to the error reporting service
   */
  async reportError(errorInfo, context = {}) {
    if (!this.isEnabled) {
      logger.debug('Error reporting disabled in development mode', errorInfo);
      return;
    }

    const report = this.buildErrorReport(errorInfo, context);
    
    // Add to queue for batch processing
    this.errorQueue.push(report);
    
    // Flush if queue is full
    if (this.errorQueue.length >= this.maxQueueSize) {
      await this.flush();
    }
  }

  /**
   * Build a comprehensive error report
   */
  buildErrorReport(errorInfo, context = {}) {
    const {
      id,
      timestamp,
      type,
      severity,
      context: errorContext,
      message,
      technical
    } = errorInfo;

    return {
      // Error identification
      errorId: id,
      timestamp,
      
      // Error classification
      type,
      severity,
      context: errorContext,
      
      // User information
      user: this.getUserInfo(),
      
      // Browser information
      browser: this.getBrowserInfo(),
      
      // Application state
      application: {
        version: process.env.REACT_APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV,
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent
      },
      
      // Error details
      error: {
        name: technical.name,
        message: technical.message,
        stack: technical.stack,
        status: technical.status,
        statusText: technical.statusText,
        data: technical.data
      },
      
      // User-friendly message
      userMessage: message,
      
      // Additional context
      additionalContext: context,
      
      // Performance metrics
      performance: this.getPerformanceMetrics(),
      
      // Session information
      session: this.getSessionInfo()
    };
  }

  /**
   * Get current user information
   * A0.5: Removed localStorage access for security
   * User info should come from AuthContext, not localStorage
   * Error reports don't need user PII for debugging
   */
  getUserInfo() {
    // Return minimal non-PII info for error tracking
    // AuthContext manages user state securely via httpOnly cookies
    return {
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId()
    };
  }

  /**
   * Generate a temporary session ID for error correlation
   * (not tied to auth, just for grouping errors from same session)
   */
  generateSessionId() {
    if (!window.__errorReportingSessionId) {
      window.__errorReportingSessionId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return window.__errorReportingSessionId;
  }

  /**
   * Get browser information
   */
  getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    if (!window.performance) return null;

    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    return {
      navigation: navigation ? {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstByte: navigation.responseStart - navigation.requestStart
      } : null,
      paint: paint ? {
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime
      } : null,
      memory: performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      } : null
    };
  }

  /**
   * Get session information
   */
  getSessionInfo() {
    return {
      sessionId: this.getSessionId(),
      startTime: this.getSessionStartTime(),
      pageViews: this.getPageViewCount(),
      errors: this.getErrorCount()
    };
  }

  /**
   * Get or create session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('errorReporter_sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('errorReporter_sessionId', sessionId);
    }
    return sessionId;
  }

  /**
   * Get session start time
   */
  getSessionStartTime() {
    let startTime = sessionStorage.getItem('errorReporter_startTime');
    if (!startTime) {
      startTime = new Date().toISOString();
      sessionStorage.setItem('errorReporter_startTime', startTime);
    }
    return startTime;
  }

  /**
   * Get page view count
   */
  getPageViewCount() {
    const count = parseInt(sessionStorage.getItem('errorReporter_pageViews') || '0');
    const newCount = count + 1;
    sessionStorage.setItem('errorReporter_pageViews', newCount.toString());
    return newCount;
  }

  /**
   * Get error count for this session
   */
  getErrorCount() {
    const count = parseInt(sessionStorage.getItem('errorReporter_errorCount') || '0');
    const newCount = count + 1;
    sessionStorage.setItem('errorReporter_errorCount', newCount.toString());
    return newCount;
  }

  /**
   * Send error report to external service
   */
  async sendErrorReport(report) {
    try {
      // In a real implementation, you would send to your error reporting service
      // For now, we'll simulate the API call
      const response = await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(report)
      });

      if (!response.ok) {
        throw new Error(`Error reporting failed: ${response.status}`);
      }

      logger.info('Error report sent successfully', { errorId: report.errorId });
      return true;
    } catch (error) {
      logger.error('Failed to send error report', error);
      return false;
    }
  }

  /**
   * Get authentication token
   * A0.5: REMOVED - Authentication uses httpOnly cookies only
   * Error reporting service should not have access to auth tokens
   * Server-side logging handles authenticated error reports
   */
  // Method removed for security - tokens never accessible to JavaScript

  /**
   * Flush error queue
   */
  async flush() {
    if (this.errorQueue.length === 0) return;

    const reports = [...this.errorQueue];
    this.errorQueue = [];

    logger.info(`Flushing ${reports.length} error reports`);

    for (const report of reports) {
      let attempts = 0;
      let success = false;

      while (attempts < this.retryAttempts && !success) {
        success = await this.sendErrorReport(report);
        attempts++;

        if (!success && attempts < this.retryAttempts) {
          await this.delay(this.retryDelay * attempts);
        }
      }

      if (!success) {
        logger.error('Failed to send error report after all retries', { errorId: report.errorId });
        // Re-queue for next flush
        this.errorQueue.push(report);
      }
    }
  }

  /**
   * Start periodic flush
   */
  startPeriodicFlush() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Report user action for context
   */
  reportUserAction(action, context = {}) {
    if (!this.isEnabled) return;

    const actionReport = {
      timestamp: new Date().toISOString(),
      action,
      context,
      user: this.getUserInfo(),
      session: this.getSessionInfo(),
      url: window.location.href
    };

    // Store for potential error correlation
    const actions = JSON.parse(sessionStorage.getItem('errorReporter_actions') || '[]');
    actions.push(actionReport);
    
    // Keep only last 20 actions
    if (actions.length > 20) {
      actions.splice(0, actions.length - 20);
    }
    
    sessionStorage.setItem('errorReporter_actions', JSON.stringify(actions));
  }

  /**
   * Get recent user actions for error context
   */
  getRecentActions() {
    try {
      return JSON.parse(sessionStorage.getItem('errorReporter_actions') || '[]');
    } catch (error) {
      logger.warn('Failed to parse recent actions', error);
      return [];
    }
  }
}

// Create singleton instance
const errorReporter = new ErrorReporter();

/**
 * Report error with enhanced context
 */
export async function reportError(errorInfo, context = {}) {
  // Add recent user actions to context
  const recentActions = errorReporter.getRecentActions();
  const enhancedContext = {
    ...context,
    recentActions: Array.isArray(recentActions) ? recentActions.slice(-5) : [] // Last 5 actions
  };

  await errorReporter.reportError(errorInfo, enhancedContext);
}

/**
 * Report user action
 */
export function reportUserAction(action, context = {}) {
  errorReporter.reportUserAction(action, context);
}

/**
 * Flush error queue manually
 */
export async function flushErrorQueue() {
  await errorReporter.flush();
}

/**
 * Get error analytics
 */
export function getErrorAnalytics() {
  return {
    sessionId: errorReporter.getSessionId(),
    errorCount: parseInt(sessionStorage.getItem('errorReporter_errorCount') || '0'),
    pageViews: parseInt(sessionStorage.getItem('errorReporter_pageViews') || '0'),
    sessionStartTime: sessionStorage.getItem('errorReporter_startTime')
  };
}

export default errorReporter;


