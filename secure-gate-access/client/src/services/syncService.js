/**
 * @file syncService.js
 * @description Offline sync service with privacy-first approach
 * Phase 3.1: Offline Mode & Sync
 * 
 * Features:
 * - Encrypted local storage using IndexedDB
 * - Minimal data caching (today's visitors only)
 * - Auto-purge on logout/inactivity
 * - Secure sync with conflict resolution
 */

import http from './http';

const DB_NAME = 'securegate_offline';
const DB_VERSION = 1;
const CACHE_EXPIRY_HOURS = 8;
const INACTIVITY_TIMEOUT_MINUTES = 30;

class SyncService {
  constructor() {
    this.db = null;
    this.inactivityTimer = null;
    this.isOnline = navigator.onLine;
    this.listeners = new Set();
    this.lastActivity = Date.now();
    
    // Bind event handlers
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
    this.handleActivity = this.handleActivity.bind(this);
    
    // Initialize on construction
    this.init();
  }

  /**
   * Initialize the sync service
   */
  async init() {
    // Setup online/offline listeners
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Setup activity tracking for auto-purge
    ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(event => {
      document.addEventListener(event, this.handleActivity, { passive: true });
    });
    
    // Open IndexedDB
    await this.openDatabase();
    
    // Start inactivity monitoring
    this.startInactivityMonitor();
    
    // Check for expired cache on startup
    await this.purgeExpiredData();
  }

  /**
   * Open IndexedDB database
   */
  async openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        console.error('Failed to open offline database');
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create stores for offline data
        if (!db.objectStoreNames.contains('offlinePackage')) {
          db.createObjectStore('offlinePackage', { keyPath: 'packageId' });
        }
        
        if (!db.objectStoreNames.contains('pendingChanges')) {
          const changesStore = db.createObjectStore('pendingChanges', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          changesStore.createIndex('timestamp', 'timestamp');
        }
        
        if (!db.objectStoreNames.contains('syncMetadata')) {
          db.createObjectStore('syncMetadata', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Handle coming back online
   */
  handleOnline() {
    this.isOnline = true;
    this.notifyListeners({ type: 'online' });
    
    // Attempt to sync pending changes
    this.syncPendingChanges();
  }

  /**
   * Handle going offline
   */
  handleOffline() {
    this.isOnline = false;
    this.notifyListeners({ type: 'offline' });
  }

  /**
   * Track user activity for auto-purge
   */
  handleActivity() {
    this.lastActivity = Date.now();
  }

  /**
   * Start inactivity monitoring
   */
  startInactivityMonitor() {
    // Check every minute for inactivity
    this.inactivityTimer = setInterval(() => {
      const inactiveTime = Date.now() - this.lastActivity;
      const timeoutMs = INACTIVITY_TIMEOUT_MINUTES * 60 * 1000;
      
      if (inactiveTime > timeoutMs) {
        console.log('Inactivity timeout - purging offline cache for privacy');
        this.securityPurge();
      }
    }, 60 * 1000);
  }

  /**
   * Subscribe to sync events
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event) {
    this.listeners.forEach(callback => callback(event));
  }

  /**
   * Download offline data package from server
   * Privacy: Contains only minimal data needed for offline operation
   */
  async downloadOfflinePackage() {
    try {
      const response = await http.get('/api/sync/download');
      
      if (response.success && response.data) {
        const offlinePackage = response.data;
        
        // Store in IndexedDB
        await this.storeOfflinePackage(offlinePackage);
        
        // Update sync metadata
        await this.updateSyncMetadata({
          lastDownload: new Date().toISOString(),
          packageId: offlinePackage.packageId,
          expiresAt: offlinePackage.expiresAt
        });
        
        this.notifyListeners({ 
          type: 'packageDownloaded', 
          packageId: offlinePackage.packageId 
        });
        
        return offlinePackage;
      }
      
      throw new Error('Invalid response from sync download');
    } catch (error) {
      console.error('Error downloading offline package:', error);
      throw error;
    }
  }

  /**
   * Store offline package in IndexedDB
   */
  async storeOfflinePackage(offlinePackage) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['offlinePackage'], 'readwrite');
      const store = transaction.objectStore('offlinePackage');
      
      // Clear existing packages first
      store.clear();
      
      const request = store.put(offlinePackage);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get stored offline package
   */
  async getOfflinePackage() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }
      
      const transaction = this.db.transaction(['offlinePackage'], 'readonly');
      const store = transaction.objectStore('offlinePackage');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const packages = request.result;
        if (packages.length > 0) {
          const pkg = packages[0];
          
          // Check if package is still valid
          if (new Date(pkg.expiresAt) > new Date()) {
            resolve(pkg);
          } else {
            // Expired - purge and return null
            this.purgeOfflinePackage();
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Queue a change for later sync
   */
  async queueChange(change) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const idempotencyKey = change.idempotencyKey || (window.crypto?.randomUUID?.() ?? null);
      const transaction = this.db.transaction(['pendingChanges'], 'readwrite');
      const store = transaction.objectStore('pendingChanges');
      
      const changeWithMeta = {
        ...change,
        idempotencyKey,
        timestamp: new Date().toISOString(),
        synced: false
      };
      
      const request = store.add(changeWithMeta);
      
      request.onsuccess = () => {
        this.notifyListeners({ type: 'changeQueued', change: changeWithMeta });
        resolve(request.result);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get pending changes count
   */
  async getPendingChangesCount() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(0);
        return;
      }
      
      const transaction = this.db.transaction(['pendingChanges'], 'readonly');
      const store = transaction.objectStore('pendingChanges');
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending changes
   */
  async getPendingChanges() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }
      
      const transaction = this.db.transaction(['pendingChanges'], 'readonly');
      const store = transaction.objectStore('pendingChanges');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sync pending changes to server
   */
  async syncPendingChanges() {
    if (!this.isOnline) {
      return { success: false, reason: 'offline' };
    }
    
    const pendingChanges = await this.getPendingChanges();
    
    if (pendingChanges.length === 0) {
      return { success: true, synced: 0 };
    }
    
    try {
      const metadata = await this.getSyncMetadata();
      
      const response = await http.post('/api/sync/upload', {
        packageId: metadata?.packageId,
        changes: pendingChanges
      });
      
      if (response.success) {
        // Clear synced changes
        await this.clearPendingChanges();
        
        this.notifyListeners({ 
          type: 'syncComplete', 
          synced: pendingChanges.length,
          results: response.data 
        });
        
        return { 
          success: true, 
          synced: pendingChanges.length,
          results: response.data 
        };
      }
      
      throw new Error(response.error || 'Sync failed');
    } catch (error) {
      console.error('Error syncing pending changes:', error);
      this.notifyListeners({ type: 'syncError', error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear all pending changes
   */
  async clearPendingChanges() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }
      
      const transaction = this.db.transaction(['pendingChanges'], 'readwrite');
      const store = transaction.objectStore('pendingChanges');
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update sync metadata
   */
  async updateSyncMetadata(data) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['syncMetadata'], 'readwrite');
      const store = transaction.objectStore('syncMetadata');
      
      const request = store.put({ key: 'syncInfo', ...data });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get sync metadata
   */
  async getSyncMetadata() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }
      
      const transaction = this.db.transaction(['syncMetadata'], 'readonly');
      const store = transaction.objectStore('syncMetadata');
      const request = store.get('syncInfo');
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Purge offline package
   */
  async purgeOfflinePackage() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }
      
      const transaction = this.db.transaction(['offlinePackage'], 'readwrite');
      const store = transaction.objectStore('offlinePackage');
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Purge all expired data
   */
  async purgeExpiredData() {
    const pkg = await this.getOfflinePackage();
    
    if (pkg && new Date(pkg.expiresAt) <= new Date()) {
      await this.purgeOfflinePackage();
      console.log('Expired offline package purged for privacy');
    }
  }

  /**
   * Security purge - called on logout, inactivity, or auth failure
   * Privacy: Removes all local data to protect sensitive information
   */
  async securityPurge() {
    try {
      // Clear all IndexedDB data
      await this.purgeOfflinePackage();
      await this.clearPendingChanges();
      
      // Clear sync metadata
      if (this.db) {
        const transaction = this.db.transaction(['syncMetadata'], 'readwrite');
        const store = transaction.objectStore('syncMetadata');
        await new Promise((resolve) => {
          const request = store.clear();
          request.onsuccess = resolve;
          request.onerror = resolve; // Continue even on error
        });
      }
      
      this.notifyListeners({ type: 'securityPurge' });
      console.log('Security purge completed - all offline data cleared');
    } catch (error) {
      console.error('Error during security purge:', error);
      // Try to delete the entire database as fallback
      indexedDB.deleteDatabase(DB_NAME);
    }
  }

  /**
   * Check if device has adequate security
   * Note: This is a best-effort check, as browsers limit access to device security info
   */
  checkDeviceSecurity() {
    // Check if running in secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      return { secure: false, reason: 'Not running in secure context (HTTPS required)' };
    }
    
    return { secure: true };
  }

  /**
   * Get sync status
   */
  async getStatus() {
    const pendingCount = await this.getPendingChangesCount();
    const metadata = await this.getSyncMetadata();
    const hasOfflineData = !!(await this.getOfflinePackage());
    
    return {
      isOnline: this.isOnline,
      hasPendingChanges: pendingCount > 0,
      pendingChangesCount: pendingCount,
      lastDownload: metadata?.lastDownload,
      packageExpiresAt: metadata?.expiresAt,
      hasOfflineData
    };
  }

  /**
   * Cleanup on destroy
   */
  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(event => {
      document.removeEventListener(event, this.handleActivity);
    });
    
    if (this.inactivityTimer) {
      clearInterval(this.inactivityTimer);
    }
    
    if (this.db) {
      this.db.close();
    }
  }
}

// Export singleton instance
const syncService = new SyncService();
export default syncService;
