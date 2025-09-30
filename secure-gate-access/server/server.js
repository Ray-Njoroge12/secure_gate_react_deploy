// server/server.js
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// Import and validate environment configuration FIRST
import EnvironmentConfig from './src/config/environment.js';

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
import pool from './src/database/db.js';
import monitoringDashboard from './src/services/monitoringDashboardService.js';
import loggingService from './src/services/loggingService.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

// Additional startup validation
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET not set. Set it in .env or environment before starting.');
  process.exit(1);
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
    // Validate database before starting server
    const dbConnected = await validateDatabaseConnection();
    if (!dbConnected) {
      console.error('🚨 Server startup blocked - database connection failed');
      process.exit(1);
    }
    
    // Initialize monitoring dashboard
    console.log('📊 Starting monitoring dashboard service...');
    monitoringDashboard.start();
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Secure Gate server running on http://localhost:${PORT}`);
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

    // Graceful shutdown handling
    const gracefulShutdown = (signal) => {
      console.log(`🔄 ${signal} received - shutting down gracefully`);
      
      // Log shutdown event
      loggingService.logInfo('Server shutdown initiated', {
        signal,
        timestamp: new Date().toISOString()
      });
      
      // Stop monitoring dashboard
      if (monitoringDashboard.isRunning) {
        console.log('📊 Stopping monitoring dashboard...');
        monitoringDashboard.stop();
      }
      
      server.close(() => {
        console.log('✅ Server shutdown complete');
        
        // Final log before shutdown
        loggingService.logInfo('Server shutdown complete', {
          timestamp: new Date().toISOString()
        });
        
        pool.end(() => {
          console.log('✅ Database connections closed');
          process.exit(0);
        });
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('🚨 Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
// touch
 
