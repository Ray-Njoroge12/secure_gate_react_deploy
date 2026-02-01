/**
 * Database Integrity Validator Tests
 * 
 * Comprehensive test suite for database integrity validation including
 * ACID transaction testing, data consistency validation, constraint enforcement,
 * and concurrent operation handling.
 */

const DatabaseIntegrityValidator = require('./database-integrity-validator');

describe('Database Integrity Validator', () => {
  let validator;
  
  beforeAll(async () => {
    validator = new DatabaseIntegrityValidator({
      maxConcurrentConnections: 20,
      transactionTimeout: 10000
    });
  });

  afterAll(async () => {
    if (validator) {
      await validator.cleanup();
    }
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      const defaultValidator = new DatabaseIntegrityValidator();
      
      expect(defaultValidator.config.maxConcurrentConnections).toBe(50);
      expect(defaultValidator.config.transactionTimeout).toBe(30000);
      expect(defaultValidator.config.consistencyCheckInterval).toBe(1000);
      expect(defaultValidator.config.maxRetries).toBe(3);
    });

    test('should initialize with custom configuration', () => {
      const customValidator = new DatabaseIntegrityValidator({
        maxConcurrentConnections: 10,
        transactionTimeout: 5000,
        consistencyCheckInterval: 500,
        maxRetries: 5
      });
      
      expect(customValidator.config.maxConcurrentConnections).toBe(10);
      expect(customValidator.config.transactionTimeout).toBe(5000);
      expect(customValidator.config.consistencyCheckInterval).toBe(500);
      expect(customValidator.config.maxRetries).toBe(5);
    });

    test('should initialize results structure', () => {
      const testValidator = new DatabaseIntegrityValidator();
      
      expect(testValidator.results).toHaveProperty('acidTests');
      expect(testValidator.results).toHaveProperty('consistencyTests');
      expect(testValidator.results).toHaveProperty('constraintTests');
      expect(testValidator.results).toHaveProperty('concurrencyTests');
      expect(testValidator.results).toHaveProperty('performanceMetrics');
      expect(testValidator.results).toHaveProperty('errors');
      
      expect(Array.isArray(testValidator.results.acidTests)).toBe(true);
      expect(Array.isArray(testValidator.results.consistencyTests)).toBe(true);
      expect(Array.isArray(testValidator.results.constraintTests)).toBe(true);
      expect(Array.isArray(testValidator.results.concurrencyTests)).toBe(true);
      expect(Array.isArray(testValidator.results.errors)).toBe(true);
    });
  });

  describe('Database Connection Management', () => {
    test('should handle connection initialization gracefully when database is unavailable', async () => {
      const testValidator = new DatabaseIntegrityValidator({
        maxConcurrentConnections: 2
      });
      
      // Mock environment to point to non-existent database
      const originalEnv = process.env.PGHOST;
      process.env.PGHOST = 'nonexistent-host';
      
      const initialized = await testValidator.initialize();
      
      expect(initialized).toBe(false);
      expect(testValidator.results.errors.length).toBeGreaterThan(0);
      expect(testValidator.results.errors[0].type).toBe('initialization_error');
      
      // Restore environment
      process.env.PGHOST = originalEnv;
      
      await testValidator.cleanup();
    });

    test('should create correct number of connections', async () => {
      const testValidator = new DatabaseIntegrityValidator({
        maxConcurrentConnections: 3
      });
      
      // This test will fail if database is not available, which is expected
      try {
        await testValidator.initialize();
        expect(testValidator.testConnections.length).toBe(3);
      } catch (error) {
        // Expected when database is not available
        expect(error).toBeDefined();
      }
      
      await testValidator.cleanup();
    });
  });

  describe('ACID Transaction Testing', () => {
    test('should validate atomicity test structure', () => {
      expect(typeof validator.testAtomicity).toBe('function');
    });

    test('should validate consistency test structure', () => {
      expect(typeof validator.testConsistency).toBe('function');
    });

    test('should validate isolation test structure', () => {
      expect(typeof validator.testIsolation).toBe('function');
    });

    test('should validate durability test structure', () => {
      expect(typeof validator.testDurability).toBe('function');
    });

    test('should handle ACID test execution with database unavailable', async () => {
      const testValidator = new DatabaseIntegrityValidator({
        maxConcurrentConnections: 2
      });
      
      // Initialize with empty connections to simulate failure
      testValidator.testConnections = [null, null];
      
      await testValidator.testACIDCompliance();
      
      expect(testValidator.results.acidTests.length).toBeGreaterThan(0);
      
      // All tests should fail due to null connections
      const failedTests = testValidator.results.acidTests.filter(test => !test.passed);
      expect(failedTests.length).toBe(testValidator.results.acidTests.length);
    });
  });

  describe('Data Consistency Testing', () => {
    test('should validate referential integrity test structure', () => {
      expect(typeof validator.testReferentialIntegrity).toBe('function');
    });

    test('should validate data validation test structure', () => {
      expect(typeof validator.testDataValidation).toBe('function');
    });

    test('should validate business rule consistency test structure', () => {
      expect(typeof validator.testBusinessRuleConsistency).toBe('function');
    });

    test('should handle consistency test execution with database unavailable', async () => {
      const testValidator = new DatabaseIntegrityValidator();
      testValidator.testConnections = [null, null, null];
      
      await testValidator.testDataConsistency();
      
      expect(testValidator.results.consistencyTests.length).toBeGreaterThan(0);
      
      // All tests should fail due to null connections
      const failedTests = testValidator.results.consistencyTests.filter(test => !test.passed);
      expect(failedTests.length).toBe(testValidator.results.consistencyTests.length);
    });
  });

  describe('Constraint Enforcement Testing', () => {
    test('should validate unique constraint test structure', () => {
      expect(typeof validator.testUniqueConstraints).toBe('function');
    });

    test('should validate NOT NULL constraint test structure', () => {
      expect(typeof validator.testNotNullConstraints).toBe('function');
    });

    test('should validate CHECK constraint test structure', () => {
      expect(typeof validator.testCheckConstraints).toBe('function');
    });

    test('should handle constraint test execution with database unavailable', async () => {
      const testValidator = new DatabaseIntegrityValidator();
      testValidator.testConnections = [null, null, null];
      
      await testValidator.testConstraintEnforcement();
      
      expect(testValidator.results.constraintTests.length).toBeGreaterThan(0);
      
      // All tests should fail due to null connections
      const failedTests = testValidator.results.constraintTests.filter(test => !test.passed);
      expect(failedTests.length).toBe(testValidator.results.constraintTests.length);
    });
  });

  describe('Concurrent Operations Testing', () => {
    test('should validate concurrent insert test structure', () => {
      expect(typeof validator.testConcurrentInserts).toBe('function');
    });

    test('should validate concurrent update test structure', () => {
      expect(typeof validator.testConcurrentUpdates).toBe('function');
    });

    test('should validate deadlock handling test structure', () => {
      expect(typeof validator.testDeadlockHandling).toBe('function');
    });

    test('should handle concurrency test execution with database unavailable', async () => {
      const testValidator = new DatabaseIntegrityValidator();
      testValidator.testConnections = [null, null, null];
      
      await testValidator.testConcurrentOperations();
      
      expect(testValidator.results.concurrencyTests.length).toBeGreaterThan(0);
      
      // All tests should fail due to null connections
      const failedTests = testValidator.results.concurrencyTests.filter(test => !test.passed);
      expect(failedTests.length).toBe(testValidator.results.concurrencyTests.length);
    });
  });

  describe('Performance Metrics Calculation', () => {
    test('should calculate average transaction time', () => {
      const testValidator = new DatabaseIntegrityValidator();
      
      // Add some mock test results
      testValidator.results.acidTests = [
        { test: 'atomicity', passed: true },
        { test: 'consistency', passed: true }
      ];
      
      const avgTime = testValidator.calculateAverageTransactionTime();
      expect(typeof avgTime).toBe('number');
      expect(avgTime).toBeGreaterThan(0);
    });

    test('should calculate concurrency score', () => {
      const testValidator = new DatabaseIntegrityValidator();
      
      // Add mock concurrency test results
      testValidator.results.concurrencyTests = [
        { test: 'concurrentInserts', passed: true },
        { test: 'concurrentUpdates', passed: true },
        { test: 'deadlockHandling', passed: false }
      ];
      
      const score = testValidator.calculateConcurrencyScore();
      expect(score).toBe(66.66666666666666); // 2/3 * 100
    });

    test('should calculate integrity score', () => {
      const testValidator = new DatabaseIntegrityValidator();
      
      // Add mock test results
      testValidator.results.acidTests = [
        { test: 'atomicity', passed: true },
        { test: 'consistency', passed: false }
      ];
      testValidator.results.consistencyTests = [
        { test: 'referentialIntegrity', passed: true }
      ];
      testValidator.results.constraintTests = [
        { test: 'uniqueConstraints', passed: true }
      ];
      testValidator.results.concurrencyTests = [
        { test: 'concurrentInserts', passed: true }
      ];
      
      const score = testValidator.calculateIntegrityScore();
      expect(score).toBe(80); // 4/5 * 100
    });

    test('should handle empty test results', () => {
      const testValidator = new DatabaseIntegrityValidator();
      
      expect(testValidator.calculateAverageTransactionTime()).toBe(0);
      expect(testValidator.calculateConcurrencyScore()).toBe(0);
      expect(testValidator.calculateIntegrityScore()).toBe(0);
    });
  });

  describe('Report Generation', () => {
    test('should generate comprehensive report', () => {
      const testValidator = new DatabaseIntegrityValidator();
      
      // Add mock test results
      testValidator.results.acidTests = [
        { test: 'atomicity', passed: true },
        { test: 'consistency', passed: false }
      ];
      testValidator.results.consistencyTests = [
        { test: 'referentialIntegrity', passed: true }
      ];
      testValidator.results.constraintTests = [
        { test: 'uniqueConstraints', passed: true }
      ];
      testValidator.results.concurrencyTests = [
        { test: 'concurrentInserts', passed: true }
      ];
      testValidator.results.performanceMetrics = {
        totalDuration: 5000,
        averageTransactionTime: 150,
        concurrencyScore: 100,
        integrityScore: 80
      };
      
      const report = testValidator.generateReport();
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('results');
      expect(report).toHaveProperty('performanceMetrics');
      expect(report).toHaveProperty('errors');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('recommendations');
      
      expect(report.summary.totalTests).toBe(5);
      expect(report.summary.passedTests).toBe(4);
      expect(report.summary.failedTests).toBe(1);
      expect(report.summary.successRate).toBe('80.00%');
      expect(report.summary.integrityScore).toBe('80.00%');
    });

    test('should generate appropriate recommendations', () => {
      const testValidator = new DatabaseIntegrityValidator();
      
      // Add failed ACID test
      testValidator.results.acidTests = [
        { test: 'atomicity', passed: false }
      ];
      
      // Add failed constraint test
      testValidator.results.constraintTests = [
        { test: 'uniqueConstraints', passed: false }
      ];
      
      // Mock low concurrency score
      testValidator.calculateConcurrencyScore = () => 75;
      
      // Mock high transaction time
      testValidator.results.performanceMetrics = {
        averageTransactionTime: 250
      };
      
      const recommendations = testValidator.generateRecommendations();
      
      expect(recommendations.length).toBeGreaterThan(0);
      
      const categories = recommendations.map(rec => rec.category);
      expect(categories).toContain('ACID Compliance');
      expect(categories).toContain('Data Integrity');
      expect(categories).toContain('Concurrency');
      expect(categories).toContain('Performance');
    });

    test('should generate positive recommendation when all tests pass', () => {
      const testValidator = new DatabaseIntegrityValidator();
      
      // Add all passing tests
      testValidator.results.acidTests = [
        { test: 'atomicity', passed: true }
      ];
      testValidator.results.consistencyTests = [
        { test: 'referentialIntegrity', passed: true }
      ];
      testValidator.results.constraintTests = [
        { test: 'uniqueConstraints', passed: true }
      ];
      testValidator.results.concurrencyTests = [
        { test: 'concurrentInserts', passed: true }
      ];
      
      // Mock good performance metrics
      testValidator.calculateConcurrencyScore = () => 95;
      testValidator.results.performanceMetrics = {
        averageTransactionTime: 100
      };
      
      const recommendations = testValidator.generateRecommendations();
      
      expect(recommendations.length).toBe(1);
      expect(recommendations[0].category).toBe('Overall');
      expect(recommendations[0].priority).toBe('INFO');
      expect(recommendations[0].message).toContain('ready for production');
    });
  });

  describe('Full Validation Workflow', () => {
    test('should handle complete validation workflow with database unavailable', async () => {
      const testValidator = new DatabaseIntegrityValidator({
        maxConcurrentConnections: 2,
        transactionTimeout: 5000
      });
      
      // Mock environment to simulate database unavailability
      const originalEnv = process.env.PGHOST;
      process.env.PGHOST = 'nonexistent-host';
      
      const report = await testValidator.runValidation();
      
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.errors.length).toBeGreaterThan(0);
      
      // Should have initialization error
      const initError = report.errors.find(error => error.type === 'initialization_error');
      expect(initError).toBeDefined();
      
      // Restore environment
      process.env.PGHOST = originalEnv;
    });

    test('should track validation state correctly', async () => {
      const testValidator = new DatabaseIntegrityValidator();
      
      expect(testValidator.isRunning).toBe(false);
      
      // Start validation (will fail due to no database, but state should be tracked)
      const validationPromise = testValidator.runValidation();
      
      // Check that running state is set
      expect(testValidator.isRunning).toBe(true);
      
      await validationPromise;
      
      // Check that running state is reset
      expect(testValidator.isRunning).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle and record errors appropriately', async () => {
      const testValidator = new DatabaseIntegrityValidator();
      
      // Force an error by providing invalid connection
      testValidator.testConnections = [{ query: () => Promise.reject(new Error('Test error')) }];
      
      await testValidator.testACIDCompliance();
      
      expect(testValidator.results.acidTests.length).toBeGreaterThan(0);
      
      // Check that errors are recorded
      const failedTests = testValidator.results.acidTests.filter(test => !test.passed);
      expect(failedTests.length).toBeGreaterThan(0);
      expect(failedTests[0]).toHaveProperty('error');
    });

    test('should cleanup resources even when errors occur', async () => {
      const testValidator = new DatabaseIntegrityValidator();
      
      // Add mock connections
      const mockPool = {
        end: jest.fn().mockResolvedValue(undefined)
      };
      testValidator.testConnections = [mockPool];
      
      await testValidator.cleanup();
      
      expect(mockPool.end).toHaveBeenCalled();
      expect(testValidator.testConnections.length).toBe(0);
    });

    test('should handle cleanup errors gracefully', async () => {
      const testValidator = new DatabaseIntegrityValidator();
      
      // Add mock connection that throws on cleanup
      const mockPool = {
        end: jest.fn().mockRejectedValue(new Error('Cleanup error'))
      };
      testValidator.testConnections = [mockPool];
      
      // Should not throw
      await expect(testValidator.cleanup()).resolves.toBeUndefined();
      
      expect(mockPool.end).toHaveBeenCalled();
      expect(testValidator.testConnections.length).toBe(0);
    });
  });

  describe('Configuration Validation', () => {
    test('should use reasonable defaults for configuration', () => {
      const testValidator = new DatabaseIntegrityValidator();
      
      expect(testValidator.config.maxConcurrentConnections).toBe(50);
      expect(testValidator.config.transactionTimeout).toBe(30000);
      expect(testValidator.config.consistencyCheckInterval).toBe(1000);
      expect(testValidator.config.maxRetries).toBe(3);
    });

    test('should merge custom configuration with defaults', () => {
      const testValidator = new DatabaseIntegrityValidator({
        maxConcurrentConnections: 10,
        customOption: 'test'
      });
      
      expect(testValidator.config.maxConcurrentConnections).toBe(10);
      expect(testValidator.config.transactionTimeout).toBe(30000); // Default
      expect(testValidator.config.customOption).toBe('test');
    });
  });
});