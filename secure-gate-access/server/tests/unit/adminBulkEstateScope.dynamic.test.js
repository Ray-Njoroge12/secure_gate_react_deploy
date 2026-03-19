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

  it('bulkApproveUsers applies caller-provided estateId when req.user.estate_id is missing', async () => {
    req.body = {
      userIds: [101],
      estateId: 88
    };

    await bulkApproveUsers(req, res);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('AND estate_id = $2'),
      [[101], 88]
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining('approved successfully')
      })
    );
  });

  it('bulkApproveUsers can execute without estate filter when both req.user.estate_id and body.estateId are absent', async () => {
    req.body = {
      userIds: [101]
    };

    await bulkApproveUsers(req, res);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.not.stringContaining('AND estate_id = $2'),
      [[101]]
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true
      })
    );
  });

  it('bulkRejectUsers executes without estate filter when req.user.estate_id is missing', async () => {
    req.body = {
      userIds: [101],
      reason: 'dynamic-verification'
    };

    await bulkRejectUsers(req, res);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.not.stringContaining('AND estate_id = $3'),
      [[101], 'dynamic-verification']
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining('rejected')
      })
    );
  });
});
