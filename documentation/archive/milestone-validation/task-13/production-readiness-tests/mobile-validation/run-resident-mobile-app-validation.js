#!/usr/bin/env node

/**
 * Resident Mobile App Validation CLI Runner
 * 
 * Standalone CLI tool for running resident mobile app validation tests.
 * Provides detailed reporting, metrics collection, and CI/CD integration support.
 * 
 * @fileoverview CLI runner for resident mobile app validation
 * @version 1.0.0
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { ResidentMobileAppValidator } from './resident-mobile-app-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * CLI Runner for Resident Mobile App Validation
 */
class ResidentMobileAppValidationRunner {
  constructor() {
    this.startTime = Date.now();
    this.options = this.parseCommandLineArgs();
    this.validator = null;
    this.results = null;
  }

  /**
   * Parse command line arguments
   */
  parseCommandLineArgs() {
    const args = process.argv.slice(2);
    const options = {
      verbose: false,
      outputFormat: 'console', // console, json, html
      outputFile: null,
      configFile: null,
      touchTargetMinSize: 44,
      performanceThresholds: {
        inviteCreation: 2000,
        listLoad: 1500,
        realTimeUpdate: 500,
        gestureResponse: 100,
        offlineSync: 3000
      },
      includeRecommendations: true,
      failOnWarnings: false,
      timeout: 300000, // 5 minutes
      parallel: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
          
        case '--output-format':
        case '-f':
          options.outputFormat = args[++i];
          break;
          
        case '--output-file':
        case '-o':
          options.outputFile = args[++i];
          break;
          
        case '--config':
        case '-c':
          options.configFile = args[++i];
          break;
          
        case '--touch-target-size':
          options.touchTargetMinSize = parseInt(args[++i], 10);
          break;
          
        case '--invite-creation-threshold':
          options.performanceThresholds.inviteCreation = parseInt(args[++i], 10);
          break;
          
        case '--list-load-threshold':
          options.performanceThresholds.listLoad = parseInt(args[++i], 10);
          break;
          
        case '--real-time-threshold':
          options.performanceThresholds.realTimeUpdate = parseInt(args[++i], 10);
          break;
          
        case '--gesture-threshold':
          options.performanceThresholds.gestureResponse = parseInt(args[++i], 10);
          break;
          
        case '--offline-sync-threshold':
          options.performanceThresholds.offlineSync = parseInt(args[++i], 10);
          break;
          
        case '--no-recommendations':
          options.includeRecommendations = false;
          break;
          
        case '--fail-on-warnings':
          options.failOnWarnings = true;
          break;
          
        case '--timeout':
          options.timeout = parseInt(args[++i], 10) * 1000; // Convert to ms
          break;
          
        case '--parallel':
          options.parallel = true;
          break;
          
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
          
        default:
          if (arg.startsWith('-')) {
            console.error(`Unknown option: ${arg}`);
            process.exit(1);
          }
      }
    }

    return options;
  }

  /**
   * Load configuration from file if specified
   */
  loadConfiguration() {
    if (this.options.configFile && existsSync(this.options.configFile)) {
      try {
        const config = JSON.parse(readFileSync(this.options.configFile, 'utf8'));
        this.options = { ...this.options, ...config };
        
        if (this.options.verbose) {
          console.log(`📁 Loaded configuration from: ${this.options.configFile}`);
        }
      } catch (error) {
        console.error(`❌ Failed to load configuration file: ${error.message}`);
        process.exit(1);
      }
    }
  }

  /**
   * Run the validation process
   */
  async run() {
    try {
      console.log('🏠 Starting Resident Mobile App Validation...\n');
      
      this.loadConfiguration();
      this.setupValidator();
      
      // Set timeout for the entire validation process
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Validation timeout')), this.options.timeout);
      });
      
      const validationPromise = this.runValidation();
      
      this.results = await Promise.race([validationPromise, timeoutPromise]);
      
      await this.generateReport();
      this.determineExitCode();
      
    } catch (error) {
      console.error(`❌ Validation failed: ${error.message}`);
      
      if (this.options.verbose) {
        console.error(error.stack);
      }
      
      process.exit(1);
    }
  }

  /**
   * Setup the validator with options
   */
  setupValidator() {
    this.validator = new ResidentMobileAppValidator({
      touchTargetMinSize: this.options.touchTargetMinSize,
      performanceThresholds: this.options.performanceThresholds,
      realTimeUpdateTimeout: 5000,
      offlineTestDuration: 10000
    });

    // Setup event listeners for verbose output
    if (this.options.verbose) {
      this.validator.on('validationStarted', (data) => {
        console.log(`🚀 Started validation: ${data.type}`);
      });

      this.validator.on('warning', (warning) => {
        console.log(`⚠️  Warning: ${warning.message}`);
      });

      this.validator.on('error', (error) => {
        console.log(`❌ Error in ${error.type}: ${error.error.message}`);
      });
    }

    // Progress tracking
    let completedSections = 0;
    const totalSections = 10; // Number of validation sections

    this.validator.on('validationCompleted', () => {
      completedSections++;
      const progress = Math.round((completedSections / totalSections) * 100);
      if (this.options.verbose) {
        console.log(`📊 Progress: ${progress}%`);
      }
    });
  }

  /**
   * Run the validation process
   */
  async runValidation() {
    const startTime = Date.now();
    
    if (this.options.verbose) {
      console.log('🔍 Running comprehensive resident mobile app validation...\n');
    }

    const results = await this.validator.validateResidentMobileApp();
    
    const duration = Date.now() - startTime;
    results.validationDuration = duration;
    results.validationTimestamp = new Date().toISOString();
    
    return results;
  }

  /**
   * Generate validation report
   */
  async generateReport() {
    const duration = Date.now() - this.startTime;
    
    switch (this.options.outputFormat.toLowerCase()) {
      case 'json':
        await this.generateJSONReport();
        break;
      case 'html':
        await this.generateHTMLReport();
        break;
      default:
        this.generateConsoleReport();
    }

    if (this.options.verbose) {
      console.log(`\n⏱️  Total execution time: ${duration}ms`);
    }
  }

  /**
   * Generate console report
   */
  generateConsoleReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📱 RESIDENT MOBILE APP VALIDATION REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n📊 Overall Score: ${this.results.overallScore}%`);
    console.log(`🎯 Status: ${this.getStatusEmoji(this.results.status)} ${this.results.status}`);
    console.log(`📅 Timestamp: ${this.results.timestamp}`);
    
    if (this.results.validationDuration) {
      console.log(`⏱️  Duration: ${this.results.validationDuration}ms`);
    }

    // Test metrics
    console.log('\n📈 Test Metrics:');
    console.log(`   Total Tests: ${this.results.metrics.totalTests}`);
    console.log(`   Passed: ${this.results.metrics.passedTests} ✅`);
    console.log(`   Failed: ${this.results.metrics.failedTests} ❌`);
    console.log(`   Warnings: ${this.results.metrics.warnings} ⚠️`);

    // Validation results by category
    console.log('\n🔍 Validation Results:');
    this.printCategoryResults('Visitor Management', this.results.results.visitorManagement);
    this.printCategoryResults('Touch Optimization', this.results.results.touchOptimization);
    this.printCategoryResults('Real-Time Sync', this.results.results.realTimeSync);
    this.printCategoryResults('Mobile Features', this.results.results.mobileFeatures);
    this.printCategoryResults('Progressive Web App', this.results.results.progressiveWebApp);
    this.printCategoryResults('Responsive Design', this.results.results.responsiveDesign);
    this.printCategoryResults('Performance', this.results.results.performance);
    this.printCategoryResults('Accessibility', this.results.results.accessibility);
    this.printCategoryResults('Offline Functionality', this.results.results.offlineFunctionality);
    this.printCategoryResults('Notifications', this.results.results.notifications);

    // Performance metrics
    if (this.results.metrics.performanceMetrics && Object.keys(this.results.metrics.performanceMetrics).length > 0) {
      console.log('\n⚡ Performance Metrics:');
      Object.entries(this.results.metrics.performanceMetrics).forEach(([category, duration]) => {
        console.log(`   ${category}: ${duration.toFixed(2)}ms`);
      });
    }

    // Touch target violations
    if (this.results.metrics.touchTargetViolations && this.results.metrics.touchTargetViolations.length > 0) {
      console.log('\n👆 Touch Target Violations:');
      this.results.metrics.touchTargetViolations.forEach(violation => {
        console.log(`   ${violation.id}: ${violation.width}x${violation.height}px (min: ${this.options.touchTargetMinSize}px)`);
      });
    }

    // Gesture accuracy
    if (this.results.metrics.gestureAccuracies && this.results.metrics.gestureAccuracies.length > 0) {
      const avgAccuracy = this.results.metrics.gestureAccuracies.reduce((a, b) => a + b, 0) / this.results.metrics.gestureAccuracies.length;
      console.log(`\n👋 Gesture Recognition Accuracy: ${(avgAccuracy * 100).toFixed(1)}%`);
    }

    // Real-time latencies
    if (this.results.metrics.realTimeLatencies && this.results.metrics.realTimeLatencies.length > 0) {
      const avgLatency = this.results.metrics.realTimeLatencies.reduce((a, b) => a + b, 0) / this.results.metrics.realTimeLatencies.length;
      const maxLatency = Math.max(...this.results.metrics.realTimeLatencies);
      console.log(`\n⚡ Real-Time Update Latency:`);
      console.log(`   Average: ${avgLatency.toFixed(0)}ms`);
      console.log(`   Maximum: ${maxLatency.toFixed(0)}ms`);
      console.log(`   Threshold: ${this.options.performanceThresholds.realTimeUpdate}ms`);
    }

    // Recommendations
    if (this.options.includeRecommendations && this.results.recommendations && this.results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.recommendations.forEach((rec, index) => {
        const priorityEmoji = this.getPriorityEmoji(rec.priority);
        console.log(`   ${index + 1}. ${priorityEmoji} [${rec.type.toUpperCase()}] ${rec.message}`);
        
        if (rec.violations && this.options.verbose) {
          rec.violations.forEach(violation => {
            console.log(`      - ${violation.id}: ${violation.width}x${violation.height}px`);
          });
        }
      });
    }

    console.log('\n' + '='.repeat(80));
  }

  /**
   * Print category results
   */
  printCategoryResults(categoryName, results) {
    if (!results || Object.keys(results).length === 0) {
      console.log(`   ${categoryName}: No tests run`);
      return;
    }

    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    const statusEmoji = percentage === 100 ? '✅' : percentage >= 80 ? '⚠️' : '❌';
    console.log(`   ${categoryName}: ${statusEmoji} ${passed}/${total} (${percentage}%)`);
    
    if (this.options.verbose) {
      Object.entries(results).forEach(([test, result]) => {
        const testEmoji = result ? '✅' : '❌';
        console.log(`      ${testEmoji} ${test}`);
      });
    }
  }

  /**
   * Generate JSON report
   */
  async generateJSONReport() {
    const reportData = {
      ...this.results,
      generatedAt: new Date().toISOString(),
      validationOptions: {
        touchTargetMinSize: this.options.touchTargetMinSize,
        performanceThresholds: this.options.performanceThresholds
      }
    };

    const jsonReport = JSON.stringify(reportData, null, 2);
    
    if (this.options.outputFile) {
      this.ensureDirectoryExists(this.options.outputFile);
      writeFileSync(this.options.outputFile, jsonReport);
      console.log(`📄 JSON report saved to: ${this.options.outputFile}`);
    } else {
      console.log(jsonReport);
    }
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport() {
    const htmlContent = this.generateHTMLContent();
    
    if (this.options.outputFile) {
      this.ensureDirectoryExists(this.options.outputFile);
      writeFileSync(this.options.outputFile, htmlContent);
      console.log(`📄 HTML report saved to: ${this.options.outputFile}`);
    } else {
      console.log(htmlContent);
    }
  }

  /**
   * Generate HTML content
   */
  generateHTMLContent() {
    const statusColor = this.results.status === 'PASS' ? '#10b981' : 
                       this.results.status === 'WARNING' ? '#f59e0b' : '#ef4444';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resident Mobile App Validation Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .score { font-size: 3em; font-weight: bold; margin: 10px 0; }
        .status { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; color: white; background: ${statusColor}; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #1f2937; }
        .metric-label { color: #6b7280; margin-top: 5px; }
        .category { margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .category-header { font-size: 1.2em; font-weight: bold; margin-bottom: 15px; }
        .test-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
        .test-item:last-child { border-bottom: none; }
        .pass { color: #10b981; }
        .fail { color: #ef4444; }
        .recommendations { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .recommendation { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
        .priority-high { border-left: 4px solid #ef4444; }
        .priority-medium { border-left: 4px solid #f59e0b; }
        .priority-low { border-left: 4px solid #10b981; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📱 Resident Mobile App Validation Report</h1>
            <div class="score">${this.results.overallScore}%</div>
            <div class="status">${this.results.status}</div>
            <p>Generated: ${this.results.timestamp}</p>
        </div>
        
        <div class="content">
            <div class="metrics">
                <div class="metric">
                    <div class="metric-value">${this.results.metrics.totalTests}</div>
                    <div class="metric-label">Total Tests</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${this.results.metrics.passedTests}</div>
                    <div class="metric-label">Passed</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${this.results.metrics.failedTests}</div>
                    <div class="metric-label">Failed</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${this.results.metrics.warnings}</div>
                    <div class="metric-label">Warnings</div>
                </div>
            </div>

            ${this.generateCategoryHTML('Visitor Management', this.results.results.visitorManagement)}
            ${this.generateCategoryHTML('Touch Optimization', this.results.results.touchOptimization)}
            ${this.generateCategoryHTML('Real-Time Sync', this.results.results.realTimeSync)}
            ${this.generateCategoryHTML('Mobile Features', this.results.results.mobileFeatures)}
            ${this.generateCategoryHTML('Progressive Web App', this.results.results.progressiveWebApp)}
            
            ${this.results.recommendations && this.results.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>💡 Recommendations</h3>
                ${this.results.recommendations.map(rec => `
                    <div class="recommendation priority-${rec.priority}">
                        <strong>[${rec.type.toUpperCase()}]</strong> ${rec.message}
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate category HTML
   */
  generateCategoryHTML(categoryName, results) {
    if (!results || Object.keys(results).length === 0) {
      return `<div class="category">
        <div class="category-header">${categoryName}</div>
        <p>No tests run for this category</p>
      </div>`;
    }

    const testItems = Object.entries(results).map(([test, result]) => `
      <div class="test-item">
        <span>${test}</span>
        <span class="${result ? 'pass' : 'fail'}">${result ? '✅ PASS' : '❌ FAIL'}</span>
      </div>
    `).join('');

    return `<div class="category">
      <div class="category-header">${categoryName}</div>
      ${testItems}
    </div>`;
  }

  /**
   * Determine exit code based on results
   */
  determineExitCode() {
    let exitCode = 0;

    if (this.results.status === 'FAIL') {
      exitCode = 1;
    } else if (this.results.status === 'WARNING' && this.options.failOnWarnings) {
      exitCode = 1;
    }

    if (exitCode !== 0) {
      console.log(`\n❌ Validation failed with exit code: ${exitCode}`);
    } else {
      console.log(`\n✅ Validation completed successfully`);
    }

    process.exit(exitCode);
  }

  /**
   * Utility functions
   */
  getStatusEmoji(status) {
    switch (status) {
      case 'PASS': return '✅';
      case 'WARNING': return '⚠️';
      case 'FAIL': return '❌';
      default: return '❓';
    }
  }

  getPriorityEmoji(priority) {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }

  ensureDirectoryExists(filePath) {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
📱 Resident Mobile App Validation CLI

USAGE:
  node run-resident-mobile-app-validation.js [OPTIONS]

OPTIONS:
  -v, --verbose                    Enable verbose output
  -f, --output-format FORMAT      Output format: console, json, html (default: console)
  -o, --output-file FILE          Output file path
  -c, --config FILE               Configuration file path
  --touch-target-size SIZE        Minimum touch target size in pixels (default: 44)
  --invite-creation-threshold MS  Invite creation performance threshold (default: 2000)
  --list-load-threshold MS        List loading performance threshold (default: 1500)
  --real-time-threshold MS        Real-time update threshold (default: 500)
  --gesture-threshold MS          Gesture response threshold (default: 100)
  --offline-sync-threshold MS     Offline sync threshold (default: 3000)
  --no-recommendations            Disable recommendations in output
  --fail-on-warnings              Exit with error code on warnings
  --timeout SECONDS               Validation timeout in seconds (default: 300)
  --parallel                      Run tests in parallel (experimental)
  -h, --help                      Show this help message

EXAMPLES:
  # Basic validation with console output
  node run-resident-mobile-app-validation.js

  # Verbose validation with JSON output
  node run-resident-mobile-app-validation.js --verbose --output-format json --output-file report.json

  # Custom performance thresholds
  node run-resident-mobile-app-validation.js --invite-creation-threshold 1500 --real-time-threshold 300

  # HTML report generation
  node run-resident-mobile-app-validation.js --output-format html --output-file report.html

EXIT CODES:
  0  Validation passed
  1  Validation failed or warnings with --fail-on-warnings
`);
  }
}

// Run the CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new ResidentMobileAppValidationRunner();
  runner.run().catch(error => {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  });
}

export { ResidentMobileAppValidationRunner };