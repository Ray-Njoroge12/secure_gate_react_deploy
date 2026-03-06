/**
 * @file guardIncidentRoutes.js
 * @description Phase G4 - Guard incident reporting routes
 * Handles guard operational incident logging (not security incidents)
 */

import express from 'express';
import { createIncident, getIncidents, resolveIncident } from '../controllers/incidentController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import { attachRequestAudit } from '../middleware/auditLogging.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);
router.use(attachRequestAudit);

/**
 * @route POST /api/guard/incidents
 * @desc Create a new incident report (guard/admin only)
 * @access Private (guard, admin, super_admin)
 */
// GUARD-002 FIX: Added requireRole middleware for proper access control
router.post('/', requireRolePolicy('adminOrGuard'), createIncident);

/**
 * @route GET /api/guard/incidents
 * @desc Get incidents with filtering (guard/admin only)
 * @access Private (guard, admin, super_admin)
 * @query fromDate, toDate, category, severity, resolved, limit, offset
 */
// GUARD-002 FIX: Added requireRole middleware for proper access control
router.get('/', requireRolePolicy('adminOrGuard'), getIncidents);

/**
 * @route PUT /api/guard/incidents/:id/resolve
 * @desc Resolve an incident (admin only)
 * @access Private (admin)
 */
// GUARD-002 FIX: Added requireRole middleware - only admins can resolve
router.put('/:id/resolve', requireRolePolicy('adminOnly'), resolveIncident);

export default router;
