// Toast Notification Service
import logger from 'utils/logger';

class NotificationService {
  constructor() {
    this.listeners = [];
    this.toasts = [];
    this.toastId = 0;
  }

  // Subscribe to notifications
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Add a toast notification
  addToast(toast) {
    const id = ++this.toastId;
    const newToast = {
      id,
      type: toast.type || 'info',
      title: toast.title || 'Notification',
      message: toast.message || '',
      duration: toast.duration || 5000,
      timestamp: new Date().toISOString(),
      ...toast
    };

    this.toasts.push(newToast);
    this.notifyListeners();

    // Auto-remove toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, newToast.duration);
    }

    return id;
  }

  // Remove a toast notification
  removeToast(id) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notifyListeners();
  }

  // Clear all toasts
  clearAll() {
    this.toasts = [];
    this.notifyListeners();
  }

  // Get all toasts
  getToasts() {
    return [...this.toasts];
  }

  // Notify all listeners
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.toasts);
      } catch (error) {
        logger.error('Error in notification listener', error);
      }
    });
  }

  // Convenience methods for different toast types
  success(title, message, options = {}) {
    return this.addToast({
      type: 'success',
      title,
      message,
      ...options
    });
  }

  error(title, message, options = {}) {
    return this.addToast({
      type: 'error',
      title,
      message,
      duration: 8000, // Errors stay longer
      ...options
    });
  }

  warning(title, message, options = {}) {
    return this.addToast({
      type: 'warning',
      title,
      message,
      ...options
    });
  }

  info(title, message, options = {}) {
    return this.addToast({
      type: 'info',
      title,
      message,
      ...options
    });
  }

  // Handle backend events
  handleBackendEvent(event) {
    switch (event.type) {
      case 'visitor_checkin':
        this.success(
          'Visitor Checked In',
          `Visitor ${event.visitorId} has been checked in successfully`,
          { duration: 3000 }
        );
        break;

      case 'visitor_checkout':
        this.success(
          'Visitor Checked Out',
          `Visitor ${event.visitorId} has been checked out successfully`,
          { duration: 3000 }
        );
        break;

      case 'new_visitor':
        this.info(
          'New Visitor',
          `New visitor ${event.visitor.name} has been registered`,
          { duration: 4000 }
        );
        break;

      case 'visitor_update':
        this.info(
          'Visitor Status Updated',
          `Visitor ${event.visitorId} status changed to ${event.status}`,
          { duration: 3000 }
        );
        break;

      case 'error':
        this.error(
          'System Error',
          event.message || 'An error occurred',
          { duration: 8000 }
        );
        break;

      default:
        this.info(
          'System Notification',
          event.message || 'A system event occurred',
          { duration: 3000 }
        );
    }
  }

  // Connect to Server-Sent Events (when available)
  connectToSSE() {
    try {
      const eventSource = new EventSource('/api/sse/guards', { withCredentials: true });
      
      eventSource.onopen = () => {
        logger.info('Connected to SSE for notifications');
        this.info('Connected', 'Real-time notifications enabled');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleBackendEvent(data);
        } catch (error) {
          logger.error('Error parsing SSE data', error);
        }
      };

      eventSource.onerror = (error) => {
        logger.error('SSE connection error', error);
        this.warning('Connection Lost', 'Real-time notifications temporarily unavailable');
      };

      return eventSource;
    } catch (error) {
      logger.error('Failed to connect to SSE', error);
      this.error('Connection Failed', 'Unable to connect to real-time notifications');
      return null;
    }
  }

  // Simulate backend events for testing
  simulateEvent(type, data) {
    this.handleBackendEvent({ type, ...data });
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
