import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

const app = express();

// Basic middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(cookieParser());
app.use(compression());

// Rate limiting with environment-specific configuration
const rateLimitConfig = {
  windowMs: process.env.NODE_ENV === 'test' ? 60 * 1000 : 15 * 60 * 1000, // 1 min for test, 15 min for prod
  max: process.env.NODE_ENV === 'test' ? 1000 : 100, // Higher limit for testing
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: process.env.NODE_ENV === 'test' ? 1 : 15
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
};

const limiter = rateLimit(rateLimitConfig);
app.use(limiter);

// Enhanced JSON parsing with proper error handling
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        error: 'Invalid JSON format',
        message: 'Request body must be valid JSON',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
      message: 'Please provide a valid authentication token'
    });
  }

  // In a real implementation, you would verify the JWT token here
  // For now, we'll do basic token validation
  if (token.startsWith('mock_jwt_token_')) {
    req.user = { id: 1, role: 'user' };
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Invalid token',
      message: 'The provided token is invalid or expired'
    });
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This endpoint requires one of the following roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

// Health check endpoints (no auth required)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Basic API endpoint (no auth required)
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// Authentication endpoints (no auth required)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required'
    });
  }
  
  // Mock authentication - in production, this would validate against database
  if (username === 'test_user' && password === 'test_password') {
    const token = 'mock_jwt_token_' + Math.floor(Date.now() / 1000);
    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: 1,
        username: username,
        role: 'user'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, email } = req.body;
  
  if (!username || !password || !email) {
    return res.status(400).json({
      success: false,
      error: 'Username, password, and email are required'
    });
  }
  
  // Mock registration - in production, this would create user in database
  res.json({
    success: true,
    message: 'User registered successfully',
    user: {
      id: Date.now(),
      username: username,
      email: email,
      role: 'user'
    }
  });
});

// Protected endpoints (require authentication)
app.get('/api/residents', authenticateToken, requireRole(['admin', 'resident']), (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'John Doe', email: 'john@example.com', unit: 'A101' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', unit: 'B202' }
    ]
  });
});

app.get('/api/guards', authenticateToken, requireRole(['admin', 'guard']), (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'Guard One', shift: 'Morning', status: 'active' },
      { id: 2, name: 'Guard Two', shift: 'Evening', status: 'active' }
    ]
  });
});

app.get('/api/admin', authenticateToken, requireRole(['admin']), (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: 150,
      totalVisitors: 25,
      systemStatus: 'operational',
      lastBackup: new Date().toISOString()
    }
  });
});

// Visitor management endpoints (require authentication)
app.get('/api/visitors', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'Visitor One', email: 'visitor1@example.com', status: 'checked_in' },
      { id: 2, name: 'Visitor Two', email: 'visitor2@example.com', status: 'checked_out' }
    ]
  });
});

app.post('/api/visitors', authenticateToken, (req, res) => {
  const { name, email, phone } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      error: 'Name and email are required'
    });
  }
  
  // Mock visitor creation
  const newVisitor = {
    id: Date.now(),
    name: name,
    email: email,
    phone: phone || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  res.status(201).json({
    success: true,
    message: 'Visitor created successfully',
    data: newVisitor
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Enhanced error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle specific error types
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format',
      message: 'Request body must be valid JSON',
      timestamp: new Date().toISOString()
    });
  }
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Payload too large',
      message: 'Request body exceeds size limit',
      timestamp: new Date().toISOString()
    });
  }
  
  // Generic error handler
  res.status(500).json({ 
    success: false,
    error: 'Internal Server Error',
    message: 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

export default app;
