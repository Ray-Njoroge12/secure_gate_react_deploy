/**
 * @fileoverview WebSocket Hook for Real-time Updates
 * @description React hook for managing WebSocket connections and real-time events
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';

import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const stripApiSuffix = (url) => {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const normalized = url.trim().replace(/\/+$/, '');
  return normalized.replace(/\/api$/i, '');
};

// WebSocket server URL:
// 1) explicit websocket URL
// 2) derive host from API URL
// 3) fallback to current origin (works with dev proxy)
const WS_URL = process.env.REACT_APP_WS_URL
  || stripApiSuffix(process.env.REACT_APP_API_URL)
  || window.location.origin;

const socketPool = new Map();

const buildSocketPoolKey = (socketUrl, authToken) => `${socketUrl}::${authToken || 'cookie-auth'}`;

const EVENT_TYPE_MAP = {
  VISITOR_CHECK_IN: 'visitor.check_in',
  VISITOR_CHECK_OUT: 'visitor.check_out',
  VISITOR_INVITE_CREATED: 'visitor.invited',
  SECURITY_ALERT: 'security.alert',
  METRICS_UPDATE: 'stats.update',
  ACTIVITY_UPDATE: 'activity.update',
  SYSTEM_NOTIFICATION: 'system.notification',
  BULK_INVITE_UPDATE: 'bulk.invite_update'
};

const normalizeEventType = (eventType) => {
  if (!eventType || typeof eventType !== 'string') {
    return null;
  }

  if (EVENT_TYPE_MAP[eventType]) {
    return EVENT_TYPE_MAP[eventType];
  }

  if (eventType.includes('.') || eventType.includes(':')) {
    return eventType;
  }

  return eventType.toLowerCase().replace(/_/g, '.');
};

const normalizeSocketPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const normalizedType = normalizeEventType(payload.type || payload.eventType);
  const baseData = payload.data && typeof payload.data === 'object' ? payload.data : {};

  return {
    ...payload,
    ...baseData,
    type: normalizedType || payload.type || payload.eventType,
    rawType: payload.type || payload.eventType,
    timestamp: payload.timestamp || baseData.timestamp || new Date().toISOString()
  };
};

const toLegacyVisitorEvent = (eventType) => {
  if (typeof eventType !== 'string' || !eventType.startsWith('visitor.')) {
    return null;
  }

  const eventMap = {
    'visitor.check_in': 'visitor:checkin',
    'visitor.check_out': 'visitor:checkout',
    'visitor.invited': 'visitor:new',
    'visitor.approved': 'visitor:approved',
    'visitor.denied': 'visitor:denied'
  };

  if (eventMap[eventType]) {
    return eventMap[eventType];
  }

  return `visitor:${eventType.replace('visitor.', '')}`;
};

// Event types for type safety
export const WS_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  CONNECTION_ESTABLISHED: 'connection:established',

  // Dashboard events
  DASHBOARD_SUBSCRIBE: 'dashboard:subscribe',
  DASHBOARD_SUBSCRIBED: 'dashboard:subscribed',
  DASHBOARD_UPDATE: 'dashboard:update',
  DASHBOARD_STATS: 'dashboard:stats',
  DASHBOARD_REQUEST_STATS: 'dashboard:requestStats',
  DASHBOARD_EVENT: 'dashboard_event',
  ADMIN_EVENT: 'admin_event',
  GUARD_EVENT: 'guard_event',

  // Visitor events
  VISITORS_SUBSCRIBE: 'visitors:subscribe',
  VISITORS_SUBSCRIBED: 'visitors:subscribed',
  VISITOR_EVENT: 'visitor:event',
  VISITOR_CHECKIN: 'visitor:checkin',
  VISITOR_CHECKOUT: 'visitor:checkout',
  VISITOR_NEW: 'visitor:new',
  VISITOR_APPROVED: 'visitor:approved',
  VISITOR_DENIED: 'visitor:denied',
  VISITOR_APPROVAL_REQUEST: 'visitor:approval_request',
  VISITOR_APPROVAL_RESPONSE: 'visitor:approval_response',

  // Notification events
  NOTIFICATION: 'notification',

  // Admin events
  ADMIN_SUBSCRIBE: 'admin:subscribe',
  ADMIN_SUBSCRIBED: 'admin:subscribed',
  USER_CONNECTED: 'user:connected',
  USER_DISCONNECTED: 'user:disconnected',

  // Security events
  SECURITY_ALERT: 'security:alert',
  EMERGENCY_TRIGGERED: 'emergency:triggered',
  EMERGENCY_ACKNOWLEDGED: 'emergency:acknowledged',
  EMERGENCY_RESOLVED: 'emergency:resolved',
  EMERGENCY_CANCELLED: 'emergency:cancelled',

  // Error events
  ERROR: 'error'
};

// Connection states
export const CONNECTION_STATE = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
};

/**
 * useWebSocket Hook
 * 
 * Provides real-time WebSocket functionality for components
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoConnect - Auto-connect on mount (default: true)
 * @param {boolean} options.subscribeDashboard - Auto-subscribe to dashboard updates
 * @param {boolean} options.subscribeVisitors - Auto-subscribe to visitor events
 * @param {boolean} options.subscribeAdmin - Auto-subscribe to admin events (admin only)
 * @param {Function} options.onConnect - Callback when connected
 * @param {Function} options.onDisconnect - Callback when disconnected
 * @param {Function} options.onError - Callback on error
 * @returns {Object} WebSocket state and controls
 */
export function useWebSocket(options = {}) {
  const {
    autoConnect = true,
    enabled: enabledOption,
    url,
    subscribeDashboard = true,
    subscribeVisitors = false,
    subscribeAdmin = false,
    reconnectAttempts: reconnectAttemptsOption = 5,
    reconnectInterval = 1000,
    onConnect,
    onOpen,
    onDisconnect,
    onClose,
    onError
  } = options;

  const { user, token } = useAuth();
  const enabled = enabledOption ?? !!user;
  const socketRef = useRef(null);
  const socketPoolKeyRef = useRef(null);
  const socketListenersRef = useRef([]);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = reconnectAttemptsOption;

  const [connectionState, setConnectionState] = useState(CONNECTION_STATE.DISCONNECTED);
  const [lastMessage, setLastMessage] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [visitorEvents, setVisitorEvents] = useState([]);
  const [error, setError] = useState(null);
  const lifecycleCallbacksRef = useRef({
    onConnect,
    onOpen,
    onDisconnect,
    onClose,
    onError
  });

  // Event listeners registry
  const eventListeners = useRef(new Map());

  useEffect(() => {
    lifecycleCallbacksRef.current = {
      onConnect,
      onOpen,
      onDisconnect,
      onClose,
      onError
    };
  }, [onConnect, onOpen, onDisconnect, onClose, onError]);

  /**
   * Add event listener
   */
  const addEventListener = useCallback((event, callback) => {
    if (!eventListeners.current.has(event)) {
      eventListeners.current.set(event, new Set());
    }
    eventListeners.current.get(event).add(callback);

    // Return cleanup function
    return () => {
      eventListeners.current.get(event)?.delete(callback);
    };
  }, []);

  /**
   * Emit event to all registered listeners
   */
  const emitToListeners = useCallback((event, data) => {
    const listeners = eventListeners.current.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in WebSocket listener for ${event}:`, err);
        }
      });
    }
  }, []);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected || socketRef.current?.active) {
      console.log('WebSocket already connected');
      return;
    }

    const socketUrl = url || WS_URL;
    const authToken = token || '';
    const authPayload = authToken ? { token: authToken } : {};
    const poolKey = buildSocketPoolKey(socketUrl, authToken);
    const pooledEntry = socketPool.get(poolKey);

    if (pooledEntry?.socket) {
      pooledEntry.refCount += 1;
      socketPool.set(poolKey, pooledEntry);
      socketRef.current = pooledEntry.socket;
      socketPoolKeyRef.current = poolKey;
      setConnectionState(
        pooledEntry.socket.connected
          ? CONNECTION_STATE.CONNECTED
          : CONNECTION_STATE.CONNECTING
      );
    } else {
      const socket = io(socketUrl, {
        auth: authPayload,
        transports: ['websocket', 'polling'],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: reconnectInterval,
        reconnectionDelayMax: 5000,
        timeout: 10000
      });

      socketPool.set(poolKey, {
        socket,
        refCount: 1
      });

      socketRef.current = socket;
      socketPoolKeyRef.current = poolKey;
      setConnectionState(CONNECTION_STATE.CONNECTING);
      setError(null);
    }

    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    if (socketListenersRef.current.length > 0) {
      socketListenersRef.current.forEach(({ event, handler }) => {
        socket.off(event, handler);
      });
      socketListenersRef.current = [];
    }

    const localListeners = [];
    const on = (event, handler) => {
      socket.on(event, handler);
      localListeners.push({ event, handler });
    };

    // Connection established
    on(WS_EVENTS.CONNECT, () => {
      console.log('🟢 WebSocket connected');
      setConnectionState(CONNECTION_STATE.CONNECTED);
      reconnectAttemptsRef.current = 0;
      lifecycleCallbacksRef.current.onConnect?.();
      lifecycleCallbacksRef.current.onOpen?.();
      emitToListeners(WS_EVENTS.CONNECT, { connected: true });
    });

    // Connection established with server info
    on(WS_EVENTS.CONNECTION_ESTABLISHED, (data) => {
      console.log('WebSocket connection established:', data);
      setLastMessage(data);

      if (subscribeDashboard) {
        socket.emit(WS_EVENTS.DASHBOARD_SUBSCRIBE);
      }
      if (subscribeVisitors && ['admin', 'guard', 'super_admin'].includes(user?.role)) {
        socket.emit(WS_EVENTS.VISITORS_SUBSCRIBE);
      }
      if (subscribeAdmin && ['admin', 'super_admin'].includes(user?.role)) {
        socket.emit(WS_EVENTS.ADMIN_SUBSCRIBE);
      }
    });

    // Disconnect
    on(WS_EVENTS.DISCONNECT, (reason) => {
      console.log('🔴 WebSocket disconnected:', reason);
      setConnectionState(CONNECTION_STATE.DISCONNECTED);
      lifecycleCallbacksRef.current.onDisconnect?.(reason);
      lifecycleCallbacksRef.current.onClose?.(reason);
      emitToListeners(WS_EVENTS.DISCONNECT, { reason });
    });

    // Connection error
    on(WS_EVENTS.CONNECT_ERROR, (err) => {
      console.error('WebSocket connection error:', err);
      setConnectionState(CONNECTION_STATE.ERROR);
      setError(err.message);
      reconnectAttemptsRef.current++;
      lifecycleCallbacksRef.current.onError?.(err);
      emitToListeners(WS_EVENTS.CONNECT_ERROR, { error: err });
    });

    // Dashboard updates
    on(WS_EVENTS.DASHBOARD_UPDATE, (data) => {
      setDashboardStats(data.data);
      setLastMessage(data);
      emitToListeners(WS_EVENTS.DASHBOARD_UPDATE, data);
    });

    on(WS_EVENTS.DASHBOARD_STATS, (data) => {
      setDashboardStats(data);
      emitToListeners(WS_EVENTS.DASHBOARD_STATS, data);
    });

    // Visitor events
    on(WS_EVENTS.VISITOR_EVENT, (data) => {
      const normalized = normalizeSocketPayload(data) || data;
      setVisitorEvents(prev => [normalized, ...prev].slice(0, 50));
      setLastMessage(normalized);
      emitToListeners(WS_EVENTS.VISITOR_EVENT, normalized);

      if (normalized.type) {
        emitToListeners(normalized.type, normalized);
        const legacyEvent = toLegacyVisitorEvent(normalized.type);
        if (legacyEvent) {
          emitToListeners(legacyEvent, normalized);
        }
      }
    });

    const forwardScopedEvent = (eventName) => (data) => {
      const normalized = normalizeSocketPayload(data) || data;
      setLastMessage(normalized);
      emitToListeners(eventName, normalized);

      if (normalized.type?.startsWith('visitor.')) {
        setVisitorEvents(prev => [normalized, ...prev].slice(0, 50));
        emitToListeners(WS_EVENTS.VISITOR_EVENT, normalized);
      }

      if (normalized.type) {
        emitToListeners(normalized.type, normalized);
        const legacyEvent = toLegacyVisitorEvent(normalized.type);
        if (legacyEvent) {
          emitToListeners(legacyEvent, normalized);
        }
      }
    };

    on(WS_EVENTS.DASHBOARD_EVENT, forwardScopedEvent(WS_EVENTS.DASHBOARD_EVENT));
    on(WS_EVENTS.ADMIN_EVENT, forwardScopedEvent(WS_EVENTS.ADMIN_EVENT));
    on(WS_EVENTS.GUARD_EVENT, forwardScopedEvent(WS_EVENTS.GUARD_EVENT));

    // Notifications
    on(WS_EVENTS.NOTIFICATION, (data) => {
      setNotifications(prev => [data, ...prev].slice(0, 100));
      emitToListeners(WS_EVENTS.NOTIFICATION, data);
    });

    // Security alerts
    on(WS_EVENTS.SECURITY_ALERT, (data) => {
      emitToListeners(WS_EVENTS.SECURITY_ALERT, data);
    });

    // Approval request from guard → resident notification
    on(WS_EVENTS.VISITOR_APPROVAL_REQUEST, (data) => {
      const visitorData = data?.data || {};
      const notification = {
        id: `approval_req_${visitorData.visitor_id || Date.now()}`,
        type: 'visitor_arrival',
        title: 'Approval Required',
        message: `${visitorData.name || 'A visitor'} is at the gate and needs your approval`,
        timestamp: data?.timestamp || new Date().toISOString(),
        read: false,
        data: visitorData
      };
      setNotifications(prev => [notification, ...prev].slice(0, 100));
      emitToListeners(WS_EVENTS.VISITOR_APPROVAL_REQUEST, data);
      emitToListeners(WS_EVENTS.NOTIFICATION, notification);
    });

    // Approval response from resident → guard notification
    on(WS_EVENTS.VISITOR_APPROVAL_RESPONSE, (data) => {
      const responseData = data?.data || {};
      const approved = responseData.status === 'approved';
      const notification = {
        id: `approval_resp_${responseData.visitor_id || Date.now()}`,
        type: approved ? 'visitor_approved' : 'visitor_denied',
        title: approved ? 'Visitor Approved' : 'Visitor Denied',
        message: `${responseData.responded_by || 'Resident'} has ${responseData.status} entry`,
        timestamp: data?.timestamp || new Date().toISOString(),
        read: false,
        data: responseData
      };
      setNotifications(prev => [notification, ...prev].slice(0, 100));
      emitToListeners(WS_EVENTS.VISITOR_APPROVAL_RESPONSE, data);
      emitToListeners(WS_EVENTS.NOTIFICATION, notification);
    });

    const forwardEmergencyEvent = (eventName) => (data) => {
      const normalized = {
        ...(data || {}),
        type: eventName.replace(/:/g, '.'),
        timestamp: data?.timestamp || new Date().toISOString()
      };
      setLastMessage(normalized);
      emitToListeners(eventName, normalized);
      emitToListeners(normalized.type, normalized);
    };

    on(WS_EVENTS.EMERGENCY_TRIGGERED, forwardEmergencyEvent(WS_EVENTS.EMERGENCY_TRIGGERED));
    on(WS_EVENTS.EMERGENCY_ACKNOWLEDGED, forwardEmergencyEvent(WS_EVENTS.EMERGENCY_ACKNOWLEDGED));
    on(WS_EVENTS.EMERGENCY_RESOLVED, forwardEmergencyEvent(WS_EVENTS.EMERGENCY_RESOLVED));
    on(WS_EVENTS.EMERGENCY_CANCELLED, forwardEmergencyEvent(WS_EVENTS.EMERGENCY_CANCELLED));

    // User connection events (admin only)
    on(WS_EVENTS.USER_CONNECTED, (data) => {
      emitToListeners(WS_EVENTS.USER_CONNECTED, data);
    });

    on(WS_EVENTS.USER_DISCONNECTED, (data) => {
      emitToListeners(WS_EVENTS.USER_DISCONNECTED, data);
    });

    // Error events
    on(WS_EVENTS.ERROR, (data) => {
      console.error('WebSocket error event:', data);
      setError(data.message);
      emitToListeners(WS_EVENTS.ERROR, data);
    });

    socketListenersRef.current = localListeners;
  }, [url, token, user?.role, subscribeDashboard, subscribeVisitors, subscribeAdmin,
    maxReconnectAttempts, reconnectInterval, emitToListeners]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      const socket = socketRef.current;

      socketListenersRef.current.forEach(({ event, handler }) => {
        socket.off(event, handler);
      });
      socketListenersRef.current = [];

      const poolKey = socketPoolKeyRef.current;
      const pooledEntry = poolKey ? socketPool.get(poolKey) : null;

      if (pooledEntry && pooledEntry.socket === socket) {
        pooledEntry.refCount = Math.max(0, pooledEntry.refCount - 1);
        if (pooledEntry.refCount === 0) {
          pooledEntry.socket.disconnect();
          socketPool.delete(poolKey);
        } else {
          socketPool.set(poolKey, pooledEntry);
        }
      } else {
        socket.disconnect();
      }

      socketRef.current = null;
      socketPoolKeyRef.current = null;
      setConnectionState(CONNECTION_STATE.DISCONNECTED);
    }
  }, []);

  /**
   * Emit event to server
   */
  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Cannot emit event: WebSocket not connected');
    }
  }, []);

  /**
   * Subscribe to dashboard updates
   */
  const subscribeToDashboard = useCallback(() => {
    emit(WS_EVENTS.DASHBOARD_SUBSCRIBE);
  }, [emit]);

  /**
   * Subscribe to visitor events
   */
  const subscribeToVisitors = useCallback(() => {
    emit(WS_EVENTS.VISITORS_SUBSCRIBE);
  }, [emit]);

  /**
   * Subscribe to admin events
   */
  const subscribeToAdmin = useCallback(() => {
    emit(WS_EVENTS.ADMIN_SUBSCRIBE);
  }, [emit]);

  /**
   * Request current dashboard stats
   */
  const requestDashboardStats = useCallback(() => {
    emit(WS_EVENTS.DASHBOARD_REQUEST_STATS);
  }, [emit]);

  /**
   * Clear notifications
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Mark notification as read
   */
  const markNotificationRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  /**
   * Clear visitor events
   */
  const clearVisitorEvents = useCallback(() => {
    setVisitorEvents([]);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, enabled, connect, disconnect]);

  // Computed values
  const isConnected = connectionState === CONNECTION_STATE.CONNECTED;
  const isConnecting = connectionState === CONNECTION_STATE.CONNECTING;
  const unreadNotifications = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  /**
   * Merge external notifications (bulk add)
   */
  const mergeNotifications = useCallback((newNotifications) => {
    setNotifications(prev => {
      // Avoid duplicates
      const existingIds = new Set(prev.map(n => n.id));
      const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id));
      if (uniqueNew.length === 0) return prev;
      return [...uniqueNew, ...prev].sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp)).slice(0, 100);
    });
  }, []);

  return {
    // State
    connectionState,
    isConnected,
    isConnecting,
    error,
    lastMessage,
    dashboardStats,
    notifications,
    unreadNotifications,
    visitorEvents,

    // Actions
    connect,
    disconnect,
    emit,
    sendMessage: emit,
    addEventListener,
    subscribeToDashboard,
    subscribeToVisitors,
    subscribeToAdmin,
    requestDashboardStats,
    clearNotifications,
    mergeNotifications, // Added
    markNotificationRead,
    clearVisitorEvents,

    // Socket reference (for advanced usage)
    socket: socketRef.current
  };
}

/**
 * useVisitorEvents Hook
 * 
 * Simplified hook specifically for visitor events
 */
export function useVisitorEvents(options = {}) {
  const { onCheckIn, onCheckOut, onNewVisitor, onApproval, onDenial } = options;

  const ws = useWebSocket({
    subscribeVisitors: true,
    ...options
  });

  // Set up event listeners
  useEffect(() => {
    const cleanups = [];

    if (onCheckIn) {
      cleanups.push(ws.addEventListener('visitor:checkin', onCheckIn));
    }
    if (onCheckOut) {
      cleanups.push(ws.addEventListener('visitor:checkout', onCheckOut));
    }
    if (onNewVisitor) {
      cleanups.push(ws.addEventListener('visitor:new', onNewVisitor));
    }
    if (onApproval) {
      cleanups.push(ws.addEventListener('visitor:approved', onApproval));
    }
    if (onDenial) {
      cleanups.push(ws.addEventListener('visitor:denied', onDenial));
    }

    return () => cleanups.forEach(cleanup => cleanup?.());
  }, [ws, onCheckIn, onCheckOut, onNewVisitor, onApproval, onDenial]);

  return {
    ...ws,
    visitorEvents: ws.visitorEvents
  };
}

// Import API utility


/**
 * useNotifications Hook
 * 
 * Simplified hook specifically for notifications
 */
export function useNotifications(options = {}) {
  const { onNotification, autoMarkRead = false } = options;

  const ws = useWebSocket({
    subscribeDashboard: true,
    ...options
  });

  // Fetch recent notifications on mount
  useEffect(() => {
    let mounted = true;

    async function fetchRecent() {
      if (!ws.isConnected) return;

      try {
        const response = await api.get('/notifications/recent?limit=20');

        if (mounted && response.data?.success && Array.isArray(response.data.data)) {
          console.log('Fetching recent notifications:', response.data.data.length);
          const normalized = response.data.data.map(n => ({
            ...n,
            timestamp: n.created_at, // Normalize timestamp
            read: !!n.read_at
          }));

          if (ws.mergeNotifications) {
            ws.mergeNotifications(normalized);
          }
        }
      } catch (error) {
        console.error('Failed to fetch recent notifications:', error);
      }
    }

    fetchRecent();

    return () => { mounted = false; };
  }, [ws.isConnected, ws.mergeNotifications]); // Re-fetch on connection

  // Set up notification listener
  useEffect(() => {
    if (onNotification) {
      return ws.addEventListener(WS_EVENTS.NOTIFICATION, (notification) => {
        onNotification(notification);
        if (autoMarkRead) {
          ws.markNotificationRead(notification.id);
        }
      });
    }
  }, [ws, onNotification, autoMarkRead]);

  return {
    notifications: ws.notifications,
    unreadCount: ws.unreadNotifications,
    markAsRead: ws.markNotificationRead,
    clearAll: ws.clearNotifications,
    isConnected: ws.isConnected
  };
}

/**
 * useSecurityAlerts Hook
 * 
 * Hook for security personnel to receive alerts
 */
export function useSecurityAlerts(options = {}) {
  const { onAlert } = options;
  const [alerts, setAlerts] = useState([]);

  const ws = useWebSocket({
    subscribeVisitors: true,
    subscribeAdmin: true,
    ...options
  });

  // Set up alert listener
  useEffect(() => {
    return ws.addEventListener(WS_EVENTS.SECURITY_ALERT, (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50));
      onAlert?.(alert);
    });
  }, [ws, onAlert]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const acknowledgeAlert = useCallback((alertId) => {
    setAlerts(prev =>
      prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a)
    );
  }, []);

  return {
    alerts,
    unacknowledgedCount: alerts.filter(a => !a.acknowledged).length,
    clearAlerts,
    acknowledgeAlert,
    isConnected: ws.isConnected
  };
}

export default useWebSocket;
