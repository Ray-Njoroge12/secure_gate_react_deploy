/**
 * Minimal Server for Health Check Testing
 * Simplified version focusing on health endpoints
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { 
  generalApiLimiter, 
  authLimiter, 
  otpLimiter, 
  sensitiveOperationsLimiter,
  publicEndpointsLimiter,
  rateLimitStatus 
} from './middleware/rateLimiting.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(cookieParser());
app.use(compression());

// Apply rate limiting based on endpoint type
app.use(generalApiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/otp', otpLimiter);
app.use('/api/admin', sensitiveOperationsLimiter);
app.use('/health', publicEndpointsLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Detailed health check
app.get('/health/detailed', (req, res) => {
  const memUsage = process.memoryUsage();
  
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    system: {
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024)
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform
      }
    }
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    services: {
      database: 'not_configured',
      redis: 'not_configured'
    }
  });
});

// Startup probe
app.get('/health/startup', (req, res) => {
  const uptime = process.uptime();
  const minStartupTime = 5; // 5 seconds
  
  if (uptime < minStartupTime) {
    res.status(200).json({
      status: 'starting',
      timestamp: new Date().toISOString(),
      uptime,
      message: `Starting up... ${Math.round(uptime * 10) / 10}s elapsed`
    });
  } else {
    res.status(200).json({
      status: 'started',
      timestamp: new Date().toISOString(),
      uptime,
      message: 'Application startup complete'
    });
  }
});

// Rate limiting status endpoint
app.get('/api/rate-limits/status', rateLimitStatus);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Minimal server running on http://localhost:${PORT}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('✅ Health check endpoints available:');
  console.log('   - GET /health');
  console.log('   - GET /api/health');
  console.log('   - GET /health/detailed');
  console.log('   - GET /health/live');
  console.log('   - GET /health/ready');
  console.log('   - GET /health/startup');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received - shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received - shutting down gracefully');
  process.exit(0);
});
