/**
 * Production Deployment Checklist Validator Tests
 * 
 * Comprehensive unit tests for the deployment checklist validation system.
 * Tests all validator methods, checklist categories, and validation scenarios.
 */

import { jest } from '@jest/globals';
import ProductionDeploymentChecklistValidator from './deployment-checklist-validator.js';

describe('ProductionDeploymentChecklistValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new ProductionDeploymentChecklistValidator({
      environment: 'test',
      strictMode: true,
      timeoutMs: 5000
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default options', () => {
      const defaultValidator = new ProductionDeploymentChecklistValidator();
      
      expect(defaultValidator.options.environment).toBe('production');
      expect(defaultValidator.options.strictMode).toBe(true);
      expect(defaultValidator.options.timeoutMs).toBe(30000);
      expect(defaultValidator.options.retryAttempts).toBe(3);
    });

    test('should initialize with custom options', () => {
      const customValidator = new ProductionDeploymentChecklistValidator({
        environment: 'staging',
        strictMode: false,
        timeoutMs: 10000,
        retryAttempts: 5
      });
      
      expect(customValidator.options.environment).toBe('staging');
      expect(customValidator.options.strictMode).toBe(false);
      expect(customValidator.options.timeoutMs).toBe(10000);
      expect(customValidator.options.retryAttempts).toBe(5);
    });

    test('should initialize checklist items structure', () => {
      expect(validator.checklistItems).toBeDefined();
      expect(validator.checklistItems.infrastructure).toBeDefined();
      expect(validator.checklistItems.application).toBeDefined();
      expect(validator.checklistItems.security).toBeDefined();
      expect(validator.checklistItems.monitoring).toBeDefined();
      expect(validator.checklistItems.backup).toBeDefined();
      expect(validator.checklistItems.performance).toBeDefined();
      expect(validator.checklistItems.deployment).toBeDefined();
      expect(validator.checklistItems.documentation).toBeDefined();
    });

    test('should initialize validation results structure', () => {
      expect(validator.validationResults).toBeDefined();
      expect(validator.criticalIssues).toEqual([]);
      expect(validator.warnings).toEqual([]);
      expect(validator.recommendations).toEqual([]);
    });
  });

  describe('Checklist Items Structure', () => {
    test('should have properly structured infrastructure items', () => {
      const infrastructure = validator.checklistItems.infrastructure;
      
      expect(infrastructure.serverProvisioning).toBeDefined();
      expect(infrastructure.serverProvisioning.priority).toBe('critical');
      expect(infrastructure.serverProvisioning.checks).toBeInstanceOf(Array);
      expect(infrastructure.serverProvisioning.checks.length).toBeGreaterThan(0);
      
      expect(infrastructure.databaseSetup).toBeDefined();
      expect(infrastructure.sslCertificates).toBeDefined();
      expect(infrastructure.dnsConfiguration).toBeDefined();
    });

    test('should have properly structured security items', () => {
      const security = validator.checklistItems.security;
      
      expect(security.securityHeaders).toBeDefined();
      expect(security.securityHeaders.priority).toBe('critical');
      expect(security.authentication).toBeDefined();
      expect(security.dataEncryption).toBeDefined();
      expect(security.auditLogging).toBeDefined();
      expect(security.vulnerabilityScanning).toBeDefined();
    });

    test('should have properly structured monitoring items', () => {
      const monitoring = validator.checklistItems.monitoring;
      
      expect(monitoring.healthChecks).toBeDefined();
      expect(monitoring.healthChecks.priority).toBe('critical');
      expect(monitoring.metricsCollection).toBeDefined();
      expect(monitoring.alerting).toBeDefined();
      expect(monitoring.dashboards).toBeDefined();
    });

    test('should have all required priority levels', () => {
      const allItems = Object.values(validator.checklistItems).flatMap(category => 
        Object.values(category)
      );
      
      const priorities = [...new Set(allItems.map(item => item.priority))];
      expect(priorities).toContain('critical');
      expect(priorities).toContain('high');
      expect(priorities).toContain('medium');
    });
  });

  describe('validateDeploymentReadiness', () => {
    test('should complete full deployment readiness validation', async () => {
      const results = await validator.validateDeploymentReadiness();
      
      expect(results).toBeDefined();
      expect(results.overall).toBeDefined();
      expect(results.categories).toBeDefined();
      expect(results.summary).toBeDefined();
      expect(results.actionItems).toBeDefined();
      expect(results.timeline).toBeDefined();
      
      // Check overall structure
      expect(results.overall.status).toMatch(/^(ready|conditional|not_ready)$/);
      expect(results.overall.score).toBeGreaterThanOrEqual(0);
      expect(results.overall.score).toBeLessThanOrEqual(100);
      expect(results.overall.recommendation).toBeDefined();
      
      // Check summary structure
      expect(results.summary.totalItems).toBeGreaterThan(0);
      expect(results.summary.passedItems).toBeGreaterThanOrEqual(0);
      expect(results.summary.failedItems).toBeGreaterThanOrEqual(0);
      expect(results.summary.warningItems).toBeGreaterThanOrEqual(0);
      
      // Check timeline
      expect(results.timeline.startTime).toBeDefined();
      expect(results.timeline.endTime).toBeDefined();
      expect(results.timeline.duration).toBeGreaterThan(0);
    });

    test('should validate all checklist categories', async () => {
      const results = await validator.validateDeploymentReadiness();
      
      const expectedCategories = [
        'infrastructure', 'application', 'security', 'monitoring',
        'backup', 'performance', 'deployment', 'documentation'
      ];
      
      for (const category of expectedCategories) {
        expect(results.categories[category]).toBeDefined();
        expect(results.categories[category].status).toMatch(/^(passed|warning|failed|critical)$/);
        expect(results.categories[category].score).toBeGreaterThanOrEqual(0);
        expect(results.categories[category].score).toBeLessThanOrEqual(100);
        expect(results.categories[category].totalItems).toBeGreaterThan(0);
      }
    });

    test('should handle validation errors gracefully', async () => {
      // Mock a method to throw an error
      const originalMethod = validator.performCheck;
      validator.performCheck = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const results = await validator.validateDeploymentReadiness();
      
      expect(results).toBeDefined();
      expect(results.overall.status).toBeDefined();
      
      // Restore original method
      validator.performCheck = originalMethod;
    });
  });

  describe('validateCategory', () => {
    test('should validate infrastructure category', async () => {
      const categoryItems = validator.checklistItems.infrastructure;
      const result = await validator.validateCategory('infrastructure', categoryItems);
      
      expect(result.status).toMatch(/^(passed|warning|failed|critical)$/);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.totalItems).toBeGreaterThan(0);
      expect(result.items).toBeDefined();
      
      // Check that all items were processed
      const expectedItems = Object.keys(categoryItems);
      const actualItems = Object.keys(result.items);
      expect(actualItems).toEqual(expect.arrayContaining(expectedItems));
    });

    test('should calculate category score correctly', async () => {
      const categoryItems = validator.checklistItems.security;
      const result = await validator.validateCategory('security', categoryItems);
      
      const expectedScore = result.totalItems > 0 
        ? Math.round((result.passedItems / result.totalItems) * 100)
        : 0;
      
      expect(result.score).toBe(expectedScore);
    });

    test('should identify critical issues in category', async () => {
      const categoryItems = validator.checklistItems.security;
      const result = await validator.validateCategory('security', categoryItems);
      
      if (result.criticalIssues > 0) {
        expect(result.status).toBe('critical');
      }
    });
  });

  describe('validateChecklistItem', () => {
    test('should validate individual checklist item', async () => {
      const itemConfig = {
        priority: 'critical',
        description: 'Test item',
        checks: ['test_check_1', 'test_check_2']
      };
      
      const result = await validator.validateChecklistItem('test', 'testItem', itemConfig);
      
      expect(result.status).toMatch(/^(passed|warning|failed|unknown)$/);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.priority).toBe('critical');
      expect(result.description).toBe('Test item');
      expect(result.checks).toBeDefined();
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    test('should handle check errors gracefully', async () => {
      const itemConfig = {
        priority: 'high',
        description: 'Test item with error',
        checks: ['failing_check']
      };
      
      // Mock performCheck to throw error
      const originalMethod = validator.performCheck;
      validator.performCheck = jest.fn().mockRejectedValue(new Error('Check failed'));
      
      const result = await validator.validateChecklistItem('test', 'testItem', itemConfig);
      
      expect(result.checks.failing_check).toBeDefined();
      expect(result.checks.failing_check.status).toBe('error');
      expect(result.issues.length).toBeGreaterThan(0);
      
      // Restore original method
      validator.performCheck = originalMethod;
    });

    test('should calculate item score based on passed checks', async () => {
      const itemConfig = {
        priority: 'medium',
        description: 'Test scoring',
        checks: ['check1', 'check2', 'check3', 'check4']
      };
      
      // Mock performCheck to return specific results
      validator.performCheck = jest.fn()
        .mockResolvedValueOnce({ status: 'passed', message: 'Check 1 passed' })
        .mockResolvedValueOnce({ status: 'passed', message: 'Check 2 passed' })
        .mockResolvedValueOnce({ status: 'failed', message: 'Check 3 failed' })
        .mockResolvedValueOnce({ status: 'failed', message: 'Check 4 failed' });
      
      const result = await validator.validateChecklistItem('test', 'testItem', itemConfig);
      
      expect(result.score).toBe(50); // 2 out of 4 checks passed
    });
  });

  describe('performCheck', () => {
    test('should perform server instances check', async () => {
      const result = await validator.performCheck('infrastructure', 'serverProvisioning', 'server_instances_provisioned');
      
      expect(result.status).toMatch(/^(passed|failed)$/);
      expect(result.message).toBeDefined();
      
      if (result.status === 'passed') {
        expect(result.details).toBeDefined();
      } else {
        expect(result.severity).toBeDefined();
        expect(result.recommendation).toBeDefined();
      }
    });

    test('should perform load balancer check', async () => {
      const result = await validator.performCheck('infrastructure', 'loadBalancer', 'load_balancer_configured');
      
      expect(result.status).toMatch(/^(passed|failed)$/);
      expect(result.message).toBeDefined();
    });

    test('should perform SSL certificate check', async () => {
      const result = await validator.performCheck('security', 'sslCertificates', 'ssl_certificates_installed');
      
      expect(result.status).toMatch(/^(passed|failed)$/);
      expect(result.message).toBeDefined();
    });

    test('should perform environment variables check', async () => {
      const result = await validator.performCheck('application', 'environmentVariables', 'production_env_vars_set');
      
      expect(result.status).toMatch(/^(passed|failed)$/);
      expect(result.message).toBeDefined();
    });

    test('should perform health endpoints check', async () => {
      const result = await validator.performCheck('monitoring', 'healthChecks', 'health_endpoints_configured');
      
      expect(result.status).toMatch(/^(passed|failed)$/);
      expect(result.message).toBeDefined();
    });

    test('should perform backup configuration check', async () => {
      const result = await validator.performCheck('backup', 'automatedBackups', 'backup_configuration');
      
      expect(result.status).toMatch(/^(passed|failed)$/);
      expect(result.message).toBeDefined();
    });

    test('should handle unknown checks with default method', async () => {
      const result = await validator.performCheck('test', 'testItem', 'unknown_check');
      
      expect(result.status).toMatch(/^(passed|failed)$/);
      expect(result.message).toContain('unknown check');
    });
  });

  describe('calculateOverallResult', () => {
    test('should calculate overall result with ready status', () => {
      const mockResults = {
        summary: {
          totalItems: 100,
          passedItems: 98,
          failedItems: 2,
          warningItems: 0,
          criticalIssues: 0
        },
        categories: {
          infrastructure: { score: 95 },
          security: { score: 98 },
          monitoring: { score: 92 },
          backup: { score: 96 },
          application: { score: 94 },
          performance: { score: 90 },
          deployment: { score: 88 },
          documentation: { score: 85 }
        }
      };
      
      const result = validator.calculateOverallResult(mockResults);
      
      expect(result.status).toBe('ready');
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.recommendation).toContain('GO');
      expect(result.completionRate).toBe(98);
      expect(result.criticalIssuesCount).toBe(0);
    });

    test('should calculate overall result with critical issues', () => {
      const mockResults = {
        summary: {
          totalItems: 100,
          passedItems: 80,
          failedItems: 20,
          warningItems: 0,
          criticalIssues: 5
        },
        categories: {
          infrastructure: { score: 70 },
          security: { score: 60 },
          monitoring: { score: 85 },
          backup: { score: 90 },
          application: { score: 75 },
          performance: { score: 80 },
          deployment: { score: 85 },
          documentation: { score: 90 }
        }
      };
      
      const result = validator.calculateOverallResult(mockResults);
      
      expect(result.status).toBe('not_ready');
      expect(result.recommendation).toContain('DO NOT DEPLOY');
      expect(result.criticalIssuesCount).toBe(5);
    });

    test('should calculate overall result with conditional status', () => {
      const mockResults = {
        summary: {
          totalItems: 100,
          passedItems: 88,
          failedItems: 12,
          warningItems: 0,
          criticalIssues: 0
        },
        categories: {
          infrastructure: { score: 85 },
          security: { score: 90 },
          monitoring: { score: 88 },
          backup: { score: 92 },
          application: { score: 86 },
          performance: { score: 84 },
          deployment: { score: 82 },
          documentation: { score: 80 }
        }
      };
      
      const result = validator.calculateOverallResult(mockResults);
      
      expect(result.status).toBe('conditional');
      expect(result.recommendation).toContain('CONDITIONAL GO');
    });
  });

  describe('getCategoryWeight', () => {
    test('should return correct weights for all categories', () => {
      expect(validator.getCategoryWeight('infrastructure')).toBe(20);
      expect(validator.getCategoryWeight('security')).toBe(25);
      expect(validator.getCategoryWeight('monitoring')).toBe(15);
      expect(validator.getCategoryWeight('backup')).toBe(15);
      expect(validator.getCategoryWeight('application')).toBe(10);
      expect(validator.getCategoryWeight('performance')).toBe(8);
      expect(validator.getCategoryWeight('deployment')).toBe(5);
      expect(validator.getCategoryWeight('documentation')).toBe(2);
    });

    test('should return default weight for unknown category', () => {
      expect(validator.getCategoryWeight('unknown')).toBe(5);
    });
  });

  describe('generateActionItems', () => {
    test('should generate action items from validation results', () => {
      const mockResults = {
        categories: {
          infrastructure: {
            items: {
              serverProvisioning: {
                status: 'failed',
                priority: 'critical',
                issues: [{
                  check: 'server_instances_provisioned',
                  issue: 'Servers not provisioned',
                  severity: 'critical'
                }],
                recommendations: ['Provision required servers']
              }
            }
          },
          security: {
            items: {
              sslCertificates: {
                status: 'warning',
                priority: 'high',
                issues: [{
                  check: 'certificate_expiry_monitoring',
                  issue: 'Monitoring not configured',
                  severity: 'medium'
                }],
                recommendations: ['Configure certificate monitoring']
              }
            }
          }
        }
      };
      
      const actionItems = validator.generateActionItems(mockResults);
      
      expect(actionItems).toBeInstanceOf(Array);
      expect(actionItems.length).toBeGreaterThan(0);
      
      const criticalItem = actionItems.find(item => item.priority === 'critical');
      expect(criticalItem).toBeDefined();
      expect(criticalItem.blocking).toBe(true);
      expect(criticalItem.category).toBe('infrastructure');
      expect(criticalItem.item).toBe('serverProvisioning');
    });

    test('should sort action items by priority and blocking status', () => {
      const mockResults = {
        categories: {
          test: {
            items: {
              item1: {
                status: 'failed',
                priority: 'medium',
                issues: [{ check: 'test', issue: 'Test issue', severity: 'medium' }],
                recommendations: ['Fix it']
              },
              item2: {
                status: 'failed',
                priority: 'critical',
                issues: [{ check: 'test', issue: 'Critical issue', severity: 'critical' }],
                recommendations: ['Fix immediately']
              },
              item3: {
                status: 'failed',
                priority: 'high',
                issues: [{ check: 'test', issue: 'High issue', severity: 'high' }],
                recommendations: ['Fix soon']
              }
            }
          }
        }
      };
      
      const actionItems = validator.generateActionItems(mockResults);
      
      expect(actionItems[0].priority).toBe('critical');
      expect(actionItems[0].blocking).toBe(true);
    });
  });

  describe('generateDeploymentReport', () => {
    test('should generate comprehensive deployment report', () => {
      const mockResults = {
        overall: {
          status: 'ready',
          score: 95,
          recommendation: 'GO - System is ready',
          completionRate: 95,
          criticalIssuesCount: 0
        },
        summary: {
          totalItems: 50,
          passedItems: 47,
          failedItems: 3,
          warningItems: 0,
          criticalIssues: 0
        },
        categories: {
          infrastructure: {
            status: 'passed',
            score: 95,
            passedItems: 8,
            totalItems: 8,
            criticalIssues: 0,
            items: {
              serverProvisioning: {
                status: 'passed',
                score: 100,
                priority: 'critical',
                issues: []
              }
            }
          }
        },
        actionItems: [],
        timeline: {
          startTime: '2025-01-28T10:00:00.000Z',
          endTime: '2025-01-28T10:05:00.000Z',
          duration: 300000
        }
      };
      
      const report = validator.generateDeploymentReport(mockResults);
      
      expect(report.title).toBe('Production Deployment Readiness Report');
      expect(report.generatedAt).toBeDefined();
      expect(report.environment).toBe('test');
      expect(report.overall).toEqual(mockResults.overall);
      expect(report.summary).toEqual(mockResults.summary);
      expect(report.categories).toBeDefined();
      expect(report.actionItems).toEqual(mockResults.actionItems);
      expect(report.timeline).toEqual(mockResults.timeline);
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.nextSteps).toBeInstanceOf(Array);
    });
  });

  describe('generateRecommendations', () => {
    test('should generate recommendations for ready status', () => {
      const mockResults = { overall: { status: 'ready' } };
      const recommendations = validator.generateRecommendations(mockResults);
      
      expect(recommendations).toContain('System is ready for production deployment');
      expect(recommendations).toContain('Ensure monitoring is active during deployment');
      expect(recommendations).toContain('Have rollback procedures ready');
    });

    test('should generate recommendations for conditional status', () => {
      const mockResults = { overall: { status: 'conditional' } };
      const recommendations = validator.generateRecommendations(mockResults);
      
      expect(recommendations).toContain('Address high-priority issues before deployment');
      expect(recommendations).toContain('Monitor system closely after deployment');
    });

    test('should generate recommendations for not ready status', () => {
      const mockResults = { overall: { status: 'not_ready' } };
      const recommendations = validator.generateRecommendations(mockResults);
      
      expect(recommendations).toContain('Do not proceed with deployment until critical issues are resolved');
      expect(recommendations).toContain('Focus on infrastructure and security issues first');
    });
  });

  describe('generateNextSteps', () => {
    test('should generate next steps for critical issues', () => {
      const mockResults = { 
        summary: { criticalIssues: 3 },
        overall: { status: 'not_ready' }
      };
      const nextSteps = validator.generateNextSteps(mockResults);
      
      expect(nextSteps).toContain('Resolve all critical issues immediately');
      expect(nextSteps).toContain('Re-run deployment checklist validation');
    });

    test('should generate next steps for ready deployment', () => {
      const mockResults = { 
        summary: { criticalIssues: 0 },
        overall: { status: 'ready' }
      };
      const nextSteps = validator.generateNextSteps(mockResults);
      
      expect(nextSteps).toContain('Schedule deployment window');
      expect(nextSteps).toContain('Notify stakeholders of deployment');
      expect(nextSteps).toContain('Prepare monitoring and support teams');
    });

    test('should generate next steps for issues remaining', () => {
      const mockResults = { 
        summary: { criticalIssues: 0 },
        overall: { status: 'conditional' }
      };
      const nextSteps = validator.generateNextSteps(mockResults);
      
      expect(nextSteps).toContain('Create action plan for remaining issues');
      expect(nextSteps).toContain('Assign owners for each action item');
      expect(nextSteps).toContain('Set target completion dates');
    });
  });

  describe('Priority and Effort Estimation', () => {
    test('should calculate action priority correctly', () => {
      expect(validator.getActionPriority('critical', 'critical')).toBe('critical');
      expect(validator.getActionPriority('critical', 'medium')).toBe('high');
      expect(validator.getActionPriority('high', 'critical')).toBe('high');
      expect(validator.getActionPriority('medium', 'medium')).toBe('medium');
      expect(validator.getActionPriority('low', 'low')).toBe('low');
    });

    test('should return correct priority weights', () => {
      expect(validator.getPriorityWeight('critical')).toBe(1);
      expect(validator.getPriorityWeight('high')).toBe(2);
      expect(validator.getPriorityWeight('medium')).toBe(3);
      expect(validator.getPriorityWeight('low')).toBe(4);
      expect(validator.getPriorityWeight('unknown')).toBe(5);
    });

    test('should estimate effort correctly', () => {
      expect(validator.estimateEffort('critical')).toBe('4-8 hours');
      expect(validator.estimateEffort('high')).toBe('2-4 hours');
      expect(validator.estimateEffort('medium')).toBe('1-2 hours');
      expect(validator.estimateEffort('low')).toBe('< 1 hour');
      expect(validator.estimateEffort('unknown')).toBe('1-2 hours');
    });
  });

  describe('Integration Tests', () => {
    test('should complete full validation workflow', async () => {
      const results = await validator.validateDeploymentReadiness();
      const report = validator.generateDeploymentReport(results);
      
      expect(report).toBeDefined();
      expect(report.title).toBeDefined();
      expect(report.overall.status).toMatch(/^(ready|conditional|not_ready)$/);
      expect(report.categories).toBeDefined();
      expect(report.actionItems).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.nextSteps).toBeInstanceOf(Array);
    });

    test('should handle multiple validation runs', async () => {
      const results1 = await validator.validateDeploymentReadiness();
      const results2 = await validator.validateDeploymentReadiness();
      
      expect(results1).toBeDefined();
      expect(results2).toBeDefined();
      expect(results1.summary.totalItems).toBe(results2.summary.totalItems);
    });
  });
});