/**
 * Unit tests for Export Service
 * Tests multi-format export generation with proper field selection and formatting
 */

import exportService from '../../services/exportService';

// Mock dependencies
jest.mock('xlsx', () => ({
  utils: {
    json_to_sheet: jest.fn(),
    book_new: jest.fn(),
    book_append_sheet: jest.fn()
  },
  write: jest.fn()
}));

jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    autoTable: jest.fn(),
    save: jest.fn(),
    output: jest.fn()
  }));
});

describe('ExportService', () => {
  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'pending' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    exportService.exportHistory = [];
    exportService.exportQueue = [];
  });

  describe('exportData', () => {
    test('should export data in CSV format with proper field selection', async () => {
      const config = {
        data: mockData,
        format: 'csv',
        fields: ['id', 'name', 'email'],
        filename: 'test_export.csv'
      };

      const result = await exportService.exportData(config);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('text/csv');
      
      // Verify export history is tracked
      expect(exportService.exportHistory).toHaveLength(1);
      expect(exportService.exportHistory[0]).toMatchObject({
        format: 'csv',
        recordCount: 3,
        fields: ['id', 'name', 'email'],
        status: 'completed'
      });
    });

    test('should export data in Excel format with metadata', async () => {
      const XLSX = require('xlsx');
      XLSX.utils.json_to_sheet.mockReturnValue({});
      XLSX.utils.book_new.mockReturnValue({});
      XLSX.write.mockReturnValue(new ArrayBuffer(8));

      const config = {
        data: mockData,
        format: 'excel',
        fields: ['id', 'name', 'status'],
        filename: 'test_export.xlsx',
        metadata: {
          title: 'User Report',
          description: 'Active users export'
        }
      };

      const result = await exportService.exportData(config);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 1, name: 'John Doe', status: 'active' })
        ])
      );
    });

    test('should export data in PDF format with proper formatting', async () => {
      const mockJsPDF = require('jspdf');
      const mockPDFInstance = {
        autoTable: jest.fn(),
        save: jest.fn(),
        output: jest.fn().mockReturnValue(new ArrayBuffer(8))
      };
      mockJsPDF.mockReturnValue(mockPDFInstance);

      const config = {
        data: mockData,
        format: 'pdf',
        fields: ['name', 'email', 'status'],
        filename: 'test_export.pdf'
      };

      const result = await exportService.exportData(config);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/pdf');
      expect(mockPDFInstance.autoTable).toHaveBeenCalledWith({
        head: [['Name', 'Email', 'Status']],
        body: expect.arrayContaining([
          ['John Doe', 'john@example.com', 'active']
        ]),
        startY: expect.any(Number),
        styles: expect.any(Object)
      });
    });

    test('should handle field selection and filtering', async () => {
      const config = {
        data: mockData,
        format: 'csv',
        fields: ['name', 'status'], // Only select specific fields
        filename: 'filtered_export.csv'
      };

      await exportService.exportData(config);

      const exportRecord = exportService.exportHistory[0];
      expect(exportRecord.fields).toEqual(['name', 'status']);
      expect(exportRecord.recordCount).toBe(3);
    });

    test('should include compliance metadata when provided', async () => {
      const complianceMetadata = {
        compliance: {
          auditTrail: { reportId: 'test-123' },
          dataLineage: { sourceSystem: 'secure-gate' },
          regulatoryCompliance: 'GDPR, KDPA'
        }
      };

      const config = {
        data: mockData,
        format: 'excel',
        fields: ['id', 'name'],
        filename: 'compliance_export.xlsx',
        metadata: complianceMetadata
      };

      await exportService.exportData(config);

      const exportRecord = exportService.exportHistory[0];
      expect(exportRecord.metadata).toMatchObject(complianceMetadata);
    });

    test('should handle empty data gracefully', async () => {
      const config = {
        data: [],
        format: 'csv',
        fields: ['id', 'name'],
        filename: 'empty_export.csv'
      };

      const result = await exportService.exportData(config);

      expect(result).toBeInstanceOf(Blob);
      expect(exportService.exportHistory[0].recordCount).toBe(0);
    });

    test('should throw error for unsupported format', async () => {
      const config = {
        data: mockData,
        format: 'xml', // Unsupported format
        fields: ['id', 'name'],
        filename: 'test.xml'
      };

      await expect(exportService.exportData(config)).rejects.toThrow('Unsupported export format: xml');
    });
  });

  describe('queueExport', () => {
    test('should queue large export for background processing', async () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`
      }));

      const config = {
        data: largeData,
        format: 'excel',
        fields: ['id', 'name', 'email'],
        filename: 'large_export.xlsx'
      };

      const queueId = await exportService.queueExport(config);

      expect(queueId).toBeDefined();
      expect(exportService.exportQueue).toHaveLength(1);
      expect(exportService.exportQueue[0]).toMatchObject({
        id: queueId,
        status: 'queued',
        recordCount: 10000
      });
    });

    test('should process queued exports', async () => {
      const config = {
        data: mockData,
        format: 'csv',
        fields: ['id', 'name'],
        filename: 'queued_export.csv'
      };

      const queueId = await exportService.queueExport(config);
      await exportService.processQueuedExports();

      const queueItem = exportService.exportQueue.find(item => item.id === queueId);
      expect(queueItem.status).toBe('completed');
      expect(queueItem.completedAt).toBeDefined();
    });
  });

  describe('getExportHistory', () => {
    test('should return export history with filtering', async () => {
      // Create multiple exports
      await exportService.exportData({
        data: mockData,
        format: 'csv',
        fields: ['id', 'name'],
        filename: 'export1.csv'
      });

      await exportService.exportData({
        data: mockData,
        format: 'excel',
        fields: ['id', 'email'],
        filename: 'export2.xlsx'
      });

      const history = exportService.getExportHistory();
      expect(history).toHaveLength(2);
      expect(history[0].format).toBe('csv');
      expect(history[1].format).toBe('excel');

      // Test filtering by format
      const csvHistory = exportService.getExportHistory({ format: 'csv' });
      expect(csvHistory).toHaveLength(1);
      expect(csvHistory[0].format).toBe('csv');
    });
  });

  describe('validateExportConfig', () => {
    test('should validate required configuration fields', () => {
      const invalidConfig = {
        format: 'csv',
        fields: ['id', 'name']
        // Missing data and filename
      };

      expect(() => exportService.validateExportConfig(invalidConfig))
        .toThrow('Export configuration is missing required fields');
    });

    test('should validate field selection against data', () => {
      const config = {
        data: mockData,
        format: 'csv',
        fields: ['id', 'nonexistent_field'], // Invalid field
        filename: 'test.csv'
      };

      expect(() => exportService.validateExportConfig(config))
        .toThrow('Invalid field selection');
    });

    test('should validate supported formats', () => {
      const config = {
        data: mockData,
        format: 'invalid_format',
        fields: ['id', 'name'],
        filename: 'test.invalid'
      };

      expect(() => exportService.validateExportConfig(config))
        .toThrow('Unsupported export format');
    });
  });

  describe('generateExportMetadata', () => {
    test('should generate comprehensive metadata', () => {
      const config = {
        data: mockData,
        format: 'excel',
        fields: ['id', 'name', 'email'],
        filename: 'metadata_test.xlsx'
      };

      const metadata = exportService.generateExportMetadata(config);

      expect(metadata).toMatchObject({
        recordCount: 3,
        fields: ['id', 'name', 'email'],
        format: 'excel',
        generatedAt: expect.any(String),
        exportedBy: expect.any(String)
      });
    });
  });

  describe('error handling', () => {
    test('should handle export failures gracefully', async () => {
      // Mock XLSX to throw an error
      const XLSX = require('xlsx');
      XLSX.write.mockImplementation(() => {
        throw new Error('Export generation failed');
      });

      const config = {
        data: mockData,
        format: 'excel',
        fields: ['id', 'name'],
        filename: 'failing_export.xlsx'
      };

      await expect(exportService.exportData(config)).rejects.toThrow('Export generation failed');

      // Verify error is logged in history
      expect(exportService.exportHistory[0]).toMatchObject({
        status: 'failed',
        error: 'Export generation failed'
      });
    });

    test('should handle memory limitations for large exports', async () => {
      const veryLargeData = Array.from({ length: 100000 }, (_, i) => ({
        id: i + 1,
        data: 'x'.repeat(1000) // Large string data
      }));

      const config = {
        data: veryLargeData,
        format: 'csv',
        fields: ['id', 'data'],
        filename: 'memory_test.csv'
      };

      // Should automatically queue large exports
      const result = await exportService.exportData(config);
      expect(result).toEqual(expect.objectContaining({
        queued: true,
        queueId: expect.any(String)
      }));
    });
  });
});