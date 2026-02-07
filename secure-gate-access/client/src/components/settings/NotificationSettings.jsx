/**
 * @fileoverview Notification Settings Component
 * @description Manage notification preferences and push notification subscription
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../ui';
import { useTheme } from '../../contexts/ThemeContext';
import usePushNotifications from '../../hooks/usePushNotifications';
import api from '../../utils/apiClient';
import { 
  Bell, 
  BellOff, 
  BellRing, 
  Smartphone, 
  Mail, 
  MessageSquare,
  Check,
  X,
  AlertTriangle,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';

/**
 * Notification channel configuration
 */
const NOTIFICATION_CHANNELS = [
  {
    id: 'visitor_arrival',
    label: 'Visitor Arrivals',
    description: 'Get notified when a visitor arrives at the gate',
    icon: '👋',
    defaultEnabled: true
  },
  {
    id: 'visitor_approved',
    label: 'Visitor Approvals',
    description: 'Notifications when your visitor is approved',
    icon: '✅',
    defaultEnabled: true
  },
  {
    id: 'visitor_denied',
    label: 'Visitor Denials',
    description: 'Notifications when a visitor is denied entry',
    icon: '❌',
    defaultEnabled: true
  },
  {
    id: 'security_alerts',
    label: 'Security Alerts',
    description: 'Important security notifications',
    icon: '🚨',
    defaultEnabled: true,
    critical: true
  },
  {
    id: 'system_updates',
    label: 'System Updates',
    description: 'Maintenance and system notifications',
    icon: '🔔',
    defaultEnabled: false
  },
  {
    id: 'reminders',
    label: 'Reminders',
    description: 'Upcoming visitor reminders',
    icon: '⏰',
    defaultEnabled: true
  }
];

/**
 * NotificationSettings Component
 */
const NotificationSettings = ({ className = '' }) => {
  const { isDark } = useTheme();
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    canSubscribe,
    needsPermission,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification
  } = usePushNotifications();

  const [channels, setChannels] = useState({});
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // Initialize channel preferences
  useEffect(() => {
    const savedChannels = localStorage.getItem('notification-channels');
    if (savedChannels) {
      setChannels(JSON.parse(savedChannels));
    } else {
      const defaults = {};
      NOTIFICATION_CHANNELS.forEach(ch => {
        defaults[ch.id] = ch.defaultEnabled;
      });
      setChannels(defaults);
    }
  }, []);

  // Toggle channel
  const toggleChannel = (channelId) => {
    setChannels(prev => {
      const updated = { ...prev, [channelId]: !prev[channelId] };
      localStorage.setItem('notification-channels', JSON.stringify(updated));
      return updated;
    });
  };

  // Handle push subscription
  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else if (needsPermission) {
      const result = await requestPermission();
      if (result === 'granted') {
        await subscribe();
      }
    } else {
      await subscribe();
    }
  };

  // Test notification
  const handleTestNotification = async () => {
    await showNotification('Test Notification', {
      body: 'This is a test notification from SecureGate',
      icon: '/logo192.png',
      tag: 'test-notification'
    });
  };

  const savePreferences = async () => {
    setSaving(true);
    setSuccess('');
    setSaveError('');
    
    try {
      // Map frontend channel state to backend preferences format
      const preferencesPayload = {
        emailEnabled: emailNotifications,
        smsEnabled: smsNotifications,
        // Map channels to notification type preferences
        notifyOnInvite: channels.visitor_arrival !== false,
        notifyOnApproval: channels.visitor_approved !== false,
        notifyOnRejection: channels.visitor_denied !== false,
        notifyOnCheckin: channels.visitor_arrival !== false,
        notifyOnCheckout: channels.visitor_arrival !== false,
        notifyOnReminder: channels.reminders !== false,
        language: 'en'
      };
      
      const response = await api.put('/api/notifications/preferences', preferencesPayload);
      
      if (response.data.success || response.status === 200) {
        setSuccess('Notification preferences saved successfully!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(response.data.message || 'Failed to save preferences');
      }
    } catch (err) {
      console.error('Error saving preferences:', err);
      setSaveError(err.message || 'Failed to save notification preferences');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const cardClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-gray-900 dark:text-white';
  const mutedClass = isDark ? 'text-gray-300' : 'text-gray-600 dark:text-gray-200';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-green-700 dark:text-green-300 font-medium">✓ {success}</p>
            <button onClick={() => setSuccess('')} className="text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100">✕</button>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {saveError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-red-700 dark:text-red-300 font-medium">✕ {saveError}</p>
            <button onClick={() => setSaveError('')} className="text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100">✕</button>
          </div>
        </div>
      )}
      
      {/* Push Notifications Section */}
      <Card className={`p-6 ${cardClass}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className={`text-lg font-semibold ${textClass}`}>Push Notifications</h3>
            <p className={`text-sm mt-1 ${mutedClass}`}>
              Receive instant notifications on your device
            </p>
          </div>
          {isSubscribed ? (
            <Badge variant="success" className="flex items-center gap-1">
              <Check className="w-3 h-3" /> Enabled
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <BellOff className="w-3 h-3" /> Disabled
            </Badge>
          )}
        </div>

        {!isSupported ? (
          <div className={`p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-800 dark:text-yellow-200 font-medium">Not Supported</p>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                  Push notifications are not supported in this browser. Try using Chrome, Firefox, or Edge.
                </p>
              </div>
            </div>
          </div>
        ) : permission === 'denied' ? (
          <div className={`p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800`}>
            <div className="flex items-start gap-3">
              <X className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 dark:text-red-200 font-medium">Permission Denied</p>
                <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                  You've blocked notifications. Please enable them in your browser settings.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Button
              onClick={handlePushToggle}
              disabled={isLoading}
              variant={isSubscribed ? 'secondary' : 'primary'}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                'Processing...'
              ) : isSubscribed ? (
                <>
                  <BellOff className="w-4 h-4" />
                  Disable Push
                </>
              ) : (
                <>
                  <BellRing className="w-4 h-4" />
                  Enable Push
                </>
              )}
            </Button>
            
            {isSubscribed && (
              <Button
                onClick={handleTestNotification}
                variant="ghost"
                size="sm"
              >
                Send Test
              </Button>
            )}
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}
      </Card>

      {/* Notification Channels */}
      <Card className={`p-6 ${cardClass}`}>
        <h3 className={`text-lg font-semibold mb-4 ${textClass}`}>Notification Types</h3>
        <p className={`text-sm mb-4 ${mutedClass}`}>
          Choose which types of notifications you want to receive
        </p>

        <div className="space-y-3">
          {NOTIFICATION_CHANNELS.map(channel => (
            <label
              key={channel.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${borderClass} cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{channel.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${textClass}`}>{channel.label}</span>
                    {channel.critical && (
                      <Badge variant="error" size="sm">Critical</Badge>
                    )}
                  </div>
                  <p className={`text-sm ${mutedClass}`}>{channel.description}</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={channels[channel.id] || false}
                  onChange={() => toggleChannel(channel.id)}
                  disabled={channel.critical}
                  className="sr-only peer"
                />
                <div className={`
                  w-11 h-6 rounded-full transition-colors
                  ${channels[channel.id] 
                    ? 'bg-brand-500' 
                    : isDark ? 'bg-slate-600' : 'bg-gray-300'
                  }
                  ${channel.critical ? 'opacity-50 cursor-not-allowed' : ''}
                `}>
                  <div className={`
                    absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform
                    ${channels[channel.id] ? 'translate-x-5' : 'translate-x-0'}
                  `} />
                </div>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Other Notification Methods */}
      <Card className={`p-6 ${cardClass}`}>
        <h3 className={`text-lg font-semibold mb-4 ${textClass}`}>Delivery Methods</h3>
        
        <div className="space-y-4">
          {/* Email */}
          <label className={`flex items-center justify-between p-3 rounded-lg border ${borderClass} cursor-pointer`}>
            <div className="flex items-center gap-3">
              <Mail className={`w-5 h-5 ${mutedClass}`} />
              <div>
                <span className={`font-medium ${textClass}`}>Email Notifications</span>
                <p className={`text-sm ${mutedClass}`}>Receive notifications via email</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
          </label>

          {/* SMS */}
          <label className={`flex items-center justify-between p-3 rounded-lg border ${borderClass} cursor-pointer`}>
            <div className="flex items-center gap-3">
              <MessageSquare className={`w-5 h-5 ${mutedClass}`} />
              <div>
                <span className={`font-medium ${textClass}`}>SMS Notifications</span>
                <p className={`text-sm ${mutedClass}`}>Receive notifications via SMS</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={smsNotifications}
              onChange={(e) => setSmsNotifications(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
          </label>

          {/* Sound */}
          <label className={`flex items-center justify-between p-3 rounded-lg border ${borderClass} cursor-pointer`}>
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className={`w-5 h-5 ${mutedClass}`} />
              ) : (
                <VolumeX className={`w-5 h-5 ${mutedClass}`} />
              )}
              <div>
                <span className={`font-medium ${textClass}`}>Notification Sounds</span>
                <p className={`text-sm ${mutedClass}`}>Play sound for new notifications</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
          </label>
        </div>
      </Card>


      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={savePreferences}
          disabled={saving}
          className="flex items-center gap-2"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings;
