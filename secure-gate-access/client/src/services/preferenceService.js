// User Preference Management Service
// Frontend service for comprehensive preference management with real-time updates

import apiClient from '../utils/apiClient.js';
import logger from '../utils/logger';

const PREFERENCES_API_BASE = '/api/preferences';

/**
 * Default preference structure matching backend
 */
export const DEFAULT_PREFERENCES = {
  dashboardLayout: {
    widgets: [],
    theme: 'system',
    density: 'comfortable'
  },
  notifications: {
    channels: {
      email: true,
      sms: false,
      push: true,
      inApp: true
    },
    frequency: {
      immediate: ['security_alert', 'visitor_arrival'],
      hourly: ['visitor_status'],
      daily: ['system_update'],
      weekly: ['report_summary']
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  },
  accessibility: {
    screenReader: false,
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    keyboardNavigation: false
  },
  performance: {
    animationsEnabled: true,
    autoRefresh: true,
    refreshInterval: 30000,
    dataPageSize: 20
  }
};

/**
 * Preference categories for UI organization
 */
export const PREFERENCE_CATEGORIES = {
  DASHBOARD: 'dashboard',
  NOTIFICATIONS: 'notifications',
  ACCESSIBILITY: 'accessibility',
  PERFORMANCE: 'performance'
};

/**
 * Theme options
 */
export const THEME_OPTIONS = [
  { value: 'light', label: 'Light', description: 'Light theme for daytime use' },
  { value: 'dark', label: 'Dark', description: 'Dark theme for low-light environments' },
  { value: 'system', label: 'System', description: 'Follow system preference' },
  { value: 'high-contrast', label: 'High Contrast', description: 'High contrast for accessibility' },
  { value: 'high-contrast-dark', label: 'High Contrast Dark', description: 'Dark high contrast theme' }
];

/**
 * Density options
 */
export const DENSITY_OPTIONS = [
  { value: 'compact', label: 'Compact', description: 'More content in less space' },
  { value: 'comfortable', label: 'Comfortable', description: 'Balanced spacing' },
  { value: 'spacious', label: 'Spacious', description: 'More breathing room' }
];

/**
 * Notification frequency options
 */
export const FREQUENCY_OPTIONS = [
  { value: 'immediate', label: 'Immediate', description: 'Receive notifications instantly' },
  { value: 'hourly', label: 'Hourly', description: 'Batch notifications every hour' },
  { value: 'daily', label: 'Daily', description: 'Daily summary notifications' },
  { value: 'weekly', label: 'Weekly', description: 'Weekly summary notifications' }
];

class PreferenceService {
  constructor() {
    this.cache = new Map();
    this.listeners = new Set();
    this.syncInProgress = false;
  }

  /**
   * Get current user preferences
   */
  async getUserPreferences() {
    try {
      const response = await apiClient.get(PREFERENCES_API_BASE);
      
      if (response.data?.success) {
        const preferences = response.data.data.preferences;
        const version = response.data.data.version;
        const isDefault = response.data.data.isDefault;
        
        // Cache the preferences
        this.cache.set('current', { preferences, version, isDefault });
        
        return { preferences, version, isDefault };
      }
      
      throw new Error('Failed to retrieve preferences');
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      
      // Return defaults if API fails
      return {
        preferences: DEFAULT_PREFERENCES,
        version: 1,
        isDefault: true
      };
    }
  }

  /**
   * Update user preferences with optimistic updates
   */
  async updateUserPreferences(preferences, version = null) {
    try {
      // Optimistic update - notify listeners immediately
      this.notifyListeners({ preferences, version, isDefault: false });
      
      const response = await apiClient.put(PREFERENCES_API_BASE, {
        preferences,
        version
      });
      
      if (response.data?.success) {
        const updatedPrefs = response.data.data.preferences;
        const updatedVersion = response.data.data.version;
        
        // Update cache
        this.cache.set('current', { 
          preferences: updatedPrefs, 
          version: updatedVersion, 
          isDefault: false 
        });
        
        // Notify listeners with final data
        this.notifyListeners({ 
          preferences: updatedPrefs, 
          version: updatedVersion, 
          isDefault: false 
        });
        
        return { preferences: updatedPrefs, version: updatedVersion };
      }
      
      throw new Error('Failed to update preferences');
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      
      // Revert optimistic update by fetching current state
      await this.getUserPreferences();
      
      throw error;
    }
  }

  /**
   * Get preferences for all estates
   */
  async getAllUserPreferences() {
    try {
      const response = await apiClient.get(`${PREFERENCES_API_BASE}/all`);
      
      if (response.data?.success) {
        return response.data.data.preferences;
      }
      
      throw new Error('Failed to retrieve all preferences');
    } catch (error) {
      logger.error('Error getting all user preferences:', error);
      throw error;
    }
  }

  /**
   * Create preference backup
   */
  async createPreferenceBackup(backupName) {
    try {
      const response = await apiClient.post(`${PREFERENCES_API_BASE}/backup`, {
        backupName
      });
      
      if (response.data?.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to create backup');
    } catch (error) {
      logger.error('Error creating preference backup:', error);
      throw error;
    }
  }

  /**
   * Restore preferences from backup
   */
  async restorePreferenceBackup(backupName) {
    try {
      const response = await apiClient.post(`${PREFERENCES_API_BASE}/backup/${backupName}/restore`);
      
      if (response.data?.success) {
        const preferences = response.data.data.preferences;
        const version = response.data.data.version;
        
        // Update cache
        this.cache.set('current', { preferences, version, isDefault: false });
        
        // Notify listeners
        this.notifyListeners({ preferences, version, isDefault: false });
        
        return { preferences, version };
      }
      
      throw new Error('Failed to restore backup');
    } catch (error) {
      logger.error('Error restoring preference backup:', error);
      throw error;
    }
  }

  /**
   * List available backups
   */
  async listPreferenceBackups() {
    try {
      const response = await apiClient.get(`${PREFERENCES_API_BASE}/backups`);
      
      if (response.data?.success) {
        return response.data.data.backups;
      }
      
      throw new Error('Failed to list backups');
    } catch (error) {
      logger.error('Error listing preference backups:', error);
      throw error;
    }
  }

  /**
   * Reset preferences to defaults
   */
  async resetToDefaults() {
    try {
      const response = await apiClient.post(`${PREFERENCES_API_BASE}/reset`);
      
      if (response.data?.success) {
        const preferences = response.data.data.preferences;
        const version = response.data.data.version;
        
        // Update cache
        this.cache.set('current', { preferences, version, isDefault: false });
        
        // Notify listeners
        this.notifyListeners({ preferences, version, isDefault: false });
        
        return { preferences, version };
      }
      
      throw new Error('Failed to reset preferences');
    } catch (error) {
      logger.error('Error resetting preferences:', error);
      throw error;
    }
  }

  /**
   * Update specific preference category
   */
  async updatePreferenceCategory(category, categoryPreferences) {
    try {
      const current = this.cache.get('current');
      if (!current) {
        await this.getUserPreferences();
        return this.updatePreferenceCategory(category, categoryPreferences);
      }
      
      const updatedPreferences = {
        ...current.preferences,
        [category]: {
          ...current.preferences[category],
          ...categoryPreferences
        }
      };
      
      return await this.updateUserPreferences(updatedPreferences, current.version);
    } catch (error) {
      logger.error(`Error updating ${category} preferences:`, error);
      throw error;
    }
  }

  /**
   * Get cached preferences (synchronous)
   */
  getCachedPreferences() {
    const cached = this.cache.get('current');
    return cached || { preferences: DEFAULT_PREFERENCES, version: 1, isDefault: true };
  }

  /**
   * Subscribe to preference changes
   */
  subscribe(listener) {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of preference changes
   */
  notifyListeners(data) {
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        logger.error('Error in preference listener:', error);
      }
    });
  }

  /**
   * Sync preferences across tabs/windows
   */
  syncAcrossTabs() {
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    
    // Listen for storage events (other tabs updating preferences)
    window.addEventListener('storage', (event) => {
      if (event.key === 'preferences-sync') {
        try {
          const data = JSON.parse(event.newValue);
          this.cache.set('current', data);
          this.notifyListeners(data);
        } catch (error) {
          logger.error('Error syncing preferences across tabs:', error);
        }
      }
    });
    
    // Broadcast preference changes to other tabs
    const originalNotify = this.notifyListeners.bind(this);
    this.notifyListeners = (data) => {
      originalNotify(data);
      
      try {
        localStorage.setItem('preferences-sync', JSON.stringify(data));
        // Remove the item immediately to trigger storage event
        localStorage.removeItem('preferences-sync');
      } catch (error) {
        logger.error('Error broadcasting preferences to other tabs:', error);
      }
    };
  }

  /**
   * Validate preference structure
   */
  validatePreferences(preferences) {
    // Deep merge with defaults to ensure all required fields exist
    const validated = this.deepMerge(DEFAULT_PREFERENCES, preferences);
    
    // Validate specific constraints
    if (validated.performance.dataPageSize < 10 || validated.performance.dataPageSize > 100) {
      validated.performance.dataPageSize = 20;
    }
    
    if (validated.performance.refreshInterval < 5000) {
      validated.performance.refreshInterval = 5000;
    }
    
    return validated;
  }

  /**
   * Deep merge utility
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Export preferences for backup
   */
  exportPreferences() {
    const cached = this.getCachedPreferences();
    const exportData = {
      preferences: cached.preferences,
      exportedAt: new Date().toISOString(),
      version: cached.version
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preferences-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import preferences from file
   */
  async importPreferences(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const importData = JSON.parse(event.target.result);
          
          if (!importData.preferences) {
            throw new Error('Invalid preference file format');
          }
          
          const validated = this.validatePreferences(importData.preferences);
          const result = await this.updateUserPreferences(validated);
          
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}

// Create singleton instance
export const preferenceService = new PreferenceService();

// Initialize cross-tab sync
if (typeof window !== 'undefined') {
  preferenceService.syncAcrossTabs();
}

export default preferenceService;