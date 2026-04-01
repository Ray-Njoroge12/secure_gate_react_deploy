#!/usr/bin/env node

/**
 * GDPR Compliance Validation Runner
 * 
 * Comprehensive test runner for GDPR compliance validation including:
 * - Data protection measure implementation testing
 * - User rights implementation validation
 * - Consent management functionality validation
 * - Data minimization practices verification
 * - Privacy policy accuracy and accessibility testing
 * 
 * Requirements: 10.1
 */

const fs = require('fs').promises;
const path = require('path');
const GDPRComplianceValidator = require('./gdpr-compliance-validator');

class GDPRComplianceTestRunner {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || process.env.API_BASE_URL || 'https://localhost:3001',
      testTimeout: config.testTimeout || 30000,
      outputDir: config.outputDir || './compliance-reports',
      verbose: config.verbose || false,
      generateReport: config.generateReport !== false,
      exitOnFailure: config.exitOnFailure !== false,
      ...config
    };
    
    this.results = {
      startTime: null,
      endTime: null,
      duration: 0,
      overallStatus: 'PENDING',
      validationResults: null,
      errors: [],
      warnings: []
    };
  }

  /**
   * Run complete GDPR compliance validation
   */
  async runCompleteValidation() {
    console.log('🔒 Starting GDPR Compliance Validation Suite...\n');
    
    this.results.startTime = new Date();
    
    try {
      // Initialize validator
      const validator = new GDPRComplianceValidator({
        baseUrl: this.config.baseUrl,
        testTimeout: this.config.testTimeout
      });
      
      // Run validation
      console.log('📋 Running GDPR compliance validation...');
      this.results.validationResults = await validator.validateGDPRCompliance();
      
      // Calculate duration
      this.results.endTime = new Date();
      this.results.duration = this.results.endTime - this.results.startTime;
      
      // Determine overall status
      this.determineOverallStatus();
      
      // Display results
      this.displayResults();
      
      // Generate reports if requested
      if (this.config.generateReport) {
        await this.generateReports();
      }
      
      // Exit with appropriate code
      if (this.config.exitOnFailure && this.results.overallStatus === 'FAILED') {
        process.exit(1);
      }
      
      return this.results;
      
    } catch (error) {
      console.error('❌ GDPR Compliance Validation failed:', error.message);
      this.results.errors.push({
        type: 'validation_error',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      this.results.overallStatus = 'ERROR';
      
      if (this.config.exitOnFailure) {
        process.exit(1);
      }
      
      throw error;
    }
  }

  /**
   * Determine overall validation status
   */
  determineOverallStatus() {
    const results = this.results.validationResults;
    
    if (!results) {
      this.results.overallStatus = 'ERROR';
      return;
    }
    
    // Check for critical compliance issues
    const criticalIssues = results.criticalIssues.filter(
      issue => issue.severity === 'critical'
    ).length;
    
    const highIssues = results.criticalIssues.filter(
      issue => issue.severity === 'high'
    ).length;
    
    if (results.complianceStatus === 'NON_COMPLIANT' || criticalIssues > 0) {
      this.results.overallStatus = 'FAILED';
    } else if (results.complianceStatus === 'PARTIALLY_COMPLIANT' || highIssues > 5) {
      this.results.overallStatus = 'WARNING';
    } else if (results.complianceStatus === 'FULLY_COMPLIANT' && results.overallScore >= 95) {
      this.results.overallStatus = 'EXCELLENT';
    } else {
      this.results.overallStatus = 'PASSED';
    }
  }

  /**
   * Display validation results
   */
  displayResults() {
    const results = this.results.validationResults;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 GDPR COMPLIANCE VALIDATION RESULTS');
    console.log('='.repeat(80));
    
    // Overall status
    const statusIcon = this.getStatusIcon(this.results.overallStatus);
    console.log(`${statusIcon} Overall Status: ${this.results.overallStatus}`);
    console.log(`📈 Overall Score: ${results.overallScore}%`);
    console.log(`⚖️ Compliance Status: ${results.complianceStatus}`);
    console.log(`⏱️ Validation Duration: ${(this.results.duration / 1000).toFixed(2)}s`);
    console.log(`🚨 Critical Issues: ${results.criticalIssues.length}`);
    
    // Category scores
    console.log('\n📋 Category Scores:');
    console.log(`  🛡️ Data Protection Measures: ${results.dataProtectionMeasures.score || 0}%`);
    console.log(`  👤 User Rights Implementation: ${results.userRightsImplementation.score || 0}%`);
    console.log(`  ✋ Consent Management: ${results.consentManagement.score || 0}%`);
    console.log(`  📊 Data Minimization: ${results.dataMinimization.score || 0}%`);
    console.log(`  📋 Privacy Policy Compliance: ${results.privacyPolicyCompliance.score || 0}%`);
    
    // Critical issues
    if (results.criticalIssues.length > 0) {
      console.log('\n⚠️ Critical Issues:');
      results.criticalIssues.forEach((issue, index) => {
        const severityIcon = this.getSeverityIcon(issue.severity);
        console.log(`  ${index + 1}. ${severityIcon} [${issue.category.toUpperCase()}] ${issue.message}`);
        if (issue.recommendation && this.config.verbose) {
          console.log(`     💡 Recommendation: ${issue.recommendation}`);
        }
      });
    }
    
    // Recommendations
    if (results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      results.recommendations.forEach((rec, index) => {
        const priorityIcon = this.getPriorityIcon(rec.priority);
        console.log(`  ${index + 1}. ${priorityIcon} ${rec.category} (${rec.priority}): ${rec.message}`);
        if (this.config.verbose) {
          rec.actions.forEach(action => {
            console.log(`     - ${action}`);
          });
        }
      });
    }
    
    // Detailed category results (verbose mode)
    if (this.config.verbose) {
      this.displayDetailedResults();
    }
    
    console.log('\n' + '='.repeat(80));
  }

  /**
   * Display detailed category results
   */
  displayDetailedResults() {
    const results = this.results.validationResults;
    
    console.log('\n📋 Detailed Results:');
    
    // Data Protection Measures
    console.log('\n🛡️ Data Protection Measures:');
    if (results.dataProtectionMeasures.tests) {
      Object.entries(results.dataProtectionMeasures.tests).forEach(([test, passed]) => {
        const icon = passed ? '✅' : '❌';
        console.log(`  ${icon} ${test.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      });
    }
    
    // User Rights Implementation
    console.log('\n👤 User Rights Implementation:');
    if (results.userRightsImplementation.tests) {
      Object.entries(results.userRightsImplementation.tests).forEach(([test, passed]) => {
        const icon = passed ? '✅' : '❌';
        console.log(`  ${icon} ${test.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      });
    }
    
    // Consent Management
    console.log('\n✋ Consent Management:');
    if (results.consentManagement.tests) {
      Object.entries(results.consentManagement.tests).forEach(([test, passed]) => {
        const icon = passed ? '✅' : '❌';
        console.log(`  ${icon} ${test.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      });
    }
    
    // Data Minimization
    console.log('\n📊 Data Minimization:');
    if (results.dataMinimization.tests) {
      Object.entries(results.dataMinimization.tests).forEach(([test, passed]) => {
        const icon = passed ? '✅' : '❌';
        console.log(`  ${icon} ${test.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      });
    }
    
    // Privacy Policy Compliance
    console.log('\n📋 Privacy Policy Compliance:');
    if (results.privacyPolicyCompliance.tests) {
      Object.entries(results.privacyPolicyCompliance.tests).forEach(([test, passed]) => {
        const icon = passed ? '✅' : '❌';
        console.log(`  ${icon} ${test.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      });
    }
  }

  /**
   * Generate comprehensive reports
   */
  async generateReports() {
    console.log('\n📄 Generating compliance reports...');
    
    try {
      // Ensure output directory exists
      await fs.mkdir(this.config.outputDir, { recursive: true });
      
      // Generate JSON report
      await this.generateJSONReport();
      
      // Generate HTML report
      await this.generateHTMLReport();
      
      // Generate CSV summary
      await this.generateCSVSummary();
      
      // Generate compliance certificate (if fully compliant)
      if (this.results.validationResults.complianceStatus === 'FULLY_COMPLIANT') {
        await this.generateComplianceCertificate();
      }
      
      console.log(`📁 Reports generated in: ${this.config.outputDir}`);
      
    } catch (error) {
      console.error('❌ Failed to generate reports:', error.message);
      this.results.warnings.push({
        type: 'report_generation_error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Generate JSON report
   */
  async generateJSONReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `gdpr-compliance-report-${timestamp}.json`;
    const filepath = path.join(this.config.outputDir, filename);
    
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        validationDuration: this.results.duration,
        validatorVersion: '1.0.0',
        baseUrl: this.config.baseUrl
      },
      summary: {
        overallStatus: this.results.overallStatus,
        overallScore: this.results.validationResults.overallScore,
        complianceStatus: this.results.validationResults.complianceStatus,
        criticalIssues: this.results.validationResults.criticalIssues.length,
        recommendations: this.results.validationResults.recommendations.length
      },
      results: this.results.validationResults,
      errors: this.results.errors,
      warnings: this.results.warnings
    };
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    console.log(`  ✅ JSON report: ${filename}`);
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `gdpr-compliance-report-${timestamp}.html`;
    const filepath = path.join(this.config.outputDir, filename);
    
    const html = this.generateHTMLContent();
    
    await fs.writeFile(filepath, html);
    console.log(`  ✅ HTML report: ${filename}`);
  }

  /**
   * Generate HTML content for report
   */
  generateHTMLContent() {
    const results = this.results.validationResults;
    const statusColor = this.getStatusColor(this.results.overallStatus);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GDPR Compliance Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .status { font-size: 24px; font-weight: bold; color: ${statusColor}; }
        .score { font-size: 48px; font-weight: bold; color: #333; }
        .category { margin: 20px 0; padding: 15px; border-left: 4px solid #007cba; background: #f8f9fa; }
        .category h3 { margin: 0 0 10px 0; color: #007cba; }
        .test-result { margin: 5px 0; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .issue { margin: 10px 0; padding: 10px; border-left: 4px solid #dc3545; background: #fff5f5; }
        .recommendation { margin: 10px 0; padding: 10px; border-left: 4px solid #ffc107; background: #fffbf0; }
        .timestamp { color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 GDPR Compliance Validation Report</h1>
            <div class="status">${this.results.overallStatus}</div>
            <div class="score">${results.overallScore}%</div>
            <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
        </div>
        
        <div class="summary">
            <h2>📊 Summary</h2>
            <p><strong>Compliance Status:</strong> ${results.complianceStatus}</p>
            <p><strong>Validation Duration:</strong> ${(this.results.duration / 1000).toFixed(2)}s</p>
            <p><strong>Critical Issues:</strong> ${results.criticalIssues.length}</p>
            <p><strong>Recommendations:</strong> ${results.recommendations.length}</p>
        </div>
        
        <div class="categories">
            <h2>📋 Category Results</h2>
            
            <div class="category">
                <h3>🛡️ Data Protection Measures (${results.dataProtectionMeasures.score || 0}%)</h3>
                ${this.generateCategoryHTML(results.dataProtectionMeasures.tests)}
            </div>
            
            <div class="category">
                <h3>👤 User Rights Implementation (${results.userRightsImplementation.score || 0}%)</h3>
                ${this.generateCategoryHTML(results.userRightsImplementation.tests)}
            </div>
            
            <div class="category">
                <h3>✋ Consent Management (${results.consentManagement.score || 0}%)</h3>
                ${this.generateCategoryHTML(results.consentManagement.tests)}
            </div>
            
            <div class="category">
                <h3>📊 Data Minimization (${results.dataMinimization.score || 0}%)</h3>
                ${this.generateCategoryHTML(results.dataMinimization.tests)}
            </div>
            
            <div class="category">
                <h3>📋 Privacy Policy Compliance (${results.privacyPolicyCompliance.score || 0}%)</h3>
                ${this.generateCategoryHTML(results.privacyPolicyCompliance.tests)}
            </div>
        </div>
        
        ${results.criticalIssues.length > 0 ? `
        <div class="issues">
            <h2>⚠️ Critical Issues</h2>
            ${results.criticalIssues.map(issue => `
                <div class="issue">
                    <strong>[${issue.category.toUpperCase()}]</strong> ${issue.message}
                    ${issue.recommendation ? `<br><em>Recommendation: ${issue.recommendation}</em>` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${results.recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>💡 Recommendations</h2>
            ${results.recommendations.map(rec => `
                <div class="recommendation">
                    <strong>${rec.category} (${rec.priority}):</strong> ${rec.message}
                    <ul>
                        ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate HTML for category tests
   */
  generateCategoryHTML(tests) {
    if (!tests) return '<p>No test results available</p>';
    
    return Object.entries(tests).map(([test, passed]) => {
      const icon = passed ? '✅' : '❌';
      const className = passed ? 'passed' : 'failed';
      const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
      return `<div class="test-result ${className}">${icon} ${testName}</div>`;
    }).join('');
  }

  /**
   * Generate CSV summary
   */
  async generateCSVSummary() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `gdpr-compliance-summary-${timestamp}.csv`;
    const filepath = path.join(this.config.outputDir, filename);
    
    const results = this.results.validationResults;
    
    const csv = [
      'Category,Score,Status',
      `Data Protection Measures,${results.dataProtectionMeasures.score || 0},${results.dataProtectionMeasures.score >= 80 ? 'PASS' : 'FAIL'}`,
      `User Rights Implementation,${results.userRightsImplementation.score || 0},${results.userRightsImplementation.score >= 80 ? 'PASS' : 'FAIL'}`,
      `Consent Management,${results.consentManagement.score || 0},${results.consentManagement.score >= 80 ? 'PASS' : 'FAIL'}`,
      `Data Minimization,${results.dataMinimization.score || 0},${results.dataMinimization.score >= 80 ? 'PASS' : 'FAIL'}`,
      `Privacy Policy Compliance,${results.privacyPolicyCompliance.score || 0},${results.privacyPolicyCompliance.score >= 80 ? 'PASS' : 'FAIL'}`,
      `Overall,${results.overallScore},${this.results.overallStatus}`
    ].join('\n');
    
    await fs.writeFile(filepath, csv);
    console.log(`  ✅ CSV summary: ${filename}`);
  }

  /**
   * Generate compliance certificate
   */
  async generateComplianceCertificate() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `gdpr-compliance-certificate-${timestamp}.html`;
    const filepath = path.join(this.config.outputDir, filename);
    
    const certificate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GDPR Compliance Certificate</title>
    <style>
        body { font-family: 'Times New Roman', serif; margin: 0; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .certificate { max-width: 800px; margin: 0 auto; background: white; padding: 60px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); text-align: center; }
        .header { border-bottom: 3px solid #007cba; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 36px; font-weight: bold; color: #007cba; margin: 20px 0; }
        .subtitle { font-size: 18px; color: #666; }
        .content { margin: 40px 0; }
        .score { font-size: 72px; font-weight: bold; color: #28a745; margin: 20px 0; }
        .details { margin: 30px 0; font-size: 16px; line-height: 1.6; }
        .footer { border-top: 2px solid #007cba; padding-top: 20px; margin-top: 40px; font-size: 14px; color: #666; }
        .seal { width: 100px; height: 100px; border: 5px solid #007cba; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; color: #007cba; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="header">
            <h1>🔒 GDPR COMPLIANCE CERTIFICATE</h1>
            <div class="subtitle">General Data Protection Regulation</div>
        </div>
        
        <div class="content">
            <div class="title">CERTIFICATE OF COMPLIANCE</div>
            
            <p>This is to certify that</p>
            <h2 style="color: #007cba; margin: 20px 0;">Secure Gate Access Control System</h2>
            <p>has successfully achieved</p>
            
            <div class="score">${this.results.validationResults.overallScore}%</div>
            
            <div class="seal">✓</div>
            
            <div class="details">
                <p><strong>Compliance Status:</strong> ${this.results.validationResults.complianceStatus}</p>
                <p><strong>Validation Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Certificate ID:</strong> GDPR-${Date.now()}</p>
                <p><strong>Valid Until:</strong> ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
            </div>
            
            <p>This certificate confirms that the system meets all GDPR requirements for data protection, user rights implementation, consent management, data minimization, and privacy policy compliance.</p>
        </div>
        
        <div class="footer">
            <p>Generated by GDPR Compliance Validation System</p>
            <p>Certificate generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
    `.trim();
    
    await fs.writeFile(filepath, certificate);
    console.log(`  🏆 Compliance certificate: ${filename}`);
  }

  /**
   * Get status icon
   */
  getStatusIcon(status) {
    const icons = {
      'EXCELLENT': '🏆',
      'PASSED': '✅',
      'WARNING': '⚠️',
      'FAILED': '❌',
      'ERROR': '💥',
      'PENDING': '⏳'
    };
    return icons[status] || '❓';
  }

  /**
   * Get severity icon
   */
  getSeverityIcon(severity) {
    const icons = {
      'critical': '🚨',
      'high': '⚠️',
      'medium': '⚡',
      'low': 'ℹ️'
    };
    return icons[severity] || '❓';
  }

  /**
   * Get priority icon
   */
  getPriorityIcon(priority) {
    const icons = {
      'critical': '🚨',
      'high': '🔥',
      'medium': '⚡',
      'low': '💡'
    };
    return icons[priority] || '❓';
  }

  /**
   * Get status color for HTML
   */
  getStatusColor(status) {
    const colors = {
      'EXCELLENT': '#28a745',
      'PASSED': '#28a745',
      'WARNING': '#ffc107',
      'FAILED': '#dc3545',
      'ERROR': '#dc3545',
      'PENDING': '#6c757d'
    };
    return colors[status] || '#6c757d';
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--base-url':
        config.baseUrl = args[++i];
        break;
      case '--timeout':
        config.testTimeout = parseInt(args[++i]);
        break;
      case '--output-dir':
        config.outputDir = args[++i];
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--no-report':
        config.generateReport = false;
        break;
      case '--no-exit':
        config.exitOnFailure = false;
        break;
      case '--help':
        console.log(`
GDPR Compliance Validation Runner

Usage: node run-gdpr-compliance-validation.js [options]

Options:
  --base-url <url>     API base URL (default: https://localhost:3001)
  --timeout <ms>       Test timeout in milliseconds (default: 30000)
  --output-dir <dir>   Output directory for reports (default: ./compliance-reports)
  --verbose            Show detailed test results
  --no-report          Skip report generation
  --no-exit            Don't exit with error code on failure
  --help               Show this help message

Examples:
  node run-gdpr-compliance-validation.js
  node run-gdpr-compliance-validation.js --base-url https://api.example.com --verbose
  node run-gdpr-compliance-validation.js --output-dir ./reports --no-exit
        `);
        process.exit(0);
    }
  }
  
  // Run validation
  const runner = new GDPRComplianceTestRunner(config);
  
  runner.runCompleteValidation()
    .then(results => {
      console.log(`\n🎉 GDPR Compliance Validation completed with status: ${results.overallStatus}`);
    })
    .catch(error => {
      console.error('\n💥 GDPR Compliance Validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = GDPRComplianceTestRunner;