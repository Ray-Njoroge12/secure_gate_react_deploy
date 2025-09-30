// Top-level server entry (secure-gate-access/server.js)
// Enhanced with comprehensive health monitoring integration
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import pool from './database/db.js';
import userRoutes from './server/src/routes/userRoutes.js';

// Import missing API routes
import visitorRoutes from './server/src/routes/visitorRoutes.js';
import adminRoutes from './server/src/routes/adminRoutes.js';
import healthRoutes from './server/src/routes/healthRoutes.js';

// Enhanced health monitoring imports
import { healthCheck } from './server/src/services/healthService.js';
import { createHealthMonitoring } from './server/integration/health-monitoring-integration.js';
import loggingService from './server/src/services/loggingService.js';
import { correlationIdMiddleware, requestLoggingMiddleware } from './server/src/middleware/loggingMiddleware.js';

// Enhanced error monitoring imports
import { createErrorMonitoring, createEnhancedErrorHandler } from './server/integration/error-monitoring-integration.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced middleware setup
app.use(cors());
app.use(express.json());

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
  // Quick health check for load balancers (fallback)
  app.get('/health', async (req, res) => {
    try {
      const result = await healthCheck.quickCheck();
      const statusCode = result.status === 'ok' ? 200 : 503;
      res.status(statusCode).json(result);
    } catch (error) {
      loggingService.logAPI('error', 'Basic health check failed', req, {
        error: error.message
      });
      res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed',
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

// API Routes - Mount all endpoints as per api-documentation.yaml
app.use('/api/users', userRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/health', healthRoutes);

// Enhanced startup sequence
async function startServer() {
  try {
    // Test database connection
    try {
      await pool.query('SELECT 1');
      loggingService.logAPI('info', 'Database connection established successfully');
    } catch (error) {
      loggingService.logAPI('error', 'Database connection failed', null, { error: error.message });
    }

    // Initialize enhanced health monitoring
    await initializeHealthMonitoring();

    // Initialize enhanced error monitoring
    await initializeErrorMonitoring();

    // Start the server
    const server = app.listen(PORT, () => {
      loggingService.logAPI('info', 'Server started successfully', null, {
        port: PORT,
        url: `http://localhost:${PORT}`,
        environment: process.env.NODE_ENV || 'development',
        healthEndpoints: {
          basic: '/health',
          detailed: '/health/detailed',
          live: '/health/live',
          ready: '/health/ready',
          startup: '/health/startup'
        }
      });
    });

    // Enhanced error handling for server
    server.on('error', (error) => {
      loggingService.logAPI('error', 'Server error occurred', null, {
        error: error.message,
        code: error.code,
        port: PORT
      });
    });

    return server;

  } catch (error) {
    loggingService.logAPI('error', 'Failed to start server', null, {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
