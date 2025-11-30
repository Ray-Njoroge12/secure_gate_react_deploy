/**
 * @fileoverview Real-time Visitor Events Hook
 * @description Provides live visitor event updates for dashboards
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import useWebSocket from './useWebSocket';

/**
 * Event types for visitor notifications
 */
export const VISITOR_EVENTS = {
  CHECK_IN: 'visitor.check_in',
  CHECK_OUT: 'visitor.check_out',
  ARRIVAL: 'visitor.arrival',
  APPROVED: 'visitor.approved',
  DENIED: 'visitor.denied',
  INVITED: 'visitor.invited',
  CANCELLED: 'visitor.cancelled',
  REVOKED: 'visitor.revoked',
  SELF_CHECK_IN: 'visitor.self_check_in'
};

/**
 * Custom hook for real-time visitor events
 * @param {Object} options - Configuration options
 * @param {string} options.role - User role (resident, guard, admin)
 * @param {boolean} options.enabled - Whether to enable real-time updates
 * @param {Function} options.onVisitorEvent - Callback for visitor events
 * @param {Function} options.onSecurityAlert - Callback for security alerts
 * @param {boolean} options.showNotifications - Show toast notifications
 * @returns {Object} Real-time visitor state and controls
 */
export function useVisitorEvents({
  role = 'resident',
  enabled = true,
  onVisitorEvent,
  onSecurityAlert,
  showNotifications = true
} = {}) {
  const [recentEvents, setRecentEvents] = useState([]);
  const [liveStats, setLiveStats] = useState({
    todayCheckIns: 0,
    currentlyOnPremises: 0,
    pendingApprovals: 0,
    recentArrivals: 0
  });
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastUpdate, setLastUpdate] = useState(null);
  const eventQueueRef = useRef([]);
  const notificationSound = useRef(null);

  // Initialize notification sound
  useEffect(() => {
    notificationSound.current = new Audio('/sounds/notification.mp3');
    notificationSound.current.volume = 0.5;
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (notificationSound.current) {
      notificationSound.current.currentTime = 0;
      notificationSound.current.play().catch(() => {
        // Silently fail if audio is not allowed
      });
    }
  }, []);

  // Handle incoming visitor event
  const handleVisitorEvent = useCallback((event) => {
    const eventData = {
      ...event,
      id: event.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: event.timestamp || new Date().toISOString(),
      isNew: true
    };

    // Add to recent events
    setRecentEvents(prev => {
      const updated = [eventData, ...prev].slice(0, 50); // Keep last 50 events
      return updated;
    });

    // Update live stats based on event type
    updateLiveStats(event.type);

    // Set last update time
    setLastUpdate(new Date());

    // Play sound for important events
    if (showNotifications && isImportantEvent(event.type)) {
      playNotificationSound();
    }

    // Call external callback
    if (onVisitorEvent) {
      onVisitorEvent(eventData);
    }
  }, [onVisitorEvent, showNotifications, playNotificationSound]);

  // Handle security alerts
  const handleSecurityAlert = useCallback((alert) => {
    playNotificationSound();
    
    if (onSecurityAlert) {
      onSecurityAlert(alert);
    }
  }, [onSecurityAlert, playNotificationSound]);

  // Update live stats based on event type
  const updateLiveStats = useCallback((eventType) => {
    setLiveStats(prev => {
      const updated = { ...prev };
      
      switch (eventType) {
        case VISITOR_EVENTS.CHECK_IN:
        case VISITOR_EVENTS.SELF_CHECK_IN:
          updated.todayCheckIns += 1;
          updated.currentlyOnPremises += 1;
          break;
        case VISITOR_EVENTS.CHECK_OUT:
          updated.currentlyOnPremises = Math.max(0, updated.currentlyOnPremises - 1);
          break;
        case VISITOR_EVENTS.ARRIVAL:
          updated.recentArrivals += 1;
          break;
        case VISITOR_EVENTS.APPROVED:
          updated.pendingApprovals = Math.max(0, updated.pendingApprovals - 1);
          break;
        case VISITOR_EVENTS.DENIED:
          updated.pendingApprovals = Math.max(0, updated.pendingApprovals - 1);
          break;
        case VISITOR_EVENTS.INVITED:
          updated.pendingApprovals += 1;
          break;
        default:
          break;
      }
      
      return updated;
    });
  }, []);

  // Check if event is important enough for sound notification
  const isImportantEvent = useCallback((eventType) => {
    const importantEvents = [
      VISITOR_EVENTS.CHECK_IN,
      VISITOR_EVENTS.ARRIVAL,
      VISITOR_EVENTS.APPROVED,
      VISITOR_EVENTS.DENIED
    ];
    return importantEvents.includes(eventType);
  }, []);

  // WebSocket connection
  const { 
    isConnected, 
    lastMessage, 
    sendMessage,
    connectionState 
  } = useWebSocket({
    url: getWebSocketUrl(role),
    enabled,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
    onOpen: () => setConnectionStatus('connected'),
    onClose: () => setConnectionStatus('disconnected'),
    onError: () => setConnectionStatus('error')
  });

  // Update connection status
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('connected');
    }
  }, [isConnected]);

  // Process incoming WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = typeof lastMessage === 'string' 
          ? JSON.parse(lastMessage) 
          : lastMessage;

        if (data.type && data.type.startsWith('visitor.')) {
          handleVisitorEvent(data);
        } else if (data.type === 'security.alert') {
          handleSecurityAlert(data);
        } else if (data.type === 'stats.update') {
          setLiveStats(prev => ({ ...prev, ...data.stats }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    }
  }, [lastMessage, handleVisitorEvent, handleSecurityAlert]);

  // Clear event "new" flag after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setRecentEvents(prev => 
        prev.map(event => ({ ...event, isNew: false }))
      );
    }, 5000);

    return () => clearTimeout(timer);
  }, [recentEvents]);

  // Fetch initial stats
  useEffect(() => {
    if (enabled) {
      fetchInitialStats();
    }
  }, [enabled]);

  // Fetch initial statistics from API
  const fetchInitialStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setLiveStats(prev => ({
            ...prev,
            todayCheckIns: data.data.todayCheckIns || 0,
            currentlyOnPremises: data.data.onPremises || 0,
            pendingApprovals: data.data.pendingApprovals || 0
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch initial stats:', error);
    }
  };

  // Mark event as read
  const markEventAsRead = useCallback((eventId) => {
    setRecentEvents(prev =>
      prev.map(event =>
        event.id === eventId ? { ...event, isNew: false, read: true } : event
      )
    );
  }, []);

  // Clear all events
  const clearEvents = useCallback(() => {
    setRecentEvents([]);
  }, []);

  // Get unread count
  const unreadCount = recentEvents.filter(e => !e.read).length;

  return {
    // State
    recentEvents,
    liveStats,
    connectionStatus,
    isConnected,
    lastUpdate,
    unreadCount,
    
    // Actions
    markEventAsRead,
    clearEvents,
    refreshStats: fetchInitialStats,
    
    // Send actions via WebSocket
    sendAction: sendMessage
  };
}

/**
 * Get WebSocket URL based on role
 */
function getWebSocketUrl(role) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  // Use SSE fallback URL for broader compatibility
  const baseUrl = `${protocol}//${host}/api/ws`;
  
  switch (role) {
    case 'guard':
      return `${baseUrl}/guards`;
    case 'admin':
      return `${baseUrl}/admins`;
    case 'resident':
    default:
      return `${baseUrl}/residents`;
  }
}

/**
 * Hook for resident-specific visitor events
 */
export function useResidentVisitorEvents(options = {}) {
  return useVisitorEvents({
    ...options,
    role: 'resident'
  });
}

/**
 * Hook for guard-specific visitor events
 */
export function useGuardVisitorEvents(options = {}) {
  return useVisitorEvents({
    ...options,
    role: 'guard'
  });
}

/**
 * Hook for admin-specific visitor events
 */
export function useAdminVisitorEvents(options = {}) {
  return useVisitorEvents({
    ...options,
    role: 'admin'
  });
}

export default useVisitorEvents;
