// User Preference Management Routes
// API endpoints for comprehensive preference management

import express from 'express';
import { authenticateToken, requireEstate } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';
import { rateLimiters } from '../config/rateLimits.js';
import {
  getUserPreferences,
  updateUserPreferences,
  getAllUserPreferences,
  createPreferenceBackup,
  restorePreferenceBackup,
  listPreferenceBackups,
  resetToDefaults,
  getPreferenceStatistics,
  bulkUpdatePreferences
} from '../controllers/preferenceController.js';

const router = express.Router();

// Validation schemas
const updatePreferencesSchema = {
  type: 'object',
  properties: {
    preferences: {
      type: 'object',
      properties: {
        dashboardLayout: {
          type: 'object',
          properties: {
            widgets: { type: 'array' },
            theme: { 
              type: 'string', 
              enum: ['light', 'dark', 'system', 'high-contrast', 'high-contrast-dark'] 
            },
            density: { 
              type: 'string', 
              enum: ['compact', 'comfortable', 'spacious'] 
            }
          }
        },
        notifications: {
          type: 'object',
          properties: {
            channels: {
              type: 'object',
              properties: {
                email: { type: 'boolean' },
                sms: { type: 'boolean' },
                push: { type: 'boolean' },
                inApp: { type: 'boolean' }
              }
            },
            frequency: {
              type: 'object',
              properties: {
                immediate: { type: 'array', items: { type: 'string' } },
                hourly: { type: 'array', items: { type: 'string' } },
                daily: { type: 'array', items: { type: 'string' } },
                weekly: { type: 'array', items: { type: 'string' } }
              }
            },
            quietHours: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                start: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
                end: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
                timezone: { type: 'string' }
              }
            }
          }
        },
        accessibility: {
          type: 'object',
          properties: {
            screenReader: { type: 'boolean' },
            highContrast: { type: 'boolean' },
            largeText: { type: 'boolean' },
            reducedMotion: { type: 'boolean' },
            keyboardNavigation: { type: 'boolean' }
          }
        },
        performance: {
          type: 'object',
          properties: {
            animationsEnabled: { type: 'boolean' },
            autoRefresh: { type: 'boolean' },
            refreshInterval: { type: 'integer', minimum: 5000 },
            dataPageSize: { type: 'integer', minimum: 10, maximum: 100 }
          }
        }
      },
      required: []
    },
    version: { type: 'integer', minimum: 1 }
  },
  required: ['preferences'],
  additionalProperties: false
};

const createBackupSchema = {
  type: 'object',
  properties: {
    backupName: { 
      type: 'string', 
      minLength: 1, 
      maxLength: 255,
      pattern: '^[a-zA-Z0-9_\\-\\s]+$'
    }
  },
  required: ['backupName'],
  additionalProperties: false
};

const bulkUpdateSchema = {
  type: 'object',
  properties: {
    estateIds: {
      type: 'array',
      items: { type: 'integer' },
      minItems: 1,
      maxItems: 50
    },
    preferences: updatePreferencesSchema.properties.preferences
  },
  required: ['estateIds', 'preferences'],
  additionalProperties: false
};

// Apply authentication to all routes
router.use(authenticateToken);

// Get current user preferences for current estate
router.get('/',
  requireEstate,
  rateLimiters.general,
  getUserPreferences
);

// Update user preferences for current estate
router.put('/',
  requireEstate,
  rateLimiters.sensitive,
  validateRequest(updatePreferencesSchema),
  updateUserPreferences
);

// Get preferences for all estates user has access to
router.get('/all',
  rateLimiters.general,
  getAllUserPreferences
);

// Create preference backup
router.post('/backup',
  requireEstate,
  rateLimiters.sensitive,
  validateRequest(createBackupSchema),
  createPreferenceBackup
);

// List preference backups
router.get('/backups',
  requireEstate,
  rateLimiters.general,
  listPreferenceBackups
);

// Restore preferences from backup
router.post('/backup/:backupName/restore',
  requireEstate,
  rateLimiters.sensitive,
  restorePreferenceBackup
);

// Reset preferences to role defaults
router.post('/reset',
  requireEstate,
  rateLimiters.sensitive,
  resetToDefaults
);

// Get preference statistics (Admin and Super Admin only)
router.get('/statistics',
  requireRole(['admin', 'super_admin']),
  rateLimiters.admin,
  getPreferenceStatistics
);

// Bulk update preferences across multiple estates (Super Admin only)
router.put('/bulk',
  requireRole(['super_admin']),
  rateLimiters.admin,
  validateRequest(bulkUpdateSchema),
  bulkUpdatePreferences
);

export default router;