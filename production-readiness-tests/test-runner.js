/**
 * Simple test runner for production readiness tests
 */

import ProductionReadinessReportGenerator from './production-readiness-report-generator.js';

async function runBasicTests() {
  console.log('🧪 Running basic production readiness report tests...\n');

  try {
    // Test 1: Basic instantiation
    console.log('Test 1: Basic instantiation');
    const generator = new ProductionReadinessReportGenerator();
    console.log('✅ Generator created successfully');

    // Test 2: Mock data generation
    console.log('\nTest 2: Mock data generation');
    const mockResult = generator.generateMockResults('test-category');
    console.log(`✅ Mock result generated: ${mockResult.category}, score: ${mockResult.score}%`);

    // Test 3: Score calculation with mock data
    console.log('\nTest 3: Score calculation');
    generator.validationResults.set('security-validation', { score: 95, issues: [] });
    generator.validationResults.set('data-integrity', { score: 98, issues: [] });
    generator.validationResults.set('user-functionality', { score: 88, issues: [] });
    
    const overallScore = generator.calculateOverallScore();
    console.log(`✅ Overall score calculated: ${overallScore}%`);

    // Test 4: Issue aggregation
    console.log('\nTest 4: Issue aggregation');
    generator.validationResults.set('performance-testing', {
      score: 75,
      issues: [
        { severity: 'HIGH', message: 'Slow API response', category: 'performance' },
        { severity: 'MEDIUM', message: 'Memory usage high', category: 'performance' }
      ]
    });

    const issues = generator.aggregateIssues();
    console.log(`✅ Issues aggregated: ${issues.HIGH.length} high, ${issues.MEDIUM.length} medium`);

    // Test 5: Deployment recommendation
    console.log('\nTest 5: Deployment recommendation');
    const recommendation = generator.generateDeploymentRecommendation();
    console.log(`✅ Recommendation generated: ${recommendation.recommendation}`);

    // Test 6: Executive summary
    console.log('\nTest 6: Executive summary');
    const summary = generator.generateExecutiveSummary();
    console.log(`✅ Executive summary generated: ${summary.overallReadinessScore}% score`);

    // Test 7: Report generation
    console.log('\nTest 7: Report generation');
    const jsonReport = generator.generateJSONReport();
    const markdownReport = generator.generateMarkdownReport();
    console.log(`✅ Reports generated: JSON (${Object.keys(jsonReport).length} sections), Markdown (${markdownReport.length} chars)`);

    console.log('\n🎉 All basic tests passed!');
    return true;

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

async function runPropertyTests() {
  console.log('\n🔬 Running property-based tests...\n');

  try {
    const generator = new ProductionReadinessReportGenerator();

    // Property 1: Score calculation consistency
    console.log('Property 1: Score calculation consistency');
    const testScores = [
      { 'security-validation': { score: 95, issues: [] } },
      { 'data-integrity': { score: 98, issues: [] } },
      { 'user-functionality': { score: 88, issues: [] } }
    ];

    for (const testCase of testScores) {
      generator.validationResults.clear();
      Object.entries(testCase).forEach(([category, result]) => {
        generator.validationResults.set(category, result);
      });

      const score1 = generator.calculateOverallScore();
      const score2 = generator.calculateOverallScore();
      
      if (score1 !== score2) {
        throw new Error('Score calculation not deterministic');
      }
      
      if (score1 < 0 || score1 > 100) {
        throw new Error('Score outside valid range');
      }
    }
    console.log('✅ Score calculation is consistent and within valid range');

    // Property 2: Issue prioritization correctness
    console.log('\nProperty 2: Issue prioritization correctness');
    generator.validationResults.clear();
    generator.validationResults.set('test-category', {
      score: 80,
      issues: [
        { severity: 'CRITICAL', message: 'Critical issue', category: 'test' },
        { severity: 'HIGH', message: 'High issue', category: 'test' },
        { severity: 'MEDIUM', message: 'Medium issue', category: 'test' },
        { severity: 'LOW', message: 'Low issue', category: 'test' }
      ]
    });

    const aggregatedIssues = generator.aggregateIssues();
    
    if (aggregatedIssues.CRITICAL.length !== 1 ||
        aggregatedIssues.HIGH.length !== 1 ||
        aggregatedIssues.MEDIUM.length !== 1 ||
        aggregatedIssues.LOW.length !== 1) {
      throw new Error('Issue aggregation incorrect');
    }
    console.log('✅ Issue prioritization is correct');

    // Property 3: Deployment recommendation logic
    console.log('\nProperty 3: Deployment recommendation logic');
    
    // Test with critical issues
    generator.validationResults.set('test-category', {
      score: 95,
      issues: [{ severity: 'CRITICAL', message: 'Critical issue', category: 'test' }]
    });
    
    let recommendation = generator.generateDeploymentRecommendation();
    if (recommendation.recommendation !== 'NO_GO') {
      throw new Error('Critical issues should result in NO_GO');
    }

    // Test with high score and no critical issues
    generator.validationResults.clear();
    generator.validationResults.set('security-validation', { score: 96, issues: [] });
    generator.validationResults.set('data-integrity', { score: 97, issues: [] });
    generator.validationResults.set('user-functionality', { score: 95, issues: [] });
    generator.validationResults.set('performance-testing', { score: 94, issues: [] });

    recommendation = generator.generateDeploymentRecommendation();
    if (recommendation.recommendation === 'NO_GO') {
      throw new Error('High scores with no critical issues should not be NO_GO');
    }
    console.log('✅ Deployment recommendation logic is correct');

    console.log('\n🎉 All property tests passed!');
    return true;

  } catch (error) {
    console.error(`❌ Property test failed: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

async function main() {
  console.log('Production Readiness Report Generator - Test Suite\n');
  console.log('=' .repeat(60));

  const basicTestsPass = await runBasicTests();
  const propertyTestsPass = await runPropertyTests();

  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Basic Tests: ${basicTestsPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Property Tests: ${propertyTestsPass ? '✅ PASS' : '❌ FAIL'}`);
  
  const allTestsPass = basicTestsPass && propertyTestsPass;
  console.log(`\nOverall Result: ${allTestsPass ? '🎉 ALL TESTS PASSED' : '💥 SOME TESTS FAILED'}`);

  process.exit(allTestsPass ? 0 : 1);
}

main().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});