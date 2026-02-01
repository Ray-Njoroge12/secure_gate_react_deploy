import { jest, describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';

// ==========================================
// 1. MOCKS SETUP
// ==========================================

// Mock DB Manager Factory with Plain Functions
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => {

    // Store inside factory
    const store = {
        estates: [],
        users: [],
        visitors: [],
        settings: {},
        audit: []
    };

    // Plain function to guarantee execution
    const mockQuery = async (text, params = []) => {
        let sql = '';
        let queryParams = params;

        if (typeof text === 'object' && text !== null) {
            sql = text.text || '';
            queryParams = text.values || [];
        } else {
            sql = typeof text === 'string' ? text : '';
        }

        sql = sql.trim().toUpperCase();
        sql = sql.trim().toUpperCase();
        // console.log('MOCK SQL:', sql);

        // INSERT ESTATE
        if (sql.includes('INSERT INTO ESTATES')) {
            const id = store.estates.length + 1;
            const newEstate = { id, name: queryParams[0], status: 'active', address: queryParams[1] };
            store.estates.push(newEstate);
            return { rows: [newEstate], rowCount: 1 };
        }

        // INSERT USER (Fallback if not mocked service)
        if (sql.startsWith('INSERT INTO USERS')) {
            console.error('PLAIN MOCK SQL: FALLBACK USER INSERT', queryParams);
            const id = store.users.length + 1;
            // Naive mapping if array, assuming structure
            const newUser = { id, email: 'mock@db.com', ...queryParams };
            store.users.push(newUser);
            return { rows: [newUser], rowCount: 1 };
        }

        // UPDATE SETTINGS
        if (sql.includes('UPDATE ESTATE_LOCATIONS')) {
            console.error('PLAIN MOCK SQL: UPDATED SETTINGS');
            return { rowCount: 1, rows: [{ settings: JSON.parse(queryParams[0] || '{}') }] };
        }

        // METRICS COUNTS
        if (sql.includes('SELECT COUNT(*)')) {
            return { rows: [{ count: '5' }], rowCount: 1 };
        }

        // REPORTS
        if (sql.includes('COUNT(*) AS TOTAL')) {
            return { rows: [{ total: 5, pending: 2, verified: 3 }], rowCount: 1 };
        }

        // Default
        return { rows: [], rowCount: 0 };
    };

    // Plain transaction function
    const mockTransaction = async (callback) => {
        console.error('PLAIN MOCK TRANSACTION STARTED');
        const client = { query: mockQuery };
        try {
            const res = await callback(client);
            return res;
        } catch (err) {
            console.error('PLAIN MOCK TRANSACTION ERROR:', err);
            throw err;
        }
    };

    const mockDbManager = {
        query: mockQuery,
        transaction: mockTransaction,
        initializeAsync: jest.fn().mockResolvedValue(true),
        on: jest.fn(),
        emit: jest.fn(),
        _store: store
    };

    return {
        __esModule: true,
        db: mockDbManager,
        dbManager: mockDbManager,
        default: mockDbManager,
        getDBStatus: jest.fn(),
        testDBConnection: jest.fn()
    };
});

jest.unstable_mockModule('../../src/services/userService.js', () => ({
    __esModule: true,
    default: {
        createUser: async (userData) => {
            return {
                id: 555,
                email: userData.email,
                role: userData.role,
                username: userData.username
            };
        }
    }
}));

jest.unstable_mockModule('../../src/services/emailService.js', () => ({
    __esModule: true,
    default: {
        sendWelcomeEmail: jest.fn(),
        sendPasswordResetEmail: jest.fn()
    }
}));

jest.unstable_mockModule('../../src/services/backupService.js', () => ({
    __esModule: true,
    default: { triggerBackup: jest.fn() }
}));

jest.unstable_mockModule('../../src/services/retentionService.js', () => ({
    __esModule: true,
    default: { runRetentionPolicy: jest.fn() }
}));

jest.unstable_mockModule('../../src/jobs/retentionScheduler.js', () => ({
    __esModule: true,
    default: { start: jest.fn() }
}));

jest.unstable_mockModule('../../src/services/metricsService.js', () => ({
    __esModule: true,
    default: { poll: jest.fn().mockResolvedValue({ cpu: 10, memory: 20 }) }
}));

// Mock Auth Middleware
jest.unstable_mockModule('../../src/middleware/authMiddleware.js', () => ({
    authenticateToken: (req, res, next) => {
        const role = req.headers['x-mock-role'];
        const estateId = req.headers['x-mock-estate-id'];
        if (role) {
            req.user = {
                id: 1,
                email: 'mock@test.com',
                role: role,
                estate_id: estateId ? parseInt(estateId) : 100
            };
            return next();
        }
        res.status(401).json({ message: 'Unauthorized' });
    },
    requireRole: (roles) => (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next();
    },
    requireEstate: (req, res, next) => next(),
    attachUserFromToken: (req, res, next) => next()
}));

// ==========================================
// 2. IMPORTS
// ==========================================
const { dbManager } = await import('../../src/database/db.enhanced.js');
const { default: adminRoutes } = await import('../../src/routes/adminRoutes.js');
const { default: visitorRoutes } = await import('../../src/routes/visitorRoutes.js');

// ==========================================
// 3. APP SETUP
// ==========================================
const app = express();
app.use(bodyParser.json());
app.use('/api/admin', adminRoutes);
app.use('/api/visitors', visitorRoutes);

// ==========================================
// 4. TEST SCENARIOS
// ==========================================
describe('Estate Admin E2E Lifecycle', () => {

    let estateId;
    let adminEmail = 'admin@sunrise.com';

    it('Scenario 1: Super Admin creates Estate and Admin', async () => {
        console.error('TEST: STARTING SCENARIO 1');
        const res = await request(app)
            .post('/api/admin/super-admin/estates')
            .set('x-mock-role', 'super_admin')
            .send({
                name: 'Sunrise Apartments',
                address: '123 Sunshine Blvd',
                adminName: 'Sunny Admin',
                adminEmail: adminEmail,
                adminPassword: 'password123'
            });

        if (res.status !== 201) {
            console.error('SCENARIO 1 FAILURE BODY:', JSON.stringify(res.body, null, 2));
        }

        expect(res.status).toBe(201);
        expect(res.body.data).toBeDefined();

        estateId = res.body.data.estate.id;

        // Verify DB Store
        expect(dbManager._store.estates.length).toBeGreaterThan(0);
        console.error('TEST: SCENARIO 1 COMPLETE. ESTATE ID:', estateId);
    });

    it('Scenario 2: Estate Admin creates Guard', async () => {
        console.error('TEST: STARTING SCENARIO 2');
        const res = await request(app)
            .post('/api/admin/guards')
            .set('x-mock-role', 'admin')
            .set('x-mock-estate-id', estateId)
            .send({
                username: 'Guard John',
                email: 'guard@sunrise.com',
                phone: '1234567890',
                password: 'guardpass'
            });

        expect(res.status).toBe(201);
    });

    it('Scenario 3: Estate Admin updates Settings', async () => {
        const res = await request(app)
            .put('/api/admin/settings')
            .set('x-mock-role', 'admin')
            .set('x-mock-estate-id', estateId)
            .send({
                system: { estate_name: 'Sunrise Updated' }
            });

        expect(res.status).toBe(200);
    });

    it('Scenario 4: Estate Admin views Reports (Metrics)', async () => {
        // Updated endpoint to verify /api/admin/metrics which exists
        const res = await request(app)
            .get('/api/admin/metrics')
            .set('x-mock-role', 'admin')
            .set('x-mock-estate-id', estateId);

        expect(res.status).toBe(200);

        const metrics = res.body.data.data ? res.body.data.data : res.body.data;

        expect(metrics).toBeDefined();
        expect(metrics.visitors).toBeDefined();
        expect(metrics.visitors.totalVisitors).toBe(5);
    });

});
