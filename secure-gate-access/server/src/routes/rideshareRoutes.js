/**
 * Rideshare Routes
 * P5: API for Uber/Bolt/Taxi quick entry
 */

import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticateToken } from '../middleware/authMiddleware.js';
import requireEstateContext from '../middleware/estateContextMiddleware.js';
import { attachRequestAudit } from '../middleware/auditLogging.js';
import rideshareService from '../services/rideshareService.js';
import { errorResponse } from '../utils/responseFormatter.js';

const router = express.Router();

// Rate limiting for rideshare creation (prevents abuse)
const rideshareCreationLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 rideshare entries per hour per resident
  message: {
    error: 'Too many rideshare entries created. Please try again later.',
    retryAfter: '1 hour',
    code: 'RIDESHARE_RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `rideshare_create_${req.user?.id || req.ip}`,
});

// Rate limiting for rideshare validation (guards at gate)
const rideshareValidationLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 validations per minute per guard
  message: {
    error: 'Too many validation attempts. Please try again shortly.',
    retryAfter: '1 minute',
    code: 'VALIDATION_RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `rideshare_validate_${req.user?.id || req.ip}`,
});

// All rideshare routes require authentication and estate context
router.use(authenticateToken);
router.use(requireEstateContext);

/**
 * Create a rideshare entry (Resident)
 * POST /api/rideshare
 */
router.post('/', rideshareCreationLimit, attachRequestAudit, async (req, res) => {
  try {
    const { id: residentId, role } = req.user;

    if (!['resident', 'admin'].includes(role)) {
      return errorResponse(res, 'Only residents can create rideshare entries', 'FORBIDDEN', 403, null, req);
    }

    const result = await rideshareService.createRideshareEntry(residentId, req.body);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Create rideshare entry error:', error);
    res.status(500).json({ success: false, error: 'Failed to create rideshare entry' });
  }
});

/**
 * Get resident's rideshare entries
 * GET /api/rideshare
 */
router.get('/', async (req, res) => {
  try {
    const { id: residentId, role } = req.user;
    const { includeExpired } = req.query;

    if (!['resident', 'admin'].includes(role)) {
      return errorResponse(res, 'Only residents can view their rideshare entries', 'FORBIDDEN', 403, null, req);
    }

    const entries = await rideshareService.getResidentRideshareEntries(
      residentId,
      includeExpired === 'true'
    );

    res.json({ success: true, data: entries, count: entries.length });
  } catch (error) {
    console.error('Get rideshare entries error:', error);
    res.status(500).json({ success: false, error: 'Failed to get entries' });
  }
});

/**
 * Cancel a rideshare entry (Resident)
 * POST /api/rideshare/:id/cancel
 */
router.post('/:id/cancel', attachRequestAudit, async (req, res) => {
  try {
    const { id: residentId } = req.user;
    const entryId = parseInt(req.params.id);

    const result = await rideshareService.cancelRideshareEntry(entryId, residentId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Cancel rideshare entry error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel entry' });
  }
});

/**
 * Get pending rideshare entries (Guard view)
 * GET /api/rideshare/pending
 */
router.get('/pending', async (req, res) => {
  try {
    const { role, estate_id } = req.user;

    if (!['guard', 'admin'].includes(role)) {
      return errorResponse(res, 'Only guards can view pending rideshare entries', 'FORBIDDEN', 403, null, req);
    }

    // Pass estate_id for proper isolation
    const entries = await rideshareService.getPendingRideshareEntries(estate_id);

    res.json({ success: true, data: entries, count: entries.length });
  } catch (error) {
    console.error('Get pending rideshare entries error:', error);
    res.status(500).json({ success: false, error: 'Failed to get pending entries' });
  }
});

/**
 * Validate rideshare entry (Guard)
 * POST /api/rideshare/validate
 */
router.post('/validate', rideshareValidationLimit, async (req, res) => {
  try {
    const { role, id: guardId, estate_id } = req.user;
    const { credential, method = 'code' } = req.body;

    if (!['guard', 'admin'].includes(role)) {
      return errorResponse(res, 'Only guards can validate rideshare entries', 'FORBIDDEN', 403, null, req);
    }

    if (!credential) {
      return res.status(400).json({ success: false, error: 'Credential required' });
    }

    // Pass estate_id for proper isolation
    const result = await rideshareService.validateRideshareEntry(credential, method, estate_id);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: result.error
      });
    }

    // Auto-mark as arrived when validated
    await rideshareService.markRideshareArrived(result.entry.id, guardId);

    res.json({
      success: true,
      valid: true,
      entry: result.entry
    });
  } catch (error) {
    console.error('Validate rideshare entry error:', error);
    res.status(500).json({ success: false, error: 'Validation failed' });
  }
});

/**
 * Mark rideshare as completed (Guard - driver left)
 * POST /api/rideshare/:id/complete
 */
router.post('/:id/complete', attachRequestAudit, async (req, res) => {
  try {
    const { role, id: guardId } = req.user;
    const entryId = parseInt(req.params.id);

    if (!['guard', 'admin'].includes(role)) {
      return errorResponse(res, 'Only guards can complete rideshare entries', 'FORBIDDEN', 403, null, req);
    }

    const result = await rideshareService.markRideshareCompleted(entryId, guardId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Complete rideshare entry error:', error);
    res.status(500).json({ success: false, error: 'Failed to complete entry' });
  }
});

export default router;
