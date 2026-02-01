// Enhanced Offline Service for PWA capabilities
class OfflineService {
  constructor() {
    this.dbName = 'SecureGateOffline';
    this.dbVersion = 1;
    this.db = null;
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.listeners = new Set();
    
    this.init();
  }

  async init() {
    await this.initDatabase();
    this.setupEventListeners();
    this.registerServiceWorker();
  }

  // ==================== DATABASE MANAGEMENT ====================

  async initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Visitor data store
        if (!db.objectStoreNames.contains('visitors')) {
          const visitorStore = db.createObjectStore('visitors', { keyPath: 'id' });
          visitorStore.createIndex('status', 'status', { unique: false });
          visitorStore.createIndex('date', 'date_of_visit', { unique: false });
        }
        
        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('type', 'type', { unique: false });
        }
        
        // User preferences store
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'key' });
        }
        
        // Cached API responses
        if (!db.objectStoreNames.contains('apiCache')) {
          const cacheStore = db.createObjectStore('apiCache', { keyPath: 'url' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // ==================== OFFLINE DATA MANAGEMENT ====================

  async cacheVisitors(visitors) {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['visitors'], 'readwrite');
    const store = transaction.objectStore('visitors');
    
    for (const visitor of visitors) {
      await this.promisifyRequest(store.put({
        ...visitor,
        cached_at: Date.now()
      }));
    }
  }

  async getCachedVisitors(filters = {}) {
    if (!this.db) return [];
    
    const transaction = this.db.transaction(['visitors'], 'readonly');
    const store = transaction.objectStore('visitors');
    
    let visitors = await this.promisifyRequest(store.getAll());
    
    // Apply filters
    if (filters.status) {
      visitors = visitors.filter(v => v.status === filters.status);
    }
    
    if (filters.date) {
      visitors = visitors.filter(v => v.date_of_visit === filters.date);
    }
    
    return visitors.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async cacheApiResponse(url, data, ttl = 300000) { // 5 minutes default TTL
    if (!this.db) return;
    
    const transaction = this.db.transaction(['apiCache'], 'readwrite');
    const store = transaction.objectStore('apiCache');
    
    await this.promisifyRequest(store.put({
      url,
      data,
      timestamp: Date.now(),
      expires: Date.now() + ttl
    }));
  }

  async getCachedApiResponse(url) {
    if (!this.db) return null;
    
    const transaction = this.db.transaction(['apiCache'], 'readonly');
    const store = transaction.objectStore('apiCache');
    
    const cached = await this.promisifyRequest(store.get(url));
    
    if (!cached || Date.now() > cached.expires) {
      return null;
    }
    
    return cached.data;
  }

  // ==================== SYNC QUEUE MANAGEMENT ====================

  async queueAction(action) {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    await this.promisifyRequest(store.add({
      ...action,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3
    }));
    
    // Try to sync immediately if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  async processSyncQueue() {
    if (!this.db || !this.isOnline) return;
    
    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    const queuedActions = await this.promisifyRequest(store.getAll());
    
    for (const action of queuedActions) {
      try {
        await this.executeAction(action);
        await this.promisifyRequest(store.delete(action.id));
        console.log('Synced action:', action.type);
      } catch (error) {
        console.warn('Failed to sync action:', action.type, error);
        
        // Increment retry count
        action.retries = (action.retries || 0) + 1;
        
        if (action.retries >= action.maxRetries) {
          // Remove failed action after max retries
          await this.promisifyRequest(store.delete(action.id));
          console.error('Max retries reached for action:', action.type);
        } else {
          // Update retry count
          await this.promisifyRequest(store.put(action));
        }
      }
    }
  }

  async executeAction(action) {
    const { type, data, url, method, headers } = action;
    
    const response = await fetch(url, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  // ==================== OFFLINE CAPABILITIES ====================

  async getOfflineCapabilities() {
    const cachedVisitors = await this.getCachedVisitors();
    const queuedActions = await this.getQueuedActions();
    
    return {
      hasVisitorData: cachedVisitors.length > 0,
      queuedActionsCount: queuedActions.length,
      capabilities: [
        'View cached visitor data',
        'Queue visitor actions for sync',
        'Access basic navigation',
        'View user preferences',
        'Emergency contact information'
      ]
    };
  }

  async getQueuedActions() {
    if (!this.db) return [];
    
    const transaction = this.db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    
    return await this.promisifyRequest(store.getAll());
  }

  // ==================== ESSENTIAL OFFLINE FEATURES ====================

  async getEssentialData() {
    const [visitors, preferences, capabilities] = await Promise.all([
      this.getCachedVisitors(),
      this.getCachedPreferences(),
      this.getOfflineCapabilities()
    ]);
    
    return {
      visitors: visitors.slice(0, 50), // Limit to recent 50
      preferences,
      capabilities,
      lastSync: this.getLastSyncTime()
    };
  }

  async getCachedPreferences() {
    if (!this.db) return {};
    
    const transaction = this.db.transaction(['preferences'], 'readonly');
    const store = transaction.objectStore('preferences');
    
    const prefs = await this.promisifyRequest(store.getAll());
    
    return prefs.reduce((acc, pref) => {
      acc[pref.key] = pref.value;
      return acc;
    }, {});
  }

  async cachePreferences(preferences) {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['preferences'], 'readwrite');
    const store = transaction.objectStore('preferences');
    
    for (const [key, value] of Object.entries(preferences)) {
      await this.promisifyRequest(store.put({ key, value }));
    }
  }

  // ==================== CRITICAL OPERATIONS ====================

  async queueVisitorAction(visitorId, action, data = {}) {
    const actionData = {
      type: 'visitor_action',
      visitorId,
      action,
      data,
      url: `/api/visitors/${visitorId}/${action}`,
      method: 'POST'
    };
    
    await this.queueAction(actionData);
    
    // Update local cache optimistically
    await this.updateLocalVisitor(visitorId, { 
      status: this.getOptimisticStatus(action),
      pending_sync: true
    });
  }

  async updateLocalVisitor(visitorId, updates) {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['visitors'], 'readwrite');
    const store = transaction.objectStore('visitors');
    
    const visitor = await this.promisifyRequest(store.get(visitorId));
    if (visitor) {
      const updatedVisitor = { ...visitor, ...updates };
      await this.promisifyRequest(store.put(updatedVisitor));
    }
  }

  getOptimisticStatus(action) {
    const statusMap = {
      'approve': 'APPROVED',
      'check-in': 'ON_PREMISE',
      'check-out': 'CHECKED_OUT',
      'deny': 'REVOKED'
    };
    
    return statusMap[action] || 'PENDING';
  }

  // ==================== EVENT HANDLING ====================

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners('online');
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners('offline');
    });
    
    // Handle visibility change for background sync
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.processSyncQueue();
      }
    });
  }

  addConnectionListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event, this.isOnline);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  // ==================== SERVICE WORKER INTEGRATION ====================

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered:', registration);
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event.data);
        });
        
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  handleServiceWorkerMessage(data) {
    if (data.type === 'SYNC_REQUIRED') {
      this.processSyncQueue();
    }
    
    if (data.type === 'CACHE_UPDATED') {
      this.notifyListeners('cache_updated');
    }
  }

  async requestBackgroundSync(tag) {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
    }
  }

  // ==================== UTILITIES ====================

  promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  getLastSyncTime() {
    return localStorage.getItem('lastSyncTime') || null;
  }

  setLastSyncTime() {
    localStorage.setItem('lastSyncTime', new Date().toISOString());
  }

  // ==================== CLEANUP ====================

  async clearOldCache() {
    if (!this.db) return;
    
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    const transaction = this.db.transaction(['apiCache'], 'readwrite');
    const store = transaction.objectStore('apiCache');
    const index = store.index('timestamp');
    
    const range = IDBKeyRange.upperBound(cutoff);
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }
}

// Create singleton instance
const offlineService = new OfflineService();

export default offlineService;