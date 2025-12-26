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
import {
  getVisitorByToken,
  getEstateInfo,
  getVisitorStatus
} from '../controllers/visitorPublicController.js';

const router = express.Router();

// Rate limiter for visitor token lookups (stricter)
const visitorTokenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please try again in a minute.'
    });
  }
});

// Rate limiter for status polling (more lenient for real-time updates)
const statusPollLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: 'Too many status checks, please slow down',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for estate info (most lenient)
const estateInfoLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @route GET /api/public/visitors/by-token/:token
 * @desc Get visitor details by secure token
 * @access Public (no auth)
 * @rateLimit 10 req/min
 */
router.get(
  '/visitors/by-token/:token',
  visitorTokenLimiter,
  getVisitorByToken
);

/**
 * @route GET /api/public/visitors/:token/status
 * @desc Get visitor status only (lightweight for polling)
 * @access Public (no auth)
 * @rateLimit 30 req/min
 */
router.get(
  '/visitors/:token/status',
  statusPollLimiter,
  getVisitorStatus
);

/**
 * @route POST /api/public/visitors/:token/confirm
 * @desc Confirm visit + store consent
 * @access Public (no auth)
 * @rateLimit 10 req/min
 */
router.post(
  '/visitors/:token/confirm',
  visitorTokenLimiter,
  async (req, res) => {
    // TODO: Implement confirmVisitorByToken
    res.status(501).json({ success: false, message: 'Not implemented' });
  }
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
  getEstateInfo
);

/**
 * @route GET /api/public/invites/:inviteCode
 * @desc Look up invite details by invite code (bulk or single)
 * @access Public (no auth)
 * @rateLimit 10 req/min
 */
router.get(
  '/invites/:inviteCode',
  visitorTokenLimiter,
  async (req, res) => {
    // TODO: Implement getInviteByCode
    res.status(501).json({ success: false, message: 'Not implemented' });
  }
);

export default router;
