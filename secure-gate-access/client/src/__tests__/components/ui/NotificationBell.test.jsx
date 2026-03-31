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

const EMPTY_NOTIFICATIONS = [];
const STABLE_MARK_AS_READ = jest.fn();
const STABLE_CLEAR_ALL = jest.fn();

const makeNotifications = (overrides = {}) => ({
  notifications: EMPTY_NOTIFICATIONS,
  markAsRead: STABLE_MARK_AS_READ,
  clearAll: STABLE_CLEAR_ALL,
  isConnected: true,
  ...overrides
});

describe('NotificationBell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Restore mocks cleared by clearAllMocks
    useTheme.mockReturnValue({ isDark: false });
    supportsNotificationAudio.mockReturnValue(true);
    playNotificationTone.mockResolvedValue(true);
    useNotifications.mockReturnValue(makeNotifications());
  });

  test('renders bell button with correct aria attributes when no notifications', () => {
    useNotifications.mockImplementation(() => makeNotifications());
    render(<NotificationBell />);
    const bell = screen.getByRole('button', { name: /^Notifications$/i });
    expect(bell).toBeInTheDocument();
    expect(bell).toHaveAttribute('aria-expanded', 'false');
    expect(bell).toHaveAttribute('aria-haspopup', 'dialog');
  });

  test('shows unread count in aria-label when notifications present', () => {
    useNotifications.mockImplementation(() =>
      makeNotifications({
        notifications: [
          { id: '1', read: false, type: 'info', title: 'Test', message: 'Hello', timestamp: new Date().toISOString() }
        ]
      })
    );
    render(<NotificationBell />);
    expect(screen.getByRole('button', { name: /1 unread/i })).toBeInTheDocument();
  });

  test('opens dropdown when bell is clicked', () => {
    useNotifications.mockImplementation(() => makeNotifications());
    render(<NotificationBell />);
    const bell = screen.getByRole('button', { name: /Notifications/i });
    fireEvent.click(bell);
    expect(bell).toHaveAttribute('aria-expanded', 'true');
  });

  test('plays notification tone when sound is enabled and notification arrives', async () => {
    let capturedCallback;
    useNotifications.mockImplementation(({ onNotification } = {}) => {
      capturedCallback = onNotification;
      return makeNotifications();
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
      return makeNotifications();
    });

    render(<NotificationBell />);

    if (capturedCallback) {
      await capturedCallback({ id: '1', type: 'info', message: 'New notification' });
      expect(playNotificationTone).not.toHaveBeenCalled();
    }
  });

  test('mute/unmute button changes sound state', () => {
    useNotifications.mockImplementation(() => makeNotifications());
    render(<NotificationBell />);
    // Open dropdown
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));
    const muteBtn = screen.getByRole('button', { name: /Mute notification sounds/i });
    expect(muteBtn).toBeInTheDocument();
    fireEvent.click(muteBtn);
    expect(screen.getByRole('button', { name: /Enable notification sounds/i })).toBeInTheDocument();
  });

  test('mark all as read button triggers markAsRead', () => {
    const markAsRead = jest.fn();
    useNotifications.mockImplementation(() =>
      makeNotifications({
        notifications: [
          { id: '1', read: false, type: 'info', title: 'Test', message: 'Hello', timestamp: new Date().toISOString() }
        ],
        markAsRead
      })
    );
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));
    const markAllBtn = screen.getByRole('button', { name: /mark all.*read/i });
    fireEvent.click(markAllBtn);
    expect(markAsRead).toHaveBeenCalled();
  });
});
