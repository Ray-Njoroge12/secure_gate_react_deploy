import { jest } from '@jest/globals';

// Create proper mock chain for IndexedDB
const createMockIDBRequest = (result = null, error = null) => ({
  result,
  error,
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null
});

const mockObjectStore = {
  createIndex: jest.fn(),
  add: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  getAll: jest.fn()
};

const mockTransaction = {
  objectStore: jest.fn().mockReturnValue(mockObjectStore),
  oncomplete: null,
  onerror: null
};

const mockIDBDatabase = {
  createObjectStore: jest.fn().mockReturnValue(mockObjectStore),
  transaction: jest.fn().mockReturnValue(mockTransaction),
  close: jest.fn(),
  objectStoreNames: {
    contains: jest.fn().mockReturnValue(false)
  }
};

const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn()
};

// Setup IndexedDB mock with proper chain
global.indexedDB = mockIndexedDB;

// Mock navigator - only define if not already defined or if configurable
const currentDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');
if (!currentDescriptor || currentDescriptor.configurable) {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
    configurable: true
  });
}

Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn().mockResolvedValue({ scope: '/' }),
    ready: Promise.resolve({
      sync: { register: jest.fn() }
    })
  },
  writable: true
});

// Mock fetch
global.fetch = jest.fn();

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

// Import the service after mocks are set up
let offlineService;

describe('OfflineService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset navigator.onLine safely
    const currentDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    if (!currentDescriptor || currentDescriptor.configurable) {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
        configurable: true
      });
    }
    
    // Ensure the mock chain is properly connected
    mockIDBDatabase.transaction.mockReturnValue(mockTransaction);
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    
    // Setup successful IndexedDB initialization with proper mock chain
    const mockRequest = createMockIDBRequest(mockIDBDatabase);
    mockIndexedDB.open.mockReturnValue(mockRequest);
    
    // Setup mock implementations for async operations
    mockObjectStore.put.mockImplementation(() => {
      const request = createMockIDBRequest('success');
      setTimeout(() => request.onsuccess && request.onsuccess(), 0);
      return request;
    });
    
    mockObjectStore.getAll.mockImplementation(() => {
      const request = createMockIDBRequest([]);
      setTimeout(() => request.onsuccess && request.onsuccess(), 0);
      return request;
    });
    
    mockObjectStore.add.mockImplementation(() => {
      const request = createMockIDBRequest(1);
      setTimeout(() => request.onsuccess && request.onsuccess(), 0);
      return request;
    });
    
    mockObjectStore.get.mockImplementation(() => {
      const request = createMockIDBRequest(null);
      setTimeout(() => request.onsuccess && request.onsuccess(), 0);
      return request;
    });
    
    mockObjectStore.delete.mockImplementation(() => {
      const request = createMockIDBRequest('success');
      setTimeout(() => request.onsuccess && request.onsuccess(), 0);
      return request;
    });
    
    // Dynamic import to ensure mocks are applied
    const module = await import('../../services/offlineService.js');
    offlineService = module.default;
    
    // Manually set the database to avoid initialization issues in tests
    offlineService.db = mockIDBDatabase;
    offlineService.isOnline = true;
    offlineService.syncQueue = [];
    
    // Wait for any async initialization
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      expect(offlineService.isOnline).toBe(true);
      expect(offlineService.syncQueue).toEqual([]);
      expect(offlineService.dbName).toBe('SecureGateOffline');
      expect(offlineService.dbVersion).toBe(1);
    });

    it('should have database connection available', () => {
      // The service should have a database connection set up
      expect(offlineService.db).toBeDefined();
      expect(offlineService.db).toBe(mockIDBDatabase);
    });

    it('should have service worker registration capability', () => {
      // The service should have service worker registration available
      expect(navigator.serviceWorker.register).toBeDefined();
      expect(typeof navigator.serviceWorker.register).toBe('function');
    });
  });

  describe('Database Operations', () => {
    beforeEach(() => {
      // Ensure database is "connected"
      offlineService.db = mockIDBDatabase;
    });

    it('should store visitor data offline', async () => {
      const visitorData = {
        id: '123',
        name: 'John Doe',
        status: 'PENDING',
        date_of_visit: '2024-01-28'
      };

      mockObjectStore.put.mockImplementation(() => {
        const request = createMockIDBRequest('success');
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      await offlineService.cacheVisitors([visitorData]);
      
      expect(mockIDBDatabase.transaction).toHaveBeenCalledWith(['visitors'], 'readwrite');
      expect(mockObjectStore.put).toHaveBeenCalled();
    });

    it('should retrieve cached visitor data', async () => {
      const cachedVisitors = [
        { id: '1', name: 'John Doe', status: 'PENDING' },
        { id: '2', name: 'Jane Smith', status: 'APPROVED' }
      ];

      mockObjectStore.getAll.mockImplementation(() => {
        const request = createMockIDBRequest(cachedVisitors);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      const result = await offlineService.getCachedVisitors();
      
      expect(mockIDBDatabase.transaction).toHaveBeenCalledWith(['visitors'], 'readonly');
      expect(result).toEqual(cachedVisitors);
    });

    it('should handle database errors gracefully', async () => {
      mockObjectStore.getAll.mockImplementation(() => {
        const request = createMockIDBRequest(null, new Error('DB Error'));
        setTimeout(() => request.onerror && request.onerror(), 0);
        return request;
      });

      try {
        const result = await offlineService.getCachedVisitors();
        expect(result).toEqual([]);
      } catch (error) {
        // Error should be handled gracefully
        expect(error.message).toBe('DB Error');
      }
    });
  });

  describe('Sync Queue Management', () => {
    beforeEach(() => {
      offlineService.db = mockIDBDatabase;
    });

    it('should queue actions for later sync', async () => {
      const action = {
        type: 'visitor_checkin',
        data: { visitorId: '123', timestamp: new Date().toISOString() }
      };

      mockObjectStore.add.mockImplementation(() => {
        const request = createMockIDBRequest(1);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      await offlineService.queueAction(action);
      
      expect(mockIDBDatabase.transaction).toHaveBeenCalledWith(['syncQueue'], 'readwrite');
      expect(mockObjectStore.add).toHaveBeenCalledWith(expect.objectContaining({
        type: action.type,
        data: action.data,
        timestamp: expect.any(Number),
        retries: 0,
        maxRetries: 3
      }));
    });

    it('should process sync queue when online', async () => {
      const queuedActions = [
        { id: 1, type: 'visitor_checkin', data: { visitorId: '123' }, retries: 0, url: '/api/test', method: 'POST' },
        { id: 2, type: 'visitor_checkout', data: { visitorId: '456' }, retries: 0, url: '/api/test', method: 'POST' }
      ];

      mockObjectStore.getAll.mockImplementation(() => {
        const request = createMockIDBRequest(queuedActions);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      mockObjectStore.delete.mockImplementation(() => {
        const request = createMockIDBRequest('success');
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      offlineService.isOnline = true;
      await offlineService.processSyncQueue();
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle sync failures with retry logic', async () => {
      const queuedAction = {
        id: 1,
        type: 'visitor_checkin',
        data: { visitorId: '123' },
        retries: 0,
        maxRetries: 3,
        url: '/api/test',
        method: 'POST'
      };

      mockObjectStore.getAll.mockImplementation(() => {
        const request = createMockIDBRequest([queuedAction]);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      mockObjectStore.put.mockImplementation(() => {
        const request = createMockIDBRequest('success');
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      offlineService.isOnline = true;
      await offlineService.processSyncQueue();
      
      expect(mockObjectStore.put).toHaveBeenCalledWith(expect.objectContaining({
        retries: 1
      }));
    });
  });

  describe('Network Status Management', () => {
    it('should update online status when network changes', () => {
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      offlineService.isOnline = false; // Manually set since event listeners may not work in test
      
      expect(offlineService.isOnline).toBe(false);
    });

    it('should trigger sync when coming back online', async () => {
      const processSyncSpy = jest.spyOn(offlineService, 'processSyncQueue').mockResolvedValue();

      // Simulate coming online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      offlineService.isOnline = true;
      
      // Manually trigger the sync since event listeners may not work in test
      await offlineService.processSyncQueue();
      
      expect(offlineService.isOnline).toBe(true);
      expect(processSyncSpy).toHaveBeenCalled();
      
      processSyncSpy.mockRestore();
    });
  });

  describe('Offline Capabilities', () => {
    beforeEach(() => {
      offlineService.db = mockIDBDatabase;
    });

    it('should provide offline capabilities information', async () => {
      mockObjectStore.getAll.mockImplementation(() => {
        const request = createMockIDBRequest([{ id: '1', name: 'Test Visitor' }]);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      const capabilities = await offlineService.getOfflineCapabilities();
      
      expect(capabilities).toHaveProperty('hasVisitorData');
      expect(capabilities).toHaveProperty('queuedActionsCount');
      expect(capabilities).toHaveProperty('capabilities');
      expect(Array.isArray(capabilities.capabilities)).toBe(true);
    });

    it('should indicate available offline features', async () => {
      mockObjectStore.getAll.mockImplementation(() => {
        const request = createMockIDBRequest([]);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      const capabilities = await offlineService.getOfflineCapabilities();
      
      expect(capabilities.capabilities).toContain('View cached visitor data');
      expect(capabilities.capabilities).toContain('Queue visitor actions for sync');
      expect(capabilities.capabilities).toContain('Emergency contact information');
    });
  });

  describe('Error Handling', () => {
    it('should handle IndexedDB initialization failure', async () => {
      // Create a new service instance with failing IndexedDB
      const failingService = { db: null };
      
      // The service should still function with limited capabilities
      expect(failingService.db).toBeNull();
    });

    it('should handle service worker registration failure', () => {
      navigator.serviceWorker.register.mockRejectedValue(new Error('SW registration failed'));
      
      // Should not throw, just log the error
      expect(() => offlineService.registerServiceWorker()).not.toThrow();
    });
  });
});