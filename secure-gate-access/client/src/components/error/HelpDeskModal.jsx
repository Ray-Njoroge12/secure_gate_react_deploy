/**
 * Help Desk Integration Modal
 * 
 * Provides comprehensive support contact options with error context
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Icon from '../ui/Icon';
import Button from '../ui/Button';
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
    <div className="help-desk-modal-overlay" onClick={onClose} role="presentation" aria-hidden="true" tabIndex={-1} onKeyDown={e => e.stopPropagation()}>
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
          <Button
            variant="ghost"
            size="sm"
            className="help-desk-modal__close"
            onClick={onClose}
            aria-label="Close help desk modal"
          >
            <Icon name="x" className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="help-desk-modal__tabs" role="tablist">
          <Button
            variant={activeTab === 'contact' ? 'primary' : 'ghost'}
            size="sm"
            className={`help-desk-modal__tab ${activeTab === 'contact' ? 'help-desk-modal__tab--active' : ''}`}
            onClick={() => setActiveTab('contact')}
            role="tab"
            aria-selected={activeTab === 'contact'}
          >
            Contact Options
          </Button>
          <Button
            variant={activeTab === 'form' ? 'primary' : 'ghost'}
            size="sm"
            className={`help-desk-modal__tab ${activeTab === 'form' ? 'help-desk-modal__tab--active' : ''}`}
            onClick={() => setActiveTab('form')}
            role="tab"
            aria-selected={activeTab === 'form'}
          >
            Report Issue
          </Button>
          {error && (
            <Button
              variant={activeTab === 'error' ? 'primary' : 'ghost'}
              size="sm"
              className={`help-desk-modal__tab ${activeTab === 'error' ? 'help-desk-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('error')}
              role="tab"
              aria-selected={activeTab === 'error'}
            >
              Error Details
            </Button>
          )}
        </div>

        <div className="help-desk-modal__content">
          {activeTab === 'contact' && (
            <div className="help-desk-modal__contact">
              <div className="help-desk-modal__contact-grid">
                <div role="button" tabIndex={0} className="help-desk-modal__contact-option" onClick={handleEmailSupport} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEmailSupport(); } }} aria-label="Contact via email support">
                  <div className="help-desk-modal__contact-icon">
                    <Icon name="mail" className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div className="help-desk-modal__contact-info">
                    <h3>Email Support</h3>
                    <p>{options.email}</p>
                    <span className="help-desk-modal__contact-meta">
                      {options.responseTime}
                    </span>
                  </div>
                </div>

                <div role="button" tabIndex={0} className="help-desk-modal__contact-option" onClick={handlePhoneSupport} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePhoneSupport(); } }} aria-label="Contact via phone support">
                  <div className="help-desk-modal__contact-icon">
                    <Icon name="phone" className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div className="help-desk-modal__contact-info">
                    <h3>Phone Support</h3>
                    <p>{options.phone}</p>
                    <span className="help-desk-modal__contact-meta">
                      {options.hoursOfOperation}
                    </span>
                  </div>
                </div>

                <div role="button" tabIndex={0} className="help-desk-modal__contact-option" onClick={handleChatSupport} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleChatSupport(); } }} aria-label="Contact via live chat">
                  <div className="help-desk-modal__contact-icon">
                    <Icon name="message-circle" className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div className="help-desk-modal__contact-info">
                    <h3>Live Chat</h3>
                    <p>Chat with our support team</p>
                    <span className="help-desk-modal__contact-meta">
                      Available during business hours
                    </span>
                  </div>
                </div>

                <div role="button" tabIndex={0} className="help-desk-modal__contact-option" onClick={handleTicketSupport} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTicketSupport(); } }} aria-label="Create a support ticket">
                  <div className="help-desk-modal__contact-icon">
                    <Icon name="file-text" className="w-6 h-6" aria-hidden="true" />
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
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Send via Email
                </Button>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="help-desk-modal__copy-button"
                    onClick={handleCopyErrorDetails}
                    title="Copy error details to clipboard"
                  >
                    {copied ? <Icon name="check" className="w-4 h-4" aria-hidden="true" /> : <Icon name="copy" className="w-4 h-4" aria-hidden="true" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
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
                <Button
                  variant="primary"
                  onClick={handleEmailSupport}
                >
                  Email Support with Error Details
                </Button>
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