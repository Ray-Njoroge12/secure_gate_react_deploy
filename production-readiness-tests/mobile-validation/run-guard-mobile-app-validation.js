#!/usr/bin/env node

/**
 * Guard Mobile App Validation Runner
 * 
 * Executes comprehensive validation of Guard mobile app functionality including:
 * - QR scanning functionality and accuracy
 * - Offline capability and data sync
 * - Push notification integration
 * - Biometric authentication integration
 * - Mobile-specific security features
 * 
 * Requirements: 13.1
 */

import GuardMobileAppValidator from './guard-mobile-app-validator.js';
import fs from 'fs/promises';
import path from 'path';

class GuardMobileAppValidationRunner {
  constructor() {
    this.validator = new GuardMobileAppValidator();
    this.startTime = null;
    this.endTime = null;
  }

  async run() {
    console.log('🚀 Starting Guard Mobile App Validation');
    console.log('=====================================');
    
    this.startTime = Date.now();
    
    try {
      // Run the comprehensive validation
      const report = await this.validator.validateGuardMobileApp();
      
      this.endTime = Date.now();
      const duration = this.endTime - this.startTime;
      
      // Display results
      this.displayResults(report, duration);
      
      // Save detailed report
      await this.saveReport(report, duration);
      
      // Exit with appropriate code
      const exitCode = report.status === 'PASS' ? 0 : 1;
      process.exit(exitCode);
      
    } catch (error) {
      console.error('❌ Guard mobile app validation failed:', error);
      
      // Save error report
      await this.saveErrorReport(error);
      
      process.exit(1);
    }
  }

  displayResults(report, duration) {
    console.log('\n📊 Guard Mobile App Validation Results');
    console.log('======================================');
    
    // Overall status
    const statusIcon = report.status === 'PASS' ? '✅' : '❌';
    console.log(`${statusIcon} Overall Status: ${report.status}`);
    console.log(`📈 Overall Score: ${report.overallScore}%`);
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📱 Devices Tested: ${report.summary.devicesTestedCount}`);
    
    // Category scores
    console.log('\n📋 Category Scores:');
    console.log('==================');
    
    this.displayCategoryScores('QR Scanning Functionality', report.details.qrScanningFunctionality);
    this.displayCategoryScores('Offline Capability', report.details.offlineCapability);
    this.displayCategoryScores('Push Notification Integration', report.details.pushNotificationIntegration);
    this.displayCategoryScores('Biometric Authentication', report.details.biometricAuthentication);
    this.displayCategoryScores('Mobile Security Features', report.details.mobileSecurityFeatures);
    this.displayCategoryScores('Performance Metrics', report.details.performanceMetrics);
    
    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      console.log('==================');
      
      report.recommendations.forEach((rec, index) => {
        const priorityIcon = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
        console.log(`${priorityIcon} ${index + 1}. [${rec.category}] ${rec.message}`);
      });
    } else {
      console.log('\n✅ No recommendations - all tests passed!');
    }
    
    // Test summary
    console.log('\n📊 Test Summary:');
    console.log('===============');
    console.log(`QR Codes Tested: ${report.summary.qrCodesTestedCount}`);
    console.log(`Offline Scenarios: ${report.summary.offlineScenariosCount}`);
    console.log(`Notification Types: ${report.summary.notificationTypesCount}`);
  }

  displayCategoryScores(categoryName, categoryResults) {
    const scores = Object.values(categoryResults).map(result => result.score || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
    const scoreIcon = avgScore >= 80 ? '✅' : avgScore >= 60 ? '⚠️' : '❌';
    
    console.log(`${scoreIcon} ${categoryName}: ${avgScore}%`);
    
    // Show device-specific scores if there are multiple devices
    if (scores.length > 1) {
      Object.entries(categoryResults).forEach(([device, result]) => {
        if (result.score !== undefined) {
          const deviceIcon = result.score >= 80 ? '✅' : result.score >= 60 ? '⚠️' : '❌';
          console.log(`   ${deviceIcon} ${device}: ${result.score}%`);
        }
      });
    }
  }

  async saveReport(report, duration) {
    try {
      const reportData = {
        ...report,
        executionTime: duration,
        executionDate: new Date().toISOString(),
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        }
      };
      
      const reportPath = path.join(process.cwd(), 'guard-mobile-app-validation-report.json');
      await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
      
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
      
      // Also save a summary report
      const summaryPath = path.join(process.cwd(), 'guard-mobile-app-validation-summary.md');
      const summaryContent = this.generateMarkdownSummary(reportData);
      await fs.writeFile(summaryPath, summaryContent);
      
      console.log(`📄 Summary report saved to: ${summaryPath}`);
      
    } catch (error) {
      console.error('⚠️  Failed to save report:', error.message);
    }
  }

  async saveErrorReport(error) {
    try {
      const errorReport = {
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        },
        duration: this.endTime ? this.endTime - this.startTime : null
      };
      
      const errorPath = path.join(process.cwd(), 'guard-mobile-app-validation-error.json');
      await fs.writeFile(errorPath, JSON.stringify(errorReport, null, 2));
      
      console.log(`📄 Error report saved to: ${errorPath}`);
      
    } catch (saveError) {
      console.error('⚠️  Failed to save error report:', saveError.message);
    }
  }

  generateMarkdownSummary(reportData) {
    const statusBadge = reportData.status === 'PASS' ? '![PASS](https://img.shields.io/badge/Status-PASS-green)' : '![FAIL](https://img.shields.io/badge/Status-FAIL-red)';
    
    return `# Guard Mobile App Validation Report

${statusBadge}

**Overall Score:** ${reportData.overallScore}%  
**Execution Date:** ${reportData.executionDate}  
**Duration:** ${(reportData.executionTime / 1000).toFixed(2)}s  
**Devices Tested:** ${reportData.summary.devicesTestedCount}

## Category Scores

| Category | Average Score | Status |
|----------|---------------|--------|
| QR Scanning Functionality | ${this.getCategoryAverage(reportData.details.qrScanningFunctionality)}% | ${this.getStatusIcon(this.getCategoryAverage(reportData.details.qrScanningFunctionality))} |
| Offline Capability | ${this.getCategoryAverage(reportData.details.offlineCapability)}% | ${this.getStatusIcon(this.getCategoryAverage(reportData.details.offlineCapability))} |
| Push Notification Integration | ${this.getCategoryAverage(reportData.details.pushNotificationIntegration)}% | ${this.getStatusIcon(this.getCategoryAverage(reportData.details.pushNotificationIntegration))} |
| Biometric Authentication | ${this.getCategoryAverage(reportData.details.biometricAuthentication)}% | ${this.getStatusIcon(this.getCategoryAverage(reportData.details.biometricAuthentication))} |
| Mobile Security Features | ${this.getCategoryAverage(reportData.details.mobileSecurityFeatures)}% | ${this.getStatusIcon(this.getCategoryAverage(reportData.details.mobileSecurityFeatures))} |
| Performance Metrics | ${this.getCategoryAverage(reportData.details.performanceMetrics)}% | ${this.getStatusIcon(this.getCategoryAverage(reportData.details.performanceMetrics))} |

## Test Coverage

- **QR Codes Tested:** ${reportData.summary.qrCodesTestedCount}
- **Offline Scenarios:** ${reportData.summary.offlineScenariosCount}
- **Notification Types:** ${reportData.summary.notificationTypesCount}

## Recommendations

${reportData.recommendations.length > 0 
  ? reportData.recommendations.map((rec, index) => 
      `${index + 1}. **[${rec.category}]** ${rec.message} *(Priority: ${rec.priority})*`
    ).join('\n')
  : 'No recommendations - all tests passed! ✅'
}

## Environment

- **Node.js Version:** ${reportData.environment.nodeVersion}
- **Platform:** ${reportData.environment.platform}
- **Architecture:** ${reportData.environment.arch}

---

*Report generated by Guard Mobile App Validation System*
`;
  }

  getCategoryAverage(categoryResults) {
    const scores = Object.values(categoryResults).map(result => result.score || 0);
    return scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  }

  getStatusIcon(score) {
    return score >= 80 ? '✅ Pass' : score >= 60 ? '⚠️ Warning' : '❌ Fail';
  }
}

// Run the validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new GuardMobileAppValidationRunner();
  runner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default GuardMobileAppValidationRunner;