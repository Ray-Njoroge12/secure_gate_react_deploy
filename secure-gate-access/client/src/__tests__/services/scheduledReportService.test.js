/**
 * Unit tests for Scheduled Report Service
 * Tests scheduled report generation, delivery, and notification systems
 */

import scheduledReportService from '../../services/scheduledReportService';
import exportService from '../../services/exportService';

// Mock dependencies
jest.mock('../../services/exportService');

describe('ScheduledReportService', () => {
  beforeEach(() => {
    // Reset service state
    scheduledReportService.scheduledReports.clear();
    scheduledReportService.deliveryHistory = [];
    scheduledReportService.complianceAudits = [];
    scheduledReportService.executionQueue = [];
    scheduledReportService.isProcessing = false;
    
    jest.clearAllMocks();
    
    // Mock export service
    exportService.exportData.mockResolvedValue(new Blob(['test data'], { type: 'text/csv' }));
  });

  describe('scheduleReport', () => {
    const mockReportConfig = {
      name: 'Daily Visitor Report',
      description: 'Daily summary of visitor activities',
      schedule: {
        frequency: 'daily',
        hour: 9,
        minute: 0,
        timezone: 'UTC'
      },
      reportConfig: {
        dataSource: 'visitors',
        format: 'excel',
        fields: ['name', 'email', 'status', 'createdAt'],
        filters: [],
        sorting: { field: 'createdAt', direction: 'desc' }
      },
      deliveryChannels: [
        { type: 'email', recipient: 'admin@example.com' }
      ],
      compliance: {
        includeAuditTrail: true,
        dataLineage: true,
        retentionPeriod: 90,
        encryptionRequired: true
      },
      createdBy: 'user123'
    };

    test('should schedule a new report', () => {
      const reportId = scheduledReportService.scheduleReport(mockReportConfig);

      expect(reportId).toMatch(/^report_\d+_[a-z0-9]+$/);
      expect(scheduledReportService.scheduledReports.has(reportId)).toBe(true);

      const scheduledReport = scheduledReportService.scheduledReports.get(reportId);
      expect(scheduledReport).toMatchObject({
        id: reportId,
        name: mockReportConfig.name,
        description: mockReportConfig.description,
        status: 'scheduled',
        createdBy: 'user123'
      });
    });

    test('should calculate next run time correctly', () => {
      const reportId = scheduledReportService.scheduleReport(mockReportConfig);
      const scheduledReport = scheduledReportService.scheduledReports.get(reportId);

      expect(scheduledReport.nextRun).toBeDefined();
      expect(new Date(scheduledReport.nextRun)).toBeInstanceOf(Date);
    });

    test('should log compliance audit for scheduling', () => {
      scheduledReportService.scheduleReport(mockReportConfig);

      expect(scheduledReportService.complianceAudits).toHaveLength(1);
      expect(scheduledReportService.complianceAudits[0]).toMatchObject({
        action: 'report_scheduled',
        userId: 'user123'
      });
    });

    test('should handle default values', () => {
      const minimalConfig = {
        name: 'Test Report',
        schedule: { frequency: 'daily' },
        reportConfig: { dataSource: 'visitors' },
        createdBy: 'user123'
      };

      const reportId = scheduledReportService.scheduleReport(minimalConfig);
      const scheduledReport = scheduledReportService.scheduledReports.get(reportId);

      expect(scheduledReport.schedule.hour).toBe(9);
      expect(scheduledReport.schedule.minute).toBe(0);
      expect(scheduledReport.reportConfig.format).toBe('excel');
      expect(scheduledReport.deliveryChannels).toEqual([]);
    });
  });

  describe('calculateNextRun', () => {
    test('should calculate daily schedule correctly', () => {
      const schedule = { frequency: 'daily', hour: 10, minute: 30 };
      const nextRun = scheduledReportService.calculateNextRun(schedule);
      const nextRunDate = new Date(nextRun);

      expect(nextRunDate.getHours()).toBe(10);
      expect(nextRunDate.getMinutes()).toBe(30);
    });

    test('should calculate weekly schedule correctly', () => {
      const schedule = { frequency: 'weekly', dayOfWeek: 1, hour: 9, minute: 0 }; // Monday
      const nextRun = scheduledReportService.calculateNextRun(schedule);
      const nextRunDate = new Date(nextRun);

      expect(nextRunDate.getDay()).toBe(1); // Monday
      expect(nextRunDate.getHours()).toBe(9);
      expect(nextRunDate.getMinutes()).toBe(0);
    });

    test('should calculate monthly schedule correctly', () => {
      const schedule = { frequency: 'monthly', dayOfMonth: 15, hour: 12, minute: 0 };
      const nextRun = scheduledReportService.calculateNextRun(schedule);
      const nextRunDate = new Date(nextRun);

      expect(nextRunDate.getDate()).toBe(15);
      expect(nextRunDate.getHours()).toBe(12);
      expect(nextRunDate.getMinutes()).toBe(0);
    });

    test('should handle default values', () => {
      const schedule = { frequency: 'daily' };
      const nextRun = scheduledReportService.calculateNextRun(schedule);
      const nextRunDate = new Date(nextRun);

      expect(nextRunDate.getHours()).toBe(9);
      expect(nextRunDate.getMinutes()).toBe(0);
    });
  });

  describe('executeScheduledReports', () => {
    test('should execute due reports', async () => {
      const config = {
        name: 'Test Report',
        schedule: { frequency: 'daily', hour: 9, minute: 0 },
        reportConfig: { dataSource: 'visitors', fields: ['name'] },
        deliveryChannels: [],
        createdBy: 'user123'
      };

      const reportId = scheduledReportService.scheduleReport(config);
      
      // Set next run to past time to make it due
      const report = scheduledReportService.scheduledReports.get(reportId);
      report.nextRun = new Date(Date.now() - 1000).toISOString();

      const results = await scheduledReportService.executeScheduledReports();

      expect(results).toHaveLength(1);
      expect(results[0].reportId).toBe(reportId);
      expect(results[0].status).toBe('completed');
    });

    test('should not execute reports that are not due', async () => {
      const config = {
        name: 'Future Report',
        schedule: { frequency: 'daily', hour: 23, minute: 59 },
        reportConfig: { dataSource: 'visitors', fields: ['name'] },
        deliveryChannels: [],
        createdBy: 'user123'
      };

      scheduledReportService.scheduleReport(config);

      const results = await scheduledReportService.executeScheduledReports();

      expect(results).toHaveLength(0);
    });

    test('should handle execution errors', async () => {
      exportService.exportData.mockRejectedValue(new Error('Export failed'));

      const config = {
        name: 'Error Report',
        schedule: { frequency: 'daily', hour: 9, minute: 0 },
        reportConfig: { dataSource: 'visitors', fields: ['name'] },
        deliveryChannels: [],
        createdBy: 'user123'
      };

      const reportId = scheduledReportService.scheduleReport(config);
      
      // Set next run to past time
      const report = scheduledReportService.scheduledReports.get(reportId);
      report.nextRun = new Date(Date.now() - 1000).toISOString();

      const results = await scheduledReportService.executeScheduledReports();

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('failed');
      expect(results[0].error).toBe('Export failed');
    });

    test('should prevent concurrent execution', async () => {
      scheduledReportService.isProcessing = true;

      const results = await scheduledReportService.executeScheduledReports();

      expect(results).toEqual([]);
    });
  });

  describe('executeReport', () => {
    test('should execute single report successfully', async () => {
      const mockReport = {
        id: 'test-report-1',
        name: 'Test Report',
        reportConfig: {
          dataSource: 'visitors',
          format: 'csv',
          fields: ['name', 'email']
        },
        deliveryChannels: [],
        compliance: {
          includeAuditTrail: true,
          dataLineage: true,
          retentionPeriod: 90
        },
        schedule: { frequency: 'daily', hour: 9 },
        runCount: 0,
        failureCount: 0
      };

      const result = await scheduledReportService.executeReport(mockReport);

      expect(result.status).toBe('completed');
      expect(result.reportId).toBe('test-report-1');
      expect(result.startTime).toBeDefined();
      expect(result.endTime).toBeDefined();
      expect(exportService.exportData).toHaveBeenCalled();
    });

    test('should create audit trail', async () => {
      const mockReport = {
        id: 'test-report-2',
        name: 'Audit Test Report',
        reportConfig: {
          dataSource: 'visitors',
          format: 'excel',
          fields: ['name', 'status']
        },
        deliveryChannels: [],
        compliance: {
          includeAuditTrail: true,
          dataLineage: true,
          retentionPeriod: 90
        },
        schedule: { frequency: 'daily', hour: 9 },
        runCount: 0,
        failureCount: 0
      };

      const result = await scheduledReportService.executeReport(mockReport);

      expect(result.auditTrail).toBeDefined();
      expect(result.auditTrail.reportId).toBe('test-report-2');
      expect(result.auditTrail.dataLineage).toBeDefined();
      expect(result.auditTrail.compliance).toBeDefined();
    });

    test('should handle execution failure', async () => {
      exportService.exportData.mockRejectedValue(new Error('Generation failed'));

      const mockReport = {
        id: 'test-report-fail',
        name: 'Failing Report',
        reportConfig: {
          dataSource: 'visitors',
          format: 'pdf',
          fields: ['name']
        },
        deliveryChannels: [],
        compliance: { includeAuditTrail: true },
        schedule: { frequency: 'daily', hour: 9 },
        runCount: 0,
        failureCount: 0
      };

      await expect(scheduledReportService.executeReport(mockReport)).rejects.toThrow('Generation failed');

      // Should log compliance audit for failure
      const failureAudit = scheduledReportService.complianceAudits.find(
        audit => audit.action === 'report_execution_failed'
      );
      expect(failureAudit).toBeDefined();
    });
  });

  describe('generateReportData', () => {
    test('should generate mock data based on fields', async () => {
      const mockReport = {
        reportConfig: {
          dataSource: 'visitors',
          fields: ['id', 'name', 'email', 'status', 'createdAt'],
          filters: [],
          sorting: {}
        }
      };

      const data = await scheduledReportService.generateReportData(mockReport);

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      
      if (data.length > 0) {
        const firstRecord = data[0];
        expect(firstRecord).toHaveProperty('id');
        expect(firstRecord).toHaveProperty('name');
        expect(firstRecord).toHaveProperty('email');
        expect(firstRecord).toHaveProperty('status');
        expect(firstRecord).toHaveProperty('createdAt');
      }
    });

    test('should generate variable amount of data', async () => {
      const mockReport = {
        reportConfig: {
          dataSource: 'visitors',
          fields: ['name'],
          filters: [],
          sorting: {}
        }
      };

      const data = await scheduledReportService.generateReportData(mockReport);

      expect(data.length).toBeGreaterThanOrEqual(10);
      expect(data.length).toBeLessThanOrEqual(109);
    });
  });

  describe('createAuditTrail', () => {
    test('should create comprehensive audit trail', () => {
      const mockReport = {
        id: 'audit-test',
        reportConfig: {
          dataSource: 'visitors',
          fields: ['name', 'email'],
          filters: [{ field: 'status', operator: 'equals', value: 'active' }],
          template: 'standard'
        },
        compliance: {
          retentionPeriod: 90,
          encryptionRequired: true,
          accessControls: ['admin', 'manager']
        },
        deliveryChannels: [
          { type: 'email', recipient: 'admin@example.com' }
        ]
      };

      const mockExecution = {
        executionId: 'exec-123',
        startTime: '2025-01-01T09:00:00.000Z'
      };

      const mockData = [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Smith', email: 'jane@example.com' }
      ];

      const auditTrail = scheduledReportService.createAuditTrail(mockReport, mockExecution, mockData);

      expect(auditTrail.reportId).toBe('audit-test');
      expect(auditTrail.executionId).toBe('exec-123');
      expect(auditTrail.dataLineage.recordCount).toBe(2);
      expect(auditTrail.compliance.retentionPeriod).toBe(90);
      expect(auditTrail.distribution.channels).toHaveLength(1);
    });
  });

  describe('deliverReport', () => {
    test('should deliver to all configured channels', async () => {
      const mockReport = {
        id: 'delivery-test',
        name: 'Delivery Test Report',
        deliveryChannels: [
          { type: 'email', recipient: 'user1@example.com' },
          { type: 'download', recipient: 'user2@example.com' }
        ]
      };

      const mockExecution = { executionId: 'exec-delivery' };
      const mockBlob = new Blob(['test'], { type: 'text/csv' });
      const mockAuditTrail = {
        distribution: {
          channels: [
            { type: 'email', recipient: 'user1@example.com', deliveryStatus: 'pending' },
            { type: 'download', recipient: 'user2@example.com', deliveryStatus: 'pending' }
          ]
        }
      };

      const results = await scheduledReportService.deliverReport(
        mockReport, 
        mockExecution, 
        mockBlob, 
        mockAuditTrail
      );

      expect(results).toHaveLength(2);
      expect(results[0].channel).toBe('email');
      expect(results[1].channel).toBe('download');
      expect(scheduledReportService.deliveryHistory).toHaveLength(2);
    });

    test('should handle delivery failures', async () => {
      // Mock Math.random to force failure
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.01); // Force failure

      const mockReport = {
        id: 'failure-test',
        name: 'Failure Test Report',
        deliveryChannels: [
          { type: 'email', recipient: 'fail@example.com' }
        ]
      };

      const mockExecution = { executionId: 'exec-fail' };
      const mockBlob = new Blob(['test'], { type: 'text/csv' });
      const mockAuditTrail = {
        distribution: {
          channels: [
            { type: 'email', recipient: 'fail@example.com', deliveryStatus: 'pending' }
          ]
        }
      };

      const results = await scheduledReportService.deliverReport(
        mockReport, 
        mockExecution, 
        mockBlob, 
        mockAuditTrail
      );

      expect(results[0].status).toBe('failed');
      expect(results[0].error).toBe('Email delivery failed');

      // Restore Math.random
      Math.random = originalRandom;
    });
  });

  describe('deliverViaEmail', () => {
    test('should deliver report via email successfully', async () => {
      const mockReport = { name: 'Email Test Report' };
      const mockExecution = { executionId: 'exec-email' };
      const mockBlob = new Blob(['test'], { type: 'text/csv' });
      const mockChannel = { type: 'email', recipient: 'test@example.com' };
      const mockAuditTrail = {
        dataLineage: { recordCount: 10 },
        compliance: { regulatoryFramework: ['GDPR'], dataClassification: 'internal' }
      };

      const result = await scheduledReportService.deliverViaEmail(
        mockReport, 
        mockExecution, 
        mockBlob, 
        mockChannel, 
        mockAuditTrail
      );

      expect(result.channel).toBe('email');
      expect(result.recipient).toBe('test@example.com');
      expect(result.status).toBe('delivered');
      expect(result.messageId).toMatch(/^msg_\d+_[a-z0-9]+$/);
    });
  });

  describe('deliverViaSecureDownload', () => {
    test('should create secure download link', async () => {
      const mockReport = { name: 'Download Test Report' };
      const mockExecution = { executionId: 'exec-download' };
      const mockBlob = new Blob(['test'], { type: 'text/csv' });
      const mockChannel = { type: 'download', recipient: 'download@example.com' };
      const mockAuditTrail = {
        dataLineage: { recordCount: 5 },
        compliance: { regulatoryFramework: ['KDPA'] }
      };

      const result = await scheduledReportService.deliverViaSecureDownload(
        mockReport, 
        mockExecution, 
        mockBlob, 
        mockChannel, 
        mockAuditTrail
      );

      expect(result.channel).toBe('download');
      expect(result.recipient).toBe('download@example.com');
      expect(result.status).toBe('ready');
      expect(result.downloadUrl).toMatch(/^https:\/\/secure-downloads\.secure-gate\.app\//);
      expect(result.downloadToken).toMatch(/^dl_\d+_[a-z0-9]+$/);
      expect(result.expiresAt).toBeDefined();
    });
  });

  describe('Service Management', () => {
    test('should get scheduled report by ID', () => {
      const config = {
        name: 'Get Test Report',
        schedule: { frequency: 'daily' },
        reportConfig: { dataSource: 'visitors' },
        createdBy: 'user123'
      };

      const reportId = scheduledReportService.scheduleReport(config);
      const retrieved = scheduledReportService.getScheduledReport(reportId);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(reportId);
      expect(retrieved.name).toBe('Get Test Report');
    });

    test('should get all scheduled reports', () => {
      const config1 = {
        name: 'Report 1',
        schedule: { frequency: 'daily' },
        reportConfig: { dataSource: 'visitors' },
        createdBy: 'user123'
      };

      const config2 = {
        name: 'Report 2',
        schedule: { frequency: 'weekly' },
        reportConfig: { dataSource: 'users' },
        createdBy: 'user456'
      };

      scheduledReportService.scheduleReport(config1);
      scheduledReportService.scheduleReport(config2);

      const allReports = scheduledReportService.getAllScheduledReports();

      expect(allReports).toHaveLength(2);
      expect(allReports.map(r => r.name)).toContain('Report 1');
      expect(allReports.map(r => r.name)).toContain('Report 2');
    });

    test('should delete scheduled report', () => {
      const config = {
        name: 'Delete Test Report',
        schedule: { frequency: 'daily' },
        reportConfig: { dataSource: 'visitors' },
        createdBy: 'user123'
      };

      const reportId = scheduledReportService.scheduleReport(config);
      const deleted = scheduledReportService.deleteScheduledReport(reportId, 'admin');

      expect(deleted).toBe(true);
      expect(scheduledReportService.getScheduledReport(reportId)).toBeUndefined();
      
      // Should log compliance audit
      const deleteAudit = scheduledReportService.complianceAudits.find(
        audit => audit.action === 'report_deleted'
      );
      expect(deleteAudit).toBeDefined();
    });

    test('should update scheduled report', () => {
      const config = {
        name: 'Update Test Report',
        schedule: { frequency: 'daily', hour: 9 },
        reportConfig: { dataSource: 'visitors' },
        createdBy: 'user123'
      };

      const reportId = scheduledReportService.scheduleReport(config);
      const updates = {
        name: 'Updated Report Name',
        schedule: { frequency: 'weekly', hour: 10, dayOfWeek: 1 }
      };

      const updated = scheduledReportService.updateScheduledReport(reportId, updates, 'admin');

      expect(updated).toBeDefined();
      expect(updated.name).toBe('Updated Report Name');
      expect(updated.schedule.frequency).toBe('weekly');
      expect(updated.updatedBy).toBe('admin');
      
      // Should recalculate next run
      expect(updated.nextRun).toBeDefined();
      
      // Should log compliance audit
      const updateAudit = scheduledReportService.complianceAudits.find(
        audit => audit.action === 'report_updated'
      );
      expect(updateAudit).toBeDefined();
    });
  });

  describe('Compliance and Audit', () => {
    test('should log compliance audit events', () => {
      const auditEvent = {
        action: 'test_action',
        reportId: 'test-report',
        userId: 'test-user',
        details: { test: 'data' }
      };

      scheduledReportService.logComplianceAudit(auditEvent);

      expect(scheduledReportService.complianceAudits).toHaveLength(1);
      const audit = scheduledReportService.complianceAudits[0];
      
      expect(audit.action).toBe('test_action');
      expect(audit.reportId).toBe('test-report');
      expect(audit.userId).toBe('test-user');
      expect(audit.complianceFramework).toEqual(['GDPR', 'KDPA']);
    });

    test('should get compliance audit trail', () => {
      scheduledReportService.logComplianceAudit({
        action: 'action1',
        reportId: 'report1',
        userId: 'user1'
      });

      scheduledReportService.logComplianceAudit({
        action: 'action2',
        reportId: 'report2',
        userId: 'user2'
      });

      const allAudits = scheduledReportService.getComplianceAuditTrail();
      expect(allAudits).toHaveLength(2);

      const report1Audits = scheduledReportService.getComplianceAuditTrail('report1');
      expect(report1Audits).toHaveLength(1);
      expect(report1Audits[0].reportId).toBe('report1');
    });

    test('should limit audit trail size', () => {
      // Add more than 1000 audit entries
      for (let i = 0; i < 1100; i++) {
        scheduledReportService.logComplianceAudit({
          action: `action_${i}`,
          reportId: `report_${i}`,
          userId: 'test-user'
        });
      }

      expect(scheduledReportService.complianceAudits).toHaveLength(1000);
    });

    test('should get delivery history', () => {
      // Add some delivery history entries
      scheduledReportService.deliveryHistory.push(
        {
          reportId: 'report1',
          executionId: 'exec1',
          channel: 'email',
          recipient: 'user1@example.com',
          status: 'delivered'
        },
        {
          reportId: 'report2',
          executionId: 'exec2',
          channel: 'download',
          recipient: 'user2@example.com',
          status: 'ready'
        }
      );

      const allHistory = scheduledReportService.getDeliveryHistory();
      expect(allHistory).toHaveLength(2);

      const report1History = scheduledReportService.getDeliveryHistory('report1');
      expect(report1History).toHaveLength(1);
      expect(report1History[0].reportId).toBe('report1');
    });
  });
});