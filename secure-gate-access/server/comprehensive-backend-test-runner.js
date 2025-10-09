/**
 * Comprehensive Backend Testing & Analysis Runner
 * Performs thorough testing of all backend components
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test Results Storage
const results = {
  timestamp: new Date().toISOString(),
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    coverage: {}
  },
  categories: {
    services: { total: 0, tested: 0, coverage: 0, items: [] },
    controllers: { total: 0, tested: 0, coverage: 0, items: [] },
    middleware: { total: 0, tested: 0, coverage: 0, items: [] },
    routes: { total: 0, tested: 0, coverage: 0, items: [] },
    utils: { total: 0, tested: 0, coverage: 0, items: [] },
    models: { total: 0, tested: 0, coverage: 0, items: [] },
    config: { total: 0, tested: 0, coverage: 0, items: [] }
  },
  deploymentReadiness: {
    score: 0,
    criticalIssues: [],
    warnings: [],
    recommendations: []
  },
  performanceMetrics: {
    apiEndpoints: [],
    databaseQueries: [],
    memoryUsage: [],
    responseTime: []
  }
};

// Utility Functions
function logSection(title) {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${title}`);
  console.log('='.repeat(80) + '\n');
}

function logSubsection(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
}

function logError(message) {
  console.log(`❌ ${message}`);
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

// File Discovery Functions
function getAllFiles(dirPath, fileExtension = '.js', recursive = true) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      
      if (item.isDirectory() && recursive && !item.name.includes('node_modules')) {
        files.push(...getAllFiles(fullPath, fileExtension, recursive));
      } else if (item.isFile() && item.name.endsWith(fileExtension)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
  }
  
  return files;
}

function categorizeFiles() {
  logSection('PHASE 1: BACKEND FILE DISCOVERY');
  
  const srcPath = path.join(__dirname, 'src');
  const categories = ['services', 'controllers', 'middleware', 'routes', 'utils', 'models', 'config'];
  
  categories.forEach(category => {
    const categoryPath = path.join(srcPath, category);
    
    if (fs.existsSync(categoryPath)) {
      const files = getAllFiles(categoryPath, '.js', true);
      results.categories[category].total = files.length;
      results.categories[category].items = files.map(file => ({
        path: file,
        name: path.basename(file),
        relativePath: path.relative(__dirname, file),
        tested: false,
        coverage: 0,
        issues: []
      }));
      
      logInfo(`Found ${files.length} ${category} files`);
    } else {
      logWarning(`Directory not found: ${categoryPath}`);
    }
  });
  
  const totalFiles = Object.values(results.categories).reduce((sum, cat) => sum + cat.total, 0);
  logSuccess(`Total backend files discovered: ${totalFiles}`);
  
  return results.categories;
}

// Test Discovery & Mapping
function discoverTests() {
  logSection('PHASE 2: TEST DISCOVERY & MAPPING');
  
  const testsPath = path.join(__dirname, 'tests');
  const testFiles = getAllFiles(testsPath, '.test.js', true);
  
  logInfo(`Found ${testFiles.length} test files`);
  
  // Map test files to source files
  testFiles.forEach(testFile => {
    const testName = path.basename(testFile, '.test.js');
    
    // Try to find matching source files
    Object.keys(results.categories).forEach(category => {
      results.categories[category].items.forEach(item => {
        const sourceName = path.basename(item.path, '.js');
        
        if (testName.includes(sourceName) || sourceName.includes(testName)) {
          item.tested = true;
          results.categories[category].tested++;
        }
      });
    });
  });
  
  // Report test coverage by category
  Object.keys(results.categories).forEach(category => {
    const cat = results.categories[category];
    const coveragePercent = cat.total > 0 ? ((cat.tested / cat.total) * 100).toFixed(2) : 0;
    cat.coverage = parseFloat(coveragePercent);
    
    logInfo(`${category}: ${cat.tested}/${cat.total} files tested (${coveragePercent}%)`);
  });
  
  return testFiles;
}

// Run Unit Tests
async function runUnitTests() {
  logSection('PHASE 3: UNIT TEST EXECUTION');
  
  try {
    logInfo('Executing unit tests...');
    const { stdout, stderr } = await execAsync('npm run test:unit 2>&1', {
      cwd: __dirname,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    // Parse Jest output
    const output = stdout + stderr;
    const passMatch = output.match(/(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);
    const skipMatch = output.match(/(\d+) skipped/);
    
    if (passMatch) results.summary.passed = parseInt(passMatch[1]);
    if (failMatch) results.summary.failed = parseInt(failMatch[1]);
    if (skipMatch) results.summary.skipped = parseInt(skipMatch[1]);
    
    results.summary.totalTests = results.summary.passed + results.summary.failed + results.summary.skipped;
    
    logSuccess(`Unit tests completed: ${results.summary.passed} passed, ${results.summary.failed} failed`);
    
    return output;
  } catch (error) {
    logError(`Unit test execution failed: ${error.message}`);
    return error.stdout || error.message;
  }
}

// Code Quality Analysis
function analyzeCodeQuality() {
  logSection('PHASE 4: CODE QUALITY ANALYSIS');
  
  const issues = {
    complexity: [],
    security: [],
    performance: [],
    maintainability: []
  };
  
  // Analyze each category
  Object.keys(results.categories).forEach(category => {
    results.categories[category].items.forEach(item => {
      try {
        const code = fs.readFileSync(item.path, 'utf8');
        const lines = code.split('\n').length;
        
        // Check file size
        if (lines > 500) {
          issues.maintainability.push({
            file: item.relativePath,
            issue: `Large file (${lines} lines) - consider refactoring`,
            severity: 'warning'
          });
          item.issues.push('Large file size');
        }
        
        // Check for TODO/FIXME
        if (code.match(/TODO|FIXME/gi)) {
          const matches = code.match(/TODO|FIXME/gi).length;
          issues.maintainability.push({
            file: item.relativePath,
            issue: `${matches} TODO/FIXME comments found`,
            severity: 'info'
          });
        }
        
        // Check for console.log (potential debug code)
        const consoleLogMatches = code.match(/console\.log\(/g);
        if (consoleLogMatches && consoleLogMatches.length > 2) {
          issues.maintainability.push({
            file: item.relativePath,
            issue: `${consoleLogMatches.length} console.log statements - use proper logging`,
            severity: 'warning'
          });
        }
        
        // Check for hardcoded secrets patterns
        if (code.match(/(password|secret|api[_-]?key|token)\s*[=:]\s*['"][^'"]+['"]/gi)) {
          issues.security.push({
            file: item.relativePath,
            issue: 'Potential hardcoded secrets detected',
            severity: 'critical'
          });
          item.issues.push('Security: Potential hardcoded secrets');
        }
        
        // Check for SQL injection patterns
        if (code.match(/query\s*\(\s*['"`].*\$\{/gi) || code.match(/query\s*\(\s*.*\+.*\)/gi)) {
          issues.security.push({
            file: item.relativePath,
            issue: 'Potential SQL injection vulnerability',
            severity: 'critical'
          });
          item.issues.push('Security: SQL injection risk');
        }
        
        // Check for missing error handling
        if (code.match(/async\s+function/) && !code.match(/try\s*{|\.catch\(/gi)) {
          issues.maintainability.push({
            file: item.relativePath,
            issue: 'Async function without error handling',
            severity: 'warning'
          });
        }
        
      } catch (error) {
        logWarning(`Could not analyze file: ${item.relativePath}`);
      }
    });
  });
  
  // Report findings
  logSubsection('Security Issues');
  if (issues.security.length === 0) {
    logSuccess('No security issues detected');
  } else {
    issues.security.forEach(issue => {
      logError(`${issue.file}: ${issue.issue}`);
      results.deploymentReadiness.criticalIssues.push(issue);
    });
  }
  
  logSubsection('Performance Concerns');
  if (issues.performance.length === 0) {
    logSuccess('No performance issues detected');
  } else {
    issues.performance.forEach(issue => {
      logWarning(`${issue.file}: ${issue.issue}`);
      results.deploymentReadiness.warnings.push(issue);
    });
  }
  
  logSubsection('Maintainability Issues');
  if (issues.maintainability.length > 0) {
    issues.maintainability.slice(0, 10).forEach(issue => {
      if (issue.severity === 'warning') {
        logWarning(`${issue.file}: ${issue.issue}`);
      } else {
        logInfo(`${issue.file}: ${issue.issue}`);
      }
    });
    if (issues.maintainability.length > 10) {
      logInfo(`... and ${issues.maintainability.length - 10} more maintainability issues`);
    }
  } else {
    logSuccess('No major maintainability issues detected');
  }
  
  return issues;
}

// Deployment Readiness Assessment
function assessDeploymentReadiness(testOutput, codeIssues) {
  logSection('PHASE 5: DEPLOYMENT READINESS ASSESSMENT');
  
  let score = 100;
  const checks = [];
  
  // Test Coverage Check (30 points)
  const overallCoverage = Object.values(results.categories)
    .reduce((sum, cat) => sum + cat.coverage, 0) / Object.keys(results.categories).length;
  
  if (overallCoverage >= 80) {
    checks.push({ name: 'Test Coverage', status: 'PASS', impact: 0 });
    logSuccess(`Test coverage: ${overallCoverage.toFixed(2)}% (Target: 80%)`);
  } else if (overallCoverage >= 60) {
    score -= 15;
    checks.push({ name: 'Test Coverage', status: 'WARNING', impact: -15 });
    logWarning(`Test coverage: ${overallCoverage.toFixed(2)}% (Target: 80%)`);
    results.deploymentReadiness.warnings.push({
      issue: 'Test coverage below target',
      severity: 'warning'
    });
  } else {
    score -= 30;
    checks.push({ name: 'Test Coverage', status: 'FAIL', impact: -30 });
    logError(`Test coverage: ${overallCoverage.toFixed(2)}% (Target: 80%)`);
    results.deploymentReadiness.criticalIssues.push({
      issue: 'Test coverage critically low',
      severity: 'critical'
    });
  }
  
  // Test Execution Check (25 points)
  if (results.summary.failed === 0) {
    checks.push({ name: 'Test Execution', status: 'PASS', impact: 0 });
    logSuccess(`All tests passed (${results.summary.passed} tests)`);
  } else if (results.summary.failed <= 3) {
    score -= 10;
    checks.push({ name: 'Test Execution', status: 'WARNING', impact: -10 });
    logWarning(`${results.summary.failed} test(s) failing`);
  } else {
    score -= 25;
    checks.push({ name: 'Test Execution', status: 'FAIL', impact: -25 });
    logError(`${results.summary.failed} test(s) failing`);
    results.deploymentReadiness.criticalIssues.push({
      issue: `${results.summary.failed} failing tests`,
      severity: 'critical'
    });
  }
  
  // Security Check (25 points)
  if (codeIssues.security.length === 0) {
    checks.push({ name: 'Security', status: 'PASS', impact: 0 });
    logSuccess('No security issues detected');
  } else {
    score -= Math.min(25, codeIssues.security.length * 5);
    checks.push({ name: 'Security', status: 'FAIL', impact: -Math.min(25, codeIssues.security.length * 5) });
    logError(`${codeIssues.security.length} security issue(s) detected`);
  }
  
  // Code Quality Check (20 points)
  const qualityIssues = codeIssues.maintainability.length + codeIssues.performance.length;
  if (qualityIssues === 0) {
    checks.push({ name: 'Code Quality', status: 'PASS', impact: 0 });
    logSuccess('Code quality standards met');
  } else if (qualityIssues <= 10) {
    score -= 5;
    checks.push({ name: 'Code Quality', status: 'WARNING', impact: -5 });
    logWarning(`${qualityIssues} code quality issue(s) detected`);
  } else {
    score -= 15;
    checks.push({ name: 'Code Quality', status: 'WARNING', impact: -15 });
    logWarning(`${qualityIssues} code quality issue(s) detected`);
  }
  
  results.deploymentReadiness.score = Math.max(0, score);
  results.deploymentReadiness.checks = checks;
  
  // Overall Assessment
  logSubsection('DEPLOYMENT READINESS SCORE');
  console.log(`\n   Overall Score: ${results.deploymentReadiness.score}/100\n`);
  
  if (score >= 90) {
    logSuccess('✅ READY FOR PRODUCTION DEPLOYMENT');
    results.deploymentReadiness.recommendation = 'DEPLOY';
  } else if (score >= 75) {
    logWarning('⚠️  READY FOR STAGING DEPLOYMENT - Address warnings before production');
    results.deploymentReadiness.recommendation = 'DEPLOY_TO_STAGING';
    results.deploymentReadiness.recommendations.push('Address warnings before production deployment');
  } else if (score >= 60) {
    logWarning('⚠️  NOT READY - Critical issues must be resolved');
    results.deploymentReadiness.recommendation = 'DO_NOT_DEPLOY';
    results.deploymentReadiness.recommendations.push('Resolve critical issues before any deployment');
  } else {
    logError('❌ NOT PRODUCTION READY - Significant work required');
    results.deploymentReadiness.recommendation = 'DO_NOT_DEPLOY';
    results.deploymentReadiness.recommendations.push('Significant improvements required before deployment');
  }
  
  return score;
}

// Generate Report
function generateReport() {
  logSection('PHASE 6: GENERATING COMPREHENSIVE REPORT');
  
  const reportPath = path.join(__dirname, '../COMPREHENSIVE_BACKEND_TEST_REPORT.md');
  const jsonReportPath = path.join(__dirname, '../COMPREHENSIVE_BACKEND_TEST_REPORT.json');
  
  // Generate Markdown Report
  const markdown = `# Comprehensive Backend Testing & Analysis Report

**Generated:** ${new Date(results.timestamp).toLocaleString()}

## Executive Summary

- **Total Backend Files:** ${Object.values(results.categories).reduce((sum, cat) => sum + cat.total, 0)}
- **Test Coverage:** ${(Object.values(results.categories).reduce((sum, cat) => sum + cat.coverage, 0) / Object.keys(results.categories).length).toFixed(2)}%
- **Tests Executed:** ${results.summary.totalTests}
- **Tests Passed:** ${results.summary.passed}
- **Tests Failed:** ${results.summary.failed}
- **Deployment Readiness Score:** ${results.deploymentReadiness.score}/100
- **Recommendation:** ${results.deploymentReadiness.recommendation}

## Test Coverage by Category

| Category | Files Found | Files Tested | Coverage |
|----------|-------------|--------------|----------|
${Object.keys(results.categories).map(cat => {
  const c = results.categories[cat];
  return `| ${cat.charAt(0).toUpperCase() + cat.slice(1)} | ${c.total} | ${c.tested} | ${c.coverage.toFixed(2)}% |`;
}).join('\n')}

## Test Execution Results

- **Total Tests:** ${results.summary.totalTests}
- **Passed:** ${results.summary.passed} ✅
- **Failed:** ${results.summary.failed} ❌
- **Skipped:** ${results.summary.skipped} ⏭️

## Deployment Readiness Assessment

**Overall Score:** ${results.deploymentReadiness.score}/100

### Readiness Checks

${results.deploymentReadiness.checks ? results.deploymentReadiness.checks.map(check => 
  `- **${check.name}:** ${check.status} (Impact: ${check.impact} points)`
).join('\n') : 'No checks performed'}

### Critical Issues

${results.deploymentReadiness.criticalIssues.length > 0 ? 
  results.deploymentReadiness.criticalIssues.map(issue => 
    `- ❌ ${issue.issue || issue.file + ': ' + issue.issue}`
  ).join('\n') : 
  '✅ No critical issues detected'}

### Warnings

${results.deploymentReadiness.warnings.length > 0 ? 
  results.deploymentReadiness.warnings.slice(0, 20).map(warning => 
    `- ⚠️ ${warning.issue || warning.file + ': ' + warning.issue}`
  ).join('\n') : 
  '✅ No warnings'}

### Recommendations

${results.deploymentReadiness.recommendations.length > 0 ? 
  results.deploymentReadiness.recommendations.map(rec => `- ${rec}`).join('\n') : 
  '✅ System meets all deployment criteria'}

## Detailed File Analysis

${Object.keys(results.categories).map(category => {
  const cat = results.categories[category];
  const untestedFiles = cat.items.filter(item => !item.tested);
  
  return `### ${category.charAt(0).toUpperCase() + category.slice(1)}

**Total Files:** ${cat.total} | **Tested:** ${cat.tested} | **Coverage:** ${cat.coverage.toFixed(2)}%

${untestedFiles.length > 0 ? 
  `#### Untested Files:\n${untestedFiles.slice(0, 10).map(item => `- \`${item.relativePath}\``).join('\n')}${untestedFiles.length > 10 ? `\n- ... and ${untestedFiles.length - 10} more` : ''}` : 
  '✅ All files have test coverage'}

${cat.items.filter(item => item.issues.length > 0).length > 0 ? 
  `#### Files with Issues:\n${cat.items.filter(item => item.issues.length > 0).slice(0, 10).map(item => 
    `- \`${item.relativePath}\`: ${item.issues.join(', ')}`
  ).join('\n')}` : ''}
`;
}).join('\n')}

## Next Steps

${results.deploymentReadiness.score >= 90 ? `
### Ready for Production ✅

1. Perform final smoke tests
2. Review deployment checklist
3. Execute deployment to production
4. Monitor post-deployment metrics
` : results.deploymentReadiness.score >= 75 ? `
### Deploy to Staging ⚠️

1. Address warning-level issues
2. Deploy to staging environment
3. Perform comprehensive staging validation
4. Fix any critical issues discovered
5. Re-run deployment readiness assessment
` : `
### Critical Work Required ❌

1. **Increase test coverage** to at least 75%
2. **Fix all failing tests**
3. **Resolve all security issues**
4. **Address critical code quality issues**
5. Re-run comprehensive backend analysis
6. Achieve deployment readiness score of 75+ before staging deployment
`}

## Performance Considerations

- Monitor API response times post-deployment
- Set up performance benchmarks
- Configure alerting for performance degradation
- Implement caching strategies where appropriate

## Security Recommendations

- Run npm audit and fix all vulnerabilities
- Implement secrets management (Vault/AWS Secrets Manager)
- Set up security monitoring and alerting
- Perform penetration testing before production
- Configure WAF rules

---

**Report Generated By:** Comprehensive Backend Test Runner v1.0
**Timestamp:** ${new Date(results.timestamp).toISOString()}
`;

  // Write reports
  fs.writeFileSync(reportPath, markdown);
  fs.writeFileSync(jsonReportPath, JSON.stringify(results, null, 2));
  
  logSuccess(`Markdown report saved: ${path.basename(reportPath)}`);
  logSuccess(`JSON report saved: ${path.basename(jsonReportPath)}`);
  
  return reportPath;
}

// Main Execution
async function main() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                               ║');
  console.log('║         COMPREHENSIVE BACKEND TESTING & ANALYSIS                             ║');
  console.log('║         Secure Gate Access Control System                                     ║');
  console.log('║                                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  try {
    // Phase 1: Discover all backend files
    const categories = categorizeFiles();
    
    // Phase 2: Map tests to source files
    const testFiles = discoverTests();
    
    // Phase 3: Run unit tests
    const testOutput = await runUnitTests();
    
    // Phase 4: Analyze code quality
    const codeIssues = analyzeCodeQuality();
    
    // Phase 5: Assess deployment readiness
    const readinessScore = assessDeploymentReadiness(testOutput, codeIssues);
    
    // Phase 6: Generate comprehensive report
    const reportPath = generateReport();
    
    // Final Summary
    logSection('ANALYSIS COMPLETE');
    console.log(`\n   📊 Results:`);
    console.log(`   - Backend Files: ${Object.values(results.categories).reduce((sum, cat) => sum + cat.total, 0)}`);
    console.log(`   - Test Coverage: ${(Object.values(results.categories).reduce((sum, cat) => sum + cat.coverage, 0) / Object.keys(results.categories).length).toFixed(2)}%`);
    console.log(`   - Tests Passed: ${results.summary.passed}/${results.summary.totalTests}`);
    console.log(`   - Deployment Score: ${results.deploymentReadiness.score}/100`);
    console.log(`\n   📄 Full report: COMPREHENSIVE_BACKEND_TEST_REPORT.md\n`);
    
    process.exit(readinessScore >= 75 ? 0 : 1);
    
  } catch (error) {
    logError(`Analysis failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Execute
main();
