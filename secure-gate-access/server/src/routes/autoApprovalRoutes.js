/**
 * Auto-Approval Routes
 * Phase 2.2: Privacy-Preserving Auto-Approval Rules Engine
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import auditLoggerFactory from '../middleware/auditLogger.js';
import autoApprovalService from '../services/autoApprovalService.js';
import { errorResponse } from '../utils/responseFormatter.js';

const router = express.Router();
const attachRequestAudit = auditLoggerFactory();

/**
 * @swagger
 * /api/auto-approval/rules:
 *   post:
 *     summary: Create a new auto-approval rule
 *     tags: [Auto-Approval]
 *     security:
 *       - bearerAuth: []
 */
router.post('/rules', authenticateToken, attachRequestAudit, async (req, res) => {
  try {
    const { id: residentId, role } = req.user;
    
    if (!['resident', 'admin'].includes(role)) {
      return errorResponse(res, 'Only residents can create auto-approval rules', 'FORBIDDEN', 403, null, req);
    }
    
    const { ruleName, visitorName, visitorPhone, category, timeRestrictions, notes } = req.body;
    
    if (!ruleName) {
      return res.status(400).json({
        success: false,
        error: 'Rule name is required'
      });
    }
    
    if (!visitorName && !visitorPhone) {
      return res.status(400).json({
        success: false,
        error: 'At least visitor name or phone is required'
      });
    }
    
    const result = await autoApprovalService.createRule(residentId, {
      ruleName,
      visitorName,
      visitorPhone,
      category,
      timeRestrictions,
      notes
    });
    
    res.status(201).json({
      ...result,
      privacy_notice: 'Rule details are encrypted and visible only to you.'
    });
  } catch (error) {
    console.error('Create rule error:', error);
    res.status(500).json({ success: false, error: 'Failed to create rule' });
  }
});

/**
 * @swagger
 * /api/auto-approval/rules:
 *   get:
 *     summary: Get all auto-approval rules for resident
 *     tags: [Auto-Approval]
 */
router.get('/rules', authenticateToken, async (req, res) => {
  try {
    const { id: residentId } = req.user;
    
    const rules = await autoApprovalService.getResidentRules(residentId);
    
    res.json({
      success: true,
      data: rules,
      count: rules.length,
      privacy_notice: 'Only you can see your rule details. Guards see only approval status.'
    });
  } catch (error) {
    console.error('Get rules error:', error);
    res.status(500).json({ success: false, error: 'Failed to get rules' });
  }
});

/**
 * @swagger
 * /api/auto-approval/rules/{id}:
 *   put:
 *     summary: Update an auto-approval rule
 *     tags: [Auto-Approval]
 */
router.put('/rules/:id', authenticateToken, attachRequestAudit, async (req, res) => {
  try {
    const { id: residentId } = req.user;
    const ruleId = parseInt(req.params.id);
    const { ruleName, matchCriteria, timeRestrictions, isActive } = req.body;
    
    const result = await autoApprovalService.updateRule(ruleId, residentId, {
      ruleName,
      matchCriteria,
      timeRestrictions,
      isActive
    });
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Update rule error:', error);
    res.status(500).json({ success: false, error: 'Failed to update rule' });
  }
});

/**
 * @swagger
 * /api/auto-approval/rules/{id}:
 *   delete:
 *     summary: Delete an auto-approval rule
 *     tags: [Auto-Approval]
 */
router.delete('/rules/:id', authenticateToken, attachRequestAudit, async (req, res) => {
  try {
    const { id: residentId } = req.user;
    const ruleId = parseInt(req.params.id);
    
    const result = await autoApprovalService.deleteRule(ruleId, residentId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Delete rule error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete rule' });
  }
});

/**
 * @swagger
 * /api/auto-approval/rules/{id}/toggle:
 *   post:
 *     summary: Toggle rule active status
 *     tags: [Auto-Approval]
 */
router.post('/rules/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const { id: residentId } = req.user;
    const ruleId = parseInt(req.params.id);
    
    // Get current status
    const rules = await autoApprovalService.getResidentRules(residentId);
    const rule = rules.find(r => r.id === ruleId);
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found'
      });
    }
    
    const result = await autoApprovalService.updateRule(ruleId, residentId, {
      isActive: !rule.isActive
    });
    
    res.json(result);
  } catch (error) {
    console.error('Toggle rule error:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle rule' });
  }
});

/**
 * @swagger
 * /api/auto-approval/check:
 *   post:
 *     summary: Check if visitor qualifies for auto-approval (Internal use)
 *     tags: [Auto-Approval]
 */
router.post('/check', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (!['guard', 'admin', 'system'].includes(role)) {
      return errorResponse(res, 'Unauthorized', 'FORBIDDEN', 403, null, req);
    }
    
    const { residentId, visitorName, visitorPhone } = req.body;
    
    if (!residentId) {
      return res.status(400).json({
        success: false,
        error: 'Resident ID is required'
      });
    }
    
    const result = await autoApprovalService.checkAutoApproval(
      residentId,
      visitorName,
      visitorPhone
    );
    
    // Privacy: Return minimal info to guards
    res.json({
      success: true,
      approved: result.approved,
      displayMessage: result.displayMessage,
      // Don't reveal which rule matched or rule details
    });
  } catch (error) {
    console.error('Check auto-approval error:', error);
    res.status(500).json({ success: false, error: 'Failed to check auto-approval' });
  }
});

/**
 * @swagger
 * /api/auto-approval/history:
 *   get:
 *     summary: Get auto-approval history for resident
 *     tags: [Auto-Approval]
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { id: residentId } = req.user;
    const limit = parseInt(req.query.limit) || 20;
    
    const history = await autoApprovalService.getResidentApprovalHistory(residentId, limit);
    
    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('Get approval history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get history' });
  }
});

/**
 * @swagger
 * /api/auto-approval/stats:
 *   get:
 *     summary: Get auto-approval statistics (Admin only)
 *     tags: [Auto-Approval]
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'admin') {
      return errorResponse(res, 'Only admins can view auto-approval statistics', 'FORBIDDEN', 403, null, req);
    }
    
    const stats = await autoApprovalService.getAutoApprovalStats();
    
    res.json({
      success: true,
      data: stats,
      privacy_notice: 'Shows aggregate stats only. No individual rule details visible.'
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get statistics' });
  }
});

/**
 * @swagger
 * /api/auto-approval/rules/all:
 *   delete:
 *     summary: Delete all rules (Resident privacy control)
 *     tags: [Auto-Approval]
 */
router.delete('/rules/all', authenticateToken, attachRequestAudit, async (req, res) => {
  try {
    const { id: residentId } = req.user;
    
    const result = await autoApprovalService.deleteAllRules(residentId);
    
    res.json(result);
  } catch (error) {
    console.error('Delete all rules error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete rules' });
  }
});

/**
 * @swagger
 * /api/auto-approval/export:
 *   get:
 *     summary: Export all rules (Data portability)
 *     tags: [Auto-Approval]
 */
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { id: residentId } = req.user;
    
    const exportData = await autoApprovalService.exportResidentRules(residentId);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=auto-approval-rules-export.json');
    res.json(exportData);
  } catch (error) {
    console.error('Export rules error:', error);
    res.status(500).json({ success: false, error: 'Failed to export rules' });
  }
});

/**
 * @swagger
 * /api/auto-approval/categories:
 *   get:
 *     summary: Get available rule categories
 *     tags: [Auto-Approval]
 */
router.get('/categories', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    categories: Object.entries(autoApprovalService.RULE_CATEGORIES).map(([key, value]) => ({
      id: value,
      label: key.charAt(0) + key.slice(1).toLowerCase().replace('_', ' ')
    }))
  });
});

export default router;
