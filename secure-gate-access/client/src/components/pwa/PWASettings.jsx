// PWA Settings Component
import React, { useState, useEffect, useContext } from 'react';

import backgroundSyncService from '../../services/backgroundSyncService';
import offlineService from '../../services/offlineService';
import pushNotificationService from '../../services/pushNotificationService';
import Button from '../ui/Button';

import { PWAContext } from './PWAManager';

const PWASettings = () => {
  const { pwaStatus, installApp, enableNotifications } = useContext(PWAContext);
  const [settings, setSettings] = useState({
    notifications: {
      enabled: false,
      visitor_arrival: true,
      visitor_checkin: true,
      security_alerts: true,
      approval_requests: true,
      system_updates: false,
      marketing: false,
      quiet_hours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    },
    offline: {
      cache_size: 0,
      last_sync: null,
      auto_sync: true,
      sync_on_wifi_only: false
    },
    performance: {
      preload_data: true,
      background_refresh: true,
      reduce_animations: false
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  useEffect(() => {
    loadSettings();
    loadSyncStatus();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    
    try {
      // Load notification preferences
      const notificationPrefs = await pushNotificationService.getNotificationPreferences();
      
      // Load offline capabilities
        await offlineService.getOfflineCapabilities();
      
      // Get cache info
      const cacheInfo = await getCacheInfo();

      setSettings(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          enabled: pwaStatus.hasNotificationPermission,
          ...notificationPrefs
        },
        offline: {
          ...prev.offline,
          cache_size: cacheInfo.size,
          last_sync: cacheInfo.lastSync
        }
      }));
    } catch (error) {
      console.error('Error loading PWA settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const status = await backgroundSyncService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const getCacheInfo = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        let totalSize = 0;
        
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          totalSize += keys.length;
        }
        
        return {
          size: totalSize,
          lastSync: offlineService.getLastSyncTime()
        };
      }
    } catch (error) {
      console.error('Error getting cache info:', error);
    }
    
    return { size: 0, lastSync: null };
  };

  const handleNotificationToggle = async (enabled) => {
    if (enabled && !pwaStatus.hasNotificationPermission) {
      try {
        await enableNotifications();
        setSettings(prev => ({
          ...prev,
          notifications: { ...prev.notifications, enabled: true }
        }));
      } catch (error) {
        console.error('Error enabling notifications:', error);
      }
    } else if (!enabled && pwaStatus.hasNotificationPermission) {
      try {
        await pushNotificationService.unsubscribe();
        setSettings(prev => ({
          ...prev,
          notifications: { ...prev.notifications, enabled: false }
        }));
      } catch (error) {
        console.error('Error disabling notifications:', error);
      }
    }
  };

  const handleNotificationPreferenceChange = async (key, value) => {
    const newPrefs = {
      ...settings.notifications,
      [key]: value
    };

    setSettings(prev => ({
      ...prev,
      notifications: newPrefs
    }));

    // Save to server
    try {
      await pushNotificationService.updateNotificationPreferences(newPrefs);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  };

  const handleQuietHoursChange = (key, value) => {
    const newQuietHours = {
      ...settings.notifications.quiet_hours,
      [key]: value
    };

    handleNotificationPreferenceChange('quiet_hours', newQuietHours);
  };

  const handleOfflineSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      offline: { ...prev.offline, [key]: value }
    }));
  };

  const handlePerformanceSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      performance: { ...prev.performance, [key]: value }
    }));
  };

  const clearCache = async () => {
    if (window.confirm('Are you sure you want to clear all cached data? This will remove offline access to your data.')) {
      try {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        
        // Clear offline service data
        await offlineService.clearOldCache();
        
        // Reload settings
        await loadSettings();
        
        alert('Cache cleared successfully');
      } catch (error) {
        console.error('Error clearing cache:', error);
        alert('Failed to clear cache');
      }
    }
  };

  const forcSync = async () => {
    try {
      setSaving(true);
      await backgroundSyncService.checkPendingSyncs();
      await loadSyncStatus();
      alert('Sync completed');
    } catch (error) {
      console.error('Error forcing sync:', error);
      alert('Sync failed');
    } finally {
      setSaving(false);
    }
  };

  const testNotification = async () => {
    try {
      await pushNotificationService.testNotification();
    } catch (error) {
      console.error('Error testing notification:', error);
      alert('Failed to send test notification');
    }
  };

  if (loading) {
    return (
      <div className="pwa-settings loading">
        <div className="loading-spinner"></div>
        <p>Loading PWA settings...</p>
      </div>
    );
  }

  return (
    <div className="pwa-settings">
      <div className="settings-header">
        <h2>PWA Settings</h2>
        <p>Configure your Progressive Web App experience</p>
      </div>

      {/* Installation Section */}
      <div className="settings-section">
        <h3>Installation</h3>
        <div className="setting-item">
          <div className="setting-info">
            <label>App Installation</label>
            <p>Install SecureGate as a standalone app</p>
          </div>
          <div className="setting-control">
            {pwaStatus.isInstalled ? (
              <span className="status-badge installed">✓ Installed</span>
            ) : pwaStatus.isInstallable ? (
              <Button className="install-btn" onClick={installApp}>
                Install App
              </Button>
            ) : (
              <span className="status-badge unavailable">Not Available</span>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="settings-section">
        <h3>Push Notifications</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>Enable Notifications</label>
            <p>Receive push notifications for important events</p>
          </div>
          <div className="setting-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.notifications.enabled}
                onChange={(e) => handleNotificationToggle(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {settings.notifications.enabled && (
          <>
            <div className="setting-item">
              <div className="setting-info">
                <label>Visitor Arrivals</label>
                <p>Get notified when visitors arrive</p>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications.visitor_arrival}
                    onChange={(e) => handleNotificationPreferenceChange('visitor_arrival', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Check-ins</label>
                <p>Get notified about visitor check-ins</p>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications.visitor_checkin}
                    onChange={(e) => handleNotificationPreferenceChange('visitor_checkin', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Security Alerts</label>
                <p>Get notified about security incidents</p>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications.security_alerts}
                    onChange={(e) => handleNotificationPreferenceChange('security_alerts', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Approval Requests</label>
                <p>Get notified about pending approvals</p>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications.approval_requests}
                    onChange={(e) => handleNotificationPreferenceChange('approval_requests', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="setting-item">
              <div className="setting-info">
                <label>Quiet Hours</label>
                <p>Disable notifications during specific hours</p>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications.quiet_hours.enabled}
                    onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            {settings.notifications.quiet_hours.enabled && (
              <div className="quiet-hours-config">
                <div className="time-inputs">
                  <div className="time-input">
                    <label>Start Time</label>
                    <input
                      type="time"
                      value={settings.notifications.quiet_hours.start}
                      onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                    />
                  </div>
                  <div className="time-input">
                    <label>End Time</label>
                    <input
                      type="time"
                      value={settings.notifications.quiet_hours.end}
                      onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="setting-actions">
              <Button className="test-btn" onClick={testNotification}>
                Send Test Notification
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Offline Section */}
      <div className="settings-section">
        <h3>Offline & Sync</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>Connection Status</label>
            <p>Current network connection status</p>
          </div>
          <div className="setting-control">
            <span className={`status-badge ${pwaStatus.isOnline ? 'online' : 'offline'}`}>
              {pwaStatus.isOnline ? '🟢 Online' : '🔴 Offline'}
            </span>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Cached Data</label>
            <p>{settings.offline.cache_size} items cached for offline use</p>
          </div>
          <div className="setting-control">
            <Button className="clear-btn" onClick={clearCache}>
              Clear Cache
            </Button>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Last Sync</label>
            <p>
              {settings.offline.last_sync 
                ? new Date(settings.offline.last_sync).toLocaleString()
                : 'Never'
              }
            </p>
          </div>
          <div className="setting-control">
            <Button 
              className="sync-btn" 
              onClick={forcSync}
              disabled={saving || !pwaStatus.isOnline}
            >
              {saving ? 'Syncing...' : 'Force Sync'}
            </Button>
          </div>
        </div>

        {syncStatus && syncStatus.pendingSyncs.length > 0 && (
          <div className="pending-syncs">
            <h4>Pending Syncs ({syncStatus.pendingSyncs.length})</h4>
            <div className="sync-list">
              {syncStatus.pendingSyncs.map((sync, index) => (
                <div key={index} className="sync-item">
                  <span className="sync-tag">{sync.tag}</span>
                  <span className="sync-time">
                    {new Date(sync.timestamp).toLocaleTimeString()}
                  </span>
                  {sync.retries > 0 && (
                    <span className="sync-retries">
                      {sync.retries} retries
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="setting-item">
          <div className="setting-info">
            <label>Auto Sync</label>
            <p>Automatically sync when connection is restored</p>
          </div>
          <div className="setting-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.offline.auto_sync}
                onChange={(e) => handleOfflineSettingChange('auto_sync', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Performance Section */}
      <div className="settings-section">
        <h3>Performance</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>Preload Data</label>
            <p>Preload frequently accessed data for faster loading</p>
          </div>
          <div className="setting-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.performance.preload_data}
                onChange={(e) => handlePerformanceSettingChange('preload_data', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Background Refresh</label>
            <p>Refresh data in the background when app is not active</p>
          </div>
          <div className="setting-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.performance.background_refresh}
                onChange={(e) => handlePerformanceSettingChange('background_refresh', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Reduce Animations</label>
            <p>Reduce animations for better performance</p>
          </div>
          <div className="setting-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.performance.reduce_animations}
                onChange={(e) => handlePerformanceSettingChange('reduce_animations', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        .pwa-settings {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px;
        }

        .pwa-settings.loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: var(--color-text-tertiary, #6b7280);
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--color-border-primary, #e5e7eb);
          border-top: 3px solid var(--color-info, #3b82f6);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        .settings-header {
          margin-bottom: 32px;
        }

        .settings-header h2 {
          font-size: 24px;
          font-weight: 600;
          margin: 0 0 8px 0;
          color: var(--color-text-primary, #111827);
        }

        .settings-header p {
          font-size: 16px;
          color: var(--color-text-tertiary, #6b7280);
          margin: 0;
        }

        .settings-section {
          background: var(--color-bg-secondary, white);
          border: 1px solid var(--color-border-primary, #e5e7eb);
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .settings-section h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 20px 0;
          color: var(--color-text-primary, #111827);
          border-bottom: 1px solid var(--color-border-primary, #e5e7eb);
          padding-bottom: 12px;
        }

        .setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          border-bottom: 1px solid var(--color-bg-tertiary, #f3f4f6);
        }

        .setting-item:last-child {
          border-bottom: none;
        }

        .setting-info {
          flex: 1;
          min-width: 0;
        }

        .setting-info label {
          display: block;
          font-size: 16px;
          font-weight: 500;
          color: var(--color-text-primary, #111827);
          margin-bottom: 4px;
        }

        .setting-info p {
          font-size: 14px;
          color: var(--color-text-tertiary, #6b7280);
          margin: 0;
        }

        .setting-control {
          flex-shrink: 0;
          margin-left: 16px;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 24px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--color-text-disabled, #d1d5db);
          transition: 0.3s;
          border-radius: 24px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }

        input:checked + .toggle-slider {
          background-color: var(--color-info, #3b82f6);
        }

        input:checked + .toggle-slider:before {
          transform: translateX(24px);
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .status-badge.installed {
          background: var(--color-success-light, #d1fae5);
          color: var(--color-success-dark, #065f46);
        }

        .status-badge.online {
          background: var(--color-success-light, #d1fae5);
          color: var(--color-success-dark, #065f46);
        }

        .status-badge.offline {
          background: var(--color-error-light, #fee2e2);
          color: var(--color-error-dark, #991b1b);
        }

        .status-badge.unavailable {
          background: var(--color-bg-tertiary, #f3f4f6);
          color: var(--color-text-tertiary, #6b7280);
        }

        .install-btn,
        .test-btn,
        .clear-btn,
        .sync-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .install-btn {
          background: var(--color-info, #3b82f6);
          color: white;
        }

        .install-btn:hover {
          background: var(--color-info-dark, #2563eb);
        }

        .test-btn {
          background: var(--color-success, #10b981);
          color: white;
        }

        .test-btn:hover {
          background: var(--color-success-dark, #059669);
        }

        .clear-btn {
          background: var(--color-error, #ef4444);
          color: white;
        }

        .clear-btn:hover {
          background: var(--color-error-dark, #dc2626);
        }

        .sync-btn {
          background: var(--color-info, #3b82f6);
          color: white;
        }

        .sync-btn:hover:not(:disabled) {
          background: var(--color-info-dark, #2563eb);
        }

        .sync-btn:disabled {
          background: var(--color-text-muted, #9ca3af);
          cursor: not-allowed;
        }

        .quiet-hours-config {
          margin-top: 16px;
          padding: 16px;
          background: var(--color-bg-subtle, #f9fafb);
          border-radius: 6px;
        }

        .time-inputs {
          display: flex;
          gap: 16px;
        }

        .time-input {
          flex: 1;
        }

        .time-input label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-secondary, #374151);
          margin-bottom: 4px;
        }

        .time-input input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--color-border-secondary, #d1d5db);
          border-radius: 6px;
          font-size: 14px;
        }

        .setting-actions {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--color-border-primary, #e5e7eb);
        }

        .pending-syncs {
          margin-top: 16px;
          padding: 16px;
          background: var(--color-warning-light, #fef3c7);
          border: 1px solid var(--color-warning, #f59e0b);
          border-radius: 6px;
        }

        .pending-syncs h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-warning-dark, #92400e);
          margin: 0 0 12px 0;
        }

        .sync-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sync-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
        }

        .sync-tag {
          padding: 2px 6px;
          background: var(--color-warning-dark, #92400e);
          color: white;
          border-radius: 4px;
          font-weight: 500;
        }

        .sync-time {
          color: var(--color-warning-dark, #92400e);
        }

        .sync-retries {
          color: var(--color-error, #dc2626);
          font-weight: 500;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .pwa-settings {
            padding: 16px;
          }

          .setting-item {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .setting-control {
            margin-left: 0;
            display: flex;
            justify-content: flex-end;
          }

          .time-inputs {
            flex-direction: column;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default PWASettings;