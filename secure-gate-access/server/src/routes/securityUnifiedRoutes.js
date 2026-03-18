import express from 'express';
import securityRoutes from './securityRoutes.js';
import enhancedSecurityRoutes from './enhancedSecurityRoutes.js';

const router = express.Router();

// Consolidate security endpoints under a single /api/security mount.
router.use('/', securityRoutes);
router.use('/', enhancedSecurityRoutes);

export default router;