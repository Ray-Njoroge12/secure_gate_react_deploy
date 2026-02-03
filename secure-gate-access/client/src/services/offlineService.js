// Enhanced Offline Service for PWA capabilities
// Phase 4: Guard Offline Improvements - QR Scanning, Walk-In Registration, Auto-Purge

class OfflineService {
  constructor() {
    this.dbName = 'SecureGateOffline';
    this.dbVersion = 3; // Upgraded version for resident stores
    this.db = null;
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.listeners = new Set();
    
    // Configurable purge settings (can be overridden by estate policy)
    this.purgeConfig = {
      visitorDataRetentionMs: 8 * 60 * 60 * 1000,      // 8 hours default
      apiCacheRetentionMs: 24 * 60 * 60 * 1000,       // 24 hours default
      syncQueueRetentionMs: 72 * 60 * 60 * 1000,      // 72 hours default
      walkInRetentionMs: 24 * 60 * 60 * 1000,         // 24 hours default
      qrCacheRetentionMs: 12 * 60 * 60 * 1000,        // 12 hours default
      inactivityPurgeMs: 30 * 60 * 1000,              // 30 min default
      scheduledPurgeIntervalMs: 60 * 60 * 1000,       // Run purge every hour
      maxCachedVisitors: 200                           // Max visitors to cache
    };
    
    this.purgeTimer = null;
    this.inactivityTimer = null;
    this.lastActivity = Date.now();
    
    this.init();
  }

  async init() {
    await this.initDatabase();
    this.setupEventListeners();
    this.registerServiceWorker();
    this.loadPurgeConfig();
    this.startScheduledPurge();
    this.startInactivityMonitor();
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
          visitorStore.createIndex('qr_code', 'qr_code', { unique: false });
          visitorStore.createIndex('cached_at', 'cached_at', { unique: false });
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
        
        // NEW: QR Code cache for offline validation
        if (!db.objectStoreNames.contains('qrCache')) {
          const qrStore = db.createObjectStore('qrCache', { keyPath: 'qr_code' });
          qrStore.createIndex('visitor_id', 'visitor_id', { unique: false });
          qrStore.createIndex('valid_until', 'valid_until', { unique: false });
          qrStore.createIndex('cached_at', 'cached_at', { unique: false });
        }
        
        // NEW: Pending walk-in registrations
        if (!db.objectStoreNames.contains('pendingWalkIns')) {
          const walkInStore = db.createObjectStore('pendingWalkIns', { keyPath: 'localId' });
          walkInStore.createIndex('timestamp', 'timestamp', { unique: false });
          walkInStore.createIndex('synced', 'synced', { unique: false });
        }
        
        // NEW: Offline check-ins pending sync
        if (!db.objectStoreNames.contains('offlineCheckIns')) {
          const checkInStore = db.createObjectStore('offlineCheckIns', { keyPath: 'id', autoIncrement: true });
          checkInStore.createIndex('visitor_id', 'visitor_id', { unique: false });
          checkInStore.createIndex('timestamp', 'timestamp', { unique: false });
          checkInStore.createIndex('synced', 'synced', { unique: false });
        }
        
        // RESIDENT: Favorite visitors cache for offline quick-invite
        if (!db.objectStoreNames.contains('favoriteVisitors')) {
          const favStore = db.createObjectStore('favoriteVisitors', { keyPath: 'id' });
          favStore.createIndex('resident_id', 'resident_id', { unique: false });
          favStore.createIndex('cached_at', 'cached_at', { unique: false });
        }
        
        // RESIDENT: Recurring passes cache for offline reference
        if (!db.objectStoreNames.contains('recurringPasses')) {
          const recurringStore = db.createObjectStore('recurringPasses', { keyPath: 'id' });
          recurringStore.createIndex('resident_id', 'resident_id', { unique: false });
          recurringStore.createIndex('status', 'status', { unique: false });
          recurringStore.createIndex('cached_at', 'cached_at', { unique: false });
        }
        
        // RESIDENT: Pending invites queue for offline creation
        if (!db.objectStoreNames.contains('pendingInvites')) {
          const inviteStore = db.createObjectStore('pendingInvites', { keyPath: 'localId' });
          inviteStore.createIndex('timestamp', 'timestamp', { unique: false });
          inviteStore.createIndex('synced', 'synced', { unique: false });
        }
      };
    });
  }

  // ==================== PURGE CONFIGURATION ====================

  loadPurgeConfig() {
    try {
      const stored = localStorage.getItem('offlinePurgeConfig');
      if (stored) {
        const config = JSON.parse(stored);
        this.purgeConfig = { ...this.purgeConfig, ...config };
      }
    } catch (error) {
      console.warn('[OfflineService] Failed to load purge config:', error);
    }
  }

  async configurePurgePolicy(policy) {
    // Called when guard logs in - receives estate-specific policy
    if (policy.visitorRetentionHours) {
      this.purgeConfig.visitorDataRetentionMs = policy.visitorRetentionHours * 60 * 60 * 1000;
    }
    if (policy.cacheRetentionHours) {
      this.purgeConfig.apiCacheRetentionMs = policy.cacheRetentionHours * 60 * 60 * 1000;
    }
    if (policy.inactivityMinutes) {
      this.purgeConfig.inactivityPurgeMs = policy.inactivityMinutes * 60 * 1000;
    }
    if (policy.walkInRetentionHours) {
      this.purgeConfig.walkInRetentionMs = policy.walkInRetentionHours * 60 * 60 * 1000;
    }
    if (policy.qrCacheRetentionHours) {
      this.purgeConfig.qrCacheRetentionMs = policy.qrCacheRetentionHours * 60 * 60 * 1000;
    }
    if (policy.maxCachedVisitors) {
      this.purgeConfig.maxCachedVisitors = policy.maxCachedVisitors;
    }
    
    // Persist config
    localStorage.setItem('offlinePurgeConfig', JSON.stringify(this.purgeConfig));
    console.log('[OfflineService] Purge policy configured:', this.purgeConfig);
  }

  getPurgeConfig() {
    return { ...this.purgeConfig };
  }

  // ==================== SCHEDULED PURGE ====================

  startScheduledPurge() {
    if (this.purgeTimer) {
      clearInterval(this.purgeTimer);
    }
    
    this.purgeTimer = setInterval(() => {
      this.purgeExpiredData();
    }, this.purgeConfig.scheduledPurgeIntervalMs);
    
    // Run initial purge
    this.purgeExpiredData();
  }

  startInactivityMonitor() {
    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(event => {
      document.addEventListener(event, () => {
        this.lastActivity = Date.now();
      }, { passive: true });
    });
    
    // Check for inactivity every minute
    if (this.inactivityTimer) {
      clearInterval(this.inactivityTimer);
    }
    
    this.inactivityTimer = setInterval(() => {
      const inactiveTime = Date.now() - this.lastActivity;
      if (inactiveTime > this.purgeConfig.inactivityPurgeMs) {
        console.log('[OfflineService] Inactivity timeout - purging sensitive data');
        this.securityPurge();
      }
    }, 60 * 1000);
  }

  async purgeExpiredData() {
    if (!this.db) return;
    
    const now = Date.now();
    let purgedCount = 0;
    
    try {
      // Purge visitor data
      purgedCount += await this.purgeStore('visitors', 'cached_at', now - this.purgeConfig.visitorDataRetentionMs);
      
      // Purge API cache
      purgedCount += await this.purgeStore('apiCache', 'timestamp', now - this.purgeConfig.apiCacheRetentionMs);
      
      // Purge QR cache
      purgedCount += await this.purgeStore('qrCache', 'cached_at', now - this.purgeConfig.qrCacheRetentionMs);
      
      // Purge synced walk-ins older than retention period
      purgedCount += await this.purgeSyncedWalkIns(now - this.purgeConfig.walkInRetentionMs);
      
      // Purge synced offline check-ins
      purgedCount += await this.purgeSyncedCheckIns(now - this.purgeConfig.walkInRetentionMs);
      
      // Enforce max visitors limit
      await this.enforceMaxVisitorsLimit();
      
      if (purgedCount > 0) {
        console.log(`[OfflineService] Scheduled purge completed: ${purgedCount} items removed`);
      }
    } catch (error) {
      console.error('[OfflineService] Purge error:', error);
    }
  }

  async purgeStore(storeName, indexName, cutoffTimestamp) {
    if (!this.db || !this.db.objectStoreNames.contains(storeName)) return 0;
    
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        let deletedCount = 0;
        
        const request = store.openCursor();
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const record = cursor.value;
            const recordTime = record[indexName] || record.timestamp || record.cached_at;
            
            if (recordTime && recordTime < cutoffTimestamp) {
              cursor.delete();
              deletedCount++;
            }
            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };
        
        request.onerror = () => resolve(0);
      } catch (error) {
        resolve(0);
      }
    });
  }

  async purgeSyncedWalkIns(cutoffTimestamp) {
    if (!this.db || !this.db.objectStoreNames.contains('pendingWalkIns')) return 0;
    
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction(['pendingWalkIns'], 'readwrite');
        const store = transaction.objectStore('pendingWalkIns');
        let deletedCount = 0;
        
        const request = store.openCursor();
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const record = cursor.value;
            // Only purge synced walk-ins that are old
            if (record.synced && record.timestamp < cutoffTimestamp) {
              cursor.delete();
              deletedCount++;
            }
            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };
        
        request.onerror = () => resolve(0);
      } catch (error) {
        resolve(0);
      }
    });
  }

  async purgeSyncedCheckIns(cutoffTimestamp) {
    if (!this.db || !this.db.objectStoreNames.contains('offlineCheckIns')) return 0;
    
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction(['offlineCheckIns'], 'readwrite');
        const store = transaction.objectStore('offlineCheckIns');
        let deletedCount = 0;
        
        const request = store.openCursor();
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const record = cursor.value;
            if (record.synced && record.timestamp < cutoffTimestamp) {
              cursor.delete();
              deletedCount++;
            }
            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };
        
        request.onerror = () => resolve(0);
      } catch (error) {
        resolve(0);
      }
    });
  }

  async enforceMaxVisitorsLimit() {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['visitors'], 'readwrite');
      const store = transaction.objectStore('visitors');
      const allVisitors = await this.promisifyRequest(store.getAll());
      
      if (allVisitors.length > this.purgeConfig.maxCachedVisitors) {
        // Sort by cached_at, oldest first
        allVisitors.sort((a, b) => (a.cached_at || 0) - (b.cached_at || 0));
        
        // Delete oldest visitors exceeding limit
        const toDelete = allVisitors.slice(0, allVisitors.length - this.purgeConfig.maxCachedVisitors);
        
        for (const visitor of toDelete) {
          await this.promisifyRequest(store.delete(visitor.id));
        }
        
        console.log(`[OfflineService] Enforced max visitors limit: removed ${toDelete.length} old entries`);
      }
    } catch (error) {
      console.error('[OfflineService] Failed to enforce max visitors limit:', error);
    }
  }

  async securityPurge() {
    // Clear sensitive visitor data on inactivity
    if (!this.db) return;
    
    try {
      await this.clearStore('visitors');
      await this.clearStore('qrCache');
      // Keep pendingWalkIns and offlineCheckIns for sync
      // Keep preferences
      console.log('[OfflineService] Security purge completed');
      this.notifyListeners('security_purge');
    } catch (error) {
      console.error('[OfflineService] Security purge failed:', error);
    }
  }

  async clearStore(storeName) {
    if (!this.db || !this.db.objectStoreNames.contains(storeName)) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllOfflineData() {
    // Full purge - called on logout or estate change
    const stores = ['visitors', 'qrCache', 'pendingWalkIns', 'offlineCheckIns', 'apiCache'];
    
    for (const store of stores) {
      await this.clearStore(store);
    }
    
    console.log('[OfflineService] All offline data cleared');
  }

  // ==================== QR CODE OFFLINE VALIDATION ====================

  async cacheQRCodes(qrData) {
    /**
     * Cache QR code data for offline validation
     * @param {Array} qrData - Array of { qr_code, visitor_id, name, phone, status, valid_until, host_name }
     */
    if (!this.db) return;
    
    const transaction = this.db.transaction(['qrCache'], 'readwrite');
    const store = transaction.objectStore('qrCache');
    
    for (const entry of qrData) {
      await this.promisifyRequest(store.put({
        ...entry,
        cached_at: Date.now()
      }));
    }
    
    console.log(`[OfflineService] Cached ${qrData.length} QR codes for offline validation`);
  }

  async validateQRCodeOffline(qrCode) {
    /**
     * Validate a QR code against local cache
     * @param {string} qrCode - The scanned QR code
     * @returns {Object|null} - Visitor data if valid, null if not found/expired
     */
    if (!this.db) return null;
    
    try {
      const transaction = this.db.transaction(['qrCache'], 'readonly');
      const store = transaction.objectStore('qrCache');
      
      const cached = await this.promisifyRequest(store.get(qrCode));
      
      if (!cached) {
        // Try partial match (extract code from full QR string)
        return await this.searchQRCodeByPattern(qrCode);
      }
      
      // Check if still valid
      const now = Date.now();
      if (cached.valid_until && new Date(cached.valid_until).getTime() < now) {
        return { ...cached, expired: true, message: 'QR code has expired' };
      }
      
      // Check visitor status
      if (cached.status === 'REVOKED' || cached.status === 'DENIED') {
        return { ...cached, invalid: true, message: `Visitor pass has been ${cached.status.toLowerCase()}` };
      }
      
      return { ...cached, valid: true };
    } catch (error) {
      console.error('[OfflineService] QR validation error:', error);
      return null;
    }
  }

  async searchQRCodeByPattern(qrCode) {
    /**
     * Search for QR code by pattern (handles PASS-{id}-{timestamp} format)
     */
    if (!this.db) return null;
    
    try {
      // Extract visitor ID from QR code pattern
      const parts = qrCode.split('-');
      let visitorId = null;
      
      // Try different patterns
      if (parts.length >= 2 && parts[0] === 'PASS') {
        visitorId = parts[1];
      } else if (parts.length >= 1) {
        visitorId = parts[parts.length - 1]; // Last segment
      }
      
      if (!visitorId) return null;
      
      // Search by visitor ID in qrCache
      const transaction = this.db.transaction(['qrCache'], 'readonly');
      const store = transaction.objectStore('qrCache');
      const index = store.index('visitor_id');
      
      const result = await this.promisifyRequest(index.get(visitorId));
      
      if (result) {
        const now = Date.now();
        if (result.valid_until && new Date(result.valid_until).getTime() < now) {
          return { ...result, expired: true, message: 'QR code has expired' };
        }
        return { ...result, valid: true };
      }
      
      // Also search in visitors store
      const visitorTransaction = this.db.transaction(['visitors'], 'readonly');
      const visitorStore = visitorTransaction.objectStore('visitors');
      
      // Try numeric ID
      const numericId = parseInt(visitorId);
      if (!isNaN(numericId)) {
        const visitor = await this.promisifyRequest(visitorStore.get(numericId));
        if (visitor) {
          return { ...visitor, valid: true, fromVisitorCache: true };
        }
      }
      
      return null;
    } catch (error) {
      console.error('[OfflineService] QR pattern search error:', error);
      return null;
    }
  }

  async queueOfflineCheckIn(visitorId, visitorData, guardId) {
    /**
     * Queue a check-in operation for sync when online
     */
    if (!this.db) return null;
    
    const checkInData = {
      visitor_id: visitorId,
      visitor_name: visitorData?.name || 'Unknown',
      visitor_phone: visitorData?.phone || '',
      guard_id: guardId,
      action: 'check-in',
      timestamp: Date.now(),
      offline: true,
      synced: false,
      localId: this.generateLocalId()
    };
    
    try {
      const transaction = this.db.transaction(['offlineCheckIns'], 'readwrite');
      const store = transaction.objectStore('offlineCheckIns');
      
      const id = await this.promisifyRequest(store.add(checkInData));
      checkInData.id = id;
      
      // Also update local visitor cache status
      await this.updateLocalVisitorStatus(visitorId, 'ON_PREMISE');
      
      console.log('[OfflineService] Queued offline check-in:', checkInData);
      this.notifyListeners('offline_checkin_queued', checkInData);
      
      return checkInData;
    } catch (error) {
      console.error('[OfflineService] Failed to queue offline check-in:', error);
      throw error;
    }
  }

  async queueOfflineCheckOut(visitorId, visitorData, guardId) {
    /**
     * Queue a check-out operation for sync when online
     */
    if (!this.db) return null;
    
    const checkOutData = {
      visitor_id: visitorId,
      visitor_name: visitorData?.name || 'Unknown',
      visitor_phone: visitorData?.phone || '',
      guard_id: guardId,
      action: 'check-out',
      timestamp: Date.now(),
      offline: true,
      synced: false,
      localId: this.generateLocalId()
    };
    
    try {
      const transaction = this.db.transaction(['offlineCheckIns'], 'readwrite');
      const store = transaction.objectStore('offlineCheckIns');
      
      const id = await this.promisifyRequest(store.add(checkOutData));
      checkOutData.id = id;
      
      // Update local visitor cache status
      await this.updateLocalVisitorStatus(visitorId, 'CHECKED_OUT');
      
      console.log('[OfflineService] Queued offline check-out:', checkOutData);
      this.notifyListeners('offline_checkout_queued', checkOutData);
      
      return checkOutData;
    } catch (error) {
      console.error('[OfflineService] Failed to queue offline check-out:', error);
      throw error;
    }
  }

  async updateLocalVisitorStatus(visitorId, newStatus) {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['visitors'], 'readwrite');
      const store = transaction.objectStore('visitors');
      
      const visitor = await this.promisifyRequest(store.get(visitorId));
      if (visitor) {
        visitor.status = newStatus;
        visitor.pending_sync = true;
        visitor.local_updated_at = Date.now();
        await this.promisifyRequest(store.put(visitor));
      }
    } catch (error) {
      console.error('[OfflineService] Failed to update local visitor status:', error);
    }
  }

  async getPendingOfflineCheckIns() {
    if (!this.db) return [];
    
    try {
      const transaction = this.db.transaction(['offlineCheckIns'], 'readonly');
      const store = transaction.objectStore('offlineCheckIns');
      const index = store.index('synced');
      
      return await this.promisifyRequest(index.getAll(false));
    } catch (error) {
      console.error('[OfflineService] Failed to get pending check-ins:', error);
      return [];
    }
  }

  async markCheckInSynced(localId) {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['offlineCheckIns'], 'readwrite');
      const store = transaction.objectStore('offlineCheckIns');
      
      const allRecords = await this.promisifyRequest(store.getAll());
      const record = allRecords.find(r => r.localId === localId);
      
      if (record) {
        record.synced = true;
        record.synced_at = Date.now();
        await this.promisifyRequest(store.put(record));
      }
    } catch (error) {
      console.error('[OfflineService] Failed to mark check-in synced:', error);
    }
  }

  // ==================== WALK-IN REGISTRATION OFFLINE ====================

  async queueWalkInRegistration(walkInData) {
    /**
     * Queue a walk-in registration for sync when online
     */
    if (!this.db) return null;
    
    const registration = {
      ...walkInData,
      localId: walkInData.localId || this.generateLocalId(),
      timestamp: Date.now(),
      synced: false,
      registeredOffline: true
    };
    
    try {
      const transaction = this.db.transaction(['pendingWalkIns'], 'readwrite');
      const store = transaction.objectStore('pendingWalkIns');
      
      await this.promisifyRequest(store.put(registration));
      
      console.log('[OfflineService] Queued offline walk-in registration:', registration.localId);
      this.notifyListeners('offline_walkin_queued', registration);
      
      return registration;
    } catch (error) {
      console.error('[OfflineService] Failed to queue walk-in registration:', error);
      throw error;
    }
  }

  async getPendingWalkIns() {
    if (!this.db) return [];
    
    try {
      const transaction = this.db.transaction(['pendingWalkIns'], 'readonly');
      const store = transaction.objectStore('pendingWalkIns');
      const index = store.index('synced');
      
      return await this.promisifyRequest(index.getAll(false));
    } catch (error) {
      console.error('[OfflineService] Failed to get pending walk-ins:', error);
      return [];
    }
  }

  async getAllWalkIns() {
    if (!this.db) return [];
    
    try {
      const transaction = this.db.transaction(['pendingWalkIns'], 'readonly');
      const store = transaction.objectStore('pendingWalkIns');
      
      const walkIns = await this.promisifyRequest(store.getAll());
      return walkIns.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('[OfflineService] Failed to get all walk-ins:', error);
      return [];
    }
  }

  async markWalkInSynced(localId, serverId) {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['pendingWalkIns'], 'readwrite');
      const store = transaction.objectStore('pendingWalkIns');
      
      const record = await this.promisifyRequest(store.get(localId));
      
      if (record) {
        record.synced = true;
        record.synced_at = Date.now();
        record.server_id = serverId;
        await this.promisifyRequest(store.put(record));
      }
    } catch (error) {
      console.error('[OfflineService] Failed to mark walk-in synced:', error);
    }
  }

  async updateWalkInWithServerData(localId, serverData) {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['pendingWalkIns'], 'readwrite');
      const store = transaction.objectStore('pendingWalkIns');
      
      const record = await this.promisifyRequest(store.get(localId));
      
      if (record) {
        Object.assign(record, serverData, {
          synced: true,
          synced_at: Date.now()
        });
        await this.promisifyRequest(store.put(record));
      }
    } catch (error) {
      console.error('[OfflineService] Failed to update walk-in with server data:', error);
    }
  }

  // ==================== SYNC OPERATIONS ====================

  async syncPendingOperations() {
    if (!this.isOnline) {
      console.log('[OfflineService] Cannot sync - offline');
      return { success: false, reason: 'offline' };
    }
    
    const results = {
      checkIns: { synced: 0, failed: 0 },
      walkIns: { synced: 0, failed: 0 }
    };
    
    try {
      // Sync offline check-ins/check-outs
      const pendingCheckIns = await this.getPendingOfflineCheckIns();
      for (const checkIn of pendingCheckIns) {
        try {
          const endpoint = checkIn.action === 'check-in' 
            ? `/api/visitors/${checkIn.visitor_id}/check-in`
            : `/api/visitors/${checkIn.visitor_id}/check-out`;
          
          const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              offlineTimestamp: checkIn.timestamp,
              offlineLocalId: checkIn.localId
            })
          });
          
          if (response.ok) {
            await this.markCheckInSynced(checkIn.localId);
            results.checkIns.synced++;
          } else {
            results.checkIns.failed++;
          }
        } catch (error) {
          console.error('[OfflineService] Failed to sync check-in:', error);
          results.checkIns.failed++;
        }
      }
      
      // Sync offline walk-ins
      const pendingWalkIns = await this.getPendingWalkIns();
      for (const walkIn of pendingWalkIns) {
        try {
          const response = await fetch('/api/visitors/walk-in', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...walkIn,
              offlineLocalId: walkIn.localId
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            await this.markWalkInSynced(walkIn.localId, result.data?.id);
            results.walkIns.synced++;
          } else {
            results.walkIns.failed++;
          }
        } catch (error) {
          console.error('[OfflineService] Failed to sync walk-in:', error);
          results.walkIns.failed++;
        }
      }
      
      console.log('[OfflineService] Sync completed:', results);
      this.notifyListeners('sync_completed', results);
      
      return { success: true, results };
    } catch (error) {
      console.error('[OfflineService] Sync failed:', error);
      return { success: false, error: error.message };
    }
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

  generateLocalId() {
    return `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

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

  // ==================== QR CACHE INITIALIZATION ====================

  async fetchAndCacheQRData() {
    /**
     * Fetch today's expected visitors and cache for offline QR validation
     * Should be called when guard logs in or periodically
     */
    if (!this.isOnline) {
      console.log('[OfflineService] Cannot fetch QR cache - offline');
      return false;
    }

    try {
      const response = await fetch('/api/guards/qr-cache', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data?.visitors) {
        await this.cacheQRCodes(result.data.visitors);
        console.log(`[OfflineService] Cached ${result.data.count} QR codes for offline validation`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[OfflineService] Failed to fetch QR cache:', error);
      return false;
    }
  }

  async fetchOfflinePolicy() {
    /**
     * Fetch estate-specific offline policy
     */
    if (!this.isOnline) return false;

    try {
      const response = await fetch('/api/guards/offline-policy', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        await this.configurePurgePolicy(result.data);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[OfflineService] Failed to fetch offline policy:', error);
      return false;
    }
  }

  async initializeForGuard() {
    /**
     * Initialize offline service for guard role
     * Call this after guard login
     */
    console.log('[OfflineService] Initializing for guard...');
    
    // Fetch offline policy
    await this.fetchOfflinePolicy();
    
    // Fetch QR cache
    await this.fetchAndCacheQRData();
    
    // Sync any pending operations
    if (this.isOnline) {
      await this.syncPendingOperations();
    }
    
    console.log('[OfflineService] Guard initialization complete');
  }

  // ==================== RESIDENT OFFLINE METHODS ====================

  async cacheFavoriteVisitors(favorites, residentId) {
    /**
     * Cache favorite visitors for offline quick-invite
     */
    if (!this.db || !favorites?.length) return;

    try {
      const transaction = this.db.transaction(['favoriteVisitors'], 'readwrite');
      const store = transaction.objectStore('favoriteVisitors');

      // Clear existing for this resident
      const index = store.index('resident_id');
      const range = IDBKeyRange.only(residentId);
      const cursor = index.openCursor(range);
      
      await new Promise((resolve, reject) => {
        cursor.onsuccess = (event) => {
          const result = event.target.result;
          if (result) {
            result.delete();
            result.continue();
          } else {
            resolve();
          }
        };
        cursor.onerror = reject;
      });

      // Add new favorites
      for (const favorite of favorites) {
        await new Promise((resolve, reject) => {
          const request = store.put({
            ...favorite,
            resident_id: residentId,
            cached_at: Date.now()
          });
          request.onsuccess = resolve;
          request.onerror = reject;
        });
      }

      console.log(`[OfflineService] Cached ${favorites.length} favorite visitors`);
    } catch (error) {
      console.error('[OfflineService] Failed to cache favorites:', error);
    }
  }

  async getCachedFavorites(residentId) {
    /**
     * Get cached favorite visitors for offline use
     */
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['favoriteVisitors'], 'readonly');
      const store = transaction.objectStore('favoriteVisitors');
      const index = store.index('resident_id');
      const request = index.getAll(IDBKeyRange.only(residentId));

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async cacheRecurringPasses(passes, residentId) {
    /**
     * Cache recurring passes for offline reference
     */
    if (!this.db || !passes?.length) return;

    try {
      const transaction = this.db.transaction(['recurringPasses'], 'readwrite');
      const store = transaction.objectStore('recurringPasses');

      // Clear existing for this resident
      const index = store.index('resident_id');
      const range = IDBKeyRange.only(residentId);
      const cursor = index.openCursor(range);
      
      await new Promise((resolve, reject) => {
        cursor.onsuccess = (event) => {
          const result = event.target.result;
          if (result) {
            result.delete();
            result.continue();
          } else {
            resolve();
          }
        };
        cursor.onerror = reject;
      });

      // Add new passes
      for (const pass of passes) {
        await new Promise((resolve, reject) => {
          const request = store.put({
            ...pass,
            resident_id: residentId,
            cached_at: Date.now()
          });
          request.onsuccess = resolve;
          request.onerror = reject;
        });
      }

      console.log(`[OfflineService] Cached ${passes.length} recurring passes`);
    } catch (error) {
      console.error('[OfflineService] Failed to cache recurring passes:', error);
    }
  }

  async getCachedRecurringPasses(residentId) {
    /**
     * Get cached recurring passes for offline use
     */
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['recurringPasses'], 'readonly');
      const store = transaction.objectStore('recurringPasses');
      const index = store.index('resident_id');
      const request = index.getAll(IDBKeyRange.only(residentId));

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async queueOfflineInvite(inviteData) {
    /**
     * Queue an invite for sync when online
     */
    if (!this.db) return null;

    const localId = `offline_invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingInvites'], 'readwrite');
      const store = transaction.objectStore('pendingInvites');

      const request = store.put({
        localId,
        ...inviteData,
        timestamp: Date.now(),
        synced: false
      });

      request.onsuccess = () => {
        console.log('[OfflineService] Queued offline invite:', localId);
        resolve(localId);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingInvites() {
    /**
     * Get pending invites awaiting sync
     */
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingInvites'], 'readonly');
      const store = transaction.objectStore('pendingInvites');
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(false));

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async markInviteSynced(localId) {
    /**
     * Mark an invite as synced
     */
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingInvites'], 'readwrite');
      const store = transaction.objectStore('pendingInvites');
      const request = store.get(localId);

      request.onsuccess = () => {
        const data = request.result;
        if (data) {
          data.synced = true;
          data.syncedAt = Date.now();
          store.put(data);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async syncPendingInvites() {
    /**
     * Sync all pending invites when online
     */
    if (!this.isOnline) return { synced: 0, failed: 0 };

    const pending = await this.getPendingInvites();
    let synced = 0;
    let failed = 0;

    for (const invite of pending) {
      try {
        const response = await fetch('/api/visitors', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: invite.name,
            phone: invite.phone,
            dateOfVisit: invite.dateOfVisit,
            timeOfVisit: invite.timeOfVisit,
            purpose: invite.purpose,
            offlineCreated: true,
            offlineId: invite.localId
          })
        });

        if (response.ok) {
          await this.markInviteSynced(invite.localId);
          synced++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error('[OfflineService] Failed to sync invite:', invite.localId, error);
        failed++;
      }
    }

    console.log(`[OfflineService] Synced invites: ${synced} success, ${failed} failed`);
    return { synced, failed };
  }

  async initializeForResident(residentId) {
    /**
     * Initialize offline service for resident role
     * Call this after resident login
     */
    console.log('[OfflineService] Initializing for resident...');

    try {
      // Fetch and cache favorites
      const favResponse = await fetch('/api/resident/favorites', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (favResponse.ok) {
        const favData = await favResponse.json();
        if (favData.success && favData.data) {
          await this.cacheFavoriteVisitors(favData.data, residentId);
        }
      }

      // Fetch and cache recurring passes
      const passResponse = await fetch('/api/recurring-passes', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (passResponse.ok) {
        const passData = await passResponse.json();
        if (passData.success && passData.data) {
          await this.cacheRecurringPasses(passData.data, residentId);
        }
      }

      // Sync any pending offline invites
      if (this.isOnline) {
        await this.syncPendingInvites();
      }

      console.log('[OfflineService] Resident initialization complete');
    } catch (error) {
      console.error('[OfflineService] Resident initialization failed:', error);
    }
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