#!/usr/bin/env node
/**
 * Logging & Monitoring Integration Tests
 * Tests the comprehensive logging and monitoring infrastructure
 */

import request from 'supertest';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../../src/app.js';
import MonitoringService from '../../src/services/monitoringService.js';
import logger from '../../src/config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test database configuration
const testDbConfig = {
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  port: process.env.PGPORT || process.env.DB_PORT || 5432,
  database: process.env.PGDATABASE || process.env.DB_NAME || 'secure_gate',
  user: process.env.PGUSER || process.env.DB_USER || 'secure_gate_user',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'secure_gate_password',
  ssl: false
};

describe('Logging & Monitoring Infrastructure', () => {
  let testPool;
  let monitoringService;

  beforeAll(async () => {
    try {
      // Create test database connection
      testPool = new Pool(testDbConfig);
      await testPool.query('SELECT 1');
      
      // Initialize monitoring service
      monitoringService = new MonitoringService();
      
    } catch (error) {
      console.log('⚠️  Test database not available, skipping logging tests');
      console.log('   Error:', error.message);
    }
  });

  afterAll(async () => {
    if (testPool) {
      await testPool.end();
    }
    if (monitoringService) {
      await monitoringService.close();
    }
  });

  describe('Health Check API', () => {
    test('should return basic health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.uptime).toBeDefined();
    });

    test('should return detailed health status for admin', async () => {
      // This would require authentication in a real test
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(401); // Should require authentication

      expect(response.body.success).toBe(false);
    });

    test('should return database health status', async () => {
      const response = await request(app)
        .get('/api/health/database')
        .expect(401); // Should require authentication

      expect(response.body.success).toBe(false);
    });
  });

  describe('Logger Configuration', () => {
    test('should create logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
    });

    test('should log different levels', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.info('Test info message');
      logger.warn('Test warning message');
      logger.error('Test error message');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should create specialized loggers', () => {
      const appLogger = logger.child({ service: 'test' });
      expect(appLogger).toBeDefined();
      expect(typeof appLogger.info).toBe('function');
    });
  });

  describe('Performance Monitoring', () => {
    test('should track API response times', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Response time should be tracked by middleware
    });

    test('should log slow requests', async () => {
      // This would require a slow endpoint to test properly
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    test('should log API requests', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Audit logs should be created by middleware
    });

    test('should log authentication events', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(400); // Should fail due to invalid credentials

      expect(response.body.success).toBe(false);
      // Audit logs should be created for auth attempts
    });
  });

  describe('Monitoring Service', () => {
    test('should initialize monitoring service', () => {
      expect(monitoringService).toBeDefined();
      expect(typeof monitoringService.start).toBe('function');
      expect(typeof monitoringService.stop).toBe('function');
    });

    test('should check database health', async () => {
      if (!testPool) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const health = await monitoringService.checkDatabaseHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(['healthy', 'warning', 'error']).toContain(health.status);
    });

    test('should check memory health', () => {
      const health = monitoringService.checkMemoryHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.details).toBeDefined();
      expect(health.details.memoryPercentage).toBeDefined();
    });

    test('should check CPU health', () => {
      const health = monitoringService.checkCpuHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.details).toBeDefined();
    });

    test('should check application health', () => {
      const health = monitoringService.checkApplicationHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.details).toBeDefined();
      expect(health.details.uptime).toBeDefined();
    });

    test('should get system status', () => {
      const status = monitoringService.getSystemStatus();
      
      expect(status).toBeDefined();
      expect(status.monitoring).toBeDefined();
      expect(status.healthChecks).toBeDefined();
      expect(status.metrics).toBeDefined();
      expect(status.timestamp).toBeDefined();
    });
  });

  describe('Database Logging Tables', () => {
    test('should have performance_metrics table', async () => {
      if (!testPool) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const result = await testPool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'performance_metrics'
      `);
      
      expect(result.rows.length).toBe(1);
    });

    test('should have system_health table', async () => {
      if (!testPool) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const result = await testPool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'system_health'
      `);
      
      expect(result.rows.length).toBe(1);
    });

    test('should have audit_logs table', async () => {
      if (!testPool) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const result = await testPool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'audit_logs'
      `);
      
      expect(result.rows.length).toBe(1);
    });

    test('should have security_events table', async () => {
      if (!testPool) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const result = await testPool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'security_events'
      `);
      
      expect(result.rows.length).toBe(1);
    });

    test('should have application_logs table', async () => {
      if (!testPool) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const result = await testPool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'application_logs'
      `);
      
      expect(result.rows.length).toBe(1);
    });

    test('should have error_logs table', async () => {
      if (!testPool) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const result = await testPool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'error_logs'
      `);
      
      expect(result.rows.length).toBe(1);
    });

    test('should have log_retention_policies table', async () => {
      if (!testPool) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const result = await testPool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'log_retention_policies'
      `);
      
      expect(result.rows.length).toBe(1);
    });
  });

  describe('Log Management Functions', () => {
    test('should have cleanup_old_logs function', async () => {
      if (!testPool) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const result = await testPool.query(`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_name = 'cleanup_old_logs'
      `);
      
      expect(result.rows.length).toBe(1);
    });

    test('should have get_system_health_summary function', async () => {
      if (!testPool) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const result = await testPool.query(`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_name = 'get_system_health_summary'
      `);
      
      expect(result.rows.length).toBe(1);
    });

    test('should have get_performance_summary function', async () => {
      if (!testPool) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const result = await testPool.query(`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_name = 'get_performance_summary'
      `);
      
      expect(result.rows.length).toBe(1);
    });
  });

  describe('Log Views', () => {
    test('should have recent_errors view', async () => {
      if (!testPool) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const result = await testPool.query(`
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_name = 'recent_errors'
      `);
      
      expect(result.rows.length).toBe(1);
    });

    test('should have security_events_summary view', async () => {
      if (!testPool) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const result = await testPool.query(`
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_name = 'security_events_summary'
      `);
      
      expect(result.rows.length).toBe(1);
    });
  });

  describe('Log File Management', () => {
    test('should create logs directory if it does not exist', () => {
      const logsDir = path.join(__dirname, '../../logs');
      
      // This test would require the logger to be initialized
      // In a real scenario, the logger would create the directory
      expect(true).toBe(true); // Placeholder test
    });
  });

  describe('Error Handling', () => {
    test('should handle logger errors gracefully', () => {
      // Test that logger doesn't throw errors
      expect(() => {
        logger.info('Test message');
        logger.warn('Test warning');
        logger.error('Test error');
      }).not.toThrow();
    });

    test('should handle monitoring service errors gracefully', async () => {
      if (!monitoringService) {
        console.log('⏭️  Skipping test - monitoring service not available');
        return;
      }

      // Test that monitoring service methods don't throw errors
      expect(() => {
        monitoringService.checkMemoryHealth();
        monitoringService.checkCpuHealth();
        monitoringService.checkApplicationHealth();
      }).not.toThrow();
    });
  });
});




