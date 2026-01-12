/**
 * Integration Tests: Estate scoping for guard and event APIs
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { dbManager } from '../../src/database/db.enhanced.js';
import { setupTestDatabase, createTestUsers, getAuthToken, cleanupTestDatabase } from './setup.js';
import { getTestApp } from '../utils/testApp.js';

const app = getTestApp();

describe('Estate scoping for guard and event APIs', () => {
  let adminToken;
  let adminUser;
  let guardUser;
  let estateTwoGuard;
  let estateOneEvent;
  let estateTwoEvent;

  beforeAll(async () => {
    await setupTestDatabase();
    const testUsers = await createTestUsers();
    adminUser = testUsers.admin;
    guardUser = testUsers.guard;
    adminToken = await getAuthToken(adminUser.email);

    await dbManager.query(
      `INSERT INTO estate_locations (estate_id, gate_name)
       VALUES (1, 'Main Gate'), (2, 'Secondary Gate')
       ON CONFLICT (estate_id) DO NOTHING`
    );

    const estateTwoGuardResult = await dbManager.query(
      `INSERT INTO users (username, email, password, password_hash, role, phone, unit, verified, estate_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        `guard_estate_two_${Date.now()}`,
        `guard_estate_two_${Date.now()}@test.com`,
        adminUser.password_hash,
        adminUser.password_hash,
        'guard',
        '+254700000999',
        'Gate 2',
        true,
        2
      ]
    );
    estateTwoGuard = estateTwoGuardResult.rows[0];

    const now = new Date();
    const later = new Date(Date.now() + 3600000);

    await dbManager.query(
      `INSERT INTO guard_shifts (
        guard_id, shift_type, start_time, end_time, status, estate_id
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [guardUser.id, 'morning', now, later, 'scheduled', 1]
    );

    await dbManager.query(
      `INSERT INTO guard_shifts (
        guard_id, shift_type, start_time, end_time, status, estate_id
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [estateTwoGuard.id, 'morning', now, later, 'scheduled', 2]
    );

    await dbManager.query(
      `INSERT INTO guard_training (
        guard_id, training_type, training_name, completion_date, status, estate_id
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [guardUser.id, 'security_basics', 'Estate One Training', new Date(), 'active', 1]
    );

    await dbManager.query(
      `INSERT INTO guard_training (
        guard_id, training_type, training_name, completion_date, status, estate_id
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [guardUser.id, 'security_basics', 'Estate Two Training', new Date(), 'active', 2]
    );

    await dbManager.query(
      `INSERT INTO guard_equipment_checkout (
        guard_id, equipment_type, equipment_id, status, notes, estate_id
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [guardUser.id, 'radio', `RAD-${Date.now()}`, 'checked_out', 'Estate One Equipment', 1]
    );

    await dbManager.query(
      `INSERT INTO guard_equipment_checkout (
        guard_id, equipment_type, equipment_id, status, notes, estate_id
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [estateTwoGuard.id, 'radio', `RAD-${Date.now()}-2`, 'checked_out', 'Estate Two Equipment', 2]
    );

    const estateOneEventResult = await dbManager.query(
      `INSERT INTO events (
        name, event_type, start_date, end_date, host_id, status, estate_location_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        'Estate One Event',
        'community',
        new Date(Date.now() + 86400000),
        new Date(Date.now() + 90000000),
        adminUser.id,
        'published',
        1
      ]
    );
    estateOneEvent = estateOneEventResult.rows[0];

    const estateTwoEventResult = await dbManager.query(
      `INSERT INTO events (
        name, event_type, start_date, end_date, host_id, status, estate_location_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        'Estate Two Event',
        'community',
        new Date(Date.now() + 86400000),
        new Date(Date.now() + 90000000),
        adminUser.id,
        'published',
        2
      ]
    );
    estateTwoEvent = estateTwoEventResult.rows[0];

    await dbManager.query(
      `INSERT INTO event_visitors (
        event_id, visitor_name, visitor_email, event_qr_code
      ) VALUES ($1, $2, $3, $4)`,
      [estateOneEvent.id, 'Estate One Visitor', 'estate1@test.com', 'EST1-QR-001']
    );

    await dbManager.query(
      `INSERT INTO event_visitors (
        event_id, visitor_name, visitor_email, event_qr_code
      ) VALUES ($1, $2, $3, $4)`,
      [estateTwoEvent.id, 'Estate Two Visitor', 'estate2@test.com', 'EST2-QR-001']
    );
  });

  afterAll(async () => {
    await dbManager.query('DELETE FROM event_visitors WHERE visitor_email LIKE $1', ['estate%@test.com']).catch(() => {});
    await dbManager.query('DELETE FROM events WHERE name IN ($1, $2)', ['Estate One Event', 'Estate Two Event']).catch(() => {});
    await dbManager.query('DELETE FROM guard_equipment_checkout WHERE notes LIKE $1', ['Estate % Equipment']).catch(() => {});
    await dbManager.query('DELETE FROM guard_training WHERE training_name LIKE $1', ['Estate % Training']).catch(() => {});
    await dbManager.query('DELETE FROM guard_shifts WHERE guard_id IN ($1, $2)', [guardUser?.id || 0, estateTwoGuard?.id || 0]).catch(() => {});
    await dbManager.query('DELETE FROM users WHERE email LIKE $1', ['guard_estate_two_%@test.com']).catch(() => {});
    await cleanupTestDatabase();
  });

  test('guard shift list is scoped to estate', async () => {
    const startDate = new Date(Date.now() - 3600000).toISOString();
    const endDate = new Date(Date.now() + 7200000).toISOString();

    const response = await request(app)
      .get(`/api/guards/shifts?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.every(shift => shift.estate_id === 1)).toBe(true);
  });

  test('guard training list is scoped to estate', async () => {
    const response = await request(app)
      .get(`/api/guards/${guardUser.id}/training`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.training_records).toHaveLength(1);
    expect(response.body.data.training_records[0].training_name).toBe('Estate One Training');
  });

  test('guard equipment list is scoped to estate', async () => {
    const response = await request(app)
      .get('/api/guards/equipment')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].notes).toBe('Estate One Equipment');
    expect(response.body.data[0].estate_id).toBe(1);
  });

  test('event list is scoped to estate', async () => {
    const response = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(estateOneEvent.id);
  });

  test('event details are blocked across estates', async () => {
    const response = await request(app)
      .get(`/api/events/${estateTwoEvent.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
  });

  test('event attendees are scoped to estate', async () => {
    const allowedResponse = await request(app)
      .get(`/api/events/${estateOneEvent.id}/attendees`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(allowedResponse.status).toBe(200);
    expect(allowedResponse.body.count).toBe(1);

    const blockedResponse = await request(app)
      .get(`/api/events/${estateTwoEvent.id}/attendees`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(blockedResponse.status).toBe(200);
    expect(blockedResponse.body.count).toBe(0);
  });

  test('guard cannot check in visitor from another estate', async () => {
    const guardToken = await getAuthToken(guardUser.email);
    const visitorResult = await dbManager.query(
      `INSERT INTO visitors (name, phone, email, purpose, status, host_id, invite_code, estate_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        'Estate Two Visitor',
        '+254700000123',
        'estate-two-visitor@test.com',
        'Estate visit',
        'pending',
        adminUser.id,
        `EST2-${Date.now()}`,
        2
      ]
    );
    const visitorId = visitorResult.rows[0].id;

    const response = await request(app)
      .post(`/api/check-in/${visitorId}`)
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ notes: 'Attempted cross-estate check-in' });

    expect(response.status).toBe(404);

    await dbManager.query('DELETE FROM visitors WHERE id = $1', [visitorId]);
  });
});
