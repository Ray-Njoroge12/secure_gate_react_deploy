/**
 * @fileoverview WebSocket Hook for Real-time Updates
 * @description React hook for managing WebSocket connections and real-time events
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

// WebSocket server URL
const WS_URL = process.env.REACT_APP_WS_URL || window.location.origin;

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
  
  // Visitor events
  VISITORS_SUBSCRIBE: 'visitors:subscribe',
  VISITORS_SUBSCRIBED: 'visitors:subscribed',
  VISITOR_EVENT: 'visitor:event',
  VISITOR_CHECKIN: 'visitor:checkin',
  VISITOR_CHECKOUT: 'visitor:checkout',
  VISITOR_NEW: 'visitor:new',
  VISITOR_APPROVED: 'visitor:approved',
  VISITOR_DENIED: 'visitor:denied',
  
  // Notification events
  NOTIFICATION: 'notification',
  
  // Admin events
  ADMIN_SUBSCRIBE: 'admin:subscribe',
  ADMIN_SUBSCRIBED: 'admin:subscribed',
  USER_CONNECTED: 'user:connected',
  USER_DISCONNECTED: 'user:disconnected',
  
  // Security events
  SECURITY_ALERT: 'security:alert',
  
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
    subscribeDashboard = true,
    subscribeVisitors = false,
    subscribeAdmin = false,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const [connectionState, setConnectionState] = useState(CONNECTION_STATE.DISCONNECTED);
  const [lastMessage, setLastMessage] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [visitorEvents, setVisitorEvents] = useState([]);
  const [error, setError] = useState(null);

  // Event listeners registry
  const eventListeners = useRef(new Map());

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
    if (socketRef.current?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    if (!token) {
      console.warn('No auth token available for WebSocket connection');
      return;
    }

    setConnectionState(CONNECTION_STATE.CONNECTING);
    setError(null);

    socketRef.current = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });

    const socket = socketRef.current;

    // Connection established
    socket.on(WS_EVENTS.CONNECT, () => {
      console.log('🟢 WebSocket connected');
      setConnectionState(CONNECTION_STATE.CONNECTED);
      reconnectAttempts.current = 0;
      onConnect?.();
      emitToListeners(WS_EVENTS.CONNECT, { connected: true });
    });

    // Connection established with server info
    socket.on(WS_EVENTS.CONNECTION_ESTABLISHED, (data) => {
      console.log('WebSocket connection established:', data);
      setLastMessage(data);
      
      // Auto-subscribe based on options
      if (subscribeDashboard) {
        socket.emit(WS_EVENTS.DASHBOARD_SUBSCRIBE);
      }
      if (subscribeVisitors && ['admin', 'guard'].includes(user?.role)) {
        socket.emit(WS_EVENTS.VISITORS_SUBSCRIBE);
      }
      if (subscribeAdmin && user?.role === 'admin') {
        socket.emit(WS_EVENTS.ADMIN_SUBSCRIBE);
      }
    });

    // Disconnect
    socket.on(WS_EVENTS.DISCONNECT, (reason) => {
      console.log('🔴 WebSocket disconnected:', reason);
      setConnectionState(CONNECTION_STATE.DISCONNECTED);
      onDisconnect?.(reason);
      emitToListeners(WS_EVENTS.DISCONNECT, { reason });
    });

    // Connection error
    socket.on(WS_EVENTS.CONNECT_ERROR, (err) => {
      console.error('WebSocket connection error:', err);
      setConnectionState(CONNECTION_STATE.ERROR);
      setError(err.message);
      reconnectAttempts.current++;
      onError?.(err);
      emitToListeners(WS_EVENTS.CONNECT_ERROR, { error: err });
    });

    // Dashboard updates
    socket.on(WS_EVENTS.DASHBOARD_UPDATE, (data) => {
      setDashboardStats(data.data);
      setLastMessage(data);
      emitToListeners(WS_EVENTS.DASHBOARD_UPDATE, data);
    });

    socket.on(WS_EVENTS.DASHBOARD_STATS, (data) => {
      setDashboardStats(data);
      emitToListeners(WS_EVENTS.DASHBOARD_STATS, data);
    });

    // Visitor events
    socket.on(WS_EVENTS.VISITOR_EVENT, (data) => {
      setVisitorEvents(prev => [data, ...prev].slice(0, 50)); // Keep last 50
      setLastMessage(data);
      emitToListeners(WS_EVENTS.VISITOR_EVENT, data);
      
      // Emit specific visitor event type
      if (data.type) {
        emitToListeners(`visitor:${data.type}`, data);
      }
    });

    // Notifications
    socket.on(WS_EVENTS.NOTIFICATION, (data) => {
      setNotifications(prev => [data, ...prev].slice(0, 100)); // Keep last 100
      emitToListeners(WS_EVENTS.NOTIFICATION, data);
    });

    // Security alerts
    socket.on(WS_EVENTS.SECURITY_ALERT, (data) => {
      emitToListeners(WS_EVENTS.SECURITY_ALERT, data);
    });

    // User connection events (admin only)
    socket.on(WS_EVENTS.USER_CONNECTED, (data) => {
      emitToListeners(WS_EVENTS.USER_CONNECTED, data);
    });

    socket.on(WS_EVENTS.USER_DISCONNECTED, (data) => {
      emitToListeners(WS_EVENTS.USER_DISCONNECTED, data);
    });

    // Error events
    socket.on(WS_EVENTS.ERROR, (data) => {
      console.error('WebSocket error event:', data);
      setError(data.message);
      emitToListeners(WS_EVENTS.ERROR, data);
    });

  }, [token, user?.role, subscribeDashboard, subscribeVisitors, subscribeAdmin, 
      onConnect, onDisconnect, onError, emitToListeners]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
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
    if (autoConnect && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, token]); // Don't include connect/disconnect to avoid loops

  // Computed values
  const isConnected = connectionState === CONNECTION_STATE.CONNECTED;
  const isConnecting = connectionState === CONNECTION_STATE.CONNECTING;
  const unreadNotifications = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

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
    addEventListener,
    subscribeToDashboard,
    subscribeToVisitors,
    subscribeToAdmin,
    requestDashboardStats,
    clearNotifications,
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
