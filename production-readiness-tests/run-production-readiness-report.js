#!/usr/bin/env node

/**
 * CLI Runner for Production Readiness Report Generation
 * 
 * Standalone report generation capability with CI/CD integration support.
 * Generates comprehensive production readiness reports in multiple formats.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import ProductionReadinessReportGenerator from './production-readiness-report-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProductionReadinessReportCLI {
  constructor() {
    this.options = {
      outputDir: path.join(__dirname, 'reports'),
      format: 'all', // 'html', 'json', 'markdown', 'all'
      verbose: false,
      exitOnFailure: false,
      minScore: 95,
      maxCriticalIssues: 0,
      includeDetailedLogs: false,
      generateSummary: true
    };
  }

  /**
   * Parse command line arguments
   */
  parseArguments(args) {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--output-dir':
        case '-o':
          this.options.outputDir = args[++i];
          break;
          
        case '--format':
        case '-f':
          this.options.format = args[++i];
          if (!['html', 'json', 'markdown', 'all'].includes(this.options.format)) {
            throw new Error(`Invalid format: ${this.options.format}. Use: html, json, markdown, all`);
          }
          break;
          
        case '--verbose':
        case '-v':
          this.options.verbose = true;
          break;
          
        case '--exit-on-failure':
          this.options.exitOnFailure = true;
          break;
          
        case '--min-score':
          this.options.minScore = parseInt(args[++i], 10);
          if (isNaN(this.options.minScore) || this.options.minScore < 0 || this.options.minScore > 100) {
            throw new Error('Min score must be a number between 0 and 100');
          }
          break;
          
        case '--max-critical-issues':
          this.options.maxCriticalIssues = parseInt(args[++i], 10);
          if (isNaN(this.options.maxCriticalIssues) || this.options.maxCriticalIssues < 0) {
            throw new Error('Max critical issues must be a non-negative number');
          }
          break;
          
        case '--include-detailed-logs':
          this.options.includeDetailedLogs = true;
          break;
          
        case '--no-summary':
          this.options.generateSummary = false;
          break;
          
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
          
        default:
          if (arg.startsWith('-')) {
            throw new Error(`Unknown option: ${arg}`);
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
Production Readiness Report Generator

Usage: node run-production-readiness-report.js [options]

Options:
  -o, --output-dir <dir>          Output directory for reports (default: ./reports)
  -f, --format <format>           Report format: html, json, markdown, all (default: all)
  -v, --verbose                   Enable verbose output
  --exit-on-failure               Exit with non-zero code if deployment not ready
  --min-score <score>             Minimum required score for deployment (default: 95)
  --max-critical-issues <count>   Maximum allowed critical issues (default: 0)
  --include-detailed-logs         Include detailed validation logs in report
  --no-summary                    Skip generating summary file
  -h, --help                      Show this help message

Examples:
  # Generate all report formats
  node run-production-readiness-report.js

  # Generate only JSON report
  node run-production-readiness-report.js --format json

  # Generate report with custom output directory
  node run-production-readiness-report.js --output-dir /tmp/reports

  # Generate report for CI/CD with strict requirements
  node run-production-readiness-report.js --exit-on-failure --min-score 98 --max-critical-issues 0

Exit Codes:
  0 - Success (deployment ready or --exit-on-failure not set)
  1 - General error
  2 - Deployment not ready (only when --exit-on-failure is set)
  3 - Critical issues found (only when --exit-on-failure is set)
`);
  }

  /**
   * Log message with optional verbose mode
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
    
    if (this.options.verbose || level === 'error' || level === 'success') {
      console.log(`${prefix} [${timestamp}] ${message}`);
    }
  }

  /**
   * Validate environment and prerequisites
   */
  async validateEnvironment() {
    this.log('Validating environment...', 'info');

    // Check if output directory is writable
    try {
      await fs.mkdir(this.options.outputDir, { recursive: true });
      await fs.access(this.options.outputDir, fs.constants.W_OK);
    } catch (error) {
      throw new Error(`Output directory not writable: ${this.options.outputDir}`);
    }

    // Check if validation results exist
    const validationDirs = [
      'security-validation',
      'data-integrity',
      'user-functionality',
      'performance-testing',
      'compliance-documentation',
      'mobile-validation'
    ];

    let foundValidationResults = 0;
    for (const dir of validationDirs) {
      const dirPath = path.join(__dirname, dir);
      try {
        await fs.access(dirPath);
        foundValidationResults++;
      } catch (error) {
        this.log(`Validation directory not found: ${dir}`, 'warn');
      }
    }

    if (foundValidationResults === 0) {
      this.log('No validation results found. Report will use mock data.', 'warn');
    } else {
      this.log(`Found ${foundValidationResults} validation result directories`, 'info');
    }

    this.log('Environment validation completed', 'success');
  }

  /**
   * Generate production readiness report
   */
  async generateReport() {
    this.log('Initializing report generator...', 'info');

    const generator = new ProductionReadinessReportGenerator({
      outputDir: this.options.outputDir,
      includeDetailedLogs: this.options.includeDetailedLogs,
      generateAllFormats: this.options.format === 'all'
    });

    this.log('Loading validation results...', 'info');
    await generator.loadValidationResults();

    this.log('Calculating overall readiness score...', 'info');
    const overallScore = generator.calculateOverallScore();
    const issues = generator.aggregateIssues();
    const deployment = generator.generateDeploymentRecommendation();

    this.log(`Overall readiness score: ${overallScore}%`, 'info');
    this.log(`Critical issues: ${issues.CRITICAL.length}`, 'info');
    this.log(`High priority issues: ${issues.HIGH.length}`, 'info');
    this.log(`Deployment recommendation: ${deployment.recommendation}`, 'info');

    // Generate reports based on format option
    const reports = {};

    if (this.options.format === 'all' || this.options.format === 'html') {
      this.log('Generating HTML report...', 'info');
      const htmlReport = await generator.generateHTMLReport();
      const htmlPath = path.join(this.options.outputDir, 'production-readiness-report.html');
      await fs.writeFile(htmlPath, htmlReport, 'utf8');
      reports.html = htmlPath;
      this.log(`HTML report generated: ${htmlPath}`, 'success');
    }

    if (this.options.format === 'all' || this.options.format === 'json') {
      this.log('Generating JSON report...', 'info');
      const jsonReport = generator.generateJSONReport();
      const jsonPath = path.join(this.options.outputDir, 'production-readiness-report.json');
      await fs.writeFile(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf8');
      reports.json = jsonPath;
      this.log(`JSON report generated: ${jsonPath}`, 'success');
    }

    if (this.options.format === 'all' || this.options.format === 'markdown') {
      this.log('Generating Markdown report...', 'info');
      const markdownReport = generator.generateMarkdownReport();
      const markdownPath = path.join(this.options.outputDir, 'production-readiness-report.md');
      await fs.writeFile(markdownPath, markdownReport, 'utf8');
      reports.markdown = markdownPath;
      this.log(`Markdown report generated: ${markdownPath}`, 'success');
    }

    // Generate summary for CI/CD
    if (this.options.generateSummary) {
      this.log('Generating CI/CD summary...', 'info');
      const summary = {
        overallScore,
        recommendation: deployment.recommendation,
        criticalIssues: issues.CRITICAL.length,
        highPriorityIssues: issues.HIGH.length,
        totalIssues: Object.values(issues).flat().length,
        deploymentReady: deployment.recommendation === 'GO',
        meetsMinScore: overallScore >= this.options.minScore,
        withinCriticalLimit: issues.CRITICAL.length <= this.options.maxCriticalIssues,
        timestamp: new Date().toISOString(),
        generatedReports: Object.keys(reports)
      };

      const summaryPath = path.join(this.options.outputDir, 'production-readiness-summary.json');
      await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
      reports.summary = summaryPath;
      this.log(`CI/CD summary generated: ${summaryPath}`, 'success');
    }

    return {
      overallScore,
      deployment,
      issues,
      reports
    };
  }

  /**
   * Evaluate deployment readiness based on criteria
   */
  evaluateDeploymentReadiness(result) {
    const { overallScore, deployment, issues } = result;
    const criticalIssues = issues.CRITICAL.length;

    const readinessChecks = {
      scoreCheck: {
        passed: overallScore >= this.options.minScore,
        message: `Overall score ${overallScore}% ${overallScore >= this.options.minScore ? 'meets' : 'below'} minimum ${this.options.minScore}%`
      },
      criticalIssuesCheck: {
        passed: criticalIssues <= this.options.maxCriticalIssues,
        message: `${criticalIssues} critical issue(s) ${criticalIssues <= this.options.maxCriticalIssues ? 'within' : 'exceeds'} limit of ${this.options.maxCriticalIssues}`
      },
      deploymentRecommendation: {
        passed: deployment.recommendation === 'GO',
        message: `Deployment recommendation: ${deployment.recommendation}`
      }
    };

    const allChecksPassed = Object.values(readinessChecks).every(check => check.passed);

    return {
      ready: allChecksPassed,
      checks: readinessChecks,
      summary: allChecksPassed ? 
        '✅ System is ready for production deployment' :
        '❌ System is not ready for production deployment'
    };
  }

  /**
   * Print deployment readiness summary
   */
  printDeploymentSummary(result, readiness) {
    console.log('\n' + '='.repeat(60));
    console.log('PRODUCTION READINESS SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\nOverall Score: ${result.overallScore}%`);
    console.log(`Deployment Recommendation: ${result.deployment.recommendation}`);
    console.log(`Critical Issues: ${result.issues.CRITICAL.length}`);
    console.log(`High Priority Issues: ${result.issues.HIGH.length}`);
    console.log(`Total Issues: ${Object.values(result.issues).flat().length}`);

    console.log('\nReadiness Checks:');
    Object.entries(readiness.checks).forEach(([check, result]) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`  ${status} ${result.message}`);
    });

    console.log(`\n${readiness.summary}`);

    if (result.deployment.reasoning.length > 0) {
      console.log('\nRecommendation Reasoning:');
      result.deployment.reasoning.forEach(reason => {
        console.log(`  • ${reason}`);
      });
    }

    if (result.deployment.conditions && result.deployment.conditions.length > 0) {
      console.log('\nDeployment Conditions:');
      result.deployment.conditions.forEach(condition => {
        console.log(`  • ${condition}`);
      });
    }

    console.log('\nGenerated Reports:');
    Object.entries(result.reports).forEach(([format, path]) => {
      console.log(`  • ${format.toUpperCase()}: ${path}`);
    });

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Main execution function
   */
  async run(args = process.argv.slice(2)) {
    try {
      // Parse command line arguments
      this.parseArguments(args);

      this.log('Starting production readiness report generation...', 'info');
      this.log(`Output directory: ${this.options.outputDir}`, 'info');
      this.log(`Report format: ${this.options.format}`, 'info');

      // Validate environment
      await this.validateEnvironment();

      // Generate report
      const result = await this.generateReport();

      // Evaluate deployment readiness
      const readiness = this.evaluateDeploymentReadiness(result);

      // Print summary
      this.printDeploymentSummary(result, readiness);

      // Exit with appropriate code if requested
      if (this.options.exitOnFailure && !readiness.ready) {
        if (result.issues.CRITICAL.length > this.options.maxCriticalIssues) {
          this.log('Exiting with code 3: Critical issues found', 'error');
          process.exit(3);
        } else {
          this.log('Exiting with code 2: Deployment not ready', 'error');
          process.exit(2);
        }
      }

      this.log('Production readiness report generation completed successfully', 'success');
      process.exit(0);

    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      
      if (this.options.verbose) {
        console.error(error.stack);
      }

      process.exit(1);
    }
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new ProductionReadinessReportCLI();
  cli.run();
}

export default ProductionReadinessReportCLI;