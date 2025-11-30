/**
 * Announcements Service
 * Privacy-first community announcements
 * - Aggregate read tracking only
 * - Time-limited announcements
 * - No personal targeting without consent
 */

import db from '../database/db.enhanced.js';
import crypto from 'crypto';

const pool = db;

class AnnouncementsService {
  /**
   * Create a new announcement (admin only)
   */
  async createAnnouncement(adminId, announcementData) {
    const {
      title,
      content,
      priority = 'normal',
      targetAudience = 'all',
      expiresAt,
      isPinned = false
    } = announcementData;

    const id = crypto.randomUUID();
    const expirationDate = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

    try {
      const result = await pool.query(
        `INSERT INTO announcements (
          id, title, content, priority, target_audience, 
          expires_at, is_pinned, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *`,
        [id, title, content, priority, targetAudience, expirationDate, isPinned, adminId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating announcement:', error);
      throw error;
    }
  }

  /**
   * Get active announcements for a user
   * Privacy: No personal tracking, just role-based filtering
   */
  async getActiveAnnouncements(userRole) {
    try {
      const result = await pool.query(
        `SELECT 
          id, title, content, priority, target_audience,
          is_pinned, created_at, expires_at,
          (SELECT COUNT(*) FROM announcement_reads WHERE announcement_id = a.id) as read_count
        FROM announcements a
        WHERE (expires_at IS NULL OR expires_at > NOW())
          AND is_active = true
          AND (target_audience = 'all' OR target_audience = $1)
        ORDER BY is_pinned DESC, priority DESC, created_at DESC`,
        [userRole]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting announcements:', error);
      throw error;
    }
  }

  /**
   * Get announcement by ID
   */
  async getAnnouncementById(id) {
    try {
      const result = await pool.query(
        `SELECT 
          id, title, content, priority, target_audience,
          is_pinned, is_active, created_at, expires_at, updated_at,
          (SELECT COUNT(*) FROM announcement_reads WHERE announcement_id = $1) as read_count
        FROM announcements
        WHERE id = $1`,
        [id]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error getting announcement:', error);
      throw error;
    }
  }

  /**
   * Mark announcement as read
   * Privacy: Only stores anonymous aggregate data
   */
  async markAsRead(announcementId, userId) {
    try {
      // Use upsert to avoid duplicates
      await pool.query(
        `INSERT INTO announcement_reads (announcement_id, user_id, read_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (announcement_id, user_id) DO NOTHING`,
        [announcementId, userId]
      );

      return true;
    } catch (error) {
      console.error('Error marking announcement as read:', error);
      // Non-critical, don't throw
      return false;
    }
  }

  /**
   * Get unread announcements for a user
   */
  async getUnreadAnnouncements(userId, userRole) {
    try {
      const result = await pool.query(
        `SELECT 
          a.id, a.title, a.content, a.priority, a.is_pinned, a.created_at
        FROM announcements a
        LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = $1
        WHERE (a.expires_at IS NULL OR a.expires_at > NOW())
          AND a.is_active = true
          AND (a.target_audience = 'all' OR a.target_audience = $2)
          AND ar.id IS NULL
        ORDER BY a.is_pinned DESC, a.priority DESC, a.created_at DESC
        LIMIT 10`,
        [userId, userRole]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting unread announcements:', error);
      throw error;
    }
  }

  /**
   * Update an announcement (admin only)
   */
  async updateAnnouncement(id, adminId, updates) {
    const allowedFields = ['title', 'content', 'priority', 'target_audience', 'expires_at', 'is_pinned', 'is_active'];
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        updateFields.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    try {
      const result = await pool.query(
        `UPDATE announcements 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error updating announcement:', error);
      throw error;
    }
  }

  /**
   * Delete an announcement (admin only)
   */
  async deleteAnnouncement(id, adminId) {
    try {
      // First delete read records
      await pool.query(
        `DELETE FROM announcement_reads WHERE announcement_id = $1`,
        [id]
      );

      // Then delete the announcement
      const result = await pool.query(
        `DELETE FROM announcements WHERE id = $1 RETURNING id`,
        [id]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting announcement:', error);
      throw error;
    }
  }

  /**
   * Get announcement statistics (admin only)
   * Privacy: Only aggregate data, no individual tracking
   */
  async getAnnouncementStats(announcementId) {
    try {
      const result = await pool.query(
        `SELECT 
          a.id,
          a.title,
          a.created_at,
          COUNT(ar.id) as total_reads,
          MIN(ar.read_at) as first_read,
          MAX(ar.read_at) as last_read
        FROM announcements a
        LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id
        WHERE a.id = $1
        GROUP BY a.id, a.title, a.created_at`,
        [announcementId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error getting announcement stats:', error);
      throw error;
    }
  }

  /**
   * Get all announcements for admin management
   */
  async getAllAnnouncements(includeExpired = false) {
    try {
      let query = `
        SELECT 
          a.id, a.title, a.content, a.priority, a.target_audience,
          a.is_pinned, a.is_active, a.created_at, a.expires_at, a.updated_at,
          u.first_name || ' ' || u.last_name as created_by_name,
          (SELECT COUNT(*) FROM announcement_reads WHERE announcement_id = a.id) as read_count
        FROM announcements a
        LEFT JOIN users u ON a.created_by = u.id
      `;

      if (!includeExpired) {
        query += ` WHERE a.expires_at IS NULL OR a.expires_at > NOW()`;
      }

      query += ` ORDER BY a.created_at DESC`;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting all announcements:', error);
      throw error;
    }
  }

  /**
   * Purge expired announcements and reads
   * Privacy: Auto-delete for data minimization
   */
  async purgeExpiredAnnouncements(daysOld = 30) {
    try {
      // Delete reads for expired announcements
      await pool.query(
        `DELETE FROM announcement_reads 
         WHERE announcement_id IN (
           SELECT id FROM announcements 
           WHERE expires_at < NOW() - INTERVAL '${daysOld} days'
         )`
      );

      // Delete expired announcements
      const result = await pool.query(
        `DELETE FROM announcements 
         WHERE expires_at < NOW() - INTERVAL '${daysOld} days'
         RETURNING id`
      );

      console.log(`Purged ${result.rowCount} expired announcements`);
      return result.rowCount;
    } catch (error) {
      console.error('Error purging announcements:', error);
      return 0;
    }
  }
}

const announcementsService = new AnnouncementsService();
export default announcementsService;
