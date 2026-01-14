/**
 * Rideshare Routes
 * P5: API for Uber/Bolt/Taxi quick entry
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import auditLoggerFactory from '../middleware/auditLogger.js';
import rideshareService from '../services/rideshareService.js';
import { errorResponse } from '../utils/responseFormatter.js';

const router = express.Router();
const attachRequestAudit = auditLoggerFactory();

/**
 * Create a rideshare entry (Resident)
 * POST /api/rideshare
 */
router.post('/', authenticateToken, attachRequestAudit, async (req, res) => {
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
router.get('/', authenticateToken, async (req, res) => {
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
router.post('/:id/cancel', authenticateToken, attachRequestAudit, async (req, res) => {
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
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;

    if (!['guard', 'admin'].includes(role)) {
      return errorResponse(res, 'Only guards can view pending rideshare entries', 'FORBIDDEN', 403, null, req);
    }

    const entries = await rideshareService.getPendingRideshareEntries();

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
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { role, id: guardId } = req.user;
    const { credential, method = 'code' } = req.body;

    if (!['guard', 'admin'].includes(role)) {
      return errorResponse(res, 'Only guards can validate rideshare entries', 'FORBIDDEN', 403, null, req);
    }

    if (!credential) {
      return res.status(400).json({ success: false, error: 'Credential required' });
    }

    const result = await rideshareService.validateRideshareEntry(credential, method);

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
router.post('/:id/complete', authenticateToken, attachRequestAudit, async (req, res) => {
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
