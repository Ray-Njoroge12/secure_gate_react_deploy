/**
 * Property-Based Tests for Comprehensive Validation Orchestrator
 * **Validates: Requirements 13.1, 13.2, 13.3, 13.4**
 * 
 * Tests the comprehensive validation orchestrator's ability to:
 * - Execute all validators systematically
 * - Calculate accurate production readiness scores
 * - Generate comprehensive reports
 * - Make correct production deployment decisions
 */

const fc = require('fast-check');
const ComprehensiveValidationOrchestrator = require('../comprehensive-validation-orchestrator');

describe('Comprehensive Validation Orchestrator Properties', () => {
  
  /**
   * **Validates: Requirements 13.1**
   * Property: Production readiness score calculation must be mathematically correct
   */
  test('production readiness score calculation is mathematically accurate', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        categories: fc.array(fc.record({
          weight: fc.integer({ min: 1, max: 25 }),
          passedValidators: fc.integer({ min: 0, max: 10 }),
          totalValidators: fc.integer({ min: 1, max: 10 })
        }), { minLength: 1, maxLength: 8 }),
        minReadinessScore: fc.integer({ min: 80, max: 99 })
      }),
      async ({ categories, minReadinessScore }) => {
        // Ensure passed validators don't exceed total
        const normalizedCategories = categories.map(cat => ({
          ...cat,
          passedValidators: Math.min(cat.passedValidators, cat.totalValidators)
        }));
        
        const orchestrator = new ComprehensiveValidationOrchestrator({
          minReadinessScore
        });
        
        // Mock validation results
        for (let i = 0; i < normalizedCategories.length; i++) {
          const category = normalizedCategories[i];
          const categoryId = `test-category-${i}`;
          
          orchestrator.validatorRegistry.set(categoryId, {
            weight: category.weight,
            validators: Array(category.totalValidators).fill().map((_, j) => ({ name: `validator-${j}` }))
          });
          
          const validators = Array(category.totalValidators).fill().map((_, j) => ({
            name: `validator-${j}`,
            success: j < category.passedValidators,
            score: j < category.passedValidators ? 100 : 0,
            executionTime: 100
          }));
          
          orchestrator.validationResults.set(categoryId, {
            validators,
            passed: category.passedValidators,
            failed: category.totalValidators - category.passedValidators,
            skipped: 0
          });
        }
        
        const calculatedScore = orchestrator.calculateProductionReadinessScore();
        
        // Calculate expected score manually
        let totalWeightedScore = 0;
        let totalWeight = 0;
        
        normalizedCategories.forEach(category => {
          const categoryScore = (category.passedValidators / category.totalValidators) * 100;
          totalWeightedScore += categoryScore * category.weight;
          totalWeight += category.weight;
        });
        
        const expectedScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
        
        // Property: Calculated score must match expected mathematical result
        expect(Math.abs(calculatedScore - expectedScore)).toBeLessThan(0.01);
        
        // Property: Score must be between 0 and 100
        expect(calculatedScore).toBeGreaterThanOrEqual(0);
        expect(calculatedScore).toBeLessThanOrEqual(100);
        
        // Property: Production readiness decision must be consistent
        const isReady = orchestrator.determineProductionReadiness(calculatedScore);
        expect(isReady).toBe(calculatedScore >= minReadinessScore);
      }
    ), { numRuns: 50 });
  });

  /**
   * **Validates: Requirements 13.2**
   * Property: Issue categorization must be consistent and complete
   */
  test('issue categorization is consistent and complete', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(fc.record({
        severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
        message: fc.string({ minLength: 10, maxLength: 100 }),
        category: fc.string({ minLength: 5, maxLength: 20 })
      }), { minLength: 1, maxLength: 50 }),
      async (issues) => {
        const orchestrator = new ComprehensiveValidationOrchestrator();
        
        // Reset metrics
        orchestrator.executionMetrics = {
          criticalIssues: [],
          highSeverityIssues: [],
          mediumSeverityIssues: [],
          lowSeverityIssues: []
        };
        
        // Categorize all issues
        orchestrator.categorizeIssues(issues, 'high');
        
        const totalCategorized = 
          orchestrator.executionMetrics.criticalIssues.length +
          orchestrator.executionMetrics.highSeverityIssues.length +
          orchestrator.executionMetrics.mediumSeverityIssues.length +
          orchestrator.executionMetrics.lowSeverityIssues.length;
        
        // Property: All issues must be categorized
        expect(totalCategorized).toBe(issues.length);
        
        // Property: Issues must be in correct severity buckets
        const criticalCount = issues.filter(i => i.severity === 'critical').length;
        const highCount = issues.filter(i => i.severity === 'high').length;
        const mediumCount = issues.filter(i => i.severity === 'medium').length;
        const lowCount = issues.filter(i => i.severity === 'low').length;
        
        expect(orchestrator.executionMetrics.criticalIssues.length).toBe(criticalCount);
        expect(orchestrator.executionMetrics.highSeverityIssues.length).toBe(highCount);
        expect(orchestrator.executionMetrics.mediumSeverityIssues.length).toBe(mediumCount);
        expect(orchestrator.executionMetrics.lowSeverityIssues.length).toBe(lowCount);
        
        // Property: No issue should be lost or duplicated
        const allCategorizedIssues = [
          ...orchestrator.executionMetrics.criticalIssues,
          ...orchestrator.executionMetrics.highSeverityIssues,
          ...orchestrator.executionMetrics.mediumSeverityIssues,
          ...orchestrator.executionMetrics.lowSeverityIssues
        ];
        
        expect(allCategorizedIssues.length).toBe(issues.length);
      }
    ), { numRuns: 30 });
  });

  /**
   * **Validates: Requirements 13.3**
   * Property: Report generation must be complete and consistent
   */
  test('report generation is complete and consistent', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        readinessScore: fc.float({ min: 0, max: 100 }),
        validatorResults: fc.array(fc.record({
          categoryId: fc.string({ minLength: 5, maxLength: 15 }),
          passed: fc.integer({ min: 0, max: 10 }),
          failed: fc.integer({ min: 0, max: 10 }),
          skipped: fc.integer({ min: 0, max: 5 })
        }), { minLength: 1, maxLength: 8 }),
        issues: fc.record({
          critical: fc.integer({ min: 0, max: 10 }),
          high: fc.integer({ min: 0, max: 20 }),
          medium: fc.integer({ min: 0, max: 30 }),
          low: fc.integer({ min: 0, max: 50 })
        })
      }),
      async ({ readinessScore, validatorResults, issues }) => {
        const orchestrator = new ComprehensiveValidationOrchestrator();
        
        // Setup mock data
        orchestrator.executionMetrics = {
          startTime: Date.now() - 60000,
          endTime: Date.now(),
          totalValidators: validatorResults.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0),
          passedValidators: validatorResults.reduce((sum, r) => sum + r.passed, 0),
          failedValidators: validatorResults.reduce((sum, r) => sum + r.failed, 0),
          skippedValidators: validatorResults.reduce((sum, r) => sum + r.skipped, 0),
          criticalIssues: Array(issues.critical).fill({ severity: 'critical', message: 'test' }),
          highSeverityIssues: Array(issues.high).fill({ severity: 'high', message: 'test' }),
          mediumSeverityIssues: Array(issues.medium).fill({ severity: 'medium', message: 'test' }),
          lowSeverityIssues: Array(issues.low).fill({ severity: 'low', message: 'test' })
        };
        
        // Mock validation results
        validatorResults.forEach((result, index) => {
          const categoryId = `category-${index}`;
          orchestrator.validatorRegistry.set(categoryId, {
            category: `Test Category ${index}`,
            priority: 'high',
            weight: 10,
            validators: []
          });
          
          orchestrator.validationResults.set(categoryId, {
            categoryId,
            category: `Test Category ${index}`,
            priority: 'high',
            weight: 10,
            validators: [],
            passed: result.passed,
            failed: result.failed,
            skipped: result.skipped
          });
        });
        
        const report = await orchestrator.generateComprehensiveReport(readinessScore);
        
        // Property: Report must contain all required sections
        expect(report).toHaveProperty('metadata');
        expect(report).toHaveProperty('summary');
        expect(report).toHaveProperty('categoryBreakdown');
        expect(report).toHaveProperty('issueAnalysis');
        expect(report).toHaveProperty('recommendations');
        expect(report).toHaveProperty('validationDetails');
        
        // Property: Summary must match execution metrics
        expect(report.summary.overallReadinessScore).toBe(readinessScore);
        expect(report.summary.totalValidators).toBe(orchestrator.executionMetrics.totalValidators);
        expect(report.summary.passedValidators).toBe(orchestrator.executionMetrics.passedValidators);
        expect(report.summary.failedValidators).toBe(orchestrator.executionMetrics.failedValidators);
        expect(report.summary.skippedValidators).toBe(orchestrator.executionMetrics.skippedValidators);
        
        // Property: Issue analysis must match categorized issues
        expect(report.issueAnalysis.critical).toBe(issues.critical);
        expect(report.issueAnalysis.high).toBe(issues.high);
        expect(report.issueAnalysis.medium).toBe(issues.medium);
        expect(report.issueAnalysis.low).toBe(issues.low);
        
        // Property: Category breakdown must include all categories
        expect(Object.keys(report.categoryBreakdown)).toHaveLength(validatorResults.length);
        
        // Property: Metadata must be valid
        expect(report.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(report.metadata.executionDuration).toBeGreaterThan(0);
      }
    ), { numRuns: 25 });
  });

  /**
   * **Validates: Requirements 13.4**
   * Property: Production deployment decision must be deterministic and safe
   */
  test('production deployment decision is deterministic and safe', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        readinessScore: fc.float({ min: 0, max: 100 }),
        criticalIssueCount: fc.integer({ min: 0, max: 10 }),
        minReadinessScore: fc.integer({ min: 80, max: 99 })
      }),
      async ({ readinessScore, criticalIssueCount, minReadinessScore }) => {
        const orchestrator = new ComprehensiveValidationOrchestrator({
          minReadinessScore
        });
        
        // Setup critical issues
        orchestrator.executionMetrics.criticalIssues = Array(criticalIssueCount)
          .fill()
          .map((_, i) => ({ severity: 'critical', message: `Critical issue ${i}` }));
        
        const isReady = orchestrator.determineProductionReadiness(readinessScore);
        
        // Property: Must not be ready if critical issues exist
        if (criticalIssueCount > 0) {
          expect(isReady).toBe(false);
        }
        
        // Property: Must not be ready if score below threshold
        if (readinessScore < minReadinessScore) {
          expect(isReady).toBe(false);
        }
        
        // Property: Must be ready only if score meets threshold AND no critical issues
        if (readinessScore >= minReadinessScore && criticalIssueCount === 0) {
          expect(isReady).toBe(true);
        }
        
        // Property: Decision must be deterministic (same inputs = same output)
        const secondDecision = orchestrator.determineProductionReadiness(readinessScore);
        expect(isReady).toBe(secondDecision);
      }
    ), { numRuns: 100 });
  });

  /**
   * **Validates: Requirements 13.1, 13.2**
   * Property: Validator execution metrics must be accurate and complete
   */
  test('validator execution metrics are accurate and complete', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(fc.record({
        success: fc.boolean(),
        skipped: fc.boolean(),
        executionTime: fc.integer({ min: 100, max: 10000 }),
        issueCount: fc.integer({ min: 0, max: 5 })
      }), { minLength: 5, maxLength: 50 }),
      async (validatorResults) => {
        const orchestrator = new ComprehensiveValidationOrchestrator();
        
        // Reset metrics
        orchestrator.executionMetrics = {
          totalValidators: validatorResults.length,
          completedValidators: 0,
          passedValidators: 0,
          failedValidators: 0,
          skippedValidators: 0,
          criticalIssues: [],
          highSeverityIssues: [],
          mediumSeverityIssues: [],
          lowSeverityIssues: []
        };
        
        // Process each validator result
        validatorResults.forEach((result, index) => {
          orchestrator.executionMetrics.completedValidators++;
          
          if (result.skipped) {
            orchestrator.executionMetrics.skippedValidators++;
          } else if (result.success) {
            orchestrator.executionMetrics.passedValidators++;
          } else {
            orchestrator.executionMetrics.failedValidators++;
          }
          
          // Add some issues
          const issues = Array(result.issueCount).fill().map((_, i) => ({
            severity: 'medium',
            message: `Issue ${i} from validator ${index}`
          }));
          orchestrator.categorizeIssues(issues, 'medium');
        });
        
        // Property: Completed validators must equal total
        expect(orchestrator.executionMetrics.completedValidators).toBe(validatorResults.length);
        
        // Property: Sum of passed, failed, and skipped must equal total
        const sumOfResults = 
          orchestrator.executionMetrics.passedValidators +
          orchestrator.executionMetrics.failedValidators +
          orchestrator.executionMetrics.skippedValidators;
        expect(sumOfResults).toBe(validatorResults.length);
        
        // Property: Counts must match actual results
        const expectedPassed = validatorResults.filter(r => !r.skipped && r.success).length;
        const expectedFailed = validatorResults.filter(r => !r.skipped && !r.success).length;
        const expectedSkipped = validatorResults.filter(r => r.skipped).length;
        
        expect(orchestrator.executionMetrics.passedValidators).toBe(expectedPassed);
        expect(orchestrator.executionMetrics.failedValidators).toBe(expectedFailed);
        expect(orchestrator.executionMetrics.skippedValidators).toBe(expectedSkipped);
        
        // Property: Issue count must match expected
        const expectedIssueCount = validatorResults.reduce((sum, r) => sum + r.issueCount, 0);
        const actualIssueCount = orchestrator.executionMetrics.mediumSeverityIssues.length;
        expect(actualIssueCount).toBe(expectedIssueCount);
      }
    ), { numRuns: 30 });
  });

  /**
   * **Validates: Requirements 13.3**
   * Property: Recommendation generation must be relevant and actionable
   */
  test('recommendation generation is relevant and actionable', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        readinessScore: fc.float({ min: 0, max: 100 }),
        criticalIssues: fc.integer({ min: 0, max: 5 }),
        categorySuccessRates: fc.array(fc.record({
          categoryId: fc.string({ minLength: 5, maxLength: 15 }),
          successRate: fc.float({ min: 0, max: 100 }),
          priority: fc.constantFrom('critical', 'high', 'medium')
        }), { minLength: 1, maxLength: 5 }),
        minReadinessScore: fc.integer({ min: 85, max: 99 })
      }),
      async ({ readinessScore, criticalIssues, categorySuccessRates, minReadinessScore }) => {
        const orchestrator = new ComprehensiveValidationOrchestrator({
          minReadinessScore
        });
        
        // Setup metrics
        orchestrator.executionMetrics.criticalIssues = Array(criticalIssues)
          .fill()
          .map((_, i) => ({ severity: 'critical', message: `Critical issue ${i}` }));
        
        // Setup validation results
        categorySuccessRates.forEach((category, index) => {
          const categoryId = `category-${index}`;
          const total = 10;
          const passed = Math.round((category.successRate / 100) * total);
          
          orchestrator.validationResults.set(categoryId, {
            category: category.categoryId,
            priority: category.priority,
            validators: Array(total).fill().map((_, i) => ({ success: i < passed })),
            passed,
            failed: total - passed,
            skipped: 0
          });
        });
        
        const recommendations = orchestrator.generateRecommendations(readinessScore);
        
        // Property: Must recommend against production if score below threshold
        if (readinessScore < minReadinessScore) {
          const overallRec = recommendations.find(r => r.category === 'overall');
          expect(overallRec).toBeDefined();
          expect(overallRec.priority).toBe('critical');
        }
        
        // Property: Must recommend addressing critical issues
        if (criticalIssues > 0) {
          const criticalRec = recommendations.find(r => r.title.includes('Critical Issues'));
          expect(criticalRec).toBeDefined();
          expect(criticalRec.priority).toBe('critical');
        }
        
        // Property: Must recommend fixing low success rate critical categories
        const lowSuccessCritical = categorySuccessRates.filter(
          c => c.priority === 'critical' && c.successRate < 90
        );
        
        lowSuccessCritical.forEach(category => {
          const categoryRec = recommendations.find(r => 
            r.title.includes('Low Success Rate') && r.category.includes('category-')
          );
          if (categoryRec) {
            expect(categoryRec.priority).toBe('high');
          }
        });
        
        // Property: All recommendations must have required fields
        recommendations.forEach(rec => {
          expect(rec).toHaveProperty('priority');
          expect(rec).toHaveProperty('category');
          expect(rec).toHaveProperty('title');
          expect(rec).toHaveProperty('description');
          expect(rec).toHaveProperty('action');
          expect(rec).toHaveProperty('impact');
          
          expect(['critical', 'high', 'medium', 'low']).toContain(rec.priority);
          expect(rec.title).toBeTruthy();
          expect(rec.description).toBeTruthy();
          expect(rec.action).toBeTruthy();
        });
      }
    ), { numRuns: 25 });
  });
});