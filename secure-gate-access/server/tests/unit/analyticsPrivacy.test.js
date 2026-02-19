
import { jest } from '@jest/globals';

// Mock dependencies
const mockDbManager = {
    query: jest.fn(),
};

const mockLogger = {
    error: jest.fn(),
};

// Mock the modules
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
    default: mockDbManager
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({
    default: mockLogger
}));

// Import the controller after mocking
const { getActivityFeed, getActivityTrends } = await import('../../src/controllers/adminAnalyticsController.js');

describe('Admin Analytics Privacy', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            query: {},
            user: { estate_id: 1 }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('getActivityFeed', () => {
        test('should anonymize resident names and mask IPs', async () => {
            const mockLogs = [
                {
                    id: 1,
                    action: 'entry',
                    ip_address: '192.168.1.50',
                    created_at: new Date(),
                    username: 'John Doe',
                    role: 'resident'
                },
                {
                    id: 2,
                    action: 'admin_login',
                    ip_address: '10.0.0.1',
                    created_at: new Date(),
                    username: 'Admin User',
                    role: 'admin'
                }
            ];

            mockDbManager.query.mockResolvedValue({ rows: mockLogs });

            await getActivityFeed(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const responseData = res.json.mock.calls[0][0].data;

            // Check Resident Anonymization
            expect(responseData[0].username).toBe('Resident');
            expect(responseData[0].ip_address).toBe('192.168.***.***');

            // Check Admin Visibility (Should remain visible)
            expect(responseData[1].username).toBe('Admin User');
            expect(responseData[1].ip_address).toBe('10.0.***.***');
        });
    });

    describe('getActivityTrends', () => {
        test('should exclude residents from active users list', async () => {
            mockDbManager.query
                .mockResolvedValueOnce({ rows: [] }) // action breakdown
                .mockResolvedValueOnce({ rows: [] }); // active users

            await getActivityTrends(req, res);

            // Verify the query excludes residents
            const userQueryCall = mockDbManager.query.mock.calls[1];
            const userQuerySql = userQueryCall[0];

            expect(userQuerySql).toContain("role != 'resident'");
        });
    });
});
