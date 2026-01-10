/**
 * Unit Tests for MFA Routes
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockVerifyTOTPToken = jest.fn();
const mockVerifyBackupCode = jest.fn();
const mockGetUserById = jest.fn();
const mockGenerateTokens = jest.fn();

jest.unstable_mockModule('../../src/services/mfaService.js', () => ({
  default: {
    verifyTOTPToken: mockVerifyTOTPToken,
    verifyBackupCode: mockVerifyBackupCode
  }
}));

jest.unstable_mockModule('../../src/services/userService.js', () => ({
  userService: {
    getUserById: mockGetUserById
  }
}));

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({
  tokenService: {
    generateTokens: mockGenerateTokens
  }
}));

const mfaRoutesModule = await import('../../src/routes/mfaRoutes.js');
const router = mfaRoutesModule.default;

const getPostHandler = (path) => {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods?.post);
  return layer?.route?.stack?.[0]?.handle;
};

describe('mfaRoutes', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {
        userId: 1,
        token: '123456'
      }
    };

    mockRes = {
      cookie: jest.fn(),
      json: jest.fn()
    };
  });

  describe('POST /verify', () => {
    it('should include estate_id when issuing tokens after MFA verification', async () => {
      const handler = getPostHandler('/verify');

      mockVerifyTOTPToken.mockResolvedValue(true);
      mockGetUserById.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        username: 'testuser',
        role: 'resident',
        estate_id: 9
      });
      mockGenerateTokens.mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900
      });

      await handler(mockReq, mockRes);

      expect(mockGenerateTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          email: 'user@example.com',
          role: 'resident',
          estate_id: 9
        })
      );
    });
  });
});
