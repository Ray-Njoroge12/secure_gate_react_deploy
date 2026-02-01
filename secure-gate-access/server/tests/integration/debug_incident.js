
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, getAuthToken } from './setup.js';

// Mock dependencies if needed (but setup.js imports them)

(async () => {
    try {
        console.log('Starting diagnostic...');
        await setupTestDatabase();
        const users = await createTestUsers();
        console.log('Users created');

        // Import app after DB setup
        const { default: app } = await import('../../src/app.js');

        const token = await getAuthToken(users.guard.email);
        console.log('Got token');

        const res = await request(app)
            .post('/api/guard/incidents')
            .set('Cookie', `token=${token}`)
            .send({
                category: 'suspicious',
                severity: 'medium',
                description: 'Test incident'
            });

        console.log('Response Status:', res.status);
        console.log('Response Body:', JSON.stringify(res.body, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await cleanupTestDatabase();
        process.exit(0);
    }
})();
