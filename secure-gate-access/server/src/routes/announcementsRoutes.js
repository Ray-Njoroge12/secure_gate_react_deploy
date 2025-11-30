/**
 * Announcements Routes
 * Privacy-first community announcements API
 */

import express from 'express';
import announcementsService from '../services/announcementsService.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Get active announcements for the current user
 * GET /api/announcements
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userRole = req.user.role;
    const announcements = await announcementsService.getActiveAnnouncements(userRole);

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Error getting announcements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get announcements'
    });
  }
});

/**
 * Get unread announcements for the current user
 * GET /api/announcements/unread
 */
router.get('/unread', authMiddleware, async (req, res) => {
  try {
    const { id: userId, role: userRole } = req.user;
    const announcements = await announcementsService.getUnreadAnnouncements(userId, userRole);

    res.json({
      success: true,
      data: announcements,
      count: announcements.length
    });
  } catch (error) {
    console.error('Error getting unread announcements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread announcements'
    });
  }
});

/**
 * Get a specific announcement
 * GET /api/announcements/:id
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const announcement = await announcementsService.getAnnouncementById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error('Error getting announcement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get announcement'
    });
  }
});

/**
 * Mark announcement as read
 * POST /api/announcements/:id/read
 */
router.post('/:id/read', authMiddleware, async (req, res) => {
  try {
    await announcementsService.markAsRead(req.params.id, req.user.id);

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error marking announcement as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark announcement as read'
    });
  }
});

// ============ ADMIN ROUTES ============

/**
 * Create a new announcement (admin only)
 * POST /api/announcements
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can create announcements'
      });
    }

    const { title, content, priority, targetAudience, expiresAt, isPinned } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
    }

    const announcement = await announcementsService.createAnnouncement(req.user.id, {
      title,
      content,
      priority,
      targetAudience,
      expiresAt,
      isPinned
    });

    res.status(201).json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create announcement'
    });
  }
});

/**
 * Update an announcement (admin only)
 * PUT /api/announcements/:id
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can update announcements'
      });
    }

    const announcement = await announcementsService.updateAnnouncement(
      req.params.id,
      req.user.id,
      req.body
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update announcement'
    });
  }
});

/**
 * Delete an announcement (admin only)
 * DELETE /api/announcements/:id
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can delete announcements'
      });
    }

    const deleted = await announcementsService.deleteAnnouncement(req.params.id, req.user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete announcement'
    });
  }
});

/**
 * Get announcement statistics (admin only)
 * GET /api/announcements/:id/stats
 */
router.get('/:id/stats', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can view announcement stats'
      });
    }

    const stats = await announcementsService.getAnnouncementStats(req.params.id);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting announcement stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get announcement stats'
    });
  }
});

/**
 * Get all announcements for admin management
 * GET /api/announcements/admin/all
 */
router.get('/admin/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can view all announcements'
      });
    }

    const includeExpired = req.query.includeExpired === 'true';
    const announcements = await announcementsService.getAllAnnouncements(includeExpired);

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Error getting all announcements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get announcements'
    });
  }
});

export default router;
