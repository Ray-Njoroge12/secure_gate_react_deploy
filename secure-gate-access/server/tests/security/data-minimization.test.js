/**
 * Modernized data minimization security baseline tests.
 */

import { describe, it, expect } from '@jest/globals';
import { canAccessField, minimizeData } from '../../src/middleware/dataMinimization.js';

describe('SEC-MIN: Data Minimization Baseline', () => {
  it('should enforce role-based field visibility contracts', () => {
    expect(canAccessField('guard', 'user', 'username')).toBe(true);
    expect(canAccessField('guard', 'user', 'email')).toBe(false);
    expect(canAccessField('resident', 'auditLog', 'action')).toBe(false);
    expect(canAccessField('admin', 'auditLog', 'action')).toBe(true);
  });

  it('should strip sensitive user fields for resident responses', () => {
    const middleware = minimizeData('user');
    const req = { user: { role: 'resident' } };
    let sentPayload = null;
    const res = {
      send: (payload) => {
        sentPayload = payload;
        return payload;
      },
      status: () => res
    };

    middleware(req, res, () => {});

    const raw = {
      success: true,
      data: {
        id: 10,
        username: 'jane',
        email: 'jane@example.com',
        role: 'resident',
        password_hash: 'secret',
        reset_token: 'token'
      }
    };

    res.send(JSON.stringify(raw));

    const parsed = JSON.parse(sentPayload);
    expect(parsed.success).toBe(true);
    expect(parsed.data.username).toBe('jane');
    expect(parsed.data.password_hash).toBeUndefined();
    expect(parsed.data.reset_token).toBeUndefined();
  });

  it('should preserve resident visitor pass token fields needed by pass recovery', () => {
    const middleware = minimizeData('visitor');
    const req = { user: { role: 'resident' } };
    let sentPayload = null;
    const res = {
      send: (payload) => {
        sentPayload = payload;
        return payload;
      },
      status: () => res
    };

    middleware(req, res, () => {});

    const raw = {
      success: true,
      data: {
        visitors: [
          {
            id: 77,
            name: 'Token Visitor',
            status: 'pending_confirmation',
            inviteCode: 'inv_token_77',
            visitorToken: 'vst_token_77',
            tokenExpiresAt: '2026-03-31T23:59:59.000Z',
            otpHash: 'should-not-leak'
          }
        ]
      }
    };

    res.send(JSON.stringify(raw));

    const parsed = JSON.parse(sentPayload);
    const visitor = parsed.data.visitors[0];
    expect(visitor.id).toBe(77);
    expect(visitor.visitorToken).toBe('vst_token_77');
    expect(visitor.tokenExpiresAt).toBe('2026-03-31T23:59:59.000Z');
    expect(visitor.otpHash).toBeUndefined();
  });
});
