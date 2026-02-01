/**
 * Help Desk Integration Modal
 * 
 * Provides comprehensive support contact options with error context
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, Mail, Phone, MessageCircle, FileText, Copy, Check } from 'lucide-react';
import './HelpDeskModal.css';

const HelpDeskModal = ({
  isOpen = false,
  onClose,
  error = null,
  supportOptions = {},
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('contact');
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    category: 'general'
  });

  const defaultSupportOptions = {
    email: 'support@secure-gate.app',
    phone: '+254-700-000-000',
    chatUrl: '/support/chat',
    ticketUrl: '/support/ticket',
    hoursOfOperation: 'Monday - Friday, 8:00 AM - 6:00 PM EAT',
    responseTime: 'Within 24 hours for standard issues'
  };

  const options = { ...defaultSupportOptions, ...supportOptions };

  useEffect(() => {
    if (error && isOpen) {
      setFormData(prev => ({
        ...prev,
        subject: `Error Report: ${error.category || 'System Error'}`,
        description: `I encountered an error while using the system.\n\nError Details:\n- Error ID: ${error.id || 'N/A'}\n- Category: ${error.category || 'Unknown'}\n- Message: ${error.message || 'No message available'}\n- Timestamp: ${error.timestamp || new Date().toISOString()}\n\nWhat I was doing when this error occurred:\n\n`
      }));
    }
  }, [error, isOpen]);

  const handleCopyErrorDetails = async () => {
    if (!error) return;

    const errorDetails = {
      errorId: error.id,
      category: error.category,
      message: error.message,
      timestamp: error.timestamp,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  const handleEmailSupport = () => {
    const subject = encodeURIComponent(formData.subject || 'Support Request - Secure Gate Access');
    const body = encodeURIComponent(formData.description || 'Please describe your issue here...');
    const mailtoUrl = `mailto:${options.email}?subject=${subject}&body=${body}`;
    window.open(mailtoUrl);
  };

  const handlePhoneSupport = () => {
    window.open(`tel:${options.phone}`);
  };

  const handleChatSupport = () => {
    if (options.chatUrl.startsWith('http')) {
      window.open(options.chatUrl, '_blank');
    } else {
      window.location.href = options.chatUrl;
    }
  };

  const handleTicketSupport = () => {
    if (options.ticketUrl.startsWith('http')) {
      window.open(options.ticketUrl, '_blank');
    } else {
      window.location.href = options.ticketUrl;
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    // For now, redirect to email with form data
    handleEmailSupport();
  };

  if (!isOpen) return null;

  return (
    <div className="help-desk-modal-overlay" onClick={onClose}>
      <div 
        className={`help-desk-modal ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="help-desk-title"
        aria-modal="true"
      >
        <div className="help-desk-modal__header">
          <h2 id="help-desk-title" className="help-desk-modal__title">
            Get Help & Support
          </h2>
          <button
            className="help-desk-modal__close"
            onClick={onClose}
            aria-label="Close help desk modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="help-desk-modal__tabs">
          <button
            className={`help-desk-modal__tab ${activeTab === 'contact' ? 'help-desk-modal__tab--active' : ''}`}
            onClick={() => setActiveTab('contact')}
          >
            Contact Options
          </button>
          <button
            className={`help-desk-modal__tab ${activeTab === 'form' ? 'help-desk-modal__tab--active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
            Report Issue
          </button>
          {error && (
            <button
              className={`help-desk-modal__tab ${activeTab === 'error' ? 'help-desk-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('error')}
            >
              Error Details
            </button>
          )}
        </div>

        <div className="help-desk-modal__content">
          {activeTab === 'contact' && (
            <div className="help-desk-modal__contact">
              <div className="help-desk-modal__contact-grid">
                <div className="help-desk-modal__contact-option" onClick={handleEmailSupport}>
                  <div className="help-desk-modal__contact-icon">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div className="help-desk-modal__contact-info">
                    <h3>Email Support</h3>
                    <p>{options.email}</p>
                    <span className="help-desk-modal__contact-meta">
                      {options.responseTime}
                    </span>
                  </div>
                </div>

                <div className="help-desk-modal__contact-option" onClick={handlePhoneSupport}>
                  <div className="help-desk-modal__contact-icon">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div className="help-desk-modal__contact-info">
                    <h3>Phone Support</h3>
                    <p>{options.phone}</p>
                    <span className="help-desk-modal__contact-meta">
                      {options.hoursOfOperation}
                    </span>
                  </div>
                </div>

                <div className="help-desk-modal__contact-option" onClick={handleChatSupport}>
                  <div className="help-desk-modal__contact-icon">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div className="help-desk-modal__contact-info">
                    <h3>Live Chat</h3>
                    <p>Chat with our support team</p>
                    <span className="help-desk-modal__contact-meta">
                      Available during business hours
                    </span>
                  </div>
                </div>

                <div className="help-desk-modal__contact-option" onClick={handleTicketSupport}>
                  <div className="help-desk-modal__contact-icon">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="help-desk-modal__contact-info">
                    <h3>Support Ticket</h3>
                    <p>Create a detailed support request</p>
                    <span className="help-desk-modal__contact-meta">
                      For complex issues
                    </span>
                  </div>
                </div>
              </div>

              <div className="help-desk-modal__info">
                <h4>Before contacting support:</h4>
                <ul>
                  <li>Try refreshing the page or clearing your browser cache</li>
                  <li>Check if the issue persists in an incognito/private window</li>
                  <li>Note what you were doing when the error occurred</li>
                  <li>Include any error messages or codes you see</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'form' && (
            <form className="help-desk-modal__form" onSubmit={handleFormSubmit}>
              <div className="help-desk-modal__form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief description of the issue"
                  required
                />
              </div>

              <div className="help-desk-modal__form-row">
                <div className="help-desk-modal__form-group">
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="general">General Issue</option>
                    <option value="login">Login Problem</option>
                    <option value="visitor">Visitor Management</option>
                    <option value="permissions">Permissions</option>
                    <option value="performance">Performance Issue</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                  </select>
                </div>

                <div className="help-desk-modal__form-group">
                  <label htmlFor="priority">Priority</label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="help-desk-modal__form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Please provide detailed information about the issue..."
                  rows={6}
                  required
                />
              </div>

              <div className="help-desk-modal__form-actions">
                <button type="button" onClick={onClose} className="help-desk-modal__button--secondary">
                  Cancel
                </button>
                <button type="submit" className="help-desk-modal__button--primary">
                  Send via Email
                </button>
              </div>
            </form>
          )}

          {activeTab === 'error' && error && (
            <div className="help-desk-modal__error">
              <div className="help-desk-modal__error-summary">
                <h4>Error Summary</h4>
                <div className="help-desk-modal__error-item">
                  <strong>Error ID:</strong> {error.id || 'N/A'}
                </div>
                <div className="help-desk-modal__error-item">
                  <strong>Category:</strong> {error.category || 'Unknown'}
                </div>
                <div className="help-desk-modal__error-item">
                  <strong>Message:</strong> {error.message || 'No message available'}
                </div>
                <div className="help-desk-modal__error-item">
                  <strong>Timestamp:</strong> {error.timestamp ? new Date(error.timestamp).toLocaleString() : 'N/A'}
                </div>
              </div>

              <div className="help-desk-modal__error-details">
                <div className="help-desk-modal__error-header">
                  <h4>Technical Details</h4>
                  <button
                    className="help-desk-modal__copy-button"
                    onClick={handleCopyErrorDetails}
                    title="Copy error details to clipboard"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="help-desk-modal__error-code">
                  {JSON.stringify({
                    errorId: error.id,
                    category: error.category,
                    message: error.message,
                    timestamp: error.timestamp,
                    userAgent: navigator.userAgent,
                    url: window.location.href
                  }, null, 2)}
                </pre>
              </div>

              <div className="help-desk-modal__error-actions">
                <p>Include these details when contacting support for faster resolution.</p>
                <button
                  className="help-desk-modal__button--primary"
                  onClick={handleEmailSupport}
                >
                  Email Support with Error Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

HelpDeskModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  error: PropTypes.object,
  supportOptions: PropTypes.object,
  className: PropTypes.string
};

export default HelpDeskModal;