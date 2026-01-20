/**
 * ANPR Routes
 * P7: API endpoints for automated barrier and plate recognition integration
 * 
 * Feature-flagged: Only active when ENABLE_ANPR_INTEGRATION=true
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/authMiddleware.js';
import auditLoggerFactory from '../middleware/auditLogger.js';
import anprService from '../services/anprService.js';
import { errorResponse } from '../utils/responseFormatter.js';

const router = express.Router();
const attachRequestAudit = auditLoggerFactory();
const anprLookupLimitMax = Number(process.env.ANPR_LOOKUP_RATE_LIMIT_MAX || 30);
const anprLookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number.isFinite(anprLookupLimitMax) ? anprLookupLimitMax : 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `anpr:lookup:${req.user?.id || req.ip}`,
  handler: (req, res) => {
    return errorResponse(res, 'Too many ANPR lookup requests, please try again later.', 'RATE_LIMITED', 429, null, req);
  }
});

/**
 * Check ANPR integration status
 * GET /api/anpr/status
 */
router.get('/status', authenticateToken, async (req, res) => {
  const { role } = req.user;

  if (!['admin', 'guard'].includes(role)) {
    return errorResponse(res, 'Unauthorized', 'FORBIDDEN', 403, null, req);
  }

  res.json({
    success: true,
    enabled: anprService.isEnabled(),
    message: anprService.isEnabled() 
      ? 'ANPR integration is active' 
      : 'ANPR integration is disabled (set ENABLE_ANPR_INTEGRATION=true)'
  });
});

/**
 * Lookup vehicle plate
 * POST /api/anpr/lookup
 * 
 * Used by ANPR camera systems or guard manual lookup
 */
router.post('/lookup', authenticateToken, anprLookupLimiter, attachRequestAudit, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const { plate } = req.body;

    if (!['admin', 'guard'].includes(role)) {
      return errorResponse(res, 'Unauthorized', 'FORBIDDEN', 403, null, req);
    }

    if (!plate) {
      return res.status(400).json({ success: false, error: 'Plate number required' });
    }

    const result = await anprService.lookupPlate(plate);

    // Log the lookup event
    await anprService.logAnprEvent('lookup', plate, result, { userId, role });

    res.json({
      success: true,
      plate: plate.toUpperCase(),
      ...result
    });
  } catch (error) {
    console.error('ANPR lookup error:', error);
    res.status(500).json({ success: false, error: 'Lookup failed' });
  }
});

/**
 * Webhook endpoint for ANPR camera systems
 * POST /api/anpr/webhook
 * 
 * Receives plate detection events from external ANPR hardware
 */
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-anpr-signature'];
    const { plate, camera_id, timestamp, image_url } = req.body;

    // Validate webhook signature
    if (!anprService.validateWebhookSignature(req.body, signature)) {
      await anprService.logAnprEvent('webhook_invalid', plate || 'unknown', { 
        reason: 'Invalid signature' 
      });
      return errorResponse(res, 'Invalid signature', 'UNAUTHORIZED', 401, null, req);
    }

    if (!plate) {
      return res.status(400).json({ success: false, error: 'Plate required' });
    }

    // Lookup the plate
    const result = await anprService.lookupPlate(plate);

    // Log the webhook event
    await anprService.logAnprEvent('webhook', plate, result, { 
      camera_id, 
      timestamp, 
      image_url 
    });

    // If authorized, signal barrier to open
    if (result.authorized) {
      const barrierResult = await anprService.requestBarrierOpen({
        camera_id,
        plate,
        authorization: result
      });

      return res.json({
        success: true,
        action: 'open',
        plate,
        authorization: result,
        barrier: barrierResult
      });
    }

    // Not authorized
    res.json({
      success: true,
      action: 'deny',
      plate,
      reason: result.reason
    });
  } catch (error) {
    console.error('ANPR webhook error:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

/**
 * Manual barrier open request (Guard action)
 * POST /api/anpr/barrier/open
 */
router.post('/barrier/open', authenticateToken, attachRequestAudit, async (req, res) => {
  try {
    const { role, id: guardId } = req.user;
    const { barrier_id, reason, plate } = req.body;

    if (!['admin', 'guard'].includes(role)) {
      return errorResponse(res, 'Unauthorized', 'FORBIDDEN', 403, null, req);
    }

    const result = await anprService.requestBarrierOpen({
      barrier_id,
      manual: true,
      guardId,
      reason,
      plate
    });

    await anprService.logAnprEvent('manual_open', plate || 'manual', result, { 
      guardId, 
      barrier_id, 
      reason 
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Manual barrier open error:', error);
    res.status(500).json({ success: false, error: 'Barrier open failed' });
  }
});

/**
 * Get ANPR integration contract/specification
 * GET /api/anpr/contract
 * 
 * Returns the API contract for third-party ANPR system integration
 */
router.get('/contract', async (req, res) => {
  res.json({
    success: true,
    contract: {
      version: '1.0',
      endpoints: {
        webhook: {
          method: 'POST',
          path: '/api/anpr/webhook',
          headers: {
            'Content-Type': 'application/json',
            'x-anpr-signature': 'HMAC-SHA256 signature of request body'
          },
          body: {
            plate: 'string (required) - Vehicle plate number',
            camera_id: 'string (optional) - Camera identifier',
            timestamp: 'string (optional) - ISO 8601 timestamp',
            image_url: 'string (optional) - URL to captured image'
          },
          response: {
            action: "'open' | 'deny'",
            plate: 'string - Normalized plate number',
            authorization: 'object - Authorization details if approved',
            reason: 'string - Denial reason if rejected'
          }
        },
        lookup: {
          method: 'POST',
          path: '/api/anpr/lookup',
          auth: 'Bearer token (guard/admin)',
          body: { plate: 'string (required)' }
        }
      },
      webhookSecurity: {
        method: 'HMAC-SHA256',
        header: 'x-anpr-signature',
        secret: 'Configure via ANPR_WEBHOOK_SECRET environment variable'
      }
    }
  });
});

export default router;
