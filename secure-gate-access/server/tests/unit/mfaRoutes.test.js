/**
 * Unit Tests for MFA Routes
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockVerifyTOTPToken = jest.fn();
const mockVerifyBackupCode = jest.fn();
const mockDisableMFA = jest.fn();
const mockGetUserById = jest.fn();
const mockVerifyPassword = jest.fn();
const mockUpdateUser = jest.fn();
const mockGenerateTokens = jest.fn();
const mockGetTokenInfo = jest.fn();
const mockStoreRefreshToken = jest.fn();
const mockUserDbQuery = jest.fn();

jest.unstable_mockModule('../../src/services/mfaService.js', () => ({
  default: {
    verifyTOTPToken: mockVerifyTOTPToken,
    verifyBackupCode: mockVerifyBackupCode,
    disableMFA: mockDisableMFA
  }
}));

jest.unstable_mockModule('../../src/services/userService.js', () => ({
  userService: {
    getUserById: mockGetUserById,
    verifyPassword: mockVerifyPassword,
    updateUser: mockUpdateUser,
    db: {
      query: mockUserDbQuery
    }
  }
}));

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({
  tokenService: {
    generateTokens: mockGenerateTokens,
    getTokenInfo: mockGetTokenInfo,
    storeRefreshToken: mockStoreRefreshToken
  }
}));

const mfaRoutesModule = await import('../../src/routes/mfaRoutes.js');
const router = mfaRoutesModule.default;

const getPostHandler = (path, stackIndex = 0) => {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods?.post);
  return layer?.route?.stack?.[stackIndex]?.handle;
};

const getLastPostHandler = (path) => {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods?.post);
  const stack = layer?.route?.stack || [];
  return stack.length ? stack[stack.length - 1].handle : undefined;
};

describe('mfaRoutes', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {
        mfaSessionId: 'mfa-session-1',
        token: '123456'
      }
    };

    mockRes = {
      cookie: jest.fn(),
      json: jest.fn()
    };

    mockGetTokenInfo.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
    mockStoreRefreshToken.mockResolvedValue(undefined);
    mockUserDbQuery.mockImplementation(async (sql) => {
      if (String(sql).includes('SELECT user_id, expires_at, status')) {
        return {
          rows: [{
            user_id: 1,
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            status: 'pending'
          }]
        };
      }
      return { rows: [], rowCount: 1 };
    });
  });

  describe('POST /verify', () => {
    it('should register a callable MFA verify handler', async () => {
      const handler = getLastPostHandler('/verify');
      expect(typeof handler).toBe('function');
    });
  });

  describe('POST /disable', () => {
    it('should call verifyPassword with password and stored hash (current behavior verification)', async () => {
      const handler = getLastPostHandler('/disable');

      mockReq = {
        user: { id: 1 },
        body: {
          password: 'ValidPass123!',
          token: '123456'
        }
      };

      mockGetUserById.mockResolvedValue({
        id: 1,
        password: '$argon2id$storedhash'
      });
      mockVerifyPassword.mockResolvedValue(true);
      mockVerifyTOTPToken.mockResolvedValue(true);
      mockVerifyBackupCode.mockResolvedValue(false);
      mockUpdateUser.mockResolvedValue({ id: 1, mfa_enabled: false });
      mockDisableMFA.mockResolvedValue(true);

      const next = jest.fn();
      await handler(mockReq, mockRes, next);

      expect(next).not.toHaveBeenCalled();

      // This assertion verifies the current argument order used by the route handler.
      expect(mockVerifyPassword).toHaveBeenCalledWith('ValidPass123!', '$argon2id$storedhash');
      // This shows the route does not call verifyPassword(userId, password).
      expect(mockVerifyPassword).not.toHaveBeenCalledWith(1, 'ValidPass123!');
    });
  });
});
