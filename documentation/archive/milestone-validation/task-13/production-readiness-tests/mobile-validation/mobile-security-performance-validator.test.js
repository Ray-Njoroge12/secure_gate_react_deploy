/**
 * Mobile Security and Performance Validator Tests
 * 
 * Comprehensive unit tests for mobile security and performance validation
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';
import MobileSecurityPerformanceValidator from './mobile-security-performance-validator.js';

describe('MobileSecurityPerformanceValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new MobileSecurityPerformanceValidator();
  });

  describe('Security Validation', () => {
    describe('validateSecurityMeasures', () => {
      test('should validate security measures for all platforms', async () => {
        const result = await validator.validateSecurityMeasures('all');

        assert.ok(result.ios, 'Should have iOS results');
        assert.ok(result.android, 'Should have Android results');
        assert.ok(result.pwa, 'Should have PWA results');

        // Check that each platform has all security categories
        for (const platform of ['ios', 'android', 'pwa']) {
          assert.ok(result[platform].encryption, `${platform} should have encryption results`);
          assert.ok(result[platform].authentication, `${platform} should have authentication results`);
          assert.ok(result[platform].dataProtection, `${platform} should have dataProtection results`);
          assert.ok(result[platform].networkSecurity, `${platform} should have networkSecurity results`);
          assert.ok(result[platform].runtimeProtection, `${platform} should have runtimeProtection results`);
        }
      });

      test('should validate security measures for specific platform', async () => {
        const result = await validator.validateSecurityMeasures('ios');

        assert.ok(result.ios, 'Should have iOS results');
        assert.ok(!result.android, 'Should not have Android results');
        assert.ok(!result.pwa, 'Should not have PWA results');
      });
    });

    describe('validateEncryption', () => {
      test('should validate data encryption successfully', async () => {
        const result = await validator.validateEncryption('ios');

        assert.ok(result.passed > 0, 'Should have passed tests');
        assert.ok(Array.isArray(result.tests), 'Should have tests array');
        
        const encryptionTest = result.tests.find(test => 
          test.name === 'Data encryption at rest'
        );
        assert.ok(encryptionTest, 'Should have encryption test');
        assert.strictEqual(encryptionTest.platform, 'ios');
      });

      test('should validate key derivation strength', async () => {
        const result = await validator.validateEncryption('android');

        const keyTest = result.tests.find(test => 
          test.name === 'Key derivation strength'
        );
        assert.ok(keyTest, 'Should have key derivation test');
        assert.strictEqual(keyTest.platform, 'android');
      });
    });

    describe('validateAuthentication', () => {
      test('should validate biometric authentication', async () => {
        const result = await validator.validateAuthentication('ios');

        const biometricTest = result.tests.find(test => 
          test.name === 'Biometric authentication'
        );
        assert.ok(biometricTest, 'Should have biometric authentication test');
        assert.strictEqual(biometricTest.platform, 'ios');
      });

      test('should validate token security', async () => {
        const result = await validator.validateAuthentication('android');

        const tokenTest = result.tests.find(test => 
          test.name === 'Token security'
        );
        assert.ok(tokenTest, 'Should have token security test');
        assert.strictEqual(tokenTest.platform, 'android');
      });

      test('should validate MFA implementation', async () => {
        const result = await validator.validateAuthentication('pwa');

        const mfaTest = result.tests.find(test => 
          test.name === 'Multi-factor authentication'
        );
        assert.ok(mfaTest, 'Should have MFA test');
        assert.strictEqual(mfaTest.platform, 'pwa');
      });
    });
  });

  describe('Performance Validation', () => {
    describe('validatePerformanceBenchmarks', () => {
      test('should validate performance for all device categories', async () => {
        const result = await validator.validatePerformanceBenchmarks('all');

        assert.ok(result.lowEnd, 'Should have low-end results');
        assert.ok(result.midRange, 'Should have mid-range results');
        assert.ok(result.highEnd, 'Should have high-end results');

        // Check that each category has all performance metrics
        for (const category of ['lowEnd', 'midRange', 'highEnd']) {
          assert.ok(result[category].startup, `${category} should have startup results`);
          assert.ok(result[category].memory, `${category} should have memory results`);
          assert.ok(result[category].cpu, `${category} should have CPU results`);
          assert.ok(result[category].battery, `${category} should have battery results`);
          assert.ok(result[category].network, `${category} should have network results`);
          assert.ok(result[category].ui, `${category} should have UI results`);
        }
      });

      test('should validate performance for specific device category', async () => {
        const result = await validator.validatePerformanceBenchmarks('midRange');

        assert.ok(result.midRange, 'Should have mid-range results');
        assert.ok(!result.lowEnd, 'Should not have low-end results');
        assert.ok(!result.highEnd, 'Should not have high-end results');
      });
    });

    describe('validateStartupPerformance', () => {
      test('should validate cold start time', async () => {
        const device = validator.deviceCategories.midRange;
        const result = await validator.validateStartupPerformance(device);

        const coldStartTest = result.tests.find(test => 
          test.name === 'Cold start time'
        );
        assert.ok(coldStartTest, 'Should have cold start test');
        assert.strictEqual(coldStartTest.device, device.cpu);
      });

      test('should validate warm start time', async () => {
        const device = validator.deviceCategories.highEnd;
        const result = await validator.validateStartupPerformance(device);

        const warmStartTest = result.tests.find(test => 
          test.name === 'Warm start time'
        );
        assert.ok(warmStartTest, 'Should have warm start test');
        assert.strictEqual(warmStartTest.device, device.cpu);
      });
    });

    describe('validateMemoryUsage', () => {
      test('should validate baseline memory usage', async () => {
        const device = validator.deviceCategories.midRange;
        const result = await validator.validateMemoryUsage(device);

        const baselineTest = result.tests.find(test => 
          test.name === 'Baseline memory usage'
        );
        assert.ok(baselineTest, 'Should have baseline memory test');
        assert.strictEqual(baselineTest.device, device.cpu);
      });

      test('should detect memory leaks', async () => {
        const device = validator.deviceCategories.highEnd;
        const result = await validator.validateMemoryUsage(device);

        const leakTest = result.tests.find(test => 
          test.name === 'Memory leak detection'
        );
        assert.ok(leakTest, 'Should have memory leak test');
        assert.strictEqual(leakTest.device, device.cpu);
      });
    });
  });

  describe('Offline Functionality Validation', () => {
    describe('validateOfflineFunctionality', () => {
      test('should validate all offline functionality aspects', async () => {
        const result = await validator.validateOfflineFunctionality();

        assert.ok(result.dataSync, 'Should have data sync results');
        assert.ok(result.conflictResolution, 'Should have conflict resolution results');
        assert.ok(result.storage, 'Should have storage results');
        assert.ok(result.queueing, 'Should have queueing results');
      });
    });

    describe('validateDataSynchronization', () => {
      test('should validate offline data persistence', async () => {
        const result = await validator.validateDataSynchronization();

        const persistenceTest = result.tests.find(test => 
          test.name === 'Offline data persistence'
        );
        assert.ok(persistenceTest, 'Should have data persistence test');
      });

      test('should validate sync conflict detection', async () => {
        const result = await validator.validateDataSynchronization();

        const conflictTest = result.tests.find(test => 
          test.name === 'Sync conflict detection'
        );
        assert.ok(conflictTest, 'Should have conflict detection test');
      });
    });
  });

  describe('Cross-Platform Consistency Validation', () => {
    describe('validateCrossPlatformConsistency', () => {
      test('should validate all cross-platform aspects', async () => {
        const result = await validator.validateCrossPlatformConsistency();

        assert.ok(result.featureParity, 'Should have feature parity results');
        assert.ok(result.uiConsistency, 'Should have UI consistency results');
        assert.ok(result.performanceConsistency, 'Should have performance consistency results');
        assert.ok(result.dataCompatibility, 'Should have data compatibility results');
      });
    });

    describe('validateFeatureParity', () => {
      test('should validate feature parity across platforms', async () => {
        const platforms = ['ios', 'android', 'pwa'];
        const result = await validator.validateFeatureParity(platforms);

        assert.ok(result.passed >= 0, 'Should have passed count');
        assert.ok(result.tests.length > 0, 'Should have tests');
      });
    });
  });

  describe('Report Generation', () => {
    describe('generateValidationReport', () => {
      test('should generate comprehensive validation report', async () => {
        // Run some validations to populate results
        await validator.validateSecurityMeasures('ios');
        await validator.validatePerformanceBenchmarks('midRange');

        const report = validator.generateValidationReport();

        assert.ok(report.timestamp, 'Should have timestamp');
        assert.ok(report.summary, 'Should have summary');
        assert.ok(report.categories, 'Should have categories');
        assert.ok(report.recommendations, 'Should have recommendations');
        assert.ok(report.criticalIssues, 'Should have critical issues');

        assert.ok(typeof report.summary.totalTests === 'number', 'Should have total tests count');
        assert.ok(typeof report.summary.totalPassed === 'number', 'Should have total passed count');
        assert.ok(typeof report.summary.totalFailed === 'number', 'Should have total failed count');
        assert.ok(typeof report.summary.successRate === 'number', 'Should have success rate');
      });

      test('should calculate success rates correctly', async () => {
        // Run validations with known results
        await validator.validateSecurityMeasures('ios');

        const report = validator.generateValidationReport();

        assert.ok(report.summary.successRate >= 0, 'Success rate should be >= 0');
        assert.ok(report.summary.successRate <= 100, 'Success rate should be <= 100');
        assert.strictEqual(
          report.summary.totalTests,
          report.summary.totalPassed + report.summary.totalFailed,
          'Total tests should equal passed + failed'
        );
      });
    });

    describe('generateRecommendations', () => {
      test('should generate security recommendations for low success rates', () => {
        const mockReport = {
          categories: {
            security: {
              totals: { successRate: 80 }
            }
          }
        };

        const recommendations = validator.generateRecommendations(mockReport);

        const securityRec = recommendations.find(rec => 
          rec.category === 'security' && rec.priority === 'high'
        );
        assert.ok(securityRec, 'Should have high priority security recommendation');
      });

      test('should generate performance recommendations for low success rates', () => {
        const mockReport = {
          categories: {
            performance: {
              totals: { successRate: 85 }
            }
          }
        };

        const recommendations = validator.generateRecommendations(mockReport);

        const performanceRec = recommendations.find(rec => 
          rec.category === 'performance' && rec.priority === 'high'
        );
        assert.ok(performanceRec, 'Should have high priority performance recommendation');
      });

      test('should not generate recommendations for high success rates', () => {
        const mockReport = {
          categories: {
            security: {
              totals: { successRate: 98 }
            },
            performance: {
              totals: { successRate: 95 }
            }
          }
        };

        const recommendations = validator.generateRecommendations(mockReport);

        assert.strictEqual(recommendations.length, 0, 'Should not have recommendations for high success rates');
      });
    });
  });

  describe('Utility Methods', () => {
    describe('adjustBenchmarkForDevice', () => {
      test('should adjust benchmark for low-end devices', () => {
        const lowEndDevice = validator.deviceCategories.lowEnd;
        const adjusted = validator.adjustBenchmarkForDevice(1000, lowEndDevice);

        assert.ok(adjusted > 1000, 'Should increase benchmark for low-end devices');
      });

      test('should not adjust benchmark for high-end devices', () => {
        const highEndDevice = validator.deviceCategories.highEnd;
        const adjusted = validator.adjustBenchmarkForDevice(1000, highEndDevice);

        assert.strictEqual(adjusted, 1000, 'Should not adjust benchmark for high-end devices');
      });
    });

    describe('adjustMemoryBenchmarkForDevice', () => {
      test('should reduce memory benchmark for low-end devices', () => {
        const lowEndDevice = validator.deviceCategories.lowEnd;
        const adjusted = validator.adjustMemoryBenchmarkForDevice(100 * 1024 * 1024, lowEndDevice);

        assert.ok(adjusted < 100 * 1024 * 1024, 'Should reduce memory benchmark for low-end devices');
      });

      test('should not adjust memory benchmark for high-end devices', () => {
        const highEndDevice = validator.deviceCategories.highEnd;
        const adjusted = validator.adjustMemoryBenchmarkForDevice(100 * 1024 * 1024, highEndDevice);

        assert.strictEqual(adjusted, 100 * 1024 * 1024, 'Should not adjust memory benchmark for high-end devices');
      });
    });
  });

  describe('Integration Tests', () => {
    test('should run complete validation workflow', async () => {
      const securityResults = await validator.validateSecurityMeasures('all');
      const performanceResults = await validator.validatePerformanceBenchmarks('all');
      const offlineResults = await validator.validateOfflineFunctionality();
      const crossPlatformResults = await validator.validateCrossPlatformConsistency();

      assert.ok(securityResults, 'Should have security results');
      assert.ok(performanceResults, 'Should have performance results');
      assert.ok(offlineResults, 'Should have offline results');
      assert.ok(crossPlatformResults, 'Should have cross-platform results');

      const report = validator.generateValidationReport();
      assert.ok(report.summary.totalTests > 0, 'Should have tests in report');
    });

    test('should maintain validation state across multiple runs', async () => {
      await validator.validateSecurityMeasures('ios');
      const firstReport = validator.generateValidationReport();

      await validator.validatePerformanceBenchmarks('midRange');
      const secondReport = validator.generateValidationReport();

      assert.ok(
        secondReport.summary.totalTests > firstReport.summary.totalTests,
        'Second report should have more tests'
      );
    });
  });
});