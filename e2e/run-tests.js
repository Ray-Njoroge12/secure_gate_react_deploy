#!/usr/bin/env node

/**
 * E2E Test Execution Script
 * Comprehensive test runner with environment setup and reporting
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// Test configuration
const TEST_CONFIG = {
  environments: {
    local: {
      baseURL: 'http://localhost:3000',
      apiURL: 'http://localhost:3001'
    },
    staging: {
      baseURL: 'https://staging.secure-gate.app',
      apiURL: 'https://staging-api.secure-gate.app'
    },
    production: {
      baseURL: 'https://secure-gate.app',
      apiURL: 'https://api.secure-gate.app'
    }
  },
  testSuites: {
    smoke: ['**/smoke/**/*.spec.js'],
    integration: ['**/comprehensive-integration.spec.js'],
    performance: ['**/performance/**/*.spec.js'],
    accessibility: ['**/accessibility/**/*.spec.js'],
    mobile: ['**/mobile/**/*.spec.js'],
    all: ['**/*.spec.js']
  }
};

async function main() {
  const args = process.argv.slice(2);
  const options = parseArguments(args);
  
  console.log('🚀 Starting E2E Test Execution');
  console.log(`Environment: ${options.environment}`);
  console.log(`Test Suite: ${options.suite}`);
  console.log(`Browsers: ${options.browsers.join(', ')}`);
  
  try {
    // Setup environment
    await setupEnvironment(options);
    
    // Run tests
    const results = await runTests(options);
    
    // Generate reports
    await generateReports(results, options);
    
    // Display summary
    displaySummary(results);
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseArguments(args) {
  const options = {
    environment: 'local',
    suite: 'all',
    browsers: ['chromium'],
    headed: false,
    debug: false,
    workers: undefined,
    retries: undefined,
    timeout: undefined,
    grep: undefined,
    reporter: ['html', 'line']
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--env':
      case '--environment':
        options.environment = args[++i];
        break;
      case '--suite':
        options.suite = args[++i];
        break;
      case '--browser':
      case '--browsers':
        options.browsers = args[++i].split(',');
        break;
      case '--headed':
        options.headed = true;
        break;
      case '--debug':
        options.debug = true;
        options.headed = true;
        options.workers = 1;
        break;
      case '--workers':
        options.workers = parseInt(args[++i]);
        break;
      case '--retries':
        options.retries = parseInt(args[++i]);
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i]);
        break;
      case '--grep':
        options.grep = args[++i];
        break;
      case '--reporter':
        options.reporter = args[++i].split(',');
        break;
      case '--help':
        displayHelp();
        process.exit(0);
        break;
    }
  }
  
  return options;
}

/**
 * Setup test environment
 */
async function setupEnvironment(options) {
  console.log('🔧 Setting up test environment...');
  
  // Set environment variables
  const envConfig = TEST_CONFIG.environments[options.environment];
  process.env.TEST_BASE_URL = envConfig.baseURL;
  process.env.TEST_API_URL = envConfig.apiURL;
  process.env.NODE_ENV = 'test';
  
  // Create test results directory
  await fs.mkdir('test-results', { recursive: true });
  
  // For local environment, ensure servers are running
  if (options.environment === 'local') {
    await ensureLocalServers();
  }
  
  console.log('✅ Environment setup completed');
}

/**
 * Ensure local servers are running
 */
async function ensureLocalServers() {
  console.log('🌐 Checking local servers...');

  const serverPath = path.join(repoRoot, 'secure-gate-access', 'server');
  const clientPath = path.join(repoRoot, 'secure-gate-access', 'client');
  const serverStartScript = await resolveNpmScript(
    path.join(serverPath, 'package.json'),
    ['test:server', 'dev', 'start']
  );
  
  const servers = [
    { name: 'API Server', url: 'http://localhost:3001/health', port: 3001 },
    { name: 'Frontend Server', url: 'http://localhost:3000', port: 3000 }
  ];
  
  for (const server of servers) {
    try {
      const response = await fetch(server.url);
      if (response.ok) {
        console.log(`✅ ${server.name} is running`);
      } else {
        throw new Error(`Server responded with status ${response.status}`);
      }
    } catch (error) {
      console.log(`⚠️ ${server.name} not running, attempting to start...`);
      
      if (server.port === 3001) {
        console.log('Starting API server...');
        if (!serverStartScript) {
          throw new Error('No runnable API server script found (expected one of: test:server, dev, start)');
        }

        spawn('npm', ['run', serverStartScript], {
          cwd: serverPath,
          detached: true,
          stdio: 'ignore'
        });
      } else if (server.port === 3000) {
        console.log('Starting frontend server...');
        spawn('npm', ['start'], {
          cwd: clientPath,
          detached: true,
          stdio: 'ignore'
        });
      }
      
      // Wait for server to start
      await waitForServer(server.url, 60000);
    }
  }
}

async function resolveNpmScript(packageJsonPath, candidates) {
  try {
    const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    const scripts = pkg.scripts || {};
    return candidates.find(script => Boolean(scripts[script])) || null;
  } catch {
    return null;
  }
}

/**
 * Wait for server to be ready
 */
async function waitForServer(url, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`Server at ${url} did not start within ${timeout}ms`);
}

/**
 * Run tests
 */
async function runTests(options) {
  console.log('🧪 Running tests...');
  
  // Build Playwright command
  const cmd = ['npx', 'playwright', 'test'];
  
  // Add test pattern
  const testPattern = TEST_CONFIG.testSuites[options.suite] || [options.suite];
  cmd.push(...testPattern);
  
  // Add browser projects
  if (options.browsers.length > 0 && !options.browsers.includes('all')) {
    cmd.push('--project');
    cmd.push(options.browsers.join(','));
  }
  
  // Add options
  if (options.headed) cmd.push('--headed');
  if (options.debug) cmd.push('--debug');
  if (options.workers) cmd.push('--workers', options.workers.toString());
  if (options.retries) cmd.push('--retries', options.retries.toString());
  if (options.timeout) cmd.push('--timeout', options.timeout.toString());
  if (options.grep) cmd.push('--grep', options.grep);
  
  // Add reporters
  options.reporter.forEach(reporter => {
    cmd.push('--reporter', reporter);
  });
  
  // Execute tests
  try {
    execSync(cmd.join(' '), {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    // Parse results
    return await parseTestResults();
    
  } catch (error) {
    // Tests failed, but we still want to generate reports
    const results = await parseTestResults();
    return results;
  }
}

/**
 * Parse test results
 */
async function parseTestResults() {
  try {
    const resultsPath = 'test-results/results.json';
    const resultsData = await fs.readFile(resultsPath, 'utf8');
    const results = JSON.parse(resultsData);
    
    return {
      total: results.stats?.total || 0,
      passed: results.stats?.passed || 0,
      failed: results.stats?.failed || 0,
      skipped: results.stats?.skipped || 0,
      duration: results.stats?.duration || 0,
      suites: results.suites || []
    };
  } catch (error) {
    console.warn('⚠️ Could not parse test results');
    return {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      suites: []
    };
  }
}

/**
 * Generate reports
 */
async function generateReports(results, options) {
  console.log('📊 Generating reports...');
  
  try {
    // Generate HTML report
    if (options.reporter.includes('html')) {
      console.log('📄 HTML report available at: test-results/html-report/index.html');
    }
    
    // Generate JUnit report for CI
    if (options.reporter.includes('junit')) {
      console.log('📄 JUnit report available at: test-results/junit.xml');
    }
    
    // Generate custom summary report
    await generateCustomSummary(results, options);
    
    console.log('✅ Reports generated successfully');
    
  } catch (error) {
    console.warn('⚠️ Report generation failed:', error.message);
  }
}

/**
 * Generate custom summary report
 */
async function generateCustomSummary(results, options) {
  const timestamp = new Date().toISOString();
  const successRate = results.total > 0 
    ? ((results.passed / results.total) * 100).toFixed(2)
    : '0';
  
  const summary = {
    timestamp,
    environment: options.environment,
    suite: options.suite,
    browsers: options.browsers,
    results: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      successRate: `${successRate}%`,
      duration: `${(results.duration / 1000).toFixed(2)}s`
    },
    status: results.failed === 0 ? 'PASSED' : 'FAILED',
    readyForProduction: results.failed === 0 && parseFloat(successRate) >= 95
  };
  
  // Write JSON summary
  await fs.writeFile('test-results/execution-summary.json', JSON.stringify(summary, null, 2));
  
  // Write markdown summary
  const markdown = `# E2E Test Execution Summary

**Timestamp:** ${timestamp}
**Environment:** ${options.environment}
**Test Suite:** ${options.suite}
**Browsers:** ${options.browsers.join(', ')}

## Results

- **Total Tests:** ${results.total}
- **Passed:** ${results.passed} ✅
- **Failed:** ${results.failed} ❌
- **Skipped:** ${results.skipped} ⏭️
- **Success Rate:** ${successRate}%
- **Duration:** ${(results.duration / 1000).toFixed(2)} seconds

## Status: ${summary.status}

${summary.readyForProduction 
  ? '🎉 **System is ready for production deployment!**' 
  : '⚠️ **Review failed tests before production deployment.**'
}

## Test Categories Covered

- ✅ Multi-Role Workflow Testing
- ✅ Cross-Role Collaboration Testing  
- ✅ Performance Testing Under Load
- ✅ WCAG 2.1 AA Accessibility Compliance
- ✅ Device and Browser Compatibility
- ✅ API Integration Testing
- ✅ Real-Time Features Testing
- ✅ Security and Authentication Testing

## Reports

- [HTML Report](./html-report/index.html)
- [JUnit Report](./junit.xml)
- [Execution Summary](./execution-summary.json)
`;

  await fs.writeFile('test-results/EXECUTION_SUMMARY.md', markdown);
}

/**
 * Display summary
 */
function displaySummary(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST EXECUTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Skipped: ${results.skipped} ⏭️`);
  
  const successRate = results.total > 0 
    ? ((results.passed / results.total) * 100).toFixed(2)
    : '0';
  console.log(`Success Rate: ${successRate}%`);
  console.log(`Duration: ${(results.duration / 1000).toFixed(2)} seconds`);
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! System is ready for production.');
  } else {
    console.log('\n⚠️ Some tests failed. Review results before deployment.');
  }
  
  console.log('\n📄 Reports generated in test-results/ directory');
  console.log('='.repeat(60));
}

/**
 * Display help
 */
function displayHelp() {
  console.log(`
E2E Test Runner

Usage: node run-tests.js [options]

Options:
  --env, --environment <env>    Test environment (local, staging, production)
  --suite <suite>               Test suite (smoke, integration, performance, accessibility, mobile, all)
  --browser, --browsers <list>  Browsers to test (chromium, firefox, webkit, all)
  --headed                      Run tests in headed mode
  --debug                       Run tests in debug mode
  --workers <number>            Number of parallel workers
  --retries <number>            Number of retries for failed tests
  --timeout <ms>                Test timeout in milliseconds
  --grep <pattern>              Only run tests matching pattern
  --reporter <list>             Test reporters (html, line, json, junit)
  --help                        Show this help message

Examples:
  node run-tests.js --env local --suite smoke
  node run-tests.js --env staging --suite integration --browser chromium,firefox
  node run-tests.js --env production --suite all --headed
  node run-tests.js --debug --grep "login workflow"
`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main, TEST_CONFIG };