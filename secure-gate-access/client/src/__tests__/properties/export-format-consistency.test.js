/**
 * Property Test: Export Format Consistency
 * Validates: Requirements 12.1
 * 
 * Property 12: Export Format Consistency
 * For any data export request, the generated output should match the user's 
 * specified format (PDF, Excel, CSV) and include all selected fields with proper formatting
 */

import fc from 'fast-check';

import exportService from '../../services/exportService';

// Mock dependencies
jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn(() => ({})),
    json_to_sheet: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
  },
  write: jest.fn(() => new ArrayBuffer(8))
}));

jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    setFontSize: jest.fn(),
    text: jest.fn(),
    autoTable: jest.fn(),
    output: jest.fn(() => new ArrayBuffer(8))
  }));
});

// Test configuration
const TEST_CONFIG = {
  PROPERTY_RUNS: 100,
  MAX_RECORDS: 50,
  MAX_FIELDS: 10,
  SUPPORTED_FORMATS: ['csv', 'excel', 'pdf'],
  FIELD_TYPES: ['string', 'number', 'boolean', 'date'],
  TIMEOUT: 30000
};

describe('Property 12: Export Format Consistency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should maintain format consistency across all export types', 
    fc.asyncProperty(
      // Generate test data with various field types
      fc.record({
        format: fc.constantFrom(...TEST_CONFIG.SUPPORTED_FORMATS),
        data: fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            status: fc.constantFrom('active', 'inactive', 'pending'),
            count: fc.integer({ min: 0, max: 1000 }),
            percentage: fc.float({ min: 0, max: 100 }),
            isActive: fc.boolean(),
            createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
          }),
          { minLength: 1, maxLength: TEST_CONFIG.MAX_RECORDS }
        ),
        selectedFields: fc.array(
          fc.constantFrom('id', 'name', 'email', 'status', 'count', 'percentage', 'isActive', 'createdAt'),
          { minLength: 1, maxLength: TEST_CONFIG.MAX_FIELDS }
        ).map(fields => [...new Set(fields)]), // Remove duplicates
        metadata: fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ maxLength: 500 }),
          generatedAt: fc.date().map(d => d.toISOString())
        })
      }),
      async ({ format, data, selectedFields, metadata }) => {
        // Property: Export should succeed for valid inputs
        const exportOptions = {
          data,
          format,
          fields: selectedFields,
          filename: `test_export.${format}`,
          metadata
        };

        let exportResult;
        let exportError = null;

        try {
          exportResult = await exportService.exportData(exportOptions);
        } catch (error) {
          exportError = error;
        }

        // Property 1: Export should not fail for valid data and format
        expect(exportError).toBeNull();
        expect(exportResult).toBeDefined();

        // Property 2: Result should be a Blob
        expect(exportResult).toBeInstanceOf(Blob);

        // Property 3: Blob should have appropriate MIME type
        const expectedMimeTypes = {
          csv: 'text/csv',
          excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          pdf: 'application/pdf'
        };
        
        expect(exportResult.type).toContain(expectedMimeTypes[format] || 'application/octet-stream');

        // Property 4: Blob should have content (size > 0)
        expect(exportResult.size).toBeGreaterThan(0);

        // Property 5: Export should be tracked in history
        const history = exportService.getExportHistory();
        expect(history.length).toBeGreaterThan(0);
        
        const latestExport = history[0];
        expect(latestExport.format).toBe(format);
        expect(latestExport.recordCount).toBe(data.length);
        expect(latestExport.fields).toEqual(selectedFields);
      }
    ),
    { numRuns: TEST_CONFIG.PROPERTY_RUNS, timeout: TEST_CONFIG.TIMEOUT }
  );

  test('should handle field filtering consistently across formats',
    fc.asyncProperty(
      fc.record({
        format: fc.constantFrom(...TEST_CONFIG.SUPPORTED_FORMATS),
        data: fc.array(
          fc.record({
            field1: fc.string(),
            field2: fc.integer(),
            field3: fc.boolean(),
            field4: fc.float(),
            field5: fc.string()
          }),
          { minLength: 1, maxLength: 20 }
        ),
        selectedFields: fc.subarray(['field1', 'field2', 'field3', 'field4', 'field5'], { minLength: 1 })
      }),
      async ({ format, data, selectedFields }) => {
        const exportOptions = {
          data,
          format,
          fields: selectedFields,
          filename: `filtered_export.${format}`,
          metadata: { title: 'Filtered Export Test' }
        };

        const result = await exportService.exportData(exportOptions);

        // Property: Export should succeed with field filtering
        expect(result).toBeInstanceOf(Blob);
        expect(result.size).toBeGreaterThan(0);

        // Property: History should reflect selected fields
        const history = exportService.getExportHistory();
        const latestExport = history[0];
        expect(latestExport.fields).toEqual(selectedFields);
        expect(latestExport.recordCount).toBe(data.length);
      }
    ),
    { numRuns: 50, timeout: TEST_CONFIG.TIMEOUT }
  );

  test('should handle empty data consistently across formats',
    fc.asyncProperty(
      fc.constantFrom(...TEST_CONFIG.SUPPORTED_FORMATS),
      async (format) => {
        const exportOptions = {
          data: [],
          format,
          fields: ['id', 'name'],
          filename: `empty_export.${format}`,
          metadata: { title: 'Empty Export Test' }
        };

        let exportError = null;
        try {
          await exportService.exportData(exportOptions);
        } catch (error) {
          exportError = error;
        }

        // Property: Empty data should result in consistent error across formats
        expect(exportError).not.toBeNull();
        expect(exportError.message).toContain('No data to export');
      }
    ),
    { numRuns: 20, timeout: TEST_CONFIG.TIMEOUT }
  );

  test('should handle special characters and unicode consistently',
    fc.asyncProperty(
      fc.record({
        format: fc.constantFrom(...TEST_CONFIG.SUPPORTED_FORMATS),
        data: fc.array(
          fc.record({
            name: fc.string().filter(s => s.length > 0),
            description: fc.string(),
            unicode: fc.string(),
            special: fc.string()
          }),
          { minLength: 1, maxLength: 10 }
        )
      }),
      async ({ format, data }) => {
        const exportOptions = {
          data,
          format,
          filename: `unicode_export.${format}`,
          metadata: { title: 'Unicode Test Export' }
        };

        const result = await exportService.exportData(exportOptions);

        // Property: Unicode and special characters should not break export
        expect(result).toBeInstanceOf(Blob);
        expect(result.size).toBeGreaterThan(0);

        // Property: Export should complete without errors
        const history = exportService.getExportHistory();
        expect(history[0].recordCount).toBe(data.length);
      }
    ),
    { numRuns: 30, timeout: TEST_CONFIG.TIMEOUT }
  );

  test('should maintain metadata consistency across formats',
    fc.asyncProperty(
      fc.record({
        format: fc.constantFrom(...TEST_CONFIG.SUPPORTED_FORMATS),
        data: fc.array(
          fc.record({
            id: fc.integer(),
            value: fc.string()
          }),
          { minLength: 1, maxLength: 5 }
        ),
        metadata: fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.option(fc.string({ maxLength: 200 })),
          generatedAt: fc.date().map(d => d.toISOString()),
          customField: fc.option(fc.string())
        })
      }),
      async ({ format, data, metadata }) => {
        const exportOptions = {
          data,
          format,
          filename: `metadata_export.${format}`,
          metadata
        };

        const result = await exportService.exportData(exportOptions);

        // Property: Metadata should not affect export success
        expect(result).toBeInstanceOf(Blob);
        expect(result.size).toBeGreaterThan(0);

        // Property: Export history should preserve metadata information
        const history = exportService.getExportHistory();
        const latestExport = history[0];
        expect(latestExport.format).toBe(format);
        expect(latestExport.recordCount).toBe(data.length);
      }
    ),
    { numRuns: 40, timeout: TEST_CONFIG.TIMEOUT }
  );

  test('should handle large datasets consistently',
    fc.asyncProperty(
      fc.record({
        format: fc.constantFrom(...TEST_CONFIG.SUPPORTED_FORMATS),
        recordCount: fc.integer({ min: 100, max: 1000 })
      }),
      async ({ format, recordCount }) => {
        // Generate large dataset
        const data = Array.from({ length: recordCount }, (_, index) => ({
          id: index + 1,
          name: `Record ${index + 1}`,
          value: Math.random() * 1000,
          timestamp: new Date().toISOString()
        }));

        const exportOptions = {
          data,
          format,
          filename: `large_export.${format}`,
          metadata: { 
            title: 'Large Dataset Export',
            recordCount: recordCount.toString()
          }
        };

        const startTime = Date.now();
        const result = await exportService.exportData(exportOptions);
        const exportTime = Date.now() - startTime;

        // Property: Large datasets should export successfully
        expect(result).toBeInstanceOf(Blob);
        expect(result.size).toBeGreaterThan(0);

        // Property: Export time should be reasonable (less than 10 seconds)
        expect(exportTime).toBeLessThan(10000);

        // Property: History should accurately reflect large dataset
        const history = exportService.getExportHistory();
        expect(history[0].recordCount).toBe(recordCount);
      }
    ),
    { numRuns: 10, timeout: 15000 }
  );

  test('should validate format parameter consistency',
    fc.asyncProperty(
      fc.record({
        format: fc.oneof(
          fc.constantFrom(...TEST_CONFIG.SUPPORTED_FORMATS),
          fc.string().filter(s => !TEST_CONFIG.SUPPORTED_FORMATS.includes(s.toLowerCase()))
        ),
        data: fc.array(
          fc.record({
            id: fc.integer(),
            name: fc.string()
          }),
          { minLength: 1, maxLength: 5 }
        )
      }),
      async ({ format, data }) => {
        const exportOptions = {
          data,
          format,
          filename: `format_test.${format}`,
          metadata: { title: 'Format Validation Test' }
        };

        let exportError = null;
        let result = null;

        try {
          result = await exportService.exportData(exportOptions);
        } catch (error) {
          exportError = error;
        }

        if (TEST_CONFIG.SUPPORTED_FORMATS.includes(format.toLowerCase())) {
          // Property: Supported formats should succeed
          expect(exportError).toBeNull();
          expect(result).toBeInstanceOf(Blob);
        } else {
          // Property: Unsupported formats should fail consistently
          expect(exportError).not.toBeNull();
          expect(exportError.message).toContain('Unsupported export format');
        }
      }
    ),
    { numRuns: 50, timeout: TEST_CONFIG.TIMEOUT }
  );

  test('should maintain filename consistency',
    fc.asyncProperty(
      fc.record({
        format: fc.constantFrom(...TEST_CONFIG.SUPPORTED_FORMATS),
        filename: fc.string({ minLength: 1, maxLength: 50 }),
        data: fc.array(
          fc.record({ id: fc.integer(), name: fc.string() }),
          { minLength: 1, maxLength: 5 }
        )
      }),
      async ({ format, filename, data }) => {
        const exportOptions = {
          data,
          format,
          filename,
          metadata: { title: 'Filename Test' }
        };

        const result = await exportService.exportData(exportOptions);

        // Property: Export should succeed regardless of filename
        expect(result).toBeInstanceOf(Blob);

        // Property: History should preserve filename information
        const history = exportService.getExportHistory();
        expect(history[0].filename).toBe(filename);
      }
    ),
    { numRuns: 30, timeout: TEST_CONFIG.TIMEOUT }
  );
});

// Additional test utilities for export format validation
describe('Export Format Validation Utilities', () => {
  test('should provide consistent format information', () => {
    const supportedFormats = exportService.getSupportedFormats();
    
    // Property: All supported formats should have required properties
    supportedFormats.forEach(format => {
      expect(format).toHaveProperty('value');
      expect(format).toHaveProperty('label');
      expect(format).toHaveProperty('description');
      expect(typeof format.value).toBe('string');
      expect(typeof format.label).toBe('string');
      expect(typeof format.description).toBe('string');
    });

    // Property: Format values should match supported formats
    const formatValues = supportedFormats.map(f => f.value);
    expect(formatValues).toEqual(expect.arrayContaining(TEST_CONFIG.SUPPORTED_FORMATS));
  });

  test('should handle export history consistently', () => {
    // Clear history
    exportService.exportHistory = [];
    
    // Add test entries
    const testEntries = [
      { filename: 'test1.csv', format: 'csv', recordCount: 10 },
      { filename: 'test2.xlsx', format: 'excel', recordCount: 20 },
      { filename: 'test3.pdf', format: 'pdf', recordCount: 30 }
    ];

    testEntries.forEach(entry => {
      exportService.addToHistory(entry);
    });

    const history = exportService.getExportHistory();

    // Property: History should maintain order (newest first)
    expect(history).toHaveLength(3);
    expect(history[0].filename).toBe('test3.pdf');
    expect(history[1].filename).toBe('test2.xlsx');
    expect(history[2].filename).toBe('test1.csv');

    // Property: History entries should have consistent structure
    history.forEach(entry => {
      expect(entry).toHaveProperty('filename');
      expect(entry).toHaveProperty('format');
      expect(entry).toHaveProperty('recordCount');
    });
  });
});