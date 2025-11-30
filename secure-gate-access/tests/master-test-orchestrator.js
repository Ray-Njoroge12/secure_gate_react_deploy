/**
 * MASTER TEST ORCHESTRATOR
 * Coordinates the complete automated testing and repair workflow
 */

const ConfigValidator = require('./config-validator');
const BypassTestFramework = require('./bypass-test-framework');
const AutoFixer = require('./auto-fix-script');
const fs = require('fs');
const path = require('path');
const colors = require('colors');

class MasterOrchestrator {
  constructor() {
    this.results = {
      validation: null,
      initialTests: null,
      fixes: null,
      regressionTests: null,
      timestamp: new Date().toISOString()
    };
    
    this.outputDir = path.join(__dirname, 'results');
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  async execute() {
    console.log('\n' + '═'.repeat(70).cyan.bold);
    console.log('🚀 MASTER TEST ORCHESTRATOR - AUTOMATED TESTING & REPAIR'.cyan.bold);
    console.log('═'.repeat(70).cyan.bold);
    console.log(`Started: ${new Date().toLocaleString()}`.cyan);
    console.log('─'.repeat(70).cyan);

    try {
      // Step 1: Initialize Environment
      await this.step1_InitializeEnvironment();
      
      // Step 2: Pre-Flight Configuration Checks
      await this.step2_PreFlightChecks();
      
      // Step 3: Run Intelligent Bypass Tests
      await this.step3_RunBypassTests();
      
      // Step 4: Apply Automatic Fixes
      await this.step4_ApplyFixes();
      
      // Step 5: Generate Reports
      await this.step5_GenerateReports();
      
      // Step 6: Re-Run Regression Tests
      await this.step6_RegressionTests();
      
      // Final Summary
      await this.generateFinalSummary();
      
    } catch (error) {
      console.error('\n❌ FATAL ERROR:'.red.bold, error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  async step1_InitializeEnvironment() {
    console.log('\n' + '█'.repeat(70).cyan);
    console.log('STEP 1: INITIALIZE ENVIRONMENT'.cyan.bold);
    console.log('█'.repeat(70).cyan);
    
    console.log('\n📁 Loading environment files...'.cyan);
    
    const serverEnvPath = path.join(__dirname, '../server/.env');
    const clientEnvPath = path.join(__dirname, '../client/.env.local');
    
    const serverExists = fs.existsSync(serverEnvPath);
    const clientExists = fs.existsSync(clientEnvPath);
    
    console.log(`Server .env: ${serverExists ? '✅ Found' : '❌ Not Found'}`.cyan);
    console.log(`Client .env.local: ${clientExists ? '✅ Found' : '⚠️  Not Found (optional)'}`.cyan);
    
    if (!serverExists) {
      throw new Error('Server .env file not found. Cannot proceed.');
    }
    
    // Load environment variables
    require('dotenv').config({ path: serverEnvPath });
    
    console.log('\n✅ Environment initialized'.green.bold);
  }

  async step2_PreFlightChecks() {
    console.log('\n' + '█'.repeat(70).cyan);
    console.log('STEP 2: PRE-FLIGHT CONFIGURATION CHECKS'.cyan.bold);
    console.log('█'.repeat(70).cyan);
    
    const validator = new ConfigValidator();
    this.results.validation = await validator.validate();
    
    // Save validation results
    const validationPath = path.join(this.outputDir, 'config-validation.json');
    fs.writeFileSync(validationPath, JSON.stringify(this.results.validation, null, 2));
    
    console.log(`\n📄 Validation report: ${validationPath}`.cyan);
    
    if (this.results.validation.critical.length > 5) {
      console.log('\n⚠️  WARNING: Multiple critical issues found'.yellow.bold);
      console.log('   Proceeding with automatic fixes...'.yellow);
    }
  }

  async step3_RunBypassTests() {
    console.log('\n' + '█'.repeat(70).cyan);
    console.log('STEP 3: RUN INTELLIGENT BYPASS TESTS'.cyan.bold);
    console.log('█'.repeat(70).cyan);
    
    const framework = new BypassTestFramework({
      backendUrl: process.env.API_BASE_URL || 'http://localhost:3001',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3002',
      timeout: 5000
    });
    
    this.results.initialTests = await framework.runAllTests();
    
    // Save test results
    const testsPath = path.join(this.outputDir, 'functional-map.json');
    fs.writeFileSync(testsPath, JSON.stringify(this.results.initialTests, null, 2));
    
    console.log(`\n📄 Test results: ${testsPath}`.cyan);
  }

  async step4_ApplyFixes() {
    console.log('\n' + '█'.repeat(70).cyan);
    console.log('STEP 4: APPLY AUTOMATIC FIXES'.cyan.bold);
    console.log('█'.repeat(70).cyan);
    
    if (!this.results.validation || this.results.validation.critical.length === 0) {
      console.log('\n✅ No critical issues to fix'.green.bold);
      this.results.fixes = { applied: 0, skipped: 0, fixes: [] };
      return;
    }
    
    console.log('\n🔧 Applying automatic fixes...'.cyan);
    
    const fixer = new AutoFixer();
    this.results.fixes = await fixer.applyFixes(this.results.validation);
    
    // Save fix results
    const fixesPath = path.join(this.outputDir, 'auto-fix-report.json');
    fs.writeFileSync(fixesPath, JSON.stringify(this.results.fixes, null, 2));
    
    console.log(`\n📄 Fix report: ${fixesPath}`.cyan);
    
    if (this.results.fixes.applied > 0) {
      console.log(`\n✅ Applied ${this.results.fixes.applied} automatic fixes`.green.bold);
      console.log('⚠️  Please review changes in .env files'.yellow);
    }
  }

  async step5_GenerateReports() {
    console.log('\n' + '█'.repeat(70).cyan);
    console.log('STEP 5: GENERATE COMPREHENSIVE REPORTS'.cyan.bold);
    console.log('█'.repeat(70).cyan);
    
    const readinessReport = this.calculateReadiness();
    
    // Save readiness report as JSON
    const jsonPath = path.join(this.outputDir, 'system-readiness.json');
    fs.writeFileSync(jsonPath, JSON.stringify(readinessReport, null, 2));
    
    // Generate markdown report
    const mdReport = this.generateMarkdownReport(readinessReport);
    const mdPath = path.join(this.outputDir, 'system-readiness-report.md');
    fs.writeFileSync(mdPath, mdReport);
    
    console.log(`\n📄 Readiness JSON: ${jsonPath}`.cyan);
    console.log(`📄 Readiness Report: ${mdPath}`.cyan);
  }

  async step6_RegressionTests() {
    console.log('\n' + '█'.repeat(70).cyan);
    console.log('STEP 6: RE-RUN REGRESSION TESTS'.cyan.bold);
    console.log('█'.repeat(70).cyan);
    
    if (this.results.fixes && this.results.fixes.applied > 0) {
      console.log('\n🔄 Re-running tests after fixes...'.cyan);
      
      const framework = new BypassTestFramework({
        backendUrl: process.env.API_BASE_URL || 'http://localhost:3001',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3002',
        timeout: 5000
      });
      
      this.results.regressionTests = await framework.runAllTests();
      
      // Save regression test results
      const regressionPath = path.join(this.outputDir, 'regression-tests.json');
      fs.writeFileSync(regressionPath, JSON.stringify(this.results.regressionTests, null, 2));
      
      console.log(`\n📄 Regression tests: ${regressionPath}`.cyan);
      
      // Compare results
      this.compareTestResults();
    } else {
      console.log('\n⏭️  Skipped: No fixes applied, regression tests not needed'.yellow);
    }
  }

  calculateReadiness() {
    const validation = this.results.validation || {};
    const tests = this.results.initialTests || {};
    const fixes = this.results.fixes || {};
    
    // Calculate scores
    const configScore = validation.passRate || 0;
    const testScore = tests.summary ? tests.summary.passRate : 0;
    const fixScore = fixes.applied > 0 ? 80 : 60; // Boost if fixes applied
    
    // Critical issues reduce overall score
    const criticalPenalty = (validation.critical || 0) * 5;
    const warningPenalty = (validation.warnings || 0) * 2;
    
    const securityScore = Math.max(0, 100 - criticalPenalty - warningPenalty);
    const performanceScore = testScore;
    const overallScore = Math.round((configScore + testScore + securityScore) / 3);
    
    return {
      overall: overallScore,
      security: securityScore,
      performance: performanceScore,
      configuration: configScore,
      testing: testScore,
      details: {
        configValidation: validation,
        testResults: tests.summary,
        fixesApplied: fixes.applied || 0,
        criticalIssues: validation.critical || 0,
        warnings: validation.warnings || 0
      },
      status: this.getStatus(overallScore),
      recommendations: this.getRecommendations()
    };
  }

  getStatus(score) {
    if (score >= 90) return 'PRODUCTION_READY';
    if (score >= 75) return 'STAGING_READY';
    if (score >= 60) return 'DEVELOPMENT_READY';
    return 'NOT_READY';
  }

  getRecommendations() {
    const recommendations = [];
    
    if (this.results.validation) {
      const { critical, warnings } = this.results.validation.issues || { critical: [], warnings: [] };
      
      critical.forEach(issue => {
        recommendations.push({
          priority: 'CRITICAL',
          issue: issue.code,
          message: issue.message,
          fix: issue.fix
        });
      });
      
      warnings.slice(0, 5).forEach(issue => {
        recommendations.push({
          priority: 'WARNING',
          issue: issue.code,
          message: issue.message,
          fix: issue.fix
        });
      });
    }
    
    return recommendations;
  }

  generateMarkdownReport(readiness) {
    const timestamp = new Date().toLocaleString();
    
    return `# SYSTEM READINESS REPORT

**Generated:** ${timestamp}  
**Overall Score:** ${readiness.overall}%  
**Status:** ${readiness.status}

---

## 📊 SCORES

| Category | Score | Status |
|----------|-------|--------|
| **Overall** | ${readiness.overall}% | ${this.getScoreEmoji(readiness.overall)} |
| **Security** | ${readiness.security}% | ${this.getScoreEmoji(readiness.security)} |
| **Performance** | ${readiness.performance}% | ${this.getScoreEmoji(readiness.performance)} |
| **Configuration** | ${readiness.configuration}% | ${this.getScoreEmoji(readiness.configuration)} |
| **Testing** | ${readiness.testing}% | ${this.getScoreEmoji(readiness.testing)} |

---

## 🔍 CONFIGURATION VALIDATION

- **Passed Checks:** ${readiness.details.configValidation.passed || 0}
- **Warnings:** ${readiness.details.configValidation.warnings || 0}
- **Critical Issues:** ${readiness.details.configValidation.critical || 0}

---

## 🧪 TEST RESULTS

${this.results.initialTests ? `
- **Total Tests:** ${this.results.initialTests.summary.total}
- **✅ Passed:** ${this.results.initialTests.summary.passed}
- **❌ Failed:** ${this.results.initialTests.summary.failed}
- **⏭️ Skipped:** ${this.results.initialTests.summary.skipped}
- **Pass Rate:** ${this.results.initialTests.summary.passRate}%
` : '- Tests not run'}

---

## 🔧 FIXES APPLIED

${this.results.fixes ? `
- **Automatic Fixes:** ${this.results.fixes.applied || 0}
- **Skipped Fixes:** ${this.results.fixes.skipped || 0}

${this.results.fixes.fixes && this.results.fixes.fixes.filter(f => f.applied).length > 0 ? `
### Applied Changes:
${this.results.fixes.fixes.filter(f => f.applied).map(f => `- ✅ ${f.change}`).join('\n')}
` : ''}
` : '- No fixes applied'}

---

## 🎯 RECOMMENDATIONS

${readiness.recommendations.slice(0, 10).map((rec, i) => `
### ${i + 1}. ${rec.priority === 'CRITICAL' ? '🔴' : '🟡'} ${rec.issue}
**Issue:** ${rec.message}  
**Fix:** ${rec.fix}
`).join('\n')}

---

## 📈 WORKING MODULES

${this.generateModuleStatus()}

---

## 🚀 NEXT STEPS

${this.generateNextSteps(readiness)}

---

**Report Location:** \`tests/results/system-readiness-report.md\`  
**Test Data:** \`tests/results/functional-map.json\`  
**Configuration:** \`tests/results/config-validation.json\`
`;
  }

  generateModuleStatus() {
    if (!this.results.initialTests || !this.results.initialTests.tests) {
      return '- No test data available';
    }
    
    const { passed, failed, skipped } = this.results.initialTests.tests;
    
    let status = '';
    
    if (passed.length > 0) {
      status += '### ✅ Working Modules\n';
      passed.forEach(test => {
        status += `- ✅ ${test.name}\n`;
      });
    }
    
    if (failed.length > 0) {
      status += '\n### ❌ Broken Modules\n';
      failed.forEach(test => {
        status += `- ❌ ${test.name}: ${test.error}\n`;
      });
    }
    
    if (skipped.length > 0) {
      status += '\n### ⏭️ Skipped Modules\n';
      skipped.forEach(test => {
        status += `- ⏭️ ${test.name}: ${test.reason}\n`;
      });
    }
    
    return status;
  }

  generateNextSteps(readiness) {
    const steps = [];
    
    if (readiness.overall < 90) {
      steps.push('1. Review and resolve all critical configuration issues');
      steps.push('2. Start backend and frontend servers');
      steps.push('3. Re-run tests to verify fixes');
    }
    
    if (readiness.security < 80) {
      steps.push('4. Update all weak or placeholder secrets');
      steps.push('5. Configure CORS whitelist for production domains');
      steps.push('6. Set up Redis for production session storage');
    }
    
    if (readiness.testing < 70) {
      steps.push('7. Investigate and fix failed tests');
      steps.push('8. Address dependency issues for skipped tests');
    }
    
    steps.push('9. Review auto-fix report and verify changes');
    steps.push('10. Run manual testing before deployment');
    
    return steps.map(step => `- ${step}`).join('\n');
  }

  getScoreEmoji(score) {
    if (score >= 90) return '🟢 Excellent';
    if (score >= 75) return '🟡 Good';
    if (score >= 60) return '🟠 Fair';
    return '🔴 Poor';
  }

  compareTestResults() {
    if (!this.results.initialTests || !this.results.regressionTests) return;
    
    const initial = this.results.initialTests.summary;
    const regression = this.results.regressionTests.summary;
    
    console.log('\n📊 TEST COMPARISON'.cyan.bold);
    console.log('─'.repeat(60).cyan);
    
    const passChange = regression.passed - initial.passed;
    const failChange = regression.failed - initial.failed;
    
    console.log(`Passed: ${initial.passed} → ${regression.passed} (${passChange >= 0 ? '+' : ''}${passChange})`.cyan);
    console.log(`Failed: ${initial.failed} → ${regression.failed} (${failChange >= 0 ? '+' : ''}${failChange})`.cyan);
    
    if (regression.passed > initial.passed) {
      console.log('\n✅ Tests improved after fixes!'.green.bold);
    } else if (regression.passed === initial.passed) {
      console.log('\n📊 Test results unchanged'.yellow);
    } else {
      console.log('\n⚠️  Test results degraded - review changes'.red.bold);
    }
  }

  async generateFinalSummary() {
    console.log('\n' + '═'.repeat(70).cyan.bold);
    console.log('📊 FINAL SUMMARY'.cyan.bold);
    console.log('═'.repeat(70).cyan.bold);
    
    const readiness = this.calculateReadiness();
    
    console.log(`\n🎯 Overall Readiness: ${readiness.overall}%`.cyan.bold);
    console.log(`📊 Status: ${readiness.status}`.cyan.bold);
    
    console.log('\n📈 Scores:'.cyan);
    console.log(`   Security: ${readiness.security}%`.cyan);
    console.log(`   Performance: ${readiness.performance}%`.cyan);
    console.log(`   Configuration: ${readiness.configuration}%`.cyan);
    console.log(`   Testing: ${readiness.testing}%`.cyan);
    
    if (this.results.fixes && this.results.fixes.applied > 0) {
      console.log(`\n✅ Applied ${this.results.fixes.applied} automatic fixes`.green.bold);
    }
    
    console.log(`\n📁 All reports saved to: ${this.outputDir}`.cyan);
    
    console.log('\n' + '═'.repeat(70).cyan.bold);
    console.log(`Completed: ${new Date().toLocaleString()}`.cyan);
    console.log('═'.repeat(70).cyan.bold);
    console.log('\n');
  }
}

// Run orchestrator if called directly
if (require.main === module) {
  const orchestrator = new MasterOrchestrator();
  
  orchestrator.execute().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = MasterOrchestrator;
