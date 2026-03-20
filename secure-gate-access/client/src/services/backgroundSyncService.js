// Background Sync Service for PWA
import offlineService from './offlineService';
import logger from '../utils/logger';

class BackgroundSyncService {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;
    this.registration = null;
    this.syncTags = new Set();
    this.listeners = new Set();
    this._intervals = [];
    
    this.init();
  }

  async init() {
    if (!this.isSupported) {
      logger.warn('Background sync not supported');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.ready;
      this.setupMessageListener();
    } catch (error) {
      logger.error('Failed to initialize background sync:', error);
    }
  }

  // ==================== SYNC REGISTRATION ====================

  async registerSync(tag, data = null) {
    if (!this.isSupported || !this.registration) {
      logger.warn('Background sync not available, falling back to immediate sync');
      return this.fallbackSync(tag, data);
    }

    try {
      // Store sync data if provided
      if (data) {
        await this.storeSyncData(tag, data);
      }

      await this.registration.sync.register(tag);
      this.syncTags.add(tag);
      
      logger.info('Background sync registered:', tag);
      this.notifyListeners('sync_registered', { tag, data });
      
      return true;
    } catch (error) {
      logger.error('Failed to register background sync:', error);
      return this.fallbackSync(tag, data);
    }
  }

  async fallbackSync(tag, data) {
    // Immediate sync fallback for unsupported browsers
    logger.info('Performing immediate sync fallback:', tag);
    
    try {
      await this.performSync(tag, data);
      return true;
    } catch (error) {
      logger.error('Fallback sync failed:', error);
      return false;
    }
  }

  // ==================== CRITICAL OPERATIONS SYNC ====================

  async syncVisitorAction(visitorId, action, data = {}) {
    const syncData = {
      type: 'visitor_action',
      visitorId,
      action,
      data,
      timestamp: Date.now(),
      url: `/api/visitors/${visitorId}/${action}`,
      method: 'POST'
    };

    // Queue in offline service
    await offlineService.queueAction(syncData);
    
    // Register background sync
    return this.registerSync('sync-visitor-actions', syncData);
  }

  async syncUserPreferences(preferences) {
    const syncData = {
      type: 'user_preferences',
      preferences,
      timestamp: Date.now(),
      url: '/api/user/preferences',
      method: 'PUT'
    };

    return this.registerSync('sync-user-preferences', syncData);
  }

  async syncNotificationSettings(settings) {
    const syncData = {
      type: 'notification_settings',
      settings,
      timestamp: Date.now(),
      url: '/api/notifications/preferences',
      method: 'PUT'
    };

    return this.registerSync('sync-notification-settings', syncData);
  }

  async syncIncidentReport(incident) {
    const syncData = {
      type: 'incident_report',
      incident,
      timestamp: Date.now(),
      url: '/api/incidents',
      method: 'POST'
    };

    return this.registerSync('sync-incident-reports', syncData);
  }

  async syncBulkActions(actions) {
    const syncData = {
      type: 'bulk_actions',
      actions,
      timestamp: Date.now(),
      url: '/api/bulk-actions',
      method: 'POST'
    };

    return this.registerSync('sync-bulk-actions', syncData);
  }

  // ==================== SYNC DATA MANAGEMENT ====================

  async storeSyncData(tag, data) {
    const key = `sync_data_${tag}`;
    const syncEntry = {
      tag,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3
    };

    localStorage.setItem(key, JSON.stringify(syncEntry));
  }

  async getSyncData(tag) {
    const key = `sync_data_${tag}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) return null;
    
    try {
      return JSON.parse(stored);
    } catch (error) {
      logger.error('Error parsing sync data:', error);
      localStorage.removeItem(key);
      return null;
    }
  }

  async removeSyncData(tag) {
    const key = `sync_data_${tag}`;
    localStorage.removeItem(key);
  }

  // ==================== SYNC EXECUTION ====================

  async performSync(tag, data = null) {
    logger.info('Performing sync:', tag);
    
    // Get stored data if not provided
    if (!data) {
      const syncEntry = await this.getSyncData(tag);
      data = syncEntry?.data;
    }

    if (!data) {
      logger.warn('No sync data found for tag:', tag);
      return;
    }

    try {
      switch (tag) {
        case 'sync-visitor-actions':
          await this.syncVisitorActions();
          break;
        case 'sync-user-preferences':
          await this.syncPreferences(data);
          break;
        case 'sync-notification-settings':
          await this.syncNotifications(data);
          break;
        case 'sync-incident-reports':
          await this.syncIncidents(data);
          break;
        case 'sync-bulk-actions':
          await this.syncBulkOperations(data);
          break;
        default:
          logger.warn('Unknown sync tag:', tag);
      }

      // Remove sync data after successful sync
      await this.removeSyncData(tag);
      this.notifyListeners('sync_completed', { tag, success: true });
      
    } catch (error) {
      logger.error('Sync failed:', tag, error);
      await this.handleSyncFailure(tag, data, error);
      this.notifyListeners('sync_failed', { tag, error });
    }
  }

  async syncVisitorActions() {
    // Delegate to offline service
    await offlineService.processSyncQueue();
  }

  async syncPreferences(data) {
    const response = await fetch(data.url, {
      method: data.method,
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(data.preferences)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async syncNotifications(data) {
    const response = await fetch(data.url, {
      method: data.method,
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(data.settings)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async syncIncidents(data) {
    const response = await fetch(data.url, {
      method: data.method,
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(data.incident)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async syncBulkOperations(data) {
    const response = await fetch(data.url, {
      method: data.method,
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(data.actions)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // ==================== ERROR HANDLING ====================

  async handleSyncFailure(tag, data, error) {
    const syncEntry = await this.getSyncData(tag) || { retries: 0, maxRetries: 3 };
    syncEntry.retries = (syncEntry.retries || 0) + 1;
    syncEntry.lastError = error.message;
    syncEntry.lastAttempt = Date.now();

    if (syncEntry.retries >= syncEntry.maxRetries) {
      logger.error('Max retries reached for sync:', tag);
      await this.removeSyncData(tag);
      this.notifyListeners('sync_abandoned', { tag, error, retries: syncEntry.retries });
    } else {
      // Store updated retry count
      await this.storeSyncData(tag, { ...data, ...syncEntry });
      
      // Schedule retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, syncEntry.retries), 30000); // Max 30 seconds
      setTimeout(() => {
        this.registerSync(tag, data);
      }, delay);
    }
  }

  // ==================== MESSAGE HANDLING ====================

  setupMessageListener() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data || {};
      
      if (type === 'SYNC_EVENT') {
        this.handleSyncEvent(data);
      }
      
      if (type === 'SYNC_COMPLETED') {
        this.handleSyncCompleted(data);
      }
      
      if (type === 'SYNC_FAILED') {
        this.handleSyncFailed(data);
      }
    });
  }

  handleSyncEvent(data) {
    const { tag } = data || {};
    if (tag) {
      this.performSync(tag);
    }
  }

  handleSyncCompleted(data) {
    const { tag } = data || {};
    logger.info('Sync completed by service worker:', tag);
    this.notifyListeners('sync_completed', data);
  }

  handleSyncFailed(data) {
    const { tag, error } = data || {};
    logger.error('Sync failed in service worker:', tag, error);
    this.notifyListeners('sync_failed', data);
  }

  // ==================== PERIODIC SYNC ====================

  async schedulePeriodicSync() {
    // Check for pending syncs every 5 minutes when app is active
    this._intervals.push(setInterval(() => {
      if (!document.hidden && navigator.onLine) {
        this.checkPendingSyncs();
      }
    }, 5 * 60 * 1000));
  }

  async checkPendingSyncs() {
    const pendingTags = Array.from(this.syncTags);
    
    for (const tag of pendingTags) {
      const syncData = await this.getSyncData(tag);
      if (syncData && Date.now() - syncData.timestamp > 60000) { // Older than 1 minute
        logger.info('Retrying pending sync:', tag);
        await this.performSync(tag);
      }
    }
  }

  // ==================== UTILITY METHODS ====================

  async getSyncStatus() {
    const pendingSyncs = [];
    
    for (const tag of this.syncTags) {
      const syncData = await this.getSyncData(tag);
      if (syncData) {
        pendingSyncs.push({
          tag,
          timestamp: syncData.timestamp,
          retries: syncData.retries || 0,
          lastError: syncData.lastError
        });
      }
    }

    return {
      isSupported: this.isSupported,
      pendingSyncs,
      totalPending: pendingSyncs.length
    };
  }

  async clearAllPendingSyncs() {
    for (const tag of this.syncTags) {
      await this.removeSyncData(tag);
    }
    
    this.syncTags.clear();
    logger.info('All pending syncs cleared');
  }

  // ==================== EVENT LISTENERS ====================

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        logger.error('Error in background sync listener:', error);
      }
    });
  }

  destroy() {
    (this._intervals || []).forEach(id => clearInterval(id));
    this._intervals = [];
  }
}

// Create singleton instance
const backgroundSyncService = new BackgroundSyncService();

export default backgroundSyncService;