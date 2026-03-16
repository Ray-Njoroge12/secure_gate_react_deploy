/**
 * @file watchlistRoutes.js
 * @description Routes for estate watchlist management
 */

import express from 'express';
import {
  getWatchlist,
  createWatchlistEntry,
  updateWatchlistEntry,
  deleteWatchlistEntry,
  getWatchlistMatches,
} from '../controllers/watchlistController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import { requireEstateContextForAdmin } from '../middleware/estateContextMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRolePolicy('adminOnly'));
router.use(requireEstateContextForAdmin);

router.get('/', getWatchlist);
router.post('/', createWatchlistEntry);
router.get('/matches', getWatchlistMatches);
router.put('/:id', updateWatchlistEntry);
router.delete('/:id', deleteWatchlistEntry);

export default router;
