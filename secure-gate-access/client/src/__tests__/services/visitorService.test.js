import { http } from '../../services/_http';
import * as visitorService from '../../services/visitorService';

jest.mock('../../services/_http.js', () => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn()
  }
}));

describe('visitorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createVisitor posts payload', async () => {
    http.post.mockResolvedValueOnce({ ok: true });

    const payload = { name: 'Jane' };
    const res = await visitorService.createVisitor(payload);

    expect(http.post).toHaveBeenCalledWith('/api/visitors', payload);
    expect(res).toEqual({ ok: true });
  });

  test('getMyVisitors gets API base', async () => {
    http.get.mockResolvedValueOnce({ items: [] });

    const res = await visitorService.getMyVisitors();

    expect(http.get).toHaveBeenCalledWith('/api/visitors');
    expect(res).toEqual({ items: [] });
  });



  test('bulkInvite posts bulk invite details', async () => {
    http.post.mockResolvedValueOnce({ ok: true });

    const details = { eventName: 'Party' };
    const res = await visitorService.bulkInvite(details);

    expect(http.post).toHaveBeenCalledWith('/api/visitors/bulk-invite', details);
    expect(res).toEqual({ ok: true });
  });

  test('getBulkInvite gets invite code', async () => {
    http.get.mockResolvedValueOnce({ ok: true });

    const res = await visitorService.getBulkInvite('code1');

    expect(http.get).toHaveBeenCalledWith('/api/visitors/bulk-invite/code1');
    expect(res).toEqual({ ok: true });
  });

  test('completeInvite posts guest details', async () => {
    http.post.mockResolvedValueOnce({ ok: true });

    const details = { name: 'Guest' };
    const res = await visitorService.completeInvite('code1', details);

    expect(http.post).toHaveBeenCalledWith('/api/visitors/complete/code1', details);
    expect(res).toEqual({ ok: true });
  });

  test('getInviteByCode and getPublicInvite use public invite endpoint', async () => {
    http.get.mockResolvedValue({ ok: true });

    await visitorService.getInviteByCode('code1');
    await visitorService.getPublicInvite('code1');

    expect(http.get).toHaveBeenNthCalledWith(1, '/api/public/invites/code1');
    expect(http.get).toHaveBeenNthCalledWith(2, '/api/public/invites/code1');
  });

  test('verifyOtp posts visitor id and otp', async () => {
    http.post.mockResolvedValueOnce({ ok: true });

    const res = await visitorService.verifyOtp('visitor-123', '123456');

    expect(http.post).toHaveBeenCalledWith('/api/visitors/visitor-123/verify-otp', { otp: '123456' });
    expect(res).toEqual({ ok: true });
  });

  test('normalizeVisitor maps snake_case fields to camelCase', () => {
    const input = {
      id: 1,
      name: 'Jane',
      phone: '0712345678',
      id_type: 'NATIONAL_ID',
      id_number: '123',
      resident_email: 'r@r.com',
      date_of_visit: '2025-01-01',
      time_of_visit: '10:00',
      check_in_time: '10:01',
      check_out_time: null,
      invite_code: 'X',
      qr_code: 'Q'
    };

    expect(visitorService.normalizeVisitor(input)).toEqual({
      id: 1,
      name: 'Jane',
      phone: '0712345678',
      idType: 'NATIONAL_ID',
      idNumber: '123',
      residentEmail: 'r@r.com',
      purpose: undefined,
      dateOfVisit: '2025-01-01',
      timeOfVisit: '10:00',
      status: undefined,
      checkInTime: '10:01',
      checkOutTime: null,
      inviteCode: 'X',
      qrCode: 'Q'
    });
  });

  test('normalizeVisitor returns non-objects as-is', () => {
    expect(visitorService.normalizeVisitor(null)).toBe(null);
    expect(visitorService.normalizeVisitor('x')).toBe('x');
  });
});
