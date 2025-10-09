#!/usr/bin/env node

/**
 * Performance Test Monitor
 * Real-time monitoring dashboard for ongoing performance tests
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REFRESH_INTERVAL = 2000; // 2 seconds
const RESULTS_DIR = path.join(__dirname, '../results');

/**
 * Clear console
 */
function clearConsole() {
  console.clear();
  console.log('\x1Bc'); // Alternative clear
}

/**
 * Format time
 */
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Create progress bar
 */
function progressBar(percent, width = 40) {
  const filled = Math.floor((percent / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${' '.repeat(empty)}] ${percent.toFixed(1)}%`;
}

/**
 * Get latest test results
 */
function getLatestResults() {
  try {
    if (!fs.existsSync(RESULTS_DIR)) {
      return null;
    }
    
    const files = fs.readdirSync(RESULTS_DIR)
      .filter(f => f.startsWith('performance-test-') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    if (files.length === 0) {
      return null;
    }
    
    const latestFile = path.join(RESULTS_DIR, files[0]);
    const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
    
    return {
      file: files[0],
      data
    };
  } catch (error) {
    return null;
  }
}

/**
 * Display dashboard
 */
function displayDashboard() {
  clearConsole();
  
  const results = getLatestResults();
  
  console.log('═'.repeat(80));
  console.log('🚀 PERFORMANCE TEST MONITOR - REAL-TIME DASHBOARD');
  console.log('═'.repeat(80));
  console.log(`\n⏰ Updated: ${new Date().toLocaleTimeString()}`);
  console.log(`📂 Results Directory: ${RESULTS_DIR}`);
  
  if (!results) {
    console.log('\n⏳ Waiting for test to start...');
    console.log('\n💡 Tip: Run the performance test in another terminal:');
    console.log('   cd secure-gate-access/server');
    console.log('   node tests/performance/comprehensive-performance-test.js');
    return;
  }
  
  const { file, data } = results;
  
  console.log(`📄 Latest Results: ${file}`);
  
  if (data.endTime) {
    const duration = (data.endTime - data.startTime) / 1000;
    console.log(`\n✅ TEST COMPLETE - Duration: ${duration.toFixed(2)}s`);
  } else {
    const elapsed = Date.now() - data.startTime;
    console.log(`\n🔄 TEST IN PROGRESS - Elapsed: ${formatTime(elapsed)}`);
  }
  
  // Test progress
  console.log('\n' + '─'.repeat(80));
  console.log('📊 TEST PROGRESS');
  console.log('─'.repeat(80));
  
  const testNames = ['Smoke Test', 'Load Test', 'Stress Test', 'Spike Test'];
  const totalTests = testNames.length;
  const completedTests = data.tests ? data.tests.length : 0;
  const progressPercent = (completedTests / totalTests) * 100;
  
  console.log(`\n${progressBar(progressPercent)}`);
  console.log(`Tests Completed: ${completedTests}/${totalTests}`);
  
  if (data.tests && data.tests.length > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log('📋 TEST RESULTS');
    console.log('─'.repeat(80));
    
    data.tests.forEach((test, index) => {
      const icon = test.passed ? '✅' : '❌';
      const status = test.passed ? 'PASS' : 'FAIL';
      
      console.log(`\n${index + 1}. ${icon} ${test.testName} - ${status}`);
      console.log(`   Requests: ${formatNumber(test.count)}`);
      console.log(`   Success Rate: ${test.successRate.toFixed(2)}%`);
      console.log(`   Error Rate: ${test.errorRate.toFixed(2)}%`);
      console.log(`   Response Times:`);
      console.log(`     - Mean: ${test.mean.toFixed(2)}ms`);
      console.log(`     - P95: ${test.p95.toFixed(2)}ms`);
      console.log(`     - P99: ${test.p99.toFixed(2)}ms`);
      console.log(`   Throughput: ${test.requestsPerSecond.toFixed(2)} req/s`);
    });
  }
  
  if (data.summary) {
    console.log('\n' + '─'.repeat(80));
    console.log('🎯 SUMMARY');
    console.log('─'.repeat(80));
    
    console.log(`\nOverall Status: ${data.summary.overallStatus}`);
    console.log(`Tests Passed: ${data.summary.passed}/${data.summary.totalTests}`);
    console.log(`Tests Failed: ${data.summary.failed}/${data.summary.totalTests}`);
    console.log(`Total Duration: ${data.summary.duration.toFixed(2)}s`);
    
    if (data.summary.overallStatus === 'PASS') {
      console.log('\n✅ ALL TESTS PASSED! 🎉');
    } else {
      console.log(`\n❌ ${data.summary.failed} TEST(S) FAILED`);
    }
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('💡 Press Ctrl+C to exit');
  console.log('═'.repeat(80));
}

/**
 * Main monitoring loop
 */
function startMonitoring() {
  displayDashboard();
  
  const interval = setInterval(() => {
    displayDashboard();
    
    // Check if test is complete
    const results = getLatestResults();
    if (results && results.data.endTime) {
      console.log('\n✅ Performance test completed. Monitor will continue running...');
      console.log('   Press Ctrl+C to exit or wait for next test run.');
    }
  }, REFRESH_INTERVAL);
  
  // Handle cleanup
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n\n👋 Monitor stopped. Goodbye!');
    process.exit(0);
  });
}

// Start monitoring
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting Performance Test Monitor...\n');
  setTimeout(startMonitoring, 1000);
}
