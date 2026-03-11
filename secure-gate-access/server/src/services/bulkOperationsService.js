/**
 * @fileoverview Bulk Operations Service - Task 13.1
 * @description Comprehensive bulk operation framework for admin operations
 * including multi-select actions, progress tracking, CSV import, and batch processing.
 */

import { dbManager } from '../database/db.enhanced.js';
import loggingService from './loggingService.js';
import auditService from './auditService.js';
import notificationService from './notificationService.js';

import { EventEmitter } from 'events';

class BulkOperationsService extends EventEmitter {
  constructor() {
    super();
    this.activeOperations = new Map();
    this.operationHistory = new Map();
    this.maxConcurrentOperations = 5;
    this.defaultBatchSize = 50;
  }

  /**
   * Execute bulk operation with progress tracking
   * @param {Object} options - Operation configuration
   * @param {string} options.operationType - Type of operation (approve, reject, delete, etc.)
   * @param {Array} options.itemIds - Array of item IDs to process
   * @param {Object} options.data - Additional data for the operation
   * @param {number} options.userId - User performing the operation
   * @param {number} options.estateId - Estate ID for scoping
   * @param {number} options.batchSize - Batch size for processing
   * @param {Function} options.progressCallback - Progress callback function
   * @returns {Promise<Object>} Operation result with statistics
   */
  async executeBulkOperation(options) {
    const {
      operationType,
      itemIds,
      data = {},
      userId,
      estateId,
      batchSize = this.defaultBatchSize,
      progressCallback
    } = options;

    // Validate inputs
    this.validateBulkOperation(options);

    // Check concurrent operations limit
    if (this.activeOperations.size >= this.maxConcurrentOperations) {
      throw new Error('Maximum concurrent operations limit reached. Please wait for other operations to complete.');
    }

    const operationId = this.generateOperationId();
    const operation = {
      id: operationId,
      type: operationType,
      itemIds: [...itemIds],
      data,
      userId,
      estateId,
      batchSize,
      status: 'pending',
      progress: { current: 0, total: itemIds.length, percentage: 0 },
      results: { success: [], failed: [], skipped: [] },
      startTime: new Date(),
      endTime: null,
      error: null
    };

    this.activeOperations.set(operationId, operation);

    try {
      // Log operation start
      loggingService.logInfo('Bulk operation started', {
        operationId,
        operationType,
        itemCount: itemIds.length,
        userId,
        estateId
      });

      // Audit log
      await auditService.logAction(userId, 'bulk_operation_start', 'bulk_operation', operationId, {
        type: operationType,
        itemCount: itemIds.length,
        estateId
      });

      operation.status = 'running';
      this.emit('operationStarted', operation);

      // Process items in batches
      await this.processBatches(operation, progressCallback);

      operation.status = 'completed';
      operation.endTime = new Date();

      // Log completion
      loggingService.logInfo('Bulk operation completed', {
        operationId,
        operationType,
        duration: operation.endTime - operation.startTime,
        successCount: operation.results.success.length,
        failedCount: operation.results.failed.length,
        skippedCount: operation.results.skipped.length
      });

      // Audit log completion
      await auditService.logAction(userId, 'bulk_operation_complete', 'bulk_operation', operationId, {
        results: {
          success: operation.results.success.length,
          failed: operation.results.failed.length,
          skipped: operation.results.skipped.length
        },
        duration: operation.endTime - operation.startTime
      });

      this.emit('operationCompleted', operation);

      return this.formatOperationResult(operation);

    } catch (error) {
      operation.status = 'failed';
      operation.error = error.message;
      operation.endTime = new Date();

      loggingService.logError('Bulk operation failed', error, {
        operationId,
        operationType,
        userId,
        estateId
      });

      this.emit('operationFailed', operation);
      throw error;

    } finally {
      // Move to history and cleanup
      this.operationHistory.set(operationId, { ...operation });
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Process items in batches with progress tracking and error recovery
   */
  async processBatches(operation, progressCallback) {
    const { itemIds, batchSize, type: operationType } = operation;

    for (let i = 0; i < itemIds.length; i += batchSize) {
      const batch = itemIds.slice(i, i + batchSize);

      try {
        await this.processBatchWithRecovery(operation, batch);
      } catch (error) {
        loggingService.logError('Batch processing failed permanently', error, {
          operationId: operation.id,
          batchStart: i,
          batchSize: batch.length
        });
        // Continue with next batch even if this one failed
      }

      // Update progress
      operation.progress.current = Math.min(i + batch.length, itemIds.length);
      operation.progress.percentage = Math.round((operation.progress.current / operation.progress.total) * 100);

      // Call progress callback
      if (progressCallback) {
        progressCallback(operation.progress);
      }

      this.emit('operationProgress', operation);
    }
  }

  /**
   * Process a single batch of items
   */
  async processBatch(operation, batch) {
    const { type: operationType, data, userId, estateId } = operation;

    switch (operationType) {
      case 'approve_users':
        return await this.approveUsersBatch(batch, data, userId, estateId, operation);

      case 'reject_users':
        return await this.rejectUsersBatch(batch, data, userId, estateId, operation);

      case 'delete_users':
        return await this.deleteUsersBatch(batch, data, userId, estateId, operation);

      case 'approve_visitors':
        return await this.approveVisitorsBatch(batch, data, userId, estateId, operation);

      case 'reject_visitors':
        return await this.rejectVisitorsBatch(batch, data, userId, estateId, operation);

      case 'send_notifications':
        return await this.sendNotificationsBatch(batch, data, userId, estateId, operation);

      case 'update_status':
        return await this.updateStatusBatch(batch, data, userId, estateId, operation);

      case 'checkout_visitors':
        return await this.checkoutVisitorsBatch(batch, data, userId, estateId, operation);

      default:
        throw new Error(`Unsupported bulk operation type: ${operationType}`);
    }
  }

  /**
   * Approve users in batch
   */
  async approveUsersBatch(userIds, data, userId, estateId, operation) {
    const client = await dbManager.pool.connect();

    try {
      await client.query('BEGIN');

      for (const id of userIds) {
        try {
          // Verify user belongs to estate
          const userCheck = await client.query(
            'SELECT id, username, email, account_status FROM users WHERE id = $1 AND estate_id = $2',
            [id, estateId]
          );

          if (userCheck.rows.length === 0) {
            operation.results.skipped.push({ id, reason: 'User not found or not in estate' });
            continue;
          }

          const user = userCheck.rows[0];

          if (user.account_status === 'active') {
            operation.results.skipped.push({ id, reason: 'User already active' });
            continue;
          }

          // Update user status
          await client.query(
            'UPDATE users SET account_status = $1, updated_at = NOW() WHERE id = $2',
            ['active', id]
          );

          // Send notification to user
          if (user.email) {
            await notificationService.sendUserApprovalNotification(user.email, user.username);
          }

          operation.results.success.push({ id, username: user.username, email: user.email });

        } catch (error) {
          operation.results.failed.push({ id, error: error.message });
        }
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reject users in batch
   */
  async rejectUsersBatch(userIds, data, userId, estateId, operation) {
    const client = await dbManager.pool.connect();

    try {
      await client.query('BEGIN');

      for (const id of userIds) {
        try {
          // Verify user belongs to estate
          const userCheck = await client.query(
            'SELECT id, username, email, account_status FROM users WHERE id = $1 AND estate_id = $2',
            [id, estateId]
          );

          if (userCheck.rows.length === 0) {
            operation.results.skipped.push({ id, reason: 'User not found or not in estate' });
            continue;
          }

          const user = userCheck.rows[0];

          // Update user status
          await client.query(
            'UPDATE users SET account_status = $1, updated_at = NOW() WHERE id = $2',
            ['rejected', id]
          );

          // Send notification to user
          if (user.email) {
            await notificationService.sendUserRejectionNotification(user.email, user.username, data.reason);
          }

          operation.results.success.push({ id, username: user.username, email: user.email });

        } catch (error) {
          operation.results.failed.push({ id, error: error.message });
        }
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Approve visitors in batch
   */
  async approveVisitorsBatch(visitorIds, data, userId, estateId, operation) {
    const client = await dbManager.pool.connect();

    try {
      await client.query('BEGIN');

      for (const id of visitorIds) {
        try {
          // Verify visitor belongs to estate
          const visitorCheck = await client.query(
            'SELECT id, name, phone, email, status FROM visitors WHERE id = $1 AND estate_id = $2',
            [id, estateId]
          );

          if (visitorCheck.rows.length === 0) {
            operation.results.skipped.push({ id, reason: 'Visitor not found or not in estate' });
            continue;
          }

          const visitor = visitorCheck.rows[0];

          if (visitor.status === 'APPROVED') {
            operation.results.skipped.push({ id, reason: 'Visitor already approved' });
            continue;
          }

          // Update visitor status
          await client.query(
            'UPDATE visitors SET status = $1, updated_at = NOW() WHERE id = $2',
            ['APPROVED', id]
          );

          // Send notification to visitor
          if (visitor.phone) {
            await notificationService.sendVisitorApprovalNotification(visitor.phone, visitor.name);
          }

          operation.results.success.push({ id, name: visitor.name, phone: visitor.phone });

        } catch (error) {
          operation.results.failed.push({ id, error: error.message });
        }
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Checkout visitors in batch
   */
  async checkoutVisitorsBatch(visitorIds, data, userId, estateId, operation) {
    const client = await dbManager.pool.connect();

    try {
      await client.query('BEGIN');

      for (const id of visitorIds) {
        try {
          const visitorCheck = await client.query(
            'SELECT id, name, status FROM visitors WHERE id = $1 AND estate_id = $2',
            [id, estateId]
          );

          if (visitorCheck.rows.length === 0) {
            operation.results.skipped.push({ id, reason: 'Visitor not found or not in estate' });
            continue;
          }

          const visitor = visitorCheck.rows[0];

          if (visitor.status === 'CHECKED_OUT') {
            operation.results.skipped.push({ id, reason: 'Visitor already checked out' });
            continue;
          }

          await client.query(
            'UPDATE visitors SET status = $1, check_out_time = NOW(), updated_at = NOW() WHERE id = $2',
            ['CHECKED_OUT', id]
          );

          operation.results.success.push({ id, name: visitor.name });
        } catch (error) {
          operation.results.failed.push({ id, error: error.message });
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Send notifications in batch
   */
  async sendNotificationsBatch(recipientIds, data, userId, estateId, operation) {
    const { message, title, channels = ['email', 'sms'] } = data;

    for (const id of recipientIds) {
      try {
        // Get recipient details
        const recipientCheck = await dbManager.query(
          'SELECT id, username, email, phone FROM users WHERE id = $1 AND estate_id = $2',
          [id, estateId]
        );

        if (recipientCheck.rows.length === 0) {
          operation.results.skipped.push({ id, reason: 'Recipient not found or not in estate' });
          continue;
        }

        const recipient = recipientCheck.rows[0];

        // Send notifications through selected channels
        const notifications = [];

        if (channels.includes('email') && recipient.email) {
          notifications.push(notificationService.sendEmail(recipient.email, title, message));
        }

        if (channels.includes('sms') && recipient.phone) {
          notifications.push(notificationService.sendSMS(recipient.phone, `${title}: ${message}`));
        }

        await Promise.all(notifications);

        operation.results.success.push({
          id,
          username: recipient.username,
          email: recipient.email,
          phone: recipient.phone,
          channels: channels.filter(c =>
            (c === 'email' && recipient.email) || (c === 'sms' && recipient.phone)
          )
        });

      } catch (error) {
        operation.results.failed.push({ id, error: error.message });
      }
    }
  }

  /**
   * Import data from CSV with validation
   */
  async importFromCSV(csvData, importType, userId, estateId, progressCallback) {
    const operationId = this.generateOperationId();
    const operation = {
      id: operationId,
      type: `import_${importType}`,
      itemIds: csvData.map((_, index) => index),
      data: { importType, csvData },
      userId,
      estateId,
      status: 'running',
      progress: { current: 0, total: csvData.length, percentage: 0 },
      results: { success: [], failed: [], skipped: [] },
      startTime: new Date(),
      endTime: null,
      error: null
    };

    this.activeOperations.set(operationId, operation);

    try {
      loggingService.logInfo('CSV import started', {
        operationId,
        importType,
        rowCount: csvData.length,
        userId,
        estateId
      });

      switch (importType) {
        case 'users':
          await this.importUsers(csvData, operation, progressCallback);
          break;
        case 'visitors':
          await this.importVisitors(csvData, operation, progressCallback);
          break;
        default:
          throw new Error(`Unsupported import type: ${importType}`);
      }

      operation.status = 'completed';
      operation.endTime = new Date();

      return this.formatOperationResult(operation);

    } catch (error) {
      operation.status = 'failed';
      operation.error = error.message;
      operation.endTime = new Date();
      throw error;

    } finally {
      this.operationHistory.set(operationId, { ...operation });
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Import users from CSV data
   */
  async importUsers(csvData, operation, progressCallback) {
    const { userId, estateId } = operation;

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];

      try {
        // Validate required fields
        const validation = this.validateUserImportRow(row);
        if (!validation.valid) {
          operation.results.failed.push({
            row: i + 1,
            data: row,
            error: validation.errors.join(', ')
          });
          continue;
        }

        // Check if user already exists
        const existingUser = await dbManager.query(
          'SELECT id FROM users WHERE email = $1 AND estate_id = $2',
          [row.email, estateId]
        );

        if (existingUser.rows.length > 0) {
          operation.results.skipped.push({
            row: i + 1,
            data: row,
            reason: 'User already exists'
          });
          continue;
        }

        // Create user
        const hashedPassword = await this.generateTemporaryPassword();
        const newUser = await dbManager.query(
          `INSERT INTO users (username, email, password_hash, role, phone, estate_id, account_status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
           RETURNING id, username, email`,
          [row.username, row.email, hashedPassword, row.role || 'resident', row.phone, estateId]
        );

        // Send welcome email with temporary password
        await notificationService.sendUserWelcomeEmail(row.email, row.username, 'temporary_password');

        operation.results.success.push({
          row: i + 1,
          data: row,
          userId: newUser.rows[0].id
        });

      } catch (error) {
        operation.results.failed.push({
          row: i + 1,
          data: row,
          error: error.message
        });
      }

      // Update progress
      operation.progress.current = i + 1;
      operation.progress.percentage = Math.round(((i + 1) / csvData.length) * 100);

      if (progressCallback) {
        progressCallback(operation.progress);
      }
    }
  }

  /**
   * Import visitors from CSV data
   */
  async importVisitors(csvData, operation, progressCallback) {
    const { userId, estateId } = operation;
    const { generateVisitorToken } = await import('../utils/tokenHelper.js');
    const { generateOTP } = await import('../utils/tokenHelper.js');
    const argon2 = await import('argon2');

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];

      try {
        // Validate required fields
        const validation = this.validateVisitorImportRow(row);
        if (!validation.valid) {
          operation.results.failed.push({
            row: i + 1,
            data: row,
            error: validation.errors.join(', ')
          });
          continue;
        }

        // Find host (resident) by email
        // Host MUST belong to the same estate
        const hostQuery = await dbManager.query(
          'SELECT id FROM users WHERE email = $1 AND estate_id = $2 AND role = $3',
          [row.host_email, estateId, 'resident']
        );

        if (hostQuery.rows.length === 0) {
          operation.results.failed.push({
            row: i + 1,
            data: row,
            error: `Host resident not found with email: ${row.host_email}`
          });
          continue;
        }

        const hostId = hostQuery.rows[0].id;

        // Generate tokens
        const visitorToken = generateVisitorToken();
        const otp = generateOTP(6);
        const otpHash = await argon2.hash(otp);

        // Default to 24h expiry if not specified
        const visitDate = row.date_of_visit ? new Date(row.date_of_visit) : new Date();
        const tokenExpiresAt = new Date(visitDate);
        tokenExpiresAt.setHours(23, 59, 59, 999);

        const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        // Create visitor
        const newVisitor = await dbManager.query(
          `INSERT INTO visitors (
            name, phone, email, purpose, 
            date_of_visit, time_of_visit, 
            resident_id, host_id, estate_id, 
            visitor_token, token_expires_at,
            otp_hash, otp_expires_at,
            status, created_by, created_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'APPROVED', $14, NOW())
           RETURNING id, name, visitor_token`,
          [
            row.name,
            row.phone,
            row.email || null,
            row.purpose || 'Imported Visit',
            visitDate.toISOString().split('T')[0], // YYYY-MM-DD
            row.time_of_visit || '09:00',
            hostId,
            hostId,
            estateId,
            visitorToken,
            tokenExpiresAt,
            otpHash,
            otpExpiresAt,
            operation.userId // Creator ID (Admin)
          ]
        );

        // Optionally send notification (skipped for bulk import to avoid spam, can be added as a next step)

        operation.results.success.push({
          row: i + 1,
          data: row,
          visitorId: newVisitor.rows[0].id,
          visitorToken: newVisitor.rows[0].visitor_token
        });

      } catch (error) {
        operation.results.failed.push({
          row: i + 1,
          data: row,
          error: error.message
        });
      }

      // Update progress
      operation.progress.current = i + 1;
      operation.progress.percentage = Math.round(((i + 1) / csvData.length) * 100);

      if (progressCallback) {
        progressCallback(operation.progress);
      }
    }
  }

  /**
   * Validate visitor import row
   */
  validateVisitorImportRow(row) {
    const errors = [];

    if (!row.name || row.name.trim().length < 2) {
      errors.push('Name is required');
    }

    if (!row.phone && !row.email) {
      errors.push('Phone or Email is required');
    }

    if (row.phone && !this.isValidPhone(row.phone)) {
      errors.push('Invalid phone number format');
    }

    if (row.email && !this.isValidEmail(row.email)) {
      errors.push('Invalid email format');
    }

    if (!row.host_email || !this.isValidEmail(row.host_email)) {
      errors.push('Host resident email is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate user import row
   */
  validateUserImportRow(row) {
    const errors = [];

    if (!row.username || row.username.trim().length < 3) {
      errors.push('Username must be at least 3 characters');
    }

    if (!row.email || !this.isValidEmail(row.email)) {
      errors.push('Valid email is required');
    }

    if (row.role && !['admin', 'guard', 'resident'].includes(row.role)) {
      errors.push('Role must be admin, guard, or resident');
    }

    if (row.phone && !this.isValidPhone(row.phone)) {
      errors.push('Invalid phone number format');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get operation status
   */
  getOperationStatus(operationId) {
    const active = this.activeOperations.get(operationId);
    if (active) {
      return { ...active, isActive: true };
    }

    const historical = this.operationHistory.get(operationId);
    if (historical) {
      return { ...historical, isActive: false };
    }

    return null;
  }

  /**
   * Get all active operations
   */
  getActiveOperations() {
    return Array.from(this.activeOperations.values());
  }

  /**
   * Cancel operation
   */
  async cancelOperation(operationId, userId) {
    const operation = this.activeOperations.get(operationId);

    if (!operation) {
      throw new Error('Operation not found or already completed');
    }

    if (operation.userId !== userId) {
      throw new Error('Not authorized to cancel this operation');
    }

    operation.status = 'cancelled';
    operation.endTime = new Date();

    loggingService.logInfo('Bulk operation cancelled', {
      operationId,
      userId,
      cancelledAt: operation.endTime
    });

    this.emit('operationCancelled', operation);

    // Move to history
    this.operationHistory.set(operationId, { ...operation });
    this.activeOperations.delete(operationId);

    return this.formatOperationResult(operation);
  }

  /**
   * Generate detailed completion report for bulk operation
   */
  generateCompletionReport(operation) {
    const report = {
      operationId: operation.id,
      type: operation.type,
      summary: {
        totalItems: operation.itemIds.length,
        successCount: operation.results.success.length,
        failedCount: operation.results.failed.length,
        skippedCount: operation.results.skipped.length,
        successRate: Math.round((operation.results.success.length / operation.itemIds.length) * 100),
        duration: operation.endTime ? operation.endTime - operation.startTime : null,
        startTime: operation.startTime,
        endTime: operation.endTime,
        status: operation.status
      },
      details: {
        successful: operation.results.success.map(item => ({
          ...item,
          processedAt: new Date().toISOString()
        })),
        failed: operation.results.failed.map(item => ({
          ...item,
          failedAt: new Date().toISOString(),
          retryable: this.isRetryableError(item.error)
        })),
        skipped: operation.results.skipped.map(item => ({
          ...item,
          skippedAt: new Date().toISOString()
        }))
      },
      recommendations: this.generateRecommendations(operation),
      nextSteps: this.generateNextSteps(operation)
    };

    return report;
  }

  /**
   * Determine if an error is retryable
   */
  isRetryableError(errorMessage) {
    const retryablePatterns = [
      /network error/i,
      /timeout/i,
      /connection/i,
      /temporary/i,
      /rate limit/i
    ];

    return retryablePatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Generate recommendations based on operation results
   */
  generateRecommendations(operation) {
    const recommendations = [];
    const { results } = operation;

    if (results.failed.length > 0) {
      const retryableCount = results.failed.filter(item =>
        this.isRetryableError(item.error)
      ).length;

      if (retryableCount > 0) {
        recommendations.push({
          type: 'retry',
          message: `${retryableCount} items failed with retryable errors. Consider retrying these items.`,
          action: 'retry_failed',
          itemCount: retryableCount
        });
      }

      const nonRetryableCount = results.failed.length - retryableCount;
      if (nonRetryableCount > 0) {
        recommendations.push({
          type: 'review',
          message: `${nonRetryableCount} items failed with non-retryable errors. Manual review required.`,
          action: 'manual_review',
          itemCount: nonRetryableCount
        });
      }
    }

    if (results.skipped.length > 0) {
      recommendations.push({
        type: 'review',
        message: `${results.skipped.length} items were skipped. Review reasons and take appropriate action.`,
        action: 'review_skipped',
        itemCount: results.skipped.length
      });
    }

    const successRate = (results.success.length / operation.itemIds.length) * 100;
    if (successRate < 80) {
      recommendations.push({
        type: 'optimization',
        message: `Success rate is ${successRate.toFixed(1)}%. Consider reviewing data quality or operation parameters.`,
        action: 'optimize_process'
      });
    }

    return recommendations;
  }

  /**
   * Generate next steps based on operation results
   */
  generateNextSteps(operation) {
    const nextSteps = [];
    const { results, type } = operation;

    // Type-specific next steps
    switch (type) {
      case 'approve_users':
        if (results.success.length > 0) {
          nextSteps.push({
            action: 'send_welcome_emails',
            description: `Send welcome emails to ${results.success.length} newly approved users`,
            priority: 'high'
          });
        }
        break;

      case 'approve_visitors':
        if (results.success.length > 0) {
          nextSteps.push({
            action: 'generate_qr_codes',
            description: `Generate QR codes for ${results.success.length} approved visitors`,
            priority: 'high'
          });
        }
        break;

      case 'import_users':
        if (results.success.length > 0) {
          nextSteps.push({
            action: 'setup_user_profiles',
            description: `Complete profile setup for ${results.success.length} imported users`,
            priority: 'medium'
          });
        }
        break;
    }

    // General next steps
    if (results.failed.length > 0) {
      nextSteps.push({
        action: 'review_failures',
        description: `Review and address ${results.failed.length} failed items`,
        priority: 'high'
      });
    }

    return nextSteps;
  }

  /**
   * Advanced filtering and search for large datasets
   */
  async searchAndFilter(options) {
    const {
      entityType, // 'users', 'visitors', etc.
      estateId,
      filters = {},
      search = '',
      sort = { field: 'created_at', direction: 'desc' },
      pagination = { page: 1, limit: 50 },
      userId
    } = options;

    // Validate inputs
    if (!entityType || !estateId) {
      throw new Error('Entity type and estate ID are required');
    }

    const offset = (pagination.page - 1) * pagination.limit;
    let query = '';
    let countQuery = '';
    const params = [estateId];
    let paramIndex = 2;

    // Build base query based on entity type
    switch (entityType) {
      case 'users':
        query = `
          SELECT id, username, email, role, phone, account_status, created_at, updated_at
          FROM users 
          WHERE estate_id = $1
        `;
        countQuery = 'SELECT COUNT(*) FROM users WHERE estate_id = $1';
        break;

      case 'visitors':
        query = `
          SELECT v.id, v.name, v.phone, v.email, v.purpose, v.status, 
                 v.expected_arrival, v.created_at, u.username as host_name
          FROM visitors v
          LEFT JOIN users u ON v.host_id = u.id
          WHERE v.estate_id = $1
        `;
        countQuery = 'SELECT COUNT(*) FROM visitors WHERE estate_id = $1';
        break;

      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }

    // Add search conditions
    if (search) {
      const searchConditions = this.buildSearchConditions(entityType, search, paramIndex);
      query += ` AND (${searchConditions.condition})`;
      countQuery += ` AND (${searchConditions.condition})`;
      params.push(...searchConditions.params);
      paramIndex += searchConditions.params.length;
    }

    // Add filters
    const filterConditions = this.buildFilterConditions(entityType, filters, paramIndex);
    if (filterConditions.condition) {
      query += ` AND ${filterConditions.condition}`;
      countQuery += ` AND ${filterConditions.condition}`;
      params.push(...filterConditions.params);
      paramIndex += filterConditions.params.length;
    }

    // Add sorting
    const sortClause = this.buildSortClause(entityType, sort);
    query += ` ORDER BY ${sortClause}`;

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pagination.limit, offset);

    try {
      // Execute queries
      const [dataResult, countResult] = await Promise.all([
        dbManager.query(query, params),
        dbManager.query(countQuery, params.slice(0, -2)) // Remove limit/offset params for count
      ]);

      const totalCount = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: dataResult.rows,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalCount,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1
        },
        filters: filters,
        search: search,
        sort: sort
      };

    } catch (error) {
      loggingService.logError('Advanced search failed', error, {
        entityType,
        estateId,
        filters,
        search,
        userId
      });
      throw error;
    }
  }

  /**
   * Build search conditions for different entity types
   */
  buildSearchConditions(entityType, search, paramIndex) {
    const searchTerm = `%${search.toLowerCase()}%`;

    switch (entityType) {
      case 'users':
        return {
          condition: `(LOWER(username) LIKE $${paramIndex} OR LOWER(email) LIKE $${paramIndex} OR LOWER(phone) LIKE $${paramIndex})`,
          params: [searchTerm]
        };

      case 'visitors':
        return {
          condition: `(LOWER(v.name) LIKE $${paramIndex} OR LOWER(v.phone) LIKE $${paramIndex} OR LOWER(v.email) LIKE $${paramIndex} OR LOWER(v.purpose) LIKE $${paramIndex})`,
          params: [searchTerm]
        };

      default:
        return { condition: '', params: [] };
    }
  }

  /**
   * Build filter conditions
   */
  buildFilterConditions(entityType, filters, paramIndex) {
    const conditions = [];
    const params = [];
    let currentParamIndex = paramIndex;

    Object.entries(filters).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;

      switch (key) {
        case 'status':
        case 'account_status':
        case 'role':
          conditions.push(`${key} = $${currentParamIndex}`);
          params.push(value);
          currentParamIndex++;
          break;

        case 'created_after':
          conditions.push(`created_at >= $${currentParamIndex}`);
          params.push(value);
          currentParamIndex++;
          break;

        case 'created_before':
          conditions.push(`created_at <= $${currentParamIndex}`);
          params.push(value);
          currentParamIndex++;
          break;

        case 'phone_verified':
        case 'email_verified':
          conditions.push(`${key} = $${currentParamIndex}`);
          params.push(value);
          currentParamIndex++;
          break;
      }
    });

    return {
      condition: conditions.join(' AND '),
      params
    };
  }

  /**
   * Build sort clause
   */
  buildSortClause(entityType, sort) {
    const allowedFields = {
      users: ['id', 'username', 'email', 'role', 'account_status', 'created_at', 'updated_at'],
      visitors: ['id', 'name', 'phone', 'status', 'expected_arrival', 'created_at']
    };

    const fields = allowedFields[entityType] || ['created_at'];
    const field = fields.includes(sort.field) ? sort.field : 'created_at';
    const direction = ['asc', 'desc'].includes(sort.direction?.toLowerCase()) ? sort.direction.toUpperCase() : 'DESC';

    return `${field} ${direction}`;
  }

  /**
   * Batch processing with error recovery
   */
  async processBatchWithRecovery(operation, batch, retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff

    try {
      return await this.processBatch(operation, batch);
    } catch (error) {
      if (retryCount < maxRetries && this.isRetryableError(error.message)) {
        loggingService.logInfo('Retrying batch processing', {
          operationId: operation.id,
          batchSize: batch.length,
          retryCount: retryCount + 1,
          delay: retryDelay
        });

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));

        return await this.processBatchWithRecovery(operation, batch, retryCount + 1);
      } else {
        // Mark all items in batch as failed
        batch.forEach(itemId => {
          operation.results.failed.push({
            id: itemId,
            error: `Batch processing failed after ${retryCount + 1} attempts: ${error.message}`
          });
        });

        loggingService.logError('Batch processing failed permanently', error, {
          operationId: operation.id,
          batchSize: batch.length,
          retryCount: retryCount + 1
        });
      }
    }
  }

  /**
   * Bulk operation templates and automation
   */
  async createOperationTemplate(templateData, userId, estateId) {
    const {
      name,
      description,
      operationType,
      defaultSettings = {},
      filters = {},
      automationRules = {}
    } = templateData;

    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const template = {
      id: templateId,
      name,
      description,
      operationType,
      defaultSettings,
      filters,
      automationRules,
      createdBy: userId,
      estateId,
      createdAt: new Date(),
      isActive: true,
      usageCount: 0
    };

    // Store template (in production, this would be in database)
    if (!this.operationTemplates) {
      this.operationTemplates = new Map();
    }

    this.operationTemplates.set(templateId, template);

    loggingService.logInfo('Operation template created', {
      templateId,
      name,
      operationType,
      userId,
      estateId
    });

    return template;
  }

  /**
   * Execute operation using template
   */
  async executeFromTemplate(templateId, overrides = {}, userId, estateId) {
    const template = this.operationTemplates?.get(templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    if (template.estateId !== estateId) {
      throw new Error('Template not accessible for this estate');
    }

    // Merge template settings with overrides
    const operationOptions = {
      ...template.defaultSettings,
      ...overrides,
      operationType: template.operationType,
      userId,
      estateId
    };

    // If template has filters, apply them to get items
    if (template.filters && Object.keys(template.filters).length > 0) {
      const searchResult = await this.searchAndFilter({
        entityType: this.getEntityTypeFromOperation(template.operationType),
        estateId,
        filters: template.filters,
        pagination: { page: 1, limit: 1000 }, // Get all matching items
        userId
      });

      operationOptions.itemIds = searchResult.data.map(item => item.id);
    }

    // Update template usage count
    template.usageCount++;

    // Execute operation
    const result = await this.executeBulkOperation(operationOptions);

    loggingService.logInfo('Template operation executed', {
      templateId,
      operationId: result.operationId,
      itemCount: operationOptions.itemIds?.length || 0,
      userId
    });

    return result;
  }

  /**
   * Get entity type from operation type
   */
  getEntityTypeFromOperation(operationType) {
    if (operationType.includes('user')) return 'users';
    if (operationType.includes('visitor')) return 'visitors';
    return 'users'; // default
  }

  /**
   * Get operation templates for estate
   */
  getOperationTemplates(estateId, userId) {
    if (!this.operationTemplates) {
      return [];
    }

    return Array.from(this.operationTemplates.values())
      .filter(template => template.estateId === estateId && template.isActive)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Schedule automated operation
   */
  async scheduleAutomatedOperation(scheduleData, userId, estateId) {
    const {
      templateId,
      schedule, // cron expression or interval
      conditions = {},
      isActive = true
    } = scheduleData;

    const template = this.operationTemplates?.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const automationId = `automation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const automation = {
      id: automationId,
      templateId,
      schedule,
      conditions,
      isActive,
      createdBy: userId,
      estateId,
      createdAt: new Date(),
      lastRun: null,
      nextRun: this.calculateNextRun(schedule),
      runCount: 0
    };

    // Store automation (in production, this would be in database)
    if (!this.automatedOperations) {
      this.automatedOperations = new Map();
    }

    this.automatedOperations.set(automationId, automation);

    loggingService.logInfo('Automated operation scheduled', {
      automationId,
      templateId,
      schedule,
      userId,
      estateId
    });

    return automation;
  }

  /**
   * Calculate next run time for scheduled operation
   */
  calculateNextRun(schedule) {
    // Simple implementation - in production would use cron parser
    if (schedule.includes('daily')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    }

    if (schedule.includes('weekly')) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek;
    }

    // Default to 1 hour from now
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    return nextHour;
  }
  generateOperationId() {
    return `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  validateBulkOperation(options) {
    const { operationType, itemIds, userId, estateId } = options;

    if (!operationType) {
      throw new Error('Operation type is required');
    }

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throw new Error('Item IDs array is required and must not be empty');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!estateId) {
      throw new Error('Estate ID is required');
    }

    if (itemIds.length > 1000) {
      throw new Error('Maximum 1000 items per bulk operation');
    }
  }

  formatOperationResult(operation) {
    const basicResult = {
      operationId: operation.id,
      type: operation.type,
      status: operation.status,
      progress: operation.progress,
      results: {
        total: operation.itemIds.length,
        success: operation.results.success.length,
        failed: operation.results.failed.length,
        skipped: operation.results.skipped.length,
        details: operation.results
      },
      duration: operation.endTime ? operation.endTime - operation.startTime : null,
      error: operation.error
    };

    // Add detailed completion report if operation is completed
    if (operation.status === 'completed' || operation.status === 'failed') {
      basicResult.completionReport = this.generateCompletionReport(operation);
    }

    return basicResult;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  async generateTemporaryPassword() {
    // Generate a secure temporary password
    const crypto = await import('crypto');
    return crypto.randomBytes(12).toString('base64');
  }
}

// Create singleton instance
const bulkOperationsService = new BulkOperationsService();

export default bulkOperationsService;