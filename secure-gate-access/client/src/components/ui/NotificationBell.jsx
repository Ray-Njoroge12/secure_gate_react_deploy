/**
 * @fileoverview Real-time Notification Bell Component
 * @description Displays live notifications with WebSocket integration
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../hooks/useWebSocket';
import { playNotificationTone, supportsNotificationAudio, triggerVisualNotificationFallback } from '../../utils/notificationAudio';

import Icon from './Icon';
import './NotificationBell.css';

/**
 * Notification type icons and colors
 */
const NOTIFICATION_TYPES = {
  visitor_arrival: { icon: 'door-open', color: 'blue', label: 'Visitor Arrival' },
  visitor_checkout: { icon: 'door', color: 'gray', label: 'Visitor Left' },
  visitor_approved: { icon: 'check-circle', color: 'green', label: 'Approved' },
  visitor_denied: { icon: 'x-circle', color: 'red', label: 'Denied' },
  security_alert: { icon: 'shield-alert', color: 'red', label: 'Security Alert' },
  system: { icon: 'bell-ring', color: 'purple', label: 'System' },
  info: { icon: 'info', color: 'blue', label: 'Info' },
  warning: { icon: 'alert-triangle', color: 'yellow', label: 'Warning' },
  success: { icon: 'check-circle', color: 'green', label: 'Success' },
  error: { icon: 'alert-circle', color: 'red', label: 'Error' }
};

/**
 * Format relative time
 */
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Single Notification Item
 */
const NotificationItem = ({ notification, onMarkRead, onDelete, isDark }) => {
  const typeConfig = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.info;
  
  return (
    <div
      className={`notification-item ${notification.read ? 'read' : 'unread'} ${isDark ? 'dark' : ''}`}
      aria-label={`${notification.read ? 'Read' : 'Unread'} notification: ${notification.title || typeConfig.label}. ${notification.message}`}
    >
      <div className={`notification-icon ${typeConfig.color}`}>
        <Icon name={typeConfig.icon} size="sm" aria-hidden="true" />
      </div>
      
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-title">{notification.title || typeConfig.label}</span>
          <span className="notification-time">{formatRelativeTime(notification.timestamp)}</span>
        </div>
        <p className="notification-message">{notification.message}</p>
        {notification.data?.visitorName && (
          <p className="notification-meta">Visitor: {notification.data.visitorName}</p>
        )}
      </div>
      
      <div className="notification-actions">
        {!notification.read && (
          <button
            type="button"
            className="notification-action-btn"
            onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
            title="Mark as read"
            aria-label={`Mark ${notification.title || typeConfig.label} as read`}
          >
            <Icon name="check" className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          className="notification-action-btn delete"
          onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
          title="Delete"
          aria-label={`Delete ${notification.title || typeConfig.label} notification`}
        >
          <Icon name="trash-2" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * NotificationBell Component
 */
const NotificationBell = ({ className = '' }) => {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => supportsNotificationAudio());
  const [localNotifications, setLocalNotifications] = useState([]);
  const bellRef = useRef(null);
  const dropdownRef = useRef(null);

  // WebSocket notifications hook
  const { 
    notifications: wsNotifications, 
    markAsRead, 
    clearAll,
    isConnected 
  } = useNotifications({
    onNotification: useCallback(async (_notification) => {
      if (soundEnabled) {
        const played = await playNotificationTone();
        if (!played) {
          triggerVisualNotificationFallback();
        }
      } else {
        triggerVisualNotificationFallback();
      }
    }, [soundEnabled])
  });

  // Merge WebSocket notifications with local state
  useEffect(() => {
    setLocalNotifications(wsNotifications);
  }, [wsNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        bellRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleMarkRead = useCallback((id) => {
    markAsRead(id);
    setLocalNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, [markAsRead]);

  const handleDelete = useCallback((id) => {
    setLocalNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const handleClearAll = useCallback(() => {
    clearAll();
    setLocalNotifications([]);
  }, [clearAll]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  const unreadLocalCount = localNotifications.filter(n => !n.read).length;

  return (
    <>
      {/* Bell Button */}
      <button
        type="button"
        ref={bellRef}
        data-notification-bell
        className={`notification-bell ${className} ${isDark ? 'dark' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadLocalCount > 0 ? `, ${unreadLocalCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Icon name="bell" className="w-5 h-5" />
        {unreadLocalCount > 0 && (
          <span className="notification-badge" aria-hidden="true">
            {unreadLocalCount > 99 ? '99+' : unreadLocalCount}
          </span>
        )}
        {!isConnected && (
          <span className="notification-offline" title="Disconnected" aria-hidden="true" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className={`notification-dropdown ${isDark ? 'dark' : ''}`}
          style={{
            position: 'fixed',
            top: bellRef.current?.getBoundingClientRect().bottom + 8,
            right: window.innerWidth - bellRef.current?.getBoundingClientRect().right,
          }}
          role="dialog"
          aria-modal="false"
          aria-label="Notifications"
        >
          {/* Header */}
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
            <div className="notification-header-actions">
              <button
                type="button"
                onClick={toggleSound}
                className="notification-header-btn"
                title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                aria-label={soundEnabled ? 'Mute notification sounds' : 'Enable notification sounds'}
              >
                {soundEnabled ? <Icon name="volume-2" className="w-4 h-4" /> : <Icon name="volume-x" className="w-4 h-4" />}
              </button>
              {localNotifications.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="notification-header-btn"
                    title="Mark all as read"
                    aria-label="Mark all notifications as read"
                  >
                    <Icon name="check-check" className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="notification-header-btn"
                    title="Clear all"
                    aria-label="Clear all notifications"
                  >
                    <Icon name="trash-2" className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="notification-header-btn close"
                aria-label="Close notifications"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Connection Status */}
          {/* WebSocket connection status hidden until WebSocket server is implemented */}
          {/* {!isConnected && (
            <div className="notification-connection-warning">
              <span>⚠️ Disconnected - Reconnecting...</span>
            </div>
          )} */}

          {/* Notifications List */}
          <div className="notification-list">
            {localNotifications.length === 0 ? (
              <div className="notification-empty">
                <Icon name="bell" className="w-12 h-12 opacity-30" />
                <p>No notifications yet</p>
                <span>You're all caught up!</span>
              </div>
            ) : (
              localNotifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                  isDark={isDark}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {localNotifications.length > 0 && (
            <div className="notification-dropdown-footer">
              <span>{localNotifications.length} notification{localNotifications.length !== 1 ? 's' : ''}</span>
              {unreadLocalCount > 0 && (
                <span className="unread-count">{unreadLocalCount} unread</span>
              )}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

export default NotificationBell;
