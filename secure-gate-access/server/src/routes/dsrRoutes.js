/**
 * Data Subject Rights (DSR) Routes
 * Comprehensive implementation of all Kenya DPA 2019 data subject rights
 */

import express from 'express';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';
import { asyncHandler, AppError } from '../middleware/standardizedErrorHandler.js';
import { successResponse, createdResponse } from '../utils/responseFormatter.js';
import { rateLimiters } from '../config/rateLimits.js';
import db from '../database/db.enhanced.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * @swagger
 * /api/dsr/data-export:
 *   get:
 *     summary: Export all user data (Right to Access)
 *     description: Export all personal data associated with the authenticated user
 *     tags: [Data Subject Rights]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 personal_info:
 *                   type: object
 *                 visitors_registered:
 *                   type: array
 *                 access_logs:
 *                   type: array
 *                 consent_records:
 *                   type: array
 *                 exported_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.get('/data-export', 
  authenticateToken, 
  rateLimiters.sensitive,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    try {
      // Gather all user data from various tables
      const userData = await db.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      
      const visitorData = await db.query(
        'SELECT * FROM visitors WHERE created_by = (SELECT email FROM users WHERE id = $1)',
        [userId]
      );
      
      const accessLogs = await db.query(
        'SELECT * FROM access_logs WHERE user_id = $1 ORDER BY log_time DESC LIMIT 100',
        [userId]
      );
      
      const consentRecords = await db.query(
        'SELECT * FROM consent_records WHERE user_id = $1 ORDER BY timestamp DESC',
        [userId]
      );
      
      const dsarRequests = await db.query(
        'SELECT * FROM dsar_requests WHERE user_id = $1 ORDER BY requested_at DESC',
        [userId]
      );
      
      // Compile into exportable format
      const exportData = {
        personal_info: userData.rows[0] || null,
        visitors_registered: visitorData.rows,
        access_logs: accessLogs.rows,
        consent_records: consentRecords.rows,
        dsar_requests: dsarRequests.rows,
        exported_at: new Date().toISOString(),
        export_id: uuidv4(),
        format_version: '1.0',
        data_controller: 'Secure Gate Access Control System',
        legal_basis: 'Data Subject Access Request under Kenya DPA 2019'
      };
      
      // Log the export request
      await db.query(
        'INSERT INTO dsar_requests (user_id, request_type, status, request_id, requested_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userId, 'data_export', 'completed', exportData.export_id, new Date(), req.ip, req.get('User-Agent')]
      );
      
      successResponse(res, exportData, 'User data exported successfully');
    } catch (error) {
      throw new AppError('Failed to export user data', 500, 'EXPORT_ERROR');
    }
  })
);

/**
 * @swagger
 * /api/dsr/profile:
 *   put:
 *     summary: Update user profile (Right to Rectification)
 *     description: Update user's personal information
 *     tags: [Data Subject Rights]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               area:
 *                 type: string
 *               house:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/profile',
  authenticateToken,
  rateLimiters.general,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, email, phone, area, house } = req.body;
    
    try {
      // Update user profile
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;
      
      if (name) {
        updateFields.push(`username = $${paramCount++}`);
        updateValues.push(name);
      }
      if (email) {
        updateFields.push(`email = $${paramCount++}`);
        updateValues.push(email);
      }
      if (phone) {
        updateFields.push(`phone = $${paramCount++}`);
        updateValues.push(phone);
      }
      if (area) {
        updateFields.push(`area = $${paramCount++}`);
        updateValues.push(area);
      }
      if (house) {
        updateFields.push(`house = $${paramCount++}`);
        updateValues.push(house);
      }
      
      if (updateFields.length === 0) {
        throw new AppError('No fields provided for update', 400, 'VALIDATION_ERROR');
      }
      
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(userId);
      
      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await db.query(query, updateValues);
      
      // Log the profile update
      await db.query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, outcome, message) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, 'profile_update', 'user', userId, 'success', 'User profile updated via DSR']
      );
      
      successResponse(res, result.rows[0], 'Profile updated successfully');
    } catch (error) {
      throw new AppError('Failed to update profile', 500, 'UPDATE_ERROR');
    }
  })
);

/**
 * @swagger
 * /api/dsr/account:
 *   delete:
 *     summary: Delete user account (Right to Erasure)
 *     description: Delete user account and anonymize personal data
 *     tags: [Data Subject Rights]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for account deletion
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.delete('/account',
  authenticateToken,
  rateLimiters.sensitive,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { reason = 'user_request' } = req.body;
    
    try {
      // Anonymize user data instead of hard delete (for audit trail)
      const anonymizedId = `deleted_${userId}_${Date.now()}`;
      
      await db.query(
        `UPDATE users 
         SET username = $1, 
             email = $2, 
             phone = NULL, 
             area = NULL, 
             house = NULL,
             deleted_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [anonymizedId, `${anonymizedId}@anonymized.com`, userId]
      );
      
      // Log the deletion request
      await db.query(
        'INSERT INTO deletion_requests (user_id, reason, status, request_id, requested_at, anonymized_id, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [userId, reason, 'completed', uuidv4(), new Date(), anonymizedId, req.ip, req.get('User-Agent')]
      );
      
      // Log the account deletion
      await db.query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, outcome, message) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, 'account_deletion', 'user', userId, 'success', 'Account deleted via DSR - Right to Erasure']
      );
      
      successResponse(res, { 
        message: 'Account successfully deleted and data anonymized',
        anonymized_id: anonymizedId,
        deleted_at: new Date().toISOString()
      }, 'Account deleted successfully');
    } catch (error) {
      throw new AppError('Failed to delete account', 500, 'DELETION_ERROR');
    }
  })
);

/**
 * @swagger
 * /api/dsr/restrict-processing:
 *   post:
 *     summary: Restrict data processing (Right to Restrict Processing)
 *     description: Request restriction of data processing for specific purposes
 *     tags: [Data Subject Rights]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - processing_type
 *             properties:
 *               processing_type:
 *                 type: string
 *                 enum: [marketing, analytics, profiling, automated_decision_making]
 *               reason:
 *                 type: string
 *                 description: Reason for restricting processing
 *     responses:
 *       200:
 *         description: Processing restriction applied successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/restrict-processing',
  authenticateToken,
  rateLimiters.general,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { processing_type, reason = 'user_request' } = req.body;
    
    if (!processing_type) {
      throw new AppError('Processing type is required', 400, 'VALIDATION_ERROR');
    }
    
    try {
      // Store the restriction request
      const restrictionId = uuidv4();
      
      await db.query(
        `INSERT INTO dsar_requests (user_id, request_type, status, request_id, requested_at, ip_address, user_agent, details) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, 'restrict_processing', 'pending', restrictionId, new Date(), req.ip, req.get('User-Agent'), 
         JSON.stringify({ processing_type, reason })]
      );
      
      // Log the restriction request
      await db.query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, outcome, message, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userId, 'processing_restriction', 'user', userId, 'pending', 'Processing restriction requested', 
         JSON.stringify({ processing_type, reason })]
      );
      
      successResponse(res, {
        restriction_id: restrictionId,
        processing_type,
        status: 'pending',
        requested_at: new Date().toISOString(),
        message: 'Processing restriction request submitted successfully'
      }, 'Processing restriction applied successfully');
    } catch (error) {
      throw new AppError('Failed to apply processing restriction', 500, 'RESTRICTION_ERROR');
    }
  })
);

/**
 * @swagger
 * /api/dsr/export-portable:
 *   get:
 *     summary: Export data in portable format (Right to Data Portability)
 *     description: Export user data in a machine-readable format for transfer to another service
 *     tags: [Data Subject Rights]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, xml]
 *           default: json
 *         description: Export format
 *     responses:
 *       200:
 *         description: Data exported in portable format
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/export-portable',
  authenticateToken,
  rateLimiters.sensitive,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const format = req.query.format || 'json';
    
    try {
      // Gather user data for portability
      const userData = await db.query(
        'SELECT username, email, phone, area, house, created_at FROM users WHERE id = $1',
        [userId]
      );
      
      const visitorData = await db.query(
        'SELECT name, phone, email, purpose, date_of_visit, time_of_visit FROM visitors WHERE created_by = (SELECT email FROM users WHERE id = $1)',
        [userId]
      );
      
      const portableData = {
        user_profile: userData.rows[0],
        visitors_registered: visitorData.rows,
        exported_at: new Date().toISOString(),
        export_id: uuidv4(),
        format: format,
        data_controller: 'Secure Gate Access Control System',
        transfer_purpose: 'Data portability under Kenya DPA 2019'
      };
      
      // Log the portability request
      await db.query(
        'INSERT INTO portability_requests (user_id, format, status, request_id, requested_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userId, format, 'completed', portableData.export_id, new Date(), req.ip, req.get('User-Agent')]
      );
      
      // Set appropriate content type based on format
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}.csv"`);
        // Convert to CSV format (simplified)
        const csvData = convertToCSV(portableData);
        return res.send(csvData);
      } else if (format === 'xml') {
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}.xml"`);
        // Convert to XML format (simplified)
        const xmlData = convertToXML(portableData);
        return res.send(xmlData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}.json"`);
        return successResponse(res, portableData, 'Data exported in portable format');
      }
    } catch (error) {
      throw new AppError('Failed to export portable data', 500, 'PORTABILITY_ERROR');
    }
  })
);

/**
 * @swagger
 * /api/dsr/object-processing:
 *   post:
 *     summary: Object to data processing (Right to Object)
 *     description: Object to specific types of data processing
 *     tags: [Data Subject Rights]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - processing_type
 *               properties:
 *                 processing_type:
 *                   type: string
 *                   enum: [marketing, profiling, automated_decision_making, research, public_interest]
 *                 reason:
 *                   type: string
 *                   description: Reason for objection
 *     responses:
 *       200:
 *         description: Objection recorded successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/object-processing',
  authenticateToken,
  rateLimiters.general,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { processing_type, reason = 'user_objection' } = req.body;
    
    if (!processing_type) {
      throw new AppError('Processing type is required', 400, 'VALIDATION_ERROR');
    }
    
    try {
      const objectionId = uuidv4();
      
      // Store the objection
      await db.query(
        `INSERT INTO dsar_requests (user_id, request_type, status, request_id, requested_at, ip_address, user_agent, details) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, 'object_processing', 'pending', objectionId, new Date(), req.ip, req.get('User-Agent'),
         JSON.stringify({ processing_type, reason })]
      );
      
      // Log the objection
      await db.query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, outcome, message, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userId, 'processing_objection', 'user', userId, 'pending', 'Processing objection submitted',
         JSON.stringify({ processing_type, reason })]
      );
      
      successResponse(res, {
        objection_id: objectionId,
        processing_type,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        message: 'Objection to processing recorded successfully'
      }, 'Objection recorded successfully');
    } catch (error) {
      throw new AppError('Failed to record objection', 500, 'OBJECTION_ERROR');
    }
  })
);

/**
 * @swagger
 * /api/dsr/withdraw-consent:
 *   post:
 *     summary: Withdraw consent (Right to Withdraw Consent)
 *     description: Withdraw previously given consent for data processing
 *     tags: [Data Subject Rights]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - consent_type
 *               properties:
 *                 consent_type:
 *                   type: string
 *                   enum: [data_processing, marketing, analytics, all]
 *                 reason:
 *                   type: string
 *                   description: Reason for withdrawing consent
 *     responses:
 *       200:
 *         description: Consent withdrawn successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/withdraw-consent',
  authenticateToken,
  rateLimiters.general,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { consent_type, reason = 'user_withdrawal' } = req.body;
    
    if (!consent_type) {
      throw new AppError('Consent type is required', 400, 'VALIDATION_ERROR');
    }
    
    try {
      const withdrawalId = uuidv4();
      
      // Record the consent withdrawal
      await db.query(
        `INSERT INTO consent_records (user_id, consent_type, granted, timestamp, ip_address, user_agent, version) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, consent_type, false, new Date(), req.ip, req.get('User-Agent'), '1.0']
      );
      
      // Log the withdrawal request
      await db.query(
        'INSERT INTO dsar_requests (user_id, request_type, status, request_id, requested_at, ip_address, user_agent, details) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [userId, 'withdraw_consent', 'completed', withdrawalId, new Date(), req.ip, req.get('User-Agent'),
         JSON.stringify({ consent_type, reason })]
      );
      
      // Log the consent withdrawal
      await db.query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, outcome, message, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userId, 'consent_withdrawal', 'user', userId, 'completed', 'Consent withdrawn via DSR',
         JSON.stringify({ consent_type, reason })]
      );
      
      successResponse(res, {
        withdrawal_id: withdrawalId,
        consent_type,
        withdrawn_at: new Date().toISOString(),
        message: 'Consent withdrawn successfully'
      }, 'Consent withdrawn successfully');
    } catch (error) {
      throw new AppError('Failed to withdraw consent', 500, 'WITHDRAWAL_ERROR');
    }
  })
);

/**
 * @swagger
 * /api/dsr/requests:
 *   get:
 *     summary: Get DSR request history
 *     description: Retrieve history of data subject rights requests
 *     tags: [Data Subject Rights]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: request_type
 *         schema:
 *           type: string
 *         description: Filter by request type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: DSR request history retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/requests',
  authenticateToken,
  rateLimiters.general,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { request_type, status } = req.query;
    
    try {
      let query = 'SELECT * FROM dsar_requests WHERE user_id = $1';
      const queryParams = [userId];
      let paramCount = 1;
      
      if (request_type) {
        query += ` AND request_type = $${++paramCount}`;
        queryParams.push(request_type);
      }
      
      if (status) {
        query += ` AND status = $${++paramCount}`;
        queryParams.push(status);
      }
      
      query += ' ORDER BY requested_at DESC LIMIT 50';
      
      const result = await db.query(query, queryParams);
      
      successResponse(res, {
        requests: result.rows,
        total: result.rows.length,
        user_id: userId
      }, 'DSR request history retrieved successfully');
    } catch (error) {
      throw new AppError('Failed to retrieve DSR request history', 500, 'HISTORY_ERROR');
    }
  })
);

// Helper functions
function convertToCSV(data) {
  // Simplified CSV conversion
  const csvRows = [];
  
  // Add headers
  csvRows.push('Data Type,Field,Value');
  
  // Add user profile data
  if (data.user_profile) {
    Object.entries(data.user_profile).forEach(([key, value]) => {
      csvRows.push(`User Profile,${key},"${value}"`);
    });
  }
  
  // Add visitors data
  if (data.visitors_registered) {
    data.visitors_registered.forEach((visitor, index) => {
      Object.entries(visitor).forEach(([key, value]) => {
        csvRows.push(`Visitor ${index + 1},${key},"${value}"`);
      });
    });
  }
  
  return csvRows.join('\n');
}

function convertToXML(data) {
  // Simplified XML conversion
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<data_export>\n';
  
  // Add metadata
  xml += `  <metadata>\n`;
  xml += `    <exported_at>${data.exported_at}</exported_at>\n`;
  xml += `    <export_id>${data.export_id}</export_id>\n`;
  xml += `    <format>${data.format}</format>\n`;
  xml += `  </metadata>\n`;
  
  // Add user profile
  if (data.user_profile) {
    xml += `  <user_profile>\n`;
    Object.entries(data.user_profile).forEach(([key, value]) => {
      xml += `    <${key}>${value}</${key}>\n`;
    });
    xml += `  </user_profile>\n`;
  }
  
  // Add visitors
  if (data.visitors_registered) {
    xml += `  <visitors>\n`;
    data.visitors_registered.forEach((visitor, index) => {
      xml += `    <visitor id="${index + 1}">\n`;
      Object.entries(visitor).forEach(([key, value]) => {
        xml += `      <${key}>${value}</${key}>\n`;
      });
      xml += `    </visitor>\n`;
    });
    xml += `  </visitors>\n`;
  }
  
  xml += '</data_export>';
  return xml;
}

export default router;



