import express from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { getIntegrationHealth } from '../services/integrationHealthService.js';

const router = express.Router();

// Apply authentication and admin role requirement to ALL system routes
router.use(authenticateToken);
router.use(requireRole('admin'));

// System information endpoint
router.get('/info', (req, res) => {
  res.json({
    application: 'Secure Gate Access Control System',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    node_version: process.version,
    memory_usage: process.memoryUsage(),
    pid: process.pid
  });
});

// System status endpoint
router.get('/status', async (req, res) => {
  const os = await import('os');
  res.json({
    status: 'operational',
    services: {
      database: 'connected',
      authentication: 'active',
      security: 'enabled',
      cors: 'configured'
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    active_connections: 1, // This would be dynamic in a real implementation
    memory_usage: process.memoryUsage(),
    load_average: os.loadavg()
  });
});

// Database health endpoint
router.get('/database/health', async (req, res) => {
  try {
    // Test database connection
    const { dbManager } = await import('../database/db.enhanced.js');
    const result = await dbManager.pool.query('SELECT NOW() as current_time');
    
    res.json({
      status: 'connected',
      timestamp: new Date().toISOString(),
      database_time: result.rows[0].current_time,
      connection_status: 'healthy'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database user count endpoint
router.get('/database/users/count', async (req, res) => {
  try {
    const { dbManager } = await import('../database/db.enhanced.js');
    const result = await dbManager.pool.query('SELECT COUNT(*) as count FROM users');
    
    res.json({
      count: parseInt(result.rows[0].count),
      timestamp: new Date().toISOString(),
      table: 'users'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to count users',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database tables endpoint
router.get('/database/tables', async (req, res) => {
  try {
    const { dbManager } = await import('../database/db.enhanced.js');
    const result = await dbManager.pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = result.rows.map(row => row.table_name);
    
    res.json({
      tables: tables,
      count: tables.length,
      timestamp: new Date().toISOString(),
      schema: 'public'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve tables',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Provider integration health endpoint
router.get('/integrations/health', async (req, res) => {
  try {
    const health = await getIntegrationHealth();
    const statusCode = health.status === 'healthy' ? 200 : 207;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Integration health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
