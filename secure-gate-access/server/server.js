// server/server.js
import './load-env.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// Load console override for production safety (MUST BE FIRST)
import './src/config/consoleOverride.js';

// Import and validate environment configuration FIRST
import EnvironmentConfig from './src/config/environment.js';

// Enhanced health monitoring imports
import { enhancedHealthMonitoring as healthCheck } from './src/services/healthCore.js';
import { createHealthMonitoring } from './integration/health-monitoring-integration.js';
import loggingService from './src/services/loggingService.js';
import { getDataRetentionSchedulerNotice, getStartupConsoleMessages } from './src/utils/startupLogHygiene.js';

// Enhanced error monitoring imports
import { createErrorMonitoring } from './integration/error-monitoring-integration.js';

// Import migration service for auto-migration on startup
import migrationService from './src/services/migrationService.js';

// Import data retention scheduler for GDPR compliance
import retentionScheduler from './src/jobs/retentionScheduler.js';

// Validate environment and get configuration (must await async function)
const envValidation = await EnvironmentConfig.validateAndReport();
if (!envValidation.isValid && process.env.NODE_ENV === 'production') {
  console.error('🚨 Server startup blocked due to configuration errors');
  process.exit(1);
} else if (!envValidation.isValid) {
  console.warn('⚠️  Configuration warnings detected - proceeding in non-production mode');
}

console.log('🔐 Environment validation passed - starting secure server...');

import app from './src/app.js';
// Force restart
import { dbManager } from './src/database/db.enhanced.js';
// Don't extract pool here - it's null until initializeAsync() is called
// Access dbManager.pool dynamically when needed
import monitoringDashboard from './src/services/monitoringDashboardService.js';
import metricsService from './src/services/metricsService.js';
import { startDataRetentionScheduler, stopDataRetentionScheduler } from './src/services/dataRetentionService.js';

// Import WebSocket service for Phase 2.3 real-time features
import webSocketService from './src/services/websocketService.js';

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_DEVELOPMENT = NODE_ENV === 'development' || NODE_ENV === 'local';
const PRODUCTION_DEFAULT_PORT = 5000;
const DEVELOPMENT_PREFERRED_PORT = 5001;

function parsePortValue(rawPort) {
  const parsed = Number(rawPort);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return null;
  }
  return parsed;
}

const explicitPort = process.env.PORT ? parsePortValue(process.env.PORT) : null;
if (process.env.PORT && explicitPort === null) {
  console.error(`🚨 Server startup blocked - invalid PORT value: ${process.env.PORT}`);
  console.error('💡 PORT must be an integer between 1 and 65535.');
  process.exit(1);
}

const REQUESTED_PORT = explicitPort ?? (IS_DEVELOPMENT ? DEVELOPMENT_PREFERRED_PORT : PRODUCTION_DEFAULT_PORT);

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

// Initialize monitoring integrations
let healthMonitoring = null;
let errorMonitoring = null;

async function initializeHealthMonitoring() {
  try {
    healthMonitoring = await createHealthMonitoring(app, healthCheck);
    loggingService.logAPI('info', 'Enhanced health monitoring initialized successfully', null, {
      endpoints: ['/health', '/health/live', '/health/ready', '/health/startup', '/health/detailed'],
      middleware: ['requestId', 'healthMiddleware'],
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

async function resolveStartupPort(preferredPort) {
  const preferredPortAvailable = await checkPortAvailability(preferredPort);
  if (preferredPortAvailable) {
    console.log(`✅ Port ${preferredPort} is available`);
    return preferredPort;
  }

  console.warn(`⚠️ Preferred startup port ${preferredPort} is already in use.`);
  console.warn(`💡 Check active listeners: lsof -nP -iTCP:${preferredPort} -sTCP:LISTEN`);

  if (!IS_DEVELOPMENT) {
    console.error(`🚨 Server startup blocked - port ${preferredPort} is already in use`);
    console.error('💡 Set a free PORT value before starting the server.');
    return null;
  }

  if (preferredPort === DEVELOPMENT_PREFERRED_PORT) {
    console.error(`🚨 Development startup blocked - port ${DEVELOPMENT_PREFERRED_PORT} is already in use`);
    console.error('💡 Another local backend session may already be running. Stop it before starting a new one.');
    return null;
  }

  const fallbackPortAvailable = await checkPortAvailability(DEVELOPMENT_PREFERRED_PORT);
  if (!fallbackPortAvailable) {
    console.error(`🚨 Development startup blocked - fallback port ${DEVELOPMENT_PREFERRED_PORT} is already in use`);
    console.error('💡 Another local backend session may already be running. Stop it before starting a new one.');
    return null;
  }

  console.warn(`↪️ Auto-fallback enabled in development: switching to port ${DEVELOPMENT_PREFERRED_PORT}`);
  if (preferredPort === 5000) {
    console.warn('💡 Port 5000 is commonly occupied by macOS services; using 5001 for local backend startup.');
  }

  return DEVELOPMENT_PREFERRED_PORT;
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
    const startupPort = await resolveStartupPort(REQUESTED_PORT);
    if (!startupPort) {
      process.exit(1);
    }
    process.env.PORT = String(startupPort);

    // Initialize the database connection first
    console.log('🔄 Initializing database connection...');
    try {
      await dbManager.initializeAsync();
      console.log('✅ Database connection established');

      // Run migrations automatically after database connection
      console.log('🔄 Running database migrations...');
      const migrationResult = await migrationService.runMigrations();
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
        console.error('🚨 Cannot connect to database - check DATABASE_URL');
        console.error('💡 Ensure the database is created and connection details are correct');
      }

      // Prevent ALLOW_DB_FAILURE from bypassing the guard in production
      if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DB_FAILURE === 'true') {
        console.error('FATAL: ALLOW_DB_FAILURE=true is not permitted in production. Exiting.');
        process.exit(1);
      }

      // Allow server to start without DB for health checks in some cases
      if (process.env.ALLOW_DB_FAILURE !== 'true') {
        console.error('Server startup blocked - database connection required');
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
    const server = app.listen(startupPort, '0.0.0.0', () => {
      getStartupConsoleMessages({ port: startupPort, nodeEnv: process.env.NODE_ENV })
        .forEach((message) => console.log(message));

      // Log server startup event
      loggingService.logInfo('Server started successfully', {
        port: startupPort,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    });

    // Initialize WebSocket service for Phase 2.3 real-time features
    console.log('🔌 Initializing WebSocket service for real-time features...');
    await webSocketService.initialize(server);
    console.log('✅ WebSocket service initialized successfully');

    // Initialize data retention scheduler for GDPR compliance
    if (process.env.ENABLE_DATA_RETENTION === 'true') {
      console.log('📅 Starting data retention scheduler...');
      retentionScheduler.start();
      console.log('✅ Data retention scheduler started successfully');
    } else {
      const dataRetentionSchedulerNotice = getDataRetentionSchedulerNotice();
      if (dataRetentionSchedulerNotice) {
        console.log(dataRetentionSchedulerNotice);
      }
    }

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
