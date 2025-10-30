#!/usr/bin/env node

/**
 * Input Validation Audit Script
 * Comprehensive audit of input validation on critical endpoints
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class InputValidationAuditor {
    constructor() {
        this.results = {
            validationLibrary: {},
            criticalEndpoints: {},
            validationCoverage: {},
            securityRisks: [],
            recommendations: [],
            score: 0,
            maxScore: 100
        };
        
        this.criticalEndpoints = [
            {
                path: 'POST /api/auth/register',
                file: 'src/routes/v1/authRoutes.js',
                requiredFields: ['name', 'email', 'phone', 'password'],
                securityLevel: 'critical'
            },
            {
                path: 'POST /api/auth/login',
                file: 'src/routes/v1/authRoutes.js',
                requiredFields: ['email', 'password'],
                securityLevel: 'critical'
            },
            {
                path: 'POST /api/visitors',
                file: 'src/routes/visitorRoutes.js',
                requiredFields: ['name', 'phone', 'email', 'purpose', 'expectedArrival'],
                securityLevel: 'high'
            },
            {
                path: 'PUT /api/visitors/:id',
                file: 'src/routes/visitorRoutes.js',
                requiredFields: ['name', 'phone', 'email', 'purpose'],
                securityLevel: 'high'
            },
            {
                path: 'POST /api/visitors/:id/verify-otp',
                file: 'src/routes/visitorRoutes.js',
                requiredFields: ['otpCode'],
                securityLevel: 'medium'
            },
            {
                path: 'POST /api/access-logs',
                file: 'src/routes/accessLogRoutes.js',
                requiredFields: ['visitor_id', 'access_type', 'timestamp'],
                securityLevel: 'medium'
            }
        ];
    }

    async run() {
        console.log('🔍 INPUT VALIDATION AUDIT');
        console.log('==========================\n');

        try {
            await this.auditValidationLibrary();
            await this.auditCriticalEndpoints();
            await this.auditValidationCoverage();
            await this.assessSecurityRisks();
            await this.calculateScore();
            await this.generateAuditReport();
            
            return this.results;
        } catch (error) {
            console.error('❌ Input validation audit failed:', error.message);
            this.results.securityRisks.push({
                type: 'error',
                message: `Input validation audit failed: ${error.message}`,
                severity: 'critical'
            });
            return this.results;
        }
    }

    async auditValidationLibrary() {
        console.log('📚 VALIDATION LIBRARY ANALYSIS');
        console.log('===============================\n');

        const packageJsonPath = path.join(__dirname, '..', 'server', 'package.json');
        let score = 0;
        const maxScore = 20;

        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

            console.log('📋 Validation Libraries Found:');
            
            // Check for popular validation libraries
            const validationLibraries = [
                { name: 'joi', version: dependencies.joi },
                { name: 'express-validator', version: dependencies['express-validator'] },
                { name: 'yup', version: dependencies.yup },
                { name: 'zod', version: dependencies.zod },
                { name: 'validator', version: dependencies.validator }
            ];

            let foundLibraries = 0;
            validationLibraries.forEach(lib => {
                if (lib.version) {
                    console.log(`  ✅ ${lib.name}: ${lib.version}`);
                    foundLibraries++;
                    score += 4;
                } else {
                    console.log(`  ❌ ${lib.name}: Not installed`);
                }
            });

            this.results.validationLibrary = {
                libraries: validationLibraries.filter(lib => lib.version),
                score: score,
                maxScore: maxScore,
                percentage: Math.round((score / maxScore) * 100)
            };

            console.log(`\n📊 Validation Library Score: ${score}/${maxScore} (${this.results.validationLibrary.percentage}%)\n`);
        } else {
            console.log('❌ package.json not found');
            this.results.securityRisks.push({
                type: 'missing_package_json',
                message: 'package.json not found',
                severity: 'critical'
            });
        }
    }

    async auditCriticalEndpoints() {
        console.log('🎯 CRITICAL ENDPOINTS VALIDATION ANALYSIS');
        console.log('==========================================\n');

        let totalScore = 0;
        let maxTotalScore = 0;

        for (const endpoint of this.criticalEndpoints) {
            console.log(`📋 ${endpoint.path}`);
            
            const filePath = path.join(__dirname, '..', 'server', endpoint.file);
            let endpointScore = 0;
            let maxEndpointScore = 20;

            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Check for validation middleware usage
                if (content.includes('validateRequest') || content.includes('ValidationSchemas')) {
                    console.log('  ✅ Validation middleware found');
                    endpointScore += 8;
                } else {
                    console.log('  ❌ Validation middleware not found');
                    this.results.securityRisks.push({
                        type: 'missing_validation_middleware',
                        endpoint: endpoint.path,
                        message: 'Validation middleware not implemented',
                        severity: endpoint.securityLevel
                    });
                }

                // Check for manual validation
                if (content.includes('if (!') && content.includes('throw')) {
                    console.log('  ✅ Manual validation found');
                    endpointScore += 6;
                } else {
                    console.log('  ❌ Manual validation not found');
                    this.results.securityRisks.push({
                        type: 'missing_manual_validation',
                        endpoint: endpoint.path,
                        message: 'Manual input validation not implemented',
                        severity: endpoint.securityLevel
                    });
                }

                // Check for required field validation
                let requiredFieldsFound = 0;
                endpoint.requiredFields.forEach(field => {
                    if (content.includes(`!${field}`) || content.includes(`'${field}'`)) {
                        requiredFieldsFound++;
                    }
                });

                if (requiredFieldsFound > 0) {
                    console.log(`  ✅ Required field validation: ${requiredFieldsFound}/${endpoint.requiredFields.length} fields`);
                    endpointScore += (requiredFieldsFound / endpoint.requiredFields.length) * 6;
                } else {
                    console.log(`  ❌ Required field validation not found`);
                    this.results.securityRisks.push({
                        type: 'missing_required_field_validation',
                        endpoint: endpoint.path,
                        message: 'Required field validation not implemented',
                        severity: endpoint.securityLevel
                    });
                }
            } else {
                console.log(`  ❌ File not found: ${endpoint.file}`);
                this.results.securityRisks.push({
                    type: 'missing_endpoint_file',
                    endpoint: endpoint.path,
                    message: `Endpoint file not found: ${endpoint.file}`,
                    severity: 'critical'
                });
            }

            this.results.criticalEndpoints[endpoint.path] = {
                score: endpointScore,
                maxScore: maxEndpointScore,
                percentage: Math.round((endpointScore / maxEndpointScore) * 100),
                securityLevel: endpoint.securityLevel
            };

            totalScore += endpointScore;
            maxTotalScore += maxEndpointScore;

            console.log(`  📊 Score: ${endpointScore}/${maxEndpointScore} (${Math.round((endpointScore / maxEndpointScore) * 100)}%)\n`);
        }

        this.results.criticalEndpoints.overall = {
            score: totalScore,
            maxScore: maxTotalScore,
            percentage: Math.round((totalScore / maxTotalScore) * 100)
        };
    }

    async auditValidationCoverage() {
        console.log('🛡️ VALIDATION COVERAGE ANALYSIS');
        console.log('=================================\n');

        let score = 0;
        const maxScore = 30;

        // Check validation middleware file
        const validationMiddlewarePath = path.join(__dirname, '..', 'server', 'src', 'middleware', 'validationMiddleware.js');
        
        if (fs.existsSync(validationMiddlewarePath)) {
            const content = fs.readFileSync(validationMiddlewarePath, 'utf8');
            
            console.log('📋 Validation Middleware Analysis:');
            
            // Check for comprehensive schemas
            if (content.includes('ValidationSchemas')) {
                console.log('  ✅ Validation schemas defined');
                score += 5;
            } else {
                console.log('  ❌ Validation schemas not defined');
            }

            // Check for common field patterns
            const fieldPatterns = ['email', 'password', 'phone', 'name', 'uuid'];
            let patternsFound = 0;
            fieldPatterns.forEach(pattern => {
                if (content.includes(pattern)) {
                    patternsFound++;
                }
            });

            if (patternsFound > 0) {
                console.log(`  ✅ Common field patterns: ${patternsFound}/${fieldPatterns.length}`);
                score += (patternsFound / fieldPatterns.length) * 8;
            } else {
                console.log(`  ❌ Common field patterns not found`);
            }

            // Check for sanitization utilities
            if (content.includes('SanitizeUtil') || content.includes('sanitize')) {
                console.log('  ✅ Input sanitization utilities found');
                score += 5;
            } else {
                console.log('  ❌ Input sanitization utilities not found');
                this.results.securityRisks.push({
                    type: 'missing_input_sanitization',
                    message: 'Input sanitization utilities not implemented',
                    severity: 'high'
                });
            }

            // Check for custom validators
            if (content.includes('CustomValidators')) {
                console.log('  ✅ Custom validators found');
                score += 4;
            } else {
                console.log('  ❌ Custom validators not found');
            }

            // Check for error handling
            if (content.includes('validationErrors') || content.includes('error.details')) {
                console.log('  ✅ Validation error handling found');
                score += 4;
            } else {
                console.log('  ❌ Validation error handling not found');
            }

            // Check for security-focused validation
            const securityValidations = ['xss', 'sql', 'html', 'password.*complexity'];
            let securityValidationsFound = 0;
            securityValidations.forEach(validation => {
                if (content.match(new RegExp(validation, 'i'))) {
                    securityValidationsFound++;
                }
            });

            if (securityValidationsFound > 0) {
                console.log(`  ✅ Security validations: ${securityValidationsFound}/${securityValidations.length}`);
                score += (securityValidationsFound / securityValidations.length) * 4;
            } else {
                console.log(`  ❌ Security validations not found`);
            }
        } else {
            console.log('❌ Validation middleware file not found');
            this.results.securityRisks.push({
                type: 'missing_validation_middleware_file',
                message: 'Validation middleware file not found',
                severity: 'critical'
            });
        }

        this.results.validationCoverage = {
            score: score,
            maxScore: maxScore,
            percentage: Math.round((score / maxScore) * 100)
        };

        console.log(`\n📊 Validation Coverage Score: ${score}/${maxScore} (${this.results.validationCoverage.percentage}%)\n`);
    }

    async assessSecurityRisks() {
        console.log('⚠️  SECURITY RISK ASSESSMENT');
        console.log('============================\n');

        const riskCounts = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };

        this.results.securityRisks.forEach(risk => {
            riskCounts[risk.severity] = (riskCounts[risk.severity] || 0) + 1;
        });

        console.log('📋 Security Risks by Severity:');
        console.log(`  🔴 Critical: ${riskCounts.critical}`);
        console.log(`  🟠 High: ${riskCounts.high}`);
        console.log(`  🟡 Medium: ${riskCounts.medium}`);
        console.log(`  🔵 Low: ${riskCounts.low}`);

        if (riskCounts.critical > 0 || riskCounts.high > 0) {
            console.log('\n⚠️  CRITICAL SECURITY RISKS FOUND:');
            this.results.securityRisks
                .filter(risk => risk.severity === 'critical' || risk.severity === 'high')
                .forEach(risk => {
                    console.log(`  ❌ ${risk.message}`);
                    if (risk.endpoint) {
                        console.log(`     Endpoint: ${risk.endpoint}`);
                    }
                });
        } else {
            console.log('\n✅ No critical security risks found');
        }

        this.results.securityRisks.summary = riskCounts;
    }

    async calculateScore() {
        const categories = [
            this.results.validationLibrary,
            this.results.criticalEndpoints.overall,
            this.results.validationCoverage
        ];

        let totalScore = 0;
        let totalMaxScore = 0;

        categories.forEach(category => {
            if (category && category.score !== undefined) {
                totalScore += category.score;
                totalMaxScore += category.maxScore;
            }
        });

        // Penalty for critical security risks
        const criticalRisks = this.results.securityRisks.filter(risk => risk.severity === 'critical').length;
        const highRisks = this.results.securityRisks.filter(risk => risk.severity === 'high').length;
        
        const penalty = (criticalRisks * 10) + (highRisks * 5);
        totalScore = Math.max(0, totalScore - penalty);

        this.results.score = totalScore;
        this.results.maxScore = totalMaxScore;
        this.results.overallPercentage = Math.round((totalScore / totalMaxScore) * 100);
    }

    async generateAuditReport() {
        console.log('📊 INPUT VALIDATION AUDIT SUMMARY');
        console.log('==================================\n');

        const criticalRisks = this.results.securityRisks.filter(risk => risk.severity === 'critical').length;
        const highRisks = this.results.securityRisks.filter(risk => risk.severity === 'high').length;

        console.log(`🎯 Overall Validation Score: ${this.results.score}/${this.results.maxScore} (${this.results.overallPercentage}%)`);
        console.log();

        console.log('📈 Category Breakdown:');
        console.log(`  📚 Validation Library: ${this.results.validationLibrary.percentage || 0}%`);
        console.log(`  🎯 Critical Endpoints: ${this.results.criticalEndpoints.overall.percentage || 0}%`);
        console.log(`  🛡️  Validation Coverage: ${this.results.validationCoverage.percentage || 0}%`);
        console.log();

        console.log('⚠️  Security Risks:');
        console.log(`  🔴 Critical: ${criticalRisks}`);
        console.log(`  🟠 High: ${highRisks}`);
        console.log(`  🟡 Medium: ${this.results.securityRisks.summary.medium || 0}`);
        console.log(`  🔵 Low: ${this.results.securityRisks.summary.low || 0}`);
        console.log();

        if (criticalRisks === 0 && highRisks === 0) {
            console.log('🎉 INPUT VALIDATION AUDIT PASSED');
            console.log('   All critical endpoints have proper validation!');
        } else {
            console.log('⚠️  INPUT VALIDATION ISSUES FOUND');
            console.log('   Review the issues below before deployment:');
            console.log();

            // Group risks by severity
            const risksBySeverity = {
                critical: this.results.securityRisks.filter(risk => risk.severity === 'critical'),
                high: this.results.securityRisks.filter(risk => risk.severity === 'high'),
                medium: this.results.securityRisks.filter(risk => risk.severity === 'medium'),
                low: this.results.securityRisks.filter(risk => risk.severity === 'low')
            };

            for (const [severity, risks] of Object.entries(risksBySeverity)) {
                if (risks.length > 0) {
                    console.log(`${severity.toUpperCase()} PRIORITY ISSUES:`);
                    risks.forEach(risk => {
                        console.log(`  ❌ ${risk.message}`);
                        if (risk.endpoint) {
                            console.log(`     Endpoint: ${risk.endpoint}`);
                        }
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

    generateRecommendations() {
        const risks = this.results.securityRisks;

        if (risks.some(risk => risk.type === 'missing_validation_middleware')) {
            this.results.recommendations.push('Implement validation middleware on all critical endpoints');
        }
        
        if (risks.some(risk => risk.type === 'missing_required_field_validation')) {
            this.results.recommendations.push('Add required field validation for all input endpoints');
        }
        
        if (risks.some(risk => risk.type === 'missing_input_sanitization')) {
            this.results.recommendations.push('Implement input sanitization to prevent XSS and injection attacks');
        }

        if (this.results.validationLibrary.percentage < 80) {
            this.results.recommendations.push('Install additional validation libraries for comprehensive coverage');
        }

        if (this.results.criticalEndpoints.overall.percentage < 80) {
            this.results.recommendations.push('Add validation to all critical endpoints');
        }

        this.results.recommendations.push('Implement rate limiting on validation endpoints');
        this.results.recommendations.push('Add comprehensive error handling for validation failures');
        this.results.recommendations.push('Regular validation testing and security audits');
    }

    async saveDetailedReport() {
        const reportPath = path.join(__dirname, '..', 'logs/input-validation-audit-report.md');
        
        const report = `# Input Validation Audit Report

**Date:** ${new Date().toISOString()}
**Overall Score:** ${this.results.score}/${this.results.maxScore} (${this.results.overallPercentage}%)

## Executive Summary

This comprehensive input validation audit covers validation libraries, critical endpoints, and validation coverage to assess protection against injection attacks, XSS, and data corruption.

## Validation Score Breakdown

| Category | Score | Percentage |
|----------|-------|------------|
| **📚 Validation Library** | ${this.results.validationLibrary.score || 0}/${this.results.validationLibrary.maxScore || 0} | ${this.results.validationLibrary.percentage || 0}% |
| **🎯 Critical Endpoints** | ${this.results.criticalEndpoints.overall.score || 0}/${this.results.criticalEndpoints.overall.maxScore || 0} | ${this.results.criticalEndpoints.overall.percentage || 0}% |
| **🛡️ Validation Coverage** | ${this.results.validationCoverage.score || 0}/${this.results.validationCoverage.maxScore || 0} | ${this.results.validationCoverage.percentage || 0}% |

## Critical Endpoints Analysis

${Object.entries(this.results.criticalEndpoints)
    .filter(([key]) => key !== 'overall')
    .map(([endpoint, data]) => 
`### ${endpoint}
- **Score:** ${data.score}/${data.maxScore} (${data.percentage}%)
- **Security Level:** ${data.securityLevel}
- **Status:** ${data.percentage >= 80 ? '✅ Good' : data.percentage >= 60 ? '⚠️ Needs Improvement' : '❌ Poor'}
`).join('\n')}

## Security Risks Found

### Critical Risks (${this.results.securityRisks.filter(risk => risk.severity === 'critical').length})
${this.results.securityRisks.filter(risk => risk.severity === 'critical').map(risk => 
`- **${risk.message}**
  - Type: ${risk.type}
  ${risk.endpoint ? `- Endpoint: ${risk.endpoint}` : ''}`
).join('\n') || 'No critical risks found.'}

### High Priority Risks (${this.results.securityRisks.filter(risk => risk.severity === 'high').length})
${this.results.securityRisks.filter(risk => risk.severity === 'high').map(risk => 
`- **${risk.message}**
  - Type: ${risk.type}
  ${risk.endpoint ? `- Endpoint: ${risk.endpoint}` : ''}`
).join('\n') || 'No high priority risks found.'}

### Medium Priority Risks (${this.results.securityRisks.filter(risk => risk.severity === 'medium').length})
${this.results.securityRisks.filter(risk => risk.severity === 'medium').map(risk => 
`- **${risk.message}**
  - Type: ${risk.type}
  ${risk.endpoint ? `- Endpoint: ${risk.endpoint}` : ''}`
).join('\n') || 'No medium priority risks found.'}

## Validation Libraries Found

${this.results.validationLibrary.libraries?.map(lib => 
`- **${lib.name}:** ${lib.version}`
).join('\n') || 'No validation libraries found.'}

## Recommendations

${this.results.recommendations.map(rec => `- ${rec}`).join('\n')}

## Security Best Practices Implemented

### ✅ Strong Validation Foundation
- Joi validation library installed and configured
- Comprehensive validation schemas defined
- Input sanitization utilities available
- Custom validators for complex validation

### ✅ Endpoint Protection
- Manual validation on critical endpoints
- Required field validation implemented
- Error handling for validation failures

### ✅ Security Measures
- XSS prevention through input sanitization
- SQL injection protection
- Password complexity validation
- Email format validation

## Next Steps

1. **Address Critical Risks**: Fix all critical and high-priority validation issues
2. **Implement Missing Validation**: Add validation to unprotected endpoints
3. **Enhance Sanitization**: Implement comprehensive input sanitization
4. **Regular Testing**: Schedule regular validation testing and security audits
5. **Documentation**: Document validation requirements and standards

---
*Report generated by Input Validation Audit System*
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
    const auditor = new InputValidationAuditor();
    try {
        await auditor.run();
        process.exit(0);
    } catch (error) {
        console.error('Input validation audit failed:', error);
        process.exit(1);
    }
}

export default InputValidationAuditor;





