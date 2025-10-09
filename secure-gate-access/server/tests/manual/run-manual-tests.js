#!/usr/bin/env node

/**
 * Manual Testing Runner
 * 
 * This script executes the comprehensive manual testing suite
 * for the Secure Gate Access Control System.
 */

const ManualTestingFramework = require('./manual-testing-framework');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ManualTestRunner {
  constructor() {
    this.framework = new ManualTestingFramework();
    this.services = {
      backend: null,
      frontend: null
    };
  }

  /**
   * Start required services
   */
  async startServices() {
    console.log('🚀 Starting required services...');
    
    try {
      // Start backend server
      console.log('📡 Starting backend server...');
      this.services.backend = spawn('npm', ['run', 'dev'], {
        cwd: process.cwd(),
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test', PORT: '3001' }
      });
      
      // Start frontend server
      console.log('🌐 Starting frontend server...');
      this.services.frontend = spawn('npm', ['start'], {
        cwd: path.join(process.cwd(), '../client'),
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test', PORT: '3000' }
      });
      
      // Wait for services to be ready
      await this.waitForServices();
      
      console.log('✅ All services started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start services:', error.message);
      throw error;
    }
  }

  /**
   * Wait for services to be ready
   */
  async waitForServices() {
    const maxAttempts = 30;
    const delay = 2000;
    
    console.log('⏳ Waiting for services to be ready...');
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Check backend health
        const backendResponse = await fetch('http://localhost:3001/health');
        if (backendResponse.ok) {
          console.log('✅ Backend is ready');
          
          // Check frontend
          const frontendResponse = await fetch('http://localhost:3000');
          if (frontendResponse.ok) {
            console.log('✅ Frontend is ready');
            return;
          }
        }
      } catch (error) {
        // Services not ready yet
      }
      
      console.log(`⏳ Waiting for services... attempt ${i + 1}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error('Services did not become ready within timeout');
  }

  /**
   * Stop services
   */
  async stopServices() {
    console.log('🛑 Stopping services...');
    
    if (this.services.backend) {
      this.services.backend.kill();
      console.log('✅ Backend server stopped');
    }
    
    if (this.services.frontend) {
      this.services.frontend.kill();
      console.log('✅ Frontend server stopped');
    }
  }

  /**
   * Run all manual tests
   */
  async runTests() {
    try {
      console.log('🧪 Starting Manual Testing Suite...');
      console.log('📋 Total Tests: 196');
      console.log('📊 Categories: 9');
      console.log('⏱️  Estimated Time: 2-3 hours');
      console.log('');
      
      // Start services
      await this.startServices();
      
      // Run all tests
      const report = await this.framework.runAllTests();
      
      // Display summary
      this.displaySummary(report);
      
      return report;
      
    } catch (error) {
      console.error('❌ Manual testing failed:', error.message);
      throw error;
    } finally {
      // Always stop services
      await this.stopServices();
    }
  }

  /**
   * Display test summary
   */
  displaySummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MANUAL TESTING SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${Math.round(report.summary.duration / 1000 / 60)} minutes`);
    console.log(`📋 Total Tests: ${report.summary.totalTests}`);
    console.log(`✅ Passed: ${report.summary.passedTests}`);
    console.log(`❌ Failed: ${report.summary.failedTests}`);
    console.log(`📈 Pass Rate: ${((report.summary.passedTests / report.summary.totalTests) * 100).toFixed(2)}%`);
    console.log('');
    
    console.log('📊 CATEGORY BREAKDOWN:');
    console.log('-'.repeat(60));
    Object.entries(report.categories).forEach(([category, stats]) => {
      const status = stats.passRate >= 90 ? '✅' : stats.passRate >= 80 ? '⚠️' : '❌';
      console.log(`${status} ${category.padEnd(20)} | ${stats.passed.toString().padStart(3)}/${stats.total} | ${stats.passRate}%`);
    });
    console.log('');
    
    // Show failed tests
    const failedTests = [];
    Object.entries(report.details).forEach(([category, tests]) => {
      tests.filter(t => t.result.status === 'FAIL').forEach(test => {
        failedTests.push({ category, test });
      });
    });
    
    if (failedTests.length > 0) {
      console.log('❌ FAILED TESTS:');
      console.log('-'.repeat(60));
      failedTests.forEach(({ category, test }) => {
        console.log(`${category.toUpperCase()}: ${test.id} - ${test.name}`);
        console.log(`  Reason: ${test.result.message}`);
      });
      console.log('');
    }
    
    console.log('📄 Reports generated:');
    console.log(`  - HTML: tests/results/manual-test-report.html`);
    console.log(`  - JSON: tests/results/manual-test-report.json`);
    console.log('');
    
    // Overall status
    const overallStatus = report.summary.passRate >= 95 ? '✅ EXCELLENT' : 
                         report.summary.passRate >= 90 ? '⚠️  GOOD' : 
                         report.summary.passRate >= 80 ? '⚠️  NEEDS IMPROVEMENT' : '❌ POOR';
    
    console.log(`🎯 OVERALL STATUS: ${overallStatus}`);
    console.log('='.repeat(60));
  }

  /**
   * Handle process termination
   */
  setupGracefulShutdown() {
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await this.stopServices();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await this.stopServices();
      process.exit(0);
    });
  }
}

// Main execution
async function main() {
  const runner = new ManualTestRunner();
  
  // Setup graceful shutdown
  runner.setupGracefulShutdown();
  
  try {
    // Check if services are already running
    try {
      await fetch('http://localhost:3001/health');
      await fetch('http://localhost:3000');
      console.log('ℹ️  Services are already running, proceeding with tests...');
    } catch (error) {
      console.log('ℹ️  Services not running, will start them...');
    }
    
    // Run tests
    const report = await runner.runTests();
    
    // Exit with appropriate code
    const exitCode = report.summary.passRate >= 90 ? 0 : 1;
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ Manual testing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = ManualTestRunner;




