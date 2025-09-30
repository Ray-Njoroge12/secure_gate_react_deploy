// server/integration/error-monitoring-integration.js
/**
 * Error Monitoring Integration
 * Enhanced error tracking, alerting, and security event monitoring
 * Builds on existing alerting service and security monitoring infrastructure
 */

import { alertingService } from '../src/services/alertingService.js';
import loggingService from '../src/services/loggingService.js';
import securityMonitoringService from '../src/services/securityMonitoringService.js';
import { apmService } from '../src/services/apmService.js';
import { metrics, log } from '../src/utils/tokenHelper.js';

/**
 * Enhanced Error Monitoring Class
 */
class ErrorMonitoringIntegration {
  constructor() {
    this.isInitialized = false;
    this.errorThresholds = {
      // Error rate thresholds (per minute)
      errorRate: {
        warning: 0.05,    // 5% error rate
        critical: 0.15    // 15% error rate
      },
      
      // Security event thresholds (per hour)
      security: {
        authFailures: { warning: 10, critical: 50 },
        rateLimitExceeded: { warning: 20, critical: 100 },
        csrfViolations: { warning: 5, critical: 20 },
        suspiciousActivity: { warning: 3, critical: 10 }
      },
      
      // System error thresholds
      system: {
        databaseErrors: { warning: 5, critical: 20 },
        timeoutErrors: { warning: 10, critical: 50 },
        memoryErrors: { warning: 3, critical: 10 }
      },
      
      // Business logic error thresholds
      business: {
        otpFailures: { warning: 20, critical: 100 },
        checkInDenied: { warning: 10, critical: 50 },
        inviteFailures: { warning: 5, critical: 25 }
      }
    };
    
    this.monitoringWindows = {
      shortTerm: 5 * 60 * 1000,    // 5 minutes
      mediumTerm: 15 * 60 * 1000,  // 15 minutes  
      longTerm: 60 * 60 * 1000     // 1 hour
    };
    
    this.errorMetrics = {
      totalErrors: 0,
      errorsByType: {},
      errorsByEndpoint: {},
      securityEvents: {},
      lastReset: Date.now()
    };
  }

  /**
   * Initialize error monitoring integration
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        loggingService.logAPI('warn', 'Error monitoring already initialized');
        return;
      }

      // Set up error event listeners
      this.setupErrorEventListeners();

      // Initialize security event monitoring
      this.setupSecurityEventMonitoring();

      // Start periodic monitoring tasks
      this.startPeriodicMonitoring();

      // Set up enhanced error handlers
      this.setupEnhancedErrorHandlers();

      this.isInitialized = true;

      loggingService.logAPI('info', 'Error monitoring integration initialized successfully', null, {
        thresholds: Object.keys(this.errorThresholds),
        monitoringWindows: this.monitoringWindows,
        securityEventTypes: ['auth_failures', 'rate_limits', 'csrf_violations', 'suspicious_activity']
      });

    } catch (error) {
      loggingService.logAPI('error', 'Failed to initialize error monitoring integration', null, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Set up error event listeners
   */
  setupErrorEventListeners() {
    // Listen for uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.handleCriticalError('uncaught_exception', error, {
        severity: 'critical',
        category: 'system'
      });
    });

    // Listen for unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.handleCriticalError('unhandled_rejection', reason, {
        severity: 'critical',
        category: 'system',
        promise: promise?.toString()
      });
    });

    // Listen for warning events
    process.on('warning', (warning) => {
      this.handleSystemWarning(warning);
    });

    loggingService.logAPI('info', 'Error event listeners registered');
  }

  /**
   * Set up security event monitoring
   */
  setupSecurityEventMonitoring() {
    // Monitor authentication failures
    this.monitorAuthenticationFailures();
    
    // Monitor rate limiting events
    this.monitorRateLimitEvents();
    
    // Monitor CSRF violations
    this.monitorCSRFViolations();
    
    // Monitor suspicious activities
    this.monitorSuspiciousActivities();

    loggingService.logAPI('info', 'Security event monitoring active');
  }

  /**
   * Monitor authentication failures
   */
  monitorAuthenticationFailures() {
    const originalAuthFailures = metrics.auth_failures || 0;
    
    setInterval(() => {
      const currentAuthFailures = metrics.auth_failures || 0;
      const newFailures = currentAuthFailures - originalAuthFailures;
      
      if (newFailures > 0) {
        this.checkSecurityThreshold('authFailures', newFailures, {
          type: 'authentication_failure',
          count: newFailures,
          total: currentAuthFailures
        });
      }
    }, this.monitoringWindows.shortTerm);
  }

  /**
   * Monitor rate limiting events
   */
  monitorRateLimitEvents() {
    const originalRateLimit = metrics.rate_limit_exceeded || 0;
    
    setInterval(() => {
      const currentRateLimit = metrics.rate_limit_exceeded || 0;
      const newEvents = currentRateLimit - originalRateLimit;
      
      if (newEvents > 0) {
        this.checkSecurityThreshold('rateLimitExceeded', newEvents, {
          type: 'rate_limit_exceeded',
          count: newEvents,
          total: currentRateLimit
        });
      }
    }, this.monitoringWindows.shortTerm);
  }

  /**
   * Monitor CSRF violations
   */
  monitorCSRFViolations() {
    // This would integrate with actual CSRF monitoring
    // For now, it's a placeholder for future implementation
    loggingService.logAPI('debug', 'CSRF violation monitoring placeholder active');
  }

  /**
   * Monitor suspicious activities
   */
  monitorSuspiciousActivities() {
    // Monitor for patterns indicating suspicious behavior
    const suspiciousPatterns = [
      'multiple_failed_logins',
      'unusual_access_patterns', 
      'privilege_escalation_attempts',
      'data_extraction_attempts'
    ];
    
    // Placeholder for advanced threat detection
    loggingService.logAPI('debug', 'Suspicious activity monitoring active', null, {
      patterns: suspiciousPatterns
    });
  }

  /**
   * Start periodic monitoring tasks
   */
  startPeriodicMonitoring() {
    // Check error rates every minute
    setInterval(() => {
      this.checkErrorRates();
    }, 60 * 1000);

    // Check security thresholds every 5 minutes
    setInterval(() => {
      this.performSecurityCheck();
    }, this.monitoringWindows.shortTerm);

    // Generate monitoring reports every hour
    setInterval(() => {
      this.generateMonitoringReport();
    }, this.monitoringWindows.longTerm);

    // Reset metrics every 24 hours
    setInterval(() => {
      this.resetDailyMetrics();
    }, 24 * 60 * 60 * 1000);

    loggingService.logAPI('info', 'Periodic monitoring tasks started');
  }

  /**
   * Set up enhanced error handlers
   */
  setupEnhancedErrorHandlers() {
    // This would be called from the main error handling middleware
    // to provide enhanced error processing
    this.errorHandler = (error, req, res, context = {}) => {
      return this.processError(error, req, res, context);
    };

    loggingService.logAPI('info', 'Enhanced error handlers registered');
  }

  /**
   * Process and handle errors with enhanced monitoring
   */
  async processError(error, req = null, res = null, context = {}) {
    try {
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        timestamp: new Date().toISOString(),
        correlationId: req?.correlationId || context.correlationId,
        endpoint: req ? `${req.method} ${req.originalUrl}` : context.endpoint,
        userAgent: req?.get('User-Agent') || context.userAgent,
        ip: req?.ip || context.ip,
        userId: req?.user?.id || context.userId,
        severity: this.determineSeverity(error, context)
      };

      // Update error metrics
      this.updateErrorMetrics(errorDetails);

      // Log the error with structured data
      loggingService.logAPI('error', 'Enhanced error processing', req, {
        error: errorDetails,
        context: context
      });

      // Check if error triggers alerts
      await this.checkErrorAlerts(errorDetails);

      // Handle security-related errors
      if (this.isSecurityError(error, context)) {
        await this.handleSecurityError(errorDetails);
      }

      return errorDetails;

    } catch (processingError) {
      loggingService.logAPI('error', 'Error in error processing', null, {
        originalError: error.message,
        processingError: processingError.message
      });
    }
  }

  /**
   * Handle critical system errors
   */
  handleCriticalError(type, error, metadata = {}) {
    const criticalError = {
      type,
      error: error?.message || String(error),
      stack: error?.stack,
      metadata,
      timestamp: new Date().toISOString(),
      severity: 'critical'
    };

    // Log critical error
    loggingService.logAPI('error', 'Critical system error detected', null, criticalError);

    // Create critical alert
    alertingService.processAlert(alertingService.createAlert(
      'critical',
      'system',
      `Critical system error: ${type} - ${criticalError.error}`,
      criticalError.timestamp
    ));

    // Update metrics
    this.errorMetrics.totalErrors++;
    this.errorMetrics.errorsByType[type] = (this.errorMetrics.errorsByType[type] || 0) + 1;
  }

  /**
   * Handle system warnings
   */
  handleSystemWarning(warning) {
    loggingService.logAPI('warn', 'System warning detected', null, {
      name: warning.name,
      message: warning.message,
      stack: warning.stack
    });
  }

  /**
   * Check error rates against thresholds
   */
  checkErrorRates() {
    try {
      const apmMetrics = apmService.getMetrics();
      const errorRate = apmMetrics.globalStats?.errorRate || 0;

      if (errorRate >= this.errorThresholds.errorRate.critical) {
        alertingService.processAlert(alertingService.createAlert(
          'critical',
          'performance',
          `Critical error rate: ${(errorRate * 100).toFixed(2)}%`,
          new Date().toISOString()
        ));
      } else if (errorRate >= this.errorThresholds.errorRate.warning) {
        alertingService.processAlert(alertingService.createAlert(
          'warning',
          'performance',
          `High error rate: ${(errorRate * 100).toFixed(2)}%`,
          new Date().toISOString()
        ));
      }

    } catch (error) {
      loggingService.logAPI('error', 'Error checking error rates', null, {
        error: error.message
      });
    }
  }

  /**
   * Check security thresholds
   */
  checkSecurityThreshold(eventType, count, metadata = {}) {
    const threshold = this.errorThresholds.security[eventType];
    if (!threshold) return;

    const timestamp = new Date().toISOString();

    if (count >= threshold.critical) {
      alertingService.processAlert(alertingService.createAlert(
        'critical',
        'security',
        `Critical security event: ${eventType} (${count} events)`,
        timestamp
      ));
    } else if (count >= threshold.warning) {
      alertingService.processAlert(alertingService.createAlert(
        'warning',
        'security',
        `Security event threshold exceeded: ${eventType} (${count} events)`,
        timestamp
      ));
    }

    // Update security event metrics
    this.errorMetrics.securityEvents[eventType] = count;
  }

  /**
   * Perform periodic security check
   */
  performSecurityCheck() {
    try {
      // Check OTP failures
      const otpFailures = (metrics.otp_issued || 0) - (metrics.otp_verified || 0);
      this.checkSecurityThreshold('otpFailures', otpFailures, {
        type: 'otp_failure_pattern'
      });

      // Check check-in denials
      const checkInDenials = metrics.checkin_denied || 0;
      this.checkSecurityThreshold('checkInDenied', checkInDenials, {
        type: 'access_control_violation'
      });

      loggingService.logAPI('debug', 'Periodic security check completed', null, {
        otpFailures,
        checkInDenials,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      loggingService.logAPI('error', 'Error in periodic security check', null, {
        error: error.message
      });
    }
  }

  /**
   * Generate monitoring report
   */
  generateMonitoringReport() {
    try {
      const report = {
        period: 'hourly',
        timestamp: new Date().toISOString(),
        metrics: {
          errors: this.errorMetrics,
          alerts: alertingService.getAlertStats(),
          performance: apmService.getMetrics().globalStats,
          security: {
            authFailures: metrics.auth_failures || 0,
            otpFailures: (metrics.otp_issued || 0) - (metrics.otp_verified || 0),
            rateLimitEvents: metrics.rate_limit_exceeded || 0
          }
        }
      };

      loggingService.logAPI('info', 'Monitoring report generated', null, report);

    } catch (error) {
      loggingService.logAPI('error', 'Error generating monitoring report', null, {
        error: error.message
      });
    }
  }

  /**
   * Update error metrics
   */
  updateErrorMetrics(errorDetails) {
    this.errorMetrics.totalErrors++;
    
    const errorType = errorDetails.name || 'unknown';
    this.errorMetrics.errorsByType[errorType] = (this.errorMetrics.errorsByType[errorType] || 0) + 1;
    
    if (errorDetails.endpoint) {
      this.errorMetrics.errorsByEndpoint[errorDetails.endpoint] = 
        (this.errorMetrics.errorsByEndpoint[errorDetails.endpoint] || 0) + 1;
    }
  }

  /**
   * Determine error severity
   */
  determineSeverity(error, context = {}) {
    if (context.severity) return context.severity;
    
    // Critical errors
    if (error.name === 'DatabaseError' || error.code === 'ECONNREFUSED') {
      return 'critical';
    }
    
    // High severity errors
    if (error.name === 'ValidationError' || error.status === 500) {
      return 'high';
    }
    
    // Medium severity errors
    if (error.status >= 400 && error.status < 500) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Check if error is security-related
   */
  isSecurityError(error, context = {}) {
    const securityIndicators = [
      'unauthorized', 'forbidden', 'authentication', 'csrf', 
      'xss', 'injection', 'malicious', 'suspicious'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    return securityIndicators.some(indicator => 
      errorMessage.includes(indicator) || context.type?.includes(indicator)
    );
  }

  /**
   * Handle security-related errors
   */
  async handleSecurityError(errorDetails) {
    try {
      // Log security event
      await securityMonitoringService.logSecurityEvent({
        type: 'security_error',
        severity: errorDetails.severity,
        ip: errorDetails.ip,
        userAgent: errorDetails.userAgent,
        userId: errorDetails.userId,
        endpoint: errorDetails.endpoint,
        details: {
          error: errorDetails.message,
          correlationId: errorDetails.correlationId
        }
      });

      loggingService.logSecurity('Security error handled', errorDetails);

    } catch (error) {
      loggingService.logAPI('error', 'Error handling security error', null, {
        error: error.message
      });
    }
  }

  /**
   * Check if error triggers alerts
   */
  async checkErrorAlerts(errorDetails) {
    // Check for repeated errors from same source
    const errorKey = `${errorDetails.ip}_${errorDetails.name}`;
    // This would implement error pattern detection and alerting
  }

  /**
   * Reset daily metrics
   */
  resetDailyMetrics() {
    const previousMetrics = { ...this.errorMetrics };
    
    this.errorMetrics = {
      totalErrors: 0,
      errorsByType: {},
      errorsByEndpoint: {},
      securityEvents: {},
      lastReset: Date.now()
    };

    loggingService.logAPI('info', 'Daily error metrics reset', null, {
      previousPeriodStats: previousMetrics,
      resetTimestamp: new Date().toISOString()
    });
  }

  /**
   * Get error monitoring status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      thresholds: this.errorThresholds,
      metrics: this.errorMetrics,
      monitoring: {
        errorEventListeners: true,
        securityEventMonitoring: true,
        periodicChecks: true,
        alertingIntegration: true
      }
    };
  }

  /**
   * Get enhanced error metrics
   */
  getEnhancedMetrics() {
    return {
      ...this.errorMetrics,
      alerts: alertingService.getAlertStats(),
      thresholdStatus: this.checkAllThresholds(),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Check all thresholds status
   */
  checkAllThresholds() {
    const apmMetrics = apmService.getMetrics();
    
    return {
      errorRate: {
        current: apmMetrics.globalStats?.errorRate || 0,
        warning: this.errorThresholds.errorRate.warning,
        critical: this.errorThresholds.errorRate.critical,
        status: this.getThresholdStatus(apmMetrics.globalStats?.errorRate || 0, this.errorThresholds.errorRate)
      },
      authFailures: {
        current: metrics.auth_failures || 0,
        warning: this.errorThresholds.security.authFailures.warning,
        critical: this.errorThresholds.security.authFailures.critical,
        status: this.getThresholdStatus(metrics.auth_failures || 0, this.errorThresholds.security.authFailures)
      }
    };
  }

  /**
   * Get threshold status
   */
  getThresholdStatus(current, threshold) {
    if (current >= threshold.critical) return 'critical';
    if (current >= threshold.warning) return 'warning';
    return 'normal';
  }
}

/**
 * Factory function to create and initialize error monitoring
 */
export async function createErrorMonitoring() {
  const errorMonitoring = new ErrorMonitoringIntegration();
  await errorMonitoring.initialize();
  return errorMonitoring;
}

/**
 * Enhanced error handler middleware
 */
export function createEnhancedErrorHandler(errorMonitoring) {
  return async (error, req, res, next) => {
    try {
      // Process error through monitoring system
      const errorDetails = await errorMonitoring.processError(error, req, res);
      
      // Set correlation ID in response
      if (req.correlationId) {
        res.setHeader('X-Correlation-Id', req.correlationId);
      }
      
      // Send appropriate error response
      const statusCode = error.status || error.statusCode || 500;
      const errorResponse = {
        error: 'Internal server error',
        correlationId: req.correlationId,
        timestamp: new Date().toISOString()
      };

      // Add more details in development
      if (process.env.NODE_ENV !== 'production') {
        errorResponse.details = error.message;
        errorResponse.stack = error.stack;
      }

      res.status(statusCode).json(errorResponse);
      
    } catch (handlerError) {
      loggingService.logAPI('error', 'Error in enhanced error handler', req, {
        originalError: error.message,
        handlerError: handlerError.message
      });
      
      // Fallback error response
      res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  };
}

export default ErrorMonitoringIntegration;