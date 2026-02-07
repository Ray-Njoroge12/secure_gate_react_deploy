/**
 * @fileoverview Bulk Operations Controller - Task 13.1
 * @description Controller for bulk operations including user management, visitor processing, and CSV imports
 */

import bulkOperationsService from '../services/bulkOperationsService.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';
import loggingService from '../services/loggingService.js';

/**
 * Execute bulk operation
 */
export const executeBulkOperation = async (req, res) => {
  try {
    const { operationType, itemIds, data = {}, batchSize } = req.body;
    const { user } = req;

    if (!operationType || !Array.isArray(itemIds) || itemIds.length === 0) {
      return errorResponse(res, 'Operation type and item IDs are required', 'VALIDATION_ERROR', 400);
    }

    // Set up progress callback for real-time updates
    const progressCallback = (progress) => {
      // In a real implementation, this would use WebSocket or SSE
      // For now, we'll just log progress
      loggingService.logInfo('Bulk operation progress', {
        operationId: progress.operationId,
        current: progress.current,
        total: progress.total,
        percentage: progress.percentage
      });
    };

    const result = await bulkOperationsService.executeBulkOperation({
      operationType,
      itemIds,
      data,
      userId: user.id,
      estateId: user.estate_id,
      batchSize,
      progressCallback
    });

    successResponse(res, result, 'Bulk operation completed successfully', 200);

  } catch (error) {
    loggingService.logError('Bulk operation failed', error, {
      userId: req.user?.id,
      estateId: req.user?.estate_id,
      operationType: req.body?.operationType
    });

    errorResponse(res, error.message, 'BULK_OPERATION_ERROR', 500);
  }
};

/**
 * Import data from CSV
 */
export const importFromCSV = async (req, res) => {
  try {
    const { csvData, importType } = req.body;
    const { user } = req;

    if (!Array.isArray(csvData) || csvData.length === 0) {
      return errorResponse(res, 'CSV data is required', 'VALIDATION_ERROR', 400);
    }

    if (!importType) {
      return errorResponse(res, 'Import type is required', 'VALIDATION_ERROR', 400);
    }

    // Set up progress callback
    const progressCallback = (progress) => {
      loggingService.logInfo('CSV import progress', {
        operationId: progress.operationId,
        current: progress.current,
        total: progress.total,
        percentage: progress.percentage
      });
    };

    const result = await bulkOperationsService.importFromCSV(
      csvData,
      importType,
      user.id,
      user.estate_id,
      progressCallback
    );

    successResponse(res, result, 'CSV import completed successfully', 200);

  } catch (error) {
    loggingService.logError('CSV import failed', error, {
      userId: req.user?.id,
      estateId: req.user?.estate_id,
      importType: req.body?.importType
    });

    errorResponse(res, error.message, 'CSV_IMPORT_ERROR', 500);
  }
};

/**
 * Get operation status
 */
export const getOperationStatus = async (req, res) => {
  try {
    const { operationId } = req.params;
    const { user } = req;

    const operation = bulkOperationsService.getOperationStatus(operationId);

    if (!operation) {
      return errorResponse(res, 'Operation not found', 'OPERATION_NOT_FOUND', 404);
    }

    // Check if user has access to this operation
    if (operation.userId !== user.id && user.role !== 'admin' && user.role !== 'super_admin') {
      return errorResponse(res, 'Access denied', 'ACCESS_DENIED', 403);
    }

    successResponse(res, { operation }, 'Operation status retrieved successfully');

  } catch (error) {
    loggingService.logError('Failed to get operation status', error, {
      userId: req.user?.id,
      operationId: req.params?.operationId
    });

    errorResponse(res, error.message, 'OPERATION_STATUS_ERROR', 500);
  }
};

/**
 * Get active operations
 */
export const getActiveOperations = async (req, res) => {
  try {
    const { user } = req;

    const operations = bulkOperationsService.getActiveOperations();

    // Filter operations based on user permissions
    const filteredOperations = operations.filter(op =>
      op.userId === user.id || user.role === 'admin' || user.role === 'super_admin'
    );

    successResponse(res, { operations: filteredOperations }, 'Active operations retrieved successfully');

  } catch (error) {
    loggingService.logError('Failed to get active operations', error, {
      userId: req.user?.id
    });

    errorResponse(res, error.message, 'ACTIVE_OPERATIONS_ERROR', 500);
  }
};

/**
 * Cancel operation
 */
export const cancelOperation = async (req, res) => {
  try {
    const { operationId } = req.params;
    const { user } = req;

    const result = await bulkOperationsService.cancelOperation(operationId, user.id);

    successResponse(res, result, 'Operation cancelled successfully');

  } catch (error) {
    loggingService.logError('Failed to cancel operation', error, {
      userId: req.user?.id,
      operationId: req.params?.operationId
    });

    errorResponse(res, error.message, 'CANCEL_OPERATION_ERROR', 500);
  }
};

/**
 * Advanced search and filtering for large datasets
 */
export const searchAndFilter = async (req, res) => {
  try {
    const { entityType } = req.params;
    const {
      filters = {},
      search = '',
      sort = { field: 'created_at', direction: 'desc' },
      page = 1,
      limit = 50
    } = req.query;
    const { user } = req;

    const result = await bulkOperationsService.searchAndFilter({
      entityType,
      estateId: user.estate_id,
      filters: typeof filters === 'string' ? JSON.parse(filters) : filters,
      search,
      sort: typeof sort === 'string' ? JSON.parse(sort) : sort,
      pagination: { page: parseInt(page), limit: parseInt(limit) },
      userId: user.id
    });

    successResponse(res, result, 'Search and filter completed successfully');

  } catch (error) {
    loggingService.logError('Search and filter failed', error, {
      userId: req.user?.id,
      entityType: req.params?.entityType
    });

    errorResponse(res, error.message, 'SEARCH_FILTER_ERROR', 500);
  }
};

/**
 * Create operation template
 */
export const createOperationTemplate = async (req, res) => {
  try {
    const { name, description, operationType, defaultSettings, filters, automationRules } = req.body;
    const { user } = req;

    if (!name || !operationType) {
      return errorResponse(res, 'Template name and operation type are required', 'VALIDATION_ERROR', 400);
    }

    const template = await bulkOperationsService.createOperationTemplate({
      name,
      description,
      operationType,
      defaultSettings,
      filters,
      automationRules
    }, user.id, user.estate_id);

    successResponse(res, { template }, 'Operation template created successfully', 201);

  } catch (error) {
    loggingService.logError('Failed to create operation template', error, {
      userId: req.user?.id,
      templateName: req.body?.name
    });

    errorResponse(res, error.message, 'CREATE_TEMPLATE_ERROR', 500);
  }
};

/**
 * Execute operation from template
 */
export const executeFromTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { overrides = {} } = req.body;
    const { user } = req;

    const result = await bulkOperationsService.executeFromTemplate(
      templateId,
      overrides,
      user.id,
      user.estate_id
    );

    successResponse(res, result, 'Template operation executed successfully');

  } catch (error) {
    loggingService.logError('Failed to execute template operation', error, {
      userId: req.user?.id,
      templateId: req.params?.templateId
    });

    errorResponse(res, error.message, 'TEMPLATE_EXECUTION_ERROR', 500);
  }
};

/**
 * Get operation templates for estate
 */
export const getOperationTemplates = async (req, res) => {
  try {
    const { user } = req;

    const templates = bulkOperationsService.getOperationTemplates(user.estate_id, user.id);

    successResponse(res, { templates }, 'Operation templates retrieved successfully');

  } catch (error) {
    loggingService.logError('Failed to get operation templates', error, {
      userId: req.user?.id
    });

    errorResponse(res, error.message, 'GET_TEMPLATES_ERROR', 500);
  }
};

/**
 * Schedule automated operation
 */
export const scheduleAutomatedOperation = async (req, res) => {
  try {
    const { templateId, schedule, conditions, isActive = true } = req.body;
    const { user } = req;

    if (!templateId || !schedule) {
      return errorResponse(res, 'Template ID and schedule are required', 'VALIDATION_ERROR', 400);
    }

    const automation = await bulkOperationsService.scheduleAutomatedOperation({
      templateId,
      schedule,
      conditions,
      isActive
    }, user.id, user.estate_id);

    successResponse(res, { automation }, 'Automated operation scheduled successfully', 201);

  } catch (error) {
    loggingService.logError('Failed to schedule automated operation', error, {
      userId: req.user?.id,
      templateId: req.body?.templateId
    });

    errorResponse(res, error.message, 'SCHEDULE_AUTOMATION_ERROR', 500);
  }
};

/**
 * Get completion report for operation
 */
export const getCompletionReport = async (req, res) => {
  try {
    const { operationId } = req.params;
    const { user } = req;

    const operation = bulkOperationsService.getOperationStatus(operationId);

    if (!operation) {
      return errorResponse(res, 'Operation not found', 'OPERATION_NOT_FOUND', 404);
    }

    // Check if user has access to this operation
    if (operation.userId !== user.id && user.role !== 'admin' && user.role !== 'super_admin') {
      return errorResponse(res, 'Access denied', 'ACCESS_DENIED', 403);
    }

    if (operation.status !== 'completed' && operation.status !== 'failed') {
      return errorResponse(res, 'Operation not yet completed', 'OPERATION_NOT_COMPLETED', 400);
    }

    const report = bulkOperationsService.generateCompletionReport(operation);

    successResponse(res, { report }, 'Completion report generated successfully');

  } catch (error) {
    loggingService.logError('Failed to generate completion report', error, {
      userId: req.user?.id,
      operationId: req.params?.operationId
    });

    errorResponse(res, error.message, 'COMPLETION_REPORT_ERROR', 500);
  }
};