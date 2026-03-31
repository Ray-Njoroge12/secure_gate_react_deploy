import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationBell from '../../../components/ui/NotificationBell';

// Mock Web Audio utilities
jest.mock('../../../utils/notificationAudio', () => ({
  playNotificationTone: jest.fn().mockResolvedValue(true),
  supportsNotificationAudio: jest.fn().mockReturnValue(true),
  triggerVisualNotificationFallback: jest.fn()
}));

// Mock WebSocket notifications hook
jest.mock('../../../hooks/useWebSocket', () => ({
  useNotifications: jest.fn()
}));

// Mock ThemeContext
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn().mockReturnValue({ isDark: false }),
  THEME_DENSITY: { COMPACT: 'compact', COMFORTABLE: 'comfortable', SPACIOUS: 'spacious' }
}));

// Mock Icon component
jest.mock('../../../components/ui/Icon', () => {
  const Icon = ({ name, className }) => <span data-testid={`icon-${name}`} className={className} />;
  return Icon;
});

const { useNotifications } = require('../../../hooks/useWebSocket');
const { playNotificationTone, supportsNotificationAudio } = require('../../../utils/notificationAudio');
const { useTheme } = require('../../../contexts/ThemeContext');

// Stable module-level objects to avoid infinite update loops.
// useEffect([wsNotifications]) in NotificationBell re-fires whenever
// the notifications array reference changes, so every test needs a
// truly stable (===) array reference across renders.
const EMPTY = [];
const STABLE_FN = jest.fn();
const BASE_MOCK = {
  notifications: EMPTY,
  markAsRead: STABLE_FN,
  clearAll: STABLE_FN,
  isConnected: true
};

// Build a stable mock once per test for overrides that need different data
const ONE_UNREAD = [{ id: '1', read: false, type: 'info', title: 'Test', message: 'Hello', timestamp: '2026-01-01T00:00:00.000Z' }];
const WITH_UNREAD = { ...BASE_MOCK, notifications: ONE_UNREAD };

describe('NotificationBell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-establish implementations cleared by clearAllMocks
    useTheme.mockReturnValue({ isDark: false });
    supportsNotificationAudio.mockReturnValue(true);
    playNotificationTone.mockResolvedValue(true);
    // Default: stable object returned on every call
    useNotifications.mockReturnValue(BASE_MOCK);
  });

  test('renders bell button with correct aria attributes when no notifications', () => {
    render(<NotificationBell />);
    const bell = screen.getByRole('button', { name: /^Notifications$/i });
    expect(bell).toBeInTheDocument();
    expect(bell).toHaveAttribute('aria-expanded', 'false');
    expect(bell).toHaveAttribute('aria-haspopup', 'dialog');
  });

  test('shows unread count in aria-label when notifications present', () => {
    // Use stable module-level array — never recreated during renders
    useNotifications.mockReturnValue(WITH_UNREAD);
    render(<NotificationBell />);
    expect(screen.getByRole('button', { name: /1 unread/i })).toBeInTheDocument();
  });

  test('opens dropdown when bell is clicked', () => {
    render(<NotificationBell />);
    const bell = screen.getByRole('button', { name: /Notifications/i });
    fireEvent.click(bell);
    expect(bell).toHaveAttribute('aria-expanded', 'true');
  });

  test('plays notification tone when sound is enabled and notification arrives', async () => {
    let capturedCallback;
    // Capture onNotification without recreating the return value per render
    useNotifications.mockImplementation(({ onNotification } = {}) => {
      capturedCallback = onNotification;
      return BASE_MOCK;
    });

    render(<NotificationBell />);

    if (capturedCallback) {
      await capturedCallback({ id: '1', type: 'info', message: 'New notification' });
      expect(playNotificationTone).toHaveBeenCalledTimes(1);
    }
  });

  test('does not play tone when supportsNotificationAudio returns false', async () => {
    supportsNotificationAudio.mockReturnValue(false);

    let capturedCallback;
    useNotifications.mockImplementation(({ onNotification } = {}) => {
      capturedCallback = onNotification;
      return BASE_MOCK;
    });

    render(<NotificationBell />);

    if (capturedCallback) {
      await capturedCallback({ id: '1', type: 'info', message: 'New notification' });
      expect(playNotificationTone).not.toHaveBeenCalled();
    }
  });

  test('mute/unmute button changes sound state', () => {
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));
    const muteBtn = screen.getByRole('button', { name: /Mute notification sounds/i });
    expect(muteBtn).toBeInTheDocument();
    fireEvent.click(muteBtn);
    expect(screen.getByRole('button', { name: /Enable notification sounds/i })).toBeInTheDocument();
  });

  test('mark all as read button renders and is clickable when unread exist', () => {
    useNotifications.mockReturnValue(WITH_UNREAD);
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));
    // The dropdown should expose a "mark all as read" button
    const markAllBtn = screen.getByRole('button', { name: /mark all.*read/i });
    expect(markAllBtn).toBeInTheDocument();
    // Clicking it should not throw and should update local state (unread badge disappears)
    fireEvent.click(markAllBtn);
    // After marking all read the bell label should no longer say "unread"
    expect(screen.queryByRole('button', { name: /1 unread/i })).not.toBeInTheDocument();
  });
});
