/**
 * @file guardIncidentRoutes.js
 * @description Phase G4 - Guard incident reporting routes
 * Handles guard operational incident logging (not security incidents)
 */

import express from 'express';
import { createIncident, getIncidents, resolveIncident } from '../controllers/incidentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import attachRequestAudit from '../middleware/auditLogger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);
router.use(attachRequestAudit);

/**
 * @route POST /api/guard/incidents
 * @desc Create a new incident report (guard/admin only)
 * @access Private (guard, admin)
 */
router.post('/', createIncident);

/**
 * @route GET /api/guard/incidents
 * @desc Get incidents with filtering (guard/admin only)
 * @access Private (guard, admin)
 * @query fromDate, toDate, category, severity, resolved, limit, offset
 */
router.get('/', getIncidents);

/**
 * @route PUT /api/guard/incidents/:id/resolve
 * @desc Resolve an incident (admin only)
 * @access Private (admin)
 */
router.put('/:id/resolve', resolveIncident);

export default router;
