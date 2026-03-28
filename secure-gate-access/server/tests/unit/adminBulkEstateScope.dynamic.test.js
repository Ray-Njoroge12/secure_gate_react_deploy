import { jest, describe, beforeEach, it, expect } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: mockQuery
  },
  db: {
    query: mockQuery
  },
  default: {
    query: mockQuery
  }
}));

describe('admin bulk governance estate-scope dynamic verification', () => {
  let bulkApproveUsers;
  let bulkRejectUsers;
  let req;
  let res;

  beforeEach(async () => {
    jest.clearAllMocks();

    ({ bulkApproveUsers, bulkRejectUsers } = await import('../../src/controllers/adminController.js'));

    req = {
      user: {
        id: 1,
        role: 'admin',
        estate_id: null
      },
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockQuery.mockResolvedValue({
      rows: [{ id: 101, username: 'pending-user', email: 'pending@test.com', role: 'resident' }]
    });
  });

  it('bulkApproveUsers rejects when estate context is missing even if body estateId is supplied', async () => {
    req.body = {
      userIds: [101],
      estateId: 88
    };

    await bulkApproveUsers(req, res);

    expect(mockQuery).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Estate context required'
      })
    );
  });

  it('bulkApproveUsers rejects when both req.user.estate_id and req.estateId are absent', async () => {
    req.body = {
      userIds: [101]
    };

    await bulkApproveUsers(req, res);

    expect(mockQuery).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Estate context required'
      })
    );
  });

  it('bulkRejectUsers rejects when estate context is missing', async () => {
    req.body = {
      userIds: [101],
      reason: 'dynamic-verification'
    };

    await bulkRejectUsers(req, res);

    expect(mockQuery).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Estate context required'
      })
    );
  });

  it('bulkRejectUsers enforces estate filter when estate context is present', async () => {
    req.user.estate_id = 77;
    req.body = {
      userIds: [101],
      reason: 'dynamic-verification'
    };

    await bulkRejectUsers(req, res);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('AND estate_id = $3'),
      [[101], 'dynamic-verification', 77]
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining('rejected')
      })
    );
  });

  it('bulkApproveUsers does not expose internal error details on query failure', async () => {
    req.user.estate_id = 77;
    req.body = { userIds: [101] };
    mockQuery.mockRejectedValueOnce(new Error('sensitive-db-error'));

    await bulkApproveUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(payload.message).toBe('Failed to approve users');
    expect(payload.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(payload)).not.toContain('sensitive-db-error');
  });
});
