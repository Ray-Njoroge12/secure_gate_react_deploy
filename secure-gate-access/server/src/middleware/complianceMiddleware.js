/**
 * Compliance Middleware
 * Automatic compliance logging and data protection
 */

import complianceService from '../services/complianceService.js';
import loggingService from '../services/loggingService.js';

/**
 * Log data access events for compliance
 */
export const logDataAccess = (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        // Log data access if user is authenticated
        if (req.user && req.user.id) {
            const accessLog = {
                userId: req.user.id,
                endpoint: req.originalUrl,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString(),
                responseStatus: res.statusCode,
                dataSize: data ? JSON.stringify(data).length : 0
            };

            complianceService.logComplianceEvent('data_access', accessLog);
        }
        
        return originalSend.call(this, data);
    };
    
    next();
};

/**
 * Log data modification events for compliance
 */
export const logDataModification = (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        // Log data modification if user is authenticated
        if (req.user && req.user.id && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            const modificationLog = {
                userId: req.user.id,
                endpoint: req.originalUrl,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString(),
                responseStatus: res.statusCode,
                requestBody: req.body ? JSON.stringify(req.body) : null
            };

            complianceService.logComplianceEvent('data_modification', modificationLog);
        }
        
        return originalSend.call(this, data);
    };
    
    next();
};

/**
 * Log authentication events for compliance
 */
export const logAuthentication = (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        // Log authentication events
        if (req.originalUrl.includes('/auth/')) {
            const authLog = {
                endpoint: req.originalUrl,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString(),
                responseStatus: res.statusCode,
                success: res.statusCode < 400
            };

            if (req.user && req.user.id) {
                authLog.userId = req.user.id;
            }

            complianceService.logComplianceEvent('authentication', authLog);
        }
        
        return originalSend.call(this, data);
    };
    
    next();
};

/**
 * Log consent management events
 */
export const logConsentManagement = (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        // Log consent management events
        if (req.originalUrl.includes('/compliance/consent')) {
            const consentLog = {
                userId: req.user ? req.user.id : null,
                endpoint: req.originalUrl,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString(),
                responseStatus: res.statusCode,
                consentData: req.body
            };

            complianceService.logComplianceEvent('consent_management', consentLog);
        }
        
        return originalSend.call(this, data);
    };
    
    next();
};

/**
 * Log data subject rights requests
 */
export const logDataSubjectRights = (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        // Log data subject rights requests
        if (req.originalUrl.includes('/compliance/')) {
            const rightsLog = {
                userId: req.user ? req.user.id : null,
                endpoint: req.originalUrl,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString(),
                responseStatus: res.statusCode,
                requestType: req.body ? req.body.requestType : null
            };

            complianceService.logComplianceEvent('data_subject_rights', rightsLog);
        }
        
        return originalSend.call(this, data);
    };
    
    next();
};

/**
 * Add compliance headers
 */
export const addComplianceHeaders = (req, res, next) => {
    // Add GDPR compliance headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Add data protection headers
    res.setHeader('X-Data-Protection', 'GDPR-Kenya-DPA-Compliant');
    res.setHeader('X-Data-Retention', process.env.DATA_RETENTION_DAYS || '2555');
    
    next();
};

/**
 * Check consent requirements
 */
export const checkConsentRequirements = (req, res, next) => {
    // Skip consent check for public endpoints
    const publicEndpoints = [
        '/api/compliance/status',
        '/api/compliance/cookie-policy',
        '/api/compliance/privacy-policy',
        '/health',
        '/api/health'
    ];

    if (publicEndpoints.includes(req.originalUrl)) {
        return next();
    }

    // Check if consent is required
    if (complianceService.isConsentRequired()) {
        const consentHeader = req.get('X-Consent-Status');
        
        if (!consentHeader || consentHeader !== 'granted') {
            return res.status(403).json({
                success: false,
                message: 'Consent required for data processing',
                consentRequired: true,
                consentUrl: '/compliance/consent'
            });
        }
    }

    next();
};

/**
 * Data anonymization for sensitive endpoints
 */
export const anonymizeSensitiveData = (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        // Anonymize sensitive data in responses
        if (data && typeof data === 'string') {
            try {
                const parsedData = JSON.parse(data);
                const anonymizedData = anonymizeData(parsedData);
                return originalSend.call(this, JSON.stringify(anonymizedData));
            } catch (error) {
                // If not JSON, return as is
                return originalSend.call(this, data);
            }
        }
        
        return originalSend.call(this, data);
    };
    
    next();
};

/**
 * Anonymize sensitive data
 */
function anonymizeData(data) {
    if (typeof data !== 'object' || data === null) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => anonymizeData(item));
    }

    const anonymized = { ...data };
    
    // Fields to anonymize
    const sensitiveFields = [
        'email', 'phone', 'firstName', 'lastName', 
        'visitorEmail', 'visitorPhone', 'visitorName'
    ];

    sensitiveFields.forEach(field => {
        if (anonymized[field]) {
            anonymized[field] = `***${anonymized[field].slice(-3)}`;
        }
    });

    // Recursively anonymize nested objects
    Object.keys(anonymized).forEach(key => {
        if (typeof anonymized[key] === 'object' && anonymized[key] !== null) {
            anonymized[key] = anonymizeData(anonymized[key]);
        }
    });

    return anonymized;
}

/**
 * Rate limiting for compliance endpoints
 */
export const complianceRateLimit = (req, res, next) => {
    // Apply stricter rate limiting for compliance endpoints
    if (req.originalUrl.includes('/compliance/')) {
        // This would integrate with your rate limiting middleware
        // For now, just pass through
        return next();
    }
    
    next();
};

export default {
    logDataAccess,
    logDataModification,
    logAuthentication,
    logConsentManagement,
    logDataSubjectRights,
    addComplianceHeaders,
    checkConsentRequirements,
    anonymizeSensitiveData,
    complianceRateLimit
};
