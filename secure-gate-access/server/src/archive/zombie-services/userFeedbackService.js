/**
 * User Feedback Service
 * Handles in-app feedback collection and user satisfaction tracking
 */

import { dbManager } from '../database/db.enhanced.js';
import loggingService from './loggingService.js';
import performanceAlertingService from './performanceAlertingService.js';

class UserFeedbackService {
  constructor() {
    this.feedbackTypes = [
      'bug_report',
      'feature_request',
      'usability_issue',
      'performance_issue',
      'general_feedback',
      'satisfaction_rating'
    ];
    
    this.satisfactionCategories = [
      'overall_experience',
      'ease_of_use',
      'performance',
      'feature_completeness',
      'design_quality',
      'reliability'
    ];
    
    this.feedbackStats = {
      totalFeedback: 0,
      averageRating: 0,
      feedbackByType: new Map(),
      satisfactionTrends: []
    };
  }

  /**
   * Initialize feedback service
   */
  async initialize() {
    try {
      await this.createFeedbackTables();
      await this.loadFeedbackStats();
      
      loggingService.logInfo('User feedback service initialized successfully');
    } catch (error) {
      loggingService.logError('Failed to initialize user feedback service', error);
      throw error;
    }
  }

  /**
   * Create feedback database tables
   */
  async createFeedbackTables() {
    const createFeedbackTable = `
      CREATE TABLE IF NOT EXISTS user_feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        estate_id INTEGER REFERENCES estates(id),
        feedback_type VARCHAR(50) NOT NULL,
        category VARCHAR(50),
        title VARCHAR(200),
        description TEXT,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        metadata JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        assigned_to INTEGER REFERENCES users(id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    const createSatisfactionTable = `
      CREATE TABLE IF NOT EXISTS user_satisfaction (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        estate_id INTEGER REFERENCES estates(id),
        category VARCHAR(50) NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        feedback_text TEXT,
        session_id VARCHAR(100),
        page_context VARCHAR(100),
        feature_context VARCHAR(100),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    const createFeedbackIndexes = `
      CREATE INDEX IF NOT EXISTS idx_user_feedback_user_estate ON user_feedback(user_id, estate_id);
      CREATE INDEX IF NOT EXISTS idx_user_feedback_type_status ON user_feedback(feedback_type, status);
      CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at);
      CREATE INDEX IF NOT EXISTS idx_user_satisfaction_user_estate ON user_satisfaction(user_id, estate_id);
      CREATE INDEX IF NOT EXISTS idx_user_satisfaction_category ON user_satisfaction(category);
      CREATE INDEX IF NOT EXISTS idx_user_satisfaction_created_at ON user_satisfaction(created_at);
    `;

    await dbManager.query(createFeedbackTable);
    await dbManager.query(createSatisfactionTable);
    await dbManager.query(createFeedbackIndexes);
  }

  /**
   * Submit user feedback
   */
  async submitFeedback(feedbackData) {
    try {
      const {
        userId,
        estateId,
        feedbackType,
        category,
        title,
        description,
        rating,
        metadata = {},
        priority = 'medium'
      } = feedbackData;

      // Validate feedback type
      if (!this.feedbackTypes.includes(feedbackType)) {
        throw new Error(`Invalid feedback type: ${feedbackType}`);
      }

      // Validate rating if provided
      if (rating && (rating < 1 || rating > 5)) {
        throw new Error('Rating must be between 1 and 5');
      }

      const result = await dbManager.query(`
        INSERT INTO user_feedback (
          user_id, estate_id, feedback_type, category, title, description, 
          rating, metadata, priority
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        userId, estateId, feedbackType, category, title, description,
        rating, JSON.stringify(metadata), priority
      ]);

      const feedback = result.rows[0];

      // Log feedback submission
      loggingService.logAudit(
        'User feedback submitted',
        'feedback_submit',
        userId,
        {
          feedbackId: feedback.id,
          feedbackType,
          category,
          rating,
          priority
        }
      );

      // Update stats
      await this.updateFeedbackStats();

      // Send alert for critical feedback
      if (priority === 'critical' || (rating && rating <= 2)) {
        await this.sendCriticalFeedbackAlert(feedback);
      }

      return feedback;

    } catch (error) {
      loggingService.logError('Failed to submit user feedback', error, {
        userId: feedbackData.userId,
        feedbackType: feedbackData.feedbackType
      });
      throw error;
    }
  }

  /**
   * Submit satisfaction rating
   */
  async submitSatisfactionRating(satisfactionData) {
    try {
      const {
        userId,
        estateId,
        category,
        rating,
        feedbackText,
        sessionId,
        pageContext,
        featureContext,
        metadata = {}
      } = satisfactionData;

      // Validate category
      if (!this.satisfactionCategories.includes(category)) {
        throw new Error(`Invalid satisfaction category: ${category}`);
      }

      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const result = await dbManager.query(`
        INSERT INTO user_satisfaction (
          user_id, estate_id, category, rating, feedback_text,
          session_id, page_context, feature_context, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        userId, estateId, category, rating, feedbackText,
        sessionId, pageContext, featureContext, JSON.stringify(metadata)
      ]);

      const satisfaction = result.rows[0];

      // Log satisfaction rating
      loggingService.logAudit(
        'User satisfaction rating submitted',
        'satisfaction_rating',
        userId,
        {
          satisfactionId: satisfaction.id,
          category,
          rating,
          pageContext,
          featureContext
        }
      );

      // Update satisfaction trends
      await this.updateSatisfactionTrends();

      return satisfaction;

    } catch (error) {
      loggingService.logError('Failed to submit satisfaction rating', error, {
        userId: satisfactionData.userId,
        category: satisfactionData.category
      });
      throw error;
    }
  }

  /**
   * Get user feedback
   */
  async getFeedback(filters = {}) {
    try {
      const {
        userId,
        estateId,
        feedbackType,
        status,
        priority,
        limit = 50,
        offset = 0,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = filters;

      let query = `
        SELECT f.*, u.username, u.email as user_email
        FROM user_feedback f
        LEFT JOIN users u ON f.user_id = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (userId) {
        query += ` AND f.user_id = $${paramIndex++}`;
        params.push(userId);
      }

      if (estateId) {
        query += ` AND f.estate_id = $${paramIndex++}`;
        params.push(estateId);
      }

      if (feedbackType) {
        query += ` AND f.feedback_type = $${paramIndex++}`;
        params.push(feedbackType);
      }

      if (status) {
        query += ` AND f.status = $${paramIndex++}`;
        params.push(status);
      }

      if (priority) {
        query += ` AND f.priority = $${paramIndex++}`;
        params.push(priority);
      }

      query += ` ORDER BY f.${sortBy} ${sortOrder}`;
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await dbManager.query(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM user_feedback f
        WHERE 1=1
      `;
      const countParams = params.slice(0, -2); // Remove limit and offset

      if (userId) countQuery += ` AND f.user_id = $1`;
      if (estateId) countQuery += ` AND f.estate_id = $${userId ? 2 : 1}`;
      if (feedbackType) countQuery += ` AND f.feedback_type = $${countParams.length}`;
      if (status) countQuery += ` AND f.status = $${countParams.length}`;
      if (priority) countQuery += ` AND f.priority = $${countParams.length}`;

      const countResult = await dbManager.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return {
        feedback: result.rows,
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      loggingService.logError('Failed to get user feedback', error, filters);
      throw error;
    }
  }

  /**
   * Get satisfaction ratings
   */
  async getSatisfactionRatings(filters = {}) {
    try {
      const {
        userId,
        estateId,
        category,
        dateFrom,
        dateTo,
        limit = 100,
        offset = 0
      } = filters;

      let query = `
        SELECT s.*, u.username, u.email as user_email
        FROM user_satisfaction s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (userId) {
        query += ` AND s.user_id = $${paramIndex++}`;
        params.push(userId);
      }

      if (estateId) {
        query += ` AND s.estate_id = $${paramIndex++}`;
        params.push(estateId);
      }

      if (category) {
        query += ` AND s.category = $${paramIndex++}`;
        params.push(category);
      }

      if (dateFrom) {
        query += ` AND s.created_at >= $${paramIndex++}`;
        params.push(dateFrom);
      }

      if (dateTo) {
        query += ` AND s.created_at <= $${paramIndex++}`;
        params.push(dateTo);
      }

      query += ` ORDER BY s.created_at DESC`;
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await dbManager.query(query, params);

      return result.rows;

    } catch (error) {
      loggingService.logError('Failed to get satisfaction ratings', error, filters);
      throw error;
    }
  }

  /**
   * Get feedback analytics
   */
  async getFeedbackAnalytics(filters = {}) {
    try {
      const { estateId, dateFrom, dateTo } = filters;

      // Base conditions
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (estateId) {
        whereClause += ` AND estate_id = $${paramIndex++}`;
        params.push(estateId);
      }

      if (dateFrom) {
        whereClause += ` AND created_at >= $${paramIndex++}`;
        params.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ` AND created_at <= $${paramIndex++}`;
        params.push(dateTo);
      }

      // Feedback by type
      const feedbackByTypeQuery = `
        SELECT feedback_type, COUNT(*) as count, AVG(rating) as avg_rating
        FROM user_feedback
        ${whereClause}
        GROUP BY feedback_type
        ORDER BY count DESC
      `;

      // Feedback by status
      const feedbackByStatusQuery = `
        SELECT status, COUNT(*) as count
        FROM user_feedback
        ${whereClause}
        GROUP BY status
      `;

      // Feedback by priority
      const feedbackByPriorityQuery = `
        SELECT priority, COUNT(*) as count
        FROM user_feedback
        ${whereClause}
        GROUP BY priority
        ORDER BY 
          CASE priority 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
          END
      `;

      // Satisfaction by category
      const satisfactionByCategoryQuery = `
        SELECT category, AVG(rating) as avg_rating, COUNT(*) as count
        FROM user_satisfaction
        ${whereClause}
        GROUP BY category
        ORDER BY avg_rating DESC
      `;

      // Satisfaction trends (last 30 days)
      const satisfactionTrendsQuery = `
        SELECT 
          DATE(created_at) as date,
          AVG(rating) as avg_rating,
          COUNT(*) as count
        FROM user_satisfaction
        ${whereClause}
        AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      // Execute all queries
      const [
        feedbackByType,
        feedbackByStatus,
        feedbackByPriority,
        satisfactionByCategory,
        satisfactionTrends
      ] = await Promise.all([
        dbManager.query(feedbackByTypeQuery, params),
        dbManager.query(feedbackByStatusQuery, params),
        dbManager.query(feedbackByPriorityQuery, params),
        dbManager.query(satisfactionByCategoryQuery, params),
        dbManager.query(satisfactionTrendsQuery, params)
      ]);

      // Overall statistics
      const overallStatsQuery = `
        SELECT 
          COUNT(*) as total_feedback,
          AVG(rating) as avg_rating,
          COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_feedback,
          COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_feedback
        FROM user_feedback
        ${whereClause}
        AND rating IS NOT NULL
      `;

      const overallStats = await dbManager.query(overallStatsQuery, params);

      return {
        overview: overallStats.rows[0],
        feedbackByType: feedbackByType.rows,
        feedbackByStatus: feedbackByStatus.rows,
        feedbackByPriority: feedbackByPriority.rows,
        satisfactionByCategory: satisfactionByCategory.rows,
        satisfactionTrends: satisfactionTrends.rows,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      loggingService.logError('Failed to get feedback analytics', error, filters);
      throw error;
    }
  }

  /**
   * Update feedback status
   */
  async updateFeedbackStatus(feedbackId, status, assignedTo = null, resolution = null) {
    try {
      const updateData = {
        status,
        updated_at: new Date()
      };

      if (assignedTo) {
        updateData.assigned_to = assignedTo;
      }

      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date();
        if (resolution) {
          updateData.metadata = JSON.stringify({ resolution });
        }
      }

      const setClause = Object.keys(updateData)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');

      const query = `
        UPDATE user_feedback 
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `;

      const params = [feedbackId, ...Object.values(updateData)];
      const result = await dbManager.query(query, params);

      if (result.rows.length === 0) {
        throw new Error('Feedback not found');
      }

      const feedback = result.rows[0];

      loggingService.logAudit(
        'Feedback status updated',
        'feedback_status_update',
        assignedTo,
        {
          feedbackId,
          oldStatus: feedback.status,
          newStatus: status,
          assignedTo
        }
      );

      return feedback;

    } catch (error) {
      loggingService.logError('Failed to update feedback status', error, {
        feedbackId,
        status
      });
      throw error;
    }
  }

  /**
   * Load feedback statistics
   */
  async loadFeedbackStats() {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_feedback,
          AVG(rating) as avg_rating,
          feedback_type,
          COUNT(*) as type_count
        FROM user_feedback
        WHERE rating IS NOT NULL
        GROUP BY feedback_type
      `;

      const result = await dbManager.query(statsQuery);
      
      this.feedbackStats.totalFeedback = result.rows.reduce((sum, row) => sum + parseInt(row.type_count), 0);
      this.feedbackStats.averageRating = result.rows.length > 0 
        ? result.rows.reduce((sum, row) => sum + parseFloat(row.avg_rating || 0), 0) / result.rows.length
        : 0;

      result.rows.forEach(row => {
        this.feedbackStats.feedbackByType.set(row.feedback_type, {
          count: parseInt(row.type_count),
          avgRating: parseFloat(row.avg_rating || 0)
        });
      });

    } catch (error) {
      loggingService.logError('Failed to load feedback stats', error);
    }
  }

  /**
   * Update feedback statistics
   */
  async updateFeedbackStats() {
    await this.loadFeedbackStats();
  }

  /**
   * Update satisfaction trends
   */
  async updateSatisfactionTrends() {
    try {
      const trendsQuery = `
        SELECT 
          DATE(created_at) as date,
          AVG(rating) as avg_rating,
          COUNT(*) as count
        FROM user_satisfaction
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      const result = await dbManager.query(trendsQuery);
      this.feedbackStats.satisfactionTrends = result.rows;

    } catch (error) {
      loggingService.logError('Failed to update satisfaction trends', error);
    }
  }

  /**
   * Send critical feedback alert
   */
  async sendCriticalFeedbackAlert(feedback) {
    try {
      await performanceAlertingService.sendAlert({
        type: 'critical_feedback',
        severity: 'high',
        message: `Critical user feedback received: ${feedback.title}`,
        details: {
          feedbackId: feedback.id,
          feedbackType: feedback.feedback_type,
          rating: feedback.rating,
          priority: feedback.priority,
          userId: feedback.user_id,
          estateId: feedback.estate_id
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      loggingService.logError('Failed to send critical feedback alert', error, {
        feedbackId: feedback.id
      });
    }
  }

  /**
   * Get feedback statistics
   */
  getFeedbackStats() {
    return {
      ...this.feedbackStats,
      feedbackByType: Object.fromEntries(this.feedbackStats.feedbackByType),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get user satisfaction score
   */
  async getUserSatisfactionScore(userId, estateId = null) {
    try {
      let query = `
        SELECT 
          AVG(rating) as avg_rating,
          COUNT(*) as total_ratings,
          category,
          AVG(rating) as category_avg
        FROM user_satisfaction
        WHERE user_id = $1
      `;
      const params = [userId];

      if (estateId) {
        query += ` AND estate_id = $2`;
        params.push(estateId);
      }

      query += ` GROUP BY category`;

      const result = await dbManager.query(query, params);

      const overallQuery = `
        SELECT AVG(rating) as overall_avg, COUNT(*) as total
        FROM user_satisfaction
        WHERE user_id = $1 ${estateId ? 'AND estate_id = $2' : ''}
      `;

      const overallResult = await dbManager.query(overallQuery, params.slice(0, estateId ? 2 : 1));

      return {
        overallScore: parseFloat(overallResult.rows[0].overall_avg || 0),
        totalRatings: parseInt(overallResult.rows[0].total || 0),
        categoryScores: result.rows.map(row => ({
          category: row.category,
          score: parseFloat(row.category_avg),
          count: parseInt(row.total_ratings)
        }))
      };

    } catch (error) {
      loggingService.logError('Failed to get user satisfaction score', error, {
        userId,
        estateId
      });
      throw error;
    }
  }

  /**
   * Shutdown feedback service
   */
  async shutdown() {
    loggingService.logInfo('User feedback service shutdown complete');
  }
}

export default new UserFeedbackService();