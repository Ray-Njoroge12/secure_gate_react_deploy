/**
 * Sync Routes
 * Offline synchronization endpoints with privacy-first approach
 */

import express from 'express';
import syncService from '../services/syncService.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Download offline data package
 * GET /api/sync/download
 * Privacy: Only returns minimal data needed for offline operation
 */
router.get('/download', authMiddleware, async (req, res) => {
  try {
    const { id: userId, role: userRole } = req.user;

    const offlinePackage = await syncService.generateOfflinePackage(userId, userRole);

    res.json({
      success: true,
      data: offlinePackage
    });
  } catch (error) {
    console.error('Error downloading offline package:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate offline package'
    });
  }
});

/**
 * Upload offline changes
 * POST /api/sync/upload
 * Body: { packageId, changes: [...] }
 */
router.post('/upload', authMiddleware, async (req, res) => {
  try {
    const { id: userId, role: userRole } = req.user;
    const { packageId, changes } = req.body;

    if (!packageId || !Array.isArray(changes)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sync upload format'
      });
    }

    const results = await syncService.processOfflineChanges(
      userId,
      userRole,
      changes,
      packageId
    );

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error uploading offline changes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process offline changes'
    });
  }
});

/**
 * Get sync status
 * GET /api/sync/status
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        online: true,
        serverTime: new Date().toISOString(),
        syncEnabled: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status'
    });
  }
});

export default router;
