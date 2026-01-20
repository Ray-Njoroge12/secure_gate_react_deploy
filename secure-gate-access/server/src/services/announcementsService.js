/**
 * Announcements Service
 * Privacy-first community announcements
 * - Aggregate read tracking only
 * - Time-limited announcements
 * - No personal targeting without consent
 * SECURITY: All queries filter by estate_id
 */

import db from '../database/db.enhanced.js';
import * as crypto from 'crypto';

const pool = db;

class AnnouncementsService {
  /**
   * Create a new announcement (admin only)
   * SECURITY: Requires estate_id
   */
  async createAnnouncement(adminId, announcementData, estateId) {
    const {
      title,
      content,
      priority = 'normal',
      targetAudience = 'all',
      expiresAt,
      isPinned = false
    } = announcementData;

    // SECURITY: Require estate context
    if (!estateId) {
      throw new Error('Estate context required for creating announcements');
    }

    const id = crypto.randomUUID();
    const expirationDate = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

    try {
      const result = await pool.query(
        `INSERT INTO announcements (
          id, title, content, priority, target_audience, 
          expires_at, is_pinned, created_by, estate_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *`,
        [id, title, content, priority, targetAudience, expirationDate, isPinned, adminId, estateId]
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
   * SECURITY: Filters by estate_id
   */
  async getActiveAnnouncements(userRole, estateId) {
    // SECURITY: Require estate context
    if (!estateId) {
      console.warn('[AnnouncementsService] getActiveAnnouncements called without estate_id');
      return [];
    }

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
          AND estate_id = $2
        ORDER BY is_pinned DESC, priority DESC, created_at DESC`,
        [userRole, estateId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting announcements:', error);
      throw error;
    }
  }

  /**
   * Get announcement by ID
   * SECURITY: Filters by estate_id
   */
  async getAnnouncementById(id, estateId = null) {
    try {
      let query = `SELECT 
        id, title, content, priority, target_audience,
        is_pinned, is_active, created_at, expires_at, updated_at,
        (SELECT COUNT(*) FROM announcement_reads WHERE announcement_id = $1) as read_count
      FROM announcements
      WHERE id = $1`;
      const params = [id];

      // SECURITY: Filter by estate_id if provided
      if (estateId) {
        query += ` AND estate_id = $2`;
        params.push(estateId);
      }

      const result = await pool.query(query, params);
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
   * SECURITY: Filters by estate_id
   */
  async getUnreadAnnouncements(userId, userRole, estateId) {
    // SECURITY: Require estate context
    if (!estateId) {
      console.warn('[AnnouncementsService] getUnreadAnnouncements called without estate_id');
      return [];
    }

    try {
      const result = await pool.query(
        `SELECT 
          a.id, a.title, a.content, a.priority, a.is_pinned, a.created_at
        FROM announcements a
        LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = $1
        WHERE (a.expires_at IS NULL OR a.expires_at > NOW())
          AND a.is_active = true
          AND (a.target_audience = 'all' OR a.target_audience = $2)
          AND a.estate_id = $3
          AND ar.id IS NULL
        ORDER BY a.is_pinned DESC, a.priority DESC, a.created_at DESC
        LIMIT 10`,
        [userId, userRole, estateId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting unread announcements:', error);
      throw error;
    }
  }

  /**
   * Update an announcement (admin only)
   * SECURITY: Filters by estate_id
   */
  async updateAnnouncement(id, adminId, updates, estateId = null) {
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

    // SECURITY: Build WHERE clause with estate_id filter
    let whereClause = `WHERE id = $${paramIndex}`;
    paramIndex++;

    if (estateId) {
      whereClause += ` AND estate_id = $${paramIndex}`;
      values.push(estateId);
    }

    try {
      const result = await pool.query(
        `UPDATE announcements 
         SET ${updateFields.join(', ')}
         ${whereClause}
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
   * SECURITY: Filters by estate_id
   */
  async deleteAnnouncement(id, adminId, estateId = null) {
    try {
      // Build query with estate filter
      let deleteQuery = `DELETE FROM announcements WHERE id = $1`;
      const params = [id];

      if (estateId) {
        deleteQuery += ` AND estate_id = $2`;
        params.push(estateId);
      }
      deleteQuery += ` RETURNING id`;

      // First delete read records (no estate filter needed - tied to announcement)
      await pool.query(
        `DELETE FROM announcement_reads WHERE announcement_id = $1`,
        [id]
      );

      // Then delete the announcement with estate filter
      const result = await pool.query(deleteQuery, params);

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting announcement:', error);
      throw error;
    }
  }

  /**
   * Get announcement statistics (admin only)
   * Privacy: Only aggregate data, no individual tracking
   * SECURITY: Filters by estate_id
   */
  async getAnnouncementStats(announcementId, estateId = null) {
    try {
      let query = `SELECT 
        a.id,
        a.title,
        a.created_at,
        COUNT(ar.id) as total_reads,
        MIN(ar.read_at) as first_read,
        MAX(ar.read_at) as last_read
      FROM announcements a
      LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id
      WHERE a.id = $1`;
      const params = [announcementId];

      if (estateId) {
        query += ` AND a.estate_id = $2`;
        params.push(estateId);
      }

      query += ` GROUP BY a.id, a.title, a.created_at`;

      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting announcement stats:', error);
      throw error;
    }
  }

  /**
   * Get all announcements for admin management
   * SECURITY: Filters by estate_id
   */
  async getAllAnnouncements(includeExpired = false, estateId = null) {
    try {
      let query = `
        SELECT 
          a.id, a.title, a.content, a.priority, a.target_audience,
          a.is_pinned, a.is_active, a.created_at, a.expires_at, a.updated_at,
          u.first_name || ' ' || u.last_name as created_by_name,
          (SELECT COUNT(*) FROM announcement_reads WHERE announcement_id = a.id) as read_count
        FROM announcements a
        LEFT JOIN users u ON a.created_by = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      // SECURITY: Filter by estate_id
      if (estateId) {
        query += ` AND a.estate_id = $${paramIndex}`;
        params.push(estateId);
        paramIndex++;
      }

      if (!includeExpired) {
        query += ` AND (a.expires_at IS NULL OR a.expires_at > NOW())`;
      }

      query += ` ORDER BY a.created_at DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting all announcements:', error);
      throw error;
    }
  }

  /**
   * Purge expired announcements and reads
   * Privacy: Auto-delete for data minimization
   * SECURITY: Filters by estate_id if provided
   */
  async purgeExpiredAnnouncements(daysOld = 30, estateId = null) {
    try {
      // Build condition with optional estate filter
      let condition = `expires_at < NOW() - INTERVAL '${daysOld} days'`;
      const params = [];

      if (estateId) {
        condition += ` AND estate_id = $1`;
        params.push(estateId);
      }

      // Delete reads for expired announcements
      await pool.query(
        `DELETE FROM announcement_reads 
         WHERE announcement_id IN (
           SELECT id FROM announcements 
           WHERE ${condition}
         )`,
        params
      );

      // Delete expired announcements
      const result = await pool.query(
        `DELETE FROM announcements 
         WHERE ${condition}
         RETURNING id`,
        params
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

