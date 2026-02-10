/**
 * Feedback Modal Component
 * In-app feedback collection modal for user satisfaction tracking
 */

import React, { useState } from 'react';
import Icon from '../ui/Icon';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Textarea } from '../ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { userFeedbackService } from '../../services/userFeedbackService';
import { useAuth } from '../../contexts/AuthContext';
import useModalAccessibility from '../../hooks/useModalAccessibility';
import './FeedbackModal.css';

const FeedbackModal = ({ isOpen, onClose, initialType = null, context = {} }) => {
  const { user } = useAuth();
  const { modalRef } = useModalAccessibility(isOpen, onClose);
  const [feedbackType, setFeedbackType] = useState(initialType || '');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState(0);
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const feedbackTypes = [
    { value: 'bug_report', label: 'Bug Report', iconName: 'bug', color: 'red' },
    { value: 'feature_request', label: 'Feature Request', iconName: 'lightbulb', color: 'blue' },
    { value: 'usability_issue', label: 'Usability Issue', iconName: 'alert-triangle', color: 'yellow' },
    { value: 'performance_issue', label: 'Performance Issue', iconName: 'alert-triangle', color: 'orange' },
    { value: 'general_feedback', label: 'General Feedback', iconName: 'message-square', color: 'green' },
    { value: 'satisfaction_rating', label: 'Rate Experience', iconName: 'star', color: 'purple' }
  ];

  const categories = [
    'Dashboard',
    'Visitor Management',
    'User Management',
    'Reports',
    'Settings',
    'Mobile Experience',
    'Performance',
    'Security',
    'Other'
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'gray' },
    { value: 'medium', label: 'Medium', color: 'blue' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'critical', label: 'Critical', color: 'red' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!feedbackType || !description.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackData = {
        userId: user.id,
        estateId: user.estate_id,
        feedbackType,
        category: category || null,
        title: title.trim() || null,
        description: description.trim(),
        rating: rating > 0 ? rating : null,
        priority,
        metadata: {
          ...context,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
      };

      await userFeedbackService.submitFeedback(feedbackData);
      
      setSubmitted(true);
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);

    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Handle error (show toast, etc.)
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFeedbackType(initialType || '');
    setCategory('');
    setTitle('');
    setDescription('');
    setRating(0);
    setPriority('medium');
    setSubmitted(false);
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const renderStarRating = () => {
    return (
      <div className="star-rating">
        <span className="rating-label">Rate your experience:</span>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <Button
              key={star}
              type="button"
              className={`star ${rating >= star ? 'filled' : ''}`}
              onClick={() => setRating(star)}
              aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
            >
              <Icon name="star" className="star-icon" aria-hidden="true" />
            </Button>
          ))}
        </div>
        {rating > 0 && (
          <span className="rating-text">
            {rating === 1 && 'Very Poor'}
            {rating === 2 && 'Poor'}
            {rating === 3 && 'Average'}
            {rating === 4 && 'Good'}
            {rating === 5 && 'Excellent'}
          </span>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div 
      className="feedback-modal-overlay" 
      onClick={handleClose} 
      role="presentation"
      aria-hidden="true"
    >
      <div role="button" tabIndex={0} 
        className="feedback-modal" 
        ref={modalRef} 
        tabIndex={-1} 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true" 
        aria-labelledby="feedback-modal-title"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            handleClose();
          }
        }}
      >
        <Card className="feedback-card">
          <CardHeader className="feedback-header">
            <div className="header-content">
              <h2 id="feedback-modal-title" className="feedback-title">
                {submitted ? 'Thank You!' : 'Share Your Feedback'}
              </h2>
              <Button
                className="close-button"
                onClick={handleClose}
                aria-label="Close feedback modal"
              >
                <Icon name="x" className="close-icon" aria-hidden="true" />
              </Button>
            </div>
            {!submitted && (
              <p className="feedback-subtitle">
                Help us improve your experience by sharing your thoughts
              </p>
            )}
          </CardHeader>

          <CardContent className="feedback-content">
            {submitted ? (
              <div className="success-message">
                <div className="success-icon">
                  <Icon name="send" className="icon" aria-hidden="true" />
                </div>
                <h3>Feedback Submitted Successfully!</h3>
                <p>Thank you for helping us improve. We'll review your feedback and get back to you if needed.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="feedback-form">
                {/* Feedback Type Selection */}
                <div className="form-group">
                  <label className="form-label">What type of feedback is this?</label>
                  <div className="feedback-types">
                    {feedbackTypes.map((type) => {
                      return (
                        <Button
                          key={type.value}
                          type="button"
                          className={`feedback-type-button ${feedbackType === type.value ? 'selected' : ''}`}
                          onClick={() => setFeedbackType(type.value)}
                        >
                          <Icon name={type.iconName} className="type-icon" aria-hidden="true" />
                          <span className="type-label">{type.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {feedbackType && (
                  <>
                    {/* Category Selection */}
                    <div className="form-group">
                      <label className="form-label">Category (Optional)</label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Title */}
                    <div className="form-group">
                      <label className="form-label">
                        Title {feedbackType !== 'satisfaction_rating' && '(Optional)'}
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Brief summary of your feedback"
                        maxLength={200}
                      />
                    </div>

                    {/* Rating for satisfaction */}
                    {feedbackType === 'satisfaction_rating' && renderStarRating()}

                    {/* Description */}
                    <div className="form-group">
                      <label className="form-label">
                        Description <span className="required">*</span>
                      </label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Please provide details about your feedback..."
                        rows={4}
                        maxLength={1000}
                        required
                      />
                      <div className="character-count">
                        {description.length}/1000 characters
                      </div>
                    </div>

                    {/* Priority */}
                    {feedbackType !== 'satisfaction_rating' && (
                      <div className="form-group">
                        <label className="form-label">Priority</label>
                        <div className="priority-options">
                          {priorities.map((p) => (
                            <Button
                              key={p.value}
                              type="button"
                              className={`priority-button ${priority === p.value ? 'selected' : ''}`}
                              onClick={() => setPriority(p.value)}
                            >
                              <Badge variant={p.color}>{p.label}</Badge>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="form-actions">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !description.trim()}
                        className="submit-button"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="spinner" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Icon name="send" className="submit-icon" aria-hidden="true" />
                            Submit Feedback
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeedbackModal;