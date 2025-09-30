// test-error-monitoring.js
/**
 * Error Monitoring Integration Test Script
 * Tests enhanced error monitoring, security event tracking, and alerting
 */

import express from 'express';
import { createErrorMonitoring, createEnhancedErrorHandler } from './server/integration/error-monitoring-integration.js';
import { createHealthMonitoring } from './server/integration/health-monitoring-integration.js';
import { healthCheck } from './server/src/services/healthService.js';
import { alertingService } from './server/src/services/alertingService.js';
import loggingService from './server/src/services/loggingService.js';
import securityEventMiddleware from './server/middleware/securityEventMiddleware.js';

async function testErrorMonitoring() {
  try {
    console.log('🚀 Starting error monitoring integration test...');
    
    // Create test app
    const app = express();
    app.use(express.json());

    // Initialize monitoring systems
    console.log('📋 Initializing monitoring integrations...');
    
    const healthMonitoring = await createHealthMonitoring(app, healthCheck);
    const errorMonitoring = await createErrorMonitoring();
    
    // Set up security event middleware
    app.use(securityEventMiddleware.securityEventTracker());
    app.use(securityEventMiddleware.authenticationFailureTracker());
    app.use(securityEventMiddleware.rateLimitEventTracker());
    
    // Set up enhanced error handler
    const enhancedErrorHandler = createEnhancedErrorHandler(errorMonitoring);
    
    // Test endpoints to trigger different error scenarios
    setupTestEndpoints(app);
    
    // Add error handler at the end
    app.use(enhancedErrorHandler);
    
    console.log('✅ Error monitoring status:', errorMonitoring.getStatus());

    // Start test server
    const PORT = process.env.PORT || 5002;
    const server = app.listen(PORT, () => {
      console.log(`🌐 Test server running on http://localhost:${PORT}`);
      console.log('🔍 Available test endpoints:');
      console.log('  • GET /test/error - Trigger application error');
      console.log('  • GET /test/security - Trigger security event');
      console.log('  • GET /test/auth-failure - Trigger auth failure');
      console.log('  • GET /test/rate-limit - Trigger rate limit');
      console.log('  • GET /test/injection - Trigger injection detection');
      console.log('  • GET /metrics/errors - View error metrics');
      console.log('  • GET /alerts - View active alerts');
    });

    // Run tests after a short delay
    setTimeout(async () => {
      await runErrorTests(PORT);
      
      setTimeout(() => {
        console.log('\n📊 Final Test Results:');
        displayTestResults(errorMonitoring);
        
        server.close(() => {
          console.log('🏁 Error monitoring test completed successfully');
          process.exit(0);
        });
      }, 2000);
    }, 1000);

  } catch (error) {
    console.error('❌ Error monitoring test failed:', error.message);
    process.exit(1);
  }
}

function setupTestEndpoints(app) {
  // Test error endpoint
  app.get('/test/error', (req, res, next) => {
    const error = new Error('Test application error');
    error.status = 500;
    next(error);
  });

  // Test database error
  app.get('/test/db-error', (req, res, next) => {
    const error = new Error('Database connection failed');
    error.name = 'DatabaseError';
    error.code = 'ECONNREFUSED';
    next(error);
  });

  // Test validation error
  app.get('/test/validation-error', (req, res, next) => {
    const error = new Error('Invalid input data');
    error.name = 'ValidationError';
    error.status = 400;
    next(error);
  });

  // Test security event - suspicious request
  app.get('/test/security', (req, res) => {
    // This will trigger suspicious request detection
    res.json({ message: 'Security test endpoint' });
  });

  // Test authentication failure
  app.get('/test/auth-failure', (req, res) => {
    res.status(401).json({ error: 'Unauthorized' });
  });

  // Test rate limit
  app.get('/test/rate-limit', (req, res) => {
    res.status(429).json({ error: 'Rate limit exceeded' });
  });

  // Test injection detection
  app.get('/test/injection', (req, res) => {
    // This will trigger injection detection
    const maliciousQuery = "'; DROP TABLE users; --";
    res.json({ message: 'Injection test', query: maliciousQuery });
  });

  // Error metrics endpoint
  app.get('/metrics/errors', (req, res) => {
    res.json({
      success: true,
      data: global.errorMonitoring?.getEnhancedMetrics() || { error: 'Error monitoring not initialized' }
    });
  });

  // Alerts endpoint  
  app.get('/alerts', (req, res) => {
    res.json({
      success: true,
      data: {
        active: alertingService.getActiveAlerts(),
        stats: alertingService.getAlertStats()
      }
    });
  });

  // Health endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
}

async function runErrorTests(port) {
  const fetch = (await import('node-fetch')).default;
  
  console.log('\n🧪 Running error monitoring tests...');
  
  const tests = [
    {
      name: 'Application Error',
      endpoint: '/test/error',
      expectedStatus: 500
    },
    {
      name: 'Database Error',
      endpoint: '/test/db-error', 
      expectedStatus: 500
    },
    {
      name: 'Validation Error',
      endpoint: '/test/validation-error',
      expectedStatus: 400
    },
    {
      name: 'Security Event',
      endpoint: '/test/security?script=<script>alert("xss")</script>',
      expectedStatus: 200
    },
    {
      name: 'Authentication Failure',
      endpoint: '/test/auth-failure',
      expectedStatus: 401
    },
    {
      name: 'Rate Limit',
      endpoint: '/test/rate-limit',
      expectedStatus: 429
    },
    {
      name: 'Injection Detection',
      endpoint: '/test/injection?q=\'; DROP TABLE users; --',
      expectedStatus: 200
    }
  ];

  for (const test of tests) {
    try {
      const response = await fetch(`http://localhost:${port}${test.endpoint}`);
      const data = await response.json();
      
      const success = response.status === test.expectedStatus;
      const icon = success ? '✅' : '❌';
      
      console.log(`${icon} ${test.name}: ${response.status} ${success ? '(Expected)' : '(Unexpected)'}`);
      
      // Check for correlation ID
      if (response.headers.get('x-correlation-id')) {
        console.log(`   📋 Correlation ID: ${response.headers.get('x-correlation-id')}`);
      }
      
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    }
  }
  
  // Test metrics endpoint
  try {
    const metricsResponse = await fetch(`http://localhost:${port}/metrics/errors`);
    const metricsData = await metricsResponse.json();
    
    console.log(`\n📊 Error Metrics:`);
    if (metricsData.success && metricsData.data.totalErrors !== undefined) {
      console.log(`   Total Errors: ${metricsData.data.totalErrors}`);
      console.log(`   Error Types: ${JSON.stringify(metricsData.data.errorsByType)}`);
      console.log(`   Threshold Status: ${JSON.stringify(metricsData.data.thresholdStatus || {})}`);
    } else {
      console.log(`   ⚠️ Error metrics not available`);
    }
    
  } catch (error) {
    console.log(`❌ Metrics test: ERROR - ${error.message}`);
  }
  
  // Test alerts endpoint
  try {
    const alertsResponse = await fetch(`http://localhost:${port}/alerts`);
    const alertsData = await alertsResponse.json();
    
    console.log(`\n🚨 Alert Status:`);
    if (alertsData.success) {
      console.log(`   Active Alerts: ${alertsData.data.active.length}`);
      console.log(`   Alert Stats: ${JSON.stringify(alertsData.data.stats)}`);
      
      if (alertsData.data.active.length > 0) {
        console.log(`   Recent Alerts:`);
        alertsData.data.active.slice(0, 3).forEach((alert, i) => {
          console.log(`     ${i + 1}. [${alert.level.toUpperCase()}] ${alert.message}`);
        });
      }
    }
    
  } catch (error) {
    console.log(`❌ Alerts test: ERROR - ${error.message}`);
  }
}

function displayTestResults(errorMonitoring) {
  const status = errorMonitoring.getStatus();
  const metrics = errorMonitoring.getEnhancedMetrics();
  
  console.log('\n📈 Error Monitoring Summary:');
  console.log(`   Initialized: ${status.initialized ? '✅' : '❌'}`);
  console.log(`   Error Event Listeners: ${status.monitoring.errorEventListeners ? '✅' : '❌'}`);
  console.log(`   Security Event Monitoring: ${status.monitoring.securityEventMonitoring ? '✅' : '❌'}`);
  console.log(`   Periodic Checks: ${status.monitoring.periodicChecks ? '✅' : '❌'}`);
  console.log(`   Alerting Integration: ${status.monitoring.alertingIntegration ? '✅' : '❌'}`);
  
  console.log('\n📊 Error Statistics:');
  console.log(`   Total Errors Processed: ${metrics.totalErrors}`);
  console.log(`   Errors by Type: ${JSON.stringify(metrics.errorsByType)}`);
  console.log(`   Errors by Endpoint: ${JSON.stringify(metrics.errorsByEndpoint)}`);
  
  if (metrics.alerts) {
    console.log('\n🚨 Alert Statistics:');
    console.log(`   Active Alerts: ${metrics.alerts.active}`);
    console.log(`   Total Alerts: ${metrics.alerts.total}`);
    console.log(`   Last Hour: ${metrics.alerts.lastHour}`);
    console.log(`   Last 24 Hours: ${metrics.alerts.last24Hours}`);
  }
  
  // Test threshold status
  if (metrics.thresholdStatus) {
    console.log('\n⚖️ Threshold Status:');
    Object.entries(metrics.thresholdStatus).forEach(([metric, status]) => {
      const icon = status.status === 'normal' ? '✅' : 
                   status.status === 'warning' ? '⚠️' : '🚨';
      console.log(`   ${metric}: ${icon} ${status.status} (${status.current}/${status.critical})`);
    });
  }
}

// Store error monitoring instance globally for metrics access
global.errorMonitoring = null;

// Run the test
testErrorMonitoring().catch(console.error);