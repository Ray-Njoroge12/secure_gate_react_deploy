/**
 * Guard Management Integration Tests
 * Covers admin guard workflows: shifts, handover notes, performance, equipment, training.
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, getAuthToken } from './setup.js';

jest.unstable_mockModule('../../src/services/emailService.js', () => ({
  default: {
    sendEmail: jest.fn().mockResolvedValue()
  }
}));

describe('Guard Management Integration Tests', () => {
  let app;
  let testUsers;
  let adminToken;
  let guardToken;

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

    adminToken = await getAuthToken(testUsers.admin.email);
    guardToken = await getAuthToken(testUsers.guard.email);
  });

  it('should support full admin guard management workflow', async () => {
    const shiftStart = new Date();
    shiftStart.setHours(8, 0, 0, 0);
    const shiftEnd = new Date(shiftStart);
    shiftEnd.setHours(16, 0, 0, 0);
    const shiftStartDate = shiftStart.toISOString().split('T')[0];
    const shiftEndDate = shiftEnd.toISOString().split('T')[0];

    const createShiftResponse = await request(app)
      .post('/api/guards/shifts')
      .set('Cookie', `token=${adminToken}`)
      .send({
        guard_id: testUsers.guard.id,
        shift_type: 'morning',
        start_time: shiftStart.toISOString(),
        end_time: shiftEnd.toISOString(),
        post_location: 'Gate A',
        notes: 'Morning coverage'
      });

    expect(createShiftResponse.status).toBe(201);
    expect(createShiftResponse.body.success).toBe(true);
    expect(createShiftResponse.body.data).toHaveProperty('id');

    const shiftId = createShiftResponse.body.data.id;

    const updateShiftResponse = await request(app)
      .put(`/api/guards/shifts/${shiftId}`)
      .set('Cookie', `token=${adminToken}`)
      .send({
        post_location: 'Gate B',
        notes: 'Updated post',
        status: 'scheduled',
        start_time: shiftStart.toISOString(),
        end_time: shiftEnd.toISOString()
      });

    expect(updateShiftResponse.status).toBe(200);
    expect(updateShiftResponse.body.data.post_location).toBe('Gate B');

    const shiftsResponse = await request(app)
      .get(`/api/guards/shifts?start_date=${shiftStartDate}&end_date=${shiftEndDate}`)
      .set('Cookie', `token=${adminToken}`);

    expect(shiftsResponse.status).toBe(200);
    expect(Array.isArray(shiftsResponse.body.data)).toBe(true);

    const handoverResponse = await request(app)
      .post('/api/guards/handover')
      .set('Cookie', `token=${guardToken}`)
      .send({
        shift_id: shiftId,
        notes: 'All clear. Patrols complete.'
      });

    expect(handoverResponse.status).toBe(201);

    const handoverNotesResponse = await request(app)
      .get(`/api/guards/handover/${shiftId}`)
      .set('Cookie', `token=${adminToken}`);

    expect(handoverNotesResponse.status).toBe(200);
    expect(Array.isArray(handoverNotesResponse.body.data)).toBe(true);

    const performanceResponse = await request(app)
      .post('/api/guards/performance')
      .set('Cookie', `token=${adminToken}`)
      .send({
        guard_id: testUsers.guard.id,
        shift_id: shiftId,
        metric_type: 'punctuality',
        rating: 4.5,
        notes: 'On time and responsive.'
      });

    expect(performanceResponse.status).toBe(201);

    const performanceMetricsResponse = await request(app)
      .get(`/api/guards/${testUsers.guard.id}/performance`)
      .set('Cookie', `token=${adminToken}`);

    expect(performanceMetricsResponse.status).toBe(200);
    expect(Array.isArray(performanceMetricsResponse.body.data.metrics)).toBe(true);

    const checkoutResponse = await request(app)
      .post('/api/guards/equipment/checkout')
      .set('Cookie', `token=${adminToken}`)
      .send({
        guard_id: testUsers.guard.id,
        equipment_type: 'radio',
        equipment_id: `RADIO-${Date.now()}`,
        notes: 'Assigned for shift.'
      });

    expect(checkoutResponse.status).toBe(201);
    const checkoutId = checkoutResponse.body.data.id;

    const returnResponse = await request(app)
      .post(`/api/guards/equipment/${checkoutId}/return`)
      .set('Cookie', `token=${adminToken}`)
      .send({
        guard_id: testUsers.guard.id,
        condition: 'good',
        notes: 'Returned in good condition.'
      });

    expect(returnResponse.status).toBe(200);

    const equipmentListResponse = await request(app)
      .get(`/api/guards/equipment?guard_id=${testUsers.guard.id}`)
      .set('Cookie', `token=${adminToken}`);

    expect(equipmentListResponse.status).toBe(200);
    expect(Array.isArray(equipmentListResponse.body.data)).toBe(true);

    const trainingResponse = await request(app)
      .post(`/api/guards/${testUsers.guard.id}/training`)
      .set('Cookie', `token=${adminToken}`)
      .send({
        training_type: 'first_aid',
        training_name: 'First Aid Basics',
        completion_date: shiftStartDate,
        expiry_date: shiftEndDate,
        certificate_number: 'CERT-FA-001',
        notes: 'Certified by local clinic.'
      });

    expect(trainingResponse.status).toBe(201);

    const trainingListResponse = await request(app)
      .get(`/api/guards/${testUsers.guard.id}/training`)
      .set('Cookie', `token=${adminToken}`);

    expect(trainingListResponse.status).toBe(200);
    expect(trainingListResponse.body.data).toHaveProperty('training_records');
    expect(Array.isArray(trainingListResponse.body.data.training_records)).toBe(true);
    expect(trainingListResponse.body.data.training_records.length).toBeGreaterThan(0);
  });
});
