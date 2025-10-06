import express from 'express';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import visitorRoutes from './visitorRoutes.js';
import guardRoutes from './guardRoutes.js';
import residentRoutes from './residentRoutes.js';
import incidentRoutes from './incidentRoutes.js';

const router = express.Router();

/**
 * API v2 Routes
 * This file contains all v2 API routes with enhanced features
 */

// Mount all v2 routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/visitors', visitorRoutes);
router.use('/guards', guardRoutes);
router.use('/residents', residentRoutes);
router.use('/incidents', incidentRoutes);

// v2 specific middleware
router.use((req, res, next) => {
  // Add v2 specific headers
  res.set('API-Version', 'v2');
  res.set('API-Version-Status', 'beta');
  res.set('API-Version-Features', 'enhanced-auth,refresh-tokens,improved-validation');
  next();
});

export default router;
