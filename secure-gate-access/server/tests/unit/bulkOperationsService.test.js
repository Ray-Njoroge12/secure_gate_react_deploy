/**
 * @fileoverview Unit Tests for Bulk Operations Service - Task 13.5
 * @description Tests for bulk operations service including execution, templates, and data management
 */

import { jest } from '@jest/globals';

// Mock database manager
const mockDbManager = {
  query: jest.fn(),
  transaction: jest.fn()
};

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

// Mock logging service
const mockLoggingService = {
  logInfo: jest.fn(),
  logError: jest.fn(),
  logAudit: jest.fn()
};

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  loggingService: mockLoggingService
}));

// Mock user service
const mockUserService = {
  updateUserStatus: jest.fn(),
  deleteUser: jest.fn()
};

jest.unstable_mockModule('../../src/services/userService.js', () => ({
  default: mockUserService
}));

// Mock visitor service
const mockVisitorService = {
  updateVisitorStatus: jest.fn(),
  deleteVisitor: jest.fn()
};

jest.unstable_mockModule('../../src/services/visitorService.js', () => ({
  default: mockVisitorService
}));

// Mock notification service
const mockNotificationService = {
  sendBulkNotifications: jest.fn()
};

jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
  default: mockNotificationService
}));

// Import the service after mocking dependencies
const { default: bulkOperationsService } = await import('../../src/services/bulkOperationsService.js');

describe('Bulk Operations Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeBulkOperation', () => {
    test('should execute approve_users operation successfully', async () => {
      const options = {
        operationType: 'approve_users',
        itemIds: [1, 2, 3],
        userId: 1,
        estateId: 1,
        batchSize: 50,
        progressCallback: jest.fn()
      };

      // Mock successful user updates
      mockUserService.updateUserStatus
        .mockResolvedValueOnce({ success: true, user: { id: 1 } })
        .mockResolvedValueOnce({ success: true, user: { id: 2 } })
        .mockResolvedValueOnce({ success: true, user: { id: 3 } });

      const result = await bulkOperationsService.executeBulkOperation(options);

      expect(result).toMatchObject({
        operationId: expect.stringMatching(/^bulk_\d+_[a-f0-9]+$/),
        type: 'approve_users',
        status: 'completed',
        results: {
          total: 3,
          success: 3,
          failed: 0,
          skipped: 0
        }
      });

      expect(mockUserService.updateUserStatus).toHaveBeenCalledTimes(3);
      expect(options.progressCallback).toHaveBeenCalled();
    });

    test('should handle partial failures in bulk operation', async () => {
      const options = {
        operationType: 'approve_users',
        itemIds: [1, 2, 3],
        userId: 1,
        estateId: 1,
        progressCallback: jest.fn()
      };

      // Mock mixed success/failure results
      mockUserService.updateUserStatus
        .mockResolvedValueOnce({ success: true, user: { id: 1 } })
        .mockRejectedValueOnce(new Error('User not found'))
        .mockResolvedValueOnce({ success: true, user: { id: 3 } });

      const result = await bulkOperationsService.executeBulkOperation(options);

      expect(result.results).toMatchObject({
        total: 3,
        success: 2,
        failed: 1,
        skipped: 0
      });

      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Bulk operation item failed',
        expect.any(Error),
        expect.objectContaining({
          operationId: expect.any(String),
          itemId: 2
        })
      );
    });

    test('should process items in batches', async () => {
      const options = {
        operationType: 'approve_users',
        itemIds: [1, 2, 3, 4, 5],
        userId: 1,
        estateId: 1,
        batchSize: 2,
        progressCallback: jest.fn()
      };

      mockUserService.updateUserStatus.mockResolvedValue({ success: true });

      await bulkOperationsService.executeBulkOperation(options);

      // Should be called 5 times (one for each item)
      expect(mockUserService.updateUserStatus).toHaveBeenCalledTimes(5);
      
      // Progress callback should be called multiple times (once per batch + completion)
      expect(options.progressCallback).toHaveBeenCalledTimes(4); // 3 batches + final
    });

    test('should handle visitor operations', async () => {
      const options = {
        operationType: 'approve_visitors',
        itemIds: [1, 2],
        userId: 1,
        estateId: 1,
        progressCallback: jest.fn()
      };

      mockVisitorService.updateVisitorStatus.mockResolvedValue({ success: true });

      const result = await bulkOperationsService.executeBulkOperation(options);

      expect(result.type).toBe('approve_visitors');
      expect(mockVisitorService.updateVisitorStatus).toHaveBeenCalledTimes(2);
    });

    test('should handle notification operations', async () => {
      const options = {
        operationType: 'send_notifications',
        itemIds: [1, 2, 3],
        data: {
          title: 'Test Notification',
          message: 'Test message',
          channels: ['email', 'sms']
        },
        userId: 1,
        estateId: 1,
        progressCallback: jest.fn()
      };

      mockNotificationService.sendBulkNotifications.mockResolvedValue({
        success: 3,
        failed: 0
      });

      const result = await bulkOperationsService.executeBulkOperation(options);

      expect(result.type).toBe('send_notifications');
      expect(mockNotificationService.sendBulkNotifications).toHaveBeenCalledWith({
        userIds: [1, 2, 3],
        title: 'Test Notification',
        message: 'Test message',
        channels: ['email', 'sms'],
        estateId: 1
      });
    });

    test('should throw error for unsupported operation type', async () => {
      const options = {
        operationType: 'unsupported_operation',
        itemIds: [1, 2, 3],
        userId: 1,
        estateId: 1
      };

      await expect(bulkOperationsService.executeBulkOperation(options))
        .rejects.toThrow('Unsupported operation type: unsupported_operation');
    });
  });

  describe('importFromCSV', () => {
    test('should import users from CSV successfully', async () => {
      const csvData = [
        { username: 'user1', email: 'user1@test.com', role: 'resident', phone: '+254712345678' },
        { username: 'user2', email: 'user2@test.com', role: 'resident', phone: '+254712345679' }
      ];

      const progressCallback = jest.fn();

      // Mock successful user creation
      mockDbManager.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing users
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Insert user 1
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }); // Insert user 2

      const result = await bulkOperationsService.importFromCSV(
        csvData,
        'users',
        1,
        1,
        progressCallback
      );

      expect(result).toMatchObject({
        operationId: expect.stringMatching(/^import_\d+_[a-f0-9]+$/),
        type: 'users',
        status: 'completed',
        results: {
          total: 2,
          success: 2,
          failed: 0,
          skipped: 0
        }
      });

      expect(progressCallback).toHaveBeenCalled();
    });

    test('should validate CSV data and skip invalid entries', async () => {
      const csvData = [
        { username: 'user1', email: 'user1@test.com', role: 'resident' }, // Valid
        { username: '', email: 'user2@test.com', role: 'resident' }, // Invalid: empty username
        { username: 'user3', email: 'invalid-email', role: 'resident' }, // Invalid: bad email
        { username: 'user4', email: 'user4@test.com', role: 'invalid_role' } // Invalid: bad role
      ];

      const progressCallback = jest.fn();

      mockDbManager.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing users
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert valid user

      const result = await bulkOperationsService.importFromCSV(
        csvData,
        'users',
        1,
        1,
        progressCallback
      );

      expect(result.results).toMatchObject({
        total: 4,
        success: 1,
        failed: 3,
        skipped: 0
      });
    });

    test('should handle duplicate entries', async () => {
      const csvData = [
        { username: 'user1', email: 'user1@test.com', role: 'resident' },
        { username: 'user2', email: 'user2@test.com', role: 'resident' }
      ];

      const progressCallback = jest.fn();

      // Mock existing user check
      mockDbManager.query
        .mockResolvedValueOnce({ rows: [{ email: 'user1@test.com' }] }) // user1 exists
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }); // Insert user2

      const result = await bulkOperationsService.importFromCSV(
        csvData,
        'users',
        1,
        1,
        progressCallback
      );

      expect(result.results).toMatchObject({
        total: 2,
        success: 1,
        failed: 0,
        skipped: 1
      });
    });

    test('should import visitors from CSV', async () => {
      const csvData = [
        {
          name: 'John Doe',
          phone: '+254712345678',
          email: 'john@test.com',
          purpose: 'Meeting',
          date_of_visit: '2025-01-15'
        }
      ];

      const progressCallback = jest.fn();

      mockDbManager.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing visitors
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert visitor

      const result = await bulkOperationsService.importFromCSV(
        csvData,
        'visitors',
        1,
        1,
        progressCallback
      );

      expect(result.type).toBe('visitors');
      expect(result.results.success).toBe(1);
    });
  });

  describe('searchAndFilter', () => {
    test('should search users with filters and pagination', async () => {
      const options = {
        entityType: 'users',
        search: 'john',
        filters: { role: 'resident', status: 'active' },
        sort: 'created_at',
        order: 'desc',
        page: 1,
        limit: 20,
        estateId: 1
      };

      const mockUsers = [
        { id: 1, username: 'john_doe', email: 'john@test.com', role: 'resident' },
        { id: 2, username: 'john_smith', email: 'johnsmith@test.com', role: 'resident' }
      ];

      mockDbManager.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockUsers }); // Data query

      const result = await bulkOperationsService.searchAndFilter(options);

      expect(result).toMatchObject({
        items: mockUsers,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          pages: 1,
          hasNext: false,
          hasPrev: false
        }
      });

      expect(mockDbManager.query).toHaveBeenCalledTimes(2);
    });

    test('should handle empty search results', async () => {
      const options = {
        entityType: 'users',
        search: 'nonexistent',
        estateId: 1
      };

      mockDbManager.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await bulkOperationsService.searchAndFilter(options);

      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    test('should search visitors with date range filters', async () => {
      const options = {
        entityType: 'visitors',
        filters: {
          date_of_visit: {
            gte: '2025-01-01',
            lte: '2025-01-31'
          }
        },
        estateId: 1
      };

      mockDbManager.query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      await bulkOperationsService.searchAndFilter(options);

      // Verify that date range filters are properly applied
      const countQuery = mockDbManager.query.mock.calls[0][0];
      expect(countQuery).toContain('date_of_visit >=');
      expect(countQuery).toContain('date_of_visit <=');
    });
  });

  describe('createOperationTemplate', () => {
    test('should create operation template successfully', async () => {
      const templateData = {
        name: 'Weekly User Approval',
        description: 'Approve pending users weekly',
        operationType: 'approve_users',
        defaultSettings: { batchSize: 50 },
        filters: { status: 'pending' },
        automationRules: { enabled: false },
        userId: 1,
        estateId: 1
      };

      const mockTemplate = {
        id: 'template_123',
        ...templateData,
        createdAt: '2025-01-01T00:00:00.000Z'
      };

      mockDbManager.query.mockResolvedValueOnce({ rows: [mockTemplate] });

      const result = await bulkOperationsService.createOperationTemplate(templateData);

      expect(result).toEqual(mockTemplate);
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO bulk_operation_templates'),
        expect.arrayContaining([
          templateData.name,
          templateData.description,
          templateData.operationType
        ])
      );
    });

    test('should validate template data', async () => {
      const invalidTemplateData = {
        name: '', // Invalid: empty name
        operationType: 'approve_users',
        userId: 1,
        estateId: 1
      };

      await expect(bulkOperationsService.createOperationTemplate(invalidTemplateData))
        .rejects.toThrow('Template name is required');
    });
  });

  describe('executeFromTemplate', () => {
    test('should execute operation from template', async () => {
      const options = {
        templateId: 'template_123',
        overrides: { batchSize: 25 },
        userId: 1,
        estateId: 1
      };

      const mockTemplate = {
        id: 'template_123',
        operationType: 'approve_users',
        defaultSettings: { batchSize: 50 },
        filters: { status: 'pending' }
      };

      const mockUsers = [
        { id: 1 }, { id: 2 }, { id: 3 }
      ];

      mockDbManager.query
        .mockResolvedValueOnce({ rows: [mockTemplate] }) // Get template
        .mockResolvedValueOnce({ rows: mockUsers }); // Get matching items

      mockUserService.updateUserStatus.mockResolvedValue({ success: true });

      const result = await bulkOperationsService.executeFromTemplate(options);

      expect(result).toMatchObject({
        operationId: expect.any(String),
        templateId: 'template_123',
        status: expect.any(String)
      });

      expect(mockUserService.updateUserStatus).toHaveBeenCalledTimes(3);
    });

    test('should apply template overrides', async () => {
      const options = {
        templateId: 'template_123',
        overrides: { 
          batchSize: 10,
          filters: { role: 'resident' }
        },
        userId: 1,
        estateId: 1
      };

      const mockTemplate = {
        id: 'template_123',
        operationType: 'approve_users',
        defaultSettings: { batchSize: 50 },
        filters: { status: 'pending' }
      };

      mockDbManager.query
        .mockResolvedValueOnce({ rows: [mockTemplate] })
        .mockResolvedValueOnce({ rows: [] });

      await bulkOperationsService.executeFromTemplate(options);

      // Verify that overrides were applied in the query
      const itemQuery = mockDbManager.query.mock.calls[1][0];
      expect(itemQuery).toContain('role =');
    });
  });

  describe('getOperationTemplates', () => {
    test('should get operation templates for estate', async () => {
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

      mockDbManager.query.mockResolvedValueOnce({ rows: mockTemplates });

      const result = await bulkOperationsService.getOperationTemplates(1, 1);

      expect(result).toEqual(mockTemplates);
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM bulk_operation_templates'),
        [1]
      );
    });
  });

  describe('scheduleAutomatedOperation', () => {
    test('should schedule automated operation', async () => {
      const options = {
        templateId: 'template_123',
        schedule: '0 9 * * 1',
        conditions: [{ field: 'count', operator: 'gte', value: 10 }],
        isActive: true,
        userId: 1,
        estateId: 1
      };

      const mockAutomation = {
        automationId: 'auto_123',
        templateId: 'template_123',
        schedule: '0 9 * * 1',
        nextRun: '2025-01-06T09:00:00.000Z'
      };

      mockDbManager.query.mockResolvedValueOnce({ rows: [mockAutomation] });

      const result = await bulkOperationsService.scheduleAutomatedOperation(options);

      expect(result).toEqual(mockAutomation);
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO automated_operations'),
        expect.arrayContaining([
          options.templateId,
          options.schedule,
          JSON.stringify(options.conditions)
        ])
      );
    });

    test('should validate cron expression', async () => {
      const options = {
        templateId: 'template_123',
        schedule: 'invalid-cron',
        userId: 1,
        estateId: 1
      };

      await expect(bulkOperationsService.scheduleAutomatedOperation(options))
        .rejects.toThrow('Invalid cron expression');
    });
  });

  describe('getCompletionReport', () => {
    test('should generate completion report with recommendations', async () => {
      const operationId = 'bulk_123';

      const mockOperation = {
        id: 'bulk_123',
        type: 'approve_users',
        status: 'completed',
        results: {
          total: 10,
          success: 8,
          failed: 2,
          skipped: 0
        },
        duration: 5000,
        created_at: '2025-01-01T00:00:00.000Z'
      };

      const mockDetails = {
        successItems: [1, 2, 3, 4, 5, 6, 7, 8],
        failedItems: [9, 10],
        skippedItems: []
      };

      mockDbManager.query
        .mockResolvedValueOnce({ rows: [mockOperation] }) // Get operation
        .mockResolvedValueOnce({ rows: mockDetails.successItems.map(id => ({ item_id: id, status: 'success' })) }) // Get details
        .mockResolvedValueOnce({ rows: mockDetails.failedItems.map(id => ({ item_id: id, status: 'failed' })) });

      const result = await bulkOperationsService.getCompletionReport(operationId, 1, 1);

      expect(result).toMatchObject({
        operationId: 'bulk_123',
        summary: {
          total: 10,
          success: 8,
          failed: 2,
          skipped: 0,
          duration: 5000
        },
        details: expect.objectContaining({
          successItems: expect.any(Array),
          failedItems: expect.any(Array)
        }),
        recommendations: expect.any(Array),
        nextSteps: expect.any(Array)
      });

      expect(result.recommendations).toContainEqual(
        expect.objectContaining({
          type: 'performance',
          priority: expect.any(String)
        })
      );
    });

    test('should include performance recommendations for slow operations', async () => {
      const mockOperation = {
        id: 'bulk_123',
        type: 'approve_users',
        status: 'completed',
        results: { total: 100, success: 100, failed: 0, skipped: 0 },
        duration: 30000, // 30 seconds - slow operation
        created_at: '2025-01-01T00:00:00.000Z'
      };

      mockDbManager.query
        .mockResolvedValueOnce({ rows: [mockOperation] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await bulkOperationsService.getCompletionReport('bulk_123', 1, 1);

      expect(result.recommendations).toContainEqual(
        expect.objectContaining({
          type: 'performance',
          message: expect.stringContaining('slow'),
          priority: 'high'
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      const options = {
        operationType: 'approve_users',
        itemIds: [1, 2, 3],
        userId: 1,
        estateId: 1
      };

      mockUserService.updateUserStatus.mockRejectedValue(new Error('Database connection failed'));

      const result = await bulkOperationsService.executeBulkOperation(options);

      expect(result.status).toBe('completed');
      expect(result.results.failed).toBe(3);
      expect(mockLoggingService.logError).toHaveBeenCalledTimes(3);
    });

    test('should validate operation parameters', async () => {
      const invalidOptions = {
        operationType: 'approve_users',
        itemIds: [], // Empty array
        userId: 1,
        estateId: 1
      };

      await expect(bulkOperationsService.executeBulkOperation(invalidOptions))
        .rejects.toThrow('Item IDs are required');
    });
  });
});