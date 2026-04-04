/**
 * Public API Integration Tests
 * Tests public endpoints for estate info and visitor directions.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, dbManager } from '../setup.js';
import { PASS_STATUS } from '../../../src/constants/statuses.js';

describe('Public API Integration Tests', () => {
  let app;
  let testUsers;
  let estate;

  const estateLocation = {
    gateName: 'South Gate',
    gateLatitude: -1.2876543,
    gateLongitude: 36.8123456,
    directionsFromHighway: 'Take exit 12 and follow signs to the south gate.',
    directionsFromCity: 'Drive along Main Road and turn right at Pine Street.'
  };

  beforeAll(async () => {
    await setupTestDatabase();

    const appModule = await import('../../../src/app.js');
    app = appModule.default;

    const estateSlug = `test-estate-${Date.now()}`;
    const estateResult = await dbManager.query(
      `INSERT INTO estates (name, slug, address, timezone, contact_phone, emergency_contact)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [
        'Test Estate',
        estateSlug,
        '123 Test Lane',
        'Africa/Nairobi',
        '+254 711 000 111',
        '+254 711 000 222'
      ]
    );

    if (estateResult.rows[0]) {
      estate = estateResult.rows[0];
    } else {
      const existingEstate = await dbManager.query(
        'SELECT * FROM estates WHERE slug = $1',
        [estateSlug]
      );
      estate = existingEstate.rows[0];
    }

    await dbManager.query(
      `INSERT INTO estate_locations (
        estate_id,
        gate_latitude,
        gate_longitude,
        gate_name,
        directions_from_highway,
        directions_from_city
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (estate_id) DO UPDATE SET
        gate_latitude = EXCLUDED.gate_latitude,
        gate_longitude = EXCLUDED.gate_longitude,
        gate_name = EXCLUDED.gate_name,
        directions_from_highway = EXCLUDED.directions_from_highway,
        directions_from_city = EXCLUDED.directions_from_city`,
      [
        estate.id,
        estateLocation.gateLatitude,
        estateLocation.gateLongitude,
        estateLocation.gateName,
        estateLocation.directionsFromHighway,
        estateLocation.directionsFromCity
      ]
    );
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    testUsers = await createTestUsers();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    if (estate?.id) {
      await dbManager.query('DELETE FROM estates WHERE id = $1', [estate.id]);
    }
  });

  describe('GET /api/public/estate-info', () => {
    it('should return estate info by slug', async () => {
      const response = await request(app)
        .get(`/api/public/estate-info?estate=${estate.slug}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: estate.id,
          slug: estate.slug,
          name: estate.name,
          address: estate.address,
          timezone: estate.timezone,
          emergencyContact: estate.emergency_contact,
          directions: expect.objectContaining({
            fromHighway: estateLocation.directionsFromHighway,
            fromCity: estateLocation.directionsFromCity
          })
        })
      );
      expect(Number(response.body.data.directions.gateLatitude))
        .toBeCloseTo(estateLocation.gateLatitude);
      expect(Number(response.body.data.directions.gateLongitude))
        .toBeCloseTo(estateLocation.gateLongitude);
      expect(response.body.data.gates[0].name).toBe(estateLocation.gateName);
    });

    it('should return estate info by estate_id', async () => {
      const response = await request(app)
        .get(`/api/public/estate-info?estate_id=${estate.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(estate.id);
      expect(response.body.data.slug).toBe(estate.slug);
    });

    it('should return 404 for unknown estate slug', async () => {
      const response = await request(app)
        .get('/api/public/estate-info?estate=missing-estate');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'Estate not found'
      });
    });

    it('should return 404 for unknown estate id', async () => {
      const response = await request(app)
        .get('/api/public/estate-info?estate_id=999999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'Estate not found'
      });
    });
  });

  describe('GET /api/directions/visitor/:visitorId', () => {
    it('should return directions for visitor tied to non-default estate', async () => {
      const inviteCode = `INVITE_${Date.now()}`;
      await dbManager.query(
        'UPDATE users SET estate_id = $1 WHERE id = $2',
        [estate.id, testUsers.resident.id]
      );
      testUsers.resident.estate_id = estate.id;

      const visitorResult = await dbManager.query(
        `INSERT INTO visitors (
          name,
          phone,
          email,
          purpose,
          status,
          host_id,
          invite_code,
          created_by,
          estate_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          'Test Estate Visitor',
          '+254700999999',
          'visitor-estate@test.com',
          'Directions Check',
          PASS_STATUS.PENDING,
          testUsers.resident.id,
          inviteCode,
          testUsers.resident.email,
          estate.id
        ]
      );

      const visitor = visitorResult.rows[0];

      const response = await request(app)
        .get(`/api/directions/visitor/${visitor.id}?token=${inviteCode}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.directions).toEqual(
        expect.objectContaining({
          gate: expect.objectContaining({
            name: estateLocation.gateName
          }),
          fromHighway: estateLocation.directionsFromHighway,
          fromCity: estateLocation.directionsFromCity
        })
      );
      expect(Number(response.body.directions.gate.latitude))
        .toBeCloseTo(estateLocation.gateLatitude);
      expect(Number(response.body.directions.gate.longitude))
        .toBeCloseTo(estateLocation.gateLongitude);
      expect(response.body.mapLinks.google).toContain(
        `${estateLocation.gateLatitude},${estateLocation.gateLongitude}`
      );
    });
  });

  describe('GET /api/directions/visitor/:visitorId/share', () => {
    it('should generate shareable link using visitor estate_id', async () => {
      const inviteCode = `INVITE_${Date.now()}_SHARE`;
      await dbManager.query(
        'UPDATE users SET estate_id = $1 WHERE id = $2',
        [estate.id, testUsers.resident.id]
      );
      testUsers.resident.estate_id = estate.id;

      const visitorResult = await dbManager.query(
        `INSERT INTO visitors (
          name,
          phone,
          email,
          purpose,
          status,
          host_id,
          invite_code,
          created_by,
          estate_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          'Test Estate Share Visitor',
          '+254701000000',
          'share-visitor@test.com',
          'Share Link',
          PASS_STATUS.PENDING,
          testUsers.resident.id,
          inviteCode,
          testUsers.resident.email,
          estate.id
        ]
      );

      const visitor = visitorResult.rows[0];

      const response = await request(app)
        .get(`/api/directions/visitor/${visitor.id}/share?token=${inviteCode}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.link).toContain(
        `${estateLocation.gateLatitude},${estateLocation.gateLongitude}`
      );
      expect(response.body.gateName).toBe(estateLocation.gateName);
    });
  });
});
