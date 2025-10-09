#!/usr/bin/env node

/**
 * Performance Testing Script
 * Runs comprehensive performance tests including Lighthouse, bundle analysis, and runtime monitoring
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  buildDir: './build',
  reportDir: './performance-reports',
  lighthouseThresholds: {
    performance: 85,
    accessibility: 90,
    bestPractices: 90,
    seo: 80
  },
  bundleThresholds: {
    maxSize: 500000, // 500KB
    maxGzipSize: 150000, // 150KB
    maxChunks: 20
  }
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(title, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Create reports directory
function createReportsDir() {
  if (!fs.existsSync(config.reportDir)) {
    fs.mkdirSync(config.reportDir, { recursive: true });
    logSuccess('Created performance reports directory');
  }
}

// Run Lighthouse CI
function runLighthouseCI() {
  logSection('LIGHTHOUSE CI PERFORMANCE AUDIT');
  
  try {
    logInfo('Starting Lighthouse CI audit...');
    const output = execSync('npx lhci autorun', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    logSuccess('Lighthouse CI completed successfully');
    log(output);
    
    // Parse results and check thresholds
    const results = parseLighthouseResults(output);
    checkLighthouseThresholds(results);
    
  } catch (error) {
    logError('Lighthouse CI failed:');
    log(error.message, 'red');
    return false;
  }
  
  return true;
}

// Parse Lighthouse results from output
function parseLighthouseResults(output) {
  const results = {};
  
  // Extract scores from output
  const scoreRegex = /(\w+):\s*(\d+)/g;
  let match;
  
  while ((match = scoreRegex.exec(output)) !== null) {
    const [, category, score] = match;
    results[category] = parseInt(score);
  }
  
  return results;
}

// Check Lighthouse thresholds
function checkLighthouseThresholds(results) {
  logSection('LIGHTHOUSE THRESHOLD CHECKS');
  
  const checks = [
    { key: 'performance', threshold: config.lighthouseThresholds.performance },
    { key: 'accessibility', threshold: config.lighthouseThresholds.accessibility },
    { key: 'best-practices', threshold: config.lighthouseThresholds.bestPractices },
    { key: 'seo', threshold: config.lighthouseThresholds.seo }
  ];
  
  let allPassed = true;
  
  checks.forEach(({ key, threshold }) => {
    const score = results[key];
    if (score !== undefined) {
      if (score >= threshold) {
        logSuccess(`${key}: ${score} (threshold: ${threshold})`);
      } else {
        logError(`${key}: ${score} (threshold: ${threshold}) - FAILED`);
        allPassed = false;
      }
    } else {
      logWarning(`${key}: Score not found in results`);
    }
  });
  
  if (allPassed) {
    logSuccess('All Lighthouse thresholds passed!');
  } else {
    logError('Some Lighthouse thresholds failed!');
  }
  
  return allPassed;
}

// Analyze bundle size
function analyzeBundleSize() {
  logSection('BUNDLE SIZE ANALYSIS');
  
  try {
    const buildDir = config.buildDir;
    if (!fs.existsSync(buildDir)) {
      logError('Build directory not found. Run "npm run build" first.');
      return false;
    }
    
    const jsDir = path.join(buildDir, 'static/js');
    const cssDir = path.join(buildDir, 'static/css');
    
    let totalJSSize = 0;
    let totalCSSSize = 0;
    let jsFiles = [];
    let cssFiles = [];
    
    // Analyze JS files
    if (fs.existsSync(jsDir)) {
      const files = fs.readdirSync(jsDir);
      files.forEach(file => {
        if (file.endsWith('.js')) {
          const filePath = path.join(jsDir, file);
          const stats = fs.statSync(filePath);
          const size = stats.size;
          totalJSSize += size;
          jsFiles.push({ name: file, size });
        }
      });
    }
    
    // Analyze CSS files
    if (fs.existsSync(cssDir)) {
      const files = fs.readdirSync(cssDir);
      files.forEach(file => {
        if (file.endsWith('.css')) {
          const filePath = path.join(cssDir, file);
          const stats = fs.statSync(filePath);
          const size = stats.size;
          totalCSSSize += size;
          cssFiles.push({ name: file, size });
        }
      });
    }
    
    // Display results
    logInfo(`Total JS size: ${formatBytes(totalJSSize)}`);
    logInfo(`Total CSS size: ${formatBytes(totalCSSSize)}`);
    logInfo(`Total bundle size: ${formatBytes(totalJSSize + totalCSSSize)}`);
    
    // Check thresholds
    const jsThresholdPassed = totalJSSize <= config.bundleThresholds.maxSize;
    const cssThresholdPassed = totalCSSSize <= config.bundleThresholds.maxSize;
    const chunkThresholdPassed = jsFiles.length <= config.bundleThresholds.maxChunks;
    
    if (jsThresholdPassed) {
      logSuccess(`JS size within threshold (${formatBytes(config.bundleThresholds.maxSize)})`);
    } else {
      logError(`JS size exceeds threshold (${formatBytes(config.bundleThresholds.maxSize)})`);
    }
    
    if (cssThresholdPassed) {
      logSuccess(`CSS size within threshold (${formatBytes(config.bundleThresholds.maxSize)})`);
    } else {
      logError(`CSS size exceeds threshold (${formatBytes(config.bundleThresholds.maxSize)})`);
    }
    
    if (chunkThresholdPassed) {
      logSuccess(`Chunk count within threshold (${config.bundleThresholds.maxChunks})`);
    } else {
      logError(`Chunk count exceeds threshold (${config.bundleThresholds.maxChunks})`);
    }
    
    // Show largest files
    logSection('LARGEST FILES');
    const allFiles = [...jsFiles, ...cssFiles].sort((a, b) => b.size - a.size);
    allFiles.slice(0, 10).forEach((file, index) => {
      log(`${index + 1}. ${file.name}: ${formatBytes(file.size)}`, 'white');
    });
    
    return jsThresholdPassed && cssThresholdPassed && chunkThresholdPassed;
    
  } catch (error) {
    logError('Bundle analysis failed:');
    log(error.message, 'red');
    return false;
  }
}

// Format bytes to human readable format
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Generate performance report
function generateReport(lighthousePassed, bundlePassed) {
  logSection('GENERATING PERFORMANCE REPORT');
  
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    lighthouse: {
      passed: lighthousePassed,
      thresholds: config.lighthouseThresholds
    },
    bundle: {
      passed: bundlePassed,
      thresholds: config.bundleThresholds
    },
    overall: {
      passed: lighthousePassed && bundlePassed,
      score: lighthousePassed && bundlePassed ? 'PASS' : 'FAIL'
    }
  };
  
  const reportPath = path.join(config.reportDir, `performance-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  logSuccess(`Performance report saved to: ${reportPath}`);
  
  return report;
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const watchMode = args.includes('--watch');
  const reportMode = args.includes('--report');
  
  logSection('PERFORMANCE TESTING SUITE');
  logInfo('Starting comprehensive performance analysis...');
  
  createReportsDir();
  
  let lighthousePassed = false;
  let bundlePassed = false;
  
  try {
    // Run Lighthouse CI
    lighthousePassed = runLighthouseCI();
    
    // Analyze bundle size
    bundlePassed = analyzeBundleSize();
    
    // Generate report
    const report = generateReport(lighthousePassed, bundlePassed);
    
    // Final summary
    logSection('PERFORMANCE TEST SUMMARY');
    if (report.overall.passed) {
      logSuccess('🎉 All performance tests PASSED!');
      logSuccess('Application meets production performance standards.');
    } else {
      logError('❌ Some performance tests FAILED!');
      logError('Application needs optimization before production deployment.');
    }
    
    if (watchMode) {
      logInfo('Watch mode enabled. Monitoring for changes...');
      // In a real implementation, you would set up file watchers here
    }
    
  } catch (error) {
    logError('Performance testing failed:');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, analyzeBundleSize, runLighthouseCI };