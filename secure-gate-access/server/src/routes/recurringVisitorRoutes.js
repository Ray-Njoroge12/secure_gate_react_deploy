/**
 * Recurring Visitor Routes
 * P4: API for managing daily workers, caregivers, contractors
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { attachRequestAudit } from '../middleware/auditLogging.js';
import recurringVisitorService from '../services/recurringVisitorService.js';
import { errorResponse } from '../utils/responseFormatter.js';

const router = express.Router();

/**
 * Create a recurring pass (Resident)
 * POST /api/recurring-passes
 */
router.post('/', authenticateToken, attachRequestAudit, async (req, res) => {
  try {
    const { id: residentId, role } = req.user;

    if (!['resident', 'admin', 'super_admin'].includes(role)) {
      return errorResponse(res, 'Only residents and admins can create recurring passes', 'FORBIDDEN', 403, null, req);
    }

    const result = await recurringVisitorService.createRecurringPass(residentId, req.body);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Create recurring pass error:', error);
    res.status(500).json({ success: false, error: 'Failed to create recurring pass' });
  }
});

/**
 * Get all recurring passes for resident
 * GET /api/recurring-passes
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { id: residentId, role } = req.user;
    const { status, includeExpired } = req.query;

    if (!['resident', 'admin', 'super_admin'].includes(role)) {
      return errorResponse(res, 'Only residents and admins can view recurring passes', 'FORBIDDEN', 403, null, req);
    }

    const passes = await recurringVisitorService.getResidentRecurringPasses(residentId, {
      status,
      includeExpired: includeExpired === 'true'
    });

    res.json({
      success: true,
      data: passes,
      count: passes.length
    });
  } catch (error) {
    console.error('Get recurring passes error:', error);
    res.status(500).json({ success: false, error: 'Failed to get recurring passes' });
  }
});

/**
 * Get a single recurring pass
 * GET /api/recurring-passes/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id: residentId } = req.user;
    const passId = parseInt(req.params.id);

    const pass = await recurringVisitorService.getRecurringPassById(passId, residentId);

    if (!pass) {
      return res.status(404).json({ success: false, error: 'Pass not found' });
    }

    res.json({ success: true, data: pass });
  } catch (error) {
    console.error('Get recurring pass error:', error);
    res.status(500).json({ success: false, error: 'Failed to get pass' });
  }
});

/**
 * Update a recurring pass
 * PUT /api/recurring-passes/:id
 */
router.put('/:id', authenticateToken, attachRequestAudit, async (req, res) => {
  try {
    const { id: residentId } = req.user;
    const passId = parseInt(req.params.id);

    const result = await recurringVisitorService.updateRecurringPass(passId, residentId, req.body);

    if (!result.success) {
      return res.status(result.error === 'Pass not found' ? 404 : 400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Update recurring pass error:', error);
    res.status(500).json({ success: false, error: 'Failed to update pass' });
  }
});

/**
 * Revoke a recurring pass
 * POST /api/recurring-passes/:id/revoke
 */
router.post('/:id/revoke', authenticateToken, attachRequestAudit, async (req, res) => {
  try {
    const { id: residentId } = req.user;
    const passId = parseInt(req.params.id);
    const { reason } = req.body;

    const result = await recurringVisitorService.revokeRecurringPass(passId, residentId, reason);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Revoke recurring pass error:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke pass' });
  }
});

/**
 * Suspend a recurring pass
 * POST /api/recurring-passes/:id/suspend
 */
router.post('/:id/suspend', authenticateToken, attachRequestAudit, async (req, res) => {
  try {
    const { id: residentId } = req.user;
    const passId = parseInt(req.params.id);

    const result = await recurringVisitorService.suspendRecurringPass(passId, residentId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Suspend recurring pass error:', error);
    res.status(500).json({ success: false, error: 'Failed to suspend pass' });
  }
});

/**
 * Reactivate a suspended pass
 * POST /api/recurring-passes/:id/reactivate
 */
router.post('/:id/reactivate', authenticateToken, attachRequestAudit, async (req, res) => {
  try {
    const { id: residentId } = req.user;
    const passId = parseInt(req.params.id);

    const result = await recurringVisitorService.reactivateRecurringPass(passId, residentId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Reactivate recurring pass error:', error);
    res.status(500).json({ success: false, error: 'Failed to reactivate pass' });
  }
});

/**
 * Get entry history for a pass (Resident audit)
 * GET /api/recurring-passes/:id/history
 */
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const { id: residentId } = req.user;
    const passId = parseInt(req.params.id);

    const result = await recurringVisitorService.getPassEntryHistory(passId, residentId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Get pass history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get history' });
  }
});

/**
 * Validate a recurring pass (Guard action)
 * POST /api/recurring-passes/validate
 */
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { role, id: guardId } = req.user;
    const { credential, method = 'pin' } = req.body;

    if (!['guard', 'admin', 'super_admin'].includes(role)) {
      return errorResponse(res, 'Only guards and admins can validate passes', 'FORBIDDEN', 403, null, req);
    }

    if (!credential) {
      return res.status(400).json({ success: false, error: 'Credential required' });
    }

    const result = await recurringVisitorService.validateRecurringPass(
      credential,
      method,
      req.ip,
      req.user.estate_id
    );

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: result.error,
        passInfo: result.pass ? {
          visitorName: result.pass.visitor_name,
          status: result.pass.status
        } : null
      });
    }

    // Record the entry
    await recurringVisitorService.recordPassEntry(result.pass.id, guardId, method);

    res.json({
      success: true,
      valid: true,
      pass: result.pass
    });
  } catch (error) {
    console.error('Validate recurring pass error:', error);
    res.status(500).json({ success: false, error: 'Validation failed' });
  }
});

export default router;
