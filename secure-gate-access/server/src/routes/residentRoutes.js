/**
 * Resident Routes
 * Routes for resident-specific features including profile, favorites, visitor management.
 * Business logic delegated to residentController.js
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import { attachRequestAudit } from '../middleware/auditLogging.js';
import { asyncHandler } from '../middleware/standardizedErrorHandler.js';
import requireEstateContext from '../middleware/estateContextMiddleware.js';
import {
  getResidentProfile,
  updateResidentProfile,
  getFavoriteVisitors,
  addFavoriteVisitor,
  removeFavoriteVisitor,
  getResidentStats
} from '../controllers/residentController.js';

const router = express.Router();

const withEstate = [authenticateToken, requireEstateContext, requireRolePolicy('adminOrResident')];

// GET /api/resident/profile
router.get('/profile', ...withEstate, asyncHandler(getResidentProfile));

// PUT /api/resident/profile
router.put('/profile', ...withEstate, attachRequestAudit, asyncHandler(updateResidentProfile));

// GET /api/resident/favorites
router.get('/favorites', ...withEstate, asyncHandler(getFavoriteVisitors));

// POST /api/resident/favorites
router.post('/favorites', ...withEstate, attachRequestAudit, asyncHandler(addFavoriteVisitor));

// DELETE /api/resident/favorites/:id
router.delete('/favorites/:id', ...withEstate, attachRequestAudit, asyncHandler(removeFavoriteVisitor));

// GET /api/resident/stats
router.get('/stats', ...withEstate, asyncHandler(getResidentStats));

export default router;
