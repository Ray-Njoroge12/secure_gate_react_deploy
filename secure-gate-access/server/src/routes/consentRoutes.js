/**
 * Consent Management Routes
 * 
 * Handles user consent for data processing
 * in compliance with Kenya DPA 2019 requirements.
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  recordConsent,
  withdrawConsent,
  getUserConsentHistory,
  getConsentStatistics,
  isConsentValid,
  getRequiredConsentsForEndpoint,
  validateConsent,
  requireConsentWithdrawal,
  CONSENT_TYPES,
  CONSENT_STATUS
} from '../middleware/consentMiddleware.js';
import { AppError, asyncHandler } from '../middleware/standardizedErrorHandler.js';
import { successResponse, createdResponse } from '../utils/responseFormatter.js';

const router = express.Router();

/**
 * @swagger
 * /api/consent/required:
 *   get:
 *     summary: Get required consents for endpoint
 *     description: Get list of consents required for a specific endpoint
 *     tags: [Privacy]
 *     parameters:
 *       - in: query
 *         name: endpoint
 *         required: true
 *         schema:
 *           type: string
 *         description: The endpoint path
 *         example: "/api/visitors"
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [GET, POST, PUT, DELETE]
 *         description: HTTP method
 *         example: "POST"
 *     responses:
 *       200:
 *         description: Required consents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         endpoint:
 *                           type: string
 *                         method:
 *                           type: string
 *                         requiredConsents:
 *                           type: array
 *                           items:
 *                             type: string
 *             example:
 *               success: true
 *               message: Required consents retrieved successfully
 *               data:
 *                 endpoint: "/api/visitors"
 *                 method: "POST"
 *                 requiredConsents: ["data_collection", "data_processing"]
 *               timestamp: "2025-01-01T00:00:00.000Z"
 */
router.get('/required', asyncHandler(async (req, res) => {
  const { endpoint, method = 'GET' } = req.query;
  
  if (!endpoint) {
    throw new AppError('Endpoint parameter is required', 400, 'VALIDATION_ERROR');
  }
  
  const requiredConsents = getRequiredConsentsForEndpoint(endpoint, method);
  
  successResponse(res, {
    endpoint,
    method,
    requiredConsents
  }, 'Required consents retrieved successfully');
}));

/**
 * @swagger
 * /api/consent/give:
 *   post:
 *     summary: Give consent for data processing
 *     description: Record user consent for specific data processing activities
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - consentType
 *               - purpose
 *             properties:
 *               consentType:
 *                 type: string
 *                 enum: [data_collection, data_processing, data_storage, data_sharing, email_notifications, sms_notifications, push_notifications, marketing_communications, access_control, security_monitoring, system_improvement, analytics, biometric_data, location_data, behavioral_data]
 *                 description: Type of consent
 *                 example: "data_processing"
 *               purpose:
 *                 type: string
 *                 description: Purpose of data processing
 *                 example: "Visitor access control and security"
 *               dataCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Categories of data being processed
 *                 example: ["personal_info", "contact_details", "access_logs"]
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Consent expiration date (optional)
 *                 example: "2025-12-31T23:59:59.000Z"
 *     responses:
 *       201:
 *         description: Consent recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         consentId:
 *                           type: string
 *                         consentType:
 *                           type: string
 *                         status:
 *                           type: string
 *                         givenAt:
 *                           type: string
 *                           format: date-time
 *             example:
 *               success: true
 *               message: Consent recorded successfully
 *               data:
 *                 consentId: "consent_12345"
 *                 consentType: "data_processing"
 *                 status: "given"
 *                 givenAt: "2025-01-01T00:00:00.000Z"
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/give', authenticateToken, asyncHandler(async (req, res) => {
  const { consentType, purpose, dataCategories = [], expiresAt = null } = req.body;
  
  if (!consentType || !purpose) {
    throw new AppError('Consent type and purpose are required', 400, 'VALIDATION_ERROR');
  }
  
  if (!Object.values(CONSENT_TYPES).includes(consentType)) {
    throw new AppError('Invalid consent type', 400, 'VALIDATION_ERROR');
  }
  
  const consentData = {
    consentType,
    purpose,
    dataCategories,
    expiresAt,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  };
  
  const consent = await recordConsent(req.user.id, consentData);
  
  createdResponse(res, {
    consentId: consent.id,
    consentType: consent.consent_type,
    status: consent.status,
    givenAt: consent.given_at
  }, 'Consent recorded successfully');
}));

/**
 * @swagger
 * /api/consent/withdraw:
 *   post:
 *     summary: Withdraw consent for data processing
 *     description: Withdraw previously given consent for data processing
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - consentType
 *             properties:
 *               consentType:
 *                 type: string
 *                 enum: [data_collection, data_processing, data_storage, data_sharing, email_notifications, sms_notifications, push_notifications, marketing_communications, access_control, security_monitoring, system_improvement, analytics, biometric_data, location_data, behavioral_data]
 *                 description: Type of consent to withdraw
 *                 example: "data_processing"
 *               reason:
 *                 type: string
 *                 description: Reason for withdrawing consent (optional)
 *                 example: "No longer needed"
 *     responses:
 *       200:
 *         description: Consent withdrawn successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: Consent withdrawn successfully
 *               data: {}
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/withdraw', authenticateToken, requireConsentWithdrawal(), asyncHandler(async (req, res) => {
  const { consentType, reason = null } = req.body;
  
  if (!consentType) {
    throw new AppError('Consent type is required', 400, 'VALIDATION_ERROR');
  }
  
  if (!Object.values(CONSENT_TYPES).includes(consentType)) {
    throw new AppError('Invalid consent type', 400, 'VALIDATION_ERROR');
  }
  
  await withdrawConsent(req.user.id, consentType, reason);
  
  successResponse(res, {}, 'Consent withdrawn successfully');
}));

/**
 * @swagger
 * /api/consent/history:
 *   get:
 *     summary: Get user consent history
 *     description: Retrieve the consent history for the current user
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: consentType
 *         schema:
 *           type: string
 *         description: Filter by consent type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [given, withdrawn, pending, expired]
 *         description: Filter by consent status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Consent history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         consents:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               consentType:
 *                                 type: string
 *                               status:
 *                                 type: string
 *                               purpose:
 *                                 type: string
 *                               givenAt:
 *                                 type: string
 *                                 format: date-time
 *                               withdrawnAt:
 *                                 type: string
 *                                 format: date-time
 *                               expiresAt:
 *                                 type: string
 *                                 format: date-time
 *             example:
 *               success: true
 *               message: Consent history retrieved successfully
 *               data:
 *                 consents:
 *                   - id: "consent_12345"
 *                     consentType: "data_processing"
 *                     status: "given"
 *                     purpose: "Visitor access control"
 *                     givenAt: "2025-01-01T00:00:00.000Z"
 *                     withdrawnAt: null
 *                     expiresAt: null
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/history', authenticateToken, asyncHandler(async (req, res) => {
  const {
    consentType = null,
    status = null,
    limit = 50,
    offset = 0
  } = req.query;
  
  const consents = await getUserConsentHistory(req.user.id, {
    consentType,
    status,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
  
  successResponse(res, { consents }, 'Consent history retrieved successfully');
}));

/**
 * @swagger
 * /api/consent/check:
 *   get:
 *     summary: Check consent validity
 *     description: Check if user has valid consent for specific data processing
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: consentType
 *         required: true
 *         schema:
 *           type: string
 *         description: Type of consent to check
 *         example: "data_processing"
 *     responses:
 *       200:
 *         description: Consent status checked successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         consentType:
 *                           type: string
 *                         isValid:
 *                           type: boolean
 *                         status:
 *                           type: string
 *             example:
 *               success: true
 *               message: Consent status checked successfully
 *               data:
 *                 consentType: "data_processing"
 *                 isValid: true
 *                 status: "valid"
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/check', authenticateToken, asyncHandler(async (req, res) => {
  const { consentType } = req.query;
  
  if (!consentType) {
    throw new AppError('Consent type is required', 400, 'VALIDATION_ERROR');
  }
  
  const isValid = await isConsentValid(req.user.id, consentType);
  
  successResponse(res, {
    consentType,
    isValid,
    status: isValid ? 'valid' : 'invalid'
  }, 'Consent status checked successfully');
}));

/**
 * @swagger
 * /api/consent/statistics:
 *   get:
 *     summary: Get consent statistics (Admin only)
 *     description: Get aggregated consent statistics for administrative purposes
 *     tags: [Privacy, Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Consent statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         statistics:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               consentType:
 *                                 type: string
 *                               status:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                               lastGiven:
 *                                 type: string
 *                                 format: date-time
 *                               lastWithdrawn:
 *                                 type: string
 *                                 format: date-time
 *             example:
 *               success: true
 *               message: Consent statistics retrieved successfully
 *               data:
 *                 statistics:
 *                   - consentType: "data_processing"
 *                     status: "given"
 *                     count: 150
 *                     lastGiven: "2025-01-01T00:00:00.000Z"
 *                     lastWithdrawn: null
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/statistics', authenticateToken, asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403, 'FORBIDDEN');
  }
  
  const statistics = await getConsentStatistics();
  
  successResponse(res, { statistics }, 'Consent statistics retrieved successfully');
}));

/**
 * @swagger
 * /api/consent/types:
 *   get:
 *     summary: Get available consent types
 *     description: Get list of all available consent types
 *     tags: [Privacy]
 *     responses:
 *       200:
 *         description: Consent types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         consentTypes:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               value:
 *                                 type: string
 *                               label:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               category:
 *                                 type: string
 *             example:
 *               success: true
 *               message: Consent types retrieved successfully
 *               data:
 *                 consentTypes:
 *                   - value: "data_collection"
 *                     label: "Data Collection"
 *                     description: "Collection of personal information"
 *                     category: "Data Processing"
 *               timestamp: "2025-01-01T00:00:00.000Z"
 */
router.get('/types', asyncHandler(async (req, res) => {
  const consentTypes = [
    {
      value: 'data_collection',
      label: 'Data Collection',
      description: 'Collection of personal information',
      category: 'Data Processing'
    },
    {
      value: 'data_processing',
      label: 'Data Processing',
      description: 'Processing of personal information',
      category: 'Data Processing'
    },
    {
      value: 'data_storage',
      label: 'Data Storage',
      description: 'Storage of personal information',
      category: 'Data Processing'
    },
    {
      value: 'data_sharing',
      label: 'Data Sharing',
      description: 'Sharing of personal information with third parties',
      category: 'Data Processing'
    },
    {
      value: 'email_notifications',
      label: 'Email Notifications',
      description: 'Receiving notifications via email',
      category: 'Communications'
    },
    {
      value: 'sms_notifications',
      label: 'SMS Notifications',
      description: 'Receiving notifications via SMS',
      category: 'Communications'
    },
    {
      value: 'push_notifications',
      label: 'Push Notifications',
      description: 'Receiving push notifications',
      category: 'Communications'
    },
    {
      value: 'marketing_communications',
      label: 'Marketing Communications',
      description: 'Receiving marketing communications',
      category: 'Communications'
    },
    {
      value: 'access_control',
      label: 'Access Control',
      description: 'Data processing for access control purposes',
      category: 'System Functions'
    },
    {
      value: 'security_monitoring',
      label: 'Security Monitoring',
      description: 'Data processing for security monitoring',
      category: 'System Functions'
    },
    {
      value: 'system_improvement',
      label: 'System Improvement',
      description: 'Data processing for system improvement',
      category: 'System Functions'
    },
    {
      value: 'analytics',
      label: 'Analytics',
      description: 'Data processing for analytics and reporting',
      category: 'System Functions'
    }
  ];
  
  successResponse(res, { consentTypes }, 'Consent types retrieved successfully');
}));

export default router;




