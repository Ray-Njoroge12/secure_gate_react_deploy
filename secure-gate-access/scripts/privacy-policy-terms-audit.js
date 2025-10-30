#!/usr/bin/env node

/**
 * Privacy Policy & Terms Audit Script
 * Comprehensive audit of privacy policy, terms of service, and related documents for Kenya DPA 2019 compliance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PrivacyPolicyTermsAuditor {
    constructor() {
        this.results = {
            privacyPolicy: {},
            termsOfService: {},
            dataRetentionPolicy: {},
            dataBreachResponsePlan: {},
            requiredSections: [],
            missingDocuments: [],
            complianceScore: 0,
            recommendations: []
        };
        
        this.requiredDocuments = [
            'privacy_policy',
            'terms_of_service', 
            'data_retention_policy',
            'data_breach_response_plan'
        ];
        
        this.privacyPolicySections = [
            'data_controller_information',
            'types_of_data_collected',
            'purpose_of_processing',
            'legal_basis',
            'data_retention',
            'user_rights',
            'data_security_measures',
            'third_party_sharing',
            'contact_information'
        ];
        
        this.termsOfServiceSections = [
            'acceptance_of_terms',
            'service_description',
            'user_responsibilities',
            'prohibited_uses',
            'privacy_data_protection',
            'intellectual_property',
            'limitation_liability',
            'termination',
            'governing_law'
        ];
    }

    async run() {
        console.log('📋 PRIVACY POLICY & TERMS AUDIT');
        console.log('================================\n');

        try {
            await this.auditPrivacyPolicy();
            await this.auditTermsOfService();
            await this.auditDataRetentionPolicy();
            await this.auditDataBreachResponsePlan();
            await this.analyzeCompliance();
            await this.calculateScore();
            await this.generateAuditReport();
            
            return this.results;
        } catch (error) {
            console.error('❌ Privacy Policy & Terms audit failed:', error.message);
            this.results.recommendations.push({
                type: 'error',
                message: `Privacy Policy & Terms audit failed: ${error.message}`,
                severity: 'critical'
            });
            return this.results;
        }
    }

    async auditPrivacyPolicy() {
        console.log('🔒 PRIVACY POLICY ANALYSIS');
        console.log('==========================\n');

        const privacyPolicyPath = path.join(__dirname, '..', 'client', 'src', 'pages', 'PrivacyPolicy.jsx');
        
        if (fs.existsSync(privacyPolicyPath)) {
            console.log('✅ Privacy Policy file found');
            const content = fs.readFileSync(privacyPolicyPath, 'utf8');
            
            this.results.privacyPolicy = {
                exists: true,
                path: privacyPolicyPath,
                sections: [],
                compliance: {}
            };
            
            // Check for required sections
            for (const section of this.privacyPolicySections) {
                const isPresent = this.checkSection(content, section);
                this.results.privacyPolicy.sections.push({
                    name: section,
                    present: isPresent,
                    description: this.getSectionDescription(section)
                });
                
                if (isPresent) {
                    console.log(`  ✅ ${this.formatSectionName(section)}: Found`);
                } else {
                    console.log(`  ❌ ${this.formatSectionName(section)}: Missing`);
                }
            }
            
            // Check for Kenya DPA 2019 specific requirements
            const kenyaCompliance = this.checkKenyaCompliance(content);
            this.results.privacyPolicy.compliance = kenyaCompliance;
            
            console.log(`\n📊 Privacy Policy Compliance:`);
            console.log(`  Sections Found: ${this.results.privacyPolicy.sections.filter(s => s.present).length}/${this.privacyPolicySections.length}`);
            console.log(`  Kenya DPA Compliance: ${kenyaCompliance.score}/${kenyaCompliance.maxScore}`);
            
        } else {
            console.log('❌ Privacy Policy file not found');
            this.results.privacyPolicy = { exists: false };
            this.results.missingDocuments.push('privacy_policy');
        }
    }

    async auditTermsOfService() {
        console.log('\n📜 TERMS OF SERVICE ANALYSIS');
        console.log('============================\n');

        const termsPath = path.join(__dirname, '..', 'client', 'src', 'pages', 'TermsOfService.jsx');
        
        if (fs.existsSync(termsPath)) {
            console.log('✅ Terms of Service file found');
            const content = fs.readFileSync(termsPath, 'utf8');
            
            this.results.termsOfService = {
                exists: true,
                path: termsPath,
                sections: [],
                compliance: {}
            };
            
            // Check for required sections
            for (const section of this.termsOfServiceSections) {
                const isPresent = this.checkSection(content, section);
                this.results.termsOfService.sections.push({
                    name: section,
                    present: isPresent,
                    description: this.getSectionDescription(section)
                });
                
                if (isPresent) {
                    console.log(`  ✅ ${this.formatSectionName(section)}: Found`);
                } else {
                    console.log(`  ❌ ${this.formatSectionName(section)}: Missing`);
                }
            }
            
            // Check for legal compliance
            const legalCompliance = this.checkLegalCompliance(content);
            this.results.termsOfService.compliance = legalCompliance;
            
            console.log(`\n📊 Terms of Service Compliance:`);
            console.log(`  Sections Found: ${this.results.termsOfService.sections.filter(s => s.present).length}/${this.termsOfServiceSections.length}`);
            console.log(`  Legal Compliance: ${legalCompliance.score}/${legalCompliance.maxScore}`);
            
        } else {
            console.log('❌ Terms of Service file not found');
            this.results.termsOfService = { exists: false };
            this.results.missingDocuments.push('terms_of_service');
        }
    }

    async auditDataRetentionPolicy() {
        console.log('\n🗄️  DATA RETENTION POLICY ANALYSIS');
        console.log('===================================\n');

        const retentionPath = path.join(__dirname, '..', 'docs', 'DataRetentionPolicy.md');
        
        if (fs.existsSync(retentionPath)) {
            console.log('✅ Data Retention Policy file found');
            const content = fs.readFileSync(retentionPath, 'utf8');
            
            this.results.dataRetentionPolicy = {
                exists: true,
                path: retentionPath,
                compliance: {}
            };
            
            // Check for required elements
            const retentionCompliance = this.checkRetentionCompliance(content);
            this.results.dataRetentionPolicy.compliance = retentionCompliance;
            
            console.log(`\n📊 Data Retention Policy Compliance:`);
            console.log(`  Policy Structure: ${retentionCompliance.structure ? '✅ Complete' : '❌ Incomplete'}`);
            console.log(`  Retention Periods: ${retentionCompliance.periods ? '✅ Defined' : '❌ Missing'}`);
            console.log(`  Legal Compliance: ${retentionCompliance.legal ? '✅ Kenya DPA 2019' : '❌ Non-compliant'}`);
            console.log(`  Disposal Procedures: ${retentionCompliance.disposal ? '✅ Defined' : '❌ Missing'}`);
            
        } else {
            console.log('❌ Data Retention Policy file not found');
            this.results.dataRetentionPolicy = { exists: false };
            this.results.missingDocuments.push('data_retention_policy');
        }
    }

    async auditDataBreachResponsePlan() {
        console.log('\n🚨 DATA BREACH RESPONSE PLAN ANALYSIS');
        console.log('=====================================\n');

        const breachPath = path.join(__dirname, '..', 'docs', 'DataBreachResponsePlan.md');
        
        if (fs.existsSync(breachPath)) {
            console.log('✅ Data Breach Response Plan file found');
            const content = fs.readFileSync(breachPath, 'utf8');
            
            this.results.dataBreachResponsePlan = {
                exists: true,
                path: breachPath,
                compliance: {}
            };
            
            // Check for required elements
            const breachCompliance = this.checkBreachCompliance(content);
            this.results.dataBreachResponsePlan.compliance = breachCompliance;
            
            console.log(`\n📊 Data Breach Response Plan Compliance:`);
            console.log(`  Response Team: ${breachCompliance.team ? '✅ Defined' : '❌ Missing'}`);
            console.log(`  Notification Procedures: ${breachCompliance.notification ? '✅ Complete' : '❌ Incomplete'}`);
            console.log(`  Legal Compliance: ${breachCompliance.legal ? '✅ Kenya DPA 2019' : '❌ Non-compliant'}`);
            console.log(`  Timeframes: ${breachCompliance.timeframes ? '✅ 72-hour rule' : '❌ Missing'}`);
            
        } else {
            console.log('❌ Data Breach Response Plan file not found');
            this.results.dataBreachResponsePlan = { exists: false };
            this.results.missingDocuments.push('data_breach_response_plan');
        }
    }

    async analyzeCompliance() {
        console.log('\n📋 COMPLIANCE ANALYSIS');
        console.log('======================\n');

        const totalDocuments = this.requiredDocuments.length;
        const existingDocuments = totalDocuments - this.results.missingDocuments.length;
        
        console.log(`📊 Document Coverage:`);
        console.log(`  Required Documents: ${totalDocuments}`);
        console.log(`  Existing Documents: ${existingDocuments}`);
        console.log(`  Missing Documents: ${this.results.missingDocuments.length}`);
        console.log(`  Coverage: ${Math.round((existingDocuments / totalDocuments) * 100)}%`);
        
        // Analyze section coverage
        if (this.results.privacyPolicy.exists) {
            const privacySections = this.results.privacyPolicy.sections.filter(s => s.present).length;
            console.log(`\n🔒 Privacy Policy Sections: ${privacySections}/${this.privacyPolicySections.length}`);
        }
        
        if (this.results.termsOfService.exists) {
            const termsSections = this.results.termsOfService.sections.filter(s => s.present).length;
            console.log(`📜 Terms of Service Sections: ${termsSections}/${this.termsOfServiceSections.length}`);
        }
        
        // Check for Kenya DPA 2019 compliance
        console.log(`\n🇰🇪 Kenya DPA 2019 Compliance:`);
        
        if (this.results.privacyPolicy.exists && this.results.privacyPolicy.compliance.kenyaDPA) {
            console.log(`  Privacy Policy: ✅ Kenya DPA 2019 compliant`);
        } else {
            console.log(`  Privacy Policy: ❌ Not Kenya DPA 2019 compliant`);
        }
        
        if (this.results.dataRetentionPolicy.exists && this.results.dataRetentionPolicy.compliance.legal) {
            console.log(`  Data Retention: ✅ Kenya DPA 2019 compliant`);
        } else {
            console.log(`  Data Retention: ❌ Not Kenya DPA 2019 compliant`);
        }
        
        if (this.results.dataBreachResponsePlan.exists && this.results.dataBreachResponsePlan.compliance.legal) {
            console.log(`  Breach Response: ✅ Kenya DPA 2019 compliant`);
        } else {
            console.log(`  Breach Response: ❌ Not Kenya DPA 2019 compliant`);
        }
    }

    async calculateScore() {
        let score = 0;
        const maxScore = 100;
        
        // Document existence (40 points)
        const totalDocuments = this.requiredDocuments.length;
        const existingDocuments = totalDocuments - this.results.missingDocuments.length;
        score += Math.round((existingDocuments / totalDocuments) * 40);
        
        // Privacy Policy sections (25 points)
        if (this.results.privacyPolicy.exists) {
            const privacySections = this.results.privacyPolicy.sections.filter(s => s.present).length;
            score += Math.round((privacySections / this.privacyPolicySections.length) * 25);
        }
        
        // Terms of Service sections (20 points)
        if (this.results.termsOfService.exists) {
            const termsSections = this.results.termsOfService.sections.filter(s => s.present).length;
            score += Math.round((termsSections / this.termsOfServiceSections.length) * 20);
        }
        
        // Kenya DPA 2019 compliance (15 points)
        let kenyaCompliance = 0;
        if (this.results.privacyPolicy.compliance?.kenyaDPA) kenyaCompliance += 5;
        if (this.results.dataRetentionPolicy.compliance?.legal) kenyaCompliance += 5;
        if (this.results.dataBreachResponsePlan.compliance?.legal) kenyaCompliance += 5;
        score += kenyaCompliance;
        
        this.results.complianceScore = score;
        this.results.maxScore = maxScore;
        this.results.overallPercentage = Math.round((score / maxScore) * 100);
    }

    async generateAuditReport() {
        console.log('\n📊 PRIVACY POLICY & TERMS AUDIT SUMMARY');
        console.log('=========================================\n');

        console.log(`🎯 Overall Compliance Score: ${this.results.complianceScore}/${this.results.maxScore} (${this.results.overallPercentage}%)`);
        console.log();

        const totalDocuments = this.requiredDocuments.length;
        const existingDocuments = totalDocuments - this.results.missingDocuments.length;

        console.log('📋 Document Status:');
        console.log(`  ✅ Privacy Policy: ${this.results.privacyPolicy.exists ? 'Present' : 'Missing'}`);
        console.log(`  ✅ Terms of Service: ${this.results.termsOfService.exists ? 'Present' : 'Missing'}`);
        console.log(`  ✅ Data Retention Policy: ${this.results.dataRetentionPolicy.exists ? 'Present' : 'Missing'}`);
        console.log(`  ✅ Data Breach Response Plan: ${this.results.dataBreachResponsePlan.exists ? 'Present' : 'Missing'}`);
        console.log();

        if (this.results.missingDocuments.length > 0) {
            console.log('❌ Missing Documents:');
            this.results.missingDocuments.forEach(doc => {
                console.log(`  - ${this.formatDocumentName(doc)}`);
            });
            console.log();
        }

        // Section coverage analysis
        if (this.results.privacyPolicy.exists) {
            const privacySections = this.results.privacyPolicy.sections.filter(s => s.present).length;
            console.log(`🔒 Privacy Policy Sections: ${privacySections}/${this.privacyPolicySections.length}`);
        }
        
        if (this.results.termsOfService.exists) {
            const termsSections = this.results.termsOfService.sections.filter(s => s.present).length;
            console.log(`📜 Terms of Service Sections: ${termsSections}/${this.termsOfServiceSections.length}`);
        }
        console.log();

        if (this.results.overallPercentage >= 80) {
            console.log('🎉 PRIVACY POLICY & TERMS AUDIT PASSED');
            console.log('   System has comprehensive privacy and terms documentation!');
        } else {
            console.log('⚠️  PRIVACY POLICY & TERMS ISSUES FOUND');
            console.log('   Review the issues below before deployment:');
            console.log();

            // Show missing sections
            if (this.results.privacyPolicy.exists) {
                const missingPrivacy = this.results.privacyPolicy.sections.filter(s => !s.present);
                if (missingPrivacy.length > 0) {
                    console.log('🔒 Missing Privacy Policy Sections:');
                    missingPrivacy.forEach(section => {
                        console.log(`  - ${this.formatSectionName(section.name)}: ${section.description}`);
                    });
                    console.log();
                }
            }
            
            if (this.results.termsOfService.exists) {
                const missingTerms = this.results.termsOfService.sections.filter(s => !s.present);
                if (missingTerms.length > 0) {
                    console.log('📜 Missing Terms of Service Sections:');
                    missingTerms.forEach(section => {
                        console.log(`  - ${this.formatSectionName(section.name)}: ${section.description}`);
                    });
                    console.log();
                }
            }
        }

        // Generate recommendations
        this.generateRecommendations();
        
        if (this.results.recommendations.length > 0) {
            console.log('💡 RECOMMENDATIONS:');
            this.results.recommendations.forEach(rec => {
                console.log(`  - ${rec}`);
            });
            console.log();
        }

        // Save detailed report
        await this.saveDetailedReport();
    }

    checkSection(content, section) {
        const patterns = {
            'data_controller_information': ['data controller', 'company name', 'contact', 'dpo'],
            'types_of_data_collected': ['data collected', 'personal information', 'types of data'],
            'purpose_of_processing': ['purpose', 'processing', 'why we collect'],
            'legal_basis': ['legal basis', 'lawful basis', 'consent', 'contract'],
            'data_retention': ['retention', 'how long', 'storage', 'keep data'],
            'user_rights': ['rights', 'access', 'rectification', 'erasure', 'portability'],
            'data_security_measures': ['security', 'encryption', 'protection', 'safeguards'],
            'third_party_sharing': ['third party', 'sharing', 'disclosure', 'vendors'],
            'contact_information': ['contact', 'email', 'phone', 'address'],
            
            'acceptance_of_terms': ['acceptance', 'agree', 'terms', 'binding'],
            'service_description': ['service', 'features', 'functionality', 'description'],
            'user_responsibilities': ['responsibilities', 'obligations', 'duties', 'requirements'],
            'prohibited_uses': ['prohibited', 'not allowed', 'forbidden', 'restrictions'],
            'privacy_data_protection': ['privacy', 'data protection', 'personal data'],
            'intellectual_property': ['intellectual property', 'copyright', 'trademark', 'ownership'],
            'limitation_liability': ['liability', 'limitation', 'disclaimer', 'responsibility'],
            'termination': ['termination', 'suspension', 'account closure', 'end service'],
            'governing_law': ['governing law', 'jurisdiction', 'kenya law', 'legal framework']
        };
        
        const sectionPatterns = patterns[section] || [];
        return sectionPatterns.some(pattern => 
            content.toLowerCase().includes(pattern.toLowerCase())
        );
    }

    checkKenyaCompliance(content) {
        const kenyaElements = [
            'kenya data protection act',
            'dpa 2019',
            'data protection officer',
            'data commissioner',
            'right to access',
            'right to rectification', 
            'right to erasure',
            'right to portability',
            'right to object',
            'consent',
            'legal basis',
            'retention period',
            'data breach notification'
        ];
        
        const foundElements = kenyaElements.filter(element => 
            content.toLowerCase().includes(element.toLowerCase())
        );
        
        return {
            score: foundElements.length,
            maxScore: kenyaElements.length,
            elements: foundElements,
            kenyaDPA: foundElements.length >= kenyaElements.length * 0.8
        };
    }

    checkLegalCompliance(content) {
        const legalElements = [
            'governing law',
            'jurisdiction',
            'kenya',
            'legal framework',
            'dispute resolution',
            'liability',
            'termination',
            'intellectual property',
            'privacy',
            'data protection'
        ];
        
        const foundElements = legalElements.filter(element => 
            content.toLowerCase().includes(element.toLowerCase())
        );
        
        return {
            score: foundElements.length,
            maxScore: legalElements.length,
            elements: foundElements,
            compliant: foundElements.length >= legalElements.length * 0.8
        };
    }

    checkRetentionCompliance(content) {
        return {
            structure: content.includes('#') && content.includes('##'),
            periods: content.toLowerCase().includes('retention period'),
            legal: content.toLowerCase().includes('kenya data protection act'),
            disposal: content.toLowerCase().includes('disposal'),
            compliant: true
        };
    }

    checkBreachCompliance(content) {
        return {
            team: content.toLowerCase().includes('response team'),
            notification: content.toLowerCase().includes('notification'),
            legal: content.toLowerCase().includes('kenya data protection act'),
            timeframes: content.toLowerCase().includes('72 hour'),
            compliant: true
        };
    }

    formatSectionName(section) {
        return section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    formatDocumentName(doc) {
        return doc.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    getSectionDescription(section) {
        const descriptions = {
            'data_controller_information': 'Company name and contact details',
            'types_of_data_collected': 'Personal data categories collected',
            'purpose_of_processing': 'Why personal data is processed',
            'legal_basis': 'Legal grounds for processing',
            'data_retention': 'How long data is kept',
            'user_rights': 'Data subject rights information',
            'data_security_measures': 'Data protection measures',
            'third_party_sharing': 'Data sharing with third parties',
            'contact_information': 'How to contact for privacy matters',
            
            'acceptance_of_terms': 'Terms acceptance requirements',
            'service_description': 'Service features and functionality',
            'user_responsibilities': 'User obligations and duties',
            'prohibited_uses': 'Restricted activities',
            'privacy_data_protection': 'Privacy and data protection clauses',
            'intellectual_property': 'IP rights and ownership',
            'limitation_liability': 'Liability limitations and disclaimers',
            'termination': 'Account termination procedures',
            'governing_law': 'Applicable law and jurisdiction'
        };
        return descriptions[section] || 'Section description';
    }

    generateRecommendations() {
        if (this.results.missingDocuments.length > 0) {
            this.results.recommendations.push('Create all missing policy documents');
        }
        
        if (this.results.privacyPolicy.exists) {
            const missingPrivacy = this.results.privacyPolicy.sections.filter(s => !s.present);
            if (missingPrivacy.length > 0) {
                this.results.recommendations.push('Add missing sections to Privacy Policy');
            }
        }
        
        if (this.results.termsOfService.exists) {
            const missingTerms = this.results.termsOfService.sections.filter(s => !s.present);
            if (missingTerms.length > 0) {
                this.results.recommendations.push('Add missing sections to Terms of Service');
            }
        }
        
        this.results.recommendations.push('Link Privacy Policy and Terms from registration page');
        this.results.recommendations.push('Ensure all documents are accessible to users');
        this.results.recommendations.push('Regularly review and update policy documents');
        this.results.recommendations.push('Train staff on privacy policy requirements');
        this.results.recommendations.push('Test data breach response plan procedures');
    }

    async saveDetailedReport() {
        const reportPath = path.join(__dirname, '..', 'logs', 'privacy-policy-terms-audit-report.md');
        
        const report = `# Privacy Policy & Terms Audit Report

**Date:** ${new Date().toISOString()}
**Overall Score:** ${this.results.complianceScore}/${this.results.maxScore} (${this.results.overallPercentage}%)
**Compliance Framework:** Kenya Data Protection Act 2019

## Executive Summary

This comprehensive audit evaluated the implementation of privacy policy, terms of service, data retention policy, and data breach response plan for Kenya DPA 2019 compliance.

## Document Status

### Privacy Policy
- **Status:** ${this.results.privacyPolicy.exists ? '✅ Present' : '❌ Missing'}
- **Path:** ${this.results.privacyPolicy.path || 'N/A'}
- **Sections Found:** ${this.results.privacyPolicy.exists ? this.results.privacyPolicy.sections.filter(s => s.present).length : 0}/${this.privacyPolicySections.length}
- **Kenya DPA Compliance:** ${this.results.privacyPolicy.compliance?.kenyaDPA ? '✅ Compliant' : '❌ Non-compliant'}

### Terms of Service
- **Status:** ${this.results.termsOfService.exists ? '✅ Present' : '❌ Missing'}
- **Path:** ${this.results.termsOfService.path || 'N/A'}
- **Sections Found:** ${this.results.termsOfService.exists ? this.results.termsOfService.sections.filter(s => s.present).length : 0}/${this.termsOfServiceSections.length}
- **Legal Compliance:** ${this.results.termsOfService.compliance?.compliant ? '✅ Compliant' : '❌ Non-compliant'}

### Data Retention Policy
- **Status:** ${this.results.dataRetentionPolicy.exists ? '✅ Present' : '❌ Missing'}
- **Path:** ${this.results.dataRetentionPolicy.path || 'N/A'}
- **Kenya DPA Compliance:** ${this.results.dataRetentionPolicy.compliance?.legal ? '✅ Compliant' : '❌ Non-compliant'}

### Data Breach Response Plan
- **Status:** ${this.results.dataBreachResponsePlan.exists ? '✅ Present' : '❌ Missing'}
- **Path:** ${this.results.dataBreachResponsePlan.path || 'N/A'}
- **Kenya DPA Compliance:** ${this.results.dataBreachResponsePlan.compliance?.legal ? '✅ Compliant' : '❌ Non-compliant'}

## Missing Documents

${this.results.missingDocuments.length > 0 ? 
  this.results.missingDocuments.map(doc => `- ${this.formatDocumentName(doc)}`).join('\n') : 
  'None - All required documents are present'}

## Section Coverage Analysis

### Privacy Policy Sections
${this.results.privacyPolicy.exists ? 
  this.results.privacyPolicy.sections.map(section => 
    `- **${this.formatSectionName(section.name)}**: ${section.present ? '✅ Present' : '❌ Missing'} - ${section.description}`
  ).join('\n') : 
  'Privacy Policy not found'}

### Terms of Service Sections
${this.results.termsOfService.exists ? 
  this.results.termsOfService.sections.map(section => 
    `- **${this.formatSectionName(section.name)}**: ${section.present ? '✅ Present' : '❌ Missing'} - ${section.description}`
  ).join('\n') : 
  'Terms of Service not found'}

## Kenya DPA 2019 Compliance

### Privacy Policy Compliance Elements
${this.results.privacyPolicy.compliance?.elements ? 
  this.results.privacyPolicy.compliance.elements.map(element => `- ✅ ${element}`).join('\n') : 
  'No compliance elements found'}

### Legal Framework Compliance
- **Data Retention Policy:** ${this.results.dataRetentionPolicy.compliance?.legal ? '✅ Kenya DPA 2019' : '❌ Non-compliant'}
- **Data Breach Response Plan:** ${this.results.dataBreachResponsePlan.compliance?.legal ? '✅ Kenya DPA 2019' : '❌ Non-compliant'}

## Recommendations

${this.results.recommendations.map(rec => `- ${rec}`).join('\n')}

## Implementation Examples

### Privacy Policy Link in Registration
\`\`\`jsx
<FormGroup>
  <FormControlLabel
    control={<Checkbox />}
    label={
      <span>
        I agree to the{' '}
        <Link to="/privacy-policy" target="_blank">
          Privacy Policy
        </Link>
        {' '}and{' '}
        <Link to="/terms-of-service" target="_blank">
          Terms of Service
        </Link>
      </span>
    }
  />
</FormGroup>
\`\`\`

### Data Retention Policy Implementation
\`\`\`javascript
// Example data retention implementation
const RETENTION_PERIODS = {
  user_data: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
  visitor_data: 5 * 365 * 24 * 60 * 60 * 1000, // 5 years
  access_logs: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
  consent_records: 3 * 365 * 24 * 60 * 60 * 1000 // 3 years
};
\`\`\`

## Next Steps

1. **Complete Missing Documents**: Create any missing policy documents
2. **Add Missing Sections**: Complete privacy policy and terms sections
3. **Link from Registration**: Add privacy policy and terms links to user registration
4. **Staff Training**: Train staff on privacy policy requirements
5. **Regular Reviews**: Implement regular policy review schedule
6. **Compliance Monitoring**: Monitor compliance with Kenya DPA 2019

---
*Report generated by Privacy Policy & Terms Audit System*
`;

        // Ensure logs directory exists
        const logsDir = path.dirname(reportPath);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        fs.writeFileSync(reportPath, report);
        console.log(`📄 Detailed audit report saved to: ${reportPath}`);
    }
}

// Run the auditor if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const auditor = new PrivacyPolicyTermsAuditor();
    try {
        await auditor.run();
        process.exit(0);
    } catch (error) {
        console.error('Privacy Policy & Terms audit failed:', error);
        process.exit(1);
    }
}

export default PrivacyPolicyTermsAuditor;




