// Preference Management Panel
// UI component for comprehensive user preference management

import React, { useState } from 'react';
import { useUserPreferences } from '../../hooks/useUserPreferences.js';
import { usePreferences } from '../../contexts/PreferenceContext.jsx';
import { THEME_OPTIONS, DENSITY_OPTIONS, FREQUENCY_OPTIONS } from '../../services/preferenceService.js';

const PreferencePanel = () => {
  const {
    dashboardPreferences,
    notificationPreferences,
    accessibilityPreferences,
    performancePreferences,
    updateDashboardPreferences,
    updateNotificationPreferences,
    updateAccessibilityPreferences,
    updatePerformancePreferences,
    loading,
    error,
    clearError
  } = useUserPreferences();

  const {
    createBackup,
    restoreBackup,
    loadBackups,
    resetToDefaults,
    exportPreferences,
    importPreferences,
    backups,
    backupLoading
  } = usePreferences();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [backupName, setBackupName] = useState('');
  const [selectedBackup, setSelectedBackup] = useState('');
  const [importFile, setImportFile] = useState(null);

  // Handle preference updates
  const handleDashboardUpdate = async (updates) => {
    try {
      await updateDashboardPreferences(updates);
    } catch (err) {
      console.error('Failed to update dashboard preferences:', err);
    }
  };

  const handleNotificationUpdate = async (updates) => {
    try {
      await updateNotificationPreferences(updates);
    } catch (err) {
      console.error('Failed to update notification preferences:', err);
    }
  };

  const handleAccessibilityUpdate = async (updates) => {
    try {
      await updateAccessibilityPreferences(updates);
    } catch (err) {
      console.error('Failed to update accessibility preferences:', err);
    }
  };

  const handlePerformanceUpdate = async (updates) => {
    try {
      await updatePerformancePreferences(updates);
    } catch (err) {
      console.error('Failed to update performance preferences:', err);
    }
  };

  // Backup operations
  const handleCreateBackup = async () => {
    if (!backupName.trim()) return;
    
    try {
      await createBackup(backupName.trim());
      setBackupName('');
      await loadBackups();
    } catch (err) {
      console.error('Failed to create backup:', err);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;
    
    try {
      await restoreBackup(selectedBackup);
      setSelectedBackup('');
    } catch (err) {
      console.error('Failed to restore backup:', err);
    }
  };

  const handleResetToDefaults = async () => {
    if (window.confirm('Are you sure you want to reset all preferences to defaults? This cannot be undone.')) {
      try {
        await resetToDefaults();
      } catch (err) {
        console.error('Failed to reset preferences:', err);
      }
    }
  };

  const handleImportPreferences = async () => {
    if (!importFile) return;
    
    try {
      await importPreferences(importFile);
      setImportFile(null);
    } catch (err) {
      console.error('Failed to import preferences:', err);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'accessibility', label: 'Accessibility', icon: '♿' },
    { id: 'performance', label: 'Performance', icon: '⚡' },
    { id: 'backup', label: 'Backup & Restore', icon: '💾' }
  ];

  return (
    <div className="preference-panel bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          User Preferences
        </h2>
        {error && (
          <div className="flex items-center space-x-2">
            <span className="text-red-600 text-sm">{error}</span>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
              aria-label="Clear error"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-slate-700 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Dashboard Preferences
            </h3>
            
            {/* Theme Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
              </label>
              <select
                value={dashboardPreferences.theme}
                onChange={(e) => handleDashboardUpdate({ theme: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                disabled={loading}
              >
                {THEME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Density Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Layout Density
              </label>
              <select
                value={dashboardPreferences.density}
                onChange={(e) => handleDashboardUpdate({ density: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                disabled={loading}
              >
                {DENSITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notification Preferences
            </h3>
            
            {/* Notification Channels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Notification Channels
              </label>
              <div className="space-y-2">
                {Object.entries(notificationPreferences.channels).map(([channel, enabled]) => (
                  <label key={channel} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => handleNotificationUpdate({
                        channels: {
                          ...notificationPreferences.channels,
                          [channel]: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded"
                      disabled={loading}
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {channel === 'inApp' ? 'In-App' : channel}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Quiet Hours */}
            <div>
              <label className="flex items-center mb-3">
                <input
                  type="checkbox"
                  checked={notificationPreferences.quietHours.enabled}
                  onChange={(e) => handleNotificationUpdate({
                    quietHours: {
                      ...notificationPreferences.quietHours,
                      enabled: e.target.checked
                    }
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded"
                  disabled={loading}
                />
                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Quiet Hours
                </span>
              </label>
              
              {notificationPreferences.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={notificationPreferences.quietHours.start}
                      onChange={(e) => handleNotificationUpdate({
                        quietHours: {
                          ...notificationPreferences.quietHours,
                          start: e.target.value
                        }
                      })}
                      className="block w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={notificationPreferences.quietHours.end}
                      onChange={(e) => handleNotificationUpdate({
                        quietHours: {
                          ...notificationPreferences.quietHours,
                          end: e.target.value
                        }
                      })}
                      className="block w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                      disabled={loading}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'accessibility' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Accessibility Preferences
            </h3>
            
            <div className="space-y-4">
              {Object.entries(accessibilityPreferences).map(([key, enabled]) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => handleAccessibilityUpdate({
                      [key]: e.target.checked
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded"
                    disabled={loading}
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Performance Preferences
            </h3>
            
            {/* Performance Toggles */}
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={performancePreferences.animationsEnabled}
                  onChange={(e) => handlePerformanceUpdate({
                    animationsEnabled: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded"
                  disabled={loading}
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Enable Animations
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={performancePreferences.autoRefresh}
                  onChange={(e) => handlePerformanceUpdate({
                    autoRefresh: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded"
                  disabled={loading}
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Auto Refresh Data
                </span>
              </label>
            </div>

            {/* Refresh Interval */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Refresh Interval (seconds)
              </label>
              <select
                value={performancePreferences.refreshInterval}
                onChange={(e) => handlePerformanceUpdate({
                  refreshInterval: parseInt(e.target.value)
                })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                disabled={loading || !performancePreferences.autoRefresh}
              >
                <option value={5000}>5 seconds</option>
                <option value={15000}>15 seconds</option>
                <option value={30000}>30 seconds</option>
                <option value={60000}>1 minute</option>
                <option value={300000}>5 minutes</option>
              </select>
            </div>

            {/* Data Page Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Items Per Page
              </label>
              <input
                type="number"
                min="10"
                max="100"
                value={performancePreferences.dataPageSize}
                onChange={(e) => handlePerformanceUpdate({
                  dataPageSize: parseInt(e.target.value) || 20
                })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                disabled={loading}
              />
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Backup & Restore
            </h3>
            
            {/* Create Backup */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Create Backup
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  placeholder="Enter backup name"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                  disabled={backupLoading}
                />
                <button
                  onClick={handleCreateBackup}
                  disabled={!backupName.trim() || backupLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {backupLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>

            {/* Restore Backup */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Restore Backup
              </label>
              <div className="flex space-x-2">
                <select
                  value={selectedBackup}
                  onChange={(e) => setSelectedBackup(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                  disabled={backupLoading}
                >
                  <option value="">Select a backup</option>
                  {backups.map((backup) => (
                    <option key={backup.name} value={backup.name}>
                      {backup.name} ({new Date(backup.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleRestoreBackup}
                  disabled={!selectedBackup || backupLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {backupLoading ? 'Restoring...' : 'Restore'}
                </button>
              </div>
            </div>

            {/* Import/Export */}
            <div className="border-t pt-6">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                Import/Export Preferences
              </h4>
              
              <div className="space-y-4">
                {/* Export */}
                <button
                  onClick={exportPreferences}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Export Preferences
                </button>

                {/* Import */}
                <div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setImportFile(e.target.files[0])}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <button
                    onClick={handleImportPreferences}
                    disabled={!importFile}
                    className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import Preferences
                  </button>
                </div>
              </div>
            </div>

            {/* Reset to Defaults */}
            <div className="border-t pt-6">
              <button
                onClick={handleResetToDefaults}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 dark:bg-slate-800 dark:bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600 dark:text-gray-300">Updating preferences...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreferencePanel;