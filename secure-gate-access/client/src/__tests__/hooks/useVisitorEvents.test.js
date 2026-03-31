import { renderHook, act } from '@testing-library/react';
import { useVisitorEvents, VISITOR_EVENTS } from '../../hooks/useVisitorEvents';

// Mock fetch for initial stats
global.fetch = jest.fn();

jest.mock('../../hooks/useWebSocket', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    lastMessage: null,
    isConnected: true,
    connectionState: 'connected',
    emit: jest.fn()
  })
}));

jest.mock('../../utils/notificationAudio', () => ({
  playNotificationTone: jest.fn().mockResolvedValue(true),
  supportsNotificationAudio: jest.fn().mockReturnValue(false) // silent in tests
}));

const useWebSocket = require('../../hooks/useWebSocket').default;

const makeWsReturn = (overrides = {}) => ({
  lastMessage: null,
  isConnected: true,
  connectionState: 'connected',
  emit: jest.fn(),
  ...overrides
});

describe('useVisitorEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-assign fetch each time since clearAllMocks may clear its implementation
    global.fetch = jest.fn().mockImplementation(() => Promise.resolve({ ok: false }));
    useWebSocket.mockReturnValue(makeWsReturn());
  });

  test('initialises with zero live stats', () => {
    const { result } = renderHook(() => useVisitorEvents({}));
    expect(result.current.liveStats.todayCheckIns).toBe(0);
    expect(result.current.liveStats.currentlyOnPremises).toBe(0);
    expect(result.current.liveStats.pendingApprovals).toBe(0);
    expect(result.current.liveStats.recentArrivals).toBe(0);
  });

  test('increments todayCheckIns and currentlyOnPremises on CHECK_IN message', () => {
    const { result, rerender } = renderHook(() => useVisitorEvents({}));

    act(() => {
      useWebSocket.mockReturnValue(makeWsReturn({
        lastMessage: {
          type: VISITOR_EVENTS.CHECK_IN,
          visitorId: 'v1',
          timestamp: '2026-03-30T10:00:00.000Z',
          estateId: 'e1'
        }
      }));
    });

    rerender();

    expect(result.current.liveStats.todayCheckIns).toBe(1);
    expect(result.current.liveStats.currentlyOnPremises).toBe(1);
  });

  test('deduplicates events with the same fingerprint in recentEvents', () => {
    const { result, rerender } = renderHook(() => useVisitorEvents({}));

    const sameEvent = {
      id: 'dedupe-test',
      type: VISITOR_EVENTS.ARRIVAL,
      visitorId: 'v3',
      timestamp: '2026-03-30T10:00:00.000Z',
      estateId: 'e1'
    };

    act(() => {
      useWebSocket.mockReturnValue(makeWsReturn({ lastMessage: sameEvent }));
    });
    rerender();

    // Deliver a second message with different object reference but same content
    act(() => {
      useWebSocket.mockReturnValue(makeWsReturn({ lastMessage: { ...sameEvent } }));
    });
    rerender();

    // Deduplication in recentEvents: same type+visitorId+timestamp fingerprint
    // should result in at most 1 entry
    expect(result.current.recentEvents.length).toBeLessThanOrEqual(1);
  });

  test('sets connectionStatus to connected when WebSocket is connected', () => {
    useWebSocket.mockReturnValue(makeWsReturn({ isConnected: true }));
    const { result } = renderHook(() => useVisitorEvents({}));
    // The hook's useEffect sets 'connected' when isConnected === true
    expect(result.current.connectionStatus).toBe('connected');
  });
});
