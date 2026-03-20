/**
 * @file announcementsService.js
 * @description Community announcements service
 * Phase 3.4: Community Announcements
 * 
 * Features:
 * - Fetch active announcements
 * - Mark as read (aggregate only)
 * - Manage opt-out preferences
 * - Admin CRUD operations
 */

import http from './http';
import logger from '../utils/logger';

class AnnouncementsService {
  /**
   * Get all active announcements for the current user
   */
  async getActiveAnnouncements() {
    try {
      const response = await http.get('/api/announcements');
      return response.data || [];
    } catch (error) {
      logger.error('Error fetching announcements:', error);
      throw error;
    }
  }

  /**
   * Get unread announcements for the current user
   */
  async getUnreadAnnouncements() {
    try {
      const response = await http.get('/api/announcements/unread');
      return {
        announcements: response.data || [],
        count: response.count || 0
      };
    } catch (error) {
      logger.error('Error fetching unread announcements:', error);
      throw error;
    }
  }

  /**
   * Get a specific announcement by ID
   */
  async getAnnouncementById(id) {
    try {
      const response = await http.get(`/api/announcements/${id}`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching announcement:', error);
      throw error;
    }
  }

  /**
   * Mark an announcement as read
   * Privacy: Only stores aggregate data, not individual tracking
   */
  async markAsRead(announcementId) {
    try {
      await http.post(`/api/announcements/${announcementId}/read`);
      return true;
    } catch (error) {
      logger.error('Error marking announcement as read:', error);
      // Non-critical, don't throw
      return false;
    }
  }

  /**
   * Get user's announcement preferences
   */
  async getPreferences() {
    try {
      const response = await http.get('/api/announcements/preferences');
      return response.data || {
        receiveNonCritical: true,
        emailEnabled: true,
        pushEnabled: true,
        smsEnabled: false
      };
    } catch (error) {
      logger.error('Error fetching announcement preferences:', error);
      throw error;
    }
  }

  /**
   * Update user's announcement preferences
   */
  async updatePreferences(preferences) {
    try {
      const response = await http.put('/api/announcements/preferences', preferences);
      return response.data;
    } catch (error) {
      logger.error('Error updating announcement preferences:', error);
      throw error;
    }
  }

  /**
   * Get announcement history
   */
  async getAnnouncementHistory(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
      if (options.priority) params.append('priority', options.priority);
      
      const response = await http.get(`/api/announcements/history?${params}`);
      return {
        announcements: response.data || [],
        pagination: response.pagination
      };
    } catch (error) {
      logger.error('Error fetching announcement history:', error);
      throw error;
    }
  }

  // ============ Admin Methods ============

  /**
   * Create a new announcement (admin only)
   */
  async createAnnouncement(announcementData) {
    try {
      const response = await http.post('/api/announcements', announcementData);
      return response.data;
    } catch (error) {
      logger.error('Error creating announcement:', error);
      throw error;
    }
  }

  /**
   * Update an announcement (admin only)
   */
  async updateAnnouncement(id, updates) {
    try {
      const response = await http.put(`/api/announcements/${id}`, updates);
      return response.data;
    } catch (error) {
      logger.error('Error updating announcement:', error);
      throw error;
    }
  }

  /**
   * Delete an announcement (admin only)
   */
  async deleteAnnouncement(id) {
    try {
      await http.delete(`/api/announcements/${id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting announcement:', error);
      throw error;
    }
  }

  /**
   * Get announcement analytics (admin only)
   * Privacy: Returns aggregate data only
   */
  async getAnnouncementAnalytics(announcementId) {
    try {
      const response = await http.get(`/api/announcements/${announcementId}/analytics`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching announcement analytics:', error);
      throw error;
    }
  }

  /**
   * Get all announcements for admin management
   */
  async getAllAnnouncements(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
      if (options.includeExpired) params.append('includeExpired', 'true');
      if (options.includeInactive) params.append('includeInactive', 'true');
      
      const response = await http.get(`/api/announcements/admin/all?${params}`);
      return {
        announcements: response.data || [],
        pagination: response.pagination
      };
    } catch (error) {
      logger.error('Error fetching all announcements:', error);
      throw error;
    }
  }
}

// Export singleton instance
const announcementsService = new AnnouncementsService();
export default announcementsService;
