/**
 * @fileoverview Unit Tests for Bulk Operations Controller - Task 13.5
 * @description Tests for bulk operation controller methods including execution, templates, and automation
 */

import { jest } from '@jest/globals';
import {
  executeBulkOperation,
  importFromCSV,
  getOperationStatus,
  getActiveOperations,
  cancelOperation,
  searchAndFilter,
  createOperationTemplate,
  executeFromTemplate,
  getOperationTemplates,
  scheduleAutomatedOperation,
  getCompletionReport
} from '../../src/controllers/bulkOperationsController.js';

// Mock the bulk operations service
const mockBulkOperationsService = {
  executeBulkOperation: jest.fn(),
  importFromCSV: jest.fn(),
  getOperationStatus: jest.fn(),
  getActiveOperations: jest.fn(),
  cancelOperation: jest.fn(),
  searchAndFilter: jest.fn(),
  createOperationTemplate: jest.fn(),
  executeFromTemplate: jest.fn(),
  getOperationTemplates: jest.fn(),
  scheduleAutomatedOperation: jest.fn(),
  getCompletionReport: jest.fn()
};

jest.unstable_mockModule('../../src/services/bulkOperationsService.js', () => ({
  default: mockBulkOperationsService
}));

// Mock response helpers
const mockSuccessResponse = jest.fn();
const mockErrorResponse = jest.fn();

jest.unstable_mockModule('../../src/utils/responseHelpers.js', () => ({
  successResponse: mockSuccessResponse,
  errorResponse: mockErrorResponse
}));

// Mock logging service
const mockLoggingService = {
  logInfo: jest.fn(),
  logError: jest.fn()
};

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  loggingService: mockLoggingService
}));

describe('Bulk Operations Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: {
        id: 1,
        estate_id: 1,
        role: 'admin'
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('executeBulkOperation', () => {
    test('should execute bulk operation successfully', async () => {
      const mockResult = {
        operationId: 'bulk_123',
        type: 'approve_users',
        status: 'completed',
        results: {
          total: 5,
          success: 4,
          failed: 1,
          skipped: 0
        },
        duration: 1500
      };

      mockReq.body = {
        operationType: 'approve_users',
        itemIds: [1, 2, 3, 4, 5],
        data: { reason: 'Batch approval' },
        batchSize: 50
      };

      mockBulkOperationsService.executeBulkOperation.mockResolvedValue(mockResult);

      await executeBulkOperation(mockReq, mockRes);

      expect(mockBulkOperationsService.executeBulkOperation).toHaveBeenCalledWith({
        operationType: 'approve_users',
        itemIds: [1, 2, 3, 4, 5],
        data: { reason: 'Batch approval' },
        userId: 1,
        estateId: 1,
        batchSize: 50,
        progressCallback: expect.any(Function)
      });

      expect(mockSuccessResponse).toHaveBeenCalledWith(
        mockRes,
        mockResult,
        'Bulk operation completed successfully',
        200
      );
    });

    test('should return validation error for missing operation type', async () => {
      mockReq.body = {
        itemIds: [1, 2, 3]
      };

      await executeBulkOperation(mockReq, mockRes);

      expect(mockErrorResponse).toHaveBeenCalledWith(
        mockRes,
        'Operation type and item IDs are required',
        'VALIDATION_ERROR',
        400
      );
    });

    test('should return validation error for empty item IDs', async () => {
      mockReq.body = {
        operationType: 'approve_users',
        itemIds: []
      };

      await executeBulkOperation(mockReq, mockRes);

      expect(mockErrorResponse).toHaveBeenCalledWith(
        mockRes,
        'Operation type and item IDs are required',
        'VALIDATION_ERROR',
        400
      );
    });

    test('should handle service errors', async () => {
      mockReq.body = {
        operationType: 'approve_users',
        itemIds: [1, 2, 3]
      };

      const error = new Error('Service error');
      mockBulkOperationsService.executeBulkOperation.mockRejectedValue(error);

      await executeBulkOperation(mockReq, mockRes);

      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Bulk operation failed',
        error,
        {
          userId: 1,
          estateId: 1,
          operationType: 'approve_users'
        }
      );

      expect(mockErrorResponse).toHaveBeenCalledWith(
        mockRes,
        'Service error',
        'BULK_OPERATION_ERROR',
        500
      );
    });
  });

  describe('importFromCSV', () => {
    test('should import CSV data successfully', async () => {
      const mockResult = {
        operationId: 'import_123',
        type: 'users',
        status: 'completed',
        results: {
          total: 3,
          success: 2,
          failed: 1,
          skipped: 0
        }
      };

      mockReq.body = {
        csvData: [
          { username: 'user1', email: 'user1@test.com', role: 'resident' },
          { username: 'user2', email: 'user2@test.com', role: 'resident' },
          { username: 'user3', email: 'invalid-email', role: 'resident' }
        ],
        importType: 'users'
      };

      mockBulkOperationsService.importFromCSV.mockResolvedValue(mockResult);

      await importFromCSV(mockReq, mockRes);

      expect(mockBulkOperationsService.importFromCSV).toHaveBeenCalledWith(
        mockReq.body.csvData,
        'users',
        1,
        1,
        expect.any(Function)
      );

      expect(mockSuccessResponse).toHaveBeenCalledWith(
        mockRes,
        mockResult,
        'CSV import completed successfully',
        200
      );
    });

    test('should return validation error for empty CSV data', async () => {
      mockReq.body = {
        csvData: [],
        importType: 'users'
      };

      await importFromCSV(mockReq, mockRes);

      expect(mockErrorResponse).toHaveBeenCalledWith(
        mockRes,
        'CSV data is required',
        'VALIDATION_ERROR',
        400
      );
    });

    test('should return validation error for missing import type', async () => {
      mockReq.body = {
        csvData: [{ username: 'test' }]
      };

      await importFromCSV(mockReq, mockRes);

      expect(mockErrorResponse).toHaveBeenCalledWith(
        mockRes,
        'Import type is required',
        'VALIDATION_ERROR',
        400
      );
    });
  });

  describe('getOperationStatus', () => {
    test('should get operation status successfully', async () => {
      const mockOperation = {
        id: 'bulk_123',
        type: 'approve_users',
        status: 'in_progress',
        progress: {
          current: 3,
          total: 5,
          percentage: 60
        },
        results: {
          success: 2,
          failed: 1,
          skipped: 0
        }
      };

      mockReq.params = { operationId: 'bulk_123' };
      mockBulkOperationsService.getOperationStatus.mockResolvedValue(mockOperation);

      await getOperationStatus(mockReq, mockRes);

      expect(mockBulkOperationsService.getOperationStatus).toHaveBeenCalledWith(
        'bulk_123',
        1,
        1
      );

      expect(mockSuccessResponse).toHaveBeenCalledWith(
        mockRes,
        { operation: mockOperation },
        'Operation status retrieved successfully'
      );
    });
  });

  describe('getActiveOperations', () => {
    test('should get active operations successfully', async () => {
      const mockOperations = [
        {
          id: 'bulk_123',
          type: 'approve_users',
          status: 'in_progress',
          progress: { current: 3, total: 5, percentage: 60 }
        },
        {
          id: 'bulk_456',
          type: 'import_visitors',
          status: 'queued',
          progress: { current: 0, total: 10, percentage: 0 }
        }
      ];

      mockBulkOperationsService.getActiveOperations.mockResolvedValue(mockOperations);

      await getActiveOperations(mockReq, mockRes);

      expect(mockBulkOperationsService.getActiveOperations).toHaveBeenCalledWith(1, 1);

      expect(mockSuccessResponse).toHaveBeenCalledWith(
        mockRes,
        { operations: mockOperations },
        'Active operations retrieved successfully'
      );
    });
  });

  describe('cancelOperation', () => {
    test('should cancel operation successfully', async () => {
      mockReq.params = { operationId: 'bulk_123' };
      mockBulkOperationsService.cancelOperation.mockResolvedValue(true);

      await cancelOperation(mockReq, mockRes);

      expect(mockBulkOperationsService.cancelOperation).toHaveBeenCalledWith(
        'bulk_123',
        1,
        1
      );

      expect(mockSuccessResponse).toHaveBeenCalledWith(
        mockRes,
        { cancelled: true },
        'Operation cancelled successfully'
      );
    });
  });

  describe('searchAndFilter', () => {
    test('should search and filter successfully', async () => {
      const mockResults = {
        items: [
          { id: 1, username: 'john_doe', email: 'john@test.com' },
          { id: 2, username: 'jane_smith', email: 'jane@test.com' }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          pages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      mockReq.params = { entityType: 'users' };
      mockReq.query = {
        search: 'john',
        filters: '{"role":"resident"}',
        sort: 'created_at',
        order: 'desc',
        page: '1',
        limit: '20'
      };

      mockBulkOperationsService.searchAndFilter.mockResolvedValue(mockResults);

      await searchAndFilter(mockReq, mockRes);

      expect(mockBulkOperationsService.searchAndFilter).toHaveBeenCalledWith({
        entityType: 'users',
        search: 'john',
        filters: { role: 'resident' },
        sort: 'created_at',
        order: 'desc',
        page: 1,
        limit: 20,
        estateId: 1
      });

      expect(mockSuccessResponse).toHaveBeenCalledWith(
        mockRes,
        mockResults,
        'Search results retrieved successfully'
      );
    });

    test('should handle invalid JSON filters gracefully', async () => {
      mockReq.params = { entityType: 'users' };
      mockReq.query = {
        filters: 'invalid-json'
      };

      await searchAndFilter(mockReq, mockRes);

      expect(mockErrorResponse).toHaveBeenCalledWith(
        mockRes,
        'Invalid filters format',
        'VALIDATION_ERROR',
        400
      );
    });
  });

  describe('createOperationTemplate', () => {
    test('should create operation template successfully', async () => {
      const mockTemplate = {
        id: 'template_123',
        name: 'Weekly User Approval',
        description: 'Approve pending users weekly',
        operationType: 'approve_users',
        createdAt: '2025-01-01T00:00:00.000Z'
      };

      mockReq.body = {
        name: 'Weekly User Approval',
        description: 'Approve pending users weekly',
        operationType: 'approve_users',
        defaultSettings: { batchSize: 50 },
        filters: { status: 'pending' },
        automationRules: { enabled: false }
      };

      mockBulkOperationsService.createOperationTemplate.mockResolvedValue(mockTemplate);

      await createOperationTemplate(mockReq, mockRes);

      expect(mockBulkOperationsService.createOperationTemplate).toHaveBeenCalledWith({
        name: 'Weekly User Approval',
        description: 'Approve pending users weekly',
        operationType: 'approve_users',
        defaultSettings: { batchSize: 50 },
        filters: { status: 'pending' },
        automationRules: { enabled: false },
        userId: 1,
        estateId: 1
      });

      expect(mockSuccessResponse).toHaveBeenCalledWith(
        mockRes,
        { template: mockTemplate },
        'Operation template created successfully',
        201
      );
    });
  });

  describe('executeFromTemplate', () => {
    test('should execute from template successfully', async () => {
      const mockResult = {
        operationId: 'bulk_789',
        templateId: 'template_123',
        status: 'started'
      };

      mockReq.params = { templateId: 'template_123' };
      mockReq.body = {
        overrides: { batchSize: 25 },
        itemIds: [1, 2, 3]
      };

      mockBulkOperationsService.executeFromTemplate.mockResolvedValue(mockResult);

      await executeFromTemplate(mockReq, mockRes);

      expect(mockBulkOperationsService.executeFromTemplate).toHaveBeenCalledWith({
        templateId: 'template_123',
        overrides: { batchSize: 25 },
        itemIds: [1, 2, 3],
        userId: 1,
        estateId: 1
      });

      expect(mockSuccessResponse).toHaveBeenCalledWith(
        mockRes,
        mockResult,
        'Template operation executed successfully'
      );
    });
  });

  describe('getOperationTemplates', () => {
    test('should get operation templates successfully', async () => {
      const mockTemplates = [
        {
          id: 'template_123',
          name: 'Weekly User Approval',
          operationType: 'approve_users'
        },
        {
          id: 'template_456',
          name: 'Daily Visitor Cleanup',
          operationType: 'delete_visitors'
        }
      ];

      mockBulkOperationsService.getOperationTemplates.mockResolvedValue(mockTemplates);

      await getOperationTemplates(mockReq, mockRes);

      expect(mockBulkOperationsService.getOperationTemplates).toHaveBeenCalledWith(1, 1);

      expect(mockSuccessResponse).toHaveBeenCalledWith(
        mockRes,
        { templates: mockTemplates },
        'Operation templates retrieved successfully'
      );
    });
  });

  describe('scheduleAutomatedOperation', () => {
    test('should schedule automated operation successfully', async () => {
      const mockAutomation = {
        automationId: 'auto_123',
        templateId: 'template_123',
        schedule: '0 9 * * 1',
        nextRun: '2025-01-06T09:00:00.000Z'
      };

      mockReq.body = {
        templateId: 'template_123',
        schedule: '0 9 * * 1',
        conditions: [{ field: 'count', operator: 'gte', value: 10 }],
        isActive: true
      };

      mockBulkOperationsService.scheduleAutomatedOperation.mockResolvedValue(mockAutomation);

      await scheduleAutomatedOperation(mockReq, mockRes);

      expect(mockBulkOperationsService.scheduleAutomatedOperation).toHaveBeenCalledWith({
        templateId: 'template_123',
        schedule: '0 9 * * 1',
        conditions: [{ field: 'count', operator: 'gte', value: 10 }],
        isActive: true,
        userId: 1,
        estateId: 1
      });

      expect(mockSuccessResponse).toHaveBeenCalledWith(
        mockRes,
        mockAutomation,
        'Automated operation scheduled successfully',
        201
      );
    });
  });

  describe('getCompletionReport', () => {
    test('should get completion report successfully', async () => {
      const mockReport = {
        operationId: 'bulk_123',
        summary: {
          total: 10,
          success: 8,
          failed: 2,
          skipped: 0,
          duration: 5000
        },
        details: {
          successItems: [1, 2, 3, 4, 5, 6, 7, 8],
          failedItems: [9, 10],
          skippedItems: []
        },
        recommendations: [
          {
            type: 'performance',
            message: 'Consider reducing batch size for better performance',
            priority: 'medium'
          }
        ],
        nextSteps: [
          'Review failed items and retry if necessary',
          'Update user notification preferences'
        ]
      };

      mockReq.params = { operationId: 'bulk_123' };
      mockBulkOperationsService.getCompletionReport.mockResolvedValue(mockReport);

      await getCompletionReport(mockReq, mockRes);

      expect(mockBulkOperationsService.getCompletionReport).toHaveBeenCalledWith(
        'bulk_123',
        1,
        1
      );

      expect(mockSuccessResponse).toHaveBeenCalledWith(
        mockRes,
        { report: mockReport },
        'Completion report retrieved successfully'
      );
    });
  });

  describe('Progress Callback Functionality', () => {
    test('should log progress updates during bulk operation', async () => {
      mockReq.body = {
        operationType: 'approve_users',
        itemIds: [1, 2, 3, 4, 5]
      };

      // Mock the service to call the progress callback
      mockBulkOperationsService.executeBulkOperation.mockImplementation(async (options) => {
        const { progressCallback } = options;
        
        // Simulate progress updates
        progressCallback({
          operationId: 'bulk_123',
          current: 2,
          total: 5,
          percentage: 40
        });

        progressCallback({
          operationId: 'bulk_123',
          current: 5,
          total: 5,
          percentage: 100
        });

        return {
          operationId: 'bulk_123',
          status: 'completed'
        };
      });

      await executeBulkOperation(mockReq, mockRes);

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Bulk operation progress',
        {
          operationId: 'bulk_123',
          current: 2,
          total: 5,
          percentage: 40
        }
      );

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Bulk operation progress',
        {
          operationId: 'bulk_123',
          current: 5,
          total: 5,
          percentage: 100
        }
      );
    });
  });
});