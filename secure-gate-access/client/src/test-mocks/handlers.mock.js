/**
 * MSW API Handlers for Frontend Integration Tests
 * Mocks backend API responses for realistic integration testing
 */

import { rest } from 'msw';

const API_URL = 'http://localhost:5001/api';

// Mock user data
const mockUsers = {
  admin: {
    id: 1,
    username: 'admin',
    email: 'admin@test.com',
    role: 'admin',
    phone: '+254700000001',
    unit: 'Admin'
  },
  guard: {
    id: 2,
    username: 'guard',
    email: 'guard@test.com',
    role: 'guard',
    phone: '+254700000002',
    unit: 'Gate 1'
  },
  resident: {
    id: 3,
    username: 'resident',
    email: 'resident@test.com',
    role: 'resident',
    phone: '+254700000003',
    unit: 'A101'
  }
};

// Mock visitors data  
const mockVisitors = [
  {
    id: 1,
    name: 'John Doe',
    phone: '+254700123456',
    email: 'john@example.com',
    purpose: 'Meeting',
    status: 'pending',
    host_id: 3,
    invite_code: 'ABC123',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Jane Smith',
    phone: '+254700123457',
    email: 'jane@example.com',
    purpose: 'Delivery',
    status: 'approved',
    host_id: 3,
    invite_code: 'DEF456',
    created_at: new Date().toISOString()
  }
];

// Authentication handlers
export const authHandlers = [
  // Login
  rest.post(`${API_URL}/auth/login`, (req, res, ctx) => {
    const { email, password } = req.body;

    const user = Object.values(mockUsers).find(u => u.email === email);

    if (!user || password !== 'testpass123') {
      return res(
        ctx.status(401),
        ctx.json({ error: 'Invalid credentials' })
      );
    }

    return res(
      ctx.status(200),
      ctx.cookie('token', `mock-jwt-token-${user.role}`, { httpOnly: true, path: '/' }),
      ctx.json({
        token: 'mock-jwt-token-' + user.role,
        user,
        message: 'Login successful'
      })
    );
  }),

  // Register
  rest.post(`${API_URL}/auth/register`, (req, res, ctx) => {
    const userData = req.body;

    return res(
      ctx.status(201),
      ctx.json({
        user: { ...userData, id: 99, role: 'resident' },
        token: 'mock-jwt-token-resident',
        message: 'Registration successful'
      })
    );
  }),

  // Logout
  rest.post(`${API_URL}/auth/logout`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'Logout successful' })
    );
  }),

  // Get current user
  rest.get(`${API_URL}/auth/me`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ user: mockUsers.resident })
    );
  })
];

// Visitor management handlers
export const visitorHandlers = [
  // Get all visitors
  rest.get(`${API_URL}/visitors`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        visitors: mockVisitors,
        total: mockVisitors.length
      })
    );
  }),

  //Create visitor - Return visitor directly, not wrapped in object
  rest.post(`${API_URL}/visitors`, (req, res, ctx) => {
    const visitorData = req.body;

    const newVisitor = {
      id: mockVisitors.length + 1,
      ...visitorData,
      status: 'pending',
      invite_code: 'NEW' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      created_at: new Date().toISOString()
    };

    return res(
      ctx.status(201),
      ctx.json(newVisitor)
    );
  }),

  // Get visitor by ID
  rest.get(`${API_URL}/visitors/:id`, (req, res, ctx) => {
    const visitor = mockVisitors.find(v => v.id === parseInt(req.params.id));

    if (!visitor) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Visitor not found' })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({ visitor })
    );
  }),

  // Update visitor
  rest.put(`${API_URL}/visitors/:id`, (req, res, ctx) => {
    const visitorData = req.body;
    const visitor = mockVisitors.find(v => v.id === parseInt(req.params.id));

    if (!visitor) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Visitor not found' })
      );
    }

    const updatedVisitor = { ...visitor, ...visitorData };
    return res(
      ctx.status(200),
      ctx.json({ visitor: updatedVisitor })
    );
  }),

  // Check-in visitor
  rest.post(`${API_URL}/visitors/:id/check-in`, (req, res, ctx) => {
    const visitor = mockVisitors.find(v => v.id === parseInt(req.params.id));

    if (!visitor) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Visitor not found' })
      );
    }

    if (visitor.status !== 'approved') {
      return res(
        ctx.status(422),
        ctx.json({ error: 'Visitor cannot be checked in' })
      );
    }

    visitor.status = 'on_premise';
    visitor.check_in = new Date().toISOString();

    return res(
      ctx.status(200),
      ctx.json({
        message: 'Visitor checked in successfully',
        check_in: visitor.check_in
      })
    );
  }),

  // Check-out visitor
  rest.post(`${API_URL}/visitors/:id/check-out`, (req, res, ctx) => {
    const visitor = mockVisitors.find(v => v.id === parseInt(req.params.id));

    if (!visitor) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Visitor not found' })
      );
    }

    if (visitor.status !== 'on_premise') {
      return res(
        ctx.status(422),
        ctx.json({ error: 'Visitor is not checked in' })
      );
    }

    visitor.status = 'checked_out';
    visitor.check_out = new Date().toISOString();

    return res(
      ctx.status(200),
      ctx.json({
        message: 'Visitor checked out successfully',
        check_out: visitor.check_out
      })
    );
  }),

  // Delete visitor
  rest.delete(`${API_URL}/visitors/:id`, (req, res, ctx) => {
    const index = mockVisitors.findIndex(v => v.id === parseInt(req.params.id));

    if (index === -1) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Visitor not found' })
      );
    }

    mockVisitors.splice(index, 1);

    return res(
      ctx.status(200),
      ctx.json({
        message: 'Visitor deleted successfully'
      })
    );
  })
];

// Dashboard/metrics handlers
export const dashboardHandlers = [
  // Admin metrics
  rest.get(`${API_URL}/admin/metrics`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        totalUsers: 150,
        totalVisitors: 1250,
        activeVisitors: 15,
        visitorsByStatus: {
          pending: 5,
          approved: 8,
          on_premise: 15,
          checked_out: 1222
        },
        todayStats: {
          checkIns: 23,
          checkOuts: 20,
          newRegistrations: 3
        }
      })
    );
  }),

  // Guard dashboard
  rest.get(`${API_URL}/visitors/active`, (req, res, ctx) => {
    const activeVisitors = mockVisitors.filter(
      v => v.status === 'approved' || v.status === 'on_premise'
    );

    return res(
      ctx.status(200),
      ctx.json(activeVisitors)
    );
  }),

  // Resident dashboard metrics
  rest.get(`${API_URL}/resident/dashboard`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        stats: {
          myVisitors: 5,
          pendingVisitors: 2,
          todayVisitors: 1
        },
        upcomingVisitors: mockVisitors.filter(v => v.status === 'approved').slice(0, 3)
      })
    );
  })
];

// Admin handlers
export const adminHandlers = [
  // Get audit logs
  rest.get(`${API_URL}/admin/audit-logs`, (req, res, ctx) => {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const mockAuditLogs = [
      {
        id: 1,
        action: 'user.login',
        resource: 'auth',
        user_id: 3,
        user_role: 'resident',
        ip_address: '192.168.1.100',
        timestamp: new Date().toISOString(),
        details: { outcome: 'success' }
      },
      {
        id: 2,
        action: 'visitor.create',
        resource: 'visitor',
        user_id: 3,
        user_role: 'resident',
        ip_address: '192.168.1.100',
        timestamp: new Date().toISOString(),
        details: { visitor_id: 1 }
      }
    ];

    return res(
      ctx.status(200),
      ctx.json({
        logs: mockAuditLogs,
        total: mockAuditLogs.length,
        page,
        limit
      })
    );
  })
];

// Combine all handlers
export const handlers = [
  ...authHandlers,
  ...visitorHandlers,
  ...dashboardHandlers,
  ...adminHandlers
];

export default handlers;
