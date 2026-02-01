// User Preference Management Controller
// Handles API endpoints for preference management with multi-estate support

import { preferenceService } from '../services/preferenceService.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';
import loggingService from '../services/loggingService.js';

/**
 * Get user preferences for current estate
 */
export const getUserPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const estateId = req.user.estate_id;

    const result = await preferenceService.getUserPreferences(userId, estateId);

    successResponse(res, {
      preferences: result.preferences,
      version: result.version,
      isDefault: result.isDefault,
      estateId
    }, 'Preferences retrieved successfully');

  } catch (error) {
    loggingService.logError('Failed to get user preferences', error, {
      userId: req.user?.id,
      estateId: req.user?.estate_id
    });
    
    if (error.statusCode) {
      return errorResponse(res, error.message, error.errorCode, error.statusCode);
    }
    
    errorResponse(res, 'Failed to retrieve preferences', 'PREFERENCE_RETRIEVAL_ERROR', 500);
  }
};

/**
 * Update user preferences with real-time application
 */
export const updateUserPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const estateId = req.user.estate_id;
    const { preferences, version } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return errorResponse(res, 'Preferences object is required', 'INVALID_PREFERENCES', 400);
    }

    const result = await preferenceService.updateUserPreferences(
      userId,
      estateId,
      preferences,
      version
    );

    successResponse(res, {
      preferences: result.preferences,
      version: result.version,
      estateId
    }, 'Preferences updated successfully');

  } catch (error) {
    loggingService.logError('Failed to update user preferences', error, {
      userId: req.user?.id,
      estateId: req.user?.estate_id
    });
    
    if (error.statusCode) {
      return errorResponse(res, error.message, error.errorCode, error.statusCode);
    }
    
    errorResponse(res, 'Failed to update preferences', 'PREFERENCE_UPDATE_ERROR', 500);
  }
};

/**
 * Get preferences for all estates user has access to
 */
export const getAllUserPreferences = async (req, res) => {
  try {
    const userId = req.user.id;

    const preferences = await preferenceService.getAllUserPreferences(userId);

    successResponse(res, {
      preferences,
      totalEstates: preferences.length
    }, 'All user preferences retrieved successfully');

  } catch (error) {
    loggingService.logError('Failed to get all user preferences', error, {
      userId: req.user?.id
    });
    
    errorResponse(res, 'Failed to retrieve all preferences', 'PREFERENCE_RETRIEVAL_ERROR', 500);
  }
};

/**
 * Create preference backup
 */
export const createPreferenceBackup = async (req, res) => {
  try {
    const userId = req.user.id;
    const estateId = req.user.estate_id;
    const { backupName } = req.body;

    if (!backupName || typeof backupName !== 'string' || backupName.trim().length === 0) {
      return errorResponse(res, 'Backup name is required', 'INVALID_BACKUP_NAME', 400);
    }

    const result = await preferenceService.createPreferenceBackup(
      userId,
      estateId,
      backupName.trim()
    );

    successResponse(res, result, 'Preference backup created successfully');

  } catch (error) {
    loggingService.logError('Failed to create preference backup', error, {
      userId: req.user?.id,
      estateId: req.user?.estate_id
    });
    
    errorResponse(res, 'Failed to create backup', 'BACKUP_CREATION_ERROR', 500);
  }
};

/**
 * Restore preferences from backup
 */
export const restorePreferenceBackup = async (req, res) => {
  try {
    const userId = req.user.id;
    const estateId = req.user.estate_id;
    const { backupName } = req.params;

    if (!backupName || backupName.trim().length === 0) {
      return errorResponse(res, 'Backup name is required', 'INVALID_BACKUP_NAME', 400);
    }

    const result = await preferenceService.restorePreferenceBackup(
      userId,
      estateId,
      backupName.trim()
    );

    successResponse(res, {
      preferences: result.preferences,
      version: result.version,
      restoredFrom: backupName
    }, 'Preferences restored from backup successfully');

  } catch (error) {
    loggingService.logError('Failed to restore preference backup', error, {
      userId: req.user?.id,
      estateId: req.user?.estate_id,
      backupName: req.params?.backupName
    });
    
    if (error.statusCode) {
      return errorResponse(res, error.message, error.errorCode, error.statusCode);
    }
    
    errorResponse(res, 'Failed to restore backup', 'BACKUP_RESTORE_ERROR', 500);
  }
};

/**
 * List available preference backups
 */
export const listPreferenceBackups = async (req, res) => {
  try {
    const userId = req.user.id;
    const estateId = req.user.estate_id;

    const backups = await preferenceService.listPreferenceBackups(userId, estateId);

    successResponse(res, {
      backups,
      totalBackups: backups.length
    }, 'Preference backups retrieved successfully');

  } catch (error) {
    loggingService.logError('Failed to list preference backups', error, {
      userId: req.user?.id,
      estateId: req.user?.estate_id
    });
    
    errorResponse(res, 'Failed to list backups', 'BACKUP_LIST_ERROR', 500);
  }
};

/**
 * Reset preferences to role defaults
 */
export const resetToDefaults = async (req, res) => {
  try {
    const userId = req.user.id;
    const estateId = req.user.estate_id;

    const result = await preferenceService.resetToDefaults(userId, estateId);

    successResponse(res, {
      preferences: result.preferences,
      version: result.version,
      resetToRole: req.user.role
    }, 'Preferences reset to defaults successfully');

  } catch (error) {
    loggingService.logError('Failed to reset preferences to defaults', error, {
      userId: req.user?.id,
      estateId: req.user?.estate_id
    });
    
    if (error.statusCode) {
      return errorResponse(res, error.message, error.errorCode, error.statusCode);
    }
    
    errorResponse(res, 'Failed to reset preferences', 'PREFERENCE_RESET_ERROR', 500);
  }
};

/**
 * Get preference statistics (Admin only)
 */
export const getPreferenceStatistics = async (req, res) => {
  try {
    const estateId = req.user.role === 'super_admin' ? req.query.estateId : req.user.estate_id;

    const stats = await preferenceService.getPreferenceStatistics(estateId);

    successResponse(res, {
      statistics: stats,
      estateId
    }, 'Preference statistics retrieved successfully');

  } catch (error) {
    loggingService.logError('Failed to get preference statistics', error, {
      userId: req.user?.id,
      estateId: req.user?.estate_id
    });
    
    errorResponse(res, 'Failed to retrieve statistics', 'STATISTICS_ERROR', 500);
  }
};

/**
 * Bulk update preferences for multiple estates (Super Admin only)
 */
export const bulkUpdatePreferences = async (req, res) => {
  try {
    const { estateIds, preferences } = req.body;

    if (!Array.isArray(estateIds) || estateIds.length === 0) {
      return errorResponse(res, 'Estate IDs array is required', 'INVALID_ESTATE_IDS', 400);
    }

    if (!preferences || typeof preferences !== 'object') {
      return errorResponse(res, 'Preferences object is required', 'INVALID_PREFERENCES', 400);
    }

    const results = [];
    const errors = [];

    for (const estateId of estateIds) {
      try {
        const result = await preferenceService.updateUserPreferences(
          req.user.id,
          estateId,
          preferences
        );
        results.push({ estateId, success: true, version: result.version });
      } catch (error) {
        errors.push({ estateId, error: error.message });
      }
    }

    successResponse(res, {
      results,
      errors,
      totalProcessed: estateIds.length,
      successCount: results.length,
      errorCount: errors.length
    }, 'Bulk preference update completed');

  } catch (error) {
    loggingService.logError('Failed to bulk update preferences', error, {
      userId: req.user?.id
    });
    
    errorResponse(res, 'Failed to bulk update preferences', 'BULK_UPDATE_ERROR', 500);
  }
};