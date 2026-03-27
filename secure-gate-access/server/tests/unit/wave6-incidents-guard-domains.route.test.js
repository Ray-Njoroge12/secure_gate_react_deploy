import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockQuery = jest.fn();
const mockVerifyAccessToken = jest.fn();
const mockAudit = jest.fn();
const mockEvaluateAutomationRules = jest.fn();
const mockSendWebhook = jest.fn();
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
const mockLoggingService = { warn: jest.fn(), logSecurity: jest.fn(), logInfo: jest.fn(), logError: jest.fn() };

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: mockQuery,
    pool: { query: mockQuery }
  }
}));

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({
  tokenService: { verifyAccessToken: mockVerifyAccessToken }
}));

jest.unstable_mockModule('../../src/middleware/auditLogging.js', () => ({
  default: (...args) => {
    if (args.length >= 3) {
      args[0].audit = mockAudit;
      return args[2]();
    }

    return (req, res, next) => {
      req.audit = mockAudit;
      next();
    };
  }
}));

jest.unstable_mockModule('../../src/services/automationService.js', () => ({
  evaluateAutomationRules: mockEvaluateAutomationRules
}));

jest.unstable_mockModule('../../src/services/webhookService.js', () => ({
  default: { sendWebhook: mockSendWebhook }
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: mockLogger }));
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({ default: mockLoggingService }));

describe('Wave 6 mounted route verification', () => {
  let incidentWorkflowApp;
  let guardIncidentApp;
  let guardAnalyticsApp;
  let guardRoutesApp;

  const authenticateAs = ({ id = 1, role = 'guard', estateId = 7, username, email } = {}) => {
    mockVerifyAccessToken.mockResolvedValue({ userId: id, estate_id: estateId });
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id,
        email: email || `${role}@example.com`,
        username: username || `${role}-user`,
        role,
        estate_id: estateId
      }]
    });
  };

  const buildApp = async (mountPath, routePath) => {
    const routeModule = await import(routePath);
    const { errorHandler, notFoundHandler } = await import('../../src/middleware/standardizedErrorHandler.js');
    const app = express();
    app.use(express.json());
    app.use(mountPath, routeModule.default);
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
  };

  beforeAll(async () => {
    incidentWorkflowApp = await buildApp('/api/admin/incidents', '../../src/routes/incidentWorkflowRoutes.js');
    guardIncidentApp = await buildApp('/api/guard/incidents', '../../src/routes/guardIncidentRoutes.js');
    guardAnalyticsApp = await buildApp('/api/guard/analytics', '../../src/routes/guardAnalyticsRoutes.js');
    guardRoutesApp = await buildApp('/api/guard', '../../src/routes/guardRoutes.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('incident workflow routes require authentication and reject residents', async () => {
    const unauthenticated = await request(incidentWorkflowApp).get('/api/admin/incidents/queue');
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.error.code).toBe('AUTH_TOKEN_MISSING');

    authenticateAs({ role: 'resident', estateId: 7 });
    const resident = await request(incidentWorkflowApp)
      .get('/api/admin/incidents/queue')
      .set('Authorization', 'Bearer valid-token');

    expect(resident.status).toBe(403);
    expect(resident.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  test('incident workflow close route is estate scoped and triggers automation side effects', async () => {
    authenticateAs({ id: 9, role: 'admin', estateId: 7 });
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 12, status: 'closed', estate_id: 7 }] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(incidentWorkflowApp)
      .put('/api/admin/incidents/12/status')
      .set('Authorization', 'Bearer valid-token')
      .send({ status: 'closed' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { id: 12, status: 'closed', estate_id: 7 } });
    expect(mockQuery.mock.calls[1]).toEqual([
      expect.stringContaining('AND estate_id = $4'),
      ['closed', 9, '12', 7]
    ]);
    expect(mockEvaluateAutomationRules).toHaveBeenCalledWith('incident.closed', expect.objectContaining({ id: 12 }));
    expect(mockSendWebhook).toHaveBeenCalledWith('incident.closed', expect.objectContaining({ id: 12 }));
  });

  test('incident assignment validates same-estate assignees', async () => {
    authenticateAs({ id: 9, role: 'admin', estateId: 7 });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const response = await request(incidentWorkflowApp)
      .post('/api/admin/incidents/42/assign')
      .set('Authorization', 'Bearer valid-token')
      .send({ assignedTo: 33 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Assigned user must belong to the same estate' });
    expect(mockQuery.mock.calls[1]).toEqual([
      expect.stringContaining('FROM users'),
      [33, 7]
    ]);
  });

  test('guard incident listing stays estate scoped and returns pagination in the mounted response', async () => {
    authenticateAs({ id: 4, role: 'guard', estateId: 7 });
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, category: 'vehicle', severity: 'high', guard_name: 'guard-1' }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const response = await request(guardIncidentApp)
      .get('/api/guard/incidents?severity=high&limit=5&offset=0')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        data: [{ id: 1, category: 'vehicle', severity: 'high', guardName: 'guard-1' }],
        pagination: { total: 1, limit: 5, offset: 0, pages: 1 }
      }
    });
    expect(mockQuery.mock.calls[1]).toEqual([
      expect.stringContaining('i.estate_id = $1'),
      [7, 'high', 5, 0]
    ]);
  });

  test('mounted guard incident resolution is admin-only even for the reporting guard', async () => {
    authenticateAs({ id: 4, role: 'guard', estateId: 7 });

    const response = await request(guardIncidentApp)
      .put('/api/guard/incidents/77/resolve')
      .set('Authorization', 'Bearer valid-token')
      .send({ resolution: 'Resolved by guard' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('AUTH_FORBIDDEN');
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('admins can resolve guard incidents through the mounted route', async () => {
    authenticateAs({ id: 2, role: 'admin', estateId: 7 });
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 77, guard_id: 4, estate_id: 7, category: 'vehicle', severity: 'high' }] })
      .mockResolvedValueOnce({ rows: [{ id: 77, resolution: 'Admin resolved', resolved_by: 2 }] });

    const response = await request(guardIncidentApp)
      .put('/api/guard/incidents/77/resolve')
      .set('Authorization', 'Bearer valid-token')
      .send({ resolution: 'Admin resolved' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: { message: 'Incident resolved' } });
    expect(mockAudit).toHaveBeenCalledWith('incident.resolve', 'incident', '77', expect.objectContaining({ outcome: 'success' }));
  });

  test('guard analytics require estate context from middleware', async () => {
    authenticateAs({ id: 3, role: 'guard', estateId: null });

    const response = await request(guardAnalyticsApp)
      .get('/api/guard/analytics')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ESTATE_NOT_ASSIGNED');
  });

  test('guard analytics return estate-scoped operational metrics with numeric normalization', async () => {
    authenticateAs({ id: 3, role: 'guard', estateId: 7 });
    mockQuery
      .mockResolvedValueOnce({ rows: [{ avg_approval_seconds: '300', total_approved: '5', total_rejected: '2', total_approval_requests: '8' }] })
      .mockResolvedValueOnce({ rows: [{ hour: '9', count: '4' }] })
      .mockResolvedValueOnce({ rows: [{ category: 'vehicle', severity: 'high', count: '2' }] })
      .mockResolvedValueOnce({ rows: [{ username: 'Resident A', email: 'a@example.com', approval_count: '3', rejection_count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ date: '2026-03-08', total_visitors: '6', approved: '5', rejected: '1', pending: '0' }] })
      .mockResolvedValueOnce({ rows: [{ walk_ins: '2', pre_registered: '4' }] });

    const response = await request(guardAnalyticsApp)
      .get('/api/guard/analytics?fromDate=2026-03-01&toDate=2026-03-08')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        data: {
          dateRange: { from: '2026-03-01', to: '2026-03-08' },
          approvalStats: { avgApprovalTimeSeconds: 300, avgApprovalTimeMinutes: 5, totalApproved: 5 },
          visitsByHour: [{ hour: 9, count: 4 }],
          incidentsByCategory: [{ category: 'vehicle', severity: 'high', count: 2 }],
          visitorTypes: { walkIns: 2, preRegistered: 4 }
        }
      }
    });
    expect(mockQuery.mock.calls[1]).toEqual([
      expect.stringContaining('AND estate_id = $3'),
      ['2026-03-01', '2026-03-08', 7]
    ]);
  });

  test('guard residents route requires estate and minimizes resident contact data for guards', async () => {
    authenticateAs({ id: 3, role: 'guard', estateId: 7 });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 8, username: 'Resident A', unit_number: 'A-1', phone: '+254700000000' }] });

    const response = await request(guardRoutesApp)
      .get('/api/guard/residents')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Residents retrieved successfully',
      data: [{ id: 8, username: 'Resident A', unit_number: 'A-1' }]
    });
    expect(response.body.data[0].phone).toBeUndefined();
    expect(mockQuery.mock.calls[1]).toEqual([
      expect.stringContaining('WHERE role = \'resident\''),
      [7]
    ]);
  });
});