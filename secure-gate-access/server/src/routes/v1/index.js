import express from 'express';
import authRoutes from '../authRoutes.js';
import adminRoutes from './adminRoutes.js';
import visitorRoutes from './visitorRoutes.js';
import guardRoutes from './guardRoutes.js';
import residentRoutes from './residentRoutes.js';
import incidentRoutes from './incidentRoutes.js';

const router = express.Router();

/**
 * API v1 Routes
 * This file contains all v1 API routes
 */

// Mount all v1 routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/visitors', visitorRoutes);
router.use('/guards', guardRoutes);
router.use('/residents', residentRoutes);
router.use('/incidents', incidentRoutes);

// v1 specific middleware or routes can be added here
router.use((req, res, next) => {
  // Add v1 specific headers
  res.set('API-Version', 'v1');
  res.set('API-Version-Status', 'stable');
  next();
});

export default router;




