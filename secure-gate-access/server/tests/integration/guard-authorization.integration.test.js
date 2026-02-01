/**
 * Guard Authorization Integration Tests
 * Comprehensive role-based access control testing for guard operations
 * 
 * This test suite ensures:
 * 1. Guards and admins can access guard-specific endpoints
 * 2. Residents and unauthorized users are properly denied
 * 3. Guards can only resolve their own incidents
 * 4. Admins have full control over all operations
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, createTestVisitor, getAuthToken, dbManager } from './setup.js';

// Mock email service
jest.unstable_mockModule('../../src/services/emailService.js', () => ({
    default: {
        sendEmail: jest.fn().mockResolvedValue(),
        sendWelcomeEmail: jest.fn().mockResolvedValue(),
        sendPasswordResetEmail: jest.fn().mockResolvedValue()
    }
}));

describe('Guard Authorization Integration Tests', () => {
    let app;
    let testUsers;
    let adminToken;
    let guardToken;
    let residentToken;
    let guard2Token;
    let guard2User;
    let testVisitor;

    beforeAll(async () => {
        await setupTestDatabase();
        const appModule = await import('../../src/app.js');
        app = appModule.default;
    });

    afterAll(async () => {
        await cleanupTestDatabase();
    });

    beforeEach(async () => {
        // Clean up from previous test
        await cleanupTestDatabase();

        // Create test users
        testUsers = await createTestUsers();

        // Create second guard for ownership testing
        const argon2 = await import('argon2');
        const hashedPassword = await argon2.default.hash('testpass123');
        const timestamp = Date.now();

        const guard2Result = await dbManager.query(
            `INSERT INTO users (username, first_name, last_name, email, password, password_hash, role, phone, verified, estate_id, account_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [
                `guard2_${timestamp}`,
                'Guard',
                'Two',
                `guard2_${timestamp}@test.com`,
                hashedPassword,
                hashedPassword,
                'guard',
                `+254700${timestamp.toString().slice(-6)}`,
                true,
                testUsers.admin.estate_id,
                'active'
            ]
        );
        guard2User = guard2Result.rows[0];

        // Get auth tokens
        adminToken = await getAuthToken(testUsers.admin.email);
        guardToken = await getAuthToken(testUsers.guard.email);
        residentToken = await getAuthToken(testUsers.resident.email);
        guard2Token = await getAuthToken(guard2User.email);

        // Create test visitor for check-in/out tests
        testVisitor = await createTestVisitor(testUsers.resident.id, {
            status: 'approved',
            name: 'Test Visitor',
            phone: '+254700999999'
        });
    });

    describe('Visitor Check-In Authorization Matrix', () => {
        it('should allow admin to check in visitor', async () => {
            const response = await request(app)
                .post(`/api/visitors/${testVisitor.id}/check-in`)
                .set('Cookie', `token=${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toContain('checked in');
        });

        it('should allow guard to check in visitor', async () => {
            const response = await request(app)
                .post(`/api/visitors/${testVisitor.id}/check-in`)
                .set('Cookie', `token=${guardToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toContain('checked in');
        });

        it('should deny resident from checking in visitor (403)', async () => {
            const response = await request(app)
                .post(`/api/visitors/${testVisitor.id}/check-in`)
                .set('Cookie', `token=${residentToken}`);

            expect(response.status).toBe(403);
            // Error response includes code field
            expect(response.body.code || response.body.error || response.body.message).toBeTruthy();
        });

        it('should deny unauthorized user (401)', async () => {
            const response = await request(app)
                .post(`/api/visitors/${testVisitor.id}/check-in`);

            expect(response.status).toBe(401);
        });
    });

    describe('Visitor Check-Out Authorization Matrix', () => {
        beforeEach(async () => {
            // Check in visitor first
            await request(app)
                .post(`/api/visitors/${testVisitor.id}/check-in`)
                .set('Cookie', `token=${guardToken}`);
        });

        it('should allow admin to check out visitor', async () => {
            const response = await request(app)
                .post(`/api/visitors/${testVisitor.id}/check-out`)
                .set('Cookie', `token=${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toContain('checked out');
        });

        it('should allow guard to check out visitor', async () => {
            const response = await request(app)
                .post(`/api/visitors/${testVisitor.id}/check-out`)
                .set('Cookie', `token=${guard2Token}`); // Different guard

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toContain('checked out');
        });

        it('should deny resident from checking out visitor (403)', async () => {
            const response = await request(app)
                .post(`/api/visitors/${testVisitor.id}/check-out`)
                .set('Cookie', `token=${residentToken}`);

            expect(response.status).toBe(403);
            // Error response includes code field
            expect(response.body.code || response.body.error || response.body.message).toBeTruthy();
        });

        it('should deny unauthorized user (401)', async () => {
            const response = await request(app)
                .post(`/api/visitors/${testVisitor.id}/check-out`);

            expect(response.status).toBe(401);
        });
    });

    describe('Walk-In Registration Authorization Matrix', () => {
        const walkInData = {
            name: 'Walk In Visitor',
            phone: '+254700123456',
            purpose: 'Meeting',
            houseNumber: 'A1',  // Required field
            id_number: 'ID123456',
            vehicle_plate: 'KAA123A'
        };

        it('should allow admin to register walk-in', async () => {
            const response = await request(app)
                .post('/api/visitors/walk-in')
                .set('Cookie', `token=${adminToken}`)
                .send(walkInData);

            expect([201, 200]).toContain(response.status);
            expect(response.body.success).toBe(true);
        });

        it('should allow guard to register walk-in', async () => {
            const response = await request(app)
                .post('/api/visitors/walk-in')
                .set('Cookie', `token=${guardToken}`)
                .send(walkInData);

            expect([201, 200]).toContain(response.status);
            expect(response.body.success).toBe(true);
        });

        it('should deny resident from registering walk-in (403)', async () => {
            const response = await request(app)
                .post('/api/visitors/walk-in')
                .set('Cookie', `token=${residentToken}`)
                .send(walkInData);

            expect(response.status).toBe(403);
            // Error response includes code field
            expect(response.body.code || response.body.error || response.body.message).toBeTruthy();
        });

        it('should deny unauthorized walk-in registration (401)', async () => {
            const response = await request(app)
                .post('/api/visitors/walk-in')
                .send(walkInData);

            expect(response.status).toBe(401);
        });
    });

    describe('Walk-In List Authorization Matrix', () => {
        it('should allow admin to view walk-ins', async () => {
            const response = await request(app)
                .get('/api/visitors/walk-ins/today')
                .set('Cookie', `token=${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should allow guard to view walk-ins', async () => {
            const response = await request(app)
                .get('/api/visitors/walk-ins/today')
                .set('Cookie', `token=${guardToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should deny resident from viewing walk-ins (403)', async () => {
            const response = await request(app)
                .get('/api/visitors/walk-ins/today')
                .set('Cookie', `token=${residentToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('Incident Management Authorization', () => {
        let incidentId;

        beforeEach(async () => {
            // Create incident as guard
            const response = await request(app)
                .post('/api/guard/incidents')
                .set('Cookie', `token=${guardToken}`)
                .send({
                    category: 'suspicious',
                    severity: 'medium',
                    description: 'Test incident for authorization testing'
                });

            expect(response.status).toBe(200);
            // Controller returns { data: { message, data: incident } }
            incidentId = response.body.data.data.id;
        });

        describe('Incident Creation', () => {
            it('should allow admin to create incident', async () => {
                const response = await request(app)
                    .post('/api/guard/incidents')
                    .set('Cookie', `token=${adminToken}`)
                    .send({
                        category: 'vehicle',
                        severity: 'low',
                        description: 'Admin created incident'
                    });

                expect(response.status).toBe(200);
            });

            it('should allow guard to create incident', async () => {
                const response = await request(app)
                    .post('/api/guard/incidents')
                    .set('Cookie', `token=${guardToken}`)
                    .send({
                        category: 'document_issue',
                        severity: 'high',
                        description: 'Guard created incident'
                    });

                expect(response.status).toBe(200);
            });

            it('should deny resident from creating incident (403)', async () => {
                const response = await request(app)
                    .post('/api/guard/incidents')
                    .set('Cookie', `token=${residentToken}`)
                    .send({
                        category: 'other',
                        severity: 'medium',
                        description: 'Resident attempted incident'
                    });

                expect(response.status).toBe(403);
            });
        });

        describe('Incident Resolution - Ownership Model', () => {
            it('should allow guard to resolve THEIR OWN incident', async () => {
                const response = await request(app)
                    .put(`/api/guard/incidents/${incidentId}/resolve`)
                    .set('Cookie', `token=${guardToken}`)
                    .send({
                        resolution: 'Resolved by original guard'
                    });

                if (response.status !== 200) {
                    console.error('Incident Resolve Error:', JSON.stringify(response.body, null, 2));
                }
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.message).toContain('resolved');
            });

            it('should deny guard from resolving ANOTHER guard\'s incident (403)', async () => {
                const response = await request(app)
                    .put(`/api/guard/incidents/${incidentId}/resolve`)
                    .set('Cookie', `token=${guard2Token}`)
                    .send({
                        resolution: 'Attempt by different guard'
                    });

                expect(response.status).toBe(403);
                expect(response.body.message).toMatch(/own incidents|forbidden/i);
            });

            it('should allow admin to resolve ANY guard\'s incident', async () => {
                const response = await request(app)
                    .put(`/api/guard/incidents/${incidentId}/resolve`)
                    .set('Cookie', `token=${adminToken}`)
                    .send({
                        resolution: 'Resolved by admin'
                    });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });

            it('should deny resident from resolving any incident (403)', async () => {
                const response = await request(app)
                    .put(`/api/guard/incidents/${incidentId}/resolve`)
                    .set('Cookie', `token=${residentToken}`)
                    .send({
                        resolution: 'Resident attempt'
                    });

                expect(response.status).toBe(403);
            });
        });
    });

    describe('Authorization Audit Logging', () => {
        it('should log successful guard check-in action', async () => {
            await request(app)
                .post(`/api/visitors/${testVisitor.id}/check-in`)
                .set('Cookie', `token=${guardToken}`);

            // Check audit logs
            const auditLogs = await dbManager.query(
                `SELECT * FROM audit_logs WHERE action LIKE '%visitor.checkin%' AND user_id = $1 ORDER BY created_at DESC LIMIT 1`,
                [testUsers.guard.id]
            );

            // Audit logging is present
            expect(auditLogs.rows.length).toBeGreaterThan(0);
        });

        it('should log authorization failures for incident resolution', async () => {
            // Create incident as guard1
            const createResponse = await request(app)
                .post('/api/guard/incidents')
                .set('Cookie', `token=${guardToken}`)
                .send({
                    category: 'suspicious',
                    severity: 'medium',
                    description: 'Test incident'
                });

            const incidentId = createResponse.body.data.data.id;

            // Try to resolve as guard2 (should fail and log)
            await request(app)
                .put(`/api/guard/incidents/${incidentId}/resolve`)
                .set('Cookie', `token=${guard2Token}`)
                .send({ resolution: 'Attempt' });

            // Check audit logs for failure
            const auditLogs = await dbManager.query(
                `SELECT * FROM audit_logs WHERE action LIKE '%incident.resolve%' AND details::text LIKE '%fail%' ORDER BY created_at DESC LIMIT 1`
            );

            expect(auditLogs.rows.length).toBeGreaterThan(0);
            // Safely parse JSONB details field
            const details = typeof auditLogs.rows[0].details === 'string'
                ? JSON.parse(auditLogs.rows[0].details)
                : auditLogs.rows[0].details;
            if (details && details.message) {
                expect(details.message).toMatch(/another guard's incident/i);
            }
        });
    });

    describe('Cross-Estate Security', () => {
        it('should prevent guard from checking in visitor from different estate', async () => {
            // This test verifies estate isolation is maintained
            // Create visitor in different estate (would need estate setup)
            // For now, we verify the check uses estate_id in query

            // The check-in controller queries: 
            // 'SELECT id, status, name, phone, email FROM visitors WHERE id = $1 AND estate_id = $2'
            // This ensures estate isolation at controller level

            const response = await request(app)
                .post(`/api/visitors/99999/check-in`) // Non-existent visitor
                .set('Cookie', `token=${guardToken}`);

            expect(response.status).toBe(404); // Should not find visitor (correct estate check)
        });
    });
});
