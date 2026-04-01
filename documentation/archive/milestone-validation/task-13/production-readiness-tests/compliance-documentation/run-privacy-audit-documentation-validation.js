#!/usr/bin/env node

/**
 * Privacy and Audit Documentation Validation Runner
 * 
 * Executes comprehensive privacy policy accuracy, audit documentation completeness,
 * compliance evidence availability, and regulatory reporting capability validation
 * for production readiness assessment.
 * 
 * Requirements Validated:
 * - 10.5: Privacy policy accuracy and accessibility
 * - 10.7: Audit documentation completeness
 * - 10.8: Compliance evidence availability and regulatory reporting
 * 
 * Usage:
 *   node run-privacy-audit-documentation-validation.js [options]
 * 
 * Options:
 *   --format=json|table|detailed  Output format (default: detailed)
 *   --output=<file>               Save results to file
 *   --threshold=<number>          Minimum score threshold (default: 85)
 *   --fail-on-critical           Exit with error code if critical issues found
 *   --verbose                    Enable verbose logging
 *   --help                       Show this help message
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { PrivacyAuditDocumentationValidator } from './privacy-audit-documentation-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PrivacyAuditDocumentationValidationRunner {
  constructor() {
    this.options = {
      format: 'detailed',
      output: null,
      threshold: 85,
      failOnCritical: false,
      verbose: false,
      help: false
    };
    
    this.validator = new PrivacyAuditDocumentationValidator();
    this.startTime = Date.now();
  }

  /**
   * Parse command line arguments
   */
  parseArguments() {
    const args = process.argv.slice(2);
    
    for (const arg of args) {
      if (arg.startsWith('--format=')) {
        this.options.format = arg.split('=')[1];
      } else if (arg.startsWith('--output=')) {
        this.options.output = arg.split('=')[1];
      } else if (arg.startsWith('--threshold=')) {
        this.options.threshold = parseFloat(arg.split('=')[1]);
      } else if (arg === '--fail-on-critical') {
        this.options.failOnCritical = true;
      } else if (arg === '--verbose') {
        this.options.verbose = true;
      } else if (arg === '--help') {
        this.options.help = true;
      } else {
        console.warn(`⚠️  Unknown argument: ${arg}`);
      }
    }

    // Validate options
    if (!['json', 'table', 'detailed'].includes(this.options.format)) {
      console.error('❌ Invalid format. Use: json, table, or detailed');
      process.exit(1);
    }

    if (this.options.threshold < 0 || this.options.threshold > 100) {
      console.error('❌ Threshold must be between 0 and 100');
      process.exit(1);
    }
  }

  /**
   * Show help message
   */
  showHelp() {
    console.log(`
Privacy and Audit Documentation Validation Runner

Validates privacy policy accuracy, audit documentation completeness,
compliance evidence availability, and regulatory reporting capabilities.

Usage:
  node run-privacy-audit-documentation-validation.js [options]

Options:
  --format=json|table|detailed  Output format (default: detailed)
  --output=<file>               Save results to file
  --threshold=<number>          Minimum score threshold (default: 85)
  --fail-on-critical           Exit with error code if critical issues found
  --verbose                    Enable verbose logging
  --help                       Show this help message

Examples:
  # Run with detailed output
  node run-privacy-audit-documentation-validation.js

  # Run with JSON output and save to file
  node run-privacy-audit-documentation-validation.js --format=json --output=results.json

  # Run with custom threshold and fail on critical issues
  node run-privacy-audit-documentation-validation.js --threshold=90 --fail-on-critical

Requirements Validated:
  - 10.5: Privacy policy accuracy and accessibility
  - 10.7: Audit documentation completeness
  - 10.8: Compliance evidence availability and regulatory reporting
`);
  }

  /**
   * Run the validation process
   */
  async run() {
    try {
      this.parseArguments();

      if (this.options.help) {
        this.showHelp();
        return;
      }

      console.log('🔍 Privacy and Audit Documentation Validation Runner');
      console.log('=' .repeat(60));
      console.log();

      if (this.options.verbose) {
        console.log('📋 Configuration:');
        console.log(`   Format: ${this.options.format}`);
        console.log(`   Threshold: ${this.options.threshold}%`);
        console.log(`   Output: ${this.options.output || 'console'}`);
        console.log(`   Fail on Critical: ${this.options.failOnCritical}`);
        console.log();
      }

      // Run validation
      console.log('🚀 Starting Privacy and Audit Documentation Validation...');
      console.log();

      const validationResult = await this.validator.validateComplete();
      const executionTime = Date.now() - this.startTime;

      // Generate report
      const report = this.generateReport(validationResult, executionTime);

      // Output results
      await this.outputResults(report);

      // Check exit conditions
      this.checkExitConditions(validationResult);

      console.log();
      console.log('✅ Privacy and Audit Documentation Validation completed successfully');

    } catch (error) {
      console.error();
      console.error('❌ Privacy and Audit Documentation Validation failed:');
      console.error(`   ${error.message}`);
      
      if (this.options.verbose) {
        console.error();
        console.error('Stack trace:');
        console.error(error.stack);
      }
      
      process.exit(1);
    }
  }

  /**
   * Generate comprehensive validation report
   */
  generateReport(validationResult, executionTime) {
    const detailedResults = this.validator.generateDetailedReport();
    
    return {
      metadata: {
        timestamp: new Date().toISOString(),
        executionTime: `${executionTime}ms`,
        validator: 'PrivacyAuditDocumentationValidator',
        version: '1.0.0',
        requirements: ['10.5', '10.7', '10.8']
      },
      summary: {
        success: validationResult.success,
        overallScore: validationResult.results.overallScore,
        threshold: this.options.threshold,
        passesThreshold: validationResult.results.overallScore >= this.options.threshold,
        totalIssues: this.validator.getTotalIssueCount(),
        criticalIssues: validationResult.results.criticalIssues.length,
        readyForProduction: validationResult.results.overallScore >= 85 && 
                           validationResult.results.criticalIssues.length === 0
      },
      categories: {
        privacyPolicy: {
          score: this.calculateCategoryScore(validationResult.results.privacyPolicy),
          details: validationResult.results.privacyPolicy,
          status: this.getCategoryStatus(validationResult.results.privacyPolicy)
        },
        auditDocumentation: {
          score: this.calculateCategoryScore(validationResult.results.auditDocumentation),
          details: validationResult.results.auditDocumentation,
          status: this.getCategoryStatus(validationResult.results.auditDocumentation)
        },
        complianceEvidence: {
          score: this.calculateCategoryScore(validationResult.results.complianceEvidence),
          details: validationResult.results.complianceEvidence,
          status: this.getCategoryStatus(validationResult.results.complianceEvidence)
        },
        regulatoryReporting: {
          score: this.calculateCategoryScore(validationResult.results.regulatoryReporting),
          details: validationResult.results.regulatoryReporting,
          status: this.getCategoryStatus(validationResult.results.regulatoryReporting)
        }
      },
      issues: {
        critical: validationResult.results.criticalIssues,
        all: this.getAllIssues(validationResult.results),
        byCategory: this.getIssuesByCategory(validationResult.results),
        bySeverity: this.getIssuesBySeverity(validationResult.results)
      },
      recommendations: validationResult.results.recommendations,
      detailedResults: detailedResults
    };
  }

  /**
   * Calculate category score (average of sub-scores)
   */
  calculateCategoryScore(categoryResults) {
    const scores = Object.values(categoryResults).filter(value => typeof value === 'number');
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }

  /**
   * Get category status based on score
   */
  getCategoryStatus(categoryResults) {
    const score = this.calculateCategoryScore(categoryResults);
    const criticalIssues = categoryResults.issues?.filter(issue => issue.severity === 'critical').length || 0;
    
    if (criticalIssues > 0) return 'CRITICAL';
    if (score >= 90) return 'EXCELLENT';
    if (score >= 80) return 'GOOD';
    if (score >= 70) return 'ACCEPTABLE';
    if (score >= 60) return 'NEEDS_IMPROVEMENT';
    return 'POOR';
  }

  /**
   * Get all issues from validation results
   */
  getAllIssues(results) {
    return [
      ...(results.privacyPolicy.issues || []),
      ...(results.auditDocumentation.issues || []),
      ...(results.complianceEvidence.issues || []),
      ...(results.regulatoryReporting.issues || [])
    ];
  }

  /**
   * Group issues by category
   */
  getIssuesByCategory(results) {
    return {
      privacyPolicy: results.privacyPolicy.issues || [],
      auditDocumentation: results.auditDocumentation.issues || [],
      complianceEvidence: results.complianceEvidence.issues || [],
      regulatoryReporting: results.regulatoryReporting.issues || []
    };
  }

  /**
   * Group issues by severity
   */
  getIssuesBySeverity(results) {
    const allIssues = this.getAllIssues(results);
    
    return {
      critical: allIssues.filter(issue => issue.severity === 'critical'),
      high: allIssues.filter(issue => issue.severity === 'high'),
      medium: allIssues.filter(issue => issue.severity === 'medium'),
      low: allIssues.filter(issue => issue.severity === 'low')
    };
  }

  /**
   * Output results in specified format
   */
  async outputResults(report) {
    let output;

    switch (this.options.format) {
      case 'json':
        output = JSON.stringify(report, null, 2);
        break;
      case 'table':
        output = this.formatTableOutput(report);
        break;
      case 'detailed':
      default:
        output = this.formatDetailedOutput(report);
        break;
    }

    if (this.options.output) {
      await fs.writeFile(this.options.output, output, 'utf-8');
      console.log(`📄 Results saved to: ${this.options.output}`);
    } else {
      console.log(output);
    }
  }

  /**
   * Format output as table
   */
  formatTableOutput(report) {
    const lines = [];
    
    lines.push('Privacy and Audit Documentation Validation Results');
    lines.push('='.repeat(60));
    lines.push();
    
    // Summary table
    lines.push('SUMMARY');
    lines.push('-'.repeat(30));
    lines.push(`Overall Score:      ${report.summary.overallScore.toFixed(1)}%`);
    lines.push(`Threshold:          ${report.summary.threshold}%`);
    lines.push(`Status:             ${report.summary.passesThreshold ? '✅ PASS' : '❌ FAIL'}`);
    lines.push(`Total Issues:       ${report.summary.totalIssues}`);
    lines.push(`Critical Issues:    ${report.summary.criticalIssues}`);
    lines.push(`Production Ready:   ${report.summary.readyForProduction ? '✅ YES' : '❌ NO'}`);
    lines.push();
    
    // Category scores table
    lines.push('CATEGORY SCORES');
    lines.push('-'.repeat(50));
    lines.push('Category                    Score    Status');
    lines.push('-'.repeat(50));
    
    for (const [category, data] of Object.entries(report.categories)) {
      const categoryName = category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      const score = data.score.toFixed(1).padStart(6);
      const status = data.status.padEnd(12);
      lines.push(`${categoryName.padEnd(25)} ${score}%   ${status}`);
    }
    
    lines.push();
    
    // Issues summary
    if (report.summary.totalIssues > 0) {
      lines.push('ISSUES SUMMARY');
      lines.push('-'.repeat(30));
      lines.push(`Critical: ${report.issues.bySeverity.critical.length}`);
      lines.push(`High:     ${report.issues.bySeverity.high.length}`);
      lines.push(`Medium:   ${report.issues.bySeverity.medium.length}`);
      lines.push(`Low:      ${report.issues.bySeverity.low.length}`);
      lines.push();
    }
    
    return lines.join('\n');
  }

  /**
   * Format output as detailed report
   */
  formatDetailedOutput(report) {
    const lines = [];
    
    lines.push('🔍 Privacy and Audit Documentation Validation Report');
    lines.push('='.repeat(70));
    lines.push();
    
    // Executive Summary
    lines.push('📊 EXECUTIVE SUMMARY');
    lines.push('-'.repeat(40));
    lines.push(`Overall Score:           ${report.summary.overallScore.toFixed(1)}%`);
    lines.push(`Validation Status:       ${report.summary.passesThreshold ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push(`Production Readiness:    ${report.summary.readyForProduction ? '✅ READY' : '❌ NOT READY'}`);
    lines.push(`Execution Time:          ${report.metadata.executionTime}`);
    lines.push(`Timestamp:               ${report.metadata.timestamp}`);
    lines.push();
    
    // Category Details
    lines.push('📋 CATEGORY BREAKDOWN');
    lines.push('-'.repeat(40));
    
    for (const [categoryKey, categoryData] of Object.entries(report.categories)) {
      const categoryName = categoryKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      lines.push();
      lines.push(`${this.getCategoryIcon(categoryData.status)} ${categoryName.toUpperCase()}`);
      lines.push(`   Score: ${categoryData.score.toFixed(1)}% (${categoryData.status})`);
      
      // Sub-scores
      const details = categoryData.details;
      for (const [key, value] of Object.entries(details)) {
        if (typeof value === 'number' && key !== 'issues') {
          const subName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          lines.push(`   ${subName}: ${value.toFixed(1)}%`);
        }
      }
      
      // Issues for this category
      if (details.issues && details.issues.length > 0) {
        lines.push(`   Issues: ${details.issues.length}`);
        for (const issue of details.issues.slice(0, 3)) { // Show first 3 issues
          const icon = this.getSeverityIcon(issue.severity);
          lines.push(`     ${icon} ${issue.message}`);
        }
        if (details.issues.length > 3) {
          lines.push(`     ... and ${details.issues.length - 3} more`);
        }
      }
    }
    
    // Critical Issues
    if (report.issues.critical.length > 0) {
      lines.push();
      lines.push('🚨 CRITICAL ISSUES');
      lines.push('-'.repeat(40));
      for (const issue of report.issues.critical) {
        lines.push(`❌ ${issue.message}`);
        lines.push(`   Category: ${issue.category}`);
        lines.push(`   Requirement: ${issue.requirement}`);
        if (issue.recommendation) {
          lines.push(`   Recommendation: ${issue.recommendation}`);
        }
        lines.push();
      }
    }
    
    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push('💡 RECOMMENDATIONS');
      lines.push('-'.repeat(40));
      for (const rec of report.recommendations) {
        const priorityIcon = this.getPriorityIcon(rec.priority);
        lines.push(`${priorityIcon} ${rec.action}`);
        lines.push(`   ${rec.description}`);
        lines.push(`   Category: ${rec.category} | Priority: ${rec.priority}`);
        lines.push();
      }
    }
    
    // Requirements Coverage
    lines.push('📋 REQUIREMENTS COVERAGE');
    lines.push('-'.repeat(40));
    lines.push('✅ 10.5: Privacy policy accuracy and accessibility');
    lines.push('✅ 10.7: Audit documentation completeness');
    lines.push('✅ 10.8: Compliance evidence availability and regulatory reporting');
    lines.push();
    
    // Footer
    lines.push('📈 NEXT STEPS');
    lines.push('-'.repeat(40));
    if (report.summary.readyForProduction) {
      lines.push('🎉 System is ready for production deployment!');
      lines.push('   All privacy and audit documentation requirements are met.');
    } else {
      lines.push('⚠️  Address the issues above before production deployment.');
      lines.push('   Focus on critical and high-priority issues first.');
    }
    
    return lines.join('\n');
  }

  /**
   * Get category status icon
   */
  getCategoryIcon(status) {
    const icons = {
      'EXCELLENT': '🟢',
      'GOOD': '🟡',
      'ACCEPTABLE': '🟠',
      'NEEDS_IMPROVEMENT': '🔴',
      'POOR': '❌',
      'CRITICAL': '🚨'
    };
    return icons[status] || '❓';
  }

  /**
   * Get severity icon
   */
  getSeverityIcon(severity) {
    const icons = {
      'critical': '🚨',
      'high': '🔴',
      'medium': '🟡',
      'low': '🟢'
    };
    return icons[severity] || '❓';
  }

  /**
   * Get priority icon
   */
  getPriorityIcon(priority) {
    const icons = {
      'critical': '🚨',
      'high': '🔴',
      'medium': '🟡',
      'low': '🟢'
    };
    return icons[priority] || '❓';
  }

  /**
   * Check exit conditions and exit if necessary
   */
  checkExitConditions(validationResult) {
    let shouldExit = false;
    let exitCode = 0;

    // Check threshold
    if (validationResult.results.overallScore < this.options.threshold) {
      console.log();
      console.log(`❌ Validation failed: Score ${validationResult.results.overallScore.toFixed(1)}% below threshold ${this.options.threshold}%`);
      shouldExit = true;
      exitCode = 1;
    }

    // Check critical issues
    if (this.options.failOnCritical && validationResult.results.criticalIssues.length > 0) {
      console.log();
      console.log(`❌ Validation failed: ${validationResult.results.criticalIssues.length} critical issue(s) found`);
      shouldExit = true;
      exitCode = 1;
    }

    if (shouldExit) {
      process.exit(exitCode);
    }
  }
}

// Run the validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new PrivacyAuditDocumentationValidationRunner();
  runner.run().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { PrivacyAuditDocumentationValidationRunner };