#!/usr/bin/env node

/**
 * KDPA Compliance Validation Runner
 * 
 * Runs comprehensive KDPA (Kenya Data Protection Act) compliance validation
 * and generates detailed reports
 */

const KDPAComplianceValidator = require('./kdpa-compliance-validator');
const fs = require('fs').promises;
const path = require('path');

class KDPAComplianceRunner {
  constructor() {
    this.validator = new KDPAComplianceValidator();
    this.reportDir = 'production-readiness-tests/reports/kdpa-compliance';
  }

  /**
   * Run complete KDPA compliance validation
   */
  async runValidation() {
    console.log('🚀 Starting KDPA Compliance Validation...\n');
    
    try {
      // Ensure report directory exists
      await this.ensureReportDirectory();
      
      // Run validation
      const startTime = Date.now();
      const results = await this.validator.runCompleteValidation();
      const endTime = Date.now();
      
      // Generate reports
      await this.generateReports(results, endTime - startTime);
      
      // Display summary
      this.displaySummary(results);
      
      return results;
      
    } catch (error) {
      console.error('❌ Error during KDPA compliance validation:', error);
      throw error;
    }
  }

  /**
   * Ensure report directory exists
   */
  async ensureReportDirectory() {
    try {
      await fs.mkdir(this.reportDir, { recursive: true });
    } catch (error) {
      console.error('Error creating report directory:', error);
    }
  }

  /**
   * Generate comprehensive reports
   */
  async generateReports(results, executionTime) {
    console.log('📊 Generating KDPA compliance reports...\n');
    
    try {
      // Generate detailed report
      await this.generateDetailedReport(results, executionTime);
      
      // Generate executive summary
      await this.generateExecutiveSummary(results);
      
      // Generate compliance checklist
      await this.generateComplianceChecklist(results);
      
      // Generate remediation plan
      await this.generateRemediationPlan(results);
      
      // Generate JSON report for automation
      await this.generateJSONReport(results, executionTime);
      
      console.log('✅ All reports generated successfully\n');
      
    } catch (error) {
      console.error('Error generating reports:', error);
    }
  }

  /**
   * Generate detailed compliance report
   */
  async generateDetailedReport(results, executionTime) {
    const timestamp = new Date().toISOString();
    
    const report = `# KDPA Compliance Validation Report

**Generated:** ${timestamp}
**Execution Time:** ${executionTime}ms
**Overall Compliance:** ${results.compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}
**Compliance Score:** ${results.score.toFixed(1)}%

## Executive Summary

This report provides a comprehensive assessment of the Secure Gate Access Control System's compliance with the Kenya Data Protection Act (KDPA). The validation covers four key areas: data protection requirements, local data handling practices, breach notification procedures, and cross-border data transfer controls.

### Overall Results
- **Compliance Status:** ${results.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
- **Overall Score:** ${results.score.toFixed(1)}%
- **Total Violations:** ${results.results.violations.length}
- **Recommendations:** ${results.results.recommendations.length}

## Detailed Assessment

### 1. Data Protection Requirements
**Score:** ${results.results.dataProtectionRequirements.score.toFixed(1)}%
**Status:** ${results.results.dataProtectionRequirements.score >= 80 ? '✅ Compliant' : '❌ Non-Compliant'}

#### Validation Results:
- **Lawful Basis Implemented:** ${results.results.dataProtectionRequirements.lawfulBasisImplemented ? '✅' : '❌'}
- **Data Minimization Compliant:** ${results.results.dataProtectionRequirements.dataMinimizationCompliant ? '✅' : '❌'}
- **Purpose Limitation Enforced:** ${results.results.dataProtectionRequirements.purposeLimitationEnforced ? '✅' : '❌'}
- **Accuracy Maintained:** ${results.results.dataProtectionRequirements.accuracyMaintained ? '✅' : '❌'}
- **Storage Limitation Applied:** ${results.results.dataProtectionRequirements.storageLimitationApplied ? '✅' : '❌'}
- **Integrity & Confidentiality Ensured:** ${results.results.dataProtectionRequirements.integrityConfidentialityEnsured ? '✅' : '❌'}

${results.results.dataProtectionRequirements.violations.length > 0 ? `
#### Violations:
${results.results.dataProtectionRequirements.violations.map(v => `- ${v}`).join('\n')}
` : ''}

### 2. Local Data Handling Practices
**Score:** ${results.results.localDataHandling.score.toFixed(1)}%
**Status:** ${results.results.localDataHandling.score >= 80 ? '✅ Compliant' : '❌ Non-Compliant'}

#### Validation Results:
- **Data Controller Registered:** ${results.results.localDataHandling.dataControllerRegistered ? '✅' : '❌'}
- **Privacy Notice Provided:** ${results.results.localDataHandling.privacyNoticeProvided ? '✅' : '❌'}
- **Consent Management Implemented:** ${results.results.localDataHandling.consentManagementImplemented ? '✅' : '❌'}
- **Data Subject Rights Supported:** ${results.results.localDataHandling.dataSubjectRightsSupported ? '✅' : '❌'}
- **Data Protection Officer Appointed:** ${results.results.localDataHandling.dataProtectionOfficerAppointed ? '✅' : '❌'}
- **Local Data Residency:** ${results.results.localDataHandling.localDataResidency ? '✅' : '❌'}

${results.results.localDataHandling.violations.length > 0 ? `
#### Violations:
${results.results.localDataHandling.violations.map(v => `- ${v}`).join('\n')}
` : ''}

### 3. Breach Notification Procedures
**Score:** ${results.results.breachNotification.score.toFixed(1)}%
**Status:** ${results.results.breachNotification.score >= 80 ? '✅ Compliant' : '❌ Non-Compliant'}

#### Validation Results:
- **Authority Notification Process:** ${results.results.breachNotification.authorityNotificationProcess ? '✅' : '❌'}
- **Data Subject Notification Process:** ${results.results.breachNotification.dataSubjectNotificationProcess ? '✅' : '❌'}
- **Breach Register Maintained:** ${results.results.breachNotification.breachRegisterMaintained ? '✅' : '❌'}
- **Risk Assessment Procedure:** ${results.results.breachNotification.riskAssessmentProcedure ? '✅' : '❌'}
- **Notification Timing Compliant:** ${results.results.breachNotification.notificationTimingCompliant ? '✅' : '❌'}
- **Incident Response Plan:** ${results.results.breachNotification.incidentResponsePlan ? '✅' : '❌'}

${results.results.breachNotification.violations.length > 0 ? `
#### Violations:
${results.results.breachNotification.violations.map(v => `- ${v}`).join('\n')}
` : ''}

### 4. Cross-Border Data Transfer Controls
**Score:** ${results.results.crossBorderTransfer.score.toFixed(1)}%
**Status:** ${results.results.crossBorderTransfer.score >= 80 ? '✅ Compliant' : '❌ Non-Compliant'}

#### Validation Results:
- **Transfer Safeguards Implemented:** ${results.results.crossBorderTransfer.transferSafeguardsImplemented ? '✅' : '❌'}
- **Adequacy Decision Checked:** ${results.results.crossBorderTransfer.adequacyDecisionChecked ? '✅' : '❌'}
- **Derogations Documented:** ${results.results.crossBorderTransfer.derogationsDocumented ? '✅' : '❌'}
- **Transfer Impact Assessment Conducted:** ${results.results.crossBorderTransfer.transferImpactAssessmentConducted ? '✅' : '❌'}
- **Data Localization Compliant:** ${results.results.crossBorderTransfer.dataLocalizationCompliant ? '✅' : '❌'}
- **Transfer Agreements In Place:** ${results.results.crossBorderTransfer.transferAgreementsInPlace ? '✅' : '❌'}

${results.results.crossBorderTransfer.violations.length > 0 ? `
#### Violations:
${results.results.crossBorderTransfer.violations.map(v => `- ${v}`).join('\n')}
` : ''}

## Recommendations

${results.results.recommendations.length > 0 ? 
  results.results.recommendations.map(rec => `
### ${rec.category} (Priority: ${rec.priority})
**Recommendation:** ${rec.recommendation}
**Action:** ${rec.action}
`).join('\n') : 'No specific recommendations at this time.'}

## Next Steps

1. **Address Critical Issues:** Focus on high-priority recommendations first
2. **Implement Missing Controls:** Add any missing data protection controls
3. **Update Documentation:** Ensure all policies and procedures are documented
4. **Regular Monitoring:** Schedule regular compliance assessments
5. **Staff Training:** Provide KDPA compliance training to relevant staff

## Validation Methodology

This assessment was conducted using automated validation tools that:
- Scan codebase for compliance indicators
- Check for required documentation
- Validate implementation of data protection controls
- Assess breach notification procedures
- Review cross-border transfer safeguards

## Disclaimer

This automated assessment provides guidance on KDPA compliance but should not replace professional legal advice. Organizations should consult with qualified legal professionals for comprehensive compliance assessment.

---
*Report generated by KDPA Compliance Validator v1.0*
`;

    await fs.writeFile(
      path.join(this.reportDir, 'kdpa-compliance-detailed-report.md'),
      report,
      'utf8'
    );
  }

  /**
   * Generate executive summary
   */
  async generateExecutiveSummary(results) {
    const summary = `# KDPA Compliance Executive Summary

## Key Findings

**Overall Compliance Status:** ${results.compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}
**Compliance Score:** ${results.score.toFixed(1)}%

## Component Scores

| Component | Score | Status |
|-----------|-------|--------|
| Data Protection Requirements | ${results.results.dataProtectionRequirements.score.toFixed(1)}% | ${results.results.dataProtectionRequirements.score >= 80 ? '✅ Compliant' : '❌ Non-Compliant'} |
| Local Data Handling | ${results.results.localDataHandling.score.toFixed(1)}% | ${results.results.localDataHandling.score >= 80 ? '✅ Compliant' : '❌ Non-Compliant'} |
| Breach Notification | ${results.results.breachNotification.score.toFixed(1)}% | ${results.results.breachNotification.score >= 80 ? '✅ Compliant' : '❌ Non-Compliant'} |
| Cross-Border Transfer | ${results.results.crossBorderTransfer.score.toFixed(1)}% | ${results.results.crossBorderTransfer.score >= 80 ? '✅ Compliant' : '❌ Non-Compliant'} |

## Critical Actions Required

${results.results.recommendations.filter(rec => rec.priority === 'Critical').length > 0 ? 
  results.results.recommendations
    .filter(rec => rec.priority === 'Critical')
    .map(rec => `- **${rec.category}:** ${rec.recommendation}`)
    .join('\n') : 
  'No critical actions required at this time.'}

## High Priority Actions

${results.results.recommendations.filter(rec => rec.priority === 'High').length > 0 ? 
  results.results.recommendations
    .filter(rec => rec.priority === 'High')
    .map(rec => `- **${rec.category}:** ${rec.recommendation}`)
    .join('\n') : 
  'No high priority actions required at this time.'}

## Summary

${results.compliant ? 
  'The system demonstrates good compliance with KDPA requirements. Continue monitoring and maintaining current controls.' :
  'The system requires attention to achieve full KDPA compliance. Focus on addressing the identified gaps and implementing recommended controls.'}

---
*Generated: ${new Date().toISOString()}*
`;

    await fs.writeFile(
      path.join(this.reportDir, 'kdpa-compliance-executive-summary.md'),
      summary,
      'utf8'
    );
  }

  /**
   * Generate compliance checklist
   */
  async generateComplianceChecklist(results) {
    const checklist = `# KDPA Compliance Checklist

## Data Protection Requirements

- [${results.results.dataProtectionRequirements.lawfulBasisImplemented ? 'x' : ' '}] Lawful basis for processing documented and implemented
- [${results.results.dataProtectionRequirements.dataMinimizationCompliant ? 'x' : ' '}] Data minimization principles applied
- [${results.results.dataProtectionRequirements.purposeLimitationEnforced ? 'x' : ' '}] Purpose limitation enforced
- [${results.results.dataProtectionRequirements.accuracyMaintained ? 'x' : ' '}] Data accuracy maintained
- [${results.results.dataProtectionRequirements.storageLimitationApplied ? 'x' : ' '}] Storage limitation applied
- [${results.results.dataProtectionRequirements.integrityConfidentialityEnsured ? 'x' : ' '}] Integrity and confidentiality ensured

## Local Data Handling Practices

- [${results.results.localDataHandling.dataControllerRegistered ? 'x' : ' '}] Data controller registered with Kenya Data Protection Authority
- [${results.results.localDataHandling.privacyNoticeProvided ? 'x' : ' '}] Privacy notice provided to data subjects
- [${results.results.localDataHandling.consentManagementImplemented ? 'x' : ' '}] Consent management system implemented
- [${results.results.localDataHandling.dataSubjectRightsSupported ? 'x' : ' '}] Data subject rights supported (access, rectification, erasure, etc.)
- [${results.results.localDataHandling.dataProtectionOfficerAppointed ? 'x' : ' '}] Data Protection Officer appointed (if required)
- [${results.results.localDataHandling.localDataResidency ? 'x' : ' '}] Local data residency requirements addressed

## Breach Notification Procedures

- [${results.results.breachNotification.authorityNotificationProcess ? 'x' : ' '}] Authority notification process established (72-hour rule)
- [${results.results.breachNotification.dataSubjectNotificationProcess ? 'x' : ' '}] Data subject notification process established
- [${results.results.breachNotification.breachRegisterMaintained ? 'x' : ' '}] Breach register maintained
- [${results.results.breachNotification.riskAssessmentProcedure ? 'x' : ' '}] Risk assessment procedure for breaches
- [${results.results.breachNotification.notificationTimingCompliant ? 'x' : ' '}] Notification timing compliant with KDPA
- [${results.results.breachNotification.incidentResponsePlan ? 'x' : ' '}] Incident response plan in place

## Cross-Border Data Transfer Controls

- [${results.results.crossBorderTransfer.transferSafeguardsImplemented ? 'x' : ' '}] Transfer safeguards implemented
- [${results.results.crossBorderTransfer.adequacyDecisionChecked ? 'x' : ' '}] Adequacy decisions checked for destination countries
- [${results.results.crossBorderTransfer.derogationsDocumented ? 'x' : ' '}] Derogations documented where applicable
- [${results.results.crossBorderTransfer.transferImpactAssessmentConducted ? 'x' : ' '}] Transfer impact assessment conducted
- [${results.results.crossBorderTransfer.dataLocalizationCompliant ? 'x' : ' '}] Data localization requirements compliant
- [${results.results.crossBorderTransfer.transferAgreementsInPlace ? 'x' : ' '}] Transfer agreements in place

## Overall Compliance Status

**Score:** ${results.score.toFixed(1)}%
**Status:** ${results.compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}

---
*Checklist generated: ${new Date().toISOString()}*
`;

    await fs.writeFile(
      path.join(this.reportDir, 'kdpa-compliance-checklist.md'),
      checklist,
      'utf8'
    );
  }

  /**
   * Generate remediation plan
   */
  async generateRemediationPlan(results) {
    const plan = `# KDPA Compliance Remediation Plan

## Overview

This remediation plan addresses the gaps identified in the KDPA compliance assessment and provides actionable steps to achieve full compliance.

## Priority Matrix

### Critical Priority Items
${results.results.recommendations.filter(rec => rec.priority === 'Critical').map((rec, index) => `
#### ${index + 1}. ${rec.category}
**Issue:** ${rec.recommendation}
**Action Required:** ${rec.action}
**Timeline:** Immediate (within 1 week)
**Owner:** Data Protection Team
**Resources:** Legal counsel, technical team
`).join('\n')}

### High Priority Items
${results.results.recommendations.filter(rec => rec.priority === 'High').map((rec, index) => `
#### ${index + 1}. ${rec.category}
**Issue:** ${rec.recommendation}
**Action Required:** ${rec.action}
**Timeline:** Short-term (within 1 month)
**Owner:** Compliance Team
**Resources:** Technical team, documentation team
`).join('\n')}

### Medium Priority Items
${results.results.recommendations.filter(rec => rec.priority === 'Medium').map((rec, index) => `
#### ${index + 1}. ${rec.category}
**Issue:** ${rec.recommendation}
**Action Required:** ${rec.action}
**Timeline:** Medium-term (within 3 months)
**Owner:** Operations Team
**Resources:** Technical team, training resources
`).join('\n')}

## Implementation Timeline

### Week 1-2: Critical Issues
- Address all critical priority items
- Implement emergency controls if needed
- Document immediate actions taken

### Month 1: High Priority Items
- Complete high priority implementations
- Update policies and procedures
- Conduct staff training on new controls

### Month 2-3: Medium Priority Items
- Implement remaining recommendations
- Conduct comprehensive testing
- Update documentation and training materials

### Month 3+: Ongoing Monitoring
- Establish regular compliance monitoring
- Schedule periodic assessments
- Maintain compliance documentation

## Success Metrics

- **Compliance Score:** Target 95%+ overall compliance
- **Critical Issues:** Zero critical issues remaining
- **Documentation:** 100% of required documentation in place
- **Training:** 100% of relevant staff trained on KDPA requirements

## Risk Mitigation

### High Risk Areas
1. **Breach Notification:** Ensure 72-hour notification capability
2. **Data Subject Rights:** Implement comprehensive rights management
3. **Cross-Border Transfers:** Validate all transfer mechanisms

### Mitigation Strategies
- Implement automated monitoring and alerting
- Establish clear escalation procedures
- Maintain up-to-date legal guidance
- Regular compliance audits and assessments

## Budget Considerations

### Estimated Costs
- **Legal Consultation:** $5,000 - $10,000
- **Technical Implementation:** $15,000 - $25,000
- **Training and Documentation:** $3,000 - $5,000
- **Ongoing Monitoring Tools:** $2,000 - $4,000 annually

### Cost-Benefit Analysis
- **Compliance Benefits:** Avoid regulatory penalties, maintain customer trust
- **Risk Reduction:** Minimize data breach impact and legal exposure
- **Operational Efficiency:** Streamlined data handling processes

## Next Steps

1. **Immediate Actions:**
   - Review and approve this remediation plan
   - Assign ownership for each priority item
   - Establish project timeline and milestones

2. **Short-term Actions:**
   - Begin implementation of critical and high priority items
   - Engage legal counsel for complex compliance questions
   - Start staff training program

3. **Long-term Actions:**
   - Establish ongoing compliance monitoring
   - Schedule regular compliance assessments
   - Maintain continuous improvement process

---
*Remediation plan generated: ${new Date().toISOString()}*
`;

    await fs.writeFile(
      path.join(this.reportDir, 'kdpa-compliance-remediation-plan.md'),
      plan,
      'utf8'
    );
  }

  /**
   * Generate JSON report for automation
   */
  async generateJSONReport(results, executionTime) {
    const jsonReport = {
      metadata: {
        generatedAt: new Date().toISOString(),
        executionTimeMs: executionTime,
        validatorVersion: '1.0.0',
        reportType: 'KDPA_COMPLIANCE'
      },
      summary: {
        overallCompliant: results.compliant,
        overallScore: results.score,
        totalViolations: results.results.violations.length,
        totalRecommendations: results.results.recommendations.length
      },
      componentScores: {
        dataProtectionRequirements: results.results.dataProtectionRequirements.score,
        localDataHandling: results.results.localDataHandling.score,
        breachNotification: results.results.breachNotification.score,
        crossBorderTransfer: results.results.crossBorderTransfer.score
      },
      detailedResults: results.results,
      complianceSummary: results.summary,
      recommendations: results.results.recommendations,
      violations: results.results.violations
    };

    await fs.writeFile(
      path.join(this.reportDir, 'kdpa-compliance-report.json'),
      JSON.stringify(jsonReport, null, 2),
      'utf8'
    );
  }

  /**
   * Display validation summary
   */
  displaySummary(results) {
    console.log('📋 KDPA Compliance Validation Summary');
    console.log('=====================================\n');
    
    console.log(`Overall Compliance: ${results.compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
    console.log(`Overall Score: ${results.score.toFixed(1)}%\n`);
    
    console.log('Component Scores:');
    console.log(`  Data Protection Requirements: ${results.results.dataProtectionRequirements.score.toFixed(1)}%`);
    console.log(`  Local Data Handling: ${results.results.localDataHandling.score.toFixed(1)}%`);
    console.log(`  Breach Notification: ${results.results.breachNotification.score.toFixed(1)}%`);
    console.log(`  Cross-Border Transfer: ${results.results.crossBorderTransfer.score.toFixed(1)}%\n`);
    
    console.log(`Total Violations: ${results.results.violations.length}`);
    console.log(`Recommendations: ${results.results.recommendations.length}\n`);
    
    if (results.results.recommendations.length > 0) {
      console.log('Priority Recommendations:');
      const criticalRecs = results.results.recommendations.filter(rec => rec.priority === 'Critical');
      const highRecs = results.results.recommendations.filter(rec => rec.priority === 'High');
      
      if (criticalRecs.length > 0) {
        console.log(`  Critical: ${criticalRecs.length}`);
      }
      if (highRecs.length > 0) {
        console.log(`  High: ${highRecs.length}`);
      }
      console.log();
    }
    
    console.log('📁 Reports generated in:', this.reportDir);
    console.log('  - kdpa-compliance-detailed-report.md');
    console.log('  - kdpa-compliance-executive-summary.md');
    console.log('  - kdpa-compliance-checklist.md');
    console.log('  - kdpa-compliance-remediation-plan.md');
    console.log('  - kdpa-compliance-report.json\n');
    
    if (!results.compliant) {
      console.log('⚠️  Action Required: Review the remediation plan and address identified gaps.');
    } else {
      console.log('✅ System is KDPA compliant. Continue monitoring and maintaining controls.');
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const runner = new KDPAComplianceRunner();
  
  runner.runValidation()
    .then(results => {
      process.exit(results.compliant ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

module.exports = KDPAComplianceRunner;