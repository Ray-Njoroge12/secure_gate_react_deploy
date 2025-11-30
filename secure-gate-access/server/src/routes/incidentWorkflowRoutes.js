/**
 * @file incidentWorkflowRoutes.js
 * @description Routes for incident workflow management
 */

import express from 'express';
import {
  getIncidentQueue,
  getIncidentStats,
  updateIncidentStatus,
  assignIncident,
  escalateIncident,
  getIncidentComments,
  addIncidentComment,
  getIncidentHistory,
  getIncidentSLA
} from '../controllers/incidentWorkflowController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Queue and stats
router.get('/queue', getIncidentQueue);
router.get('/stats', getIncidentStats);

// Incident management
router.put('/:id/status', updateIncidentStatus);
router.post('/:id/assign', assignIncident);
router.post('/:id/escalate', escalateIncident);

// Comments
router.get('/:id/comments', getIncidentComments);
router.post('/:id/comments', addIncidentComment);

// History and SLA
router.get('/:id/history', getIncidentHistory);
router.get('/:id/sla', getIncidentSLA);

export default router;
