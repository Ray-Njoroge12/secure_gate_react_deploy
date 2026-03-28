/**
 * Auth Domain Routes
 * Covers: authentication, MFA, sessions, preferences
 */
import authRoutes from '../authRoutes.js';
import mfaRoutes from '../mfaRoutes.js';
import sessionRoutes from '../sessionRoutes.js';
import preferenceRoutes from '../preferences.js';
import setupRoutes from '../setup.routes.js';

const setupRoutesEnabled = process.env.ENABLE_SETUP_ROUTES === 'true';

export default [
    { prefix: '/api/auth', router: authRoutes, options: { description: 'Authentication (login, logout, refresh)' } },
    { prefix: '/api/mfa', router: mfaRoutes, options: { description: 'Multi-factor authentication' } },
    { prefix: '/api/sessions', router: sessionRoutes, options: { description: 'Session management' } },
    { prefix: '/api/preferences', router: preferenceRoutes, options: { description: 'User preferences' } },
    ...(setupRoutesEnabled
      ? [{ prefix: '/api/setup', router: setupRoutes, options: { description: 'One-time DB migration setup (maintenance-only)' } }]
      : []),
];
