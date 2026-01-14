/**
 * Role-Based Data Minimization Middleware
 * 
 * Purpose: Filter API responses based on user role to minimize data exposure
 * Implements GDPR Article 5(1)(c) - Data Minimization
 * 
 * Each role should only see the data they need for their function:
 * - Residents: See their own visitor data + basic guard info
 * - Guards: See visitor data needed for validation + basic resident info
 * - Admins: See all data
 */

import logger from '../config/logger.js';
import { buildErrorPayload } from '../utils/responseFormatter.js';

/**
 * Data schemas defining what each role can see for different entities
 */
const dataSchemas = {
  // Visitor data access by role
  visitor: {
    resident: [
      'id', 'name', 'phone', 'vehicle_plate', 'purpose',
      'date_of_visit', 'time_of_visit', 'status',
      'check_in', 'check_out', 'qr_code', 'created_at'
      // EXCLUDED: id_number (unless own visitor), otp_hash, consent details
    ],
    guard: [
      'id', 'name', 'phone', 'vehicle_plate', 'purpose',
      'date_of_visit', 'time_of_visit', 'status',
      'check_in', 'check_out', 'qr_code',
      'unit_number', 'resident_name' // Need to know which unit
      // EXCLUDED: id_number, phone (beyond basic), otp details
    ],
    admin: '*' // All fields
  },

  // User data access by role
  user: {
    resident: [
      'id', 'username', 'email', 'role', 'unit_id', 'unit_number',
      'created_at'
      // EXCLUDED: password_hash, reset_token, other users' data
    ],
    guard: [
      'id', 'username', 'role', 'unit_number' // Minimal - just for visitor verification
      // EXCLUDED: email, phone, password_hash
    ],
    admin: '*' // All fields except password_hash
  },

  // Access log data
  accessLog: {
    resident: [
      'id', 'action', 'created_at'
      // EXCLUDED: IP address, user agent, detailed system logs
    ],
    guard: [
      'id', 'visitor_id', 'action', 'created_at'
      // EXCLUDED: IP, user agent
    ],
    admin: '*' // All fields
  },

  // Audit log data
  auditLog: {
    resident: null, // Residents don't see audit logs
    guard: null, // Guards don't see audit logs
    admin: '*' // Only admins see audit logs
  }
};

/**
 * Filter object based on allowed fields for role
 * @param {Object} data - Original data object
 * @param {Array|String} allowedFields - Array of field names or '*' for all
 * @param {Array} sensitiveFields - Fields to always exclude (e.g., password_hash)
 * @returns {Object} Filtered object
 */
function filterFields(data, allowedFields, sensitiveFields = []) {
  if (!data) return data;
  
  // Always allow all fields for admins (except sensitive ones)
  if (allowedFields === '*') {
    const filtered = { ...data };
    sensitiveFields.forEach(field => delete filtered[field]);
    return filtered;
  }

  // No access
  if (allowedFields === null || allowedFields === undefined) {
    return null;
  }

  // Filter to allowed fields only
  const filtered = {};
  allowedFields.forEach(field => {
    if (data.hasOwnProperty(field) && !sensitiveFields.includes(field)) {
      filtered[field] = data[field];
    }
  });

  return filtered;
}

/**
 * Filter array of objects
 */
function filterArray(dataArray, allowedFields, sensitiveFields = []) {
  if (!Array.isArray(dataArray)) return dataArray;
  
  return dataArray
    .map(item => filterFields(item, allowedFields, sensitiveFields))
    .filter(item => item !== null);
}

/**
 * Main middleware function
 * 
 * Usage:
 *   router.get('/visitors', minimizeData('visitor'), async (req, res) => {
 *     // Your handler - response will be filtered automatically
 *   });
 */
export function minimizeData(entityType, options = {}) {
  const {
    sensitiveFields = ['password_hash', 'otp_hash', 'reset_token', 'access_token', 'refresh_token'],
    customSchema = null
  } = options;

  return (req, res, next) => {
    // Store original send function
    const originalSend = res.send.bind(res);

    // Override send to filter data
    res.send = function(data) {
      try {
        // Get user role from request
        const userRole = req.user?.role || 'guest';
        
        // Skip filtering for admins (they see everything except truly sensitive fields)
        if (userRole === 'admin' && !customSchema) {
          // Still filter out sensitive fields
          if (typeof data === 'object') {
            const filtered = JSON.parse(JSON.stringify(data));
            filterSensitiveFields(filtered, sensitiveFields);
            return originalSend(JSON.stringify(filtered));
          }
          return originalSend(data);
        }

        // Get allowed fields for this role and entity type
        const schema = customSchema || dataSchemas[entityType];
        if (!schema) {
          logger.warn(`[DataMinimization] No schema defined for entity type: ${entityType}`);
          return originalSend(data);
        }

        const allowedFields = schema[userRole];
        if (allowedFields === undefined) {
          logger.warn(`[DataMinimization] No schema defined for role: ${userRole}`);
          return originalSend(data);
        }

        // Parse data if it's a string
        let parsedData = data;
        if (typeof data === 'string') {
          try {
            parsedData = JSON.parse(data);
          } catch {
            // Not JSON, send as is
            return originalSend(data);
          }
        }

        // Filter the data
        let filteredData = parsedData;

        if (allowedFields === null) {
          // No access to this data type
          filteredData = buildErrorPayload(
            req,
            res,
            'You do not have permission to access this data',
            'FORBIDDEN'
          );
          res.status(403);
        } else if (Array.isArray(parsedData)) {
          filteredData = filterArray(parsedData, allowedFields, sensitiveFields);
        } else if (parsedData && typeof parsedData === 'object') {
          // Check if it's a standard API response with data property
          if (parsedData.success !== undefined && parsedData.data !== undefined) {
            filteredData = {
              ...parsedData,
              data: Array.isArray(parsedData.data)
                ? filterArray(parsedData.data, allowedFields, sensitiveFields)
                : filterFields(parsedData.data, allowedFields, sensitiveFields)
            };
          } else {
            filteredData = filterFields(parsedData, allowedFields, sensitiveFields);
          }
        }

        logger.info('[DataMinimization] Filtered response', {
          entityType,
          role: userRole,
          hasData: !!filteredData
        });

        // Send filtered data
        return originalSend(JSON.stringify(filteredData));

      } catch (error) {
        logger.error('[DataMinimization] Error filtering data', error);
        // On error, send original data to avoid breaking the app
        return originalSend(data);
      }
    };

    next();
  };
}

/**
 * Remove sensitive fields from nested object
 */
function filterSensitiveFields(obj, sensitiveFields) {
  if (!obj || typeof obj !== 'object') return;

  for (const key in obj) {
    if (sensitiveFields.includes(key)) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      filterSensitiveFields(obj[key], sensitiveFields);
    }
  }
}

/**
 * Custom filter middleware for specific use cases
 */
export function customFilter(filterFunction) {
  return (req, res, next) => {
    const originalSend = res.send.bind(res);

    res.send = function(data) {
      try {
        let parsedData = data;
        if (typeof data === 'string') {
          try {
            parsedData = JSON.parse(data);
          } catch {
            return originalSend(data);
          }
        }

        const filteredData = filterFunction(parsedData, req);
        return originalSend(JSON.stringify(filteredData));

      } catch (error) {
        logger.error('[CustomFilter] Error filtering data', error);
        return originalSend(data);
      }
    };

    next();
  };
}

/**
 * Helper to check if user can access specific fields
 */
export function canAccessField(userRole, entityType, fieldName) {
  const schema = dataSchemas[entityType];
  if (!schema || !schema[userRole]) return false;

  const allowedFields = schema[userRole];
  if (allowedFields === '*') return true;
  if (allowedFields === null) return false;

  return allowedFields.includes(fieldName);
}

/**
 * Export schemas for testing/documentation
 */
export { dataSchemas };

export default minimizeData;
