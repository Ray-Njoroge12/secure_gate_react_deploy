import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import argon2 from 'argon2';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUsers,
  createTestVisitor,
  dbManager,
  getAuthToken
} from './setup.js';

const mockGenerateVisitorQR = jest.fn().mockResolvedValue({
  success: true,
  data: { qrCodeDataUrl: 'data:image/png;base64,qr', qrId: 'qr-test-id' }
});
const mockSendVisitorInviteSms = jest.fn().mockResolvedValue(true);
const mockSendVisitorInviteEmail = jest.fn().mockResolvedValue(true);
const mockSendOtpVerificationSms = jest.fn().mockResolvedValue(true);
const mockSendOtpVerificationEmail = jest.fn().mockResolvedValue(false);
const mockSendCheckInNotification = jest.fn().mockResolvedValue(true);
const mockSendDeliveryNotification = jest.fn().mockResolvedValue(true);
const mockSendHandoffDecisionNotification = jest.fn().mockResolvedValue(true);

jest.unstable_mockModule('../../src/services/qrCodeService.js', () => ({
  default: {
    generateVisitorQR: mockGenerateVisitorQR,
    getQRCodeByVisitorId: jest.fn().mockResolvedValue(null)
  }
}));

jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
  default: {
    sendInviteEmail: jest.fn().mockResolvedValue(true),
    sendSms: jest.fn().mockResolvedValue(true),
    sendVisitorInviteEmail: mockSendVisitorInviteEmail,
    sendVisitorInviteSms: mockSendVisitorInviteSms,
    sendDeliveryNotification: mockSendDeliveryNotification,
    sendHandoffDecisionNotification: mockSendHandoffDecisionNotification,
    sendOtpVerificationSms: mockSendOtpVerificationSms,
    sendOtpVerificationEmail: mockSendOtpVerificationEmail
  },
  sendInviteEmail: jest.fn().mockResolvedValue(true),
  sendSms: jest.fn().mockResolvedValue(true),
  sendVisitorInviteSms: mockSendVisitorInviteSms,
  sendVisitorInviteEmail: mockSendVisitorInviteEmail,
  sendDeliveryNotification: mockSendDeliveryNotification,
  sendHandoffDecisionNotification: mockSendHandoffDecisionNotification,
  sendOtpVerificationSms: mockSendOtpVerificationSms,
  sendOtpVerificationEmail: mockSendOtpVerificationEmail
}));

jest.unstable_mockModule('../../src/services/whatsappService.js', () => ({
  default: {
    sendCheckInNotification: mockSendCheckInNotification,
    sendCheckOutNotification: jest.fn().mockResolvedValue(true)
  },
  sendCheckInNotification: mockSendCheckInNotification,
  sendCheckOutNotification: jest.fn().mockResolvedValue(true)
}));

const visitDate = (offsetDays = 1) => new Date(Date.now() + offsetDays * 86400000).toISOString().split('T')[0];

async function signAccessToken(user, estateId = user.estate_id) {
  const jwt = await import('jsonwebtoken');
  const crypto = await import('crypto');
  return jwt.default.sign(
    {
      id: user.id,
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
      estate_id: estateId,
      type: 'access',
      jti: crypto.randomBytes(16).toString('hex')
    },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests',
    {
      expiresIn: '2h',
      issuer: 'secure-gate-api',
      audience: 'secure-gate-client'
    }
  );
}

describe('Resident/public visitor routes integration', () => {
  let app;
  let testUsers;
  let residentToken;
  let guardToken;

  beforeAll(async () => {
    await setupTestDatabase();
    const migrationModule = await import('../../src/services/migrationService.js');
    await migrationModule.runMigrations();
    const appModule = await import('../../src/app.js');
    app = appModule.default;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGenerateVisitorQR.mockResolvedValue({
      success: true,
      data: { qrCodeDataUrl: 'data:image/png;base64,qr', qrId: 'qr-test-id' }
    });
    mockSendVisitorInviteSms.mockResolvedValue(true);
    mockSendVisitorInviteEmail.mockResolvedValue(true);
    mockSendOtpVerificationSms.mockResolvedValue(true);
    mockSendOtpVerificationEmail.mockResolvedValue(false);
    mockSendCheckInNotification.mockResolvedValue(true);
    mockSendDeliveryNotification.mockResolvedValue(true);
    mockSendHandoffDecisionNotification.mockResolvedValue(true);
    await cleanupTestDatabase();
    testUsers = await createTestUsers();
    residentToken = await getAuthToken(testUsers.resident.email);
    guardToken = await getAuthToken(testUsers.guard.email);
  });

  async function createResidentInvite(overrides = {}) {
    return request(app)
      .post('/api/visitors')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        name: 'Route Test Visitor',
        phone: '+254700123456',
        email: 'route-visitor@test.com',
        purpose: 'Resident visit',
        dateOfVisit: visitDate(2),
        time: '10:30',
        ...overrides
      });
  }

  it('requires auth and resident/admin role to create resident invites', async () => {
    const response = await request(app)
      .post('/api/visitors')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        name: 'Guard Attempt',
        phone: '+254700654321',
        purpose: 'Blocked',
        dateOfVisit: visitDate(1)
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('AUTH_FORBIDDEN');
    expect(response.body.message).toContain('Insufficient permissions');
  });

  it('creates resident invites and keeps public invite lookup privacy-safe', async () => {
    const createResponse = await createResidentInvite({
      idNumber: 'ID-SECRET-001',
      vehiclePlate: 'KAA123A'
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.inviteCode).toMatch(/^inv_/);
    expect(createResponse.body.data.visitorToken).toMatch(/^vst_/);

    const lookupResponse = await request(app).get(`/api/public/invites/${createResponse.body.data.inviteCode}`);

    expect(lookupResponse.status).toBe(200);
    expect(lookupResponse.body.success).toBe(true);
    expect(lookupResponse.body.data).toEqual(expect.objectContaining({
      inviteCode: createResponse.body.data.inviteCode,
      purpose: 'Resident visit'
    }));
    expect(lookupResponse.body.data.phone).toBeUndefined();
    expect(lookupResponse.body.data.email).toBeUndefined();
    expect(lookupResponse.body.data.idNumber).toBeUndefined();
    expect(lookupResponse.body.data.vehiclePlate).toBeUndefined();
    expect(lookupResponse.body.data.estateId).toBeUndefined();
  });

  it('lists only the authenticated resident visitors with pagination metadata', async () => {
    await createTestVisitor(testUsers.resident.id, { name: 'Resident Owned Visitor' });
    await createTestVisitor(testUsers.admin.id, { name: 'Other User Visitor' });

    const response = await request(app)
      .get('/api/visitors?page=1&limit=10')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.visitors.map(({ name }) => name)).toContain('Resident Owned Visitor');
    expect(response.body.data.visitors.map(({ name }) => name)).not.toContain('Other User Visitor');
    expect(response.body.data.pagination).toEqual(expect.objectContaining({ page: 1, limit: 10, totalPages: expect.any(Number) }));
  });

  it('rejects resident visitor listing when token estate context is missing', async () => {
    const noEstateToken = await signAccessToken({ ...testUsers.resident, estate_id: null }, null);

    const response = await request(app)
      .get('/api/visitors')
      .set('Authorization', `Bearer ${noEstateToken}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_USER_NOT_FOUND');
  });

  it('soft-cancels a resident-owned visitor invite', async () => {
    const visitor = await createTestVisitor(testUsers.resident.id, { name: 'Cancel Me' });

    const response = await request(app)
      .delete(`/api/visitors/${visitor.id}`)
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.message).toBe('Visitor cancelled successfully');

    const updated = await dbManager.query('SELECT status FROM visitors WHERE id = $1', [visitor.id]);
    expect(updated.rows[0].status).toBe('cancelled');
  });

  it('returns a stable 400 for invalid resident cancel IDs', async () => {
    const response = await request(app)
      .delete('/api/visitors/not-a-number')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid visitor ID');
    expect(response.body.error.code).not.toBe('INTERNAL_ERROR');
  });

  it('creates bulk invites for residents and serves the public alias without auth', async () => {
    const createResponse = await request(app)
      .post('/api/visitors/bulk-invite')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ eventName: 'Wave 3 Event', date: visitDate(3), time: '12:30', numGuests: 4 });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.remainingSlots).toBe(4);

    const aliasResponse = await request(app).get(`/api/visitors/invite/${createResponse.body.data.inviteCode}`);

    expect(aliasResponse.status).toBe(200);
    expect(aliasResponse.body.data).toEqual(expect.objectContaining({
      eventName: 'Wave 3 Event',
      remainingSlots: 4
    }));
  });

  it('blocks guards from bulk invite creation', async () => {
    const response = await request(app)
      .post('/api/visitors/bulk-invite')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ eventName: 'Guard Blocked', date: visitDate(2), time: '11:00', numGuests: 2 });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(response.body.message).toContain('Only residents and admins');
  });

  it('completes single invites publicly and blocks replayed completions', async () => {
    const createResponse = await createResidentInvite({ name: 'Pending Confirmation Visitor' });
    const inviteCode = createResponse.body.data.inviteCode;

    const completeResponse = await request(app)
      .post(`/api/visitors/complete/${inviteCode}`)
      .send({
        name: 'Completed Visitor',
        phone: '+254700777888',
        email: 'completed@test.com',
        idNumber: 'ID-COMPLETE-1',
        purpose: 'Resident visit',
        consent_given: true
      });

    expect(completeResponse.status).toBe(201);
    expect(completeResponse.body.data.visitorToken).toMatch(/^vst_/);
    expect(completeResponse.body.data.status).toBe('otp_sent');
    expect(completeResponse.body.data.otp).toBeDefined();

    const replayResponse = await request(app)
      .post(`/api/visitors/complete/${inviteCode}`)
      .send({
        name: 'Completed Visitor',
        phone: '+254700777888',
        idNumber: 'ID-COMPLETE-1',
        consent_given: true
      });

    expect(replayResponse.status).toBe(409);
  });

  it('verifies OTP publicly and rejects invalid visitor IDs without a 500', async () => {
    const visitor = await createTestVisitor(testUsers.resident.id, { status: 'otp_sent' });
    const otpHash = await argon2.hash('123456');
    await dbManager.query(
      "UPDATE visitors SET otp_hash = $1, otp_expires_at = NOW() + INTERVAL '1 hour', otp_attempts = 0 WHERE id = $2",
      [otpHash, visitor.id]
    );

    const successResponse = await request(app)
      .post(`/api/visitors/${visitor.id}/verify-otp`)
      .send({ otp: '123456' });

    expect(successResponse.status).toBe(200);
    expect(successResponse.body.data.status).toBe('verified');

    const invalidIdResponse = await request(app)
      .post('/api/visitors/not-a-number/verify-otp')
      .send({ otp: '123456' });

    expect(invalidIdResponse.status).toBe(400);
    expect(invalidIdResponse.body.message).toBe('Invalid visitor ID');
    expect(invalidIdResponse.body.error.code).not.toBe('INTERNAL_ERROR');
  });

  it('resends OTP publicly and rejects invalid visitor IDs without a 500', async () => {
    const visitor = await createTestVisitor(testUsers.resident.id, {
      status: 'pending',
      email: 'resend@test.com'
    });
    await dbManager.query(
      "UPDATE visitors SET token_expires_at = NOW() + INTERVAL '1 day', otp_last_resend = NULL, otp_resend_count = 0 WHERE id = $1",
      [visitor.id]
    );

    const successResponse = await request(app)
      .post(`/api/visitors/${visitor.id}/resend-otp`)
      .send({});

    expect(successResponse.status).toBe(200);
    expect(successResponse.body.data.delivery).toEqual({ sms: true, email: false });

    const invalidIdResponse = await request(app)
      .post('/api/visitors/not-a-number/resend-otp')
      .send({});

    expect(invalidIdResponse.status).toBe(400);
    expect(invalidIdResponse.body.message).toBe('Invalid visitor ID');
    expect(invalidIdResponse.body.error.code).not.toBe('INTERNAL_ERROR');
  });

  it('supports public self check-in for verified invites', async () => {
    const visitor = await createTestVisitor(testUsers.resident.id, {
      status: 'verified',
      invite_code: 'inv_aaaaaaaaaaaaaaaaaaaaaaaa'
    });

    const response = await request(app).post(`/api/visitors/self-check-in/${visitor.invite_code}`).send({});

    expect(response.status).toBe(200);
    expect(response.body.data.message).toBe('Self check-in successful');

    const updated = await dbManager.query('SELECT status, check_in_time FROM visitors WHERE id = $1', [visitor.id]);
    expect(updated.rows[0].status).toBe('on_premise');
    expect(updated.rows[0].check_in_time).toBeTruthy();
    expect(mockSendCheckInNotification).toHaveBeenCalled();
  });
});