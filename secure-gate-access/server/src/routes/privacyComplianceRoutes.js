/**
 * Privacy Compliance Routes
 * 
 * Handles privacy settings, data retention, GDPR/KDPA compliance,
 * and consent management endpoints.
 */

import express from 'express';
import { asyncHandler } from '../middleware/standardizedErrorHandler.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireEstateContext as requireEstate } from '../middleware/estateContextMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import { validateRequest as validateInput } from '../middleware/validationMiddleware.js';
import { privacyComplianceService } from '../services/privacyComplianceService.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const privacySettingsSchema = Joi.object({
  dataSharingConsent: Joi.boolean(),
  marketingConsent: Joi.boolean(),
  analyticsConsent: Joi.boolean(),
  thirdPartyConsent: Joi.boolean(),
  locationTrackingConsent: Joi.boolean(),
  biometricConsent: Joi.boolean(),
  automatedDecisionsConsent: Joi.boolean(),
  dataRetentionPeriod: Joi.string().valid('1_year', '2_years', '3_years', '5_years', 'indefinite'),
  communicationPreferences: Joi.object({
    email: Joi.boolean(),
    sms: Joi.boolean(),
    push: Joi.boolean(),
    inApp: Joi.boolean()
  }),
  visibilitySettings: Joi.object({
    profileVisibility: Joi.string().valid('public', 'estate_only', 'private'),
    activityVisibility: Joi.string().valid('public', 'estate_only', 'private'),
    contactVisibility: Joi.string().valid('public', 'estate_admins_only', 'private')
  })
});

const consentSchema = Joi.object({
  consentType: Joi.string().valid(
    'data_processing',
    'marketing_communications',
    'analytics_tracking',
    'third_party_sharing',
    'location_tracking',
    'biometric_data',
    'automated_decision_making'
  ).required(),
  granted: Joi.boolean().required(),
  metadata: Joi.object({
    method: Joi.string().valid('web_interface', 'mobile_app', 'email_link', 'phone_call', 'in_person'),
    ipAddress: Joi.string().ip(),
    userAgent: Joi.string(),
    expiresAt: Joi.date(),
    previousState: Joi.boolean()
  })
});

const dataSubjectRequestSchema = Joi.object({
  requestType: Joi.string().valid(
    'data_access',
    'data_rectification',
    'data_erasure',
    'data_portability',
    'processing_restriction',
    'object_processing'
  ).required(),
  requestDetails: Joi.object({
    reason: Joi.string(),
    specificData: Joi.array().items(Joi.string()),
    urgency: Joi.string().valid('normal', 'urgent'),
    contactMethod: Joi.string().valid('email', 'phone', 'mail'),
    additionalInfo: Joi.string()
  })
});

const retentionPolicySchema = Joi.object({
  dataCategory: Joi.string().valid(
    'personal_identifiers',
    'contact_information',
    'location_data',
    'behavioral_data',
    'security_logs',
    'communication_records',
    'biometric_data',
    'device_information',
    'visitor_records',
    'audit_logs',
    'system_logs'
  ).required(),
  retentionPeriodDays: Joi.number().integer().min(1).max(3650).required(),
  autoDeleteEnabled: Joi.boolean(),
  archiveEnabled: Joi.boolean(),
  archiveLocation: Joi.string(),
  policyName: Joi.string().min(1).max(255).required(),
  policyDescription: Joi.string(),
  legalBasis: Joi.string(),
  executionSchedule: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'annually')
});

// Privacy Settings Routes

/**
 * GET /api/privacy/settings
 * Get user's privacy settings with detailed descriptions
 */
router.get('/settings',
  authenticateToken,
  requireEstate,
  asyncHandler(async (req, res) => {
    const { user } = req;

    const settings = await privacyComplianceService.getUserPrivacySettings(
      user.id,
      user.estate_id
    );

    successResponse(res, { settings }, 'Privacy settings retrieved successfully');
  })
);

/**
 * PUT /api/privacy/settings
 * Update user's privacy settings with immediate application
 */
router.put('/settings',
  authenticateToken,
  requireEstate,
  validateInput(privacySettingsSchema),
  asyncHandler(async (req, res) => {
    const { user, body } = req;

    const updatedSettings = await privacyComplianceService.updatePrivacySettings(
      user.id,
      user.estate_id,
      body,
      user.email
    );

    successResponse(res, { settings: updatedSettings }, 'Privacy settings updated successfully');
  })
);

// Consent Management Routes

/**
 * GET /api/privacy/consent
 * Get user's current consent status for all consent types
 */
router.get('/consent',
  authenticateToken,
  requireEstate,
  asyncHandler(async (req, res) => {
    const { user } = req;

    const consentStatus = await privacyComplianceService.getUserConsentStatus(
      user.id,
      user.estate_id
    );

    successResponse(res, { consentStatus }, 'Consent status retrieved successfully');
  })
);

/**
 * POST /api/privacy/consent
 * Grant or withdraw consent for specific data processing activities
 */
router.post('/consent',
  authenticateToken,
  requireEstate,
  validateInput(consentSchema),
  asyncHandler(async (req, res) => {
    const { user, body } = req;

    // Add request context to metadata
    const metadata = {
      ...body.metadata,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      method: 'web_interface'
    };

    const consentResult = await privacyComplianceService.manageUserConsent(
      user.id,
      user.estate_id,
      body.consentType,
      body.granted,
      metadata
    );

    successResponse(res, { consent: consentResult }, 'Consent updated successfully');
  })
);

// Data Subject Rights Routes

/**
 * POST /api/privacy/data-subject-request
 * Submit a data subject rights request (GDPR Articles 15-22)
 */
router.post('/data-subject-request',
  authenticateToken,
  requireEstate,
  validateInput(dataSubjectRequestSchema),
  asyncHandler(async (req, res) => {
    const { user, body } = req;

    const request = await privacyComplianceService.processDataSubjectRequest(
      user.id,
      user.estate_id,
      body.requestType,
      body.requestDetails,
      user.email
    );

    successResponse(res, { request }, 'Data subject request submitted successfully');
  })
);

/**
 * GET /api/privacy/data-subject-requests
 * Get user's data subject rights requests
 */
router.get('/data-subject-requests',
  authenticateToken,
  requireEstate,
  asyncHandler(async (req, res) => {
    const { user } = req;
    const { status, limit = 20, offset = 0 } = req.query;

    // This would be implemented in the service
    const requests = await privacyComplianceService.getUserDataSubjectRequests(
      user.id,
      user.estate_id,
      { status, limit: parseInt(limit), offset: parseInt(offset) }
    );

    successResponse(res, { requests }, 'Data subject requests retrieved successfully');
  })
);

// Data Retention Routes (Admin only)

/**
 * GET /api/privacy/retention-policies
 * Get data retention policies for the estate
 */
router.get('/retention-policies',
  authenticateToken,
  requireEstate,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    const { user } = req;

    const policies = await privacyComplianceService.getDataRetentionPolicies(user.estate_id);

    successResponse(res, { policies }, 'Data retention policies retrieved successfully');
  })
);

/**
 * POST /api/privacy/retention-policies
 * Create or update data retention policy
 */
router.post('/retention-policies',
  authenticateToken,
  requireEstate,
  requireRolePolicy('adminOnly'),
  validateInput(retentionPolicySchema),
  asyncHandler(async (req, res) => {
    const { user, body } = req;

    const policy = await privacyComplianceService.createOrUpdateRetentionPolicy(
      user.estate_id,
      body,
      user.email
    );

    successResponse(res, { policy }, 'Data retention policy created successfully');
  })
);

/**
 * POST /api/privacy/retention-policies/execute
 * Execute data retention policies (with dry-run option)
 */
router.post('/retention-policies/execute',
  authenticateToken,
  requireEstate,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    const { user } = req;
    const { dryRun = false } = req.body;

    const results = await privacyComplianceService.executeDataRetention(
      user.estate_id,
      dryRun
    );

    successResponse(res, { results },
      dryRun ? 'Data retention dry-run completed' : 'Data retention executed successfully'
    );
  })
);

// Compliance Reporting Routes (Admin only)

/**
 * GET /api/privacy/compliance-report
 * Generate GDPR/KDPA compliance report
 */
router.get('/compliance-report',
  authenticateToken,
  requireEstate,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    const { user } = req;
    const {
      reportType = 'full',
      startDate,
      endDate,
      format = 'json'
    } = req.query;

    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate)
    } : null;

    const report = await privacyComplianceService.generateComplianceReport(
      user.estate_id,
      reportType,
      dateRange
    );

    if (format === 'pdf') {
      // Generate PDF report (would be implemented)
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${report.reportId}.pdf"`);
      // Return PDF buffer
    } else {
      successResponse(res, { report }, 'Compliance report generated successfully');
    }
  })
);

/**
 * GET /api/privacy/compliance-reports
 * Get list of generated compliance reports
 */
router.get('/compliance-reports',
  authenticateToken,
  requireEstate,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    const { user } = req;
    const { limit = 20, offset = 0, reportType } = req.query;

    const reports = await privacyComplianceService.getComplianceReports(
      user.estate_id,
      {
        limit: parseInt(limit),
        offset: parseInt(offset),
        reportType
      }
    );

    successResponse(res, { reports }, 'Compliance reports retrieved successfully');
  })
);

// Privacy Dashboard Routes

/**
 * GET /api/privacy/dashboard
 * Get privacy dashboard data for users
 */
router.get('/dashboard',
  authenticateToken,
  requireEstate,
  asyncHandler(async (req, res) => {
    const { user } = req;

    const dashboardData = await privacyComplianceService.getPrivacyDashboard(
      user.id,
      user.estate_id,
      user.role
    );

    successResponse(res, { dashboard: dashboardData }, 'Privacy dashboard data retrieved successfully');
  })
);

/**
 * GET /api/privacy/audit-trail
 * Get user's privacy-related audit trail
 */
router.get('/audit-trail',
  authenticateToken,
  requireEstate,
  asyncHandler(async (req, res) => {
    const { user } = req;
    const { limit = 50, offset = 0, actionType } = req.query;

    const auditTrail = await privacyComplianceService.getUserPrivacyAuditTrail(
      user.id,
      user.estate_id,
      {
        limit: parseInt(limit),
        offset: parseInt(offset),
        actionType
      }
    );

    successResponse(res, { auditTrail }, 'Privacy audit trail retrieved successfully');
  })
);

// Admin Privacy Management Routes

/**
 * GET /api/privacy/admin/users/:userId/privacy-settings
 * Admin view of user's privacy settings
 */
router.get('/admin/users/:userId/privacy-settings',
  authenticateToken,
  requireEstate,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    const { user } = req;
    const { userId } = req.params;

    const settings = await privacyComplianceService.getUserPrivacySettings(
      parseInt(userId),
      user.estate_id
    );

    successResponse(res, { settings }, 'User privacy settings retrieved successfully');
  })
);

/**
 * GET /api/privacy/admin/compliance-overview
 * Admin compliance overview dashboard
 */
router.get('/admin/compliance-overview',
  authenticateToken,
  requireEstate,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    const { user } = req;

    const overview = await privacyComplianceService.getComplianceOverview(user.estate_id);

    successResponse(res, { overview }, 'Compliance overview retrieved successfully');
  })
);

/**
 * POST /api/privacy/admin/bulk-consent-update
 * Admin bulk consent management (for legitimate interests)
 */
router.post('/admin/bulk-consent-update',
  authenticateToken,
  requireEstate,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    const { user, body } = req;
    const { userIds, consentType, granted, reason } = body;

    const results = await privacyComplianceService.bulkUpdateConsent(
      user.estate_id,
      userIds,
      consentType,
      granted,
      reason,
      user.email
    );

    successResponse(res, { results }, 'Bulk consent update completed');
  })
);

// Error handling for privacy-specific errors
router.use((error, req, res, next) => {
  if (error.name === 'PrivacyComplianceError') {
    return errorResponse(res, error.message, 'PRIVACY_COMPLIANCE_ERROR', 400);
  }

  if (error.name === 'ConsentRequiredError') {
    return errorResponse(res, 'User consent required for this operation', 'CONSENT_REQUIRED', 403);
  }

  if (error.name === 'DataRetentionError') {
    return errorResponse(res, 'Data retention policy violation', 'DATA_RETENTION_ERROR', 400);
  }

  next(error);
});

export default router;