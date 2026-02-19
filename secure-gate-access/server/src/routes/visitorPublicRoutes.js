/**
 * @file visitorPublicRoutes.js
 * @description Public visitor routes (no authentication required)
 * Phase V1: Visitor Invite Landing & Digital Pass
 * 
 * Security:
 * - Rate limited to prevent abuse
 * - Token-based access only
 * - No sensitive data exposed
 * - Audit logging enabled
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { getEstateInfo, getVisitorByToken, confirmVisitorByToken, getVisitorStatus, regenerateQrCode, getInviteByCode } from '../controllers/visitorPublicController.js';
import { validateParams, validateRequest, ValidationSchemas } from '../middleware/validationMiddleware.js';
import { buildErrorPayload } from '../utils/responseFormatter.js';

const router = express.Router();

// Rate limiter for visitor token lookups (stricter)
const visitorTokenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const response = buildErrorPayload(req, res, 'Rate limit exceeded. Please try again in a minute.', 'RATE_LIMITED');
    res.status(429).json(response);
  }
});

// Rate limiter for status polling (more lenient for real-time updates)
const statusPollLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: 'Too many status checks, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const response = buildErrorPayload(req, res, 'Too many status checks, please slow down', 'RATE_LIMITED');
    res.status(429).json(response);
  }
});

// Rate limiter for estate info (most lenient)
const estateInfoLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const response = buildErrorPayload(req, res, 'Too many estate info requests, please try again later', 'RATE_LIMITED');
    res.status(429).json(response);
  }
});

// Rate limiter for QR regeneration (stricter - prevent abuse)
const qrRegenerateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour per IP
  message: 'Too many QR regeneration requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP + token combination
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.ip ||
      'unknown';
    return `qr-regen:${ip}:${req.params.token || 'unknown'}`;
  },
  handler: (req, res) => {
    const response = buildErrorPayload(req, res, 'Too many QR regeneration requests. Please try again in an hour.', 'RATE_LIMITED');
    res.status(429).json(response);
  }
});

const inviteLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: 'Too many invite lookups, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const response = buildErrorPayload(req, res, 'Too many invite lookups, please try again later', 'RATE_LIMITED');
    res.status(429).json(response);
  }
});

// Optional middleware to validate estate ID if provided
const validateEstateId = (req, res, next) => {
  const estateId = Number(req.query.estateId || req.query.estate_id);

  // If estate ID is provided, validate it
  if (req.query.estateId || req.query.estate_id) {
    if (!estateId || Number.isNaN(estateId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Estate ID format'
      });
    }
  }

  return next();
};

/**
 * @route GET /api/public/visitors/by-token/:token
 * @desc Get visitor details by secure token
 * @access Public (no auth)
 * @rateLimit 10 req/min
 */
router.get(
  '/by-token/:token',
  visitorTokenLimiter,
  validateParams(ValidationSchemas.tokenParam),
  getVisitorByToken
);

/**
 * @route GET /api/public/visitors/:token/status
 * @desc Get visitor status only (lightweight for polling)
 * @access Public (no auth)
 * @rateLimit 30 req/min
 */
router.get(
  '/:token/status',
  statusPollLimiter,
  validateParams(ValidationSchemas.tokenParam),
  getVisitorStatus
);

/**
 * @route POST /api/public/visitors/:token/confirm
 * @desc Confirm visit + store consent (E2 Enhancement)
 * @access Public (no auth)
 * @rateLimit 10 req/min
 */
router.post(
  '/:token/confirm',
  visitorTokenLimiter,
  validateParams(ValidationSchemas.tokenParam),
  validateRequest(ValidationSchemas.inviteCompletion),
  confirmVisitorByToken
);

/**
 * @route POST /api/public/visitors/:token/regenerate-qr
 * @desc Regenerate QR code for visitor (if lost/corrupted)
 * @access Public (no auth, token-based)
 * @rateLimit 5 req/hour per IP+token
 */
router.post(
  '/:token/regenerate-qr',
  qrRegenerateLimiter,
  validateParams(ValidationSchemas.tokenParam),
  regenerateQrCode
);

/**
 * @route GET /api/public/estate-info
 * @desc Get estate information (gates, directions, contact)
 * @access Public (no auth)
 * @rateLimit 20 req/min
 */
router.get(
  '/estate-info',
  estateInfoLimiter,
  validateEstateId,
  getEstateInfo
);

/**
 * @route GET /api/public/invites/:inviteCode
 * @desc Look up invite details by invite code
 * @access Public (no auth)
 */
router.get(
  '/invites/:inviteCode',
  inviteLookupLimiter,
  validateParams(ValidationSchemas.inviteCodeParam),
  getInviteByCode
);

export default router;
