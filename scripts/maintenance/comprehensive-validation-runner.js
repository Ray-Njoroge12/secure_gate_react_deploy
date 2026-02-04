#!/usr/bin/env node

/**
 * Comprehensive Validation Runner
 * Executes security, performance, and privacy validation suites
 * Generates consolidated validation report for Task 19.2
 */

const SecurityTestSuite = require('./security-validation/security-test-suite');
const PerformanceTestSuite = require('./performance-validation/performance-test-suite');
const PrivacyComplianceTestSuite = require('./privacy-validation/privacy-compliance-test');
const fs = require('fs');
const path = require('path');

class ComprehensiveValidationRunner {
  constructor(baseUrl = 'http://localhost:3001', options = {}) {
    this.baseUrl = baseUrl;
    this.options = {
      runSecurity: true,
      runPerformance: true,
      runPrivacy: true,
      generateConsolidatedReport: true,
      verbose: true,
      ...options
    };
    
    this.results = {
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null,
      security: null,
      performance: null,
      privacy: null,
      overallStatus: 'PENDING',
      criticalIssues: [],
      recommendations: []
    };
  }

  async runAllValidations() {
    console.log('🚀 Starting Comprehensive Security and Performance Validation');
    console.log('=' .repeat(80));
    console.log(`📍 Target URL: ${this.baseUrl}`);
    console.log(`⏰ Started at: ${this.results.startTime}`);
    console.log('=' .repeat(80));
    
    const startTime = Date.now();
    
    try {
      // Run Security Validation
      if (this.options.runSecurity) {
        console.log('\n🔒 PHASE 1: SECURITY VALIDATION');
        console.log('-' .repeat(50));
        await this.runSecurityValidation();
      }
      
      // Run Performance Validation
      if (this.options.runPerformance) {
        console.log('\n⚡ PHASE 2: PERFORMANCE VALIDATION');
        console.log('-' .repeat(50));
        await this.runPerformanceValidation();
      }
      
      // Run Privacy Compliance Validation
      if (this.options.runPrivacy) {
        console.log('\n🔒 PHASE 3: PRIVACY COMPLIANCE VALIDATION');
        console.log('-' .repeat(50));
        await this.runPrivacyValidation();
      }
      
      // Calculate overall results
      this.results.endTime = new Date().toISOString();
      this.results.duration = Date.now() - startTime;
      this.calculateOverallStatus();
      
      // Generate consolidated report
      if (this.options.generateConsolidatedReport) {
        await this.generateConsolidatedReport();
      }
      
      // Display summary
      this.displayValidationSummary();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Comprehensive validation failed:', error);
      this.results.overallStatus = 'FAILED';
      this.results.criticalIssues.push(`Validation suite execution failed: ${error.message}`);
      throw error;
    }
  }

  async runSecurityValidation() {
    try {
      const securitySuite = new SecurityTestSuite(this.baseUrl, {
        timeout: 30000,
        verbose: this.options.verbose
      });
      
      const securityReport = await securitySuite.runAllTests();
      this.results.security = {
        status: securityReport.summary.failed === 0 ? 'PASSED' : 'FAILED',
        summary: securityReport.summary,
        tests: securityReport.tests,
        recommendations: securityReport.recommendations,
        reportPath: path.join(__dirname, 'security-validation', 'security-validation-report.json')
      };
      
      // Add critical security issues
      if (securityReport.summary.failed > 0) {
        this.results.criticalIssues.push(`${securityReport.summary.failed} security tests failed`);
      }
      
      console.log(`✅ Security validation completed: ${this.results.security.status}`);
      
    } catch (error) {
      console.error('❌ Security validation failed:', error);
      this.results.security = {
        status: 'ERROR',
        error: error.message,
        summary: { total: 0, passed: 0, failed: 1, warnings: 0 }
      };
      this.results.criticalIssues.push(`Security validation error: ${error.message}`);
    }
  }

  async runPerformanceValidation() {
    try {
      const performanceSuite = new PerformanceTestSuite(this.baseUrl, {
        timeout: 30000,
        maxConcurrentUsers: 50, // Reduced for validation
        testDuration: 30000,    // 30 seconds for validation
        verbose: this.options.verbose
      });
      
      const performanceReport = await performanceSuite.runAllTests();
      this.results.performance = {
        status: this.evaluatePerformanceStatus(performanceReport),
        summary: performanceReport.summary,
        metrics: performanceReport.metrics,
        recommendations: performanceReport.recommendations,
        reportPath: path.join(__dirname, 'performance-validation', 'performance-validation-report.json')
      };
      
      // Add performance issues
      if (performanceReport.summary.avgResponseTime > 2000) {
        this.results.criticalIssues.push(`High average response time: ${performanceReport.summary.avgResponseTime}ms`);
      }
      
      if (performanceReport.summary.avgErrorRate > 5) {
        this.results.criticalIssues.push(`High error rate: ${performanceReport.summary.avgErrorRate}%`);
      }
      
      console.log(`✅ Performance validation completed: ${this.results.performance.status}`);
      
    } catch (error) {
      console.error('❌ Performance validation failed:', error);
      this.results.performance = {
        status: 'ERROR',
        error: error.message,
        summary: { avgResponseTime: 0, avgErrorRate: 100 }
      };
      this.results.criticalIssues.push(`Performance validation error: ${error.message}`);
    }
  }

  async runPrivacyValidation() {
    try {
      const privacySuite = new PrivacyComplianceTestSuite(this.baseUrl, {
        timeout: 30000,
        verbose: this.options.verbose
      });
      
      const privacyReport = await privacySuite.runAllTests();
      this.results.privacy = {
        status: privacyReport.summary.failed === 0 ? 'PASSED' : 'FAILED',
        summary: privacyReport.summary,
        complianceAreas: privacyReport.complianceAreas,
        tests: privacyReport.tests,
        recommendations: privacyReport.recommendations,
        reportPath: path.join(__dirname, 'privacy-validation', 'privacy-compliance-report.json')
      };
      
      // Add critical privacy issues
      if (privacyReport.summary.failed > 0) {
        this.results.criticalIssues.push(`${privacyReport.summary.failed} privacy compliance tests failed`);
      }
      
      console.log(`✅ Privacy validation completed: ${this.results.privacy.status}`);
      
    } catch (error) {
      console.error('❌ Privacy validation failed:', error);
      this.results.privacy = {
        status: 'ERROR',
        error: error.message,
        summary: { total: 0, passed: 0, failed: 1, warnings: 0 }
      };
      this.results.criticalIssues.push(`Privacy validation error: ${error.message}`);
    }
  }

  evaluatePerformanceStatus(performanceReport) {
    const { summary } = performanceReport;
    
    // Define performance thresholds
    const thresholds = {
      avgResponseTime: 2000,    // 2 seconds max
      p95ResponseTime: 5000,    // 5 seconds max
      errorRate: 5              // 5% max error rate
    };
    
    if (summary.avgResponseTime > thresholds.avgResponseTime) return 'FAILED';
    if (summary.p95ResponseTime > thresholds.p95ResponseTime) return 'FAILED';
    if (summary.avgErrorRate > thresholds.errorRate) return 'FAILED';
    
    return 'PASSED';
  }

  calculateOverallStatus() {
    const statuses = [];
    
    if (this.results.security) statuses.push(this.results.security.status);
    if (this.results.performance) statuses.push(this.results.performance.status);
    if (this.results.privacy) statuses.push(this.results.privacy.status);
    
    // Overall status logic
    if (statuses.includes('ERROR') || statuses.includes('FAILED')) {
      this.results.overallStatus = 'FAILED';
    } else if (statuses.every(status => status === 'PASSED')) {
      this.results.overallStatus = 'PASSED';
    } else {
      this.results.overallStatus = 'PARTIAL';
    }
    
    // Compile recommendations
    this.compileRecommendations();
  }

  compileRecommendations() {
    const allRecommendations = [];
    
    if (this.results.security?.recommendations) {
      allRecommendations.push(...this.results.security.recommendations.map(r => `Security: ${r}`));
    }
    
    if (this.results.performance?.recommendations) {
      allRecommendations.push(...this.results.performance.recommendations.map(r => `Performance: ${r}`));
    }
    
    if (this.results.privacy?.recommendations) {
      allRecommendations.push(...this.results.privacy.recommendations.map(r => `Privacy: ${r}`));
    }
    
    // Add overall recommendations
    if (this.results.overallStatus === 'FAILED') {
      allRecommendations.unshift('CRITICAL: Address all failed tests before production deployment');
    }
    
    if (this.results.criticalIssues.length > 0) {
      allRecommendations.unshift('HIGH PRIORITY: Resolve critical issues identified in validation');
    }
    
    this.results.recommendations = [...new Set(allRecommendations)]; // Remove duplicates
  }

  async generateConsolidatedReport() {
    const consolidatedReport = {
      metadata: {
        title: 'Comprehensive Security and Performance Validation Report',
        subtitle: 'Task 19.2 - User Functionality Refinements Spec',
        generatedAt: new Date().toISOString(),
        baseUrl: this.baseUrl,
        duration: this.results.duration,
        version: '1.0.0'
      },
      executiveSummary: {
        overallStatus: this.results.overallStatus,
        totalDuration: `${(this.results.duration / 1000).toFixed(2)} seconds`,
        criticalIssues: this.results.criticalIssues.length,
        totalRecommendations: this.results.recommendations.length,
        validationAreas: {
          security: this.results.security?.status || 'NOT_RUN',
          performance: this.results.performance?.status || 'NOT_RUN',
          privacy: this.results.privacy?.status || 'NOT_RUN'
        }
      },
      detailedResults: {
        security: this.results.security,
        performance: this.results.performance,
        privacy: this.results.privacy
      },
      criticalIssues: this.results.criticalIssues,
      recommendations: this.results.recommendations,
      nextSteps: this.generateNextSteps(),
      appendices: {
        securityReportPath: this.results.security?.reportPath,
        performanceReportPath: this.results.performance?.reportPath,
        privacyReportPath: this.results.privacy?.reportPath
      }
    };
    
    const reportPath = path.join(__dirname, 'comprehensive-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(consolidatedReport, null, 2));
    
    // Also generate a markdown summary
    await this.generateMarkdownSummary(consolidatedReport);
    
    console.log(`\n📄 Consolidated report saved to: ${reportPath}`);
    return consolidatedReport;
  }

  async generateMarkdownSummary(report) {
    const markdown = `# Comprehensive Validation Report

## Executive Summary

**Overall Status:** ${report.executiveSummary.overallStatus}  
**Duration:** ${report.executiveSummary.totalDuration}  
**Critical Issues:** ${report.executiveSummary.criticalIssues}  
**Generated:** ${report.metadata.generatedAt}

## Validation Results

### Security Validation
- **Status:** ${report.executiveSummary.validationAreas.security}
- **Tests:** ${report.detailedResults.security?.summary?.total || 0} total
- **Passed:** ${report.detailedResults.security?.summary?.passed || 0}
- **Failed:** ${report.detailedResults.security?.summary?.failed || 0}
- **Warnings:** ${report.detailedResults.security?.summary?.warnings || 0}

### Performance Validation
- **Status:** ${report.executiveSummary.validationAreas.performance}
- **Avg Response Time:** ${report.detailedResults.performance?.summary?.avgResponseTime?.toFixed(2) || 'N/A'}ms
- **P95 Response Time:** ${report.detailedResults.performance?.summary?.p95ResponseTime?.toFixed(2) || 'N/A'}ms
- **Error Rate:** ${report.detailedResults.performance?.summary?.avgErrorRate?.toFixed(2) || 'N/A'}%

### Privacy Compliance Validation
- **Status:** ${report.executiveSummary.validationAreas.privacy}
- **Tests:** ${report.detailedResults.privacy?.summary?.total || 0} total
- **Passed:** ${report.detailedResults.privacy?.summary?.passed || 0}
- **Failed:** ${report.detailedResults.privacy?.summary?.failed || 0}
- **Compliance Score:** ${report.detailedResults.privacy?.summary?.complianceScore || 'N/A'}

## Critical Issues

${report.criticalIssues.length > 0 
  ? report.criticalIssues.map(issue => `- ❌ ${issue}`).join('\n')
  : '✅ No critical issues identified'
}

## Recommendations

${report.recommendations.slice(0, 10).map(rec => `- 📋 ${rec}`).join('\n')}

## Next Steps

${report.nextSteps.map(step => `- 🎯 ${step}`).join('\n')}

---

*Report generated by Comprehensive Validation Runner v${report.metadata.version}*
`;
    
    const markdownPath = path.join(__dirname, 'COMPREHENSIVE_VALIDATION_REPORT.md');
    fs.writeFileSync(markdownPath, markdown);
    
    console.log(`📄 Markdown summary saved to: ${markdownPath}`);
  }

  generateNextSteps() {
    const steps = [];
    
    if (this.results.overallStatus === 'FAILED') {
      steps.push('Address all critical security, performance, and privacy issues before proceeding');
      steps.push('Re-run validation suite after fixes are implemented');
    }
    
    if (this.results.criticalIssues.length > 0) {
      steps.push('Prioritize resolution of critical issues identified in validation');
    }
    
    if (this.results.overallStatus === 'PASSED') {
      steps.push('Proceed to Task 19.3 - Production deployment preparation');
      steps.push('Set up production monitoring and alerting systems');
      steps.push('Prepare user documentation and training materials');
    }
    
    steps.push('Schedule regular security and performance validation in CI/CD pipeline');
    steps.push('Implement continuous monitoring for production environment');
    
    return steps;
  }

  displayValidationSummary() {
    console.log('\n' + '=' .repeat(80));
    console.log('📊 COMPREHENSIVE VALIDATION SUMMARY');
    console.log('=' .repeat(80));
    
    console.log(`🎯 Overall Status: ${this.getStatusEmoji(this.results.overallStatus)} ${this.results.overallStatus}`);
    console.log(`⏱️  Total Duration: ${(this.results.duration / 1000).toFixed(2)} seconds`);
    console.log(`🚨 Critical Issues: ${this.results.criticalIssues.length}`);
    
    console.log('\n📋 Validation Areas:');
    if (this.results.security) {
      console.log(`  🔒 Security: ${this.getStatusEmoji(this.results.security.status)} ${this.results.security.status}`);
    }
    if (this.results.performance) {
      console.log(`  ⚡ Performance: ${this.getStatusEmoji(this.results.performance.status)} ${this.results.performance.status}`);
    }
    if (this.results.privacy) {
      console.log(`  🔒 Privacy: ${this.getStatusEmoji(this.results.privacy.status)} ${this.results.privacy.status}`);
    }
    
    if (this.results.criticalIssues.length > 0) {
      console.log('\n🚨 Critical Issues:');
      this.results.criticalIssues.forEach(issue => {
        console.log(`  ❌ ${issue}`);
      });
    }
    
    console.log('\n📋 Top Recommendations:');
    this.results.recommendations.slice(0, 5).forEach(rec => {
      console.log(`  📌 ${rec}`);
    });
    
    console.log('\n' + '=' .repeat(80));
    
    if (this.results.overallStatus === 'PASSED') {
      console.log('✅ VALIDATION SUCCESSFUL - Ready to proceed to production deployment preparation');
    } else {
      console.log('❌ VALIDATION ISSUES DETECTED - Address critical issues before proceeding');
    }
    
    console.log('=' .repeat(80));
  }

  getStatusEmoji(status) {
    switch (status) {
      case 'PASSED': return '✅';
      case 'FAILED': return '❌';
      case 'ERROR': return '💥';
      case 'PARTIAL': return '⚠️';
      default: return '❓';
    }
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'http://localhost:3001';
  
  const options = {
    runSecurity: !args.includes('--no-security'),
    runPerformance: !args.includes('--no-performance'),
    runPrivacy: !args.includes('--no-privacy'),
    verbose: args.includes('--verbose') || args.includes('-v')
  };
  
  console.log('🚀 Starting Comprehensive Validation Runner');
  console.log(`📍 Target: ${baseUrl}`);
  console.log(`🔧 Options:`, options);
  
  const runner = new ComprehensiveValidationRunner(baseUrl, options);
  
  runner.runAllValidations()
    .then(results => {
      console.log('\n✅ Comprehensive validation completed successfully');
      process.exit(results.overallStatus === 'PASSED' ? 0 : 1);
    })
    .catch(error => {
      console.error('\n❌ Comprehensive validation failed:', error);
      process.exit(1);
    });
}

module.exports = ComprehensiveValidationRunner;