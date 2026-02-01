/**
 * Unit Tests for Production Readiness Report Generator
 * 
 * Tests report generation, scoring algorithms, issue prioritization,
 * and deployment recommendation logic.
 */

import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import ProductionReadinessReportGenerator from './production-readiness-report-generator.js';

// Mock fs module
jest.mock('fs/promises');

describe('ProductionReadinessReportGenerator', () => {
  let generator;
  let mockValidationResults;

  beforeEach(() => {
    generator = new ProductionReadinessReportGenerator({
      outputDir: '/test/output',
      generateAllFormats: true
    });

    mockValidationResults = {
      'security-validation': {
        category: 'security-validation',
        status: 'passed',
        score: 95,
        issues: [],
        metrics: { vulnerabilities: 0, authTests: 50 }
      },
      'data-integrity': {
        category: 'data-integrity',
        status: 'passed',
        score: 98,
        issues: [],
        metrics: { backupTests: 10, integrityChecks: 25 }
      },
      'user-functionality': {
        category: 'user-functionality',
        status: 'warning',
        score: 88,
        issues: [
          { severity: 'MEDIUM', message: 'Minor UI issue', category: 'ui' }
        ],
        metrics: { functionalTests: 100, passed: 88 }
      },
      'performance-testing': {
        category: 'performance-testing',
        status: 'failed',
        score: 75,
        issues: [
          { severity: 'HIGH', message: 'Slow API response', category: 'performance' },
          { severity: 'MEDIUM', message: 'Memory usage high', category: 'performance' }
        ],
        metrics: { avgResponseTime: '250ms', maxConcurrentUsers: 100 }
      }
    };

    // Mock validation results loading
    generator.validationResults = new Map(Object.entries(mockValidationResults));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with default options', () => {
      const defaultGenerator = new ProductionReadinessReportGenerator();
      
      expect(defaultGenerator.options.generateAllFormats).toBe(true);
      expect(defaultGenerator.options.includeDetailedLogs).toBe(false);
      expect(defaultGenerator.categoryWeights).toBeDefined();
      expect(defaultGenerator.severityLevels).toBeDefined();
    });

    test('should accept custom options', () => {
      const customGenerator = new ProductionReadinessReportGenerator({
        outputDir: '/custom/path',
        includeDetailedLogs: true,
        generateAllFormats: false
      });

      expect(customGenerator.options.outputDir).toBe('/custom/path');
      expect(customGenerator.options.includeDetailedLogs).toBe(true);
      expect(customGenerator.options.generateAllFormats).toBe(false);
    });

    test('should have correct category weights totaling 1.0', () => {
      const totalWeight = Object.values(generator.categoryWeights)
        .reduce((sum, weight) => sum + weight, 0);
      
      expect(totalWeight).toBeCloseTo(1.0, 2);
    });
  });

  describe('Score Calculation', () => {
    test('should calculate overall score correctly', () => {
      const overallScore = generator.calculateOverallScore();
      
      // Expected calculation:
      // security: 95 * 0.20 = 19.0
      // data-integrity: 98 * 0.20 = 19.6
      // user-functionality: 88 * 0.15 = 13.2
      // performance: 75 * 0.15 = 11.25
      // Total: 63.05 (other categories default to 0)
      
      expect(overallScore).toBeGreaterThan(60);
      expect(overallScore).toBeLessThan(70);
    });

    test('should handle missing categories gracefully', () => {
      generator.validationResults.clear();
      generator.validationResults.set('security-validation', {
        score: 100,
        issues: []
      });

      const overallScore = generator.calculateOverallScore();
      expect(overallScore).toBeGreaterThan(0);
      expect(overallScore).toBeLessThan(100);
    });

    test('should weight categories correctly', () => {
      // Set all categories to same score
      for (const [category] of generator.validationResults) {
        generator.validationResults.set(category, {
          score: 80,
          issues: []
        });
      }

      const overallScore = generator.calculateOverallScore();
      expect(overallScore).toBeCloseTo(80, 1);
    });
  });

  describe('Issue Aggregation', () => {
    test('should aggregate issues by severity', () => {
      const issues = generator.aggregateIssues();

      expect(issues.CRITICAL).toHaveLength(0);
      expect(issues.HIGH).toHaveLength(1);
      expect(issues.MEDIUM).toHaveLength(2);
      expect(issues.LOW).toHaveLength(0);
    });

    test('should include category information in aggregated issues', () => {
      const issues = generator.aggregateIssues();
      const highIssue = issues.HIGH[0];

      expect(highIssue.category).toBe('performance-testing');
      expect(highIssue.source).toBe('performance-testing');
      expect(highIssue.message).toBe('Slow API response');
    });

    test('should handle empty issues arrays', () => {
      generator.validationResults.set('test-category', {
        score: 100,
        issues: []
      });

      const issues = generator.aggregateIssues();
      expect(Object.values(issues).flat()).toHaveLength(3); // Only existing issues
    });
  });

  describe('Deployment Recommendation', () => {
    test('should recommend GO for high scores with no critical issues', () => {
      // Set all categories to high scores
      for (const [category] of generator.validationResults) {
        generator.validationResults.set(category, {
          score: 96,
          issues: []
        });
      }

      const recommendation = generator.generateDeploymentRecommendation();
      expect(recommendation.recommendation).toBe('GO');
      expect(recommendation.criticalIssues).toBe(0);
    });

    test('should recommend NO_GO for critical issues', () => {
      generator.validationResults.set('security-validation', {
        score: 95,
        issues: [
          { severity: 'CRITICAL', message: 'Security vulnerability', category: 'security' }
        ]
      });

      const recommendation = generator.generateDeploymentRecommendation();
      expect(recommendation.recommendation).toBe('NO_GO');
      expect(recommendation.criticalIssues).toBe(1);
    });

    test('should recommend CONDITIONAL for low overall score', () => {
      // Set performance to very low score
      generator.validationResults.set('performance-testing', {
        score: 60,
        issues: [
          { severity: 'HIGH', message: 'Performance issue', category: 'performance' }
        ]
      });

      const recommendation = generator.generateDeploymentRecommendation();
      expect(recommendation.recommendation).toBe('CONDITIONAL');
      expect(recommendation.conditions.length).toBeGreaterThan(0);
    });

    test('should include reasoning in recommendation', () => {
      const recommendation = generator.generateDeploymentRecommendation();
      
      expect(recommendation.reasoning).toBeDefined();
      expect(Array.isArray(recommendation.reasoning)).toBe(true);
      expect(recommendation.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('Executive Summary Generation', () => {
    test('should generate complete executive summary', () => {
      const summary = generator.generateExecutiveSummary();

      expect(summary.overallReadinessScore).toBeDefined();
      expect(summary.deploymentRecommendation).toBeDefined();
      expect(summary.criticalIssues).toBeDefined();
      expect(summary.highPriorityIssues).toBeDefined();
      expect(summary.keyRiskAreas).toBeDefined();
      expect(summary.estimatedTimeToReady).toBeDefined();
      expect(summary.resourceRequirements).toBeDefined();
      expect(summary.summary).toBeDefined();
    });

    test('should identify key risk areas correctly', () => {
      const summary = generator.generateExecutiveSummary();
      const riskAreas = summary.keyRiskAreas;

      expect(Array.isArray(riskAreas)).toBe(true);
      
      // Performance should be highest risk due to low score and high weight
      if (riskAreas.length > 0) {
        expect(riskAreas[0].category).toBe('performance-testing');
      }
    });

    test('should estimate time to ready based on issues', () => {
      const summary = generator.generateExecutiveSummary();
      const timeEstimate = summary.estimatedTimeToReady;

      expect(timeEstimate.estimatedHours).toBeGreaterThan(0);
      expect(timeEstimate.estimatedDays).toBeGreaterThan(0);
      expect(timeEstimate.confidence).toMatch(/HIGH|MEDIUM|LOW/);
    });

    test('should estimate resource requirements', () => {
      const summary = generator.generateExecutiveSummary();
      const resources = summary.resourceRequirements;

      expect(resources.developers).toBeGreaterThan(0);
      expect(resources.qaEngineers).toBeGreaterThan(0);
      expect(resources.totalTeamSize).toBeGreaterThan(0);
      expect(Array.isArray(resources.specialistNeeded)).toBe(true);
    });
  });

  describe('Detailed Report Generation', () => {
    test('should generate detailed technical report', () => {
      const report = generator.generateDetailedReport();

      expect(report.overallScore).toBeDefined();
      expect(report.categoryResults).toBeDefined();
      expect(report.performanceBenchmarks).toBeDefined();
      expect(report.securityAssessment).toBeDefined();
      expect(report.complianceStatus).toBeDefined();
      expect(report.infrastructureReadiness).toBeDefined();
      expect(report.mobileValidationResults).toBeDefined();
    });

    test('should include category-specific recommendations', () => {
      const report = generator.generateDetailedReport();
      const categoryResults = report.categoryResults;

      for (const [category, result] of Object.entries(categoryResults)) {
        expect(result.recommendations).toBeDefined();
        expect(Array.isArray(result.recommendations)).toBe(true);
        
        if (result.score < 95) {
          expect(result.recommendations.length).toBeGreaterThan(0);
        }
      }
    });

    test('should extract performance benchmarks', () => {
      const report = generator.generateDetailedReport();
      const benchmarks = report.performanceBenchmarks;

      expect(benchmarks.apiResponseTime).toBeDefined();
      expect(benchmarks.databaseQueryTime).toBeDefined();
      expect(benchmarks.pageLoadTime).toBeDefined();
      expect(benchmarks.throughput).toBeDefined();
      expect(benchmarks.status).toBeDefined();
    });
  });

  describe('Report Format Generation', () => {
    test('should generate HTML report', async () => {
      const htmlReport = await generator.generateHTMLReport();

      expect(typeof htmlReport).toBe('string');
      expect(htmlReport).toContain('<!DOCTYPE html>');
      expect(htmlReport).toContain('Production Readiness Report');
      expect(htmlReport).toContain('Executive Summary');
      expect(htmlReport).toContain('Validation Category Results');
    });

    test('should generate JSON report', () => {
      const jsonReport = generator.generateJSONReport();

      expect(jsonReport.metadata).toBeDefined();
      expect(jsonReport.executiveSummary).toBeDefined();
      expect(jsonReport.detailedReport).toBeDefined();
      expect(jsonReport.deploymentRecommendation).toBeDefined();
      expect(jsonReport.issues).toBeDefined();
      expect(jsonReport.validationResults).toBeDefined();
    });

    test('should generate Markdown report', () => {
      const markdownReport = generator.generateMarkdownReport();

      expect(typeof markdownReport).toBe('string');
      expect(markdownReport).toContain('# Production Readiness Report');
      expect(markdownReport).toContain('## Executive Summary');
      expect(markdownReport).toContain('## Validation Category Results');
      expect(markdownReport).toContain('| Category | Score |');
    });

    test('should generate all report formats', async () => {
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      const reports = await generator.generateAllReports();

      expect(reports.html).toBeDefined();
      expect(reports.json).toBeDefined();
      expect(reports.markdown).toBeDefined();
      expect(reports.summary).toBeDefined();

      expect(fs.mkdir).toHaveBeenCalledWith('/test/output', { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledTimes(4); // HTML, JSON, Markdown, Summary
    });
  });

  describe('Mock Results Generation', () => {
    test('should generate realistic mock results', () => {
      const mockResult = generator.generateMockResults('test-category');

      expect(mockResult.category).toBe('test-category');
      expect(mockResult.score).toBeGreaterThanOrEqual(0);
      expect(mockResult.score).toBeLessThanOrEqual(100);
      expect(mockResult.status).toMatch(/passed|warning|failed/);
      expect(Array.isArray(mockResult.issues)).toBe(true);
      expect(mockResult.metrics).toBeDefined();
      expect(mockResult.timestamp).toBeDefined();
    });

    test('should generate appropriate issues based on score', () => {
      // Mock low score category
      generator.validationResults.set('low-score-category', {
        score: 70,
        issues: []
      });

      const mockResult = generator.generateMockResults('low-score-category');
      
      if (mockResult.score < 80) {
        expect(mockResult.issues.length).toBeGreaterThan(0);
        expect(mockResult.issues.some(issue => issue.severity === 'HIGH')).toBe(true);
      }
    });
  });

  describe('Validation Results Loading', () => {
    test('should load validation results from files', async () => {
      const mockFileContent = JSON.stringify({
        category: 'test-category',
        score: 90,
        status: 'passed',
        issues: [],
        metrics: {}
      });

      fs.readFile.mockResolvedValue(mockFileContent);

      const result = await generator.loadCategoryResults('test-category');

      expect(result.category).toBe('test-category');
      expect(result.score).toBe(90);
      expect(result.status).toBe('passed');
    });

    test('should handle missing validation files gracefully', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await generator.loadCategoryResults('missing-category');

      expect(result.category).toBe('missing-category');
      expect(result.score).toBeDefined();
      expect(result.status).toBeDefined();
    });

    test('should load all validation results', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({
        score: 95,
        status: 'passed',
        issues: []
      }));

      await generator.loadValidationResults();

      expect(generator.validationResults.size).toBeGreaterThan(0);
      
      // Check that all categories are loaded
      const expectedCategories = Object.keys(generator.categoryWeights);
      for (const category of expectedCategories) {
        expect(generator.validationResults.has(category)).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty validation results', () => {
      generator.validationResults.clear();

      const overallScore = generator.calculateOverallScore();
      const issues = generator.aggregateIssues();
      const recommendation = generator.generateDeploymentRecommendation();

      expect(overallScore).toBe(0);
      expect(Object.values(issues).flat()).toHaveLength(0);
      expect(recommendation.recommendation).toBe('NO_GO');
    });

    test('should handle malformed validation data', () => {
      generator.validationResults.set('malformed', {
        // Missing required fields
        score: null,
        issues: 'not-an-array'
      });

      expect(() => {
        generator.calculateOverallScore();
      }).not.toThrow();

      expect(() => {
        generator.aggregateIssues();
      }).not.toThrow();
    });

    test('should handle extreme scores', () => {
      generator.validationResults.set('perfect', { score: 100, issues: [] });
      generator.validationResults.set('zero', { score: 0, issues: [] });

      const overallScore = generator.calculateOverallScore();
      expect(overallScore).toBeGreaterThanOrEqual(0);
      expect(overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Category Recommendations', () => {
    test('should generate security-specific recommendations', () => {
      const recommendations = generator.generateCategoryRecommendations(
        'security-validation',
        { score: 85, issues: [] }
      );

      expect(recommendations).toContain('Conduct additional security penetration testing');
      expect(recommendations).toContain('Review and update security policies');
    });

    test('should generate performance-specific recommendations', () => {
      const recommendations = generator.generateCategoryRecommendations(
        'performance-testing',
        { score: 80, issues: [] }
      );

      expect(recommendations).toContain('Optimize database queries and API response times');
      expect(recommendations).toContain('Implement additional caching strategies');
    });

    test('should generate mobile-specific recommendations', () => {
      const recommendations = generator.generateCategoryRecommendations(
        'mobile-validation',
        { score: 85, issues: [] }
      );

      expect(recommendations).toContain('Test mobile applications on additional device configurations');
      expect(recommendations).toContain('Optimize mobile user experience and performance');
    });
  });
});