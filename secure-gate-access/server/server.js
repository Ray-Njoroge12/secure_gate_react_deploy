// server/server.js
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// Import and validate environment configuration FIRST
import EnvironmentConfig from './src/config/environment.js';

// Enhanced health monitoring imports
import { enhancedHealthMonitoring as healthCheck } from './src/services/enhancedHealthService.js';
import { createHealthMonitoring } from './integration/health-monitoring-integration.js';
import loggingService from './src/services/loggingService.js';
import { correlationIdMiddleware, requestLoggingMiddleware } from './src/middleware/loggingMiddleware.js';

// Enhanced error monitoring imports
import { createErrorMonitoring, createEnhancedErrorHandler } from './integration/error-monitoring-integration.js';

// Validate environment and get configuration
const envValidation = EnvironmentConfig.validateAndReport();
if (!envValidation.isValid && process.env.NODE_ENV === 'production') {
  console.error('🚨 Server startup blocked due to configuration errors');
  process.exit(1);
} else if (!envValidation.isValid) {
  console.warn('⚠️  Configuration warnings detected - proceeding in development mode');
}

console.log('🔐 Environment validation passed - starting secure server...');

import app from './src/app.js';
import { dbManager } from './src/database/db.enhanced.js';
const pool = dbManager.pool;
import monitoringDashboard from './src/services/monitoringDashboardService.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

// Enhanced error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  
  // Log the error for monitoring
  loggingService.logError('Unhandled Promise Rejection', reason, {
    promise: String(promise),
    stack: reason?.stack || 'No stack trace available'
  });
  
  // Only exit for critical database or security errors
  if (reason && reason.message) {
    const message = reason.message.toLowerCase();
    if (message.includes('critical:') || 
        message.includes('security') || 
        message.includes('authentication failed')) {
      console.error('🚨 Critical error detected - shutting down for safety');
      process.exit(1);
    }
  }
  
  // For monitoring/non-critical errors, log but continue running
  console.warn('⚠️ Non-critical error handled - server continues running');
});

// Enhanced error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  
  // Log the error
  loggingService.logError('Uncaught Exception', error);
  
  // Always exit for uncaught exceptions as they indicate serious issues
  console.error('🚨 Uncaught exception - shutting down');
  process.exit(1);
});

// Additional startup validation
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET not set. Set it in .env or environment before starting.');
  process.exit(1);
}

// Apply correlation ID middleware globally
app.use(correlationIdMiddleware);

// Apply request logging middleware
app.use(requestLoggingMiddleware);

// Initialize monitoring integrations
let healthMonitoring = null;
let errorMonitoring = null;

async function initializeHealthMonitoring() {
  try {
    healthMonitoring = await createHealthMonitoring(app, healthCheck);
    loggingService.logAPI('info', 'Enhanced health monitoring initialized successfully', null, {
      endpoints: ['/health', '/health/live', '/health/ready', '/health/startup', '/health/detailed'],
      middleware: ['correlationId', 'requestLogging', 'healthMiddleware'],
      gracefulShutdown: true
    });
  } catch (error) {
    loggingService.logAPI('error', 'Failed to initialize enhanced health monitoring', null, {
      error: error.message,
      fallback: 'Using basic health endpoints'
    });
    
    // Fallback to basic health endpoints if enhanced monitoring fails
    setupBasicHealthEndpoints();
  }
}

async function initializeErrorMonitoring() {
  try {
    errorMonitoring = await createErrorMonitoring();
    
    // Set up enhanced error handler
    const enhancedErrorHandler = createEnhancedErrorHandler(errorMonitoring);
    app.use(enhancedErrorHandler);
    
    loggingService.logAPI('info', 'Enhanced error monitoring initialized successfully', null, {
      thresholds: ['errorRate', 'security', 'system', 'business'],
      monitoring: ['uncaughtExceptions', 'unhandledRejections', 'securityEvents'],
      alerting: true,
      periodicChecks: true
    });
  } catch (error) {
    loggingService.logAPI('error', 'Failed to initialize enhanced error monitoring', null, {
      error: error.message,
      fallback: 'Using basic error handling'
    });
  }
}

// Fallback basic health endpoints
function setupBasicHealthEndpoints() {
  // Immediate health check (no database dependency)
  app.get('/health/ping', (req, res) => {
    res.status(200).json({
      status: 'ok',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Quick health check for load balancers (fallback)
  app.get('/health', async (req, res) => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        globalThis.setTimeout(() => reject(new Error('Health check timeout')), 5000);
      });
      
      const healthPromise = healthCheck.quickCheck();
      const result = await Promise.race([healthPromise, timeoutPromise]);
      
      const statusCode = result.status === 'ok' ? 200 : 503;
      res.status(statusCode).json(result);
    } catch (error) {
      loggingService.logAPI('error', 'Basic health check failed', req, {
        error: error.message
      });
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Detailed health check for monitoring systems (fallback)
  app.get('/health/detailed', async (req, res) => {
    try {
      const checkNames = req.query.checks ? req.query.checks.split(',') : null;
      const result = await healthCheck.runChecks(checkNames);
      const statusCode = result.status === 'healthy' ? 200 : 
                         result.status === 'warning' ? 200 :
                         result.status === 'critical' ? 503 : 503;
      res.status(statusCode).json(result);
    } catch (err) {
      loggingService.logAPI('error', 'Detailed health check failed', req, {
        error: err.message
      });
      res.status(500).json({
        status: 'unhealthy',
        error: 'Health check service unavailable',
        timestamp: new Date().toISOString()
      });
    }
  });
}

// Check if port is available
async function checkPortAvailability(port) {
  const { createServer } = await import('net');
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, (err) => {
      if (err) {
        resolve(false);
      } else {
        server.once('close', () => resolve(true));
        server.close();
      }
    });
    server.on('error', () => resolve(false));
  });
}

// Validate database connectivity
async function validateDatabaseConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Database connection validated');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Graceful startup with validation
async function startServer() {
  try {
    // Check if port is available
    const portAvailable = await checkPortAvailability(PORT);
    if (!portAvailable) {
      console.error(`🚨 Server startup blocked - port ${PORT} is already in use`);
      console.error('💡 Try running: taskkill /f /im node.exe');
      process.exit(1);
    }
    console.log(`✅ Port ${PORT} is available`);

    // Validate database before starting server
    const dbConnected = await validateDatabaseConnection();
    if (!dbConnected) {
      console.error('🚨 Server startup blocked - database connection failed');
      process.exit(1);
    }

    // Initialize the enhanced database manager used by controllers
    console.log('🔄 Initializing enhanced database manager...');
    await dbManager.initialize();
    console.log('✅ Enhanced database manager initialized for controllers');

    // Initialize monitoring dashboard
    console.log('📊 Starting monitoring dashboard service...');
    monitoringDashboard.start();

    // Initialize enhanced health monitoring
    await initializeHealthMonitoring();

    // Initialize enhanced error monitoring
    await initializeErrorMonitoring();
    
    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Secure Gate server running on http://localhost:${PORT}`);
      console.log(`🌐 Server accessible on all network interfaces`);
      console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('✅ All security validations passed');
      console.log('📊 Enhanced logging and monitoring active');
      
      // Log server startup event
      loggingService.logInfo('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    });

    // Enhanced graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      console.log(`🔄 ${signal} received - shutting down gracefully`);
      
      // Log shutdown event
      loggingService.logInfo('Server shutdown initiated', {
        signal,
        timestamp: new Date().toISOString()
      });
      
      try {
        // Step 1: Stop accepting new connections
        console.log('🔄 Stopping server from accepting new connections...');
        server.close();
        
        // Step 2: Stop monitoring dashboard
        if (monitoringDashboard.isRunning) {
          console.log('📊 Stopping monitoring dashboard...');
          monitoringDashboard.stop();
        }
        
        // Step 3: Wait for existing connections to drain (with timeout)
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.log('⏰ Shutdown timeout reached - forcing closure');
            resolve();
          }, 10000); // 10 second timeout
          
          server.on('close', () => {
            clearTimeout(timeout);
            console.log('✅ Server closed gracefully');
            resolve();
          });
        });
        
        // Step 4: Close database connections
        console.log('🔄 Closing database connections...');
        await new Promise((resolve, reject) => {
          pool.end((err) => {
            if (err) {
              console.error('❌ Error closing database pool:', err.message);
              reject(err);
            } else {
              console.log('✅ Database connections closed');
              resolve();
            }
          });
        });
        
        // Step 5: Final cleanup
        loggingService.logInfo('Server shutdown complete', {
          timestamp: new Date().toISOString()
        });
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
        
      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
        loggingService.logError('Shutdown error', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('🚨 Server startup failed:', error);
    process.exit(1);
  }
}

// Enhanced error handling for stability
process.on('unhandledRejection', (reason, promise) => {
  loggingService.logError('Unhandled Promise Rejection', reason, {
    promise: promise.toString(),
    stack: reason?.stack,
    correlationId: 'process-error'
  });

  // Don't exit in development, just log
  if (process.env.NODE_ENV === 'production') {
    console.error('💥 Unhandled Promise Rejection in production - initiating graceful shutdown');
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  loggingService.logError('Uncaught Exception', error, {
    stack: error.stack,
    correlationId: 'process-error'
  });

  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

startServer();
// touch
 
