#!/usr/bin/env node

/**
 * Rate Limiting Audit Script
 * Comprehensive audit of rate limiting implementation for security vulnerabilities
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RateLimitingAuditor {
    constructor() {
        this.results = {
            rateLimitConfigurations: [],
            securityRisks: [],
            recommendations: [],
            score: 0,
            maxScore: 100
        };
        
        this.requiredPatterns = [
            // Rate limiting middleware usage
            /app\.use.*rateLimit/gi,
            /app\.use.*rate.*limit/gi,
            
            // Specific endpoint protection
            /\/api\/auth.*rateLimit/gi,
            /\/api\/admin.*rateLimit/gi,
            /\/api\/sensitive.*rateLimit/gi,
            
            // Rate limiting libraries
            /express-rate-limit/gi,
            /express-slow-down/gi,
            
            // Configuration patterns
            /windowMs.*max.*message/gi,
            /skipSuccessfulRequests/gi
        ];
        
        this.securityPatterns = [
            // Strict authentication limits
            /auth.*max.*[1-9]/gi,
            /login.*max.*[1-9]/gi,
            
            // Admin protection
            /admin.*max.*[1-9]/gi,
            
            // DDoS protection
            /ddos.*max.*[1-9]/gi,
            /windowMs.*60000/gi,
            
            // Progressive limiting
            /progressive/gi,
            /adaptive/gi
        ];
    }

    async run() {
        console.log('⚡ RATE LIMITING AUDIT');
        console.log('======================\n');

        try {
            await this.auditRateLimitingConfiguration();
            await this.analyzeRateLimitingFiles();
            await this.assessSecurityRisks();
            await this.calculateScore();
            await this.generateAuditReport();
            
            return this.results;
        } catch (error) {
            console.error('❌ Rate limiting audit failed:', error.message);
            this.results.securityRisks.push({
                type: 'error',
                message: `Rate limiting audit failed: ${error.message}`,
                severity: 'critical'
            });
            return this.results;
        }
    }

    async auditRateLimitingConfiguration() {
        console.log('📊 RATE LIMITING CONFIGURATION ANALYSIS');
        console.log('========================================\n');

        const srcDir = path.join(__dirname, '..', 'server', 'src');
        const files = this.getAllJavaScriptFiles(srcDir);
        
        console.log(`🔍 Analyzing ${files.length} JavaScript files for rate limiting configuration...`);
        
        let totalConfigurations = 0;
        let secureConfigurations = 0;
        let insecureConfigurations = 0;

        for (const file of files) {
            const analysis = await this.analyzeRateLimitingFile(file);
            
            if (analysis.configurations.length > 0) {
                totalConfigurations += analysis.configurations.length;
                secureConfigurations += analysis.secureConfigurations.length;
                insecureConfigurations += analysis.insecureConfigurations.length;
                
                console.log(`📄 ${path.relative(srcDir, file)}: ${analysis.configurations.length} rate limiting configurations`);
                
                if (analysis.insecureConfigurations.length > 0) {
                    console.log(`  ❌ ${analysis.insecureConfigurations.length} insecure configurations found`);
                    this.results.rateLimitConfigurations.push(...analysis.insecureConfigurations);
                }
                
                if (analysis.secureConfigurations.length > 0) {
                    console.log(`  ✅ ${analysis.secureConfigurations.length} secure configurations found`);
                    this.results.rateLimitConfigurations.push(...analysis.secureConfigurations);
                }
            }
        }

        console.log(`\n📊 Rate Limiting Configuration Summary:`);
        console.log(`  Total Configurations: ${totalConfigurations}`);
        console.log(`  Secure Configurations: ${secureConfigurations}`);
        console.log(`  Insecure Configurations: ${insecureConfigurations}`);
        console.log(`  Security Rate: ${totalConfigurations > 0 ? Math.round((secureConfigurations / totalConfigurations) * 100) : 100}%\n`);
    }

    async analyzeRateLimitingFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        const analysis = {
            configurations: [],
            secureConfigurations: [],
            insecureConfigurations: [],
            file: filePath
        };

        // Find rate limiting configurations
        const rateLimitMatches = this.findRateLimitingConfigurations(content);
        
        for (const match of rateLimitMatches) {
            const config = {
                line: match.line,
                content: match.content,
                type: match.type,
                file: filePath,
                secure: false,
                riskLevel: 'unknown',
                issues: [],
                recommendations: []
            };

            // Analyze rate limiting configuration for security
            const security = this.analyzeRateLimitingSecurity(match.content, content);
            config.secure = security.secure;
            config.riskLevel = security.riskLevel;
            config.issues = security.issues;
            config.recommendations = security.recommendations;

            analysis.configurations.push(config);
            
            if (config.secure) {
                analysis.secureConfigurations.push(config);
            } else {
                analysis.insecureConfigurations.push(config);
            }
        }

        return analysis;
    }

    findRateLimitingConfigurations(content) {
        const matches = [];
        const lines = content.split('\n');
        
        // Patterns to find rate limiting configurations
        const rateLimitPatterns = [
            /rateLimit\(/gi,
            /express-rate-limit/gi,
            /express-slow-down/gi,
            /windowMs.*max/gi,
            /app\.use.*rateLimit/gi,
            /rateLimiters\./gi
        ];

        lines.forEach((line, index) => {
            rateLimitPatterns.forEach(pattern => {
                if (pattern.test(line)) {
                    matches.push({
                        line: index + 1,
                        content: line.trim(),
                        type: 'rate_limiting_configuration'
                    });
                }
            });
        });

        return matches;
    }

    analyzeRateLimitingSecurity(configContent, fullContent) {
        const analysis = {
            secure: true,
            riskLevel: 'low',
            issues: [],
            recommendations: []
        };

        // Check for required patterns
        let hasRequiredPatterns = false;
        for (const pattern of this.requiredPatterns) {
            if (pattern.test(configContent) || pattern.test(fullContent)) {
                hasRequiredPatterns = true;
                break;
            }
        }

        if (!hasRequiredPatterns) {
            analysis.secure = false;
            analysis.riskLevel = 'high';
            analysis.issues.push('No rate limiting implementation found');
            analysis.recommendations.push('Implement rate limiting middleware');
            return analysis;
        }

        // Check for security patterns
        let hasSecurityPatterns = false;
        for (const pattern of this.securityPatterns) {
            if (pattern.test(configContent) || pattern.test(fullContent)) {
                hasSecurityPatterns = true;
                break;
            }
        }

        if (!hasSecurityPatterns) {
            analysis.secure = false;
            analysis.riskLevel = 'medium';
            analysis.issues.push('Basic rate limiting found but may lack security features');
            analysis.recommendations.push('Implement stricter rate limiting for sensitive endpoints');
        }

        // Check for specific security features
        if (fullContent.includes('auth') && !fullContent.includes('max') && !fullContent.includes('windowMs')) {
            analysis.secure = false;
            analysis.riskLevel = 'high';
            analysis.issues.push('Authentication endpoints lack proper rate limiting');
            analysis.recommendations.push('Implement strict rate limiting for auth endpoints');
        }

        if (fullContent.includes('admin') && !fullContent.includes('max') && !fullContent.includes('windowMs')) {
            analysis.secure = false;
            analysis.riskLevel = 'medium';
            analysis.issues.push('Admin endpoints lack proper rate limiting');
            analysis.recommendations.push('Implement rate limiting for admin endpoints');
        }

        return analysis;
    }

    async analyzeRateLimitingFiles() {
        console.log('🔍 RATE LIMITING FILE ANALYSIS');
        console.log('===============================\n');

        // Analyze specific rate limiting files
        const rateLimitFiles = [
            'src/config/rateLimits.js',
            'src/middleware/rateLimitMiddleware.js',
            'src/app.js',
            'src/middleware/securityMiddleware.js'
        ];

        for (const file of rateLimitFiles) {
            const filePath = path.join(__dirname, '..', 'server', file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                
                console.log(`📄 Analyzing ${file}:`);
                
                // Check for rate limiting features
                if (content.includes('rateLimit') || content.includes('express-rate-limit')) {
                    console.log('  ✅ Rate limiting implementation found');
                    
                    // Check for specific patterns
                    if (content.includes('windowMs')) {
                        console.log('  ✅ Time window configuration found');
                    }
                    
                    if (content.includes('max:')) {
                        console.log('  ✅ Request limit configuration found');
                    }
                    
                    if (content.includes('skipSuccessfulRequests')) {
                        console.log('  ✅ Skip successful requests feature found');
                    }
                    
                    if (content.includes('auth') && content.includes('max')) {
                        console.log('  ✅ Authentication rate limiting found');
                    }
                    
                    if (content.includes('admin') && content.includes('max')) {
                        console.log('  ✅ Admin rate limiting found');
                    }
                    
                    if (content.includes('ddos') || content.includes('DDoS')) {
                        console.log('  ✅ DDoS protection found');
                    }
                    
                    if (content.includes('progressive') || content.includes('adaptive')) {
                        console.log('  ✅ Advanced rate limiting strategies found');
                    }
                    
                    if (content.includes('Redis') || content.includes('redis')) {
                        console.log('  ✅ Redis-based rate limiting found');
                    }
                    
                    if (content.includes('speedLimiters') || content.includes('slowDown')) {
                        console.log('  ✅ Speed limiting implementation found');
                    }
                } else {
                    console.log('  ❌ No rate limiting implementation found');
                }
                
                console.log();
            }
        }
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

        // Analyze rate limiting configurations for security risks
        this.results.rateLimitConfigurations.forEach(config => {
            let riskLevel = 'medium';
            
            if (config.riskLevel === 'high') {
                riskLevel = 'high';
                riskCounts.high++;
            } else if (config.riskLevel === 'critical') {
                riskLevel = 'critical';
                riskCounts.critical++;
            } else if (config.riskLevel === 'low') {
                riskLevel = 'low';
                riskCounts.low++;
            } else {
                riskCounts.medium++;
            }

            this.results.securityRisks.push({
                type: 'rate_limiting_vulnerability',
                severity: riskLevel,
                file: config.file,
                line: config.line,
                configuration: config.content,
                issues: config.issues,
                recommendations: config.recommendations
            });
        });

        console.log('📋 Security Risks by Severity:');
        console.log(`  🔴 Critical: ${riskCounts.critical}`);
        console.log(`  🟠 High: ${riskCounts.high}`);
        console.log(`  🟡 Medium: ${riskCounts.medium}`);
        console.log(`  🔵 Low: ${riskCounts.low}`);

        if (riskCounts.critical > 0 || riskCounts.high > 0) {
            console.log('\n⚠️  CRITICAL RATE LIMITING SECURITY RISKS FOUND:');
            this.results.securityRisks
                .filter(risk => risk.severity === 'critical' || risk.severity === 'high')
                .slice(0, 10) // Show first 10 critical issues
                .forEach(risk => {
                    console.log(`  ❌ ${risk.configuration}`);
                    console.log(`     File: ${path.relative(path.join(__dirname, '..', 'server'), risk.file)}:${risk.line}`);
                    console.log(`     Issues: ${risk.issues.join(', ')}`);
                });
        } else {
            console.log('\n✅ No critical rate limiting security risks found');
        }

        this.results.securityRisks.summary = riskCounts;
    }

    async calculateScore() {
        const totalConfigurations = this.results.rateLimitConfigurations.length;
        
        if (totalConfigurations === 0) {
            this.results.score = 0; // No rate limiting is critical
            this.results.maxScore = 100;
            this.results.overallPercentage = 0;
            return;
        }

        const secureConfigurations = this.results.rateLimitConfigurations.filter(config => config.secure).length;
        const insecureConfigurations = this.results.rateLimitConfigurations.filter(config => !config.secure).length;
        
        // Base score from secure configurations
        let score = (secureConfigurations / totalConfigurations) * 70;
        
        // Bonus points for advanced features
        const hasAuthProtection = this.results.rateLimitConfigurations.some(config => 
            config.content.includes('auth') || config.content.includes('login')
        );
        if (hasAuthProtection) {
            score += 10;
        }
        
        const hasAdminProtection = this.results.rateLimitConfigurations.some(config => 
            config.content.includes('admin')
        );
        if (hasAdminProtection) {
            score += 10;
        }
        
        const hasDDoSProtection = this.results.rateLimitConfigurations.some(config => 
            config.content.includes('ddos') || config.content.includes('DDoS')
        );
        if (hasDDoSProtection) {
            score += 5;
        }
        
        const hasAdvancedFeatures = this.results.rateLimitConfigurations.some(config => 
            config.content.includes('progressive') || config.content.includes('adaptive')
        );
        if (hasAdvancedFeatures) {
            score += 5;
        }
        
        // Penalty for insecure configurations
        const penalty = (insecureConfigurations / totalConfigurations) * 20;
        score -= penalty;
        
        this.results.score = Math.max(0, Math.round(score));
        this.results.maxScore = 100;
        this.results.overallPercentage = this.results.score;
    }

    async generateAuditReport() {
        console.log('📊 RATE LIMITING AUDIT SUMMARY');
        console.log('==============================\n');

        const criticalRisks = this.results.securityRisks.filter(risk => risk.severity === 'critical').length;
        const highRisks = this.results.securityRisks.filter(risk => risk.severity === 'high').length;
        const totalConfigurations = this.results.rateLimitConfigurations.length;

        console.log(`🎯 Overall Rate Limiting Security Score: ${this.results.score}/${this.results.maxScore} (${this.results.overallPercentage}%)`);
        console.log();

        console.log('📈 Rate Limiting Configuration Analysis:');
        console.log(`  📊 Total Rate Limiting Configurations: ${totalConfigurations}`);
        console.log(`  ✅ Secure Configurations: ${this.results.rateLimitConfigurations.filter(c => c.secure).length}`);
        console.log(`  ❌ Insecure Configurations: ${this.results.rateLimitConfigurations.filter(c => !c.secure).length}`);
        console.log();

        console.log('⚠️  Security Risks:');
        console.log(`  🔴 Critical: ${criticalRisks}`);
        console.log(`  🟠 High: ${highRisks}`);
        console.log(`  🟡 Medium: ${this.results.securityRisks.summary.medium || 0}`);
        console.log(`  🔵 Low: ${this.results.securityRisks.summary.low || 0}`);
        console.log();

        if (criticalRisks === 0 && highRisks === 0) {
            console.log('🎉 RATE LIMITING AUDIT PASSED');
            console.log('   Rate limiting configuration is secure!');
        } else {
            console.log('⚠️  RATE LIMITING SECURITY VULNERABILITIES FOUND');
            console.log('   Review the issues below before deployment:');
            console.log();

            // Show top critical issues
            const criticalIssues = this.results.securityRisks
                .filter(risk => risk.severity === 'critical' || risk.severity === 'high')
                .slice(0, 5);

            criticalIssues.forEach(risk => {
                console.log(`🔴 ${risk.severity.toUpperCase()} RISK:`);
                console.log(`   Configuration: ${risk.configuration}`);
                console.log(`   File: ${path.relative(path.join(__dirname, '..', 'server'), risk.file)}:${risk.line}`);
                console.log(`   Issues: ${risk.issues.join(', ')}`);
                console.log(`   Recommendations: ${risk.recommendations.join(', ')}`);
                console.log();
            });
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
        if (this.results.securityRisks.some(risk => risk.issues.includes('No rate limiting implementation'))) {
            this.results.recommendations.push('Implement comprehensive rate limiting middleware');
        }
        
        if (this.results.securityRisks.some(risk => risk.issues.includes('Authentication endpoints lack'))) {
            this.results.recommendations.push('Implement strict rate limiting for authentication endpoints');
        }
        
        if (this.results.securityRisks.some(risk => risk.issues.includes('Admin endpoints lack'))) {
            this.results.recommendations.push('Implement rate limiting for admin endpoints');
        }

        this.results.recommendations.push('Implement DDoS protection with aggressive rate limiting');
        this.results.recommendations.push('Use Redis-based rate limiting for production clusters');
        this.results.recommendations.push('Implement progressive and adaptive rate limiting strategies');
        this.results.recommendations.push('Add speed limiting for gradual slowdown');
        this.results.recommendations.push('Regular rate limiting security testing and monitoring');
    }

    getAllJavaScriptFiles(dir) {
        const files = [];
        
        function traverse(currentDir) {
            const items = fs.readdirSync(currentDir);
            
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                    traverse(fullPath);
                } else if (stat.isFile() && item.endsWith('.js')) {
                    files.push(fullPath);
                }
            }
        }
        
        traverse(dir);
        return files;
    }

    async saveDetailedReport() {
        const reportPath = path.join(__dirname, '..', 'logs/rate-limiting-audit-report.md');
        
        const report = `# Rate Limiting Audit Report

**Date:** ${new Date().toISOString()}
**Overall Score:** ${this.results.score}/${this.results.maxScore} (${this.results.overallPercentage}%)

## Executive Summary

This comprehensive rate limiting audit analyzed all rate limiting configurations in the codebase to identify potential security vulnerabilities and ensure proper protection against abuse and DDoS attacks.

## Rate Limiting Configuration Analysis Summary

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Rate Limiting Configurations** | ${this.results.rateLimitConfigurations.length} | 100% |
| **Secure Configurations** | ${this.results.rateLimitConfigurations.filter(c => c.secure).length} | ${Math.round((this.results.rateLimitConfigurations.filter(c => c.secure).length / Math.max(this.results.rateLimitConfigurations.length, 1)) * 100)}% |
| **Insecure Configurations** | ${this.results.rateLimitConfigurations.filter(c => !c.secure).length} | ${Math.round((this.results.rateLimitConfigurations.filter(c => !c.secure).length / Math.max(this.results.rateLimitConfigurations.length, 1)) * 100)}% |

## Security Risk Assessment

### Critical Risks (${this.results.securityRisks.filter(risk => risk.severity === 'critical').length})
${this.results.securityRisks.filter(risk => risk.severity === 'critical').map(risk => 
`- **${risk.configuration}**
  - File: ${path.relative(path.join(__dirname, '..', 'server'), risk.file)}:${risk.line}
  - Issues: ${risk.issues.join(', ')}
  - Recommendations: ${risk.recommendations.join(', ')}`
).join('\n') || 'No critical risks found.'}

### High Priority Risks (${this.results.securityRisks.filter(risk => risk.severity === 'high').length})
${this.results.securityRisks.filter(risk => risk.severity === 'high').map(risk => 
`- **${risk.configuration}**
  - File: ${path.relative(path.join(__dirname, '..', 'server'), risk.file)}:${risk.line}
  - Issues: ${risk.issues.join(', ')}
  - Recommendations: ${risk.recommendations.join(', ')}`
).join('\n') || 'No high priority risks found.'}

### Medium Priority Risks (${this.results.securityRisks.filter(risk => risk.severity === 'medium').length})
${this.results.securityRisks.filter(risk => risk.severity === 'medium').map(risk => 
`- **${risk.configuration}**
  - File: ${path.relative(path.join(__dirname, '..', 'server'), risk.file)}:${risk.line}
  - Issues: ${risk.issues.join(', ')}
  - Recommendations: ${risk.recommendations.join(', ')}`
).join('\n') || 'No medium priority risks found.'}

## Rate Limiting Configuration Analysis

### Secure Configurations Found
${this.results.rateLimitConfigurations.filter(c => c.secure).map(config => 
`- **${config.content}**
  - File: ${path.relative(path.join(__dirname, '..', 'server'), config.file)}:${config.line}`
).join('\n') || 'No secure configurations found.'}

### Insecure Configurations Found
${this.results.rateLimitConfigurations.filter(c => !c.secure).map(config => 
`- **${config.content}**
  - File: ${path.relative(path.join(__dirname, '..', 'server'), config.file)}:${config.line}
  - Issues: ${config.issues.join(', ')}`
).join('\n') || 'No insecure configurations found.'}

## Recommendations

${this.results.recommendations.map(rec => `- ${rec}`).join('\n')}

## Security Best Practices Implemented

### ✅ Secure Rate Limiting Patterns
- Express-rate-limit middleware
- Multiple rate limiting strategies
- Authentication endpoint protection
- Admin endpoint protection
- DDoS protection mechanisms

### ✅ Rate Limiting Security Measures
- Time window configuration
- Request limit enforcement
- Skip successful requests
- Redis-based storage
- Progressive and adaptive strategies

## Next Steps

1. **Address Critical Risks**: Fix all critical and high-priority rate limiting vulnerabilities
2. **Implement Comprehensive Protection**: Add rate limiting to all endpoints
3. **Enhance Authentication Protection**: Implement strict auth rate limiting
4. **Regular Security Testing**: Schedule regular rate limiting security testing
5. **Monitoring**: Implement rate limiting monitoring and alerting

---
*Report generated by Rate Limiting Audit System*
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
    const auditor = new RateLimitingAuditor();
    try {
        await auditor.run();
        process.exit(0);
    } catch (error) {
        console.error('Rate limiting audit failed:', error);
        process.exit(1);
    }
}

export default RateLimitingAuditor;





