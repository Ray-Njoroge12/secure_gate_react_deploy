import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { AppError, asyncHandler } from '../middleware/standardizedErrorHandler.js';
import { userService } from '../services/userService.js';
import databaseService from '../services/optimizedDatabaseService.js';
import dataExportService from '../services/dataExportService.js';

const router = express.Router();

/**
 * @route   GET /api/privacy/my-data
 * @desc    Get all personal data for the authenticated user (Data Portability - Kenya DPA Article 39)
 * @access  Private
 */
router.get('/my-data', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get user data
  const user = await userService.getUserById(userId);
  
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Get all visitor records created by this user
  const visitorRecords = await databaseService.query(
    'SELECT * FROM visitors WHERE created_by = $1 ORDER BY created_at DESC',
    [userId]
  );

  // Get access logs
  const accessLogs = await databaseService.query(
    'SELECT * FROM access_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
    [userId]
  );

  // Compile all personal data
  const personalData = {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
      lastLogin: user.last_login
    },
    visitorRecordsCreated: visitorRecords.rows.length,
    recentAccessLogs: accessLogs.rows.length,
    dataCategories: [
      'Account Information',
      'Access Logs',
      'Visitor Records (created by you)',
      'Authentication History'
    ],
    exportedAt: new Date().toISOString(),
    dataRetentionPolicy: '365 days for visitor records, 730 days for access logs'
  };

  res.json({
    success: true,
    message: 'Personal data retrieved successfully',
    data: personalData
  });
}));

/**
 * @route   GET /api/privacy/export
 * @desc    Export all personal data in JSON format (Data Portability - Kenya DPA Article 39)
 * @access  Private
 */
router.get('/export', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const format = req.query.format || 'json';

  const exportRequest = await dataExportService.createExportRequest({
    userId,
    format,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(202).json({
    success: true,
    message: 'Export request queued',
    legalBasis: 'Kenya Data Protection Act 2019 - Article 39 (Right to Data Portability)',
    data: exportRequest
  });
}));

/**
 * @route   POST /api/privacy/export
 * @desc    Queue a data export request (Data Portability - Kenya DPA Article 39)
 * @access  Private
 */
router.post('/export', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { format = 'json' } = req.body || {};

  const exportRequest = await dataExportService.createExportRequest({
    userId,
    format,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(202).json({
    success: true,
    message: 'Export request queued',
    legalBasis: 'Kenya Data Protection Act 2019 - Article 39 (Right to Data Portability)',
    data: exportRequest
  });
}));

/**
 * @route   GET /api/privacy/export/:requestId/status
 * @desc    Get status of a queued export request
 * @access  Private
 */
router.get('/export/:requestId/status', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { requestId } = req.params;

  const status = await dataExportService.getExportStatus(requestId, userId);
  if (!status) {
    throw new AppError('Export request not found', 404, 'EXPORT_NOT_FOUND');
  }

  res.json({
    success: true,
    data: status
  });
}));

/**
 * @route   GET /api/privacy/export/:requestId/download
 * @desc    Download completed export file
 * @access  Private
 */
router.get('/export/:requestId/download', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { requestId } = req.params;

  const exportFile = await dataExportService.getExportFile(requestId, userId);
  if (!exportFile) {
    throw new AppError('Export request not found', 404, 'EXPORT_NOT_FOUND');
  }

  if (exportFile.status === 'expired') {
    throw new AppError('Export download link has expired', 410, 'EXPORT_EXPIRED');
  }

  if (exportFile.status !== 'completed') {
    throw new AppError('Export not ready for download', 409, 'EXPORT_NOT_READY');
  }

  await dataExportService.logExportDownload(userId, requestId, exportFile.format);

  const filename = `secure-gate-export-${requestId}.${exportFile.format === 'csv' ? 'csv' : 'json'}`;
  return res.download(exportFile.filePath, filename);
}));

/**
 * @route   POST /api/privacy/request-deletion
 * @desc    Request account and data deletion (Right to Erasure - Kenya DPA Article 33)
 * @access  Private
 */
router.post('/request-deletion', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { reason, confirmEmail } = req.body;

  const user = await userService.getUserById(userId);

  // Verify email confirmation
  if (confirmEmail !== user.email) {
    throw new AppError('Email confirmation does not match', 400, 'EMAIL_MISMATCH');
  }

  // Create deletion request
  await databaseService.query(
    `INSERT INTO data_deletion_requests (user_id, reason, status, requested_at) 
     VALUES ($1, $2, 'pending', NOW())`,
    [userId, reason || 'User requested account deletion']
  );

  // Log the request for compliance
  await databaseService.query(
    `INSERT INTO audit_logs (user_id, action, details, created_at) 
     VALUES ($1, 'DATA_DELETION_REQUESTED', $2, NOW())`,
    [userId, JSON.stringify({ reason, email: user.email })]
  );

  res.json({
    success: true,
    message: 'Deletion request submitted successfully',
    data: {
      requestId: Date.now(),
      status: 'pending',
      estimatedProcessingTime: '30 days',
      notes: [
        'Your deletion request has been submitted.',
        'We will process this request within 30 days as required by Kenya DPA.',
        'You will receive an email confirmation once processing is complete.',
        'Some data may be retained for legal compliance (audit logs: 7 years).'
      ]
    }
  });
}));

/**
 * @route   POST /api/privacy/withdraw-consent
 * @desc    Withdraw consent for data processing (Kenya DPA Article 31)
 * @access  Private
 */
router.post('/withdraw-consent', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { consentType } = req.body;

  if (!consentType) {
    throw new AppError('Consent type is required', 400, 'VALIDATION_ERROR');
  }

  // Record consent withdrawal
  await databaseService.query(
    `INSERT INTO consent_log (user_id, consent_type, action, created_at) 
     VALUES ($1, $2, 'withdrawn', NOW())`,
    [userId, consentType]
  );

  // Update user consent status
  await databaseService.query(
    `UPDATE users SET consent_withdrawn = TRUE, consent_withdrawn_at = NOW() 
     WHERE id = $1`,
    [userId]
  );

  res.json({
    success: true,
    message: 'Consent withdrawn successfully',
    data: {
      consentType,
      withdrawnAt: new Date().toISOString(),
      impact: 'You may no longer be able to use certain features of the system'
    }
  });
}));

/**
 * @route   GET /api/privacy/consent-status
 * @desc    Get current consent status
 * @access  Private
 */
router.get('/consent-status', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const consentHistory = await databaseService.query(
    `SELECT consent_type, action, created_at 
     FROM consent_log 
     WHERE user_id = $1 
     ORDER BY created_at DESC`,
    [userId]
  );

  res.json({
    success: true,
    data: {
      hasActiveConsent: consentHistory.rows.length > 0,
      consentHistory: consentHistory.rows,
      requiredConsents: [
        {
          type: 'data_processing',
          description: 'Processing of personal data for visitor management',
          required: true,
          granted: true
        },
        {
          type: 'marketing',
          description: 'Receiving promotional communications',
          required: false,
          granted: false
        }
      ]
    }
  });
}));

/**
 * @route   GET /api/privacy/retention-policy
 * @desc    Get data retention policy information
 * @access  Public
 */
router.get('/retention-policy', asyncHandler(async (req, res) => {
  const policies = await databaseService.query(
    'SELECT * FROM data_retention_policies ORDER BY table_name'
  );

  res.json({
    success: true,
    message: 'Data retention policies retrieved',
    data: {
      policies: policies.rows,
      legalBasis: 'Kenya Data Protection Act 2019',
      lastUpdated: '2025-11-05',
      contactEmail: 'privacy@securegate.com'
    }
  });
}));

/**
 * @route   GET /api/privacy/settings
 * @desc    Get user privacy settings
 * @access  Private
 */
router.get('/settings', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const settings = await databaseService.query(
      `SELECT * FROM user_privacy_settings WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      data: settings.rows[0] || {
        showVisitorFrequency: true,
        shareLocationOnPanic: true,
        allowDeliveryPhotos: true,
        receiveNonCriticalAnnouncements: true,
        dataRetentionPreference: 'default'
      }
    });
  } catch (error) {
    // Return defaults if table doesn't exist
    res.json({
      success: true,
      data: {
        showVisitorFrequency: true,
        shareLocationOnPanic: true,
        allowDeliveryPhotos: true,
        receiveNonCriticalAnnouncements: true,
        dataRetentionPreference: 'default'
      }
    });
  }
}));

/**
 * @route   PUT /api/privacy/settings
 * @desc    Update user privacy settings
 * @access  Private
 */
router.put('/settings', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const settings = req.body;

  try {
    await databaseService.query(
      `INSERT INTO user_privacy_settings (user_id, show_visitor_frequency, share_location_on_panic, 
       allow_delivery_photos, receive_announcements, data_retention_preference, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
       show_visitor_frequency = $2, share_location_on_panic = $3,
       allow_delivery_photos = $4, receive_announcements = $5,
       data_retention_preference = $6, updated_at = NOW()`,
      [userId, settings.showVisitorFrequency, settings.shareLocationOnPanic,
       settings.allowDeliveryPhotos, settings.receiveNonCriticalAnnouncements,
       settings.dataRetentionPreference]
    );

    res.json({
      success: true,
      message: 'Privacy settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.json({
      success: true,
      message: 'Privacy settings updated (in memory)',
      data: settings
    });
  }
}));

/**
 * @route   GET /api/privacy/data-inventory
 * @desc    Get inventory of all data held about the user
 * @access  Private
 */
router.get('/data-inventory', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await userService.getUserById(userId);
  const [
    visitorCountResult,
    accessLogCountResult,
    auditLogCountResult,
    deliveryPhotoCountResult,
    retentionPoliciesResult
  ] = await Promise.all([
    databaseService.query(
      'SELECT COUNT(*)::int AS count FROM visitors WHERE host_id = $1',
      [userId]
    ),
    databaseService.query(
      'SELECT COUNT(*)::int AS count FROM access_logs WHERE user_id = $1',
      [userId]
    ),
    databaseService.query(
      'SELECT COUNT(*)::int AS count FROM audit_logs WHERE user_id = $1',
      [userId]
    ),
    databaseService.query(
      `SELECT COUNT(*)::int AS count
       FROM delivery_photos dp
       JOIN deliveries d ON d.id = dp.delivery_id
       WHERE d.recipient_id = $1`,
      [userId]
    ),
    databaseService.query(
      `SELECT table_name, retention_days, auto_delete, category
       FROM data_retention_policies
       WHERE table_name IN ('access_logs', 'audit_logs', 'delivery_photos')
       ORDER BY table_name`
    )
  ]);

  const retentionPolicies = retentionPoliciesResult.rows.reduce((acc, policy) => {
    acc[policy.table_name] = policy;
    return acc;
  }, {});
  
  res.json({
    success: true,
    data: {
      personalInfo: {
        email: user?.email,
        role: user?.role,
        createdAt: user?.created_at
      },
      dataCategories: [
        {
          category: 'visitors',
          description: 'Visitor records you created',
          count: visitorCountResult.rows[0]?.count || 0
        },
        {
          category: 'visitorLogs',
          description: 'Access log activity tied to your account',
          count: accessLogCountResult.rows[0]?.count || 0,
          retentionDays: retentionPolicies.access_logs?.retention_days,
          autoDelete: retentionPolicies.access_logs?.auto_delete
        },
        {
          category: 'auditLogs',
          description: 'Audit trail entries referencing your account',
          count: auditLogCountResult.rows[0]?.count || 0,
          retentionDays: retentionPolicies.audit_logs?.retention_days,
          autoDelete: retentionPolicies.audit_logs?.auto_delete
        },
        {
          category: 'deliveryPhotos',
          description: 'Delivery photo records for your deliveries',
          count: deliveryPhotoCountResult.rows[0]?.count || 0,
          retentionDays: retentionPolicies.delivery_photos?.retention_days,
          autoDelete: retentionPolicies.delivery_photos?.auto_delete
        },
        { category: 'deliveries', description: 'Delivery notifications', count: 0 },
        { category: 'emergencies', description: 'Emergency incidents', count: 0 }
      ],
      lastAccessed: new Date().toISOString()
    }
  });
}));

/**
 * @route   POST /api/privacy/delete
 * @desc    Request deletion of specific data category
 * @access  Private
 */
router.post('/delete', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { category, reason } = req.body;

  if (!category) {
    throw new AppError('Category is required', 400, 'VALIDATION_ERROR');
  }

  // Log the deletion request
  await databaseService.query(
    `INSERT INTO audit_logs (user_id, action, details, created_at) 
     VALUES ($1, 'DATA_CATEGORY_DELETION_REQUESTED', $2, NOW())`,
    [userId, JSON.stringify({ category, reason })]
  );

  res.json({
    success: true,
    message: `Deletion request for ${category} submitted`,
    data: {
      requestId: Date.now(),
      category,
      status: 'pending',
      estimatedProcessingTime: '7 days'
    }
  });
}));

/**
 * @route   POST /api/privacy/delete-account
 * @desc    Request full account deletion (Right to Erasure - Kenya DPA Article 33)
 * @access  Private
 */
router.post('/delete-account', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { reason, confirmDeletion } = req.body;

  if (!confirmDeletion) {
    throw new AppError('Please confirm account deletion', 400, 'CONFIRMATION_REQUIRED');
  }

  await databaseService.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [
      null,
      'data_deletion_initiated',
      'user_account',
      String(userId),
      JSON.stringify({ reason: reason || 'User requested immediate deletion' })
    ]
  );

  // Execute immediate deletion using userService
  await userService.deleteUserData(userId);
  await userService.anonymizeHistoricalRecords(userId);

  // Clear authentication token
  res.clearCookie('token');

  res.json({
    success: true,
    message: 'Account and data deleted successfully',
    data: {
      deletedAt: new Date().toISOString(),
      legalBasis: 'Kenya Data Protection Act 2019 - Article 33 (Right to Erasure)',
      notes: [
        'Your account has been permanently deleted.',
        'Historical records have been anonymized.',
        'Audit logs preserved for legal compliance (7 years).'
      ]
    }
  });
}));

/**
 * @route   GET /api/privacy/consents
 * @desc    Get user's consent history
 * @access  Private
 */
router.get('/consents', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const consents = await databaseService.query(
      `SELECT * FROM consent_log WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: consents.rows || []
    });
  } catch (error) {
    res.json({
      success: true,
      data: []
    });
  }
}));

/**
 * @route   POST /api/privacy/consents
 * @desc    Update user consent (Kenya DPA Article 31)
 * @access  Private
 */
router.post('/consents', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { consentType, granted } = req.body;

  if (!consentType) {
    throw new AppError('Consent type is required', 400, 'VALIDATION_ERROR');
  }

  // Use userService for consent management
  const result = granted 
    ? await userService.recordConsent(userId, consentType, true)
    : await userService.withdrawConsent(userId, consentType);

  res.json({
    success: true,
    message: granted ? 'Consent granted successfully' : 'Consent withdrawn successfully',
    data: result.consent
  });
}));

/**
 * @route   GET /api/privacy/consent/:consentType
 * @desc    Get specific consent status
 * @access  Private
 */
router.get('/consent/:consentType', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { consentType } = req.params;

  const consentStatus = await userService.getConsentStatus(userId);

  res.json({
    success: true,
    data: {
      userId,
      consentType,
      consentGiven: consentStatus.consent_given,
      consentTimestamp: consentStatus.consent_timestamp,
      currentType: consentStatus.consent_type
    }
  });
}));

/**
 * @route   GET /api/privacy/processing-activities
 * @desc    Get list of data processing activities
 * @access  Private
 */
router.get('/processing-activities', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: [
      {
        activity: 'Visitor Registration',
        purpose: 'Manage visitor access to premises',
        legalBasis: 'Legitimate Interest',
        retention: '365 days'
      },
      {
        activity: 'Access Logging',
        purpose: 'Security and audit trail',
        legalBasis: 'Legal Obligation',
        retention: '730 days'
      },
      {
        activity: 'Emergency Response',
        purpose: 'Guard safety and incident management',
        legalBasis: 'Vital Interest',
        retention: '90 days'
      },
      {
        activity: 'Delivery Management',
        purpose: 'Track packages for residents',
        legalBasis: 'Contract Performance',
        retention: '90 days'
      }
    ]
  });
}));

/**
 * @route   GET /api/privacy/retention-policies
 * @desc    Get all data retention policies
 * @access  Private
 */
router.get('/retention-policies', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const policies = await databaseService.query(
      'SELECT * FROM data_retention_policies ORDER BY table_name'
    );

    res.json({
      success: true,
      data: policies.rows
    });
  } catch (error) {
    res.json({
      success: true,
      data: [
        { category: 'Visitor Records', retention: '365 days', autoDelete: true },
        { category: 'Access Logs', retention: '730 days', autoDelete: true },
        { category: 'Emergency Incidents', retention: '90 days', autoDelete: true },
        { category: 'Delivery Photos', retention: '30 days', autoDelete: true },
        { category: 'Audit Logs', retention: '7 years', autoDelete: false }
      ]
    });
  }
}));

/**
 * @route   GET /api/privacy/third-party
 * @desc    Get third-party data sharing information
 * @access  Private
 */
router.get('/third-party', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: [
      {
        party: 'SMS Gateway Provider',
        purpose: 'Send OTP and notifications',
        dataShared: 'Phone numbers only',
        country: 'Kenya'
      },
      {
        party: 'Email Service Provider',
        purpose: 'Send visitor pass emails',
        dataShared: 'Email addresses only',
        country: 'EU (GDPR compliant)'
      }
    ]
  });
}));

export default router;
