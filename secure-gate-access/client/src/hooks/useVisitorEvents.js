/**
 * @fileoverview Real-time Visitor Events Hook
 * @description Provides live visitor event updates for dashboards
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { playNotificationTone, supportsNotificationAudio } from '../utils/notificationAudio';

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
  const soundEnabledRef = useRef(supportsNotificationAudio());

  // Play notification sound
  const playNotificationSound = useCallback(async () => {
    if (soundEnabledRef.current) {
      await playNotificationTone({ frequency: 784, volume: 0.03 });
    }
  }, []);

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

  // Handle incoming visitor event (with deduplication)
  const handleVisitorEvent = useCallback((event) => {
    const eventData = {
      ...event,
      id: event.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: event.timestamp || new Date().toISOString(),
      isNew: true
    };

    // Deduplicate: build a fingerprint from type + visitor ID + timestamp
    const fingerprint = `${eventData.type}:${eventData.visitorId || eventData.visitor_id || ''}:${eventData.timestamp}`;

    // Add to recent events (with deduplication)
    setRecentEvents(prev => {
      // Check for duplicate by fingerprint or original event ID
      const isDuplicate = prev.some(existing => {
        const existingFingerprint = `${existing.type}:${existing.visitorId || existing.visitor_id || ''}:${existing.timestamp}`;
        return existingFingerprint === fingerprint || (event.id && existing.id === event.id);
      });
      if (isDuplicate) return prev;

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
  }, [isImportantEvent, onVisitorEvent, playNotificationSound, showNotifications, updateLiveStats]);

  // Handle security alerts
  const handleSecurityAlert = useCallback((alert) => {
    playNotificationSound();
    
    if (onSecurityAlert) {
      onSecurityAlert(alert);
    }
  }, [onSecurityAlert, playNotificationSound]);

  const normalizeIncomingEvent = useCallback((event) => {
    if (!event || typeof event !== 'object') {
      return null;
    }

    const baseData = event.data && typeof event.data === 'object' ? event.data : {};
    const rawType = event.type || baseData.type;
    const lowerType = typeof rawType === 'string' ? rawType.toLowerCase() : '';

    let normalizedType = rawType;

    if (lowerType === 'visitor_checkin') {
      normalizedType = event.action === 'checkout' ? VISITOR_EVENTS.CHECK_OUT : VISITOR_EVENTS.CHECK_IN;
    } else if (lowerType === 'visitor_update') {
      normalizedType = event.action === 'checkout' ? VISITOR_EVENTS.CHECK_OUT : VISITOR_EVENTS.CHECK_IN;
    } else if (lowerType === 'new_visitor') {
      normalizedType = VISITOR_EVENTS.ARRIVAL;
    } else if (rawType === 'VISITOR_CHECK_IN') {
      normalizedType = VISITOR_EVENTS.CHECK_IN;
    } else if (rawType === 'VISITOR_CHECK_OUT') {
      normalizedType = VISITOR_EVENTS.CHECK_OUT;
    } else if (rawType === 'VISITOR_INVITE_CREATED') {
      normalizedType = VISITOR_EVENTS.INVITED;
    }

    return {
      ...event,
      ...baseData,
      type: normalizedType,
      timestamp: event.timestamp || baseData.timestamp || new Date().toISOString()
    };
  }, []);

  // WebSocket connection
  const {
    isConnected,
    lastMessage,
    emit,
    connectionState
  } = useWebSocket({
    autoConnect: enabled,
    enabled,
    subscribeDashboard: true,
    subscribeVisitors: ['admin', 'guard', 'super_admin'].includes(role),
    reconnectAttempts: 10,
    reconnectInterval: 3000,
    onConnect: () => setConnectionStatus('connected'),
    onDisconnect: () => setConnectionStatus('disconnected'),
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

        const normalizedEvent = normalizeIncomingEvent(data);

        if (normalizedEvent?.type && normalizedEvent.type.startsWith('visitor.')) {
          handleVisitorEvent(normalizedEvent);
        } else if (normalizedEvent?.type === 'security.alert') {
          handleSecurityAlert(normalizedEvent);
        } else if (normalizedEvent?.type === 'stats.update') {
          setLiveStats(prev => ({ ...prev, ...(normalizedEvent.stats || {}) }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    }
  }, [lastMessage, handleVisitorEvent, handleSecurityAlert, normalizeIncomingEvent]);

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
    sendAction: emit,
    connectionState
  };
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
