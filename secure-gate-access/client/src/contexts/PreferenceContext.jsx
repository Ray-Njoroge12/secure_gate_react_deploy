// User Preference Context
// React context for comprehensive preference management with real-time updates

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

import { preferenceService, DEFAULT_PREFERENCES } from '../services/preferenceService.js';

import { useAuth } from './AuthContext.js';
import { useTheme } from './ThemeContext.jsx';

const PreferenceContext = createContext(undefined);

/**
 * PreferenceProvider Component
 * Provides preference state and management to the entire application
 */
export const PreferenceProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { setTheme, setDensity } = useTheme();
  
  // Preference state
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [version, setVersion] = useState(1);
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  // Backup management state
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  
  // Multi-estate preferences
  const [allPreferences, setAllPreferences] = useState([]);
  
  // Refs for cleanup
  const unsubscribeRef = useRef(null);
  const syncTimeoutRef = useRef(null);

  /**
   * Load user preferences from service
   */
  const loadPreferences = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await preferenceService.getUserPreferences();
      
      setPreferences(result.preferences);
      setVersion(result.version);
      setIsDefault(result.isDefault);
      setLastSyncTime(new Date());
      
      // Apply theme preferences immediately
      if (result.preferences.dashboardLayout) {
        if (result.preferences.dashboardLayout.theme) {
          setTheme(result.preferences.dashboardLayout.theme);
        }
        if (result.preferences.dashboardLayout.density) {
          setDensity(result.preferences.dashboardLayout.density);
        }
      }
      
    } catch (err) {
      console.error('Failed to load preferences:', err);
      setError(err.message || 'Failed to load preferences');
      
      // Use defaults on error
      setPreferences(DEFAULT_PREFERENCES);
      setVersion(1);
      setIsDefault(true);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, setTheme, setDensity]);

  /**
   * Update preferences with real-time application
   */
  const updatePreferences = useCallback(async (newPreferences, optimistic = true) => {
    if (!isAuthenticated || !user) return;
    
    setError(null);
    
    // Optimistic update
    if (optimistic) {
      setPreferences(newPreferences);
      
      // Apply theme changes immediately
      if (newPreferences.dashboardLayout) {
        if (newPreferences.dashboardLayout.theme) {
          setTheme(newPreferences.dashboardLayout.theme);
        }
        if (newPreferences.dashboardLayout.density) {
          setDensity(newPreferences.dashboardLayout.density);
        }
      }
    }
    
    try {
      const result = await preferenceService.updateUserPreferences(newPreferences, version);
      
      // Update with server response
      setPreferences(result.preferences);
      setVersion(result.version);
      setIsDefault(false);
      setLastSyncTime(new Date());
      
      return result;
    } catch (err) {
      console.error('Failed to update preferences:', err);
      setError(err.message || 'Failed to update preferences');
      
      // Revert optimistic update on error
      if (optimistic) {
        await loadPreferences();
      }
      
      throw err;
    }
  }, [isAuthenticated, user, version, setTheme, setDensity, loadPreferences]);

  /**
   * Update specific preference category
   */
  const updatePreferenceCategory = useCallback(async (category, categoryPreferences) => {
    const updatedPreferences = {
      ...preferences,
      [category]: {
        ...preferences[category],
        ...categoryPreferences
      }
    };
    
    return await updatePreferences(updatedPreferences);
  }, [preferences, updatePreferences]);

  /**
   * Load all user preferences across estates
   */
  const loadAllPreferences = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      const result = await preferenceService.getAllUserPreferences();
      setAllPreferences(result);
      return result;
    } catch (err) {
      console.error('Failed to load all preferences:', err);
      setError(err.message || 'Failed to load all preferences');
      throw err;
    }
  }, [isAuthenticated, user]);

  /**
   * Create preference backup
   */
  const createBackup = useCallback(async (backupName) => {
    if (!isAuthenticated || !user) return;
    
    setBackupLoading(true);
    
    try {
      const result = await preferenceService.createPreferenceBackup(backupName);
      
      // Refresh backup list
      await loadBackups();
      
      return result;
    } catch (err) {
      console.error('Failed to create backup:', err);
      setError(err.message || 'Failed to create backup');
      throw err;
    } finally {
      setBackupLoading(false);
    }
  }, [isAuthenticated, user]);

  /**
   * Restore preferences from backup
   */
  const restoreBackup = useCallback(async (backupName) => {
    if (!isAuthenticated || !user) return;
    
    setBackupLoading(true);
    
    try {
      const result = await preferenceService.restorePreferenceBackup(backupName);
      
      setPreferences(result.preferences);
      setVersion(result.version);
      setIsDefault(false);
      setLastSyncTime(new Date());
      
      // Apply theme changes
      if (result.preferences.dashboardLayout) {
        if (result.preferences.dashboardLayout.theme) {
          setTheme(result.preferences.dashboardLayout.theme);
        }
        if (result.preferences.dashboardLayout.density) {
          setDensity(result.preferences.dashboardLayout.density);
        }
      }
      
      return result;
    } catch (err) {
      console.error('Failed to restore backup:', err);
      setError(err.message || 'Failed to restore backup');
      throw err;
    } finally {
      setBackupLoading(false);
    }
  }, [isAuthenticated, user, setTheme, setDensity]);

  /**
   * Load available backups
   */
  const loadBackups = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      const result = await preferenceService.listPreferenceBackups();
      setBackups(result);
      return result;
    } catch (err) {
      console.error('Failed to load backups:', err);
      setError(err.message || 'Failed to load backups');
      throw err;
    }
  }, [isAuthenticated, user]);

  /**
   * Reset preferences to defaults
   */
  const resetToDefaults = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      const result = await preferenceService.resetToDefaults();
      
      setPreferences(result.preferences);
      setVersion(result.version);
      setIsDefault(false);
      setLastSyncTime(new Date());
      
      // Apply theme changes
      if (result.preferences.dashboardLayout) {
        if (result.preferences.dashboardLayout.theme) {
          setTheme(result.preferences.dashboardLayout.theme);
        }
        if (result.preferences.dashboardLayout.density) {
          setDensity(result.preferences.dashboardLayout.density);
        }
      }
      
      return result;
    } catch (err) {
      console.error('Failed to reset preferences:', err);
      setError(err.message || 'Failed to reset preferences');
      throw err;
    }
  }, [isAuthenticated, user, setTheme, setDensity]);

  /**
   * Export preferences to file
   */
  const exportPreferences = useCallback(() => {
    preferenceService.exportPreferences();
  }, []);

  /**
   * Import preferences from file
   */
  const importPreferences = useCallback(async (file) => {
    try {
      const result = await preferenceService.importPreferences(file);
      
      setPreferences(result.preferences);
      setVersion(result.version);
      setIsDefault(false);
      setLastSyncTime(new Date());
      
      // Apply theme changes
      if (result.preferences.dashboardLayout) {
        if (result.preferences.dashboardLayout.theme) {
          setTheme(result.preferences.dashboardLayout.theme);
        }
        if (result.preferences.dashboardLayout.density) {
          setDensity(result.preferences.dashboardLayout.density);
        }
      }
      
      return result;
    } catch (err) {
      console.error('Failed to import preferences:', err);
      setError(err.message || 'Failed to import preferences');
      throw err;
    }
  }, [setTheme, setDensity]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get preference value by path (e.g., 'dashboardLayout.theme')
   */
  const getPreference = useCallback((path, defaultValue = null) => {
    const keys = path.split('.');
    let value = preferences;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }, [preferences]);

  /**
   * Set preference value by path
   */
  const setPreference = useCallback(async (path, value) => {
    const keys = path.split('.');
    const updatedPreferences = { ...preferences };
    let current = updatedPreferences;
    
    // Navigate to the parent object
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    // Set the final value
    current[keys[keys.length - 1]] = value;
    
    return await updatePreferences(updatedPreferences);
  }, [preferences, updatePreferences]);

  // Load preferences when user changes or component mounts
  useEffect(() => {
    if (isAuthenticated && user) {
      loadPreferences();
    }
  }, [isAuthenticated, user, loadPreferences]);

  // Subscribe to preference service updates
  useEffect(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    
    unsubscribeRef.current = preferenceService.subscribe((data) => {
      setPreferences(data.preferences);
      setVersion(data.version);
      setIsDefault(data.isDefault);
      setLastSyncTime(new Date());
    });
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  const value = {
    // Preference state
    preferences,
    version,
    isDefault,
    loading,
    error,
    lastSyncTime,
    
    // Multi-estate preferences
    allPreferences,
    
    // Backup management
    backups,
    backupLoading,
    
    // Preference management functions
    loadPreferences,
    updatePreferences,
    updatePreferenceCategory,
    loadAllPreferences,
    
    // Backup functions
    createBackup,
    restoreBackup,
    loadBackups,
    resetToDefaults,
    
    // Import/Export functions
    exportPreferences,
    importPreferences,
    
    // Utility functions
    getPreference,
    setPreference,
    clearError
  };

  return (
    <PreferenceContext.Provider value={value}>
      {children}
    </PreferenceContext.Provider>
  );
};

/**
 * usePreferences Hook
 * Access preference state and management functions from any component
 */
export const usePreferences = () => {
  const context = useContext(PreferenceContext);
  
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferenceProvider');
  }
  
  return context;
};

export default PreferenceContext;