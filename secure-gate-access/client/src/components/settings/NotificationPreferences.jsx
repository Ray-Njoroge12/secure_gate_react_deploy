/**
 * @file NotificationPreferences.jsx
 * @description User notification preferences panel
 * Phase 4: UI/UX Improvements - User Control
 * 
 * Features:
 * - Toggle different notification types
 * - Quiet hours configuration
 * - Sound preferences
 * - Desktop notifications permission
 * - Email digest options
 */

import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'notification_preferences';

const defaultPreferences = {
  // Notification channels
  push: true,
  email: true,
  sms: false,
  inApp: true,
  
  // Notification types
  visitorArrival: true,
  visitorCheckout: true,
  approvalRequests: true,
  securityAlerts: true,
  systemUpdates: false,
  communityNews: false,
  
  // Sound
  soundEnabled: true,
  soundVolume: 50,
  
  // Quiet hours
  quietHoursEnabled: false,
  quietStart: '22:00',
  quietEnd: '07:00',
  
  // Email preferences
  emailDigest: 'realtime', // realtime | daily | weekly | none
  
  // Desktop permission
  desktopPermission: 'default', // default | granted | denied
};

/**
 * Toggle switch component
 */
const Toggle = ({ id, checked, onChange, disabled }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`
      relative w-11 h-6 rounded-full
      transition-colors duration-200
      focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2
      ${checked ? 'bg-green-500' : 'bg-gray-300'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    <span
      className={`
        absolute top-0.5 left-0.5
        w-5 h-5 rounded-full
        bg-white shadow
        transition-transform duration-200
        ${checked ? 'translate-x-5' : 'translate-x-0'}
      `}
    />
  </button>
);

/**
 * Preference section component
 */
const Section = ({ title, description, children }) => (
  <div className="py-4 border-b border-gray-200 last:border-b-0">
    <div className="mb-3">
      <h3 className="text-base font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      )}
    </div>
    <div className="space-y-3">
      {children}
    </div>
  </div>
);

/**
 * Single preference row
 */
const PreferenceRow = ({ 
  label, 
  description, 
  checked, 
  onChange, 
  disabled,
  icon 
}) => (
  <div className="flex items-center justify-between py-1">
    <div className="flex items-start gap-3">
      {icon && <span className="text-lg mt-0.5">{icon}</span>}
      <div>
        <label className="text-sm font-medium text-gray-800">{label}</label>
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </div>
    </div>
    <Toggle checked={checked} onChange={onChange} disabled={disabled} />
  </div>
);

/**
 * Main Notification Preferences Component
 */
const NotificationPreferences = ({ 
  onSave, 
  onClose, 
  compact = false,
  className = '' 
}) => {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load preferences from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPreferences({ ...defaultPreferences, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.error('Failed to load notification preferences:', e);
    }
    
    // Check browser notification permission
    if ('Notification' in window) {
      setPreferences(prev => ({
        ...prev,
        desktopPermission: Notification.permission
      }));
    }
  }, []);

  // Update a preference
  const updatePreference = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Request desktop notification permission
  const requestDesktopPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      updatePreference('desktopPermission', permission);
      
      if (permission === 'granted') {
        new Notification('Notifications Enabled', {
          body: 'You will now receive desktop notifications',
          icon: '/favicon.ico',
        });
      }
    } catch (e) {
      console.error('Failed to request notification permission:', e);
    }
  };

  // Save preferences
  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      onSave?.(preferences);
      setHasChanges(false);
    } catch (e) {
      console.error('Failed to save preferences:', e);
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setPreferences(defaultPreferences);
    setHasChanges(true);
  };

  return (
    <div className={`bg-white rounded-lg ${compact ? 'p-4' : 'p-6'} ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
          <p className="text-sm text-gray-500">Choose how you want to be notified</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      {/* Notification Channels */}
      <Section 
        title="Notification Channels" 
        description="How you want to receive notifications"
      >
        <PreferenceRow
          label="Push Notifications"
          description="Browser and mobile push"
          icon="🔔"
          checked={preferences.push}
          onChange={(v) => updatePreference('push', v)}
        />
        <PreferenceRow
          label="In-App Notifications"
          description="Show in notification center"
          icon="📱"
          checked={preferences.inApp}
          onChange={(v) => updatePreference('inApp', v)}
        />
        <PreferenceRow
          label="Email Notifications"
          description="Receive via email"
          icon="📧"
          checked={preferences.email}
          onChange={(v) => updatePreference('email', v)}
        />
        <PreferenceRow
          label="SMS Notifications"
          description="Text message alerts"
          icon="💬"
          checked={preferences.sms}
          onChange={(v) => updatePreference('sms', v)}
        />
      </Section>

      {/* Notification Types */}
      <Section 
        title="Notification Types" 
        description="What you want to be notified about"
      >
        <PreferenceRow
          label="Visitor Arrivals"
          description="When visitors check in"
          icon="🚶"
          checked={preferences.visitorArrival}
          onChange={(v) => updatePreference('visitorArrival', v)}
        />
        <PreferenceRow
          label="Visitor Checkouts"
          description="When visitors leave"
          icon="👋"
          checked={preferences.visitorCheckout}
          onChange={(v) => updatePreference('visitorCheckout', v)}
        />
        <PreferenceRow
          label="Approval Requests"
          description="Walk-in visitor requests"
          icon="✋"
          checked={preferences.approvalRequests}
          onChange={(v) => updatePreference('approvalRequests', v)}
        />
        <PreferenceRow
          label="Security Alerts"
          description="Important security notifications"
          icon="🚨"
          checked={preferences.securityAlerts}
          onChange={(v) => updatePreference('securityAlerts', v)}
        />
        <PreferenceRow
          label="System Updates"
          description="App updates and maintenance"
          icon="⚙️"
          checked={preferences.systemUpdates}
          onChange={(v) => updatePreference('systemUpdates', v)}
        />
        <PreferenceRow
          label="Community News"
          description="Announcements and news"
          icon="📢"
          checked={preferences.communityNews}
          onChange={(v) => updatePreference('communityNews', v)}
        />
      </Section>

      {/* Sound Settings */}
      <Section title="Sound" description="Audio notification settings">
        <PreferenceRow
          label="Notification Sound"
          description="Play sound for notifications"
          icon="🔊"
          checked={preferences.soundEnabled}
          onChange={(v) => updatePreference('soundEnabled', v)}
        />
        {preferences.soundEnabled && (
          <div className="flex items-center gap-4 pl-8">
            <span className="text-sm text-gray-600">Volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={preferences.soundVolume}
              onChange={(e) => updatePreference('soundVolume', Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <span className="text-sm text-gray-600 w-8">{preferences.soundVolume}%</span>
          </div>
        )}
      </Section>

      {/* Quiet Hours */}
      <Section title="Quiet Hours" description="Silence notifications during specific times">
        <PreferenceRow
          label="Enable Quiet Hours"
          description="No notifications during set times"
          icon="🌙"
          checked={preferences.quietHoursEnabled}
          onChange={(v) => updatePreference('quietHoursEnabled', v)}
        />
        {preferences.quietHoursEnabled && (
          <div className="flex items-center gap-4 pl-8">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">From</label>
              <input
                type="time"
                value={preferences.quietStart}
                onChange={(e) => updatePreference('quietStart', e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">To</label>
              <input
                type="time"
                value={preferences.quietEnd}
                onChange={(e) => updatePreference('quietEnd', e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        )}
      </Section>

      {/* Desktop Notifications */}
      <Section title="Desktop Notifications">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">🖥️</span>
            <div>
              <p className="text-sm font-medium text-gray-800">Browser Notifications</p>
              <p className="text-xs text-gray-500">
                Status: {preferences.desktopPermission === 'granted' ? '✅ Enabled' : 
                         preferences.desktopPermission === 'denied' ? '❌ Blocked' : '⚠️ Not requested'}
              </p>
            </div>
          </div>
          {preferences.desktopPermission !== 'granted' && (
            <button
              onClick={requestDesktopPermission}
              disabled={preferences.desktopPermission === 'denied'}
              className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 
                         hover:bg-green-100 rounded-lg transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {preferences.desktopPermission === 'denied' ? 'Blocked by Browser' : 'Enable'}
            </button>
          )}
        </div>
      </Section>

      {/* Email Digest */}
      <Section title="Email Digest" description="Frequency of email summaries">
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'realtime', label: 'Real-time' },
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'none', label: 'None' },
          ].map(option => (
            <button
              key={option.value}
              onClick={() => updatePreference('emailDigest', option.value)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium
                transition-colors
                ${preferences.emailDigest === option.value
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={handleReset}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Reset to Defaults
        </button>
        <div className="flex gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 
                         bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="px-4 py-2 text-sm font-medium text-white 
                       bg-green-600 hover:bg-green-700 rounded-lg 
                       transition-colors disabled:opacity-50 
                       disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="animate-spin">⏳</span>
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to access notification preferences
 */
export const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState(defaultPreferences);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPreferences({ ...defaultPreferences, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.error('Failed to load notification preferences:', e);
    }
  }, []);

  const updatePreference = (key, value) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  };

  const shouldNotify = (type) => {
    // Check if we're in quiet hours
    if (preferences.quietHoursEnabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (preferences.quietStart <= preferences.quietEnd) {
        // Normal range (e.g., 09:00 to 17:00)
        if (currentTime >= preferences.quietStart && currentTime <= preferences.quietEnd) {
          return false;
        }
      } else {
        // Overnight range (e.g., 22:00 to 07:00)
        if (currentTime >= preferences.quietStart || currentTime <= preferences.quietEnd) {
          return false;
        }
      }
    }

    // Check specific notification type
    const typeMap = {
      'visitor.arrival': 'visitorArrival',
      'visitor.checkout': 'visitorCheckout',
      'approval.request': 'approvalRequests',
      'security.alert': 'securityAlerts',
      'system.update': 'systemUpdates',
      'community.news': 'communityNews',
    };

    const prefKey = typeMap[type];
    if (prefKey && !preferences[prefKey]) {
      return false;
    }

    return true;
  };

  return {
    preferences,
    updatePreference,
    shouldNotify,
    isQuietHours: () => {
      if (!preferences.quietHoursEnabled) return false;
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (preferences.quietStart <= preferences.quietEnd) {
        return currentTime >= preferences.quietStart && currentTime <= preferences.quietEnd;
      } else {
        return currentTime >= preferences.quietStart || currentTime <= preferences.quietEnd;
      }
    },
  };
};

export default NotificationPreferences;
