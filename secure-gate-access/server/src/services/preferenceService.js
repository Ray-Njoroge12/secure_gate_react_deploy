// User Preference Management Service
// Handles comprehensive preference storage, retrieval, and multi-estate isolation

import { dbManager } from '../database/db.enhanced.js';
import loggingService from './loggingService.js';
import { ErrorHelper } from '../middleware/standardizedErrorHandler.js';

/**
 * Default preference structure based on design specification
 */
const DEFAULT_PREFERENCES = {
  // Dashboard Customization
  dashboardLayout: {
    widgets: [],
    theme: 'system',
    density: 'comfortable'
  },
  
  // Notification Preferences
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
      timezone: 'UTC'
    }
  },
  
  // Accessibility Settings
  accessibility: {
    screenReader: false,
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    keyboardNavigation: false
  },
  
  // Performance Settings
  performance: {
    animationsEnabled: true,
    autoRefresh: true,
    refreshInterval: 30000,
    dataPageSize: 20
  }
};

/**
 * Role-based preference defaults
 */
const ROLE_DEFAULTS = {
  super_admin: {
    ...DEFAULT_PREFERENCES,
    dashboardLayout: {
      ...DEFAULT_PREFERENCES.dashboardLayout,
      density: 'comfortable'
    },
    performance: {
      ...DEFAULT_PREFERENCES.performance,
      dataPageSize: 50
    }
  },
  admin: {
    ...DEFAULT_PREFERENCES,
    dashboardLayout: {
      ...DEFAULT_PREFERENCES.dashboardLayout,
      density: 'comfortable'
    },
    performance: {
      ...DEFAULT_PREFERENCES.performance,
      dataPageSize: 30
    }
  },
  guard: {
    ...DEFAULT_PREFERENCES,
    dashboardLayout: {
      ...DEFAULT_PREFERENCES.dashboardLayout,
      theme: 'dark',
      density: 'compact'
    },
    notifications: {
      ...DEFAULT_PREFERENCES.notifications,
      channels: {
        ...DEFAULT_PREFERENCES.notifications.channels,
        push: true,
        inApp: true
      }
    }
  },
  resident: {
    ...DEFAULT_PREFERENCES,
    dashboardLayout: {
      ...DEFAULT_PREFERENCES.dashboardLayout,
      density: 'comfortable'
    }
  }
};

class PreferenceService {
  constructor() {
    this.databaseInitialized = false;
    this.databaseInitializationPromise = null;

    void this.ensureDatabaseInitialized().catch(() => { });
  }

  async ensureDatabaseInitialized() {
    if (this.databaseInitialized) {
      return true;
    }

    if (!dbManager?.isInitialized || !dbManager?.pool) {
      return false;
    }

    if (!this.databaseInitializationPromise) {
      this.databaseInitializationPromise = this.initializeDatabase()
        .then(() => {
          this.databaseInitialized = true;
          return true;
        })
        .catch((error) => {
          this.databaseInitializationPromise = null;
          throw error;
        });
    }

    return this.databaseInitializationPromise;
  }

  /**
   * Initialize database tables for preferences
   */
  async initializeDatabase() {
    try {
      await dbManager.query(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          estate_id INTEGER REFERENCES estates(id) ON DELETE CASCADE,
          preferences JSONB NOT NULL DEFAULT '{}',
          version INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, estate_id)
        )
      `);

      await dbManager.query(`
        CREATE INDEX IF NOT EXISTS idx_user_preferences_user_estate 
        ON user_preferences(user_id, estate_id)
      `);

      await dbManager.query(`
        CREATE TABLE IF NOT EXISTS preference_backups (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          estate_id INTEGER REFERENCES estates(id) ON DELETE CASCADE,
          backup_name VARCHAR(255) NOT NULL,
          preferences JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, estate_id, backup_name)
        )
      `);

      loggingService.logInfo('Preference service database initialized');
    } catch (error) {
      loggingService.logError('Failed to initialize preference service database', error);
      throw error;
    }
  }

  /**
   * Get user preferences for a specific estate
   */
  async getUserPreferences(userId, estateId = null) {
    await this.ensureDatabaseInitialized();

    try {
      const result = await dbManager.query(
        'SELECT preferences, version FROM user_preferences WHERE user_id = $1 AND estate_id = $2',
        [userId, estateId]
      );

      if (result.rows.length === 0) {
        // Return role-based defaults if no preferences exist
        const userResult = await dbManager.query(
          'SELECT role FROM users WHERE id = $1',
          [userId]
        );

        if (userResult.rows.length === 0) {
          throw ErrorHelper.notFound('User', userId);
        }

        const role = userResult.rows[0].role;
        return {
          preferences: ROLE_DEFAULTS[role] || DEFAULT_PREFERENCES,
          version: 1,
          isDefault: true
        };
      }

      return {
        preferences: result.rows[0].preferences,
        version: result.rows[0].version,
        isDefault: false
      };
    } catch (error) {
      loggingService.logError('Failed to get user preferences', error, {
        userId,
        estateId
      });
      throw error;
    }
  }

  /**
   * Update user preferences with real-time application
   */
  async updateUserPreferences(userId, estateId, preferences, version = null) {
    await this.ensureDatabaseInitialized();

    const client = await dbManager.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate preferences structure
      const validatedPreferences = this.validatePreferences(preferences);

      // Check version for optimistic locking if provided
      if (version !== null) {
        const currentResult = await client.query(
          'SELECT version FROM user_preferences WHERE user_id = $1 AND estate_id = $2',
          [userId, estateId]
        );

        if (currentResult.rows.length > 0 && currentResult.rows[0].version !== version) {
          throw ErrorHelper.badRequest('Preference version conflict', {
            currentVersion: currentResult.rows[0].version,
            providedVersion: version
          });
        }
      }

      // Upsert preferences
      const result = await client.query(`
        INSERT INTO user_preferences (user_id, estate_id, preferences, version)
        VALUES ($1, $2, $3, COALESCE($4, 1))
        ON CONFLICT (user_id, estate_id)
        DO UPDATE SET 
          preferences = EXCLUDED.preferences,
          version = user_preferences.version + 1,
          updated_at = NOW()
        RETURNING preferences, version
      `, [userId, estateId, JSON.stringify(validatedPreferences), version]);

      // Log preference update
      await client.query(`
        INSERT INTO audit_logs (user_id, action, resource, entity_type, entity_id, outcome, message, estate_id)
        VALUES ($1, 'preferences_updated', 'preferences', 'user_preferences', $2, 'success', 'User preferences updated', $3)
      `, [userId, userId, estateId]);

      await client.query('COMMIT');

      loggingService.logInfo('User preferences updated', {
        userId,
        estateId,
        version: result.rows[0].version
      });

      return {
        preferences: result.rows[0].preferences,
        version: result.rows[0].version
      };
    } catch (error) {
      await client.query('ROLLBACK');
      loggingService.logError('Failed to update user preferences', error, {
        userId,
        estateId
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get preferences for all estates a user has access to
   */
  async getAllUserPreferences(userId) {
    await this.ensureDatabaseInitialized();

    try {
      const result = await dbManager.query(`
        SELECT 
          up.estate_id,
          up.preferences,
          up.version,
          e.name as estate_name
        FROM user_preferences up
        LEFT JOIN estates e ON e.id = up.estate_id
        WHERE up.user_id = $1
        ORDER BY e.name
      `, [userId]);

      return result.rows.map(row => ({
        estateId: row.estate_id,
        estateName: row.estate_name,
        preferences: row.preferences,
        version: row.version
      }));
    } catch (error) {
      loggingService.logError('Failed to get all user preferences', error, {
        userId
      });
      throw error;
    }
  }

  /**
   * Create preference backup
   */
  async createPreferenceBackup(userId, estateId, backupName) {
    await this.ensureDatabaseInitialized();

    try {
      const currentPrefs = await this.getUserPreferences(userId, estateId);

      await dbManager.query(`
        INSERT INTO preference_backups (user_id, estate_id, backup_name, preferences)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, estate_id, backup_name)
        DO UPDATE SET 
          preferences = EXCLUDED.preferences,
          created_at = NOW()
      `, [userId, estateId, backupName, JSON.stringify(currentPrefs.preferences)]);

      loggingService.logInfo('Preference backup created', {
        userId,
        estateId,
        backupName
      });

      return { success: true, backupName };
    } catch (error) {
      loggingService.logError('Failed to create preference backup', error, {
        userId,
        estateId,
        backupName
      });
      throw error;
    }
  }

  /**
   * Restore preferences from backup
   */
  async restorePreferenceBackup(userId, estateId, backupName) {
    await this.ensureDatabaseInitialized();

    try {
      const backupResult = await dbManager.query(
        'SELECT preferences FROM preference_backups WHERE user_id = $1 AND estate_id = $2 AND backup_name = $3',
        [userId, estateId, backupName]
      );

      if (backupResult.rows.length === 0) {
        throw ErrorHelper.notFound('Preference backup', backupName);
      }

      const restoredPrefs = await this.updateUserPreferences(
        userId,
        estateId,
        backupResult.rows[0].preferences
      );

      loggingService.logInfo('Preferences restored from backup', {
        userId,
        estateId,
        backupName
      });

      return restoredPrefs;
    } catch (error) {
      loggingService.logError('Failed to restore preference backup', error, {
        userId,
        estateId,
        backupName
      });
      throw error;
    }
  }

  /**
   * List available backups for a user
   */
  async listPreferenceBackups(userId, estateId) {
    await this.ensureDatabaseInitialized();

    try {
      const result = await dbManager.query(
        'SELECT backup_name, created_at FROM preference_backups WHERE user_id = $1 AND estate_id = $2 ORDER BY created_at DESC',
        [userId, estateId]
      );

      return result.rows;
    } catch (error) {
      loggingService.logError('Failed to list preference backups', error, {
        userId,
        estateId
      });
      throw error;
    }
  }

  /**
   * Reset preferences to role defaults
   */
  async resetToDefaults(userId, estateId) {
    await this.ensureDatabaseInitialized();

    try {
      const userResult = await dbManager.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw ErrorHelper.notFound('User', userId);
      }

      const role = userResult.rows[0].role;
      const defaultPrefs = ROLE_DEFAULTS[role] || DEFAULT_PREFERENCES;

      const result = await this.updateUserPreferences(userId, estateId, defaultPrefs);

      loggingService.logInfo('Preferences reset to defaults', {
        userId,
        estateId,
        role
      });

      return result;
    } catch (error) {
      loggingService.logError('Failed to reset preferences to defaults', error, {
        userId,
        estateId
      });
      throw error;
    }
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
   * Deep merge utility for preference validation
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
   * Get preference statistics for admin dashboard
   */
  async getPreferenceStatistics(estateId = null) {
    await this.ensureDatabaseInitialized();

    try {
      const whereClause = estateId ? 'WHERE estate_id = $1' : '';
      const params = estateId ? [estateId] : [];

      const result = await dbManager.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN preferences->>'dashboardLayout'->>'theme' = 'dark' THEN 1 END) as dark_theme_users,
          COUNT(CASE WHEN preferences->>'accessibility'->>'highContrast' = 'true' THEN 1 END) as high_contrast_users,
          COUNT(CASE WHEN preferences->>'notifications'->>'channels'->>'push' = 'true' THEN 1 END) as push_enabled_users,
          AVG((preferences->>'performance'->>'dataPageSize')::int) as avg_page_size
        FROM user_preferences
        ${whereClause}
      `, params);

      return result.rows[0];
    } catch (error) {
      loggingService.logError('Failed to get preference statistics', error, {
        estateId
      });
      throw error;
    }
  }
}

export const preferenceService = new PreferenceService();
export default preferenceService;