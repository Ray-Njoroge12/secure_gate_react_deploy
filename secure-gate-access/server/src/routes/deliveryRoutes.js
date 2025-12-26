/**
 * Delivery Routes
 * Phase 2.1: Privacy-Preserving Delivery & Package Management
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import auditLoggerFactory from '../middleware/auditLogger.js';
import deliveryService from '../services/deliveryService.js';
import { sendDeliveryNotification, sendHandoffDecisionNotification } from '../services/notificationService.js';
import multer from 'multer';

const router = express.Router();
const attachRequestAudit = auditLoggerFactory();

// Configure multer for photo uploads (in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * @swagger
 * /api/deliveries:
 *   post:
 *     summary: Register a new delivery (Guard)
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticateToken, attachRequestAudit, async (req, res) => {
  try {
    const { role, id: guardId } = req.user;
    
    if (!['guard', 'admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Only guards can register deliveries'
      });
    }
    
    const { trackingNumber, carrierName, recipientId, packageDescription, packageSize, notes } = req.body;
    
    if (!carrierName || !recipientId) {
      return res.status(400).json({
        success: false,
        error: 'Carrier name and recipient are required'
      });
    }
    
    const result = await deliveryService.registerDelivery({
      trackingNumber,
      carrierName,
      recipientId,
      guardId,
      packageDescription,
      packageSize,
      notes
    });
    
    // Send notification to resident (best-effort, don't fail if notification fails)
    if (result.success && result.data?.recipientEmail) {
      sendDeliveryNotification(
        { email: result.data.recipientEmail, name: result.data.recipientName },
        { carrierName, packageSize, packageDescription }
      ).catch(err => console.error('Delivery notification failed:', err));
    }
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Register delivery error:', error);
    res.status(500).json({ success: false, error: 'Failed to register delivery' });
  }
});

/**
 * @swagger
 * /api/deliveries/{id}/photo:
 *   post:
 *     summary: Add photo to delivery (Guard)
 *     tags: [Deliveries]
 */
router.post('/:id/photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { role, id: guardId } = req.user;
    const deliveryId = parseInt(req.params.id);
    
    if (!['guard', 'admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Only guards can add delivery photos'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Photo file is required'
      });
    }
    
    const result = await deliveryService.addDeliveryPhoto(
      deliveryId,
      req.file.buffer,
      req.file.mimetype,
      guardId
    );
    
    res.json(result);
  } catch (error) {
    console.error('Add delivery photo error:', error);
    res.status(500).json({ success: false, error: 'Failed to add photo' });
  }
});

/**
 * @swagger
 * /api/deliveries:
 *   get:
 *     summary: Get deliveries for resident (own deliveries only)
 *     tags: [Deliveries]
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { id: residentId, role } = req.user;
    const { status, limit, offset } = req.query;
    
    const deliveries = await deliveryService.getResidentDeliveries(residentId, {
      status,
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0
    });
    
    res.json({
      success: true,
      data: deliveries,
      count: deliveries.length,
      privacy_notice: 'Showing only your deliveries. Photos auto-delete 30 days after collection.'
    });
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({ success: false, error: 'Failed to get deliveries' });
  }
});

/**
 * @swagger
 * /api/deliveries/pending:
 *   get:
 *     summary: Get pending deliveries for pickup (Guard view)
 *     tags: [Deliveries]
 */
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (!['guard', 'admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Only guards can view pending deliveries'
      });
    }
    
    const deliveries = await deliveryService.getPendingDeliveries();
    
    res.json({
      success: true,
      data: deliveries,
      count: deliveries.length,
      privacy_notice: 'Shows minimal info. Tracking numbers not visible to guards.'
    });
  } catch (error) {
    console.error('Get pending deliveries error:', error);
    res.status(500).json({ success: false, error: 'Failed to get pending deliveries' });
  }
});

/**
 * @swagger
 * /api/deliveries/{id}:
 *   get:
 *     summary: Get delivery details (recipient only sees full info)
 *     tags: [Deliveries]
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id: requesterId, role } = req.user;
    const deliveryId = parseInt(req.params.id);
    
    const delivery = await deliveryService.getDeliveryDetail(deliveryId, requesterId, role);
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        error: 'Delivery not found'
      });
    }
    
    res.json({
      success: true,
      data: delivery
    });
  } catch (error) {
    console.error('Get delivery detail error:', error);
    res.status(500).json({ success: false, error: 'Failed to get delivery details' });
  }
});

/**
 * @swagger
 * /api/deliveries/{id}/photo:
 *   get:
 *     summary: Get delivery photo (recipient only)
 *     tags: [Deliveries]
 */
router.get('/:id/photo', authenticateToken, async (req, res) => {
  try {
    const { id: requesterId } = req.user;
    const deliveryId = parseInt(req.params.id);
    
    const result = await deliveryService.getDeliveryPhoto(deliveryId, requesterId);
    
    if (!result.success) {
      return res.status(result.error === 'Access denied' ? 403 : 404).json(result);
    }
    
    res.set('Content-Type', result.mimeType);
    res.send(result.photo);
  } catch (error) {
    console.error('Get delivery photo error:', error);
    res.status(500).json({ success: false, error: 'Failed to get photo' });
  }
});

/**
 * @swagger
 * /api/deliveries/{id}/collect:
 *   post:
 *     summary: Mark delivery as collected
 *     tags: [Deliveries]
 */
router.post('/:id/collect', authenticateToken, attachRequestAudit, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const deliveryId = parseInt(req.params.id);
    const { collectedBy } = req.body;
    
    const result = await deliveryService.collectDelivery(
      deliveryId,
      collectedBy || 'Self',
      ['guard', 'admin'].includes(role) ? userId : null
    );
    
    res.json(result);
  } catch (error) {
    console.error('Collect delivery error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark as collected' });
  }
});

/**
 * @swagger
 * /api/deliveries/{id}/notify:
 *   post:
 *     summary: Send notification to resident (Guard)
 *     tags: [Deliveries]
 */
router.post('/:id/notify', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    const deliveryId = parseInt(req.params.id);
    
    if (!['guard', 'admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Only guards can send delivery notifications'
      });
    }
    
    const result = await deliveryService.notifyResidentOfDelivery(deliveryId);
    res.json(result);
  } catch (error) {
    console.error('Notify delivery error:', error);
    res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
});

/**
 * Resident chooses how the delivery should be handled
 * Route: POST /api/deliveries/:id/handoff
 * Body: { preference: 'pickup_at_gate' | 'deliver_to_residence' }
 */
router.post('/:id/handoff', authenticateToken, attachRequestAudit, async (req, res) => {
  try {
    const { id: residentId, role } = req.user;
    const deliveryId = parseInt(req.params.id);
    const { preference } = req.body;

    if (!['resident', 'admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Only residents can set delivery handoff preference'
      });
    }

    const result = await deliveryService.setDeliveryHandoffPreference(deliveryId, residentId, preference);
    if (!result.success) {
      return res.status(result.error === 'Delivery not found' ? 404 : 400).json(result);
    }

    // Notify guards of resident's decision (best-effort)
    sendHandoffDecisionNotification({ id: deliveryId }, preference)
      .catch(err => console.error('Handoff notification failed:', err));

    res.json(result);
  } catch (error) {
    console.error('Set handoff preference error:', error);
    res.status(500).json({ success: false, error: 'Failed to set handoff preference' });
  }
});

/**
 * @swagger
 * /api/deliveries/stats:
 *   get:
 *     summary: Get aggregate delivery statistics (Admin)
 *     tags: [Deliveries]
 */
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can view delivery statistics'
      });
    }
    
    const stats = await deliveryService.getDeliveryStats();
    
    res.json({
      success: true,
      data: stats,
      privacy_notice: 'Shows aggregate stats only. No individual delivery details visible.'
    });
  } catch (error) {
    console.error('Get delivery stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get statistics' });
  }
});

/**
 * @swagger
 * /api/deliveries/history:
 *   delete:
 *     summary: Delete all delivery history (Resident privacy control)
 *     tags: [Deliveries]
 */
router.delete('/history', authenticateToken, attachRequestAudit, async (req, res) => {
  try {
    const { id: residentId } = req.user;
    
    const result = await deliveryService.deleteDeliveryHistory(residentId);
    
    res.json(result);
  } catch (error) {
    console.error('Delete delivery history error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete history' });
  }
});

export default router;
