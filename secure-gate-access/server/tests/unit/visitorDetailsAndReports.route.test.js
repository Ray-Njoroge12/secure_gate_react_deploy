import { jest, describe, beforeAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockVerifyAccessToken = jest.fn();
const mockQuery = jest.fn();
const mockAudit = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({ tokenService: { verifyAccessToken: mockVerifyAccessToken } }));
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({ dbManager: { query: mockQuery }, default: { query: mockQuery } }));
jest.unstable_mockModule('../../src/middleware/auditLogging.js', () => ({ default: () => (req, res, next) => { req.audit = mockAudit; next(); } }));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({ default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn(), logSecurity: jest.fn() } }));

const usersByToken = {
  'resident-token': { id: 1, email: 'resident@test.com', username: 'resident', role: 'resident', estate_id: 100 },
  'guard-token': { id: 2, email: 'guard@test.com', username: 'guard', role: 'guard', estate_id: 100 },
  'admin-token': { id: 3, email: 'admin@test.com', username: 'admin', role: 'admin', estate_id: 100 },
  'super-admin-token': { id: 4, email: 'super@test.com', username: 'super', role: 'super_admin', estate_id: 100 },
  'super-admin-no-estate-token': { id: 5, email: 'super-null@test.com', username: 'super-null', role: 'super_admin', estate_id: null }
};

const reportRows = [
  { id: 17, name: 'Private Guest', phone: '+254700000017', email: 'private17@example.com', purpose: 'Delivery', status: 'on_premise', check_in: '2026-03-08T09:00:00.000Z', check_out: null, created_at: '2026-03-08T08:30:00.000Z' },
  { id: 18, name: 'Public Guest', phone: '+254700000018', email: 'public18@example.com', purpose: 'Meeting', status: 'checked_out', check_in: '2026-03-07T09:00:00.000Z', check_out: '2026-03-07T10:00:00.000Z', created_at: '2026-03-07T08:30:00.000Z' }
];

const detailRow = {
  id: 17,
  name: 'Ada Guest',
  phone: '+254700000017',
  email: 'ada@example.com',
  id_number: '12345678',
  vehicle_plate: 'KDA123A',
  purpose: 'Private visit',
  date_of_visit: '2026-03-08',
  time_of_visit: '09:00:00',
  invite_code: 'INV-17',
  status: 'pending',
  host_id: 501,
  host_name: 'alice',
  visitor_token: 'vst_secret',
  token_expires_at: '2026-03-09T09:00:00.000Z',
  otp_hash: 'hashed-otp',
  otp_expires_at: '2026-03-08T09:15:00.000Z',
  otp_attempts: 2,
  otp_resend_count: 1,
  otp_last_resend: '2026-03-08T09:05:00.000Z',
  unit_pin_encrypted: 'ciphertext',
  unit_pin_encrypted_at: '2026-03-08T09:01:00.000Z',
  id_number_encrypted: 'encrypted-id',
  id_number_encrypted_at: '2026-03-08T09:01:00.000Z',
  additional_info: { vehiclePlate: 'KDA123A' },
  consent_data: { dataProcessing: true }
};

const isAuthUserLookup = (sql) => sql.includes('SELECT id, email, username, role, estate_id') && sql.includes('FROM users');
const getLastCall = (matcher) => [...mockQuery.mock.calls].reverse().find(([sql]) => matcher(sql));

describe('GET /api/visitors/report|/reports and /api/visitors/:id/details', () => {
  let app;

  beforeAll(async () => {
    const { authenticateToken } = await import('../../src/middleware/authMiddleware.js');
    const { requireRolePolicy } = await import('../../src/middleware/rolePolicy.js');
    const { minimizeData } = await import('../../src/middleware/dataMinimization.js');
    const attachRequestAudit = (await import('../../src/middleware/auditLogging.js')).default;
    const { getVisitorReport, getVisitorDetails } = await import('../../src/controllers/visitorAdminController.js');
    const { errorHandler, notFoundHandler } = await import('../../src/middleware/standardizedErrorHandler.js');

    app = express();
    app.use(express.json());
    app.get('/api/visitors/report', authenticateToken, requireRolePolicy('adminOnly'), minimizeData('visitor'), attachRequestAudit(), getVisitorReport);
    app.get('/api/visitors/:id/details', authenticateToken, requireRolePolicy('adminOnly'), attachRequestAudit(), getVisitorDetails);
    app.get('/api/visitors/reports', authenticateToken, requireRolePolicy('adminOnly'), minimizeData('visitor'), attachRequestAudit(), getVisitorReport);
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAccessToken.mockImplementation(async (token) => ({ userId: usersByToken[token]?.id, estate_id: usersByToken[token]?.estate_id }));
    mockQuery.mockImplementation(async (sql, params = []) => {
      if (isAuthUserLookup(sql)) {
        const user = Object.values(usersByToken).find(({ id, estate_id }) => id === params[0] && (estate_id ?? null) === (params[1] ?? null));
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }
      if (sql.includes('COUNT(*) as total')) {
        return { rows: [{ total: '2', pending: '1', verified: '0', checked_in: '1', checked_out: '0' }], rowCount: 1 };
      }
      if (sql.includes("to_char(created_at, 'YYYY-MM-DD') as date")) {
        return { rows: [{ date: '2026-03-08', count: '2' }], rowCount: 1 };
      }
      if (sql.includes('SELECT u.username as host_name, COUNT(v.id) as count')) {
        return { rows: [{ host_name: 'alice', count: '2' }], rowCount: 1 };
      }
      if (sql.includes('SELECT id, name, phone, email, purpose, status, check_in_time AS check_in')) {
        return { rows: reportRows, rowCount: reportRows.length };
      }
      if (sql.includes('LEFT JOIN users u ON v.host_id = u.id')) {
        if (params[0] === '88') return { rows: [], rowCount: 0 };
        return { rows: [detailRow], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 AUTH_TOKEN_MISSING when the detail route has no token', async () => {
    const response = await request(app).get('/api/visitors/17/details');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('returns 403 AUTH_FORBIDDEN for guard access to reporting routes', async () => {
    const response = await request(app).get('/api/visitors/report').set('Authorization', 'Bearer guard-token');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  it('returns 400 VALIDATION_ERROR when estate context is missing and ignores x-estate-id', async () => {
    const reportResponse = await request(app).get('/api/visitors/report').set('Authorization', 'Bearer super-admin-no-estate-token').set('x-estate-id', '100');
    const detailsResponse = await request(app).get('/api/visitors/17/details').set('Authorization', 'Bearer super-admin-no-estate-token').set('x-estate-id', '100');

    expect(reportResponse.status).toBe(400);
    expect(reportResponse.body.message).toBe('Estate context required');
    expect(reportResponse.body.error.code).toBe('VALIDATION_ERROR');
    expect(detailsResponse.status).toBe(400);
    expect(detailsResponse.body.message).toBe('Estate context required');
    expect(detailsResponse.body.error.code).toBe('VALIDATION_ERROR');
    expect(getLastCall((sql) => sql.includes('FROM visitors'))).toBeUndefined();
  });

  it('returns a stable 400 for a non-numeric detail id without touching the detail query', async () => {
    const response = await request(app).get('/api/visitors/not-a-number/details').set('Authorization', 'Bearer admin-token');
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid visitor ID');
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(getLastCall((sql) => sql.includes('LEFT JOIN users u ON v.host_id = u.id'))).toBeUndefined();
  });

  it('returns 404 NOT_FOUND for cross-estate or missing visitor details', async () => {
    const response = await request(app).get('/api/visitors/88/details').set('Authorization', 'Bearer admin-token');
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Visitor not found');
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns unmasked detail fields for admins while stripping auth-sensitive secrets and auditing success', async () => {
    const response = await request(app).get('/api/visitors/17/details').set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.meta).toBeUndefined();
    expect(response.body.data).toEqual(expect.objectContaining({
      id: 17,
      name: 'Ada Guest',
      phone: '+254700000017',
      email: 'ada@example.com',
      idNumber: '12345678',
      vehiclePlate: 'KDA123A',
      inviteCode: 'INV-17',
      hostName: 'alice'
    }));
    expect(response.body.data.otpHash).toBeUndefined();
    expect(response.body.data.otpExpiresAt).toBeUndefined();
    expect(response.body.data.otpAttempts).toBeUndefined();
    expect(response.body.data.visitorToken).toBeUndefined();
    expect(response.body.data.unitPinEncrypted).toBeUndefined();
    expect(response.body.data.idNumberEncrypted).toBeUndefined();
    expect(getLastCall((sql) => sql.includes('LEFT JOIN users u ON v.host_id = u.id'))[1]).toEqual(['17', 100]);
    expect(mockAudit).toHaveBeenCalledWith('visitor.view_details', 'visitor', '17', expect.objectContaining({ outcome: 'success' }));
  });

  it.each(['/api/visitors/report', '/api/visitors/reports'])('returns flat masked admin list rows for %s and honors list-query filters', async (path) => {
    const response = await request(app)
      .get(path)
      .query({ status: 'on_premise', host: 'ali', from: '2026-03-01', to: '2026-03-08' })
      .set('Authorization', 'Bearer admin-token');
    const [sql, params] = getLastCall((statement) => statement.includes('ORDER BY created_at DESC LIMIT 100'));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta).toBeUndefined();
    expect(response.body.data[0]).toEqual(expect.objectContaining({
      name: 'Private Guest',
      phone: '******0017',
      email: 'p***17@example.com',
      status: 'on_premise'
    }));
    expect(sql).toContain('status = $2');
    expect(sql).toContain('username ILIKE $3 OR email ILIKE $3');
    expect(sql).toContain('created_at >= $4');
    expect(sql).toContain('created_at <= $5');
    expect(params).toEqual([100, 'on_premise', '%ali%', '2026-03-01', '2026-03-08']);
    expect(mockAudit).toHaveBeenCalledWith('visitor.report', 'visitor', null, expect.objectContaining({ outcome: 'success' }));
  });

  it('keeps report rows unmasked for super_admin reachability', async () => {
    const response = await request(app).get('/api/visitors/report').set('Authorization', 'Bearer super-admin-token');
    expect(response.status).toBe(200);
    expect(response.body.data[0]).toEqual(expect.objectContaining({
      name: 'Private Guest',
      phone: '+254700000017',
      email: 'private17@example.com'
    }));
  });

  it('returns nested aggregate payloads, scopes only the stats query to filters, and now audits aggregate access', async () => {
    const response = await request(app)
      .get('/api/visitors/reports')
      .query({ mode: 'aggregates', status: 'on_premise', host: 'ali', from: '2026-03-01', to: '2026-03-08', format: 'csv' })
      .set('Authorization', 'Bearer admin-token');

    const statsCall = getLastCall((sql) => sql.includes('COUNT(*) as total'));
    const dailyCall = getLastCall((sql) => sql.includes("to_char(created_at, 'YYYY-MM-DD') as date"));
    const hostCall = getLastCall((sql) => sql.includes('SELECT u.username as host_name, COUNT(v.id) as count'));

    expect(response.status).toBe(200);
    expect(response.type).toBe('application/json');
    expect(response.body.data.data).toEqual(expect.objectContaining({
      counts: expect.objectContaining({ total: '2', checkedIn: '1' }),
      dailyTotals: [{ date: '2026-03-08', count: '2' }],
      hostSummary: [{ hostName: 'alice', count: '2' }]
    }));
    expect(statsCall[1]).toEqual([100, 'on_premise', '%ali%', '2026-03-01', '2026-03-08']);
    expect(dailyCall[1]).toEqual([100]);
    expect(hostCall[1]).toEqual([100]);
    expect(mockAudit).toHaveBeenCalledWith('visitor.report', 'visitor', null, expect.objectContaining({ outcome: 'success', message: 'Generated visitor report aggregates' }));
  });
});