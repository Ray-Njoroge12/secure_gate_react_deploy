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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Health check endpoints
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

// Basic API endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// Authentication endpoints
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
    res.json({
      success: true,
      message: 'Login successful',
      token: 'mock_jwt_token_' + Date.now(),
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

// Role-based endpoints
app.get('/api/residents', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'John Doe', email: 'john@example.com', unit: 'A101' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', unit: 'B202' }
    ]
  });
});

app.get('/api/guards', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'Guard One', shift: 'Morning', status: 'active' },
      { id: 2, name: 'Guard Two', shift: 'Evening', status: 'active' }
    ]
  });
});

app.get('/api/admin', (req, res) => {
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

// Visitor management endpoints
app.get('/api/visitors', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'Visitor One', email: 'visitor1@example.com', status: 'checked_in' },
      { id: 2, name: 'Visitor Two', email: 'visitor2@example.com', status: 'checked_out' }
    ]
  });
});

app.post('/api/visitors', (req, res) => {
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

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

export default app;
