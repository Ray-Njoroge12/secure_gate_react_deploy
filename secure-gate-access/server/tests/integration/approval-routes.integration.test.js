import { beforeAll, afterAll, beforeEach, describe, expect, test } from '@jest/globals';
import request from 'supertest';
import {
  cleanupTestDatabase,
  createTestUsers,
  createTestVisitor,
  dbManager,
  getAuthToken,
  setupTestDatabase
} from './setup.js';
import { getTestApp } from '../utils/testApp.js';

const app = getTestApp();

describe('Approval routes mounted at /api/approvals', () => {
  let testUsers;
  let tokens;

  const userIds = () => Object.values(testUsers).map(user => user.id);
  const unique = (label) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const waitForAuditAction = async (action, userId) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const result = await dbManager.query(
        `SELECT action, resource
         FROM audit_logs
         WHERE action = $1 AND user_id = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [action, userId]
      );

      if (result.rows[0]) {
        return result.rows[0];
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return null;
  };

  const markPendingApproval = async (visitorId, guardId) => {
    await dbManager.query(
      `UPDATE visitors
       SET status = 'pending_approval', approval_requested_by = $2, approval_requested_at = NOW()
       WHERE id = $1`,
      [visitorId, guardId]
    );
  };

  beforeAll(async () => {
    await setupTestDatabase();
    await dbManager.query(
      `INSERT INTO estates (id, name, slug, timezone, created_at)
       VALUES (2, 'Approval Test Estate 2', 'approval-test-estate-2', 'UTC', NOW())
       ON CONFLICT (id) DO NOTHING`
    );

    testUsers = await createTestUsers();
    tokens = {
      admin: await getAuthToken(testUsers.admin.email),
      guard: await getAuthToken(testUsers.guard.email),
      resident: await getAuthToken(testUsers.resident.email)
    };
  });

  beforeEach(async () => {
    await dbManager.query('DELETE FROM audit_logs WHERE user_id = ANY($1::int[])', [userIds()]);
    await dbManager.query(
      'DELETE FROM visitors WHERE host_id = ANY($1::int[]) OR resident_id = ANY($1::int[])',
      [userIds()]
    );
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  test('request-approval requires auth, enforces guard/admin route gating, scopes by estate, and records audit side effects', async () => {
    const visitor = await createTestVisitor(testUsers.resident.id, {
      name: unique('Test Approval Request'),
      email: `${unique('request')}@test.com`
    });
    const otherEstateVisitor = await createTestVisitor(testUsers.resident.id, {
      name: unique('Test Other Estate'),
      email: `${unique('other-estate')}@test.com`,
      estate_id: 2
    });

    const noAuthResponse = await request(app)
      .post(`/api/approvals/visitors/${visitor.id}/request-approval`)
      .send({ reason: 'Walk-in visitor waiting' });

    expect(noAuthResponse.status).toBe(401);
    expect(noAuthResponse.body.error?.code).toBe('AUTH_TOKEN_MISSING');

    const residentDenied = await request(app)
      .post(`/api/approvals/visitors/${visitor.id}/request-approval`)
      .set('Authorization', `Bearer ${tokens.resident}`)
      .send({ reason: 'Should be blocked at route layer' });

    expect(residentDenied.status).toBe(403);
    expect(residentDenied.body.error?.code).toBe('AUTH_FORBIDDEN');

    const crossEstateResponse = await request(app)
      .post(`/api/approvals/visitors/${otherEstateVisitor.id}/request-approval`)
      .set('Authorization', `Bearer ${tokens.guard}`)
      .send({ reason: 'Cross-estate attempt' });

    expect(crossEstateResponse.status).toBe(404);
    expect(crossEstateResponse.body.error?.code).toBe('NOT_FOUND');

    const approvedRequest = await request(app)
      .post(`/api/approvals/visitors/${visitor.id}/request-approval`)
      .set('Authorization', `Bearer ${tokens.guard}`)
      .send({ reason: 'Walk-in visitor waiting', notes: 'Front gate' });

    expect(approvedRequest.status).toBe(200);
    expect(approvedRequest.body.success).toBe(true);
    expect(approvedRequest.body).toHaveProperty('timestamp');
    expect(approvedRequest.body.data).toMatchObject({
      id: visitor.id,
      status: 'pending_approval',
      resident_id: testUsers.resident.id,
      message: 'Approval request sent to resident'
    });

    const updatedVisitor = await dbManager.query(
      'SELECT status, approval_requested_by, resident_id FROM visitors WHERE id = $1',
      [visitor.id]
    );
    expect(updatedVisitor.rows[0]).toMatchObject({
      status: 'pending_approval',
      approval_requested_by: testUsers.guard.id,
      resident_id: testUsers.resident.id
    });

    const auditRow = await waitForAuditAction('visitor.request_approval', testUsers.guard.id);
    expect(auditRow).toBeTruthy();
    expect(auditRow.resource).toBe('visitor');
  });

  test('approve enforces role gating, ownership, and pending-only transitions', async () => {
    const visitor = await createTestVisitor(testUsers.resident.id, {
      name: unique('Test Approval Approve'),
      email: `${unique('approve')}@test.com`
    });
    const wrongStateVisitor = await createTestVisitor(testUsers.resident.id, {
      name: unique('Test Approval Wrong State'),
      email: `${unique('wrong-state')}@test.com`,
      status: 'approved'
    });

    await markPendingApproval(visitor.id, testUsers.guard.id);

    const guardDenied = await request(app)
      .post(`/api/approvals/visitors/${visitor.id}/approve`)
      .set('Authorization', `Bearer ${tokens.guard}`)
      .send({ notes: 'Guard cannot approve' });

    expect(guardDenied.status).toBe(403);
    expect(guardDenied.body.error?.code).toBe('AUTH_FORBIDDEN');

    const adminBlockedByOwnership = await request(app)
      .post(`/api/approvals/visitors/${visitor.id}/approve`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ notes: 'Admin still needs ownership' });

    expect(adminBlockedByOwnership.status).toBe(403);
    expect(adminBlockedByOwnership.body.error?.code).toBe('FORBIDDEN');
    expect(adminBlockedByOwnership.body.message).toBe('You can only approve your own visitors');

    const approvedResponse = await request(app)
      .post(`/api/approvals/visitors/${visitor.id}/approve`)
      .set('Authorization', `Bearer ${tokens.resident}`)
      .send({ notes: 'Resident approved entry' });

    expect(approvedResponse.status).toBe(200);
    expect(approvedResponse.body.success).toBe(true);
    expect(approvedResponse.body.data).toMatchObject({
      id: visitor.id,
      status: 'approved',
      approved_by: testUsers.resident.id,
      message: 'Visitor approved successfully'
    });

    const invalidTransition = await request(app)
      .post(`/api/approvals/visitors/${wrongStateVisitor.id}/approve`)
      .set('Authorization', `Bearer ${tokens.resident}`)
      .send({ notes: 'Already approved visitor' });

    expect(invalidTransition.status).toBe(422);
    expect(invalidTransition.body.error?.code).toBe('VALIDATION_ERROR');
    expect(invalidTransition.body.message).toContain('Cannot approve: visitor status is approved');

    const auditRow = await waitForAuditAction('visitor.approve', testUsers.resident.id);
    expect(auditRow).toBeTruthy();
    expect(auditRow.resource).toBe('visitor');
  });

  test('reject stores rejection details and records audit side effects', async () => {
    const visitor = await createTestVisitor(testUsers.resident.id, {
      name: unique('Test Approval Reject'),
      email: `${unique('reject')}@test.com`
    });

    await markPendingApproval(visitor.id, testUsers.guard.id);

    const rejectResponse = await request(app)
      .post(`/api/approvals/visitors/${visitor.id}/reject`)
      .set('Authorization', `Bearer ${tokens.resident}`)
      .send({ reason: 'Resident unavailable' });

    expect(rejectResponse.status).toBe(200);
    expect(rejectResponse.body.success).toBe(true);
    expect(rejectResponse.body.data).toMatchObject({
      id: visitor.id,
      status: 'rejected',
      rejected_by: testUsers.resident.id,
      rejection_reason: 'Resident unavailable',
      message: 'Visitor rejected successfully'
    });

    const visitorRecord = await dbManager.query(
      'SELECT status, rejected_by, rejection_reason FROM visitors WHERE id = $1',
      [visitor.id]
    );
    expect(visitorRecord.rows[0]).toMatchObject({
      status: 'rejected',
      rejected_by: testUsers.resident.id,
      rejection_reason: 'Resident unavailable'
    });

    const auditRow = await waitForAuditAction('visitor.reject', testUsers.resident.id);
    expect(auditRow).toBeTruthy();
    expect(auditRow.resource).toBe('visitor');
  });

  test('pending approvals and approval history return resident-scoped queue and paginated history', async () => {
    const pendingVisitor = await createTestVisitor(testUsers.resident.id, {
      name: unique('Test Pending Queue'),
      email: `${unique('pending-queue')}@test.com`
    });
    const approvedVisitor = await createTestVisitor(testUsers.resident.id, {
      name: unique('Test Approved History'),
      email: `${unique('approved-history')}@test.com`,
      status: 'approved'
    });
    const rejectedVisitor = await createTestVisitor(testUsers.resident.id, {
      name: unique('Test Rejected History'),
      email: `${unique('rejected-history')}@test.com`,
      status: 'rejected'
    });
    const invisibleVisitor = await createTestVisitor(testUsers.admin.id, {
      name: unique('Test Invisible Queue'),
      email: `${unique('invisible-queue')}@test.com`,
      status: 'pending_approval'
    });

    await dbManager.query(
      `UPDATE visitors
       SET status = 'pending_approval', approval_requested_by = $2, approval_requested_at = NOW() - INTERVAL '30 minutes'
       WHERE id = $1`,
      [pendingVisitor.id, testUsers.guard.id]
    );
    await dbManager.query(
      `UPDATE visitors
       SET approval_requested_at = NOW() - INTERVAL '2 hours', approved_at = NOW() - INTERVAL '90 minutes', approved_by = $2
       WHERE id = $1`,
      [approvedVisitor.id, testUsers.resident.id]
    );
    await dbManager.query(
      `UPDATE visitors
       SET approval_requested_at = NOW() - INTERVAL '1 hour', rejected_at = NOW() - INTERVAL '10 minutes', rejected_by = $2, rejection_reason = 'No entry today'
       WHERE id = $1`,
      [rejectedVisitor.id, testUsers.resident.id]
    );

    const pendingResponse = await request(app)
      .get('/api/approvals/visitors/pending-approvals')
      .set('Authorization', `Bearer ${tokens.resident}`);

    expect(pendingResponse.status).toBe(200);
    expect(pendingResponse.body.success).toBe(true);
    expect(pendingResponse.body.data).toHaveLength(1);
    expect(pendingResponse.body.data[0]).toMatchObject({
      id: pendingVisitor.id,
      status: 'pending_approval'
    });
    expect(pendingResponse.body.data.find(v => v.id === invisibleVisitor.id)).toBeUndefined();

    const firstHistoryPage = await request(app)
      .get('/api/approvals/visitors/approval-history?limit=1&offset=0')
      .set('Authorization', `Bearer ${tokens.resident}`);

    expect(firstHistoryPage.status).toBe(200);
    expect(firstHistoryPage.body.success).toBe(true);
    expect(firstHistoryPage.body.data).toHaveLength(1);
    expect(firstHistoryPage.body.data[0]).toMatchObject({
      id: rejectedVisitor.id,
      status: 'rejected',
      rejection_reason: 'No entry today'
    });

    const secondHistoryPage = await request(app)
      .get('/api/approvals/visitors/approval-history?limit=1&offset=1')
      .set('Authorization', `Bearer ${tokens.resident}`);

    expect(secondHistoryPage.status).toBe(200);
    expect(secondHistoryPage.body.data).toHaveLength(1);
    expect(secondHistoryPage.body.data[0]).toMatchObject({
      id: approvedVisitor.id,
      status: 'approved'
    });
  });
});