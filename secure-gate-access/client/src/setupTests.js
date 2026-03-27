import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

// MSW Setup
import { server } from './mocks/server';

expect.extend(toHaveNoViolations);

// Set global test timeout to prevent hanging tests
jest.setTimeout(10000);

// Mock logger for ErrorProvider
jest.mock('utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

// Mock error queue service for ErrorProvider
jest.mock('./services/errorQueueService', () => ({
  default: {
    addError: jest.fn(),
    getErrors: jest.fn(() => []),
    clearAll: jest.fn(),
    removeError: jest.fn()
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock IndexedDB
const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

const mockObjectStore = {
  add: jest.fn().mockReturnValue(mockIDBRequest),
  get: jest.fn().mockReturnValue(mockIDBRequest),
  put: jest.fn().mockReturnValue(mockIDBRequest),
  delete: jest.fn().mockReturnValue(mockIDBRequest),
  getAll: jest.fn().mockReturnValue(mockIDBRequest),
  clear: jest.fn().mockReturnValue(mockIDBRequest),
  createIndex: jest.fn(),
  index: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue(mockIDBRequest),
    getAll: jest.fn().mockReturnValue(mockIDBRequest)
  })
};

const mockTransaction = {
  objectStore: jest.fn().mockReturnValue(mockObjectStore),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  abort: jest.fn(),
  commit: jest.fn()
};

const mockDatabase = {
  transaction: jest.fn().mockReturnValue(mockTransaction),
  close: jest.fn(),
  createObjectStore: jest.fn().mockReturnValue(mockObjectStore),
  deleteObjectStore: jest.fn(),
  version: 1,
  name: 'OfflineDB',
  objectStoreNames: ['visitors', 'actions', 'preferences']
};

global.indexedDB = {
  open: jest.fn().mockReturnValue({
    ...mockIDBRequest,
    result: mockDatabase,
    onupgradeneeded: null
  }),
  deleteDatabase: jest.fn().mockReturnValue(mockIDBRequest)
};

// Mock Service Worker
global.ServiceWorkerRegistration = {
  prototype: {
    sync: {
      register: jest.fn().mockResolvedValue()
    },
    pushManager: {
      getSubscription: jest.fn().mockResolvedValue(null),
      subscribe: jest.fn().mockResolvedValue({
        endpoint: 'https://example.com/push',
        keys: {
          p256dh: 'test-key',
          auth: 'test-auth'
        }
      })
    }
  }
};

Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn().mockResolvedValue({
      installing: null,
      waiting: null,
      active: {
        postMessage: jest.fn()
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      sync: {
        register: jest.fn().mockResolvedValue()
      },
      pushManager: {
        getSubscription: jest.fn().mockResolvedValue(null),
        subscribe: jest.fn().mockResolvedValue({
          endpoint: 'https://example.com/push',
          keys: {
            p256dh: 'test-key',
            auth: 'test-auth'
          }
        })
      }
    }),
    ready: Promise.resolve({
      active: {
        postMessage: jest.fn()
      },
      sync: {
        register: jest.fn().mockResolvedValue()
      },
      pushManager: {
        getSubscription: jest.fn().mockResolvedValue(null),
        subscribe: jest.fn().mockResolvedValue({
          endpoint: 'https://example.com/push',
          keys: {
            p256dh: 'test-key',
            auth: 'test-auth'
          }
        })
      }
    }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  },
  writable: true
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock Notification API
global.Notification = {
  permission: 'granted',
  requestPermission: jest.fn().mockResolvedValue('granted')
};

// Mock PushManager
global.PushManager = {
  supportedContentEncodings: ['aes128gcm']
};

// Mock window.matchMedia for theme context
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
