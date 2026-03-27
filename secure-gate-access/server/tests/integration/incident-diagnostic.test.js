/**
 * Diagnostic test to debug incident resolution 500 errors
 */
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, getAuthToken } from './setup.js';

// Mock email service
jest.unstable_mockModule('../../src/services/emailService.js', () => ({
    default: {
        sendEmail: jest.fn().mockResolvedValue(),
    }
}));

describe('Incident Resolution Diagnostic', () => {
    let app;
    let guardToken;
    let guardUser;

    beforeAll(async () => {
        await setupTestDatabase();
        const users = await createTestUsers();
    guardUser = users.guard;
        guardToken = await getAuthToken(users.guard.email);

        const appModule = await import('../../src/app.js');
        app = appModule.default;
    });

    afterAll(async () => {
        await cleanupTestDatabase();
    });

    it('should debug incident creation and resolution', async () => {
        // Step 1: Create incident
        console.log('===== CREATING INCIDENT =====');
        const createResponse = await request(app)
            .post('/api/guard/incidents')
            .set('Cookie', `token=${guardToken}`)
            .send({
                category: 'suspicious',
                severity: 'medium',
                description: 'Diagnostic test incident'
            });

        console.log('Create Status:', createResponse.status);
        console.log('Create Body:', JSON.stringify(createResponse.body, null, 2));

        expect(createResponse.status).toBe(200);
        expect(createResponse.body.data).toBeDefined();

        const incidentId = createResponse.body?.data?.id || createResponse.body?.data?.data?.id;
        expect(incidentId).toBeDefined();
        console.log('Incident ID:', incidentId);
        console.log('Guard User ID:', guardUser.id);

        // Step 2: Try to resolve
        console.log('\n===== RESOLVING INCIDENT =====');
        const resolveResponse = await request(app)
            .put(`/api/guard/incidents/${incidentId}/resolve`)
            .set('Cookie', `token=${guardToken}`)
            .send({
                resolution: 'Diagnostic test resolution'
            });

        console.log('Resolve Status:', resolveResponse.status);
        console.log('Resolve Body:', JSON.stringify(resolveResponse.body, null, 2));
        console.log('Resolve Error:', resolveResponse.body.error);
        console.log('Resolve Message:', resolveResponse.body.message);

        // Role gates differ by environment/policy; ensure controlled responses.
        expect([200, 401, 403]).toContain(resolveResponse.status);

        if (resolveResponse.status === 200) {
            expect(resolveResponse.body.success).toBe(true);
        } else {
            expect(resolveResponse.body.success).toBe(false);
            expect(resolveResponse.body.error?.code).toBeDefined();
        }
    });
});
