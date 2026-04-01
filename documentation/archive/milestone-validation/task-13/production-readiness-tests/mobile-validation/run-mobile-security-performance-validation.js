#!/usr/bin/env node

/**
 * Mobile Security and Performance Validation CLI Runner
 * 
 * Standalone execution for mobile security and performance validation
 * with comprehensive reporting and CI/CD integration support.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import MobileSecurityPerformanceValidator from './mobile-security-performance-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MobileSecurityPerformanceValidationRunner {
  constructor() {
    this.validator = new MobileSecurityPerformanceValidator();
    this.startTime = Date.now();
    this.config = {
      platforms: ['ios', 'android', 'pwa'],
      deviceCategories: ['lowEnd', 'midRange', 'highEnd'],
      outputDir: join(__dirname, '../../reports/mobile-security-performance'),
      verbose: false,
      exitOnFailure: false,
      generateReport: true,
      runSecurity: true,
      runPerformance: true,
      runOffline: true,
      runCrossPlatform: true
    };
  }

  /**
   * Parse command line arguments
   */
  parseArguments() {
    const args = process.argv.slice(2);
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--platforms':
          this.config.platforms = args[++i]?.split(',') || this.config.platforms;
          break;
        case '--devices':
          this.config.deviceCategories = args[++i]?.split(',') || this.config.deviceCategories;
          break;
        case '--output-dir':
          this.config.outputDir = args[++i] || this.config.outputDir;
          break;
        case '--verbose':
        case '-v':
          this.config.verbose = true;
          break;
        case '--exit-on-failure':
          this.config.exitOnFailure = true;
          break;
        case '--no-report':
          this.config.generateReport = false;
          break;
        case '--security-only':
          this.config.runSecurity = true;
          this.config.runPerformance = false;
          this.config.runOffline = false;
          this.config.runCrossPlatform = false;
          break;
        case '--performance-only':
          this.config.runSecurity = false;
          this.config.runPerformance = true;
          this.config.runOffline = false;
          this.config.runCrossPlatform = false;
          break;
        case '--offline-only':
          this.config.runSecurity = false;
          this.config.runPerformance = false;
          this.config.runOffline = true;
          this.config.runCrossPlatform = false;
          break;
        case '--cross-platform-only':
          this.config.runSecurity = false;
          this.config.runPerformance = false;
          this.config.runOffline = false;
          this.config.runCrossPlatform = true;
          break;
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
        default:
          if (arg.startsWith('--')) {
            console.warn(`⚠️  Unknown option: ${arg}`);
          }
          break;
      }
    }
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
🔒📱 Mobile Security and Performance Validation Runner

USAGE:
  node run-mobile-security-performance-validation.js [OPTIONS]

OPTIONS:
  --platforms <list>        Comma-separated list of platforms (ios,android,pwa)
  --devices <list>          Comma-separated list of device categories (lowEnd,midRange,highEnd)
  --output-dir <path>       Output directory for reports
  --verbose, -v             Enable verbose output
  --exit-on-failure         Exit with error code on validation failures
  --no-report               Skip report generation
  --security-only           Run only security validation
  --performance-only        Run only performance validation
  --offline-only            Run only offline functionality validation
  --cross-platform-only     Run only cross-platform consistency validation
  --help, -h                Show this help message

EXAMPLES:
  # Run full validation
  node run-mobile-security-performance-validation.js

  # Run security validation for iOS only
  node run-mobile-security-performance-validation.js --platforms ios --security-only

  # Run performance validation for low-end devices with verbose output
  node run-mobile-security-performance-validation.js --devices lowEnd --performance-only -v

  # Run with custom output directory
  node run-mobile-security-performance-validation.js --output-dir ./custom-reports

EXIT CODES:
  0  All validations passed
  1  Some validations failed
  2  Critical errors occurred
  3  Configuration errors
`);
  }

  /**
   * Run the complete validation suite
   */
  async run() {
    try {
      this.parseArguments();
      
      console.log('🔒📱 Starting Mobile Security and Performance Validation...\n');
      
      if (this.config.verbose) {
        console.log('Configuration:', JSON.stringify(this.config, null, 2));
        console.log('');
      }

      const results = {
        security: null,
        performance: null,
        offline: null,
        crossPlatform: null,
        summary: {
          totalTests: 0,
          totalPassed: 0,
          totalFailed: 0,
          duration: 0,
          success: false
        }
      };

      // Run security validation
      if (this.config.runSecurity) {
        console.log('🔒 Running security validation...');
        results.security = await this.runSecurityValidation();
        this.updateSummary(results.summary, results.security);
      }

      // Run performance validation
      if (this.config.runPerformance) {
        console.log('⚡ Running performance validation...');
        results.performance = await this.runPerformanceValidation();
        this.updateSummary(results.summary, results.performance);
      }

      // Run offline functionality validation
      if (this.config.runOffline) {
        console.log('📱 Running offline functionality validation...');
        results.offline = await this.runOfflineValidation();
        this.updateSummary(results.summary, results.offline);
      }

      // Run cross-platform consistency validation
      if (this.config.runCrossPlatform) {
        console.log('🔄 Running cross-platform consistency validation...');
        results.crossPlatform = await this.runCrossPlatformValidation();
        this.updateSummary(results.summary, results.crossPlatform);
      }

      // Calculate final results
      results.summary.duration = Date.now() - this.startTime;
      results.summary.success = results.summary.totalFailed === 0;

      // Generate comprehensive report
      if (this.config.generateReport) {
        await this.generateReports(results);
      }

      // Display summary
      this.displaySummary(results);

      // Exit with appropriate code
      const exitCode = this.determineExitCode(results);
      if (this.config.exitOnFailure && exitCode !== 0) {
        process.exit(exitCode);
      }

      return results;

    } catch (error) {
      console.error('❌ Critical error during validation:', error.message);
      if (this.config.verbose) {
        console.error(error.stack);
      }
      
      if (this.config.exitOnFailure) {
        process.exit(2);
      }
      
      throw error;
    }
  }

  /**
   * Run security validation
   */
  async runSecurityValidation() {
    const results = {};
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;

    for (const platform of this.config.platforms) {
      if (this.config.verbose) {
        console.log(`  🔒 Validating security for ${platform}...`);
      }

      const platformResults = await this.validator.validateSecurityMeasures(platform);
      results[platform] = platformResults[platform];

      // Count results
      for (const [aspect, aspectResults] of Object.entries(platformResults[platform])) {
        totalPassed += aspectResults.passed;
        totalFailed += aspectResults.failed;
        totalTests += aspectResults.tests.length;
      }

      if (this.config.verbose) {
        const platformPassed = Object.values(platformResults[platform])
          .reduce((sum, aspect) => sum + aspect.passed, 0);
        const platformFailed = Object.values(platformResults[platform])
          .reduce((sum, aspect) => sum + aspect.failed, 0);
        
        console.log(`    ✅ ${platformPassed} passed, ❌ ${platformFailed} failed`);
      }
    }

    return {
      type: 'security',
      platforms: results,
      summary: { totalPassed, totalFailed, totalTests }
    };
  }

  /**
   * Run performance validation
   */
  async runPerformanceValidation() {
    const results = {};
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;

    for (const deviceCategory of this.config.deviceCategories) {
      if (this.config.verbose) {
        console.log(`  ⚡ Validating performance for ${deviceCategory} devices...`);
      }

      const categoryResults = await this.validator.validatePerformanceBenchmarks(deviceCategory);
      results[deviceCategory] = categoryResults[deviceCategory];

      // Count results
      for (const [aspect, aspectResults] of Object.entries(categoryResults[deviceCategory])) {
        totalPassed += aspectResults.passed;
        totalFailed += aspectResults.failed;
        totalTests += aspectResults.tests.length;
      }

      if (this.config.verbose) {
        const categoryPassed = Object.values(categoryResults[deviceCategory])
          .reduce((sum, aspect) => sum + aspect.passed, 0);
        const categoryFailed = Object.values(categoryResults[deviceCategory])
          .reduce((sum, aspect) => sum + aspect.failed, 0);
        
        console.log(`    ✅ ${categoryPassed} passed, ❌ ${categoryFailed} failed`);
      }
    }

    return {
      type: 'performance',
      deviceCategories: results,
      summary: { totalPassed, totalFailed, totalTests }
    };
  }

  /**
   * Run offline functionality validation
   */
  async runOfflineValidation() {
    if (this.config.verbose) {
      console.log('  📱 Validating offline functionality...');
    }

    const results = await this.validator.validateOfflineFunctionality();
    
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;

    for (const [aspect, aspectResults] of Object.entries(results)) {
      totalPassed += aspectResults.passed;
      totalFailed += aspectResults.failed;
      totalTests += aspectResults.tests.length;
    }

    if (this.config.verbose) {
      console.log(`    ✅ ${totalPassed} passed, ❌ ${totalFailed} failed`);
    }

    return {
      type: 'offline',
      aspects: results,
      summary: { totalPassed, totalFailed, totalTests }
    };
  }

  /**
   * Run cross-platform consistency validation
   */
  async runCrossPlatformValidation() {
    if (this.config.verbose) {
      console.log('  🔄 Validating cross-platform consistency...');
    }

    const results = await this.validator.validateCrossPlatformConsistency();
    
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;

    for (const [aspect, aspectResults] of Object.entries(results)) {
      totalPassed += aspectResults.passed;
      totalFailed += aspectResults.failed;
      totalTests += aspectResults.tests.length;
    }

    if (this.config.verbose) {
      console.log(`    ✅ ${totalPassed} passed, ❌ ${totalFailed} failed`);
    }

    return {
      type: 'crossPlatform',
      aspects: results,
      summary: { totalPassed, totalFailed, totalTests }
    };
  }

  /**
   * Update summary with validation results
   */
  updateSummary(summary, validationResults) {
    if (validationResults && validationResults.summary) {
      summary.totalTests += validationResults.summary.totalTests;
      summary.totalPassed += validationResults.summary.totalPassed;
      summary.totalFailed += validationResults.summary.totalFailed;
    }
  }

  /**
   * Generate comprehensive reports
   */
  async generateReports(results) {
    try {
      // Ensure output directory exists
      mkdirSync(this.config.outputDir, { recursive: true });

      // Generate main validation report
      const report = this.validator.generateValidationReport();
      const reportPath = join(this.config.outputDir, 'mobile-security-performance-report.json');
      writeFileSync(reportPath, JSON.stringify(report, null, 2));

      // Generate detailed results
      const detailedResultsPath = join(this.config.outputDir, 'detailed-results.json');
      writeFileSync(detailedResultsPath, JSON.stringify(results, null, 2));

      // Generate HTML report
      const htmlReport = this.generateHTMLReport(report, results);
      const htmlReportPath = join(this.config.outputDir, 'mobile-security-performance-report.html');
      writeFileSync(htmlReportPath, htmlReport);

      // Generate CI/CD summary
      const ciSummary = this.generateCISummary(results);
      const ciSummaryPath = join(this.config.outputDir, 'ci-summary.json');
      writeFileSync(ciSummaryPath, JSON.stringify(ciSummary, null, 2));

      console.log(`\n📊 Reports generated:`);
      console.log(`  📄 Main report: ${reportPath}`);
      console.log(`  📋 Detailed results: ${detailedResultsPath}`);
      console.log(`  🌐 HTML report: ${htmlReportPath}`);
      console.log(`  🔧 CI summary: ${ciSummaryPath}`);

    } catch (error) {
      console.error('❌ Error generating reports:', error.message);
      if (this.config.verbose) {
        console.error(error.stack);
      }
    }
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report, results) {
    const timestamp = new Date().toISOString();
    const duration = Math.round(results.summary.duration / 1000);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mobile Security and Performance Validation Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .metric.success { border-left-color: #28a745; }
        .metric.warning { border-left-color: #ffc107; }
        .metric.danger { border-left-color: #dc3545; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #6c757d; font-size: 0.9em; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .category { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 15px; }
        .test-result { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .test-passed { background: #d4edda; border-left: 4px solid #28a745; }
        .test-failed { background: #f8d7da; border-left: 4px solid #dc3545; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; }
        .recommendation { margin-bottom: 15px; padding: 15px; background: white; border-radius: 4px; }
        .recommendation h4 { margin: 0 0 10px 0; color: #856404; }
        .recommendation ul { margin: 10px 0; padding-left: 20px; }
        .footer { text-align: center; padding: 20px; color: #6c757d; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒📱 Mobile Security and Performance Validation Report</h1>
            <p>Generated on ${timestamp} | Duration: ${duration}s</p>
        </div>
        
        <div class="content">
            <div class="summary">
                <div class="metric ${results.summary.success ? 'success' : 'danger'}">
                    <div class="metric-value">${results.summary.success ? '✅' : '❌'}</div>
                    <div class="metric-label">Overall Status</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${results.summary.totalTests}</div>
                    <div class="metric-label">Total Tests</div>
                </div>
                <div class="metric success">
                    <div class="metric-value">${results.summary.totalPassed}</div>
                    <div class="metric-label">Passed</div>
                </div>
                <div class="metric ${results.summary.totalFailed > 0 ? 'danger' : 'success'}">
                    <div class="metric-value">${results.summary.totalFailed}</div>
                    <div class="metric-label">Failed</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${report.summary.successRate}%</div>
                    <div class="metric-label">Success Rate</div>
                </div>
            </div>

            ${this.generateCategoryHTML(report.categories)}
            
            ${report.recommendations.length > 0 ? `
            <div class="section">
                <h2>📋 Recommendations</h2>
                <div class="recommendations">
                    ${report.recommendations.map(rec => `
                        <div class="recommendation">
                            <h4>${rec.title} (${rec.priority.toUpperCase()})</h4>
                            <p>${rec.description}</p>
                            <ul>
                                ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${report.criticalIssues.length > 0 ? `
            <div class="section">
                <h2>🚨 Critical Issues</h2>
                ${report.criticalIssues.map(issue => `
                    <div class="category">
                        <h3>${issue.category} - ${issue.subcategory}</h3>
                        <p><strong>Failed Tests:</strong> ${issue.failedTests}</p>
                        ${issue.issues.map(test => `
                            <div class="test-result test-failed">
                                <strong>${test.name}</strong>: ${test.error}
                                ${test.platform ? `<br><small>Platform: ${test.platform}</small>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p>Mobile Security and Performance Validation Report - Secure Gate Access Control System</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate category HTML for report
   */
  generateCategoryHTML(categories) {
    return Object.entries(categories).map(([categoryName, category]) => `
      <div class="section">
          <h2>📊 ${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} Validation</h2>
          <div class="category">
              <div class="summary">
                  <div class="metric">
                      <div class="metric-value">${category.totals.tests}</div>
                      <div class="metric-label">Total Tests</div>
                  </div>
                  <div class="metric success">
                      <div class="metric-value">${category.totals.passed}</div>
                      <div class="metric-label">Passed</div>
                  </div>
                  <div class="metric ${category.totals.failed > 0 ? 'danger' : 'success'}">
                      <div class="metric-value">${category.totals.failed}</div>
                      <div class="metric-label">Failed</div>
                  </div>
                  <div class="metric">
                      <div class="metric-value">${category.totals.successRate}%</div>
                      <div class="metric-label">Success Rate</div>
                  </div>
              </div>
              
              <h4>Subcategories:</h4>
              ${Object.entries(category.subcategories).map(([subName, sub]) => `
                  <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 4px;">
                      <strong>${subName}</strong>: ${sub.passed} passed, ${sub.failed} failed (${sub.successRate}% success rate)
                  </div>
              `).join('')}
          </div>
      </div>
    `).join('');
  }

  /**
   * Generate CI/CD summary
   */
  generateCISummary(results) {
    return {
      timestamp: new Date().toISOString(),
      duration: results.summary.duration,
      success: results.summary.success,
      summary: {
        totalTests: results.summary.totalTests,
        totalPassed: results.summary.totalPassed,
        totalFailed: results.summary.totalFailed,
        successRate: results.summary.totalTests > 0 ? 
          Math.round((results.summary.totalPassed / results.summary.totalTests) * 100) : 0
      },
      categories: {
        security: results.security ? {
          enabled: true,
          platforms: this.config.platforms,
          ...results.security.summary
        } : { enabled: false },
        performance: results.performance ? {
          enabled: true,
          deviceCategories: this.config.deviceCategories,
          ...results.performance.summary
        } : { enabled: false },
        offline: results.offline ? {
          enabled: true,
          ...results.offline.summary
        } : { enabled: false },
        crossPlatform: results.crossPlatform ? {
          enabled: true,
          ...results.crossPlatform.summary
        } : { enabled: false }
      },
      exitCode: this.determineExitCode(results)
    };
  }

  /**
   * Display validation summary
   */
  displaySummary(results) {
    const duration = Math.round(results.summary.duration / 1000);
    const successRate = results.summary.totalTests > 0 ? 
      Math.round((results.summary.totalPassed / results.summary.totalTests) * 100) : 0;

    console.log('\n' + '='.repeat(80));
    console.log('📊 MOBILE SECURITY AND PERFORMANCE VALIDATION SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`\n🎯 Overall Status: ${results.summary.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`\n📋 Test Results:`);
    console.log(`   Total Tests: ${results.summary.totalTests}`);
    console.log(`   ✅ Passed: ${results.summary.totalPassed}`);
    console.log(`   ❌ Failed: ${results.summary.totalFailed}`);

    // Category breakdown
    if (results.security) {
      console.log(`\n🔒 Security Validation:`);
      console.log(`   Platforms: ${this.config.platforms.join(', ')}`);
      console.log(`   Tests: ${results.security.summary.totalTests} | Passed: ${results.security.summary.totalPassed} | Failed: ${results.security.summary.totalFailed}`);
    }

    if (results.performance) {
      console.log(`\n⚡ Performance Validation:`);
      console.log(`   Device Categories: ${this.config.deviceCategories.join(', ')}`);
      console.log(`   Tests: ${results.performance.summary.totalTests} | Passed: ${results.performance.summary.totalPassed} | Failed: ${results.performance.summary.totalFailed}`);
    }

    if (results.offline) {
      console.log(`\n📱 Offline Functionality:`);
      console.log(`   Tests: ${results.offline.summary.totalTests} | Passed: ${results.offline.summary.totalPassed} | Failed: ${results.offline.summary.totalFailed}`);
    }

    if (results.crossPlatform) {
      console.log(`\n🔄 Cross-Platform Consistency:`);
      console.log(`   Tests: ${results.crossPlatform.summary.totalTests} | Passed: ${results.crossPlatform.summary.totalPassed} | Failed: ${results.crossPlatform.summary.totalFailed}`);
    }

    console.log('\n' + '='.repeat(80));
  }

  /**
   * Determine appropriate exit code
   */
  determineExitCode(results) {
    if (results.summary.totalFailed > 0) {
      return 1; // Some validations failed
    }
    
    if (results.summary.totalTests === 0) {
      return 3; // No tests run (configuration error)
    }
    
    return 0; // All validations passed
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new MobileSecurityPerformanceValidationRunner();
  
  runner.run().catch(error => {
    console.error('❌ Validation runner failed:', error.message);
    process.exit(2);
  });
}

export default MobileSecurityPerformanceValidationRunner;