import { http } from '../../services/_http';
import {
  createVisitor,
  getMyVisitors,

  listMyPasses,
  verifyOtp,
  regenerateOtp,
  scanToken,
  checkIn,
  checkOut,
  bulkInvite,
  getBulkInvite,
  completeInvite,
  visitorVerifyOtp,
  resendVisitorOtp
} from '../../services/passService';

jest.mock('../../services/_http', () => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

describe('passService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createVisitor', () => {
    test('calls POST /api/visitors with payload', async () => {
      const payload = { name: 'John', phone: '0712345678' };
      http.post.mockResolvedValue({ id: 1, ...payload });

      const result = await createVisitor(payload);

      expect(http.post).toHaveBeenCalledWith('/api/visitors', payload);
      expect(result).toEqual({ id: 1, ...payload });
    });
  });

  describe('getMyVisitors', () => {
    test('calls GET /api/visitors', async () => {
      http.get.mockResolvedValue([{ id: 1 }]);

      const result = await getMyVisitors();

      expect(http.get).toHaveBeenCalledWith('/api/visitors');
      expect(result).toEqual([{ id: 1 }]);
    });
  });



  describe('listMyPasses', () => {
    test('calls GET /api/passes/mine', async () => {
      http.get.mockResolvedValue([{ id: 1 }]);

      await listMyPasses();

      expect(http.get).toHaveBeenCalledWith('/api/passes/mine');
    });
  });

  describe('verifyOtp', () => {
    test('calls POST /api/passes/verify-otp with passId and otp', async () => {
      http.post.mockResolvedValue({ verified: true });

      await verifyOtp('pass123', '1234');

      expect(http.post).toHaveBeenCalledWith('/api/passes/verify-otp', {
        passId: 'pass123',
        otp: '1234'
      });
    });
  });

  describe('regenerateOtp', () => {
    test('calls POST /api/passes/regenerate-otp', async () => {
      http.post.mockResolvedValue({ otp: '5678' });

      await regenerateOtp('pass123');

      expect(http.post).toHaveBeenCalledWith('/api/passes/regenerate-otp', {
        passId: 'pass123'
      });
    });
  });

  describe('scanToken', () => {
    test('calls POST /api/passes/scan with token', async () => {
      http.post.mockResolvedValue({ valid: true });

      await scanToken('token123');

      expect(http.post).toHaveBeenCalledWith('/api/passes/scan', {
        token: 'token123'
      });
    });
  });

  describe('checkIn', () => {
    test('calls POST /api/passes/check-in with token', async () => {
      http.post.mockResolvedValue({ success: true });

      await checkIn('token123');

      expect(http.post).toHaveBeenCalledWith('/api/passes/check-in', {
        token: 'token123'
      });
    });
  });

  describe('checkOut', () => {
    test('calls POST /api/passes/check-out with token', async () => {
      http.post.mockResolvedValue({ success: true });

      await checkOut('token123');

      expect(http.post).toHaveBeenCalledWith('/api/passes/check-out', {
        token: 'token123'
      });
    });
  });

  describe('bulkInvite', () => {
    test('calls POST /api/visitors/bulk-invite with event details', async () => {
      const eventDetails = {
        eventName: 'Party',
        date: '2024-01-15',
        time: '14:00',
        numGuests: 10
      };
      http.post.mockResolvedValue({ inviteCode: 'ABC123' });

      await bulkInvite(eventDetails);

      expect(http.post).toHaveBeenCalledWith('/api/visitors/bulk-invite', {
        eventName: 'Party',
        date: '2024-01-15',
        time: '14:00',
        numGuests: 10
      });
    });
  });

  describe('getBulkInvite', () => {
    test('calls GET /api/visitors/bulk-invite/:code', async () => {
      http.get.mockResolvedValue({ eventName: 'Party' });

      await getBulkInvite('ABC123');

      expect(http.get).toHaveBeenCalledWith('/api/visitors/bulk-invite/ABC123');
    });
  });

  describe('completeInvite', () => {
    test('calls POST /api/visitors/complete/:code with guest details', async () => {
      const guestDetails = { name: 'Guest', phone: '0712345678' };
      http.post.mockResolvedValue({ success: true });

      await completeInvite('ABC123', guestDetails);

      expect(http.post).toHaveBeenCalledWith('/api/visitors/complete/ABC123', guestDetails);
    });
  });

  describe('visitorVerifyOtp', () => {
    test('calls POST /api/visitors/:id/verify-otp', async () => {
      http.post.mockResolvedValue({ verified: true });

      await visitorVerifyOtp(5, '1234');

      expect(http.post).toHaveBeenCalledWith('/api/visitors/5/verify-otp', { otp: '1234' });
    });
  });

  describe('resendVisitorOtp', () => {
    test('calls POST /api/visitors/:id/resend-otp', async () => {
      http.post.mockResolvedValue({ sent: true });

      await resendVisitorOtp(5);

      expect(http.post).toHaveBeenCalledWith('/api/visitors/5/resend-otp', {});
    });
  });
});
