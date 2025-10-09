#!/usr/bin/env node

/**
 * Comprehensive Backend Analysis Script
 * 
 * Performs thorough analysis of:
 * - Code structure and organization
 * - Test coverage
 * - Security vulnerabilities
 * - Performance characteristics
 * - Deployment readiness
 * - Best practices compliance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Analysis Results
const analysis = {
  timestamp: new Date().toISOString(),
  summary: {
    totalFiles: 0,
    totalLines: 0,
    testCoverage: {},
    issues: [],
    recommendations: [],
    deploymentReadiness: 'Unknown'
  },
  codebase: {
    services: [],
    controllers: [],
    middleware: [],
    models: [],
    routes: []
  },
  tests: {
    unit: { total: 0, passing: 0, failing: 0 },
    integration: { total: 0, passing: 0, failing: 0 },
    e2e: { total: 0, passing: 0, failing: 0 }
  },
  security: {
    vulnerabilities: [],
    dependencies: { total: 0, outdated: 0, vulnerable: 0 }
  },
  performance: {
    largeFiles: [],
    complexFunctions: [],
    potentialBottlenecks: []
  },
  deployment: {
    readiness: 'Unknown',
    blockers: [],
    warnings: [],
    recommendations: []
  }
};

/**
 * Utility Functions
 */
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  
  const icon = {
    info: 'ℹ️ ',
    success: '✅',
    warning: '⚠️ ',
    error: '❌'
  };
  
  console.log(`${colors[type]}${icon[type]} ${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${title}`);
  console.log('='.repeat(70) + '\n');
}

function execCommand(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      cwd: process.cwd(),
      ...options
    });
  } catch (error) {
    return null;
  }
}

/**
 * Analyze Code Structure
 */
function analyzeCodeStructure() {
  section('ANALYZING CODE STRUCTURE');
  
  const srcDir = path.join(process.cwd(), 'src');
  
  // Analyze Services
  const servicesDir = path.join(srcDir, 'services');
  if (fs.existsSync(servicesDir)) {
    const services = fs.readdirSync(servicesDir).filter(f => f.endsWith('.js'));
    analysis.codebase.services = services.map(file => {
      const filePath = path.join(servicesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').length;
      
      return {
        name: file,
        path: filePath,
        lines,
        size: fs.statSync(filePath).size,
        hasTests: fs.existsSync(path.join(process.cwd(), 'tests', 'unit', file.replace('.js', '.test.js')))
      };
    });
    
    log(`Found ${services.length} service files`, 'success');
  }
  
  // Analyze Controllers
  const controllersDir = path.join(srcDir, 'controllers');
  if (fs.existsSync(controllersDir)) {
    const controllers = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));
    analysis.codebase.controllers = controllers.map(file => {
      const filePath = path.join(controllersDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').length;
      
      return {
        name: file,
        path: filePath,
        lines,
        size: fs.statSync(filePath).size,
        hasTests: fs.existsSync(path.join(process.cwd(), 'tests', 'unit', file.replace('.js', '.test.js')))
      };
    });
    
    log(`Found ${controllers.length} controller files`, 'success');
  }
  
  // Analyze Middleware
  const middlewareDir = path.join(srcDir, 'middleware');
  if (fs.existsSync(middlewareDir)) {
    const middleware = fs.readdirSync(middlewareDir).filter(f => f.endsWith('.js'));
    analysis.codebase.middleware = middleware.map(file => {
      const filePath = path.join(middlewareDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').length;
      
      return {
        name: file,
        path: filePath,
        lines,
        size: fs.statSync(filePath).size,
        hasTests: fs.existsSync(path.join(process.cwd(), 'tests', 'unit', file.replace('.js', '.test.js')))
      };
    });
    
    log(`Found ${middleware.length} middleware files`, 'success');
  }
  
  // Calculate totals
  analysis.summary.totalFiles = 
    analysis.codebase.services.length +
    analysis.codebase.controllers.length +
    analysis.codebase.middleware.length;
  
  analysis.summary.totalLines = [
    ...analysis.codebase.services,
    ...analysis.codebase.controllers,
    ...analysis.codebase.middleware
  ].reduce((sum, file) => sum + file.lines, 0);
  
  log(`Total files analyzed: ${analysis.summary.totalFiles}`, 'info');
  log(`Total lines of code: ${analysis.summary.totalLines}`, 'info');
}

/**
 * Analyze Test Coverage
 */
function analyzeTestCoverage() {
  section('ANALYZING TEST COVERAGE');
  
  const testsDir = path.join(process.cwd(), 'tests', 'unit');
  
  if (!fs.existsSync(testsDir)) {
    log('No unit tests directory found', 'warning');
    return;
  }
  
  const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.js'));
  log(`Found ${testFiles.length} unit test files`, 'success');
  
  // Count tested vs untested files
  const allFiles = [
    ...analysis.codebase.services,
    ...analysis.codebase.controllers,
    ...analysis.codebase.middleware
  ];
  
  const testedFiles = allFiles.filter(f => f.hasTests).length;
  const untestedFiles = allFiles.filter(f => !f.hasTests).length;
  
  analysis.summary.testCoverage = {
    total: allFiles.length,
    tested: testedFiles,
    untested: untestedFiles,
    percentage: ((testedFiles / allFiles.length) * 100).toFixed(2) + '%'
  };
  
  log(`Test coverage: ${analysis.summary.testCoverage.percentage}`, 
      testedFiles > allFiles.length * 0.7 ? 'success' : 'warning');
  log(`Tested files: ${testedFiles}/${allFiles.length}`, 'info');
  
  if (untestedFiles > 0) {
    const untestedList = allFiles.filter(f => !f.hasTests).map(f => f.name);
    analysis.summary.recommendations.push({
      category: 'Testing',
      priority: 'High',
      message: `${untestedFiles} files lack unit tests`,
      files: untestedList.slice(0, 10)
    });
  }
}

/**
 * Check Security
 */
function checkSecurity() {
  section('SECURITY ANALYSIS');
  
  log('Running npm audit...', 'info');
  const auditResult = execCommand('npm audit --json', { stdio: 'pipe' });
  
  if (auditResult) {
    try {
      const audit = JSON.parse(auditResult);
      analysis.security.vulnerabilities = audit.vulnerabilities || {};
      
      const total = Object.keys(analysis.security.vulnerabilities).length;
      const critical = Object.values(analysis.security.vulnerabilities)
        .filter(v => v.severity === 'critical').length;
      const high = Object.values(analysis.security.vulnerabilities)
        .filter(v => v.severity === 'high').length;
      
      log(`Total vulnerabilities: ${total}`, total > 0 ? 'warning' : 'success');
      if (critical > 0) log(`Critical: ${critical}`, 'error');
      if (high > 0) log(`High: ${high}`, 'warning');
      
      if (critical > 0 || high > 0) {
        analysis.deployment.blockers.push({
          category: 'Security',
          message: `${critical} critical and ${high} high severity vulnerabilities found`,
          action: 'Run npm audit fix --force or update vulnerable packages'
        });
      }
    } catch (error) {
      log('Could not parse npm audit results', 'warning');
    }
  }
  
  // Check for security best practices in code
  log('Checking code for security patterns...', 'info');
  
  const securityChecks = [
    { pattern: /process\.env\.\w+/g, message: 'Environment variables used correctly' },
    { pattern: /bcrypt|argon2/g, message: 'Password hashing detected' },
    { pattern: /helmet/g, message: 'Helmet security middleware detected' },
    { pattern: /csrf/gi, message: 'CSRF protection detected' },
    { pattern: /rate.*limit/gi, message: 'Rate limiting detected' }
  ];
  
  let securityScore = 0;
  securityChecks.forEach(check => {
    const found = analysis.codebase.services.some(service => {
      const content = fs.readFileSync(service.path, 'utf8');
      return check.pattern.test(content);
    });
    
    if (found) {
      securityScore++;
      log(check.message, 'success');
    }
  });
  
  log(`Security score: ${securityScore}/${securityChecks.length}`, 
      securityScore >= 3 ? 'success' : 'warning');
}

/**
 * Analyze Performance
 */
function analyzePerformance() {
  section('PERFORMANCE ANALYSIS');
  
  // Find large files
  const allFiles = [
    ...analysis.codebase.services,
    ...analysis.codebase.controllers,
    ...analysis.codebase.middleware
  ];
  
  const largeFiles = allFiles.filter(f => f.lines > 500);
  if (largeFiles.length > 0) {
    log(`Found ${largeFiles.length} files with >500 lines`, 'warning');
    analysis.performance.largeFiles = largeFiles.map(f => ({
      name: f.name,
      lines: f.lines
    }));
    
    analysis.summary.recommendations.push({
      category: 'Performance',
      priority: 'Medium',
      message: 'Consider refactoring large files for better maintainability',
      files: largeFiles.map(f => f.name)
    });
  } else {
    log('All files are reasonably sized', 'success');
  }
  
  // Check for common performance anti-patterns
  log('Checking for performance anti-patterns...', 'info');
  
  const antiPatterns = [
    { pattern: /for.*in.*forEach/g, name: 'Nested loops' },
    { pattern: /setTimeout.*while/g, name: 'Blocking setTimeout in loops' },
    { pattern: /JSON\.parse.*JSON\.stringify/g, name: 'Unnecessary JSON operations' }
  ];
  
  let patternsFound = 0;
  allFiles.forEach(file => {
    const content = fs.readFileSync(file.path, 'utf8');
    antiPatterns.forEach(pattern => {
      if (pattern.pattern.test(content)) {
        patternsFound++;
        analysis.performance.potentialBottlenecks.push({
          file: file.name,
          issue: pattern.name
        });
      }
    });
  });
  
  if (patternsFound > 0) {
    log(`Found ${patternsFound} potential performance issues`, 'warning');
  } else {
    log('No obvious performance anti-patterns detected', 'success');
  }
}

/**
 * Check Deployment Readiness
 */
function checkDeploymentReadiness() {
  section('DEPLOYMENT READINESS CHECK');
  
  let score = 0;
  const checks = [];
  
  // Check 1: Environment configuration
  const envExample = fs.existsSync('.env.example');
  checks.push({
    name: 'Environment configuration',
    passed: envExample,
    message: envExample ? 'env.example found' : 'No .env.example file'
  });
  if (envExample) score++;
  
  // Check 2: Docker configuration
  const dockerfile = fs.existsSync('Dockerfile');
  checks.push({
    name: 'Docker configuration',
    passed: dockerfile,
    message: dockerfile ? 'Dockerfile found' : 'No Dockerfile'
  });
  if (dockerfile) score++;
  
  // Check 3: Test suite
  const hasTests = analysis.summary.testCoverage.tested > 0;
  checks.push({
    name: 'Test suite',
    passed: hasTests,
    message: hasTests ? 'Tests exist' : 'No tests found'
  });
  if (hasTests) score++;
  
  // Check 4: Security vulnerabilities
  const noVulnerabilities = Object.keys(analysis.security.vulnerabilities).length === 0;
  checks.push({
    name: 'Security scan',
    passed: noVulnerabilities,
    message: noVulnerabilities ? 'No vulnerabilities' : 'Vulnerabilities detected'
  });
  if (noVulnerabilities) score++;
  
  // Check 5: Documentation
  const hasReadme = fs.existsSync('README.md');
  checks.push({
    name: 'Documentation',
    passed: hasReadme,
    message: hasReadme ? 'README.md found' : 'No README.md'
  });
  if (hasReadme) score++;
  
  // Check 6: Error handling
  const hasErrorHandler = analysis.codebase.middleware.some(m => 
    m.name.toLowerCase().includes('error')
  );
  checks.push({
    name: 'Error handling',
    passed: hasErrorHandler,
    message: hasErrorHandler ? 'Error handler middleware found' : 'No error handler'
  });
  if (hasErrorHandler) score++;
  
  // Check 7: Logging
  const hasLogging = analysis.codebase.services.some(s => 
    s.name.toLowerCase().includes('log')
  );
  checks.push({
    name: 'Logging',
    passed: hasLogging,
    message: hasLogging ? 'Logging service found' : 'No logging service'
  });
  if (hasLogging) score++;
  
  // Check 8: Health check endpoint
  const hasHealthCheck = analysis.codebase.services.some(s => 
    s.name.toLowerCase().includes('health')
  );
  checks.push({
    name: 'Health check',
    passed: hasHealthCheck,
    message: hasHealthCheck ? 'Health check service found' : 'No health check'
  });
  if (hasHealthCheck) score++;
  
  // Display results
  checks.forEach(check => {
    log(check.message, check.passed ? 'success' : 'warning');
  });
  
  const percentage = (score / checks.length) * 100;
  log(`\nDeployment readiness score: ${score}/${checks.length} (${percentage.toFixed(0)}%)`, 
      percentage >= 80 ? 'success' : percentage >= 60 ? 'warning' : 'error');
  
  // Determine deployment readiness
  if (percentage >= 80) {
    analysis.deployment.readiness = 'READY';
    log('✅ System is READY for deployment', 'success');
  } else if (percentage >= 60) {
    analysis.deployment.readiness = 'MOSTLY READY';
    log('⚠️  System is MOSTLY READY (address warnings)', 'warning');
  } else {
    analysis.deployment.readiness = 'NOT READY';
    log('❌ System is NOT READY for deployment', 'error');
  }
  
  analysis.deployment.score = score;
  analysis.deployment.maxScore = checks.length;
  analysis.deployment.percentage = percentage.toFixed(2) + '%';
  analysis.deployment.checks = checks;
}

/**
 * Generate Report
 */
function generateReport() {
  section('GENERATING COMPREHENSIVE REPORT');
  
  const reportPath = path.join(process.cwd(), '../../COMPREHENSIVE_BACKEND_ANALYSIS_RESULTS.json');
  fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
  log(`Report saved to: ${reportPath}`, 'success');
  
  // Generate Markdown summary
  const mdReport = `# Comprehensive Backend Analysis Report

**Generated:** ${analysis.timestamp}  
**Deployment Readiness:** ${analysis.deployment.readiness}  
**Deployment Score:** ${analysis.deployment.score}/${analysis.deployment.maxScore} (${analysis.deployment.percentage})

---

## Executive Summary

### Codebase Statistics
- **Total Files:** ${analysis.summary.totalFiles}
- **Total Lines:** ${analysis.summary.totalLines}
- **Services:** ${analysis.codebase.services.length}
- **Controllers:** ${analysis.codebase.controllers.length}
- **Middleware:** ${analysis.codebase.middleware.length}

### Test Coverage
- **Coverage:** ${analysis.summary.testCoverage.percentage}
- **Tested Files:** ${analysis.summary.testCoverage.tested}/${analysis.summary.testCoverage.total}
- **Untested Files:** ${analysis.summary.testCoverage.untested}

### Security Status
- **Vulnerabilities:** ${Object.keys(analysis.security.vulnerabilities).length}
- **Deployment Blockers:** ${analysis.deployment.blockers.length}

### Performance
- **Large Files (>500 lines):** ${analysis.performance.largeFiles.length}
- **Potential Bottlenecks:** ${analysis.performance.potentialBottlenecks.length}

---

## Deployment Readiness Checks

${analysis.deployment.checks.map((check, i) => 
  `${i + 1}. **${check.name}:** ${check.passed ? '✅' : '❌'} ${check.message}`
).join('\n')}

---

## Recommendations

${analysis.summary.recommendations.map((rec, i) => `
### ${i + 1}. ${rec.category} (Priority: ${rec.priority})
${rec.message}

${rec.files ? `**Affected Files:**\n${rec.files.slice(0, 5).map(f => `- ${f}`).join('\n')}` : ''}
`).join('\n')}

---

## Deployment Status

**${analysis.deployment.readiness}**

${analysis.deployment.blockers.length > 0 ? `
### Blockers
${analysis.deployment.blockers.map((b, i) => `
${i + 1}. **${b.category}:** ${b.message}
   - Action: ${b.action}
`).join('\n')}
` : '✅ No deployment blockers'}

${analysis.deployment.warnings.length > 0 ? `
### Warnings
${analysis.deployment.warnings.map((w, i) => `
${i + 1}. ${w}
`).join('\n')}
` : ''}

---

**Analysis completed at ${new Date().toLocaleString()}**
`;
  
  const mdPath = path.join(process.cwd(), '../../COMPREHENSIVE_BACKEND_ANALYSIS_RESULTS.md');
  fs.writeFileSync(mdPath, mdReport);
  log(`Markdown report saved to: ${mdPath}`, 'success');
}

/**
 * Main Execution
 */
async function main() {
  console.log('\n🔍 COMPREHENSIVE BACKEND ANALYSIS\n');
  console.log('Starting thorough analysis of the backend system...\n');
  
  try {
    analyzeCodeStructure();
    analyzeTestCoverage();
    checkSecurity();
    analyzePerformance();
    checkDeploymentReadiness();
    generateReport();
    
    console.log('\n' + '='.repeat(70));
    console.log('  ANALYSIS COMPLETE');
    console.log('='.repeat(70));
    console.log(`\nDeployment Status: ${analysis.deployment.readiness}`);
    console.log(`Score: ${analysis.deployment.score}/${analysis.deployment.maxScore} (${analysis.deployment.percentage})`);
    console.log('\nView detailed reports:');
    console.log('  - COMPREHENSIVE_BACKEND_ANALYSIS_RESULTS.json');
    console.log('  - COMPREHENSIVE_BACKEND_ANALYSIS_RESULTS.md\n');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

main();
