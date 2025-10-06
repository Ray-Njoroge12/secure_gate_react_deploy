/**
 * Mock Server for Security and Performance Testing
 * This server provides mock endpoints to allow testing when PostgreSQL is unavailable
 * WARNING: This is NOT for production use - only for testing the testing infrastructure
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Mock user database
const mockUsers = new Map([
    ['admin@example.com', {
        id: 1,
        email: 'admin@example.com',
        password: '$2a$10$mockHashedPassword', // Not actually hashed for mock
        role: 'admin',
        name: 'Admin User'
    }],
    ['user@example.com', {
        id: 2,
        email: 'user@example.com',
        password: '$2a$10$mockHashedPassword',
        role: 'user',
        name: 'Regular User'
    }]
]);

// Mock visitors database
const mockVisitors = new Map();
let visitorIdCounter = 1;

// Mock session store
const mockSessions = new Map();

// Health Check Endpoints
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        mode: 'mock',
        uptime: process.uptime(),
        version: '1.0.0-mock'
    });
});

app.get('/health/detailed', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mode: 'mock',
        checks: {
            database: { status: 'mock', responseTime: 1 },
            memory: { status: 'healthy', usage: process.memoryUsage() },
            uptime: process.uptime()
        }
    });
});

// Authentication Endpoints
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    // Simulate validation delay
    setTimeout(() => {
        const user = mockUsers.get(email);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create mock session
        const sessionId = `session_${Date.now()}_${Math.random()}`;
        mockSessions.set(sessionId, {
            userId: user.id,
            email: user.email,
            role: user.role,
            createdAt: new Date()
        });
        
        res.json({
            success: true,
            token: `mock_jwt_${sessionId}`,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name
            }
        });
    }, 50); // Simulate DB lookup time
});

app.post('/api/auth/register', (req, res) => {
    const { email, password, name } = req.body;
    
    if (mockUsers.has(email)) {
        return res.status(400).json({ error: 'User already exists' });
    }
    
    const newUser = {
        id: mockUsers.size + 1,
        email,
        password: `$2a$10$mock${password}`,
        role: 'user',
        name
    };
    
    mockUsers.set(email, newUser);
    
    res.status(201).json({
        success: true,
        user: {
            id: newUser.id,
            email: newUser.email,
            role: newUser.role,
            name: newUser.name
        }
    });
});

app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.replace('mock_jwt_', '');
        mockSessions.delete(token);
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
});

// Visitor Management Endpoints
app.get('/api/visitors', (req, res) => {
    // Simulate DB query delay
    setTimeout(() => {
        const visitors = Array.from(mockVisitors.values());
        res.json({
            success: true,
            data: visitors,
            count: visitors.length
        });
    }, 10);
});

app.post('/api/visitors', (req, res) => {
    const { name, email, phone, purpose, inviteCode } = req.body;
    
    // Validation
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }
    
    const visitor = {
        id: visitorIdCounter++,
        name,
        email,
        phone: phone || null,
        purpose: purpose || 'Visit',
        inviteCode: inviteCode || `INV${Date.now()}`,
        status: 'pending',
        qrCode: `QR${Date.now()}`,
        createdAt: new Date().toISOString()
    };
    
    mockVisitors.set(visitor.id, visitor);
    
    res.status(201).json({
        success: true,
        data: visitor
    });
});

app.get('/api/visitors/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const visitor = mockVisitors.get(id);
    
    if (!visitor) {
        return res.status(404).json({ error: 'Visitor not found' });
    }
    
    res.json({
        success: true,
        data: visitor
    });
});

app.put('/api/visitors/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const visitor = mockVisitors.get(id);
    
    if (!visitor) {
        return res.status(404).json({ error: 'Visitor not found' });
    }
    
    const updated = { ...visitor, ...req.body, updatedAt: new Date().toISOString() };
    mockVisitors.set(id, updated);
    
    res.json({
        success: true,
        data: updated
    });
});

app.delete('/api/visitors/:id', (req, res) => {
    const id = parseInt(req.params.id);
    
    if (!mockVisitors.has(id)) {
        return res.status(404).json({ error: 'Visitor not found' });
    }
    
    mockVisitors.delete(id);
    
    res.json({
        success: true,
        message: 'Visitor deleted successfully'
    });
});

// Admin Endpoints
app.get('/api/admin/users', (req, res) => {
    const users = Array.from(mockUsers.values()).map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        name: u.name
    }));
    
    res.json({
        success: true,
        data: users
    });
});

app.get('/api/admin/stats', (req, res) => {
    res.json({
        success: true,
        data: {
            totalUsers: mockUsers.size,
            totalVisitors: mockVisitors.size,
            activeSessions: mockSessions.size,
            uptime: process.uptime()
        }
    });
});

// Vulnerable endpoints for security testing
app.get('/api/search', (req, res) => {
    // Intentionally vulnerable to test XSS detection
    const query = req.query.q;
    res.send(`<h1>Search Results for: ${query}</h1>`);
});

app.get('/api/user-data', (req, res) => {
    // Intentionally vulnerable to test SQL injection detection
    const userId = req.query.id;
    // This would normally be vulnerable: SELECT * FROM users WHERE id = ${userId}
    res.json({
        mockNote: 'This would be vulnerable to SQLi if using real DB',
        query: `SELECT * FROM users WHERE id = ${userId}`
    });
});

// Performance testing endpoints
app.get('/api/slow-endpoint', async (req, res) => {
    // Simulate slow database query
    await new Promise(resolve => setTimeout(resolve, 500));
    res.json({ message: 'This was intentionally slow' });
});

app.post('/api/bulk-operation', async (req, res) => {
    // Simulate bulk operation
    const items = req.body.items || [];
    await new Promise(resolve => setTimeout(resolve, items.length * 10));
    res.json({ processed: items.length });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        mode: 'mock'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
        mode: 'mock'
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🧪 MOCK SERVER STARTED FOR TESTING');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Port: ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log('');
    console.log('⚠️  WARNING: This is a MOCK server for testing only!');
    console.log('   - Mock database (in-memory)');
    console.log('   - Mock authentication (insecure)');
    console.log('   - NOT for production use');
    console.log('');
    console.log('✅ Ready for security and performance testing');
    console.log('═══════════════════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing mock server');
    server.close(() => {
        console.log('Mock server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing mock server');
    server.close(() => {
        console.log('Mock server closed');
        process.exit(0);
    });
});

export default app;
