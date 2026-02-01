/**
 * Property-Based Tests for Production Readiness Reporting
 * 
 * Tests fundamental properties of the reporting system including
 * score calculation consistency, issue prioritization correctness,
 * and report completeness.
 */

import fc from 'fast-check';
import ProductionReadinessReportGenerator from '../production-readiness-report-generator.js';

describe('Production Readiness Reporting Properties', () => {
  
  // Generators for test data
  const validationResultGenerator = fc.record({
    category: fc.constantFrom(
      'security-validation', 'data-integrity', 'user-functionality',
      'performance-testing', 'compliance-documentation', 'mobile-validation'
    ),
    score: fc.integer({ min: 0, max: 100 }),
    status: fc.constantFrom('passed', 'warning', 'failed'),
    issues: fc.array(fc.record({
      severity: fc.constantFrom('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
      message: fc.string({ minLength: 10, maxLength: 100 }),
      category: fc.string({ minLength: 3, maxLength: 20 }),
      recommendation: fc.option(fc.string({ minLength: 10, maxLength: 200 }))
    }), { maxLength: 10 }),
    metrics: fc.record({
      testsRun: fc.integer({ min: 0, max: 1000 }),
      testsPassed: fc.integer({ min: 0, max: 1000 }),
      testsFailed: fc.integer({ min: 0, max: 100 }),
      coverage: fc.float({ min: 0, max: 100 })
    }),
    timestamp: fc.constant(new Date().toISOString())
  });

  const validationResultsMapGenerator = fc.array(validationResultGenerator, { minLength: 1, maxLength: 12 })
    .map(results => {
      const map = new Map();
      results.forEach(result => {
        map.set(result.category, result);
      });
      return map;
    });

  /**
   * **Validates: Requirements 1.1, 1.2**
   * Property: Score calculation must be consistent and mathematically correct
   */
  test('score calculation consistency property', () => {
    fc.assert(fc.property(
      validationResultsMapGenerator,
      (validationResults) => {
        const generator = new ProductionReadinessReportGenerator();
        generator.validationResults = validationResults;

        const overallScore = generator.calculateOverallScore();

        // Property 1: Score must be between 0 and 100
        expect(overallScore).toBeGreaterThanOrEqual(0);
        expect(overallScore).toBeLessThanOrEqual(100);

        // Property 2: Score must be deterministic (same inputs = same output)
        const secondCalculation = generator.calculateOverallScore();
        expect(overallScore).toBe(secondCalculation);

        // Property 3: If all category scores are the same, overall score should be close to that value
        const allSameScore = 85;
        const sameScoreResults = new Map();
        for (const [category] of validationResults) {
          sameScoreResults.set(category, { score: allSameScore, issues: [] });
        }
        generator.validationResults = sameScoreResults;
        const uniformScore = generator.calculateOverallScore();
        
        if (sameScoreResults.size > 0) {
          expect(Math.abs(uniformScore - allSameScore)).toBeLessThan(5);
        }

        // Property 4: Weighted calculation correctness
        let expectedWeightedSum = 0;
        let totalWeight = 0;
        for (const [category, result] of validationResults) {
          const weight = generator.categoryWeights[category] || 0.05;
          expectedWeightedSum += result.score * weight;
          totalWeight += weight;
        }
        const expectedScore = totalWeight > 0 ? expectedWeightedSum / totalWeight : 0;
        
        if (totalWeight > 0) {
          expect(Math.abs(overallScore - expectedScore)).toBeLessThan(0.1);
        }
      }
    ));
  });

  /**
   * **Validates: Requirements 1.3, 1.4**
   * Property: Issue prioritization must be correct and consistent
   */
  test('issue prioritization correctness property', () => {
    fc.assert(fc.property(
      validationResultsMapGenerator,
      (validationResults) => {
        const generator = new ProductionReadinessReportGenerator();
        generator.validationResults = validationResults;

        const aggregatedIssues = generator.aggregateIssues();

        // Property 1: All severity levels must be present in result
        expect(aggregatedIssues).toHaveProperty('CRITICAL');
        expect(aggregatedIssues).toHaveProperty('HIGH');
        expect(aggregatedIssues).toHaveProperty('MEDIUM');
        expect(aggregatedIssues).toHaveProperty('LOW');

        // Property 2: Each severity level must be an array
        Object.values(aggregatedIssues).forEach(issueArray => {
          expect(Array.isArray(issueArray)).toBe(true);
        });

        // Property 3: Total issues count must match input
        const totalInputIssues = Array.from(validationResults.values())
          .reduce((sum, result) => sum + (result.issues?.length || 0), 0);
        const totalOutputIssues = Object.values(aggregatedIssues)
          .reduce((sum, issues) => sum + issues.length, 0);
        
        expect(totalOutputIssues).toBe(totalInputIssues);

        // Property 4: Issues must maintain their severity classification
        for (const [category, result] of validationResults) {
          if (result.issues) {
            result.issues.forEach(issue => {
              const severity = issue.severity || 'MEDIUM';
              const foundInSeverity = aggregatedIssues[severity].some(
                aggregatedIssue => aggregatedIssue.message === issue.message &&
                                 aggregatedIssue.category === category
              );
              expect(foundInSeverity).toBe(true);
            });
          }
        }

        // Property 5: Issues must include source category information
        Object.values(aggregatedIssues).flat().forEach(issue => {
          expect(issue).toHaveProperty('category');
          expect(issue).toHaveProperty('source');
          expect(typeof issue.category).toBe('string');
          expect(typeof issue.source).toBe('string');
        });
      }
    ));
  });

  /**
   * **Validates: Requirements 1.5, 1.6**
   * Property: Deployment recommendations must be logical and consistent
   */
  test('deployment recommendation logic property', () => {
    fc.assert(fc.property(
      validationResultsMapGenerator,
      (validationResults) => {
        const generator = new ProductionReadinessReportGenerator();
        generator.validationResults = validationResults;

        const recommendation = generator.generateDeploymentRecommendation();
        const issues = generator.aggregateIssues();
        const overallScore = generator.calculateOverallScore();

        // Property 1: Recommendation must be one of valid values
        expect(['GO', 'CONDITIONAL', 'NO_GO']).toContain(recommendation.recommendation);

        // Property 2: Critical issues must block deployment
        if (issues.CRITICAL.length > 0) {
          expect(recommendation.recommendation).toBe('NO_GO');
        }

        // Property 3: Very low scores should not get GO recommendation
        if (overallScore < 80) {
          expect(recommendation.recommendation).not.toBe('GO');
        }

        // Property 4: Perfect scores with no issues should get GO
        if (overallScore >= 95 && issues.CRITICAL.length === 0 && issues.HIGH.length <= 5) {
          // Should be GO or CONDITIONAL, not NO_GO
          expect(recommendation.recommendation).not.toBe('NO_GO');
        }

        // Property 5: Recommendation must include reasoning
        expect(Array.isArray(recommendation.reasoning)).toBe(true);
        expect(recommendation.reasoning.length).toBeGreaterThan(0);

        // Property 6: Score in recommendation must match calculated score
        expect(Math.abs(recommendation.score - overallScore)).toBeLessThan(0.1);

        // Property 7: Critical and high issue counts must be accurate
        expect(recommendation.criticalIssues).toBe(issues.CRITICAL.length);
        expect(recommendation.highIssues).toBe(issues.HIGH.length);

        // Property 8: Conditions should exist for CONDITIONAL recommendations
        if (recommendation.recommendation === 'CONDITIONAL') {
          expect(Array.isArray(recommendation.conditions)).toBe(true);
        }
      }
    ));
  });

  /**
   * **Validates: Requirements 1.7, 1.8**
   * Property: Report completeness and data integrity
   */
  test('report completeness and integrity property', () => {
    fc.assert(fc.property(
      validationResultsMapGenerator,
      (validationResults) => {
        const generator = new ProductionReadinessReportGenerator();
        generator.validationResults = validationResults;

        const executiveSummary = generator.generateExecutiveSummary();
        const detailedReport = generator.generateDetailedReport();
        const jsonReport = generator.generateJSONReport();

        // Property 1: Executive summary must contain all required fields
        const requiredSummaryFields = [
          'overallReadinessScore', 'deploymentRecommendation', 'criticalIssues',
          'highPriorityIssues', 'totalIssues', 'keyRiskAreas', 'estimatedTimeToReady',
          'resourceRequirements', 'summary'
        ];
        requiredSummaryFields.forEach(field => {
          expect(executiveSummary).toHaveProperty(field);
        });

        // Property 2: Detailed report must contain all required sections
        const requiredDetailedFields = [
          'overallScore', 'categoryResults', 'performanceBenchmarks',
          'securityAssessment', 'complianceStatus', 'infrastructureReadiness',
          'mobileValidationResults'
        ];
        requiredDetailedFields.forEach(field => {
          expect(detailedReport).toHaveProperty(field);
        });

        // Property 3: JSON report must be complete and valid
        expect(jsonReport).toHaveProperty('metadata');
        expect(jsonReport).toHaveProperty('executiveSummary');
        expect(jsonReport).toHaveProperty('detailedReport');
        expect(jsonReport).toHaveProperty('deploymentRecommendation');
        expect(jsonReport).toHaveProperty('issues');
        expect(jsonReport).toHaveProperty('validationResults');

        // Property 4: Scores must be consistent across reports
        expect(executiveSummary.overallReadinessScore).toBe(detailedReport.overallScore);
        expect(detailedReport.overallScore).toBe(jsonReport.deploymentRecommendation.score);

        // Property 5: Issue counts must be consistent
        const issuesFromSummary = executiveSummary.criticalIssues + executiveSummary.highPriorityIssues;
        const issuesFromJson = jsonReport.issues.CRITICAL.length + jsonReport.issues.HIGH.length;
        expect(issuesFromSummary).toBe(issuesFromJson);

        // Property 6: Category results must match input categories
        const inputCategories = new Set(validationResults.keys());
        const outputCategories = new Set(Object.keys(detailedReport.categoryResults));
        
        // All input categories should be in output (may have additional mock categories)
        inputCategories.forEach(category => {
          expect(outputCategories.has(category)).toBe(true);
        });

        // Property 7: Time estimates must be reasonable
        const timeEstimate = executiveSummary.estimatedTimeToReady;
        expect(timeEstimate.estimatedHours).toBeGreaterThanOrEqual(0);
        expect(timeEstimate.estimatedDays).toBeGreaterThanOrEqual(0);
        expect(timeEstimate.estimatedWeeks).toBeGreaterThanOrEqual(0);
        expect(['HIGH', 'MEDIUM', 'LOW']).toContain(timeEstimate.confidence);

        // Property 8: Resource requirements must be positive
        const resources = executiveSummary.resourceRequirements;
        expect(resources.developers).toBeGreaterThan(0);
        expect(resources.qaEngineers).toBeGreaterThan(0);
        expect(resources.devopsEngineers).toBeGreaterThanOrEqual(0);
        expect(resources.totalTeamSize).toBeGreaterThan(0);
      }
    ));
  });

  /**
   * **Validates: Requirements 1.9, 1.10**
   * Property: Risk area identification accuracy
   */
  test('risk area identification accuracy property', () => {
    fc.assert(fc.property(
      validationResultsMapGenerator,
      (validationResults) => {
        const generator = new ProductionReadinessReportGenerator();
        generator.validationResults = validationResults;

        const riskAreas = generator.identifyKeyRiskAreas();

        // Property 1: Risk areas must be sorted by risk score (descending)
        for (let i = 1; i < riskAreas.length; i++) {
          expect(riskAreas[i].riskScore).toBeLessThanOrEqual(riskAreas[i - 1].riskScore);
        }

        // Property 2: Risk scores must be calculated correctly
        riskAreas.forEach(riskArea => {
          const expectedRiskScore = (100 - riskArea.score) * riskArea.weight;
          expect(Math.abs(riskArea.riskScore - expectedRiskScore)).toBeLessThan(0.01);
        });

        // Property 3: Only significant risks should be included
        riskAreas.forEach(riskArea => {
          expect(riskArea.riskScore).toBeGreaterThan(2);
        });

        // Property 4: Risk areas must have valid category names
        riskAreas.forEach(riskArea => {
          expect(typeof riskArea.category).toBe('string');
          expect(riskArea.category.length).toBeGreaterThan(0);
        });

        // Property 5: Scores and weights must be valid
        riskAreas.forEach(riskArea => {
          expect(riskArea.score).toBeGreaterThanOrEqual(0);
          expect(riskArea.score).toBeLessThanOrEqual(100);
          expect(riskArea.weight).toBeGreaterThan(0);
          expect(riskArea.weight).toBeLessThanOrEqual(1);
        });
      }
    ));
  });

  /**
   * **Validates: Requirements 1.11, 1.12**
   * Property: Time and resource estimation reasonableness
   */
  test('time and resource estimation reasonableness property', () => {
    fc.assert(fc.property(
      validationResultsMapGenerator,
      (validationResults) => {
        const generator = new ProductionReadinessReportGenerator();
        generator.validationResults = validationResults;

        const issues = generator.aggregateIssues();
        const timeEstimate = generator.estimateTimeToReady(issues);
        const resourceEstimate = generator.estimateResourceRequirements(issues);

        // Property 1: Time estimates must be proportional to issue count and severity
        const totalIssues = Object.values(issues).flat().length;
        const weightedIssueCount = 
          issues.CRITICAL.length * 16 +
          issues.HIGH.length * 8 +
          issues.MEDIUM.length * 4 +
          issues.LOW.length * 2;

        expect(timeEstimate.estimatedHours).toBe(weightedIssueCount);
        expect(timeEstimate.estimatedDays).toBe(Math.ceil(weightedIssueCount / 8));

        // Property 2: More issues should require more time
        if (totalIssues > 10) {
          expect(timeEstimate.estimatedDays).toBeGreaterThan(1);
        }

        // Property 3: Critical issues should lower confidence
        if (issues.CRITICAL.length > 0) {
          expect(timeEstimate.confidence).not.toBe('HIGH');
        }

        // Property 4: Resource estimates must be reasonable
        expect(resourceEstimate.developers).toBeGreaterThanOrEqual(1);
        expect(resourceEstimate.qaEngineers).toBeGreaterThanOrEqual(1);
        expect(resourceEstimate.devopsEngineers).toBeGreaterThanOrEqual(0);

        // Property 5: More issues should require larger team
        if (issues.CRITICAL.length > 3 || totalIssues > 20) {
          expect(resourceEstimate.totalTeamSize).toBeGreaterThan(2);
        }

        // Property 6: Specialist needs should be based on category issues
        const hasSecurityIssues = issues.CRITICAL.concat(issues.HIGH)
          .some(issue => issue.category?.includes('security'));
        const hasPerformanceIssues = issues.CRITICAL.concat(issues.HIGH)
          .some(issue => issue.category?.includes('performance'));

        if (hasSecurityIssues) {
          expect(resourceEstimate.specialistNeeded).toContain('Security Engineer');
        }

        if (hasPerformanceIssues) {
          expect(resourceEstimate.specialistNeeded).toContain('Performance Engineer');
        }
      }
    ));
  });

  /**
   * **Validates: Requirements 1.13, 1.14**
   * Property: Report format consistency and completeness
   */
  test('report format consistency property', () => {
    fc.assert(fc.property(
      validationResultsMapGenerator,
      (validationResults) => {
        const generator = new ProductionReadinessReportGenerator();
        generator.validationResults = validationResults;

        const jsonReport = generator.generateJSONReport();
        const markdownReport = generator.generateMarkdownReport();

        // Property 1: JSON report must be valid JSON structure
        expect(typeof jsonReport).toBe('object');
        expect(jsonReport).not.toBeNull();

        // Property 2: Markdown report must be valid string
        expect(typeof markdownReport).toBe('string');
        expect(markdownReport.length).toBeGreaterThan(0);

        // Property 3: Both formats must contain key information
        const overallScore = generator.calculateOverallScore();
        const deployment = generator.generateDeploymentRecommendation();

        // JSON format checks
        expect(jsonReport.executiveSummary.overallReadinessScore).toBe(overallScore);
        expect(jsonReport.deploymentRecommendation.recommendation).toBe(deployment.recommendation);

        // Markdown format checks
        expect(markdownReport).toContain(`${overallScore}%`);
        expect(markdownReport).toContain(deployment.recommendation.replace('_', ' '));
        expect(markdownReport).toContain('# Production Readiness Report');
        expect(markdownReport).toContain('## Executive Summary');

        // Property 4: Reports must include all validation categories
        const categories = Array.from(validationResults.keys());
        categories.forEach(category => {
          expect(jsonReport.validationResults).toHaveProperty(category);
          expect(markdownReport).toContain(category.replace('-', ' '));
        });

        // Property 5: Issue information must be consistent across formats
        const jsonIssues = Object.values(jsonReport.issues).flat().length;
        const summaryIssues = jsonReport.executiveSummary.totalIssues;
        expect(jsonIssues).toBe(summaryIssues);
      }
    ));
  });

  /**
   * **Validates: Requirements 1.15**
   * Property: Category weight validation and scoring impact
   */
  test('category weight validation property', () => {
    fc.assert(fc.property(
      fc.record({
        'security-validation': fc.integer({ min: 0, max: 100 }),
        'data-integrity': fc.integer({ min: 0, max: 100 }),
        'user-functionality': fc.integer({ min: 0, max: 100 }),
        'performance-testing': fc.integer({ min: 0, max: 100 })
      }),
      (categoryScores) => {
        const generator = new ProductionReadinessReportGenerator();
        
        // Set up validation results with specific scores
        generator.validationResults.clear();
        Object.entries(categoryScores).forEach(([category, score]) => {
          generator.validationResults.set(category, {
            score,
            issues: [],
            status: score >= 90 ? 'passed' : score >= 70 ? 'warning' : 'failed'
          });
        });

        const overallScore = generator.calculateOverallScore();

        // Property 1: Higher weighted categories should have more impact
        const securityWeight = generator.categoryWeights['security-validation'];
        const userFuncWeight = generator.categoryWeights['user-functionality'];
        
        // Security has higher weight (0.20) than user functionality (0.15)
        expect(securityWeight).toBeGreaterThan(userFuncWeight);

        // Property 2: Changing high-weight category should impact score more
        const originalScore = overallScore;
        
        // Increase security score by 10 points
        generator.validationResults.set('security-validation', {
          score: Math.min(100, categoryScores['security-validation'] + 10),
          issues: [],
          status: 'passed'
        });
        const securityImprovedScore = generator.calculateOverallScore();
        
        // Reset and increase user functionality by 10 points
        generator.validationResults.set('security-validation', {
          score: categoryScores['security-validation'],
          issues: [],
          status: 'passed'
        });
        generator.validationResults.set('user-functionality', {
          score: Math.min(100, categoryScores['user-functionality'] + 10),
          issues: [],
          status: 'passed'
        });
        const userFuncImprovedScore = generator.calculateOverallScore();

        // Security improvement should have larger impact due to higher weight
        const securityImpact = Math.abs(securityImprovedScore - originalScore);
        const userFuncImpact = Math.abs(userFuncImprovedScore - originalScore);
        
        if (categoryScores['security-validation'] < 90 && categoryScores['user-functionality'] < 90) {
          expect(securityImpact).toBeGreaterThanOrEqual(userFuncImpact);
        }
      }
    ));
  });
});