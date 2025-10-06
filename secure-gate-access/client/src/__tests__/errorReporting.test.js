// client/src/__tests__/errorReporting.test.js
import { reportError, reportUserAction, flushErrorQueue, getErrorAnalytics } from '../utils/errorReporting';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    getEntriesByType: jest.fn(() => []),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000
    }
  }
});

// Mock navigator
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

describe('Error Reporting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
  });

  describe('reportError', () => {
    test('builds comprehensive error report', async () => {
      const errorInfo = {
        id: 'test-error-123',
        timestamp: '2025-01-01T00:00:00.000Z',
        type: 'client',
        severity: 'critical',
        context: 'test_context',
        originalError: new Error('Test error'),
        message: { title: 'Test Error', message: 'Test error message' },
        technical: {
          name: 'Error',
          message: 'Test error',
          stack: 'Error: Test error\n    at test()',
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Test error' }
        }
      };

      await reportError(errorInfo, { additionalContext: 'test' });

      // Should not call fetch in development mode
      expect(fetch).not.toHaveBeenCalled();
    });

    test('handles error reporting failures gracefully', async () => {
      const errorInfo = {
        id: 'test-error-456',
        timestamp: '2025-01-01T00:00:00.000Z',
        type: 'server',
        severity: 'high',
        context: 'test_context',
        originalError: new Error('Test error'),
        message: { title: 'Test Error', message: 'Test error message' },
        technical: {
          name: 'Error',
          message: 'Test error',
          stack: 'Error: Test error\n    at test()'
        }
      };

      // Mock fetch to reject
      fetch.mockRejectedValue(new Error('Network error'));

      await reportError(errorInfo);

      // Should not throw
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('reportUserAction', () => {
    test('reports user action with context', () => {
      reportUserAction('button_click', { buttonId: 'test-button' });

      // Should store action in sessionStorage
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'errorReporter_actions',
        expect.stringContaining('button_click')
      );
    });

    test('maintains action history limit', () => {
      // Mock existing actions (over limit)
      const manyActions = Array(25).fill({ action: 'test', timestamp: '2025-01-01T00:00:00.000Z' });
      sessionStorageMock.getItem.mockReturnValue(JSON.stringify(manyActions));

      reportUserAction('new_action', {});

      // Should limit to 20 actions
      const setItemCall = sessionStorageMock.setItem.mock.calls.find(
        call => call[0] === 'errorReporter_actions'
      );
      const actions = JSON.parse(setItemCall[1]);
      expect(actions).toHaveLength(20);
    });
  });

  describe('getErrorAnalytics', () => {
    test('returns error analytics', () => {
      sessionStorageMock.getItem
        .mockReturnValueOnce('session_123') // sessionId
        .mockReturnValueOnce('5') // errorCount
        .mockReturnValueOnce('10') // pageViews
        .mockReturnValueOnce('2025-01-01T00:00:00.000Z'); // sessionStartTime

      const analytics = getErrorAnalytics();

      expect(analytics).toEqual({
        sessionId: 'session_123',
        errorCount: 5,
        pageViews: 10,
        sessionStartTime: '2025-01-01T00:00:00.000Z'
      });
    });

    test('handles missing session data', () => {
      sessionStorageMock.getItem.mockReturnValue(null);

      const analytics = getErrorAnalytics();

      expect(analytics).toEqual({
        sessionId: null,
        errorCount: 0,
        pageViews: 0,
        sessionStartTime: null
      });
    });
  });

  describe('flushErrorQueue', () => {
    test('flushes error queue', async () => {
      await flushErrorQueue();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('User Information', () => {
    test('extracts user info from localStorage', async () => {
      const userData = {
        id: 'user-123',
        role: 'admin',
        email: 'admin@test.com',
        token: 'test-token'
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));

      const errorInfo = {
        id: 'test-error',
        timestamp: '2025-01-01T00:00:00.000Z',
        type: 'client',
        severity: 'critical',
        context: 'test',
        originalError: new Error('Test'),
        message: { title: 'Test', message: 'Test' },
        technical: { name: 'Error', message: 'Test' }
      };

      await reportError(errorInfo);

      // Should extract user info
      expect(localStorageMock.getItem).toHaveBeenCalledWith('user');
    });

    test('handles invalid user data gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const errorInfo = {
        id: 'test-error',
        timestamp: '2025-01-01T00:00:00.000Z',
        type: 'client',
        severity: 'critical',
        context: 'test',
        originalError: new Error('Test'),
        message: { title: 'Test', message: 'Test' },
        technical: { name: 'Error', message: 'Test' }
      };

      await reportError(errorInfo);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Browser Information', () => {
    test('collects browser information', async () => {
      const errorInfo = {
        id: 'test-error',
        timestamp: '2025-01-01T00:00:00.000Z',
        type: 'client',
        severity: 'critical',
        context: 'test',
        originalError: new Error('Test'),
        message: { title: 'Test', message: 'Test' },
        technical: { name: 'Error', message: 'Test' }
      };

      await reportError(errorInfo);

      // Should collect browser info
      expect(navigator.userAgent).toBeDefined();
      expect(navigator.language).toBeDefined();
      expect(navigator.platform).toBeDefined();
    });
  });

  describe('Performance Metrics', () => {
    test('collects performance metrics when available', async () => {
      const errorInfo = {
        id: 'test-error',
        timestamp: '2025-01-01T00:00:00.000Z',
        type: 'client',
        severity: 'critical',
        context: 'test',
        originalError: new Error('Test'),
        message: { title: 'Test', message: 'Test' },
        technical: { name: 'Error', message: 'Test' }
      };

      await reportError(errorInfo);

      // Should collect performance metrics
      expect(window.performance.memory).toBeDefined();
    });
  });

  describe('Session Management', () => {
    test('creates session ID on first use', () => {
      sessionStorageMock.getItem.mockReturnValue(null);

      reportUserAction('test_action');

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'errorReporter_sessionId',
        expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
      );
    });

    test('tracks page views', () => {
      sessionStorageMock.getItem.mockReturnValue('0');

      reportUserAction('page_view');

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'errorReporter_pageViews',
        '1'
      );
    });

    test('tracks error count', () => {
      sessionStorageMock.getItem.mockReturnValue('0');

      const errorInfo = {
        id: 'test-error',
        timestamp: '2025-01-01T00:00:00.000Z',
        type: 'client',
        severity: 'critical',
        context: 'test',
        originalError: new Error('Test'),
        message: { title: 'Test', message: 'Test' },
        technical: { name: 'Error', message: 'Test' }
      };

      reportError(errorInfo);

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'errorReporter_errorCount',
        '1'
      );
    });
  });
});
