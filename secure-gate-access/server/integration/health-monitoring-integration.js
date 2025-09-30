// server/integration/health-monitoring-integration.js
/**
 * Health Monitoring Integration Module
 * Seamlessly integrates enhanced health monitoring into existing Express application
 */

import express from 'express';
import healthRoutes from '../src/routes/healthRoutes.js';
import { enhancedHealthMonitoring } from '../src/services/enhancedHealthService.js';
import loggingService from '../src/services/loggingService.js';
import { correlationIdMiddleware } from '../src/middleware/loggingMiddleware.js';

/**
 * Health monitoring integration class
 */
class HealthMonitoringIntegration {
  constructor(app, healthCheck) {
    this.app = app;
    this.healthCheck = healthCheck;
    this.enhancedHealth = enhancedHealthMonitoring;
    this.isInitialized = false;
  }

  /**
   * Initialize health monitoring integration
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        loggingService.logAPI('warn', 'Health monitoring already initialized');
        return;
      }

      // Enhanced health service is already initialized
      // Just ensure it's ready to use

      // Set up health routes with correlation ID middleware
      this.setupHealthRoutes();

      // Set up health monitoring middleware
      this.setupHealthMiddleware();

      // Register graceful shutdown handlers
      this.setupGracefulShutdown();

      this.isInitialized = true;

      loggingService.logAPI('info', 'Health monitoring integration initialized successfully', null, {
        enhancedHealthEnabled: true,
        routesRegistered: true,
        middlewareEnabled: true,
        gracefulShutdownEnabled: true
      });

    } catch (error) {
      loggingService.logAPI('error', 'Failed to initialize health monitoring integration', null, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Set up health routes with proper middleware
   */
  setupHealthRoutes() {
    // Create health router with correlation ID middleware
    const healthRouter = express.Router();
    
    // Apply correlation ID middleware to all health routes
    healthRouter.use(correlationIdMiddleware);

    // Mount health routes
    healthRouter.use('/', healthRoutes);

    // Mount the health router
    this.app.use('/health', healthRouter);

    loggingService.logAPI('info', 'Health routes registered', null, {
      basePath: '/health',
      middleware: ['correlationId', 'healthRoutes']
    });
  }

  /**
   * Set up health monitoring middleware
   */
  setupHealthMiddleware() {
    // Add health status to request context
    this.app.use(async (req, res, next) => {
      try {
        // Add health service to request context
        req.healthService = this.enhancedHealth;
        
        // Add quick health check function
        req.getHealthStatus = async () => {
          return await this.enhancedHealth.getQuickHealth();
        };

        next();
      } catch (error) {
        loggingService.logAPI('error', 'Health middleware error', req, {
          error: error.message
        });
        next(); // Continue even if health check fails
      }
    });

    loggingService.logAPI('info', 'Health monitoring middleware enabled');
  }

  /**
   * Set up graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      loggingService.logAPI('info', `Received ${signal}, initiating graceful shutdown`, null, {
        signal,
        shutdownStarted: new Date().toISOString()
      });

      try {
        // Mark application as shutting down
        await this.enhancedHealth.markShuttingDown();

        // Give ongoing requests time to complete
        setTimeout(() => {
          loggingService.logAPI('info', 'Graceful shutdown completed');
          process.exit(0);
        }, 5000);

      } catch (error) {
        loggingService.logAPI('error', 'Error during graceful shutdown', null, {
          error: error.message
        });
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      loggingService.logAPI('error', 'Uncaught exception', null, {
        error: error.message,
        stack: error.stack
      });
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      loggingService.logAPI('error', 'Unhandled promise rejection', null, {
        reason: reason?.toString(),
        promise: promise?.toString()
      });
      gracefulShutdown('unhandledRejection');
    });

    loggingService.logAPI('info', 'Graceful shutdown handlers registered');
  }

  /**
   * Get health monitoring status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      enhancedHealthEnabled: this.enhancedHealth !== null,
      routesRegistered: true,
      middlewareEnabled: true
    };
  }

  /**
   * Get comprehensive health report
   */
  async getHealthReport() {
    if (!this.isInitialized) {
      throw new Error('Health monitoring not initialized');
    }

    return await this.enhancedHealth.getComprehensiveHealth();
  }

  /**
   * Perform startup probe check
   */
  async performStartupProbe() {
    if (!this.isInitialized) {
      throw new Error('Health monitoring not initialized');
    }

    return await this.enhancedHealth.getStartupProbe();
  }

  /**
   * Perform readiness probe check
   */
  async performReadinessProbe() {
    if (!this.isInitialized) {
      throw new Error('Health monitoring not initialized');
    }

    return await this.enhancedHealth.getReadinessProbe();
  }

  /**
   * Perform liveness probe check
   */
  async performLivenessProbe() {
    if (!this.isInitialized) {
      throw new Error('Health monitoring not initialized');
    }

    return await this.enhancedHealth.getLivenessProbe();
  }
}

/**
 * Factory function to create and initialize health monitoring
 */
export async function createHealthMonitoring(app, healthCheck) {
  const integration = new HealthMonitoringIntegration(app, healthCheck);
  await integration.initialize();
  return integration;
}

/**
 * Utility function to validate health monitoring setup
 */
export async function validateHealthSetup(app) {
  try {
    // Test health endpoints
    const request = require('supertest');
    
    const tests = [
      '/health',
      '/health/live',
      '/health/ready',
      '/health/startup',
      '/health/detailed'
    ];

    const results = [];
    
    for (const endpoint of tests) {
      try {
        const response = await request(app).get(endpoint);
        results.push({
          endpoint,
          status: response.status,
          success: response.status < 400
        });
      } catch (error) {
        results.push({
          endpoint,
          status: 'error',
          error: error.message,
          success: false
        });
      }
    }

    const allSuccessful = results.every(result => result.success);
    
    loggingService.logAPI('info', 'Health monitoring validation completed', null, {
      allEndpointsHealthy: allSuccessful,
      results
    });

    return {
      valid: allSuccessful,
      results
    };

  } catch (error) {
    loggingService.logAPI('error', 'Health monitoring validation failed', null, {
      error: error.message
    });
    throw error;
  }
}

export default HealthMonitoringIntegration;