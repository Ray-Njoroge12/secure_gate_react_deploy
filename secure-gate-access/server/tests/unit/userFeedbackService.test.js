/**
 * Unit Tests for User Feedback Service
 * 
 * Tests in-app feedback collection, user satisfaction tracking,
 * feedback analytics, and satisfaction scoring mechanisms.
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockDbManager = {
  query: jest.fn(),
  pool: {
    connect: jest.fn()
  }
};

const mockLoggingService = {
  logInfo: jest.fn(),
  logError: jest.fn(),
  logAudit: jest.fn()
};

const mockPerformanceAlertingService = {
  sendAlert: jest.fn()
};

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: mockLoggingService
}));

jest.unstable_mockModule('../../src/services/performanceAlertingService.js', () => ({
  default: mockPerformanceAlertingService
}));

const userFeedbackService = (await import('../../src/services/userFeedbackService.js')).default;

describe('User Feedback Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userFeedbackService.feedbackStats = {
      totalFeedback: 0,
      averageRating: 0,
      feedbackByType: new Map(),
      satisfactionTrends: []
    };
  });

  describe('Initialization', () => {
    test('should initialize feedback service successfully', async () => {
      mockDbManager.query.mockResolvedValue({ rows: [] });

      await userFeedbackService.initialize();

      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS user_feedback')
      );
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS user_satisfaction')
      );
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'User feedback service initialized successfully'
      );
    });

    test('should handle initialization errors', async () => {
      const error = new Error('Database error');
      mockDbManager.query.mockRejectedValueOnce(error);

      await expect(userFeedbackService.initialize()).rejects.toThrow('Database error');
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to initialize user feedback service',
        error
      );
    });
  });

  describe('Feedback Tables Creation', () => {
    test('should create feedback and satisfaction tables with indexes', async () => {
      mockDbManager.query.mockResolvedValue({ rows: [] });

      await userFeedbackService.createFeedbackTables();

      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS user_feedback')
      );
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS user_satisfaction')
      );
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS')
      );
    });
  });

  describe('Feedback Submission', () => {
    test('should submit user feedback successfully', async () => {
      const feedbackData = {
        userId: 123,
        estateId: 1,
        feedbackType: 'bug_report',
        category: 'ui_issue',
        title: 'Button not working',
        description: 'The submit button is not responsive',
        rating: 2,
        metadata: { page: '/visitors' },
        priority: 'high'
      };

      const mockFeedback = {
        id: 1,
        ...feedbackData,
        created_at: new Date()
      };

      mockDbManager.query.mockResolvedValueOnce({ rows: [mockFeedback] });
      jest.spyOn(userFeedbackService, 'updateFeedbackStats').mockResolvedValueOnce();
      jest.spyOn(userFeedbackService, 'sendCriticalFeedbackAlert').mockResolvedValueOnce();

      const result = await userFeedbackService.submitFeedback(feedbackData);

      expect(result.id).toBe(1);
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_feedback'),
        [
          123, 1, 'bug_report', 'ui_issue', 'Button not working',
          'The submit button is not responsive', 2, JSON.stringify({ page: '/visitors' }), 'high'
        ]
      );
      expect(mockLoggingService.logAudit).toHaveBeenCalledWith(
        'User feedback submitted',
        'feedback_submit',
        123,
        expect.objectContaining({
          feedbackId: 1,
          feedbackType: 'bug_report',
          rating: 2,
          priority: 'high'
        })
      );
    });

    test('should validate feedback type', async () => {
      const feedbackData = {
        userId: 123,
        estateId: 1,
        feedbackType: 'invalid_type',
        title: 'Test feedback'
      };

      await expect(userFeedbackService.submitFeedback(feedbackData))
        .rejects.toThrow('Invalid feedback type: invalid_type');
    });

    test('should validate rating range', async () => {
      const feedbackData = {
        userId: 123,
        estateId: 1,
        feedbackType: 'general_feedback',
        title: 'Test feedback',
        rating: 6 // Invalid rating
      };

      await expect(userFeedbackService.submitFeedback(feedbackData))
        .rejects.toThrow('Rating must be between 1 and 5');
    });

    test('should send alert for critical feedback', async () => {
      const feedbackData = {
        userId: 123,
        estateId: 1,
        feedbackType: 'bug_report',
        title: 'Critical issue',
        rating: 1,
        priority: 'critical'
      };

      const mockFeedback = { id: 1, ...feedbackData };
      mockDbManager.query.mockResolvedValueOnce({ rows: [mockFeedback] });
      jest.spyOn(userFeedbackService, 'updateFeedbackStats').mockResolvedValueOnce();
      jest.spyOn(userFeedbackService, 'sendCriticalFeedbackAlert').mockResolvedValueOnce();

      await userFeedbackService.submitFeedback(feedbackData);

      expect(userFeedbackService.sendCriticalFeedbackAlert).toHaveBeenCalledWith(mockFeedback);
    });

    test('should handle feedback submission errors', async () => {
      const feedbackData = {
        userId: 123,
        estateId: 1,
        feedbackType: 'bug_report',
        title: 'Test feedback'
      };

      const error = new Error('Database error');
      mockDbManager.query.mockRejectedValueOnce(error);

      await expect(userFeedbackService.submitFeedback(feedbackData)).rejects.toThrow('Database error');
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to submit user feedback',
        error,
        { userId: 123, feedbackType: 'bug_report' }
      );
    });
  });

  describe('Satisfaction Rating Submission', () => {
    test('should submit satisfaction rating successfully', async () => {
      const satisfactionData = {
        userId: 123,
        estateId: 1,
        category: 'overall_experience',
        rating: 4,
        feedbackText: 'Great experience overall',
        sessionId: 'session-123',
        pageContext: '/dashboard',
        featureContext: 'visitor_management',
        metadata: { source: 'popup' }
      };

      const mockSatisfaction = {
        id: 1,
        ...satisfactionData,
        created_at: new Date()
      };

      mockDbManager.query.mockResolvedValueOnce({ rows: [mockSatisfaction] });
      jest.spyOn(userFeedbackService, 'updateSatisfactionTrends').mockResolvedValueOnce();

      const result = await userFeedbackService.submitSatisfactionRating(satisfactionData);

      expect(result.id).toBe(1);
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_satisfaction'),
        [
          123, 1, 'overall_experience', 4, 'Great experience overall',
          'session-123', '/dashboard', 'visitor_management', JSON.stringify({ source: 'popup' })
        ]
      );
      expect(mockLoggingService.logAudit).toHaveBeenCalledWith(
        'User satisfaction rating submitted',
        'satisfaction_rating',
        123,
        expect.objectContaining({
          satisfactionId: 1,
          category: 'overall_experience',
          rating: 4
        })
      );
    });

    test('should validate satisfaction category', async () => {
      const satisfactionData = {
        userId: 123,
        estateId: 1,
        category: 'invalid_category',
        rating: 4
      };

      await expect(userFeedbackService.submitSatisfactionRating(satisfactionData))
        .rejects.toThrow('Invalid satisfaction category: invalid_category');
    });

    test('should validate satisfaction rating range', async () => {
      const satisfactionData = {
        userId: 123,
        estateId: 1,
        category: 'overall_experience',
        rating: 0 // Invalid rating
      };

      await expect(userFeedbackService.submitSatisfactionRating(satisfactionData))
        .rejects.toThrow('Rating must be between 1 and 5');
    });

    test('should handle satisfaction rating errors', async () => {
      const satisfactionData = {
        userId: 123,
        estateId: 1,
        category: 'overall_experience',
        rating: 4
      };

      const error = new Error('Database error');
      mockDbManager.query.mockRejectedValueOnce(error);

      await expect(userFeedbackService.submitSatisfactionRating(satisfactionData))
        .rejects.toThrow('Database error');
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to submit satisfaction rating',
        error,
        { userId: 123, category: 'overall_experience' }
      );
    });
  });

  describe('Feedback Retrieval', () => {
    test('should get feedback with filters and pagination', async () => {
      const filters = {
        userId: 123,
        estateId: 1,
        feedbackType: 'bug_report',
        status: 'open',
        priority: 'high',
        limit: 20,
        offset: 0,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      };

      const mockFeedback = [
        {
          id: 1,
          feedback_type: 'bug_report',
          title: 'Test feedback',
          username: 'testuser',
          user_email: 'test@example.com'
        }
      ];

      mockDbManager.query
        .mockResolvedValueOnce({ rows: mockFeedback })
        .mockResolvedValueOnce({ rows: [{ total: 1 }] });

      const result = await userFeedbackService.getFeedback(filters);

      expect(result.feedback).toEqual(mockFeedback);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.pages).toBe(1);
    });

    test('should handle empty feedback results', async () => {
      mockDbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: 0 }] });

      const result = await userFeedbackService.getFeedback();

      expect(result.feedback).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    test('should handle feedback retrieval errors', async () => {
      const error = new Error('Query failed');
      mockDbManager.query.mockRejectedValueOnce(error);

      await expect(userFeedbackService.getFeedback()).rejects.toThrow('Query failed');
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to get user feedback',
        error,
        {}
      );
    });
  });

  describe('Satisfaction Ratings Retrieval', () => {
    test('should get satisfaction ratings with filters', async () => {
      const filters = {
        userId: 123,
        estateId: 1,
        category: 'overall_experience',
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
        limit: 50,
        offset: 0
      };

      const mockRatings = [
        {
          id: 1,
          category: 'overall_experience',
          rating: 4,
          username: 'testuser',
          user_email: 'test@example.com'
        }
      ];

      mockDbManager.query.mockResolvedValueOnce({ rows: mockRatings });

      const result = await userFeedbackService.getSatisfactionRatings(filters);

      expect(result).toEqual(mockRatings);
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1=1 AND s.user_id = $1 AND s.estate_id = $2'),
        expect.arrayContaining([123, 1])
      );
    });

    test('should handle satisfaction ratings errors', async () => {
      const error = new Error('Query failed');
      mockDbManager.query.mockRejectedValueOnce(error);

      await expect(userFeedbackService.getSatisfactionRatings()).rejects.toThrow('Query failed');
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to get satisfaction ratings',
        error,
        {}
      );
    });
  });

  describe('Feedback Analytics', () => {
    test('should get comprehensive feedback analytics', async () => {
      const filters = { estateId: 1 };

      const mockAnalyticsData = [
        // Feedback by type
        [{ feedback_type: 'bug_report', count: 15, avg_rating: 2.5 }],
        // Feedback by status
        [{ status: 'open', count: 10 }, { status: 'resolved', count: 5 }],
        // Feedback by priority
        [{ priority: 'high', count: 8 }, { priority: 'medium', count: 7 }],
        // Satisfaction by category
        [{ category: 'overall_experience', avg_rating: 4.2, count: 25 }],
        // Satisfaction trends
        [{ date: '2025-01-15', avg_rating: 4.1, count: 12 }],
        // Overall stats
        [{ total_feedback: 20, avg_rating: 3.5, negative_feedback: 5, positive_feedback: 12 }]
      ];

      mockDbManager.query
        .mockResolvedValueOnce({ rows: mockAnalyticsData[0] })
        .mockResolvedValueOnce({ rows: mockAnalyticsData[1] })
        .mockResolvedValueOnce({ rows: mockAnalyticsData[2] })
        .mockResolvedValueOnce({ rows: mockAnalyticsData[3] })
        .mockResolvedValueOnce({ rows: mockAnalyticsData[4] })
        .mockResolvedValueOnce({ rows: mockAnalyticsData[5] });

      const result = await userFeedbackService.getFeedbackAnalytics(filters);

      expect(result.overview).toEqual(mockAnalyticsData[5][0]);
      expect(result.feedbackByType).toEqual(mockAnalyticsData[0]);
      expect(result.feedbackByStatus).toEqual(mockAnalyticsData[1]);
      expect(result.feedbackByPriority).toEqual(mockAnalyticsData[2]);
      expect(result.satisfactionByCategory).toEqual(mockAnalyticsData[3]);
      expect(result.satisfactionTrends).toEqual(mockAnalyticsData[4]);
      expect(result.generatedAt).toBeDefined();
    });

    test('should apply date filters to analytics', async () => {
      const filters = {
        estateId: 1,
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31'
      };

      // Mock all queries to return empty results
      mockDbManager.query.mockResolvedValue({ rows: [] });

      await userFeedbackService.getFeedbackAnalytics(filters);

      // Should apply date filters to all queries
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1=1 AND estate_id = $1 AND created_at >= $2 AND created_at <= $3'),
        [1, '2025-01-01', '2025-01-31']
      );
    });

    test('should handle analytics errors', async () => {
      const error = new Error('Analytics query failed');
      mockDbManager.query.mockRejectedValueOnce(error);

      await expect(userFeedbackService.getFeedbackAnalytics()).rejects.toThrow('Analytics query failed');
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to get feedback analytics',
        error,
        {}
      );
    });
  });

  describe('Feedback Status Management', () => {
    test('should update feedback status successfully', async () => {
      const feedbackId = 1;
      const status = 'resolved';
      const assignedTo = 456;
      const resolution = 'Issue fixed in latest update';

      const mockUpdatedFeedback = {
        id: feedbackId,
        status,
        assigned_to: assignedTo,
        resolved_at: new Date()
      };

      mockDbManager.query.mockResolvedValueOnce({ rows: [mockUpdatedFeedback] });

      const result = await userFeedbackService.updateFeedbackStatus(
        feedbackId, status, assignedTo, resolution
      );

      expect(result.id).toBe(feedbackId);
      expect(result.status).toBe(status);
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_feedback'),
        expect.arrayContaining([feedbackId])
      );
      expect(mockLoggingService.logAudit).toHaveBeenCalledWith(
        'Feedback status updated',
        'feedback_status_update',
        assignedTo,
        expect.objectContaining({
          feedbackId,
          newStatus: status,
          assignedTo
        })
      );
    });

    test('should handle feedback not found', async () => {
      mockDbManager.query.mockResolvedValueOnce({ rows: [] });

      await expect(userFeedbackService.updateFeedbackStatus(999, 'resolved'))
        .rejects.toThrow('Feedback not found');
    });

    test('should handle status update errors', async () => {
      const error = new Error('Update failed');
      mockDbManager.query.mockRejectedValueOnce(error);

      await expect(userFeedbackService.updateFeedbackStatus(1, 'resolved'))
        .rejects.toThrow('Update failed');
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to update feedback status',
        error,
        { feedbackId: 1, status: 'resolved' }
      );
    });
  });

  describe('Statistics Management', () => {
    test('should load feedback statistics', async () => {
      const mockStats = [
        { total_feedback: 50, avg_rating: 3.5, feedback_type: 'bug_report', type_count: 20 },
        { total_feedback: 50, avg_rating: 4.0, feedback_type: 'feature_request', type_count: 30 }
      ];

      mockDbManager.query.mockResolvedValueOnce({ rows: mockStats });

      await userFeedbackService.loadFeedbackStats();

      expect(userFeedbackService.feedbackStats.totalFeedback).toBe(50);
      expect(userFeedbackService.feedbackStats.averageRating).toBe(3.75); // Average of 3.5 and 4.0
      expect(userFeedbackService.feedbackStats.feedbackByType.get('bug_report')).toEqual({
        count: 20,
        avgRating: 3.5
      });
    });

    test('should update satisfaction trends', async () => {
      const mockTrends = [
        { date: '2025-01-15', avg_rating: 4.2, count: 15 },
        { date: '2025-01-14', avg_rating: 4.0, count: 12 }
      ];

      mockDbManager.query.mockResolvedValueOnce({ rows: mockTrends });

      await userFeedbackService.updateSatisfactionTrends();

      expect(userFeedbackService.feedbackStats.satisfactionTrends).toEqual(mockTrends);
    });

    test('should get feedback statistics', () => {
      userFeedbackService.feedbackStats = {
        totalFeedback: 100,
        averageRating: 3.8,
        feedbackByType: new Map([
          ['bug_report', { count: 40, avgRating: 2.5 }],
          ['feature_request', { count: 60, avgRating: 4.5 }]
        ]),
        satisfactionTrends: [{ date: '2025-01-15', avg_rating: 4.0 }]
      };

      const result = userFeedbackService.getFeedbackStats();

      expect(result.totalFeedback).toBe(100);
      expect(result.averageRating).toBe(3.8);
      expect(result.feedbackByType.bug_report).toEqual({ count: 40, avgRating: 2.5 });
      expect(result.lastUpdated).toBeDefined();
    });
  });

  describe('User Satisfaction Scoring', () => {
    test('should get user satisfaction score with category breakdown', async () => {
      const userId = 123;
      const estateId = 1;

      const mockCategoryData = [
        { category: 'overall_experience', category_avg: 4.2, total_ratings: 5 },
        { category: 'ease_of_use', category_avg: 3.8, total_ratings: 3 }
      ];

      const mockOverallData = [
        { overall_avg: 4.0, total: 8 }
      ];

      mockDbManager.query
        .mockResolvedValueOnce({ rows: mockCategoryData })
        .mockResolvedValueOnce({ rows: mockOverallData });

      const result = await userFeedbackService.getUserSatisfactionScore(userId, estateId);

      expect(result.overallScore).toBe(4.0);
      expect(result.totalRatings).toBe(8);
      expect(result.categoryScores).toHaveLength(2);
      expect(result.categoryScores[0]).toEqual({
        category: 'overall_experience',
        score: 4.2,
        count: 5
      });
    });

    test('should handle user with no satisfaction ratings', async () => {
      mockDbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ overall_avg: null, total: 0 }] });

      const result = await userFeedbackService.getUserSatisfactionScore(123);

      expect(result.overallScore).toBe(0);
      expect(result.totalRatings).toBe(0);
      expect(result.categoryScores).toEqual([]);
    });

    test('should handle satisfaction score errors', async () => {
      const error = new Error('Score calculation failed');
      mockDbManager.query.mockRejectedValueOnce(error);

      await expect(userFeedbackService.getUserSatisfactionScore(123))
        .rejects.toThrow('Score calculation failed');
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to get user satisfaction score',
        error,
        { userId: 123, estateId: undefined }
      );
    });
  });

  describe('Critical Feedback Alerting', () => {
    test('should send alert for critical feedback', async () => {
      const feedback = {
        id: 1,
        feedback_type: 'bug_report',
        title: 'Critical system error',
        rating: 1,
        priority: 'critical',
        user_id: 123,
        estate_id: 1
      };

      await userFeedbackService.sendCriticalFeedbackAlert(feedback);

      expect(mockPerformanceAlertingService.sendAlert).toHaveBeenCalledWith({
        type: 'critical_feedback',
        severity: 'high',
        message: 'Critical user feedback received: Critical system error',
        details: {
          feedbackId: 1,
          feedbackType: 'bug_report',
          rating: 1,
          priority: 'critical',
          userId: 123,
          estateId: 1
        },
        timestamp: expect.any(String)
      });
    });

    test('should handle alert sending errors', async () => {
      const feedback = { id: 1, title: 'Test feedback' };
      const error = new Error('Alert failed');
      mockPerformanceAlertingService.sendAlert.mockRejectedValueOnce(error);

      await userFeedbackService.sendCriticalFeedbackAlert(feedback);

      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to send critical feedback alert',
        error,
        { feedbackId: 1 }
      );
    });
  });

  describe('Service Lifecycle', () => {
    test('should shutdown service cleanly', async () => {
      await userFeedbackService.shutdown();

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'User feedback service shutdown complete'
      );
    });
  });

  describe('Feedback Type and Category Validation', () => {
    test('should have all required feedback types', () => {
      const expectedTypes = [
        'bug_report',
        'feature_request',
        'usability_issue',
        'performance_issue',
        'general_feedback',
        'satisfaction_rating'
      ];

      expectedTypes.forEach(type => {
        expect(userFeedbackService.feedbackTypes).toContain(type);
      });
    });

    test('should have all required satisfaction categories', () => {
      const expectedCategories = [
        'overall_experience',
        'ease_of_use',
        'performance',
        'feature_completeness',
        'design_quality',
        'reliability'
      ];

      expectedCategories.forEach(category => {
        expect(userFeedbackService.satisfactionCategories).toContain(category);
      });
    });
  });
});