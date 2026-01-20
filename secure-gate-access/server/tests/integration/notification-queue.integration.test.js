/**
 * Notification queue integration tests
 * Validates queue stats, DLQ listing, and retry endpoints.
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, getAuthToken } from './setup.js';
import notificationQueueService from '../../src/services/notificationQueueService.js';

describe('Notification queue integration', () => {
  let app;
  let adminToken;

  beforeAll(async () => {
    await setupTestDatabase();

    // Manual monkey-patching because jest.spyOn isn't sticking
    const originalGetStatistics = notificationQueueService.getStatistics;
    notificationQueueService.getStatistics = async () => {
      return {
        initialized: true,
        email: { waiting: 1, active: 0, completed: 10, failed: 2, delayed: 0 },
        sms: { waiting: 0, active: 0, completed: 5, failed: 1, delayed: 0 },
        deadLetter: { total: 3, waiting: 1 }
      };
    };

    const originalGetFailed = notificationQueueService.getFailedNotifications;
    notificationQueueService.getFailedNotifications = async () => ([
      { id: 'job-1', type: 'email', recipient: 'masked@example.com', error: 'SMTP failed', failedAt: new Date().toISOString() }
    ]);

    const originalRetry = notificationQueueService.retryFailedNotification;
    notificationQueueService.retryFailedNotification = async () => ({ success: true, jobId: 'job-1' });

    // Store originals to restore later
    notificationQueueService._originals = { originalGetStatistics, originalGetFailed, originalRetry };

    const appModule = await import('../../src/app.js');
    app = appModule.default;
  });

  afterAll(async () => {
    // Restore original methods
    if (notificationQueueService._originals) {
      notificationQueueService.getStatistics = notificationQueueService._originals.originalGetStatistics;
      notificationQueueService.getFailedNotifications = notificationQueueService._originals.originalGetFailed;
      notificationQueueService.retryFailedNotification = notificationQueueService._originals.originalRetry;
    }
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
