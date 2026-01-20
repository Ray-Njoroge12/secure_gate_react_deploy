/**
 * Invite lifecycle integration tests
 * Covers invite creation and completion for visitor workflow.
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, getAuthToken } from './setup.js';

jest.unstable_mockModule('../../src/services/emailService.js', () => ({
  default: {
    sendEmail: jest.fn().mockResolvedValue(),
    sendVisitorInvite: jest.fn().mockResolvedValue(),
    sendOtpVerificationEmail: jest.fn().mockResolvedValue()
  }
}));

jest.unstable_mockModule('../../src/services/smsService.js', () => ({
  default: {
    sendSMS: jest.fn().mockResolvedValue(),
    sendVisitorNotification: jest.fn().mockResolvedValue(),
    sendOtpVerificationSms: jest.fn().mockResolvedValue()
  }
}));

jest.unstable_mockModule('../../src/services/qrCodeService.js', () => ({
  default: {
    generateVisitorQR: jest.fn().mockResolvedValue({
      success: true,
      data: { qrCodeDataUrl: 'data:image/png;base64,qr', qrId: 'qr-test-id' }
    })
  }
}));

describe('Invite lifecycle integration', () => {
  let app;
  let testUsers;
  let residentToken;

  beforeAll(async () => {
    await setupTestDatabase();
    const appModule = await import('../../src/app.js');
    app = appModule.default;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    testUsers = await createTestUsers();
    residentToken = await getAuthToken(testUsers.resident.email);
  });

  it('creates and completes a visitor invite', async () => {
    const createResponse = await request(app)
      .post('/api/visitors')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        name: 'Pilot Visitor',
        phone: '+254700999111',
        purpose: 'Pilot visit',
        dateOfVisit: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: '10:30'
      });

    expect(createResponse.status).toBe(201);
    const inviteCode = createResponse.body.data?.inviteCode;
    expect(inviteCode).toBeDefined();

    const completeResponse = await request(app)
      .post(`/api/visitors/complete/${inviteCode}`)
      .send({
        name: 'Pilot Visitor',
        phone: '+254700999111',
        purpose: 'Pilot visit',
        consent_given: true
      });

    expect(completeResponse.status).toBe(201);
    expect(completeResponse.body.data?.visitorToken).toBeDefined();
    expect(completeResponse.body.data?.status).toBeDefined();
  });
});
