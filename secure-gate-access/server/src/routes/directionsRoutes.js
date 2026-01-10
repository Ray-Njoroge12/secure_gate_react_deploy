/**
 * Directions Routes
 * Phase 2.3: Privacy-Preserving Visitor Directions
 */

import express from 'express';
import { authenticateToken, attachUserFromToken } from '../middleware/authMiddleware.js';
import directionsService from '../services/directionsService.js';

const router = express.Router();

const getEstateIdFromRequest = (req) => {
  const estateId = Number(req.query.estateId || req.body.estateId || req.params.estateId);

  return Number.isNaN(estateId) ? null : estateId;
};

/**
 * @swagger
 * /api/directions/estate:
 *   get:
 *     summary: Get estate gate location (public info)
 *     tags: [Directions]
 */
router.get('/estate', async (req, res) => {
  try {
    const estateId = getEstateIdFromRequest(req);

    if (!estateId) {
      return res.status(400).json({
        success: false,
        error: 'Estate ID is required'
      });
    }

    const location = await directionsService.getEstateLocation(estateId);
    
    if (!location) {
      return res.status(404).json({
        success: false,
        error: 'Estate location not configured'
      });
    }
    
    res.json({
      success: true,
      data: location,
      privacy_notice: 'Shows gate location only, not individual units.'
    });
  } catch (error) {
    console.error('Get estate location error:', error);
    res.status(500).json({ success: false, error: 'Failed to get estate location' });
  }
});

/**
 * @swagger
 * /api/directions/estate:
 *   put:
 *     summary: Update estate location (Admin only)
 *     tags: [Directions]
 */
router.put('/estate', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    const estateId = req.user?.estate_id || getEstateIdFromRequest(req);
    
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can update estate location'
      });
    }

    if (!estateId) {
      return res.status(400).json({
        success: false,
        error: 'Estate ID is required'
      });
    }
    
    const { gateName, gateLatitude, gateLongitude, directionsFromHighway, directionsFromCity } = req.body;
    
    const result = await directionsService.updateEstateLocation(estateId, {
      gateName,
      gateLatitude,
      gateLongitude,
      directionsFromHighway,
      directionsFromCity
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Update estate location error:', error);
    res.status(500).json({ success: false, error: 'Failed to update location' });
  }
});

/**
 * @swagger
 * /api/directions/visitor/{visitorId}/custom:
 *   post:
 *     summary: Add custom directions for a visitor invite
 *     tags: [Directions]
 */
router.post('/visitor/:visitorId/custom', authenticateToken, async (req, res) => {
  try {
    const { id: residentId } = req.user;
    const visitorId = parseInt(req.params.visitorId);
    const { customInstructions } = req.body;
    
    if (!customInstructions) {
      return res.status(400).json({
        success: false,
        error: 'Custom instructions are required'
      });
    }
    
    const result = await directionsService.addCustomDirections(
      visitorId,
      customInstructions,
      residentId
    );
    
    res.json(result);
  } catch (error) {
    console.error('Add custom directions error:', error);
    res.status(500).json({ success: false, error: 'Failed to add directions' });
  }
});

/**
 * @swagger
 * /api/directions/visitor/{visitorId}:
 *   get:
 *     summary: Get directions for visitor (public with invite token)
 *     tags: [Directions]
 */
router.get('/visitor/:visitorId', async (req, res) => {
  try {
    const visitorId = parseInt(req.params.visitorId);
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Invite token is required'
      });
    }
    
    const result = await directionsService.getVisitorDirections(visitorId, token);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Get visitor directions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get directions' });
  }
});

/**
 * @swagger
 * /api/directions/visitor/{visitorId}/share:
 *   get:
 *     summary: Get shareable directions link
 *     tags: [Directions]
 */
router.get('/visitor/:visitorId/share', async (req, res) => {
  try {
    const visitorId = parseInt(req.params.visitorId);
    
    const result = await directionsService.generateShareableLink(visitorId);
    
    res.json(result);
  } catch (error) {
    console.error('Generate shareable link error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate link' });
  }
});

/**
 * @swagger
 * /api/directions/visitor/{visitorId}/custom:
 *   delete:
 *     summary: Delete custom directions (Resident)
 *     tags: [Directions]
 */
router.delete('/visitor/:visitorId/custom', authenticateToken, async (req, res) => {
  try {
    const { id: residentId } = req.user;
    const visitorId = parseInt(req.params.visitorId);
    
    const result = await directionsService.deleteCustomDirections(visitorId, residentId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Delete custom directions error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete directions' });
  }
});

export default router;
