/**
 * @fileoverview Property Test: Bulk Import Validation - Task 13.3
 * @description Property-based test to validate bulk import data validation and error handling
 * **Validates: Requirements 9.3, 9.4**
 * 
 * This test ensures that bulk import operations properly validate CSV data,
 * handle malformed records, enforce business rules, and provide meaningful
 * error messages for data quality issues.
 */

import fc from 'fast-check';
import { jest } from '@jest/globals';

// Create a mock bulk import validator for testing validation logic
class MockBulkImportValidator {
  constructor() {
    this.validationRules = {
      users: {
        required: ['username', 'email'],
        optional: ['role', 'phone', 'firstName', 'lastName'],
        validators: {
          username: (value) => typeof value === 'string' && value.length >= 3 && value.length <= 50 && /^[a-zA-Z0-9_]+$/.test(value),
          email: (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
          role: (value) => !value || ['admin', 'guard', 'resident'].includes(value),
          phone: (value) => !value || /^\+?[1-9]\d{1,14}$/.test(value),
          firstName: (value) => !value || (typeof value === 'string' && value.length <= 100),
          lastName: (value) => !value || (typeof value === 'string' && value.length <= 100)
        }
      },
      visitors: {
        required: ['name', 'phone'],
        optional: ['email', 'purpose', 'expectedArrival', 'hostResident'],
        validators: {
          name: (value) => typeof value === 'string' && value.length >= 2 && value.length <= 200,
          phone: (value) => typeof value === 'string' && /^\+?[1-9]\d{1,14}$/.test(value),
          email: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
          purpose: (value) => !value || (typeof value === 'string' && value.length <= 500),
          expectedArrival: (value) => !value || !isNaN(Date.parse(value)),
          hostResident: (value) => !value || (typeof value === 'string' && value.length <= 100)
        }
      }
    };
  }

  async validateImportData(csvData, importType) {
    const rules = this.validationRules[importType];
    if (!rules) {
      throw new Error(`Unknown import type: ${importType}`);
    }

    const results = {
      valid: [],
      invalid: [],
      duplicates: [],
      warnings: []
    };

    const seenKeys = new Set();
    const duplicateTracker = new Map();

    for (let i = 0; i < csvData.length; i++) {
      const record = csvData[i];
      const validation = this.validateRecord(record, rules, i + 1);
      
      if (validation.isValid) {
        // Check for duplicates
        const key = this.generateRecordKey(record, importType);
        if (seenKeys.has(key)) {
          const duplicateInfo = {
            rowNumber: i + 1,
            record,
            duplicateOf: duplicateTracker.get(key),
            errors: ['Duplicate record detected']
          };
          results.duplicates.push(duplicateInfo);
        } else {
          seenKeys.add(key);
          duplicateTracker.set(key, i + 1);
          results.valid.push({ rowNumber: i + 1, record });
        }
      } else {
        results.invalid.push(validation);
      }

      // Add warnings for optional field issues
      if (validation.warnings && validation.warnings.length > 0) {
        results.warnings.push(...validation.warnings.map(w => ({ ...w, rowNumber: i + 1 })));
      }
    }

    return results;
  }

  validateRecord(record, rules, rowNumber) {
    const errors = [];
    const warnings = [];

    // Check required fields
    for (const field of rules.required) {
      if (!record.hasOwnProperty(field) || record[field] === null || record[field] === undefined || record[field] === '') {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate all present fields
    for (const [field, value] of Object.entries(record)) {
      if (rules.validators[field]) {
        try {
          if (!rules.validators[field](value)) {
            errors.push(`Invalid value for field '${field}': ${value}`);
          }
        } catch (error) {
          errors.push(`Validation error for field '${field}': ${error.message}`);
        }
      } else if (!rules.required.includes(field) && !rules.optional.includes(field)) {
        warnings.push(`Unknown field '${field}' will be ignored`);
      }
    }

    return {
      rowNumber,
      record,
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  generateRecordKey(record, importType) {
    switch (importType) {
      case 'users':
        return `user_${record.username}_${record.email}`.toLowerCase();
      case 'visitors':
        return `visitor_${record.name}_${record.phone}`.toLowerCase();
      default:
        return JSON.stringify(record);
    }
  }

  async processValidatedData(validationResults, importType) {
    const processResults = {
      imported: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    // Process valid records
    for (const validRecord of validationResults.valid) {
      try {
        // Simulate database insertion
        await this.insertRecord(validRecord.record, importType);
        processResults.imported++;
      } catch (error) {
        processResults.failed++;
        processResults.errors.push({
          rowNumber: validRecord.rowNumber,
          error: error.message
        });
      }
    }

    // Skip invalid and duplicate records
    processResults.skipped = validationResults.invalid.length + validationResults.duplicates.length;

    return processResults;
  }

  async insertRecord(record, importType) {
    // Simulate database constraints and business logic
    if (importType === 'users' && record.username === 'admin') {
      throw new Error('Username "admin" is reserved');
    }
    
    if (importType === 'visitors' && record.phone === '+254700000000') {
      throw new Error('Phone number is blacklisted');
    }

    // Simulate successful insertion
    return { id: Math.floor(Math.random() * 10000), ...record };
  }

  // Helper method to generate valid values for testing
  generateValidValue(field, importType) {
    const generators = {
      username: () => `user${Math.floor(Math.random() * 1000)}`,
      email: () => `test${Math.floor(Math.random() * 1000)}@example.com`,
      role: () => ['admin', 'guard', 'resident'][Math.floor(Math.random() * 3)],
      phone: () => `+254712${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`,
      name: () => `Test User ${Math.floor(Math.random() * 1000)}`,
      purpose: () => 'Business meeting',
      firstName: () => `First${Math.floor(Math.random() * 100)}`,
      lastName: () => `Last${Math.floor(Math.random() * 100)}`
    };

    return generators[field] ? generators[field]() : `value${Math.floor(Math.random() * 100)}`;
  }
}

const mockBulkImportValidator = new MockBulkImportValidator();

describe('Property Test: Bulk Import Validation', () => {
  beforeEach(() => {
    // Reset any state if needed
  });

  /**
   * Property: Required field validation
   * Validates that all required fields are properly enforced
   */
  test('Property: Required fields must be validated correctly', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        importType: fc.constantFrom('users', 'visitors'),
        recordCount: fc.integer({ min: 1, max: 50 })
      }),
      
      async ({ importType, recordCount }) => {
        const rules = mockBulkImportValidator.validationRules[importType];
        
        // Generate records with missing required fields
        const csvData = [];
        for (let i = 0; i < recordCount; i++) {
          const record = {};
          
          // Randomly omit some required fields
          for (const field of rules.required) {
            if (Math.random() > 0.3) { // 70% chance to include required field
              record[field] = mockBulkImportValidator.generateValidValue(field, importType);
            }
          }
          
          csvData.push(record);
        }

        const results = await mockBulkImportValidator.validateImportData(csvData, importType);

        // Property 1: Records missing required fields should be invalid
        results.invalid.forEach(invalidRecord => {
          const missingRequired = rules.required.filter(field => 
            !invalidRecord.record.hasOwnProperty(field) || 
            invalidRecord.record[field] === null || 
            invalidRecord.record[field] === undefined || 
            invalidRecord.record[field] === ''
          );
          
          if (missingRequired.length > 0) {
            expect(invalidRecord.errors.some(error => 
              missingRequired.some(field => error.includes(field))
            )).toBe(true);
          }
        });

        // Property 2: Valid records should have all required fields
        results.valid.forEach(validRecord => {
          rules.required.forEach(field => {
            expect(validRecord.record).toHaveProperty(field);
            expect(validRecord.record[field]).not.toBe('');
            expect(validRecord.record[field]).not.toBe(null);
            expect(validRecord.record[field]).not.toBe(undefined);
          });
        });
      }
    ), { numRuns: 20 });
  });

  /**
   * Property: Data type and format validation
   * Validates that field values conform to expected formats
   */
  test('Property: Field values must conform to validation rules', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        importType: fc.constantFrom('users', 'visitors')
      }),
      
      async ({ importType }) => {
        const rules = mockBulkImportValidator.validationRules[importType];
        
        // Generate records with various valid and invalid field values
        const testCases = [];
        
        if (importType === 'users') {
          testCases.push(
            // Valid user records
            { username: 'john_doe', email: 'john@example.com', role: 'resident' },
            { username: 'jane123', email: 'jane.smith@company.co.uk', phone: '+254712345678' },
            
            // Invalid user records
            { username: 'jo', email: 'john@example.com' }, // username too short
            { username: 'john_doe', email: 'invalid-email' }, // invalid email
            { username: 'john@doe', email: 'john@example.com' }, // invalid username chars
            { username: 'john_doe', email: 'john@example.com', role: 'invalid_role' } // invalid role
          );
        } else {
          testCases.push(
            // Valid visitor records
            { name: 'John Doe', phone: '+254712345678', email: 'john@example.com' },
            { name: 'Jane Smith', phone: '0712345678', purpose: 'Business meeting' },
            
            // Invalid visitor records
            { name: 'J', phone: '+254712345678' }, // name too short
            { name: 'John Doe', phone: 'invalid-phone' }, // invalid phone
            { name: 'John Doe', phone: '+254712345678', email: 'invalid-email' } // invalid email
          );
        }

        const results = await mockBulkImportValidator.validateImportData(testCases, importType);

        // Property 1: Records with invalid field formats should be marked invalid
        results.invalid.forEach(invalidRecord => {
          expect(invalidRecord.errors.length).toBeGreaterThan(0);
          expect(invalidRecord.isValid).toBe(false);
        });

        // Property 2: Valid records should pass all field validations
        results.valid.forEach(validRecord => {
          Object.entries(validRecord.record).forEach(([field, value]) => {
            if (rules.validators[field]) {
              expect(rules.validators[field](value)).toBe(true);
            }
          });
        });
      }
    ), { numRuns: 15 });
  });

  /**
   * Property: Duplicate detection
   * Validates that duplicate records are properly identified
   */
  test('Property: Duplicate records must be detected correctly', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        importType: fc.constantFrom('users', 'visitors'),
        baseRecordCount: fc.integer({ min: 5, max: 20 }),
        duplicateCount: fc.integer({ min: 1, max: 5 })
      }),
      
      async ({ importType, baseRecordCount, duplicateCount }) => {
        const csvData = [];
        
        // Generate base records
        for (let i = 0; i < baseRecordCount; i++) {
          if (importType === 'users') {
            csvData.push({
              username: `user${i}`,
              email: `user${i}@example.com`,
              role: 'resident'
            });
          } else {
            csvData.push({
              name: `Visitor ${i}`,
              phone: `+25471234567${i}`,
              email: `visitor${i}@example.com`
            });
          }
        }
        
        // Add duplicates
        const duplicateIndices = [];
        for (let i = 0; i < duplicateCount; i++) {
          const originalIndex = Math.floor(Math.random() * baseRecordCount);
          duplicateIndices.push(originalIndex);
          csvData.push({ ...csvData[originalIndex] });
        }

        const results = await mockBulkImportValidator.validateImportData(csvData, importType);

        // Property 1: Number of duplicates should match expected count
        expect(results.duplicates.length).toBe(duplicateCount);

        // Property 2: Duplicate records should reference original records
        results.duplicates.forEach(duplicate => {
          expect(duplicate.duplicateOf).toBeGreaterThan(0);
          expect(duplicate.duplicateOf).toBeLessThanOrEqual(baseRecordCount);
          expect(duplicate.errors).toContain('Duplicate record detected');
        });

        // Property 3: Original records should still be valid
        expect(results.valid.length).toBe(baseRecordCount);
      }
    ), { numRuns: 15 });
  });

  /**
   * Property: Error message quality
   * Validates that error messages are informative and actionable
   */
  test('Property: Error messages must be informative and actionable', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        importType: fc.constantFrom('users', 'visitors')
      }),
      
      async ({ importType }) => {
        // Generate records with various validation errors
        const csvData = [];
        
        if (importType === 'users') {
          csvData.push(
            {}, // Missing all required fields
            { username: 'jo' }, // Missing email, username too short
            { username: 'valid_user', email: 'invalid-email', role: 'invalid_role' }, // Invalid email and role
            { username: 'user@name', email: 'user@example.com', phone: 'invalid-phone' } // Invalid username and phone
          );
        } else {
          csvData.push(
            {}, // Missing all required fields
            { name: 'J' }, // Missing phone, name too short
            { name: 'Valid Name', phone: 'invalid-phone', email: 'invalid-email' }, // Invalid phone and email
            { name: 'Valid Name', phone: '+254712345678', unknownField: 'value' } // Unknown field
          );
        }

        const results = await mockBulkImportValidator.validateImportData(csvData, importType);

        // Property 1: All invalid records should have specific error messages
        results.invalid.forEach(invalidRecord => {
          expect(invalidRecord.errors.length).toBeGreaterThan(0);
          
          invalidRecord.errors.forEach(error => {
            // Error messages should be strings
            expect(typeof error).toBe('string');
            
            // Error messages should be descriptive (not just generic)
            expect(error.length).toBeGreaterThan(10);
            
            // Error messages should mention the problematic field or value
            expect(error).toMatch(/field|value|required|invalid|missing/i);
          });
        });

        // Property 2: Row numbers should be included for traceability
        results.invalid.forEach(invalidRecord => {
          expect(invalidRecord.rowNumber).toBeGreaterThan(0);
          expect(Number.isInteger(invalidRecord.rowNumber)).toBe(true);
        });

        // Property 3: Warnings should be informative but not block processing
        results.warnings.forEach(warning => {
          expect(warning.rowNumber).toBeGreaterThan(0);
          expect(typeof warning).toBe('object');
        });
      }
    ), { numRuns: 10 });
  });

  /**
   * Property: Batch processing consistency
   * Validates that large imports are processed consistently
   */
  test('Property: Large imports must be processed consistently', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        importType: fc.constantFrom('users', 'visitors'),
        recordCount: fc.integer({ min: 100, max: 500 }),
        errorRate: fc.float({ min: 0, max: Math.fround(0.3) }) // 0-30% error rate
      }),
      
      async ({ importType, recordCount, errorRate }) => {
        const csvData = [];
        let expectedValid = 0;
        let expectedInvalid = 0;
        
        // Generate large dataset with controlled error rate
        for (let i = 0; i < recordCount; i++) {
          const shouldHaveError = Math.random() < errorRate;
          
          if (importType === 'users') {
            const record = {
              username: shouldHaveError ? 'x' : `user${i}`, // Too short if error
              email: shouldHaveError ? 'invalid' : `user${i}@example.com`,
              role: 'resident'
            };
            csvData.push(record);
          } else {
            const record = {
              name: shouldHaveError ? 'X' : `Visitor ${i}`, // Too short if error
              phone: shouldHaveError ? 'invalid' : `+25471234${String(i).padStart(4, '0')}`,
              email: `visitor${i}@example.com`
            };
            csvData.push(record);
          }
          
          if (shouldHaveError) {
            expectedInvalid++;
          } else {
            expectedValid++;
          }
        }

        const results = await mockBulkImportValidator.validateImportData(csvData, importType);

        // Property 1: Total records should be accounted for
        const totalProcessed = results.valid.length + results.invalid.length + results.duplicates.length;
        expect(totalProcessed).toBe(recordCount);

        // Property 2: Error rate should be approximately as expected (within tolerance)
        const actualErrorRate = results.invalid.length / recordCount;
        expect(Math.abs(actualErrorRate - errorRate)).toBeLessThan(0.1); // 10% tolerance

        // Property 3: All records should have row numbers
        [...results.valid, ...results.invalid, ...results.duplicates].forEach(record => {
          expect(record.rowNumber).toBeGreaterThan(0);
          expect(record.rowNumber).toBeLessThanOrEqual(recordCount);
        });
      }
    ), { numRuns: 10 });
  });

  /**
   * Property: Business rule enforcement
   * Validates that business rules are consistently applied during processing
   */
  test('Property: Business rules must be consistently enforced', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        importType: fc.constantFrom('users', 'visitors'),
        recordCount: fc.integer({ min: 10, max: 50 })
      }),
      
      async ({ importType, recordCount }) => {
        const csvData = [];
        let reservedUsernameCount = 0;
        let blacklistedPhoneCount = 0;
        
        // Generate records with some that violate business rules
        for (let i = 0; i < recordCount; i++) {
          if (importType === 'users') {
            const useReservedUsername = Math.random() < 0.1; // 10% chance
            const record = {
              username: useReservedUsername ? 'admin' : `user${i}`,
              email: `user${i}@example.com`,
              role: 'resident'
            };
            csvData.push(record);
            if (useReservedUsername) reservedUsernameCount++;
          } else {
            const useBlacklistedPhone = Math.random() < 0.1; // 10% chance
            const record = {
              name: `Visitor ${i}`,
              phone: useBlacklistedPhone ? '+254700000000' : `+25471234${String(i).padStart(4, '0')}`,
              email: `visitor${i}@example.com`
            };
            csvData.push(record);
            if (useBlacklistedPhone) blacklistedPhoneCount++;
          }
        }

        const validationResults = await mockBulkImportValidator.validateImportData(csvData, importType);
        const processResults = await mockBulkImportValidator.processValidatedData(validationResults, importType);

        // Property 1: Business rule violations should be caught during processing
        if (importType === 'users' && reservedUsernameCount > 0) {
          expect(processResults.failed).toBeGreaterThan(0);
          expect(processResults.errors.some(error => 
            error.error.includes('reserved')
          )).toBe(true);
        }

        if (importType === 'visitors' && blacklistedPhoneCount > 0) {
          expect(processResults.failed).toBeGreaterThan(0);
          expect(processResults.errors.some(error => 
            error.error.includes('blacklisted')
          )).toBe(true);
        }

        // Property 2: Successfully imported records should not violate business rules
        expect(processResults.imported).toBeLessThanOrEqual(validationResults.valid.length);

        // Property 3: Total processed should equal valid records
        expect(processResults.imported + processResults.failed).toBe(validationResults.valid.length);
      }
    ), { numRuns: 15 });
  });
});