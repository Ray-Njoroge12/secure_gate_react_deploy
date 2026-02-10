import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collaborationService } from '../../services/collaborationService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import './MessagingSystem.css';
import Button from '../ui/Button';

const MessagingSystem = ({ className = '' }) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('inbox');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isComposing, setIsComposing] = useState(false);
  const [messageFilters, setMessageFilters] = useState({
    type: 'received',
    status: null,
    page: 1,
    limit: 20
  });

  // Fetch messages
  const { 
    data: messagesData, 
    isLoading: messagesLoading, 
    error: messagesError 
  } = useQuery({
    queryKey: ['messages', messageFilters],
    queryFn: () => collaborationService.getMessages(messageFilters),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: collaborationService.sendMessage,
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
      setIsComposing(false);
      showNotification('Message sent successfully', 'success');
    },
    onError: (error) => {
      showNotification(error.message || 'Failed to send message', 'error');
    }
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: collaborationService.markMessageAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
    }
  });

  const messages = messagesData?.messages || [];

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedMessage(null);
    
    const newFilters = { ...messageFilters, page: 1 };
    
    switch (tab) {
      case 'inbox':
        newFilters.type = 'received';
        break;
      case 'sent':
        newFilters.type = 'sent';
        break;
      case 'all':
        newFilters.type = 'all';
        break;
      default:
        newFilters.type = 'received';
    }
    
    setMessageFilters(newFilters);
  };

  const handleMessageSelect = (message) => {
    setSelectedMessage(message);
    
    // Mark as read if it's a received message and not already read
    if (message.recipient_id === user.id && message.status !== 'read') {
      markAsReadMutation.mutate(message.id);
    }
  };

  const handleCompose = () => {
    setIsComposing(true);
    setSelectedMessage(null);
  };

  const handleReply = (message) => {
    setIsComposing(true);
    setSelectedMessage({
      ...message,
      isReply: true,
      originalSubject: message.subject,
      originalSender: message.sender_username
    });
  };

  if (messagesError) {
    return (
      <div className={`messaging-system error ${className}`}>
        <div className="error-message">
          <h3>Unable to load messages</h3>
          <p>{messagesError.message}</p>
          <Button 
            onClick={() => queryClient.invalidateQueries(['messages'])}
            className="retry-button"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`messaging-system ${className}`}>
      <div className="messaging-header">
        <h2>Messages</h2>
        <Button 
          onClick={handleCompose}
          className="compose-button primary"
          disabled={sendMessageMutation.isPending}
        >
          <span className="icon">✉️</span>
          Compose
        </Button>
      </div>

      <div className="messaging-tabs">
        <Button
          className={`tab ${activeTab === 'inbox' ? 'active' : ''}`}
          onClick={() => handleTabChange('inbox')}
        >
          Inbox
          {messages.filter(m => m.recipient_id === user.id && m.status !== 'read').length > 0 && (
            <span className="unread-count">
              {messages.filter(m => m.recipient_id === user.id && m.status !== 'read').length}
            </span>
          )}
        </Button>
        <Button
          className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => handleTabChange('sent')}
        >
          Sent
        </Button>
        <Button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          All Messages
        </Button>
      </div>

      <div className="messaging-content">
        <div className="message-list">
          {messagesLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No messages</h3>
              <p>
                {activeTab === 'inbox' 
                  ? "You don't have any messages in your inbox."
                  : activeTab === 'sent'
                  ? "You haven't sent any messages yet."
                  : "No messages found."
                }
              </p>
            </div>
          ) : (
            <div className="message-items">
              {messages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  currentUser={user}
                  isSelected={selectedMessage?.id === message.id}
                  onClick={() => handleMessageSelect(message)}
                  onReply={() => handleReply(message)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="message-detail">
          {isComposing ? (
            <ComposeMessage
              replyTo={selectedMessage?.isReply ? selectedMessage : null}
              onSend={(messageData) => sendMessageMutation.mutate(messageData)}
              onCancel={() => {
                setIsComposing(false);
                setSelectedMessage(null);
              }}
              isLoading={sendMessageMutation.isPending}
            />
          ) : selectedMessage ? (
            <MessageDetail
              message={selectedMessage}
              currentUser={user}
              onReply={() => handleReply(selectedMessage)}
            />
          ) : (
            <div className="no-selection">
              <div className="no-selection-icon">💬</div>
              <h3>Select a message</h3>
              <p>Choose a message from the list to view its contents.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MessageItem = ({ message, currentUser, isSelected, onClick, onReply }) => {
  const isReceived = message.recipient_id === currentUser.id;
  const isUnread = isReceived && message.status !== 'read';
  const displayName = isReceived ? message.sender_username : message.recipient_username;
  const displayRole = isReceived ? message.sender_role : message.recipient_role;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div 
      className={`message-item ${isSelected ? 'selected' : ''} ${isUnread ? 'unread' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-pressed={isSelected}
    >
      <div className="message-avatar">
        <div className={`avatar ${displayRole}`}>
          {displayName?.charAt(0).toUpperCase()}
        </div>
      </div>
      
      <div className="message-content">
        <div className="message-header">
          <span className="sender-name">{displayName}</span>
          <span className="sender-role">({displayRole})</span>
          <span className="message-time">
            {new Date(message.created_at).toLocaleDateString()}
          </span>
        </div>
        
        <div className="message-subject">
          {message.priority !== 'normal' && (
            <span className={`priority-badge ${message.priority}`}>
              {message.priority.toUpperCase()}
            </span>
          )}
          {message.subject}
        </div>
        
        <div className="message-preview">
          {message.content.substring(0, 100)}
          {message.content.length > 100 && '...'}
        </div>
      </div>

      <div className="message-actions">
        {isUnread && <div className="unread-indicator"></div>}
        <Button
          className="reply-button"
          onClick={(e) => {
            e.stopPropagation();
            onReply();
          }}
          title="Reply"
        >
          ↩️
        </Button>
      </div>
    </div>
  );
};

const MessageDetail = ({ message, currentUser, onReply }) => {
  const isReceived = message.recipient_id === currentUser.id;
  const displayName = isReceived ? message.sender_username : message.recipient_username;
  const displayRole = isReceived ? message.sender_role : message.recipient_role;

  return (
    <div className="message-detail-content">
      <div className="message-detail-header">
        <div className="message-info">
          <h3>{message.subject}</h3>
          <div className="message-meta">
            <span className="from-to">
              {isReceived ? 'From' : 'To'}: {displayName} ({displayRole})
            </span>
            <span className="timestamp">
              {new Date(message.created_at).toLocaleString()}
            </span>
            {message.priority !== 'normal' && (
              <span className={`priority-badge ${message.priority}`}>
                {message.priority.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        
        <div className="message-actions">
          <Button
            onClick={onReply}
            className="reply-button primary"
          >
            Reply
          </Button>
        </div>
      </div>

      <div className="message-body">
        <div className="message-text">
          {message.content.split('\n').map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="message-attachments">
            <h4>Attachments</h4>
            {message.attachments.map((attachment, index) => (
              <div key={index} className="attachment-item">
                <span className="attachment-icon">📎</span>
                <span className="attachment-name">{attachment.name}</span>
                <span className="attachment-size">({attachment.size})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ComposeMessage = ({ replyTo, onSend, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    recipientId: '',
    subject: replyTo ? `Re: ${replyTo.originalSubject}` : '',
    content: replyTo ? `\n\n--- Original Message ---\nFrom: ${replyTo.originalSender}\nSubject: ${replyTo.originalSubject}\n\n${replyTo.content}` : '',
    priority: 'normal',
    messageType: 'direct'
  });

  const [errors, setErrors] = useState({});
  const { data: usersData } = useQuery({
    queryKey: ['users', 'for-messaging'],
    queryFn: () => collaborationService.getAvailableRecipients(),
    staleTime: 300000 // 5 minutes
  });

  const users = usersData?.users || [];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.recipientId) {
      newErrors.recipientId = 'Please select a recipient';
    }
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    if (!formData.content.trim()) {
      newErrors.content = 'Message content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const messageData = {
      ...formData,
      recipientId: parseInt(formData.recipientId),
      parentMessageId: replyTo && !replyTo.isReply ? replyTo.id : null
    };

    onSend(messageData);
  };

  return (
    <div className="compose-message">
      <div className="compose-header">
        <h3>{replyTo ? 'Reply to Message' : 'Compose New Message'}</h3>
        <Button onClick={onCancel} className="close-button" aria-label="Close">×</Button>
      </div>

      <form onSubmit={handleSubmit} className="compose-form">
        <div className="form-group">
          <label htmlFor="recipient">To:</label>
          <select
            id="recipient"
            value={formData.recipientId}
            onChange={(e) => handleInputChange('recipientId', e.target.value)}
            className={errors.recipientId ? 'error' : ''}
            disabled={replyTo && !replyTo.isReply}
          >
            <option value="">Select recipient...</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.username} ({user.role})
              </option>
            ))}
          </select>
          {errors.recipientId && <span className="error-text">{errors.recipientId}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="subject">Subject:</label>
          <input
            type="text"
            id="subject"
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            className={errors.subject ? 'error' : ''}
            placeholder="Enter message subject"
          />
          {errors.subject && <span className="error-text">{errors.subject}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="priority">Priority:</label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="messageType">Type:</label>
            <select
              id="messageType"
              value={formData.messageType}
              onChange={(e) => handleInputChange('messageType', e.target.value)}
            >
              <option value="direct">Direct Message</option>
              <option value="workflow">Workflow Related</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="content">Message:</label>
          <textarea
            id="content"
            value={formData.content}
            onChange={(e) => handleInputChange('content', e.target.value)}
            className={errors.content ? 'error' : ''}
            placeholder="Enter your message"
            rows={10}
          />
          {errors.content && <span className="error-text">{errors.content}</span>}
        </div>

        <div className="form-actions">
          <Button
            type="button"
            onClick={onCancel}
            className="cancel-button"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="send-button primary"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Message'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MessagingSystem;