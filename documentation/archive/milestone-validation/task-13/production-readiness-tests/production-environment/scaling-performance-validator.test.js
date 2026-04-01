/**
 * Scaling and Performance Validation System Tests
 * 
 * Comprehensive tests for auto-scaling configuration, load balancer setup,
 * CDN and caching configuration, and resource optimization validation.
 * 
 * Requirements: 7.5
 */

import { jest } from '@jest/globals';
import ScalingPerformanceValidator from './scaling-performance-validator.js';

describe('ScalingPerformanceValidator', () => {
  let validator;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      loadBalancerEndpoint: 'https://lb.example.com',
      cdnEndpoint: 'https://cdn.example.com',
      apiEndpoint: 'http://localhost:3001',
      minInstances: 2,
      maxInstances: 10,
      targetCpuUtilization: 70,
      targetMemoryUtilization: 80,
      responseTimeThreshold: 2000,
      throughputThreshold: 100,
      cacheHitRateThreshold: 0.8
    };

    validator = new ScalingPerformanceValidator(mockConfig);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Auto-Scaling Validation', () => {
    test('should validate auto-scaling policy configuration', async () => {
      const result = await validator.testAutoScalingPolicyConfiguration();

      expect(result.success).toBe(true);
      expect(result.details.policy.minInstances).toBe(2);
      expect(result.details.policy.maxInstances).toBe(10);
      expect(result.details.policy.targetCpuUtilization).toBe(70);
      expect(result.details.validations.validMinMax).toBe(true);
      expect(result.details.validations.validThresholds).toBe(true);
      expect(result.details.validations.validCooldowns).toBe(true);
      expect(result.details.validations.validAdjustments).toBe(true);
    });

    test('should test scale-up triggers', async () => {
      const result = await validator.testScaleUpTriggers();

      expect(result.success).toBe(true);
      expect(result.details.scenarios).toHaveLength(4);
      expect(result.details.allTriggersCorrect).toBe(true);
      expect(result.details.scalingDelayAcceptable).toBe(true);
      expect(result.details.averageScalingDelay).toBeLessThan(180);
    });

    test('should test scale-down triggers', async () => {
      const result = await validator.testScaleDownTriggers();

      expect(result.success).toBe(true);
      expect(result.details.scenarios).toHaveLength(4);
      expect(result.details.allTriggersCorrect).toBe(true);
      expect(result.details.cooldownsRespected).toBe(true);
      expect(result.details.gracefulShutdowns).toBe(true);
    });

    test('should test scaling performance impact', async () => {
      const result = await validator.testScalingPerformanceImpact();

      expect(result.success).toBe(true);
      expect(result.details.events).toHaveLength(2);
      expect(result.details.allScalingSuccessful).toBe(true);
      expect(result.details.averageDuration).toBeLessThan(300);
      expect(result.details.averageImpact).toBeLessThan(0.15);
    });

    test('should handle auto-scaling test errors', async () => {
      // Mock an error in the test
      const originalTest = validator.testAutoScalingPolicyConfiguration;
      validator.testAutoScalingPolicyConfiguration = jest.fn().mockRejectedValue(new Error('Test error'));

      await validator.validateAutoScaling();

      expect(validator.results.scalingTests.some(t => !t.passed)).toBe(true);
      expect(validator.results.issues.some(i => i.type === 'scaling_test_error')).toBe(true);

      // Restore original method
      validator.testAutoScalingPolicyConfiguration = originalTest;
    });
  });

  describe('Load Balancer Validation', () => {
    test('should validate load balancer health checks', async () => {
      const result = await validator.testLoadBalancerHealthChecks();

      expect(result.success).toBe(true);
      expect(result.details.config.path).toBe('/api/health');
      expect(result.details.config.interval).toBe(30);
      expect(result.details.config.timeout).toBe(5);
      expect(result.details.validations.validPath).toBe(true);
      expect(result.details.validations.validInterval).toBe(true);
      expect(result.details.validations.validTimeout).toBe(true);
      expect(result.details.healthRate).toBeGreaterThanOrEqual(0.8);
    });

    test('should test traffic distribution', async () => {
      const result = await validator.testTrafficDistribution();

      expect(result.success).toBe(true);
      expect(result.details.instances).toHaveLength(4);
      expect(result.details.totalRequests).toBe(1000);
      expect(result.details.distributionFair).toBe(true);
      expect(result.details.unhealthyInstancesSkipped).toBe(true);
      expect(result.details.distributionVariance).toBeLessThan(0.15);
    });

    test('should test SSL termination', async () => {
      const result = await validator.testSSLTermination();

      expect(result.success).toBe(true);
      expect(result.details.config.certificateValid).toBe(true);
      expect(result.details.config.tlsVersion).toBe('TLSv1.3');
      expect(result.details.config.hstsEnabled).toBe(true);
      expect(result.details.validations.certificateValid).toBe(true);
      expect(result.details.validations.tlsVersionSecure).toBe(true);
      expect(result.details.performanceAcceptable).toBe(true);
    });

    test('should test session affinity', async () => {
      const result = await validator.testSessionAffinity();

      expect(result.success).toBe(true);
      expect(result.details.config.enabled).toBe(true);
      expect(result.details.config.method).toBe('cookie');
      expect(result.details.totalSessions).toBe(100);
      expect(result.details.affinityRate).toBeGreaterThanOrEqual(0.9);
      expect(result.details.affinityWorking).toBe(true);
    });
  });

  describe('CDN and Caching Validation', () => {
    test('should validate CDN configuration', async () => {
      const result = await validator.testCDNConfiguration();

      expect(result.success).toBe(true);
      expect(result.details.config.enabled).toBe(true);
      expect(result.details.config.provider).toBe('CloudFront');
      expect(result.details.config.compressionEnabled).toBe(true);
      expect(result.details.validations.cdnEnabled).toBe(true);
      expect(result.details.validations.compressionConfigured).toBe(true);
      expect(result.details.validations.cachingBehaviorsConfigured).toBe(true);
    });

    test('should test cache hit rate', async () => {
      const result = await validator.testCacheHitRate();

      expect(result.success).toBe(true);
      expect(result.details.overall.hitRate).toBeGreaterThanOrEqual(0.8);
      expect(result.details.overall.totalRequests).toBe(10000);
      expect(result.details.contentTypes).toHaveLength(4);
      expect(result.details.validations.hitRateAcceptable).toBe(true);
      expect(result.details.validations.bandwidthSavingsSignificant).toBe(true);
    });

    test('should test cache invalidation', async () => {
      const result = await validator.testCacheInvalidation();

      expect(result.success).toBe(true);
      expect(result.details.scenarios).toHaveLength(4);
      expect(result.details.allInvalidationsSuccessful).toBe(true);
      expect(result.details.averageInvalidationTime).toBeLessThan(600);
    });

    test('should test edge location performance', async () => {
      const result = await validator.testEdgeLocationPerformance();

      expect(result.success).toBe(true);
      expect(result.details.locations).toHaveLength(5);
      expect(result.details.allLocationsPerforming).toBe(true);
      expect(result.details.averageLatency).toBeLessThan(200);
      expect(result.details.averageAvailability).toBeGreaterThanOrEqual(0.99);
    });
  });

  describe('Resource Optimization Validation', () => {
    test('should test CPU and memory optimization', async () => {
      const result = await validator.testCPUMemoryOptimization();

      expect(result.success).toBe(true);
      expect(result.details.config.cpuLimit).toBe('1000m');
      expect(result.details.config.memoryLimit).toBe('2Gi');
      expect(result.details.metrics.avgCpuUtilization).toBeLessThan(0.8);
      expect(result.details.metrics.avgMemoryUtilization).toBeLessThan(0.8);
      expect(result.details.validations.cpuUtilizationOptimal).toBe(true);
      expect(result.details.validations.memoryUtilizationOptimal).toBe(true);
    });

    test('should test database connection pooling', async () => {
      const result = await validator.testDatabaseConnectionPooling();

      expect(result.success).toBe(true);
      expect(result.details.config.maxConnections).toBe(20);
      expect(result.details.config.minConnections).toBe(5);
      expect(result.details.metrics.totalConnections).toBeGreaterThanOrEqual(5);
      expect(result.details.metrics.totalConnections).toBeLessThanOrEqual(20);
      expect(result.details.validations.poolSizeAppropriate).toBe(true);
      expect(result.details.validations.acquisitionTimeFast).toBe(true);
    });

    test('should test asset optimization', async () => {
      const result = await validator.testAssetOptimization();

      expect(result.success).toBe(true);
      expect(result.details.optimization.jsMinification).toBe(true);
      expect(result.details.optimization.cssMinification).toBe(true);
      expect(result.details.optimization.gzipCompression).toBe(true);
      expect(result.details.metrics.compressionRatio).toBeLessThan(0.5);
      expect(result.details.validations.compressionEffective).toBe(true);
      expect(result.details.validations.imageOptimizationGood).toBe(true);
    });

    test('should test network optimization', async () => {
      const result = await validator.testNetworkOptimization();

      expect(result.success).toBe(true);
      expect(result.details.optimization.http2Enabled).toBe(true);
      expect(result.details.optimization.keepAliveEnabled).toBe(true);
      expect(result.details.metrics.connectionEstablishmentTime).toBeLessThan(200);
      expect(result.details.metrics.throughput).toBeGreaterThan(50);
      expect(result.details.validations.connectionTimeFast).toBe(true);
      expect(result.details.validations.throughputGood).toBe(true);
    });
  });

  describe('Performance Under Load', () => {
    test('should simulate load test scenarios', async () => {
      const scenario = {
        name: 'Test Load',
        concurrentUsers: 100,
        requestsPerSecond: 50,
        duration: 300
      };

      const result = await validator.simulateLoadTest(scenario);

      expect(result.scenario).toBe('Test Load');
      expect(result.config).toEqual(scenario);
      expect(result.metrics.averageResponseTime).toBeLessThan(2000);
      expect(result.metrics.errorRate).toBeLessThan(0.05);
      expect(result.performanceAcceptable).toBeDefined();
    });

    test('should calculate overall performance', () => {
      const loadTestResults = [
        { performanceAcceptable: true, metrics: { averageResponseTime: 500, errorRate: 0.01, throughput: 100 } },
        { performanceAcceptable: true, metrics: { averageResponseTime: 800, errorRate: 0.02, throughput: 150 } },
        { performanceAcceptable: false, metrics: { averageResponseTime: 2500, errorRate: 0.05, throughput: 80 } }
      ];

      const result = validator.calculateOverallPerformance(loadTestResults);

      expect(result.performanceScore).toBe(2/3);
      expect(result.performingScenarios).toBe(2);
      expect(result.totalScenarios).toBe(3);
      expect(result.averageResponseTime).toBe((500 + 800 + 2500) / 3);
      expect(result.status).toBe('acceptable');
    });

    test('should validate performance under load', async () => {
      await validator.validatePerformanceUnderLoad();

      expect(validator.results.performanceMetrics.loadTesting).toBeDefined();
      expect(validator.results.performanceMetrics.loadTesting.scenarios).toHaveLength(3);
      expect(validator.results.performanceMetrics.loadTesting.overallPerformance).toBeDefined();
    });
  });

  describe('Score Calculation', () => {
    test('should calculate test score correctly', () => {
      const tests = [
        { passed: true, weight: 25 },
        { passed: false, weight: 25 },
        { passed: true, weight: 30 },
        { passed: true, weight: 20 }
      ];

      const score = validator.calculateTestScore(tests);

      expect(score).toBe(75 / 100); // (25 + 30 + 20) / (25 + 25 + 30 + 20)
    });

    test('should calculate performance metrics score', () => {
      validator.results.performanceMetrics = {
        loadTesting: {
          overallPerformance: { performanceScore: 0.8 }
        }
      };

      const score = validator.calculatePerformanceMetricsScore();

      expect(score).toBe(0.8);
    });

    test('should calculate overall scaling performance score', () => {
      validator.results.scalingTests = [
        { passed: true, weight: 25 },
        { passed: true, weight: 25 }
      ];
      validator.results.loadBalancerTests = [
        { passed: true, weight: 30 },
        { passed: false, weight: 20 }
      ];
      validator.results.cdnTests = [
        { passed: true, weight: 25 }
      ];
      validator.results.resourceTests = [
        { passed: true, weight: 30 }
      ];
      validator.results.performanceMetrics = {
        loadTesting: {
          overallPerformance: { performanceScore: 0.9 }
        }
      };

      validator.calculateScalingPerformanceScore();

      expect(validator.results.score).toBeGreaterThan(0.8);
      expect(validator.results.score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Report Generation', () => {
    test('should generate comprehensive report', () => {
      // Set up test data
      validator.results.score = 0.88;
      validator.results.scalingTests = [
        { passed: true, weight: 25 },
        { passed: false, weight: 25 }
      ];
      validator.results.loadBalancerTests = [
        { passed: true, weight: 30 }
      ];
      validator.results.cdnTests = [
        { passed: true, weight: 25 }
      ];
      validator.results.resourceTests = [
        { passed: true, weight: 30 }
      ];
      validator.results.issues = [
        { severity: 'high', message: 'Test issue' },
        { severity: 'medium', message: 'Another issue' }
      ];

      const report = validator.generateReport();

      expect(report.timestamp).toBeDefined();
      expect(report.summary.overallScore).toBe(0.88);
      expect(report.summary.status).toBe('good');
      expect(report.summary.totalIssues).toBe(2);
      expect(report.summary.criticalIssues).toBe(1);
      expect(report.scalingValidation.testsRun).toBe(2);
      expect(report.scalingValidation.testsPassed).toBe(1);
      expect(report.loadBalancerValidation.testsRun).toBe(1);
      expect(report.loadBalancerValidation.testsPassed).toBe(1);
      expect(report.recommendations).toBeDefined();
    });

    test('should determine overall status correctly', () => {
      validator.results.score = 0.95;
      expect(validator.getOverallStatus()).toBe('excellent');

      validator.results.score = 0.85;
      expect(validator.getOverallStatus()).toBe('good');

      validator.results.score = 0.70;
      expect(validator.getOverallStatus()).toBe('acceptable');

      validator.results.score = 0.50;
      expect(validator.getOverallStatus()).toBe('needs_improvement');

      validator.results.score = 0.30;
      expect(validator.getOverallStatus()).toBe('critical');
    });

    test('should generate appropriate recommendations', () => {
      validator.results.score = 0.70;
      validator.results.issues = [
        { severity: 'high', message: 'Critical issue' }
      ];
      validator.results.scalingTests = [
        { passed: false, weight: 25 }
      ];
      validator.results.loadBalancerTests = [
        { passed: false, weight: 30 }
      ];
      validator.results.cdnTests = [
        { passed: false, weight: 25 }
      ];
      validator.results.resourceTests = [
        { passed: false, weight: 30 }
      ];

      const recommendations = validator.generateRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.category === 'overall')).toBe(true);
      expect(recommendations.some(r => r.category === 'issues')).toBe(true);
      expect(recommendations.some(r => r.category === 'scaling')).toBe(true);
      expect(recommendations.some(r => r.category === 'load_balancer')).toBe(true);
      expect(recommendations.some(r => r.category === 'cdn')).toBe(true);
      expect(recommendations.some(r => r.category === 'resources')).toBe(true);
    });
  });

  describe('Full Validation', () => {
    test('should run comprehensive scaling and performance validation', async () => {
      const report = await validator.validateScalingPerformance();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.scalingValidation).toBeDefined();
      expect(report.loadBalancerValidation).toBeDefined();
      expect(report.cdnValidation).toBeDefined();
      expect(report.resourceValidation).toBeDefined();
      expect(report.performanceMetrics).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    test('should handle validation errors gracefully', async () => {
      // Mock an error in validation
      const originalValidateAutoScaling = validator.validateAutoScaling;
      validator.validateAutoScaling = jest.fn().mockRejectedValue(new Error('Validation error'));

      const report = await validator.validateScalingPerformance();

      expect(report).toBeDefined();
      expect(report.summary.totalIssues).toBeGreaterThan(0);
      expect(validator.results.issues.some(i => i.type === 'validation_error')).toBe(true);

      // Restore original method
      validator.validateAutoScaling = originalValidateAutoScaling;
    });
  });
});