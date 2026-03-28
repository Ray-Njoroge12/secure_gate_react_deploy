/**
 * @file policyRoutes.js
 * @description Routes for admin policy engine management
 */

import express from 'express';
import {
  getPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
} from '../controllers/policyController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import { requireEstateContextForAdmin } from '../middleware/estateContextMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRolePolicy('adminOnly'));
router.use(requireEstateContextForAdmin);

router.get('/', getPolicies);
router.post('/', createPolicy);
router.put('/:id', updatePolicy);
router.delete('/:id', deletePolicy);

export default router;
