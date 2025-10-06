#!/usr/bin/env node

/**
 * Performance Test Runner
 * 
 * This script executes comprehensive performance testing including
 * load testing, stress testing, and spike testing.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PerformanceMonitor from './performance-monitor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerformanceTestRunner {
  constructor() {
    this.monitor = new PerformanceMonitor();
    this.services = {
      backend: null,
      frontend: null
    };
    this.testResults = {
      loadTest: null,
      stressTest: null,
      spikeTest: null,
      monitoring: null
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
   * Run load test
   */
  async runLoadTest() {
    console.log('\n📊 Running Load Test...');
    
    try {
      const result = await this.runK6Test('load-test.js');
      this.testResults.loadTest = result;
      console.log('✅ Load test completed');
      return result;
    } catch (error) {
      console.error('❌ Load test failed:', error.message);
      throw error;
    }
  }

  /**
   * Run stress test
   */
  async runStressTest() {
    console.log('\n💪 Running Stress Test...');
    
    try {
      const result = await this.runK6Test('stress-test.js');
      this.testResults.stressTest = result;
      console.log('✅ Stress test completed');
      return result;
    } catch (error) {
      console.error('❌ Stress test failed:', error.message);
      throw error;
    }
  }

  /**
   * Run spike test
   */
  async runSpikeTest() {
    console.log('\n⚡ Running Spike Test...');
    
    try {
      const result = await this.runK6Test('spike-test.js');
      this.testResults.spikeTest = result;
      console.log('✅ Spike test completed');
      return result;
    } catch (error) {
      console.error('❌ Spike test failed:', error.message);
      throw error;
    }
  }

  /**
   * Run K6 test
   */
  async runK6Test(testFile) {
    return new Promise((resolve, reject) => {
      const testPath = path.join(__dirname, testFile);
      const k6Process = spawn('k6', ['run', testPath], {
        stdio: 'pipe',
        env: { ...process.env, BASE_URL: 'http://localhost:3001' }
      });
      
      let output = '';
      let errorOutput = '';
      
      k6Process.stdout.on('data', (data) => {
        output += data.toString();
        console.log(data.toString().trim());
      });
      
      k6Process.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(data.toString().trim());
      });
      
      k6Process.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            output: output,
            error: errorOutput
          });
        } else {
          reject(new Error(`K6 test failed with code ${code}: ${errorOutput}`));
        }
      });
      
      k6Process.on('error', (error) => {
        reject(new Error(`Failed to start K6 test: ${error.message}`));
      });
    });
  }

  /**
   * Run performance monitoring
   */
  async runPerformanceMonitoring() {
    console.log('\n📈 Starting Performance Monitoring...');
    
    try {
      // Start monitoring
      await this.monitor.startMonitoring();
      
      // Run monitoring for 5 minutes
      await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
      
      // Stop monitoring and get results
      const result = await this.monitor.stopMonitoring();
      this.testResults.monitoring = result;
      
      console.log('✅ Performance monitoring completed');
      return result;
    } catch (error) {
      console.error('❌ Performance monitoring failed:', error.message);
      throw error;
    }
  }

  /**
   * Run all performance tests
   */
  async runAllTests() {
    try {
      console.log('🧪 PERFORMANCE TESTING SUITE');
      console.log('=' .repeat(50));
      console.log('📋 Tests: Load, Stress, Spike, Monitoring');
      console.log('⏱️  Estimated Duration: 30-45 minutes');
      console.log('');

      // Start services
      await this.startServices();
      
      // Start performance monitoring
      const monitoringPromise = this.runPerformanceMonitoring();
      
      // Run load test
      await this.runLoadTest();
      
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Run stress test
      await this.runStressTest();
      
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Run spike test
      await this.runSpikeTest();
      
      // Wait for monitoring to complete
      await monitoringPromise;
      
      // Generate comprehensive report
      await this.generateComprehensiveReport();
      
      // Display summary
      this.displaySummary();
      
      return this.testResults;
      
    } catch (error) {
      console.error('❌ Performance testing failed:', error.message);
      throw error;
    } finally {
      // Always stop services
      await this.stopServices();
    }
  }

  /**
   * Generate comprehensive report
   */
  async generateComprehensiveReport() {
    console.log('\n📄 Generating comprehensive performance report...');
    
    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        tests: {
          loadTest: this.testResults.loadTest ? 'COMPLETED' : 'FAILED',
          stressTest: this.testResults.stressTest ? 'COMPLETED' : 'FAILED',
          spikeTest: this.testResults.spikeTest ? 'COMPLETED' : 'FAILED',
          monitoring: this.testResults.monitoring ? 'COMPLETED' : 'FAILED'
        }
      },
      results: this.testResults,
      recommendations: this.generateRecommendations()
    };
    
    // Save report
    const reportPath = path.join(__dirname, '../results/performance-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlReportPath = path.join(__dirname, '../results/performance-test-report.html');
    fs.writeFileSync(htmlReportPath, htmlReport);
    
    console.log('✅ Comprehensive performance report generated');
    console.log(`📊 Report saved to: ${reportPath}`);
    console.log(`🌐 HTML report: ${htmlReportPath}`);
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Add general performance recommendations
    recommendations.push({
      priority: 'HIGH',
      category: 'Performance',
      issue: 'Performance testing completed',
      recommendation: 'Review test results and implement optimizations as needed',
      impact: 'Improved system performance and user experience'
    });
    
    // Add specific recommendations based on test results
    if (this.testResults.monitoring) {
      const monitoringRecommendations = this.testResults.monitoring.recommendations || [];
      recommendations.push(...monitoringRecommendations);
    }
    
    return recommendations;
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Test Report - Secure Gate Access Control System</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .test-result { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .completed { border-left: 5px solid #28a745; background: #d4edda; }
        .failed { border-left: 5px solid #dc3545; background: #f8d7da; }
        .recommendation { margin: 10px 0; padding: 10px; background: #e9ecef; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Test Report</h1>
        <p>Secure Gate Access Control System</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="test-result ${report.summary.tests.loadTest === 'COMPLETED' ? 'completed' : 'failed'}">
        <h3>Load Test</h3>
        <p>Status: ${report.summary.tests.loadTest}</p>
        <p>Tests normal load conditions with gradual user increase</p>
    </div>
    
    <div class="test-result ${report.summary.tests.stressTest === 'COMPLETED' ? 'completed' : 'failed'}">
        <h3>Stress Test</h3>
        <p>Status: ${report.summary.tests.stressTest}</p>
        <p>Tests system behavior under extreme load conditions</p>
    </div>
    
    <div class="test-result ${report.summary.tests.spikeTest === 'COMPLETED' ? 'completed' : 'failed'}">
        <h3>Spike Test</h3>
        <p>Status: ${report.summary.tests.spikeTest}</p>
        <p>Tests system behavior during sudden load spikes</p>
    </div>
    
    <div class="test-result ${report.summary.tests.monitoring === 'COMPLETED' ? 'completed' : 'failed'}">
        <h3>Performance Monitoring</h3>
        <p>Status: ${report.summary.tests.monitoring}</p>
        <p>Monitors system performance metrics during testing</p>
    </div>
    
    <div class="test-result">
        <h3>Recommendations</h3>
        ${report.recommendations.map(rec => `
            <div class="recommendation">
                <strong>${rec.priority} - ${rec.category}:</strong> ${rec.issue}<br>
                <strong>Recommendation:</strong> ${rec.recommendation}<br>
                <strong>Impact:</strong> ${rec.impact}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }

  /**
   * Display test summary
   */
  displaySummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 PERFORMANCE TESTING COMPLETE');
    console.log('=' .repeat(60));
    
    const tests = this.testResults;
    const completedTests = Object.values(tests).filter(result => result !== null).length;
    const totalTests = Object.keys(tests).length;
    
    console.log(`📊 Tests Completed: ${completedTests}/${totalTests}`);
    console.log(`✅ Load Test: ${tests.loadTest ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Stress Test: ${tests.stressTest ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Spike Test: ${tests.spikeTest ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Performance Monitoring: ${tests.monitoring ? 'PASSED' : 'FAILED'}`);
    console.log('');
    
    console.log('📄 Reports Generated:');
    console.log('  - Performance Test Report: tests/results/performance-test-report.html');
    console.log('  - Performance Monitor Report: tests/results/performance-monitor-report.html');
    console.log('  - JSON Reports: tests/results/performance-test-report.json');
    console.log('');
    
    if (completedTests === totalTests) {
      console.log('✅ ALL PERFORMANCE TESTS COMPLETED SUCCESSFULLY');
    } else {
      console.log('⚠️  SOME PERFORMANCE TESTS FAILED - REVIEW RESULTS');
    }
    
    console.log('=' .repeat(60));
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
  const runner = new PerformanceTestRunner();
  
  // Setup graceful shutdown
  runner.setupGracefulShutdown();
  
  try {
    await runner.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('❌ Performance testing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

export default PerformanceTestRunner;
