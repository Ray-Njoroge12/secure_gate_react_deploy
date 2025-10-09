// client/src/scripts/runAccessibilityAudit.js
// Script to run comprehensive accessibility audit and generate report

import { auditThemeAccessibility, generateAccessibilityReport } from '../utils/accessibilityAudit.js';
import logger from 'utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * Run comprehensive accessibility audit and generate report
 */
const runAudit = () => {
  logger.debug('🔍 Starting Accessibility Audit...\n');
  
  try {
    // Run the audit
    const auditResults = auditThemeAccessibility();
    
    // Generate formatted report
    const report = generateAccessibilityReport();
    
    // Create reports directory if it doesn't exist
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Write detailed JSON report
    const jsonReportPath = path.join(reportsDir, 'accessibility-audit.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify(auditResults, null, 2));
    
    // Write human-readable report
    const markdownReportPath = path.join(reportsDir, 'accessibility-audit.md');
    fs.writeFileSync(markdownReportPath, report);
    
    logger.debug('✅ Accessibility Audit Completed!\n');
    logger.debug('📊 Results Summary:');
    logger.debug(`   • Passed Tests: ${auditResults.overall.passed}`);
    logger.debug(`   • Failed Tests: ${auditResults.overall.failed}`);
    logger.debug(`   • Warnings: ${auditResults.overall.warnings}`);
    logger.debug(`   • Overall Status: ${auditResults.overall.failed === 0 ? '✅ WCAG 2.1 AA Compliant' : '❌ Issues Found'}\n`);
    
    logger.debug('📁 Reports Generated:');
    logger.debug(`   • JSON Report: ${jsonReportPath}`);
    logger.debug(`   • Markdown Report: ${markdownReportPath}\n`);
    
    // Display critical failures if any
    if (auditResults.overall.failed > 0) {
      logger.debug('⚠️  Critical Issues Found:');
      Object.entries(auditResults.colorCombinations).forEach(([name, result]) => {
        if (result.status === 'fail') {
          logger.debug(`   • ${name}: Contrast ratio ${result.ratio.toFixed(2)}:1 (Required: ${result.requiredRatio}:1)`);
        }
      });
      logger.debug();
    }
    
    return auditResults;
    
  } catch (error) {
    logger.error('❌ Accessibility Audit Failed:', error);
    process.exit(1);
  }
};

// Export for use in other scripts
export { runAudit };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAudit();
}