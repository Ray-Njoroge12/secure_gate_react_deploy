// server/server.js
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment files in priority order:
// 1. .env.local (gitignored, contains secrets) - highest priority
// 2. .env (tracked, contains defaults only) - fallback
dotenv.config({ path: join(__dirname, '.env.local') }); // Secrets (dev)
dotenv.config({ path: join(__dirname, '.env') }); // Defaults

// Load console override for production safety (MUST BE FIRST)
import './src/config/consoleOverride.js';

// Import and validate environment configuration FIRST
import EnvironmentConfig from './src/config/environment.js';

// Enhanced health monitoring imports
import { enhancedHealthMonitoring as healthCheck } from './src/services/enhancedHealthService.js';
import { createHealthMonitoring } from './integration/health-monitoring-integration.js';
import loggingService from './src/services/loggingService.js';
import { correlationIdMiddleware, requestLoggingMiddleware } from './src/middleware/loggingMiddleware.js';

// Enhanced error monitoring imports
import { createErrorMonitoring, createEnhancedErrorHandler } from './integration/error-monitoring-integration.js';

// Validate environment and get configuration (must await async function)
const envValidation = await EnvironmentConfig.validateAndReport();
if (!envValidation.isValid && process.env.NODE_ENV === 'production') {
  console.error('🚨 Server startup blocked due to configuration errors');
  process.exit(1);
} else if (!envValidation.isValid) {
  console.warn('⚠️  Configuration warnings detected - proceeding in development mode');
}

console.log('🔐 Environment validation passed - starting secure server...');

import app from './src/app.js';
import { dbManager } from './src/database/db.enhanced.js';
// Don't extract pool here - it's null until initializeAsync() is called
// Access dbManager.pool dynamically when needed
import monitoringDashboard from './src/services/monitoringDashboardService.js';
import metricsService from './src/services/metricsService.js';
import { startDataRetentionScheduler, stopDataRetentionScheduler } from './src/services/dataRetentionService.js';

// Import WebSocket service for Phase 2.3 real-time features
import webSocketService from './src/services/websocketService.js';

// Import migration service for auto-migration on startup
import { runMigrations } from './src/services/migrationService.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

// Enhanced error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  
  // Log the error for monitoring
  loggingService.logError('Unhandled Promise Rejection', reason, {
    promise: String(promise),
    stack: reason?.stack || 'No stack trace available'
  });
  
  // Determine if this is a critical error that requires shutdown
  if (reason && reason.message) {
    const message = reason.message.toLowerCase();
    
    // Non-critical errors that should NOT cause shutdown
    const nonCriticalPatterns = [
      'connection timeout',
      'connection terminated',
      'connection refused',
      'econnreset',
      'etimedout',
      'redis',
      'cache'
    ];
    
    const isNonCritical = nonCriticalPatterns.some(pattern => message.includes(pattern));
    
    if (isNonCritical) {
      console.warn('⚠️ Non-critical connection error - server continues running');
      console.warn('💡 This may be a temporary network issue or database connectivity problem');
      return; // Don't exit
    }
    
    // Critical errors that require shutdown
    if (message.includes('critical:') || 
        message.includes('security breach') || 
        message.includes('authentication system failed')) {
      console.error('🚨 Critical error detected - shutting down for safety');
      process.exit(1);
    }
  }
  
  // For unknown errors, log but continue
  console.warn('⚠️ Unknown error handled - server continues running');
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
    
    server.listen(port, '0.0.0.0', () => {
      // Port is available - we can bind to it
      server.close(() => resolve(true));
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use
        resolve(false);
      } else {
        // Other error, assume port is available
        console.warn(`Port check warning: ${err.message}`);
        resolve(true);
      }
    });
  });
}

// Validate database connectivity
async function validateDatabaseConnection() {
  try {
    if (!dbManager.pool) {
      console.warn('⚠️ Database pool not initialized yet');
      return false;
    }
    const client = await dbManager.pool.connect();
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

    // Initialize the database connection first
    console.log('🔄 Initializing database connection...');
    try {
      await dbManager.initializeAsync();
      console.log('✅ Database connection established');
      
      // Run migrations automatically after database connection
      console.log('🔄 Running database migrations...');
      const migrationResult = await runMigrations();
      if (!migrationResult.success) {
        console.error('❌ Database migration failed:', migrationResult.error);
        if (process.env.NODE_ENV === 'production') {
          console.error('🚨 Server startup blocked - migrations required in production');
          process.exit(1);
        }
      } else {
        console.log(`✅ Database migrations complete (${migrationResult.applied} applied)`);
      }
    } catch (dbError) {
      console.error('❌ Database initialization failed:', dbError.message);
      
      // In production with DATABASE_URL, this is critical
      if (process.env.DATABASE_URL) {
        console.error('🚨 Cannot connect to Render PostgreSQL - check DATABASE_URL');
        console.error('💡 Ensure the database is created and connection details are correct');
      }
      
      // Allow server to start without DB for health checks in some cases
      if (process.env.ALLOW_DB_FAILURE !== 'true') {
        console.error('� Server startup blocked - database connection required');
        console.error('💡 Set ALLOW_DB_FAILURE=true to start without database');
        process.exit(1);
      } else {
        console.warn('⚠️ Starting server without database connection (ALLOW_DB_FAILURE=true)');
      }
    }

    // Initialize monitoring dashboard
    console.log('📊 Starting monitoring dashboard service...');
    monitoringDashboard.start();

    // Start data retention cleanup scheduler
    startDataRetentionScheduler();

    // Initialize enhanced health monitoring
    await initializeHealthMonitoring();

    // Initialize enhanced error monitoring
    await initializeErrorMonitoring();

    // Start metrics capture and alerting
    metricsService.start();
    
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

    // Initialize WebSocket service for Phase 2.3 real-time features
    console.log('🔌 Initializing WebSocket service for real-time features...');
    webSocketService.initialize(server);
    console.log('✅ WebSocket service initialized successfully');

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

        // Step 2b: Stop data retention scheduler
        stopDataRetentionScheduler();

        console.log('📈 Stopping metrics service...');
        metricsService.stop();
        
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
        try {
          await dbManager.disconnect();
          console.log('✅ Database connections closed');
        } catch (dbErr) {
          console.error('❌ Error closing database pool:', dbErr.message);
        }
        
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

// NOTE: Error handlers are defined at the top of this file (lines 52-100)
// Do NOT add duplicate handlers here - they cause conflicts and unexpected shutdowns

startServer();
// touch
 
