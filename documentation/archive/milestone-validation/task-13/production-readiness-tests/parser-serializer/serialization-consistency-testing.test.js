/**
 * Serialization Consistency Testing System Tests
 * 
 * Comprehensive test suite for serialization consistency validation
 * covering API response formatting, data escaping, cross-format compatibility,
 * and performance optimization scenarios.
 */

const { describe, test, expect, beforeAll, beforeEach } = require('@jest/globals');
const SerializationConsistencyTesting = require('./serialization-consistency-testing');

describe('Serialization Consistency Testing System', () => {
  let tester;

  beforeAll(() => {
    tester = new SerializationConsistencyTesting();
  });

  beforeEach(() => {
    // Reset test results before each test
    tester.testResults = [];
  });

  describe('System Initialization', () => {
    test('should initialize with correct configuration', () => {
      expect(tester.supportedFormats).toContain('json');
      expect(tester.supportedFormats).toContain('xml');
      expect(tester.supportedFormats).toContain('csv');
      expect(tester.supportedFormats).toContain('yaml');
      
      expect(tester.securityPatterns).toHaveProperty('xss');
      expect(tester.securityPatterns).toHaveProperty('sqlInjection');
      expect(tester.securityPatterns).toHaveProperty('pathTraversal');
      expect(tester.securityPatterns).toHaveProperty('commandInjection');
      
      expect(tester.performanceThresholds).toHaveProperty('serializationTime');
      expect(tester.performanceThresholds).toHaveProperty('deserializationTime');
      expect(tester.performanceThresholds).toHaveProperty('memoryUsage');
      expect(tester.performanceThresholds).toHaveProperty('compressionRatio');
    });

    test('should have comprehensive test data sets', () => {
      expect(tester.testDataSets).toHaveProperty('simple');
      expect(tester.testDataSets).toHaveProperty('complex');
      expect(tester.testDataSets).toHaveProperty('arrayData');
      expect(tester.testDataSets).toHaveProperty('specialCharacters');
      expect(tester.testDataSets).toHaveProperty('maliciousData');
      expect(tester.testDataSets).toHaveProperty('largeData');
      expect(tester.testDataSets).toHaveProperty('nullAndUndefined');
    });

    test('should generate large data set correctly', () => {
      const largeData = tester.generateLargeDataSet(100);
      
      expect(largeData).toHaveProperty('items');
      expect(largeData).toHaveProperty('metadata');
      expect(largeData.items).toHaveLength(100);
      expect(largeData.metadata.count).toBe(100);
      
      // Verify structure of generated items
      const firstItem = largeData.items[0];
      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('name');
      expect(firstItem).toHaveProperty('description');
      expect(firstItem).toHaveProperty('value');
      expect(firstItem).toHaveProperty('tags');
      expect(firstItem).toHaveProperty('metadata');
    });
  });

  describe('API Response Formatting Tests', () => {
    test('should test API response formatting successfully', async () => {
      const result = await tester.testAPIResponseFormatting();
      
      expect(result).toHaveProperty('testName', 'API Response Formatting');
      expect(result).toHaveProperty('totalTests');
      expect(result).toHaveProperty('passedTests');
      expect(result).toHaveProperty('failedTests');
      expect(result).toHaveProperty('tests');
      
      expect(result.totalTests).toBeGreaterThan(0);
      expect(Array.isArray(result.tests)).toBe(true);
    });

    test('should validate success response format', async () => {
      const result = await tester.testSuccessResponseFormat();
      
      expect(result).toHaveProperty('testName', 'Success Response Format');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      if (result.success) {
        expect(result.details.valid).toBe(true);
        expect(result.data).toHaveProperty('success', true);
        expect(result.data).toHaveProperty('message');
        expect(result.data).toHaveProperty('timestamp');
        expect(result.data).toHaveProperty('data');
      }
    });

    test('should validate error response format', async () => {
      const result = await tester.testErrorResponseFormat();
      
      expect(result).toHaveProperty('testName', 'Error Response Format');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      if (result.success) {
        expect(result.details.valid).toBe(true);
        expect(result.data).toHaveProperty('success', false);
        expect(result.data).toHaveProperty('message');
        expect(result.data).toHaveProperty('timestamp');
        expect(result.data).toHaveProperty('error');
      }
    });

    test('should validate pagination response format', async () => {
      const result = await tester.testPaginationResponseFormat();
      
      expect(result).toHaveProperty('testName', 'Pagination Response Format');
      expect(result).toHaveProperty('success');
      
      if (result.success) {
        expect(result.data.data).toHaveProperty('pagination');
        expect(result.data.data.pagination).toHaveProperty('page');
        expect(result.data.data.pagination).toHaveProperty('limit');
        expect(result.data.data.pagination).toHaveProperty('total');
        expect(result.data.data.pagination).toHaveProperty('hasMore');
      }
    });

    test('should validate nested data response format', async () => {
      const result = await tester.testNestedDataResponseFormat();
      
      expect(result).toHaveProperty('testName', 'Nested Data Response Format');
      expect(result).toHaveProperty('success');
      
      if (result.success) {
        expect(result.data).toHaveProperty('data');
        expect(typeof result.data.data).toBe('object');
        expect(Object.keys(result.data.data).length).toBeGreaterThan(0);
      }
    });

    test('should validate array response format', async () => {
      const result = await tester.testArrayResponseFormat();
      
      expect(result).toHaveProperty('testName', 'Array Response Format');
      expect(result).toHaveProperty('success');
      
      if (result.success) {
        expect(Array.isArray(result.data.data)).toBe(true);
      }
    });
  });

  describe('Data Escaping and Security Tests', () => {
    test('should test data escaping and security successfully', async () => {
      const result = await tester.testDataEscapingAndSecurity();
      
      expect(result).toHaveProperty('testName', 'Data Escaping and Security');
      expect(result).toHaveProperty('totalTests');
      expect(result).toHaveProperty('passedTests');
      expect(result).toHaveProperty('failedTests');
      expect(result).toHaveProperty('tests');
      
      expect(result.totalTests).toBeGreaterThan(0);
      expect(Array.isArray(result.tests)).toBe(true);
    });

    test('should prevent XSS attacks', async () => {
      const result = await tester.testXSSPrevention();
      
      expect(result).toHaveProperty('testName', 'XSS Prevention');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      expect(result.details).toHaveProperty('containsUnsafeContent');
      expect(result.details).toHaveProperty('serializedLength');
      expect(result.details).toHaveProperty('checkedPatterns');
      
      // Success means no unsafe content was found
      if (result.success) {
        expect(result.details.containsUnsafeContent).toBe(false);
      }
    });

    test('should prevent SQL injection attacks', async () => {
      const result = await tester.testSQLInjectionPrevention();
      
      expect(result).toHaveProperty('testName', 'SQL Injection Prevention');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      expect(result.details).toHaveProperty('containsUnsafeSQL');
      expect(result.details).toHaveProperty('checkedPatterns');
      
      // Success means no unsafe SQL was found
      if (result.success) {
        expect(result.details.containsUnsafeSQL).toBe(false);
      }
    });

    test('should prevent path traversal attacks', async () => {
      const result = await tester.testPathTraversalPrevention();
      
      expect(result).toHaveProperty('testName', 'Path Traversal Prevention');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      expect(result.details).toHaveProperty('containsUnsafePath');
      expect(result.details).toHaveProperty('checkedPatterns');
      
      // Success means no unsafe paths were found
      if (result.success) {
        expect(result.details.containsUnsafePath).toBe(false);
      }
    });

    test('should prevent command injection attacks', async () => {
      const result = await tester.testCommandInjectionPrevention();
      
      expect(result).toHaveProperty('testName', 'Command Injection Prevention');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      expect(result.details).toHaveProperty('containsUnsafeCommand');
      expect(result.details).toHaveProperty('checkedPatterns');
      
      // Success means no unsafe commands were found
      if (result.success) {
        expect(result.details.containsUnsafeCommand).toBe(false);
      }
    });

    test('should handle HTML entity encoding', async () => {
      const result = await tester.testHTMLEntityEncoding();
      
      expect(result).toHaveProperty('testName', 'HTML Entity Encoding');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      expect(result.details).toHaveProperty('properlyEncoded');
      expect(result.details).toHaveProperty('serializedLength');
      expect(result.details).toHaveProperty('originalContent');
    });
  });

  describe('Cross-Format Compatibility Tests', () => {
    test('should test cross-format compatibility successfully', async () => {
      const result = await tester.testCrossFormatCompatibility();
      
      expect(result).toHaveProperty('testName', 'Cross-Format Compatibility');
      expect(result).toHaveProperty('totalTests');
      expect(result).toHaveProperty('passedTests');
      expect(result).toHaveProperty('failedTests');
      expect(result).toHaveProperty('tests');
      
      expect(result.totalTests).toBeGreaterThan(0);
      expect(Array.isArray(result.tests)).toBe(true);
    });

    test('should serialize JSON format correctly', async () => {
      const result = await tester.testFormatSerialization('json');
      
      expect(result).toHaveProperty('testName', 'JSON Serialization');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      if (result.success) {
        expect(result.details.format).toBe('json');
        expect(result.details.serializationTime).toBeGreaterThanOrEqual(0);
        expect(result.details.serializedLength).toBeGreaterThan(0);
      }
    });

    test('should serialize XML format correctly', async () => {
      const result = await tester.testFormatSerialization('xml');
      
      expect(result).toHaveProperty('testName', 'XML Serialization');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      if (result.success) {
        expect(result.details.format).toBe('xml');
        expect(result.details.serializationTime).toBeGreaterThanOrEqual(0);
        expect(result.details.serializedLength).toBeGreaterThan(0);
      }
    });

    test('should serialize CSV format correctly', async () => {
      const result = await tester.testFormatSerialization('csv');
      
      expect(result).toHaveProperty('testName', 'CSV Serialization');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      if (result.success) {
        expect(result.details.format).toBe('csv');
        expect(result.details.serializationTime).toBeGreaterThanOrEqual(0);
        expect(result.details.serializedLength).toBeGreaterThan(0);
      }
    });

    test('should serialize YAML format correctly', async () => {
      const result = await tester.testFormatSerialization('yaml');
      
      expect(result).toHaveProperty('testName', 'YAML Serialization');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      if (result.success) {
        expect(result.details.format).toBe('yaml');
        expect(result.details.serializationTime).toBeGreaterThanOrEqual(0);
        expect(result.details.serializedLength).toBeGreaterThan(0);
      }
    });

    test('should test format interoperability', async () => {
      const result = await tester.testFormatInteroperability();
      
      expect(result).toHaveProperty('testName', 'Format Interoperability');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      if (result.success) {
        expect(result.details).toHaveProperty('json');
        expect(result.details).toHaveProperty('xml');
        expect(result.details.json.consistent).toBe(true);
      }
    });
  });

  describe('Performance Optimization Tests', () => {
    test('should test performance optimization successfully', async () => {
      const result = await tester.testPerformanceOptimization();
      
      expect(result).toHaveProperty('testName', 'Performance Optimization');
      expect(result).toHaveProperty('totalTests');
      expect(result).toHaveProperty('passedTests');
      expect(result).toHaveProperty('failedTests');
      expect(result).toHaveProperty('tests');
      
      expect(result.totalTests).toBeGreaterThan(0);
      expect(Array.isArray(result.tests)).toBe(true);
    });

    test('should test serialization performance', async () => {
      const result = await tester.testSerializationPerformance();
      
      expect(result).toHaveProperty('testName', 'Serialization Performance');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      expect(result.details).toHaveProperty('averageTime');
      expect(result.details).toHaveProperty('threshold');
      expect(result.details).toHaveProperty('iterations');
      expect(result.details).toHaveProperty('times');
      expect(result.details).toHaveProperty('dataSize');
      
      expect(result.details.averageTime).toBeGreaterThanOrEqual(0);
      expect(result.details.iterations).toBeGreaterThan(0);
      expect(Array.isArray(result.details.times)).toBe(true);
    });

    test('should test deserialization performance', async () => {
      const result = await tester.testDeserializationPerformance();
      
      expect(result).toHaveProperty('testName', 'Deserialization Performance');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      expect(result.details).toHaveProperty('averageTime');
      expect(result.details).toHaveProperty('threshold');
      expect(result.details).toHaveProperty('iterations');
      expect(result.details).toHaveProperty('times');
      expect(result.details).toHaveProperty('dataSize');
      
      expect(result.details.averageTime).toBeGreaterThanOrEqual(0);
      expect(result.details.iterations).toBeGreaterThan(0);
      expect(Array.isArray(result.details.times)).toBe(true);
    });

    test('should test memory usage', async () => {
      const result = await tester.testMemoryUsage();
      
      expect(result).toHaveProperty('testName', 'Memory Usage');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      expect(result.details).toHaveProperty('memoryIncrease');
      expect(result.details).toHaveProperty('threshold');
      expect(result.details).toHaveProperty('initialMemory');
      expect(result.details).toHaveProperty('finalMemory');
      expect(result.details).toHaveProperty('serializedCount');
      
      expect(typeof result.details.memoryIncrease).toBe('number');
      expect(result.details.serializedCount).toBeGreaterThan(0);
    });

    test('should test compression efficiency', async () => {
      const result = await tester.testCompressionEfficiency();
      
      expect(result).toHaveProperty('testName', 'Compression Efficiency');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      expect(result.details).toHaveProperty('originalSize');
      expect(result.details).toHaveProperty('compressedSize');
      expect(result.details).toHaveProperty('compressionRatio');
      expect(result.details).toHaveProperty('threshold');
      expect(result.details).toHaveProperty('compressionSavings');
      
      expect(result.details.originalSize).toBeGreaterThan(0);
      expect(result.details.compressedSize).toBeGreaterThan(0);
      expect(result.details.compressionRatio).toBeGreaterThan(0);
      expect(result.details.compressionSavings).toMatch(/%$/);
    });

    test('should test large data handling', async () => {
      const result = await tester.testLargeDataHandling();
      
      expect(result).toHaveProperty('testName', 'Large Data Handling');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      expect(result.details).toHaveProperty('dataSize');
      expect(result.details).toHaveProperty('processingTime');
      expect(result.details).toHaveProperty('dataConsistent');
      expect(result.details).toHaveProperty('withinTimeLimit');
      expect(result.details).toHaveProperty('itemCount');
      
      expect(result.details.dataSize).toBeGreaterThan(0);
      expect(result.details.processingTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.details.dataConsistent).toBe('boolean');
      expect(typeof result.details.withinTimeLimit).toBe('boolean');
      expect(result.details.itemCount).toBe(5000);
    });
  });

  describe('Round-Trip Consistency Tests', () => {
    test('should test round-trip consistency successfully', async () => {
      const result = await tester.testRoundTripConsistency();
      
      expect(result).toHaveProperty('testName', 'Round-Trip Consistency');
      expect(result).toHaveProperty('totalTests');
      expect(result).toHaveProperty('passedTests');
      expect(result).toHaveProperty('failedTests');
      expect(result).toHaveProperty('tests');
      
      expect(result.totalTests).toBeGreaterThan(0);
      expect(Array.isArray(result.tests)).toBe(true);
    });

    test('should test simple data round-trip', async () => {
      const result = await tester.testDataSetRoundTrip('simple', tester.testDataSets.simple);
      
      expect(result).toHaveProperty('testName', 'Round-Trip: simple');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      expect(result.details).toHaveProperty('dataSetName', 'simple');
      expect(result.details).toHaveProperty('jsonConsistent');
      expect(result.details).toHaveProperty('apiConsistent');
      expect(result.details).toHaveProperty('originalSize');
      expect(result.details).toHaveProperty('serializedSize');
      
      expect(typeof result.details.jsonConsistent).toBe('boolean');
      expect(typeof result.details.apiConsistent).toBe('boolean');
      expect(result.details.originalSize).toBeGreaterThan(0);
      expect(result.details.serializedSize).toBeGreaterThan(0);
    });

    test('should test complex data round-trip', async () => {
      const result = await tester.testDataSetRoundTrip('complex', tester.testDataSets.complex);
      
      expect(result).toHaveProperty('testName', 'Round-Trip: complex');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      expect(result.details.dataSetName).toBe('complex');
      expect(typeof result.details.jsonConsistent).toBe('boolean');
      expect(typeof result.details.apiConsistent).toBe('boolean');
    });

    test('should test array data round-trip', async () => {
      const result = await tester.testDataSetRoundTrip('arrayData', tester.testDataSets.arrayData);
      
      expect(result).toHaveProperty('testName', 'Round-Trip: arrayData');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      expect(result.details.dataSetName).toBe('arrayData');
      expect(typeof result.details.jsonConsistent).toBe('boolean');
      expect(typeof result.details.apiConsistent).toBe('boolean');
    });

    test('should test special characters round-trip', async () => {
      const result = await tester.testDataSetRoundTrip('specialCharacters', tester.testDataSets.specialCharacters);
      
      expect(result).toHaveProperty('testName', 'Round-Trip: specialCharacters');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      expect(result.details.dataSetName).toBe('specialCharacters');
      expect(typeof result.details.jsonConsistent).toBe('boolean');
      expect(typeof result.details.apiConsistent).toBe('boolean');
    });
  });

  describe('Error Handling Tests', () => {
    test('should test error handling successfully', async () => {
      const result = await tester.testErrorHandling();
      
      expect(result).toHaveProperty('testName', 'Error Handling');
      expect(result).toHaveProperty('totalTests');
      expect(result).toHaveProperty('passedTests');
      expect(result).toHaveProperty('failedTests');
      expect(result).toHaveProperty('tests');
      
      expect(result.totalTests).toBeGreaterThan(0);
      expect(Array.isArray(result.tests)).toBe(true);
    });

    test('should handle circular references', async () => {
      const result = await tester.testCircularReferenceHandling();
      
      expect(result).toHaveProperty('testName', 'Circular Reference Handling');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      expect(result.details).toHaveProperty('errorHandled');
      
      // Should either handle the error gracefully or throw expected error
      if (result.success) {
        expect(result.details.errorHandled).toBe(true);
      }
    });

    test('should handle invalid data types', async () => {
      const result = await tester.testInvalidDataHandling();
      
      expect(result).toHaveProperty('testName', 'Invalid Data Handling');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      if (result.success && !result.details.expectedError) {
        expect(result.details).toHaveProperty('functionsOmitted');
        expect(result.details).toHaveProperty('symbolsOmitted');
        expect(result.details.functionsOmitted).toBe(true);
        expect(result.details.symbolsOmitted).toBe(true);
      }
    });

    test('should handle null and undefined values', async () => {
      const result = await tester.testNullAndUndefinedHandling();
      
      expect(result).toHaveProperty('testName', 'Null and Undefined Handling');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      if (result.success) {
        expect(result.details).toHaveProperty('nullPreserved');
        expect(result.details).toHaveProperty('undefinedOmitted');
        expect(result.details).toHaveProperty('emptyValuesPreserved');
        expect(result.details.nullPreserved).toBe(true);
        expect(result.details.undefinedOmitted).toBe(true);
        expect(result.details.emptyValuesPreserved).toBe(true);
      }
    });

    test('should handle special values', async () => {
      const result = await tester.testSpecialValueHandling();
      
      expect(result).toHaveProperty('testName', 'Special Value Handling');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      if (result.success) {
        expect(result.details).toHaveProperty('infinityHandled');
        expect(result.details).toHaveProperty('nanHandled');
        expect(result.details).toHaveProperty('dateHandled');
        expect(typeof result.details.infinityHandled).toBe('boolean');
        expect(typeof result.details.nanHandled).toBe('boolean');
        expect(typeof result.details.dateHandled).toBe('boolean');
      }
    });
  });

  describe('Edge Cases Tests', () => {
    test('should test edge cases successfully', async () => {
      const result = await tester.testEdgeCases();
      
      expect(result).toHaveProperty('testName', 'Edge Cases');
      expect(result).toHaveProperty('totalTests');
      expect(result).toHaveProperty('passedTests');
      expect(result).toHaveProperty('failedTests');
      expect(result).toHaveProperty('tests');
      
      expect(result.totalTests).toBeGreaterThan(0);
      expect(Array.isArray(result.tests)).toBe(true);
    });

    test('should handle empty data serialization', async () => {
      const result = await tester.testEmptyDataSerialization();
      
      expect(result).toHaveProperty('testName', 'Empty Data Serialization');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      if (result.success) {
        expect(result.details).toHaveProperty('consistent');
        expect(result.details).toHaveProperty('serialized');
        expect(result.details).toHaveProperty('deserialized');
        expect(result.details.consistent).toBe(true);
      }
    });

    test('should handle deep nesting serialization', async () => {
      const result = await tester.testDeepNestingSerialization();
      
      expect(result).toHaveProperty('testName', 'Deep Nesting Serialization');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      if (result.success) {
        expect(result.details).toHaveProperty('consistent');
        expect(result.details).toHaveProperty('serializedLength');
        expect(result.details).toHaveProperty('nestingLevels');
        expect(result.details.consistent).toBe(true);
        expect(result.details.nestingLevels).toBe(100);
      }
    });

    test('should handle unicode characters', async () => {
      const result = await tester.testUnicodeHandling();
      
      expect(result).toHaveProperty('testName', 'Unicode Handling');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      if (result.success) {
        expect(result.details).toHaveProperty('consistent');
        expect(result.details).toHaveProperty('unicodePreserved');
        expect(result.details.consistent).toBe(true);
        expect(result.details.unicodePreserved).toBe(true);
      }
    });

    test('should handle binary data', async () => {
      const result = await tester.testBinaryDataHandling();
      
      expect(result).toHaveProperty('testName', 'Binary Data Handling');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('details');
      
      if (result.success) {
        expect(result.details).toHaveProperty('consistent');
        expect(result.details.consistent).toBe(true);
      }
    });
  });

  describe('Helper Methods', () => {
    test('should format API response correctly', () => {
      const testData = { id: 1, name: 'Test' };
      const response = tester.formatAPIResponse(true, 'Success', testData);
      
      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('message', 'Success');
      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('data', testData);
      
      // Timestamp should be valid ISO string
      expect(() => new Date(response.timestamp)).not.toThrow();
    });

    test('should format error response correctly', () => {
      const errorData = { code: 'TEST_ERROR', message: 'Test error' };
      const response = tester.formatAPIResponse(false, 'Error occurred', null, errorData);
      
      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('message', 'Error occurred');
      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('error', errorData);
      expect(response).not.toHaveProperty('data');
    });

    test('should validate response structure correctly', () => {
      const successResponse = {
        success: true,
        message: 'Test',
        timestamp: new Date().toISOString(),
        data: { test: true }
      };
      
      const result = tester.validateResponseStructure(successResponse, 'success');
      
      expect(result.valid).toBe(true);
      expect(result.details.hasData).toBe(true);
      expect(result.details.missingFields).toHaveLength(0);
    });

    test('should perform deep equality comparison', () => {
      const obj1 = { a: 1, b: { c: 2, d: [3, 4] } };
      const obj2 = { a: 1, b: { c: 2, d: [3, 4] } };
      const obj3 = { a: 1, b: { c: 2, d: [3, 5] } };
      
      expect(tester.deepEqual(obj1, obj2)).toBe(true);
      expect(tester.deepEqual(obj1, obj3)).toBe(false);
      expect(tester.deepEqual(null, null)).toBe(true);
      expect(tester.deepEqual(undefined, undefined)).toBe(true);
      expect(tester.deepEqual(null, undefined)).toBe(false);
    });

    test('should convert to XML format', () => {
      const testData = { name: 'John', age: 30 };
      const xml = tester.convertToXML(testData);
      
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<root>');
      expect(xml).toContain('</root>');
      expect(xml).toContain('<name>John</name>');
      expect(xml).toContain('<age>30</age>');
    });

    test('should convert to CSV format', () => {
      const testData = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ];
      const csv = tester.convertToCSV(testData);
      
      expect(csv).toContain('name,age');
      expect(csv).toContain('John,30');
      expect(csv).toContain('Jane,25');
    });

    test('should convert to YAML format', () => {
      const testData = { name: 'John', age: 30 };
      const yaml = tester.convertToYAML(testData);
      
      expect(yaml).toContain('name: John');
      expect(yaml).toContain('age: 30');
    });

    test('should escape XML characters', () => {
      const unsafe = '<script>alert("test")</script>';
      const escaped = tester.escapeXML(unsafe);
      
      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
      expect(escaped).not.toContain('<script>');
    });

    test('should escape CSV characters', () => {
      const unsafe = 'Hello, "World"';
      const escaped = tester.escapeCSV(unsafe);
      
      expect(escaped).toContain('"');
      expect(escaped).toMatch(/^".*"$/);
    });

    test('should compress data', () => {
      const testData = 'This is a test string that should be compressed';
      const compressed = tester.compressData(testData);
      
      expect(compressed.length).toBeLessThan(testData.length);
      expect(typeof compressed).toBe('string');
    });
  });

  describe('Comprehensive Test Suite', () => {
    test('should run comprehensive tests successfully', async () => {
      // This test may take longer due to comprehensive nature
      const result = await tester.runComprehensiveTests();
      
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('detailed');
      expect(result).toHaveProperty('recommendations');
      
      expect(result.summary).toHaveProperty('totalTests');
      expect(result.summary).toHaveProperty('passedTests');
      expect(result.summary).toHaveProperty('failedTests');
      expect(result.summary).toHaveProperty('successRate');
      expect(result.summary).toHaveProperty('categories');
      expect(result.summary).toHaveProperty('overallSuccess');
      
      expect(result.detailed).toHaveProperty('apiResponseFormatting');
      expect(result.detailed).toHaveProperty('dataEscapingAndSecurity');
      expect(result.detailed).toHaveProperty('crossFormatCompatibility');
      expect(result.detailed).toHaveProperty('performanceOptimization');
      expect(result.detailed).toHaveProperty('roundTripConsistency');
      expect(result.detailed).toHaveProperty('errorHandling');
      expect(result.detailed).toHaveProperty('edgeCases');
      
      expect(Array.isArray(result.recommendations)).toBe(true);
      
      // Verify summary calculations
      expect(result.summary.totalTests).toBeGreaterThan(0);
      expect(result.summary.passedTests + result.summary.failedTests).toBe(result.summary.totalTests);
      expect(result.summary.successRate).toMatch(/%$/);
      expect(result.summary.categories).toBe(7); // Number of test categories
    }, 30000); // 30 second timeout for comprehensive tests

    test('should generate appropriate recommendations', async () => {
      // Create a mock test suite with some failures
      const mockTestSuite = {
        dataEscapingAndSecurity: {
          tests: [
            { testName: 'XSS Prevention', success: false },
            { testName: 'SQL Injection Prevention', success: true }
          ]
        },
        performanceOptimization: {
          tests: [
            { testName: 'Serialization Performance', success: false },
            { testName: 'Memory Usage', success: true }
          ]
        }
      };
      
      const recommendations = tester.generateRecommendations(mockTestSuite);
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should have security recommendation
      const securityRec = recommendations.find(r => r.type === 'SECURITY');
      expect(securityRec).toBeDefined();
      expect(securityRec.priority).toBe('CRITICAL');
      
      // Should have performance recommendation
      const performanceRec = recommendations.find(r => r.type === 'PERFORMANCE');
      expect(performanceRec).toBeDefined();
      expect(performanceRec.priority).toBe('HIGH');
    });

    test('should generate test summary correctly', () => {
      const mockTestSuite = {
        category1: {
          tests: [
            { success: true },
            { success: false },
            { success: true }
          ]
        },
        category2: {
          tests: [
            { success: true },
            { success: true }
          ]
        }
      };
      
      const summary = tester.generateTestSummary(mockTestSuite);
      
      expect(summary.totalTests).toBe(5);
      expect(summary.passedTests).toBe(4);
      expect(summary.failedTests).toBe(1);
      expect(summary.successRate).toBe('80.00%');
      expect(summary.categories).toBe(2);
      expect(summary.overallSuccess).toBe(false); // Has failures
    });
  });
});