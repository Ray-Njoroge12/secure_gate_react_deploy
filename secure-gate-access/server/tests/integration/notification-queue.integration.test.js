/**
 * Notification queue integration tests
 * Validates queue stats, DLQ listing, and retry endpoints.
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, getAuthToken } from './setup.js';

const mockQueueService = {
  getStatistics: jest.fn().mockResolvedValue({
    initialized: true,
    email: { waiting: 1, active: 0, completed: 10, failed: 2, delayed: 0 },
    sms: { waiting: 0, active: 0, completed: 5, failed: 1, delayed: 0 },
    deadLetter: { total: 3, waiting: 1 }
  }),
  getFailedNotifications: jest.fn().mockResolvedValue([
    { id: 'job-1', type: 'email', recipient: 'masked@example.com', error: 'SMTP failed', failedAt: new Date().toISOString() }
  ]),
  retryFailedNotification: jest.fn().mockResolvedValue({ success: true, jobId: 'job-1' })
};

jest.unstable_mockModule('../../src/services/notificationQueueService.js', () => ({
  default: mockQueueService
}));

describe('Notification queue integration', () => {
  let app;
  let adminToken;

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
    const testUsers = await createTestUsers();
    adminToken = await getAuthToken(testUsers.admin.email);
  });

  it('returns queue statistics for admins', async () => {
    const response = await request(app)
      .get('/api/admin/notification-queue/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data?.deadLetter?.total).toBe(3);
  });

  it('lists failed notifications from DLQ', async () => {
    const response = await request(app)
      .get('/api/admin/notification-queue/failed')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data?.length).toBe(1);
  });

  it('retries a failed notification', async () => {
    const response = await request(app)
      .post('/api/admin/notification-queue/retry/job-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data?.jobId).toBe('job-1');
  });
});
