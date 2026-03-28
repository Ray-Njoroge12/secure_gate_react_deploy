import express from 'express';
import dataPrivacyRoutes from './dataPrivacyRoutes.js';
import kenyaDPARoutes from './kenyaDPARoutes.js';

const router = express.Router();

// Consolidate privacy routes under a single /api/privacy mount.
router.use('/', dataPrivacyRoutes);
router.use('/', kenyaDPARoutes);

export default router;