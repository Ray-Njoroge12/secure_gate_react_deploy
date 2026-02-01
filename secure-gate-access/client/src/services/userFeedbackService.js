/**
 * User Feedback Service - Client
 * Handles feedback submission and satisfaction tracking
 */

import apiClient from '../utils/apiClient.js';

class UserFeedbackService {
  constructor() {
    this.baseUrl = '/api/feedback';
  }

  /**
   * Submit user feedback
   */
  async submitFeedback(feedbackData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/submit`, feedbackData);
      return response.data;
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw new Error(`Failed to submit feedback: ${error.message}`);
    }
  }

  /**
   * Submit satisfaction rating
   */
  async submitSatisfactionRating(satisfactionData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/satisfaction`, satisfactionData);
      return response.data;
    } catch (error) {
      console.error('Failed to submit satisfaction rating:', error);
      throw new Error(`Failed to submit satisfaction rating: ${error.message}`);
    }
  }

  /**
   * Get user feedback
   */
  async getFeedback(filters = {}) {
    try {
      const response = await apiClient.get(`${this.baseUrl}`, { params: filters });
      return response.data;
    } catch (error) {
      console.error('Failed to get feedback:', error);
      throw new Error(`Failed to get feedback: ${error.message}`);
    }
  }

  /**
   * Get feedback analytics
   */
  async getFeedbackAnalytics(filters = {}) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/analytics`, { params: filters });
      return response.data;
    } catch (error) {
      console.error('Failed to get feedback analytics:', error);
      throw new Error(`Failed to get feedback analytics: ${error.message}`);
    }
  }

  /**
   * Update feedback status
   */
  async updateFeedbackStatus(feedbackId, status, resolution = null) {
    try {
      const response = await apiClient.put(`${this.baseUrl}/${feedbackId}/status`, {
        status,
        resolution
      });
      return response.data;
    } catch (error) {
      console.error('Failed to update feedback status:', error);
      throw new Error(`Failed to update feedback status: ${error.message}`);
    }
  }

  /**
   * Get user satisfaction score
   */
  async getUserSatisfactionScore(userId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/satisfaction/score/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get satisfaction score:', error);
      throw new Error(`Failed to get satisfaction score: ${error.message}`);
    }
  }

  /**
   * Track page satisfaction
   */
  async trackPageSatisfaction(pageContext, rating, feedbackText = null) {
    try {
      const satisfactionData = {
        category: 'overall_experience',
        rating,
        feedbackText,
        pageContext,
        sessionId: this.getSessionId(),
        metadata: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      };

      return await this.submitSatisfactionRating(satisfactionData);
    } catch (error) {
      console.error('Failed to track page satisfaction:', error);
      throw error;
    }
  }

  /**
   * Track feature satisfaction
   */
  async trackFeatureSatisfaction(featureName, rating, feedbackText = null) {
    try {
      const satisfactionData = {
        category: 'feature_completeness',
        rating,
        feedbackText,
        featureContext: featureName,
        sessionId: this.getSessionId(),
        metadata: {
          feature: featureName,
          timestamp: new Date().toISOString()
        }
      };

      return await this.submitSatisfactionRating(satisfactionData);
    } catch (error) {
      console.error('Failed to track feature satisfaction:', error);
      throw error;
    }
  }

  /**
   * Get session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('feedback_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('feedback_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Show feedback prompt
   */
  showFeedbackPrompt(type = 'general_feedback', context = {}) {
    // This would trigger the feedback modal
    const event = new CustomEvent('showFeedbackModal', {
      detail: { type, context }
    });
    window.dispatchEvent(event);
  }

  /**
   * Show satisfaction rating prompt
   */
  showSatisfactionPrompt(context = {}) {
    const event = new CustomEvent('showSatisfactionPrompt', {
      detail: { context }
    });
    window.dispatchEvent(event);
  }
}

export const userFeedbackService = new UserFeedbackService();