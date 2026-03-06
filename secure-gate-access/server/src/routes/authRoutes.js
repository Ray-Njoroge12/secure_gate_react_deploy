import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { attachRequestAudit } from '../middleware/auditLogging.js';
import { asyncHandler } from '../middleware/standardizedErrorHandler.js';
import * as authController from '../controllers/authController.js';
import {
  validatePasswordResetRequest,
  validatePasswordReset,
  validateRegistration,
  validateLogin,
  validateRefreshRequest
} from '../validation/authValidation.js';
import rateLimit from 'express-rate-limit';
import loggingService from '../services/loggingService.js';
import { errorResponse } from '../utils/responseFormatter.js';
import { changePassword } from '../controllers/userController.js';

const router = express.Router();

// Rate limiting configurations
const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
const authLimiterMax = Number.parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10);
const refreshLimiterMax = Number.parseInt(process.env.REFRESH_RATE_LIMIT_MAX, 10);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number.isFinite(authLimiterMax) ? authLimiterMax : (isDev ? 100 : 5),
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    loggingService.warn('Login rate limit exceeded', { ip: req.ip, route: req.originalUrl });
    errorResponse(res, options.message, 'AUTH_RATE_LIMIT', options.statusCode, null, req);
  },
  skip: (req) => isDev || req.path === '/health'
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number.isFinite(refreshLimiterMax) ? refreshLimiterMax : (isDev ? 300 : 60),
  message: 'Too many refresh attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    loggingService.warn('Refresh rate limit exceeded', { ip: req.ip, route: req.originalUrl });
    errorResponse(res, options.message, 'REFRESH_RATE_LIMIT', options.statusCode, null, req);
  },
  skip: (req) => isDev || req.path === '/health'
});

// Authentication Routes
router.post('/register', authLimiter, validateRegistration, attachRequestAudit(), asyncHandler(authController.register));
router.post('/login', authLimiter, validateLogin, attachRequestAudit(), asyncHandler(authController.login));
router.post('/logout', authenticateToken, attachRequestAudit(), asyncHandler(authController.logout));
router.post('/refresh', refreshLimiter, validateRefreshRequest, attachRequestAudit(), asyncHandler(authController.refresh));

// Profile Routes
router.get('/profile', authenticateToken, attachRequestAudit(), asyncHandler(authController.getProfile));
router.put('/profile', authenticateToken, attachRequestAudit(), asyncHandler(authController.updateProfile));
router.get('/me', authenticateToken, asyncHandler(authController.getProfile));

// Password & Identity Routes
router.get('/check-email', asyncHandler(authController.checkEmail));
router.get('/verify-email', asyncHandler(authController.verifyEmail));
router.post('/change-password', authenticateToken, attachRequestAudit(), asyncHandler(changePassword));
router.post('/verify-password', authenticateToken, authLimiter, asyncHandler(authController.verifyPassword));
router.post('/forgot-password', authLimiter, attachRequestAudit(), validatePasswordResetRequest, asyncHandler(authController.forgotPassword));
router.post('/reset-password', authLimiter, attachRequestAudit(), validatePasswordReset, asyncHandler(authController.resetPassword));

// Security Tokens
router.get('/csrf-token', asyncHandler(authController.getCsrfToken));

export default router;
