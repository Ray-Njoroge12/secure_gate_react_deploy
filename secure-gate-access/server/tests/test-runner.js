// Comprehensive Test Runner
// Executes all test suites and provides detailed reporting

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

class TestRunner {
  constructor() {
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      suites: []
    };
    this.startTime = Date.now();
  }

  /**
   * Run all test suites
   */
  async runAllTests() {
    console.log('🧪 Starting Comprehensive Test Suite');
    console.log('=====================================\n');

    const testSuites = [
      { name: 'Database Tests', file: 'database.test.js' },
      { name: 'Authentication Tests', file: 'auth.test.js' },
      { name: 'Visitor API Tests', file: 'visitor.test.js' },
      { name: 'Security Tests', file: 'security.test.js' },
      { name: 'Performance Tests', file: 'performance.test.js' },
      { name: 'Integration Tests', file: 'integration.test.js' }
    ];

    for (const suite of testSuites) {
      await this.runTestSuite(suite);
    }

    this.generateReport();
  }

  /**
   * Run individual test suite
   */
  async runTestSuite(suite) {
    console.log(`📊 Running ${suite.name}...`);
    
    const suiteStartTime = Date.now();
    const suiteResult = {
      name: suite.name,
      file: suite.file,
      status: 'pending',
      tests: [],
      duration: 0,
      error: null
    };

    try {
      // Check if test file exists
      const testPath = path.join(process.cwd(), 'tests', suite.file);
      if (!fs.existsSync(testPath)) {
        console.log(`⚠️  Test file not found: ${suite.file}`);
        suiteResult.status = 'skipped';
        suiteResult.duration = 0;
        this.testResults.skipped++;
      } else {
        // Run the test file
        const result = await this.executeTestFile(testPath);
        suiteResult.status = result.status;
        suiteResult.tests = result.tests || [];
        suiteResult.duration = Date.now() - suiteStartTime;
        
        if (result.status === 'passed') {
          this.testResults.passed++;
          console.log(`✅ ${suite.name} - PASSED (${suiteResult.duration}ms)`);
        } else {
          this.testResults.failed++;
          console.log(`❌ ${suite.name} - FAILED (${suiteResult.duration}ms)`);
          suiteResult.error = result.error;
        }
      }
    } catch (error) {
      suiteResult.status = 'failed';
      suiteResult.error = error.message;
      suiteResult.duration = Date.now() - suiteStartTime;
      this.testResults.failed++;
      console.log(`❌ ${suite.name} - ERROR: ${error.message}`);
    }

    this.testResults.suites.push(suiteResult);
    this.testResults.total++;
  }

  /**
   * Execute test file
   */
  executeTestFile(testPath) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [testPath], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({
            status: 'passed',
            output: stdout,
            tests: this.parseTestOutput(stdout)
          });
        } else {
          resolve({
            status: 'failed',
            output: stdout,
            error: stderr,
            tests: this.parseTestOutput(stdout)
          });
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Parse test output
   */
  parseTestOutput(output) {
    const tests = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('✓') || line.includes('✅')) {
        tests.push({
          name: line.trim(),
          status: 'passed'
        });
      } else if (line.includes('✗') || line.includes('❌')) {
        tests.push({
          name: line.trim(),
          status: 'failed'
        });
      }
    }
    
    return tests;
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    this.testResults.duration = Date.now() - this.startTime;
    
    console.log('\n📋 TEST EXECUTION REPORT');
    console.log('========================');
    console.log(`Total Suites: ${this.testResults.total}`);
    console.log(`Passed: ${this.testResults.passed}`);
    console.log(`Failed: ${this.testResults.failed}`);
    console.log(`Skipped: ${this.testResults.skipped}`);
    console.log(`Duration: ${this.testResults.duration}ms`);
    console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);

    console.log('\n📊 DETAILED RESULTS');
    console.log('===================');
    
    for (const suite of this.testResults.suites) {
      const status = suite.status === 'passed' ? '✅' : 
                   suite.status === 'failed' ? '❌' : '⚠️';
      console.log(`${status} ${suite.name} (${suite.duration}ms)`);
      
      if (suite.tests && suite.tests.length > 0) {
        for (const test of suite.tests) {
          const testStatus = test.status === 'passed' ? '  ✓' : '  ✗';
          console.log(`${testStatus} ${test.name}`);
        }
      }
      
      if (suite.error) {
        console.log(`    Error: ${suite.error}`);
      }
    }

    // Save report to file
    this.saveReport();
  }

  /**
   * Save test report to file
   */
  saveReport() {
    const reportPath = path.join(process.cwd(), 'test-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.total,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        skipped: this.testResults.skipped,
        duration: this.testResults.duration,
        successRate: ((this.testResults.passed / this.testResults.total) * 100).toFixed(1)
      },
      suites: this.testResults.suites
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Test report saved to: ${reportPath}`);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new TestRunner();
  runner.runAllTests().catch(console.error);
}

export default TestRunner;
