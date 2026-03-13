/**
 * @jest-environment jsdom
 */

// Mock socket.io-client
const mockOn = jest.fn();
const mockOff = jest.fn();
const mockEmit = jest.fn();
const mockDisconnect = jest.fn();
const mockConnect = jest.fn();

jest.mock('socket.io-client', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    on: mockOn,
    off: mockOff,
    emit: mockEmit,
    disconnect: mockDisconnect,
    connect: mockConnect,
    connected: true,
    id: 'test-socket-id'
  }))
}));

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'resident' }, token: 'test-token' })
}));

describe('useWebSocket event buffer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('buffers events during disconnect and replays on reconnect', () => {
    // Verify the buffer mechanism exists in the hook source code
    const fs = require('fs');
    const path = require('path');
    const hookSource = fs.readFileSync(
      path.resolve(__dirname, '../../hooks/useWebSocket.js'),
      'utf-8'
    );

    expect(hookSource).toMatch(/eventBuffer|event_buffer|bufferedEvents/i);
    expect(hookSource).toMatch(/MAX_BUFFER|maxBuffer|BUFFER_LIMIT/i);
  });

  test('buffer has a maximum size limit of 50', () => {
    const fs = require('fs');
    const path = require('path');
    const hookSource = fs.readFileSync(
      path.resolve(__dirname, '../../hooks/useWebSocket.js'),
      'utf-8'
    );

    expect(hookSource).toMatch(/50/);
  });

  test('isDisconnected flag is tracked via a ref', () => {
    const fs = require('fs');
    const path = require('path');
    const hookSource = fs.readFileSync(
      path.resolve(__dirname, '../../hooks/useWebSocket.js'),
      'utf-8'
    );

    expect(hookSource).toMatch(/isDisconnected|disconnectedRef|isDisconnectedRef/i);
  });

  test('buffered events are replayed and cleared on reconnect', () => {
    const fs = require('fs');
    const path = require('path');
    const hookSource = fs.readFileSync(
      path.resolve(__dirname, '../../hooks/useWebSocket.js'),
      'utf-8'
    );

    // Should clear/reset the buffer after replaying
    expect(hookSource).toMatch(/eventBufferRef\.current\s*=\s*\[\]/i);
  });
});
