/**
 * Compliance Routes
 * GDPR, Kenya DPA, and data protection endpoints
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import complianceService from '../services/complianceService.js';
import { validateComplianceRequest } from '../middleware/validationMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/compliance/status
 * @desc    Get compliance status
 * @access  Public
 */
router.get('/status', (req, res) => {
    try {
        const status = complianceService.getComplianceStatus();
        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        });
  } catch (error) {
    res.status(500).json({
            success: false,
            message: 'Failed to get compliance status',
            error: error.message
    });
  }
});

/**
 * @route   POST /api/compliance/dsar
 * @desc    Handle data subject access request
 * @access  Private
 */
router.post('/dsar', protect, async (req, res) => {
    try {
        const { requestType = 'access' } = req.body;
        const userId = req.user.id;

        const result = await complianceService.handleDataSubjectAccessRequest(userId, requestType);
        
        res.json({
            success: true,
            data: result,
            message: 'Data subject access request submitted successfully'
        });
  } catch (error) {
    res.status(500).json({
            success: false,
            message: 'Failed to process data subject access request',
            error: error.message
    });
  }
});

/**
 * @route   POST /api/compliance/deletion
 * @desc    Handle data deletion request (Right to be forgotten)
 * @access  Private
 */
router.post('/deletion', protect, async (req, res) => {
    try {
        const { reason = 'user_request' } = req.body;
        const userId = req.user.id;

        const result = await complianceService.handleDataDeletionRequest(userId, reason);
        
        res.json({
            success: true,
            data: result,
            message: 'Data deletion request submitted successfully'
        });
  } catch (error) {
    res.status(500).json({
            success: false,
            message: 'Failed to process data deletion request',
            error: error.message
    });
  }
});

/**
 * @route   POST /api/compliance/portability
 * @desc    Handle data portability request
 * @access  Private
 */
router.post('/portability', protect, async (req, res) => {
    try {
        const { format = 'json' } = req.body;
        const userId = req.user.id;

        const result = await complianceService.handleDataPortabilityRequest(userId, format);
        
        res.json({
            success: true,
            data: result,
            message: 'Data portability request submitted successfully'
        });
  } catch (error) {
    res.status(500).json({
            success: false,
            message: 'Failed to process data portability request',
            error: error.message
    });
  }
});

/**
 * @route   POST /api/compliance/consent
 * @desc    Handle consent management
 * @access  Private
 */
router.post('/consent', protect, async (req, res) => {
    try {
        const { type, granted, version } = req.body;
        const userId = req.user.id;

        if (!type || typeof granted !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Consent type and granted status are required'
            });
        }

        const consentData = {
            type,
            granted,
            version,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        };

        const result = await complianceService.handleConsentManagement(userId, consentData);
        
        res.json({
            success: true,
            data: result,
            message: 'Consent updated successfully'
        });
  } catch (error) {
    res.status(500).json({
            success: false,
            message: 'Failed to process consent management',
            error: error.message
    });
  }
});

/**
 * @route   GET /api/compliance/cookie-policy
 * @desc    Get cookie policy information
 * @access  Public
 */
router.get('/cookie-policy', (req, res) => {
    try {
        const cookiePolicy = {
            required: complianceService.isConsentRequired(),
            categories: {
                necessary: {
                    name: 'Necessary Cookies',
                    description: 'Essential cookies required for the website to function properly',
                    required: true
                },
                analytics: {
                    name: 'Analytics Cookies',
                    description: 'Cookies used to analyze website usage and performance',
                    required: false
                },
                marketing: {
                    name: 'Marketing Cookies',
                    description: 'Cookies used for targeted advertising and marketing',
                    required: false
                },
                preferences: {
                    name: 'Preference Cookies',
                    description: 'Cookies used to remember user preferences and settings',
                    required: false
                }
            },
            retention: {
                session: 'Session cookies are deleted when the browser is closed',
                persistent: 'Persistent cookies are retained for up to 2 years',
                analytics: 'Analytics cookies are retained for up to 2 years',
                marketing: 'Marketing cookies are retained for up to 1 year'
            }
        };

        res.json({
            success: true,
            data: cookiePolicy,
            timestamp: new Date().toISOString()
        });
  } catch (error) {
    res.status(500).json({
            success: false,
            message: 'Failed to get cookie policy',
            error: error.message
    });
  }
});

/**
 * @route   GET /api/compliance/privacy-policy
 * @desc    Get privacy policy information
 * @access  Public
 */
router.get('/privacy-policy', (req, res) => {
    try {
        const privacyPolicy = {
            lastUpdated: '2025-01-01',
            version: '1.0',
            dataController: {
                name: 'Secure Gate Access Control System',
                contact: 'privacy@securegate.com',
                address: 'Nairobi, Kenya'
            },
            dataTypes: [
                'Personal identification information (name, email, phone)',
                'Visitor information (name, email, phone, visit purpose)',
                'System logs and audit trails',
                'Device information and IP addresses',
                'Consent records and preferences'
            ],
            purposes: [
                'Access control and visitor management',
                'Security and safety monitoring',
                'System administration and maintenance',
                'Legal compliance and audit requirements',
                'Communication and notifications'
            ],
            legalBasis: [
                'Legitimate interest for security and safety',
                'Consent for marketing communications',
                'Contract performance for service delivery',
                'Legal obligation for compliance requirements'
            ],
            retentionPeriods: {
                personalData: '7 years from last interaction',
                visitorRecords: '2 years from visit date',
                auditLogs: '7 years from creation date',
                consentRecords: '3 years from withdrawal date'
            },
            rights: [
                'Right to access personal data',
                'Right to rectification of inaccurate data',
                'Right to erasure (right to be forgotten)',
                'Right to restrict processing',
                'Right to data portability',
                'Right to object to processing',
                'Right to withdraw consent'
            ],
            contact: {
                dpo: 'dpo@securegate.com',
                general: 'privacy@securegate.com',
                phone: '+254-XXX-XXXX'
            }
        };

        res.json({
            success: true,
            data: privacyPolicy,
            timestamp: new Date().toISOString()
        });
  } catch (error) {
    res.status(500).json({
            success: false,
            message: 'Failed to get privacy policy',
            error: error.message
    });
  }
});

export default router;