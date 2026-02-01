// User Preferences Hook
// Custom hook for easy preference access and management

import { useCallback, useMemo } from 'react';
import { usePreferences } from '../contexts/PreferenceContext.jsx';
import { PREFERENCE_CATEGORIES } from '../services/preferenceService.js';

/**
 * Custom hook for user preference management
 * Provides convenient methods for accessing and updating preferences
 */
export const useUserPreferences = () => {
  const {
    preferences,
    version,
    isDefault,
    loading,
    error,
    lastSyncTime,
    updatePreferences,
    updatePreferenceCategory,
    getPreference,
    setPreference,
    clearError
  } = usePreferences();

  /**
   * Dashboard preferences
   */
  const dashboardPreferences = useMemo(() => ({
    widgets: preferences.dashboardLayout?.widgets || [],
    theme: preferences.dashboardLayout?.theme || 'system',
    density: preferences.dashboardLayout?.density || 'comfortable'
  }), [preferences.dashboardLayout]);

  /**
   * Notification preferences
   */
  const notificationPreferences = useMemo(() => ({
    channels: preferences.notifications?.channels || {
      email: true,
      sms: false,
      push: true,
      inApp: true
    },
    frequency: preferences.notifications?.frequency || {
      immediate: ['security_alert', 'visitor_arrival'],
      hourly: ['visitor_status'],
      daily: ['system_update'],
      weekly: ['report_summary']
    },
    quietHours: preferences.notifications?.quietHours || {
      enabled: false,
      start: '22:00',
      end: '07:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  }), [preferences.notifications]);

  /**
   * Accessibility preferences
   */
  const accessibilityPreferences = useMemo(() => ({
    screenReader: preferences.accessibility?.screenReader || false,
    highContrast: preferences.accessibility?.highContrast || false,
    largeText: preferences.accessibility?.largeText || false,
    reducedMotion: preferences.accessibility?.reducedMotion || false,
    keyboardNavigation: preferences.accessibility?.keyboardNavigation || false
  }), [preferences.accessibility]);

  /**
   * Performance preferences
   */
  const performancePreferences = useMemo(() => ({
    animationsEnabled: preferences.performance?.animationsEnabled !== false,
    autoRefresh: preferences.performance?.autoRefresh !== false,
    refreshInterval: preferences.performance?.refreshInterval || 30000,
    dataPageSize: preferences.performance?.dataPageSize || 20
  }), [preferences.performance]);

  /**
   * Update dashboard preferences
   */
  const updateDashboardPreferences = useCallback(async (dashboardPrefs) => {
    const updatedPreferences = {
      ...preferences,
      dashboardLayout: {
        ...preferences.dashboardLayout,
        ...dashboardPrefs
      }
    };

    return await updatePreferences(updatedPreferences);
  }, [preferences, updatePreferences]);

  /**
   * Update notification preferences
   */
  const updateNotificationPreferences = useCallback(async (notificationPrefs) => {
    return await updatePreferenceCategory(PREFERENCE_CATEGORIES.NOTIFICATIONS, {
      notifications: {
        ...preferences.notifications,
        ...notificationPrefs
      }
    });
  }, [updatePreferenceCategory, preferences.notifications]);

  /**
   * Update accessibility preferences
   */
  const updateAccessibilityPreferences = useCallback(async (accessibilityPrefs) => {
    return await updatePreferenceCategory(PREFERENCE_CATEGORIES.ACCESSIBILITY, {
      accessibility: {
        ...preferences.accessibility,
        ...accessibilityPrefs
      }
    });
  }, [updatePreferenceCategory, preferences.accessibility]);

  /**
   * Update performance preferences
   */
  const updatePerformancePreferences = useCallback(async (performancePrefs) => {
    return await updatePreferenceCategory(PREFERENCE_CATEGORIES.PERFORMANCE, {
      performance: {
        ...preferences.performance,
        ...performancePrefs
      }
    });
  }, [updatePreferenceCategory, preferences.performance]);

  /**
   * Toggle specific preference
   */
  const togglePreference = useCallback(async (path) => {
    const currentValue = getPreference(path, false);
    return await setPreference(path, !currentValue);
  }, [getPreference, setPreference]);

  /**
   * Check if notifications are enabled for a specific channel
   */
  const isNotificationChannelEnabled = useCallback((channel) => {
    return notificationPreferences.channels[channel] || false;
  }, [notificationPreferences.channels]);

  /**
   * Check if notifications are enabled for a specific frequency
   */
  const getNotificationFrequency = useCallback((eventType) => {
    const { frequency } = notificationPreferences;
    
    for (const [freq, events] of Object.entries(frequency)) {
      if (events.includes(eventType)) {
        return freq;
      }
    }
    
    return 'immediate'; // Default frequency
  }, [notificationPreferences.frequency]);

  /**
   * Check if currently in quiet hours
   */
  const isInQuietHours = useCallback(() => {
    const { quietHours } = notificationPreferences;
    
    if (!quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    // Handle quiet hours that span midnight
    if (quietHours.start > quietHours.end) {
      return currentTime >= quietHours.start || currentTime <= quietHours.end;
    } else {
      return currentTime >= quietHours.start && currentTime <= quietHours.end;
    }
  }, [notificationPreferences.quietHours]);

  /**
   * Get CSS classes based on accessibility preferences
   */
  const getAccessibilityClasses = useCallback(() => {
    const classes = [];
    
    if (accessibilityPreferences.highContrast) {
      classes.push('high-contrast');
    }
    
    if (accessibilityPreferences.largeText) {
      classes.push('large-text');
    }
    
    if (accessibilityPreferences.reducedMotion) {
      classes.push('reduced-motion');
    }
    
    if (accessibilityPreferences.keyboardNavigation) {
      classes.push('keyboard-navigation');
    }
    
    return classes.join(' ');
  }, [accessibilityPreferences]);

  /**
   * Get CSS custom properties based on preferences
   */
  const getPreferenceStyles = useCallback(() => {
    const styles = {};
    
    // Animation duration based on performance preferences
    if (!performancePreferences.animationsEnabled) {
      styles['--animation-duration'] = '0ms';
    }
    
    // Refresh interval
    styles['--refresh-interval'] = `${performancePreferences.refreshInterval}ms`;
    
    // Page size for data tables
    styles['--data-page-size'] = performancePreferences.dataPageSize;
    
    return styles;
  }, [performancePreferences]);

  /**
   * Check if a feature should be enabled based on performance preferences
   */
  const isFeatureEnabled = useCallback((feature) => {
    switch (feature) {
      case 'animations':
        return performancePreferences.animationsEnabled;
      case 'autoRefresh':
        return performancePreferences.autoRefresh;
      default:
        return true;
    }
  }, [performancePreferences]);

  return {
    // Raw preference data
    preferences,
    version,
    isDefault,
    loading,
    error,
    lastSyncTime,
    
    // Categorized preferences
    dashboardPreferences,
    notificationPreferences,
    accessibilityPreferences,
    performancePreferences,
    
    // Update functions
    updatePreferences,
    updateDashboardPreferences,
    updateNotificationPreferences,
    updateAccessibilityPreferences,
    updatePerformancePreferences,
    
    // Utility functions
    getPreference,
    setPreference,
    togglePreference,
    clearError,
    
    // Notification helpers
    isNotificationChannelEnabled,
    getNotificationFrequency,
    isInQuietHours,
    
    // Accessibility helpers
    getAccessibilityClasses,
    getPreferenceStyles,
    isFeatureEnabled
  };
};

export default useUserPreferences;
