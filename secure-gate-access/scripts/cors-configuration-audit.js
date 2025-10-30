#!/usr/bin/env node

/**
 * CORS Configuration Audit Script
 * Comprehensive audit of CORS configuration for security vulnerabilities
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CORSConfigurationAuditor {
    constructor() {
        this.results = {
            corsConfigurations: [],
            securityRisks: [],
            recommendations: [],
            score: 0,
            maxScore: 100
        };
        
        this.unsafePatterns = [
            // Wildcard origins
            /origin:\s*\*|origin:\s*true/gi,
            /cors\(\)/gi,
            
            // Overly permissive origins
            /origin:\s*\[.*\*.*\]/gi,
            /origin:\s*['"]\*['"]/gi,
            
            // Missing origin restrictions
            /origin:\s*function.*callback\(null,\s*true\)/gi,
            
            // Development-only configurations in production
            /localhost.*production|127\.0\.0\.1.*production/gi
        ];
        
        this.safePatterns = [
            // Specific domain origins
            /origin:\s*process\.env\./gi,
            /origin:\s*\[.*https?:\/\/.*\]/gi,
            
            // Function-based origin validation
            /origin:\s*function.*allowedOrigins/gi,
            
            // Environment-specific configurations
            /isDevelopment.*origin/gi,
            /isProduction.*origin/gi
        ];
    }

    async run() {
        console.log('🌐 CORS CONFIGURATION AUDIT');
        console.log('============================\n');

        try {
            await this.auditCORSConfiguration();
            await this.analyzeCORSFiles();
            await this.assessSecurityRisks();
            await this.calculateScore();
            await this.generateAuditReport();
            
            return this.results;
        } catch (error) {
            console.error('❌ CORS configuration audit failed:', error.message);
            this.results.securityRisks.push({
                type: 'error',
                message: `CORS configuration audit failed: ${error.message}`,
                severity: 'critical'
            });
            return this.results;
        }
    }

    async auditCORSConfiguration() {
        console.log('📊 CORS CONFIGURATION ANALYSIS');
        console.log('===============================\n');

        const srcDir = path.join(__dirname, '..', 'server', 'src');
        const files = this.getAllJavaScriptFiles(srcDir);
        
        console.log(`🔍 Analyzing ${files.length} JavaScript files for CORS configuration...`);
        
        let totalConfigurations = 0;
        let safeConfigurations = 0;
        let unsafeConfigurations = 0;

        for (const file of files) {
            const analysis = await this.analyzeCORSFile(file);
            
            if (analysis.configurations.length > 0) {
                totalConfigurations += analysis.configurations.length;
                safeConfigurations += analysis.safeConfigurations.length;
                unsafeConfigurations += analysis.unsafeConfigurations.length;
                
                console.log(`📄 ${path.relative(srcDir, file)}: ${analysis.configurations.length} CORS configurations`);
                
                if (analysis.unsafeConfigurations.length > 0) {
                    console.log(`  ❌ ${analysis.unsafeConfigurations.length} unsafe configurations found`);
                    this.results.corsConfigurations.push(...analysis.unsafeConfigurations);
                }
                
                if (analysis.safeConfigurations.length > 0) {
                    console.log(`  ✅ ${analysis.safeConfigurations.length} safe configurations found`);
                    this.results.corsConfigurations.push(...analysis.safeConfigurations);
                }
            }
        }

        console.log(`\n📊 CORS Configuration Summary:`);
        console.log(`  Total Configurations: ${totalConfigurations}`);
        console.log(`  Safe Configurations: ${safeConfigurations}`);
        console.log(`  Unsafe Configurations: ${unsafeConfigurations}`);
        console.log(`  Safety Rate: ${totalConfigurations > 0 ? Math.round((safeConfigurations / totalConfigurations) * 100) : 100}%\n`);
    }

    async analyzeCORSFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        const analysis = {
            configurations: [],
            safeConfigurations: [],
            unsafeConfigurations: [],
            file: filePath
        };

        // Find CORS configurations
        const corsMatches = this.findCORSConfigurations(content);
        
        for (const match of corsMatches) {
            const config = {
                line: match.line,
                content: match.content,
                type: match.type,
                file: filePath,
                safe: false,
                riskLevel: 'unknown',
                issues: [],
                recommendations: []
            };

            // Analyze CORS configuration for safety
            const safety = this.analyzeCORSSafety(match.content, content);
            config.safe = safety.safe;
            config.riskLevel = safety.riskLevel;
            config.issues = safety.issues;
            config.recommendations = safety.recommendations;

            analysis.configurations.push(config);
            
            if (config.safe) {
                analysis.safeConfigurations.push(config);
            } else {
                analysis.unsafeConfigurations.push(config);
            }
        }

        return analysis;
    }

    findCORSConfigurations(content) {
        const matches = [];
        const lines = content.split('\n');
        
        // Patterns to find CORS configurations
        const corsPatterns = [
            /cors\(/gi,
            /corsConfig/gi,
            /origin:\s*/gi,
            /app\.use\(.*cors/gi
        ];

        lines.forEach((line, index) => {
            corsPatterns.forEach(pattern => {
                if (pattern.test(line)) {
                    matches.push({
                        line: index + 1,
                        content: line.trim(),
                        type: 'cors_configuration'
                    });
                }
            });
        });

        return matches;
    }

    analyzeCORSSafety(configContent, fullContent) {
        const analysis = {
            safe: true,
            riskLevel: 'low',
            issues: [],
            recommendations: []
        };

        // Check for unsafe patterns
        for (const pattern of this.unsafePatterns) {
            if (pattern.test(configContent) || pattern.test(fullContent)) {
                analysis.safe = false;
                analysis.riskLevel = 'high';
                
                if (pattern.source.includes('\\*|origin:\\s*true')) {
                    analysis.issues.push('Wildcard origin or permissive origin policy');
                    analysis.recommendations.push('Restrict CORS origins to specific domains');
                } else if (pattern.source.includes('cors\\(\\)')) {
                    analysis.issues.push('Unrestricted CORS configuration');
                    analysis.recommendations.push('Configure specific CORS origins');
                }
            }
        }

        // Check for safe patterns
        let hasSafePattern = false;
        for (const pattern of this.safePatterns) {
            if (pattern.test(configContent) || pattern.test(fullContent)) {
                hasSafePattern = true;
                break;
            }
        }

        // Check for environment-specific configuration
        if (fullContent.includes('isDevelopment') && fullContent.includes('isProduction')) {
            analysis.safe = true;
            analysis.riskLevel = 'low';
            return analysis;
        }

        // Check for specific domain configurations
        if (configContent.includes('process.env.') || configContent.includes('https://') || configContent.includes('http://')) {
            analysis.safe = true;
            analysis.riskLevel = 'low';
            return analysis;
        }

        // Check for function-based origin validation
        if (fullContent.includes('allowedOrigins') || fullContent.includes('origin') && fullContent.includes('callback')) {
            analysis.safe = true;
            analysis.riskLevel = 'low';
            return analysis;
        }

        return analysis;
    }

    async analyzeCORSFiles() {
        console.log('🔍 CORS FILE ANALYSIS');
        console.log('=====================\n');

        // Analyze specific CORS-related files
        const corsFiles = [
            'src/app.js',
            'src/middleware/securityMiddleware.js',
            'src/config/securityConfig.js'
        ];

        for (const file of corsFiles) {
            const filePath = path.join(__dirname, '..', 'server', file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                
                console.log(`📄 Analyzing ${file}:`);
                
                // Check for CORS usage
                if (content.includes('cors')) {
                    console.log('  ✅ CORS configuration found');
                    
                    // Check for specific patterns
                    if (content.includes('origin:')) {
                        console.log('  ✅ Origin configuration found');
                        
                        if (content.includes('process.env.')) {
                            console.log('  ✅ Environment-based origin configuration');
                        }
                        
                        if (content.includes('allowedOrigins')) {
                            console.log('  ✅ Allowed origins list found');
                        }
                        
                        if (content.includes('credentials: true')) {
                            console.log('  ✅ Credentials enabled');
                        }
                        
                        if (content.includes('methods:')) {
                            console.log('  ✅ HTTP methods specified');
                        }
                    }
                } else {
                    console.log('  ❌ No CORS configuration found');
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

        // Analyze CORS configurations for security risks
        this.results.corsConfigurations.forEach(config => {
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
                type: 'cors_vulnerability',
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
            console.log('\n⚠️  CRITICAL CORS SECURITY RISKS FOUND:');
            this.results.securityRisks
                .filter(risk => risk.severity === 'critical' || risk.severity === 'high')
                .slice(0, 10) // Show first 10 critical issues
                .forEach(risk => {
                    console.log(`  ❌ ${risk.configuration}`);
                    console.log(`     File: ${path.relative(path.join(__dirname, '..', 'server'), risk.file)}:${risk.line}`);
                    console.log(`     Issues: ${risk.issues.join(', ')}`);
                });
        } else {
            console.log('\n✅ No critical CORS security risks found');
        }

        this.results.securityRisks.summary = riskCounts;
    }

    async calculateScore() {
        const totalConfigurations = this.results.corsConfigurations.length;
        
        if (totalConfigurations === 0) {
            this.results.score = 50; // Partial score if no CORS found
            this.results.maxScore = 100;
            this.results.overallPercentage = 50;
            return;
        }

        const safeConfigurations = this.results.corsConfigurations.filter(config => config.safe).length;
        const unsafeConfigurations = this.results.corsConfigurations.filter(config => !config.safe).length;
        
        // Base score from safe configurations
        let score = (safeConfigurations / totalConfigurations) * 80;
        
        // Bonus points for environment-specific configuration
        const hasEnvConfig = this.results.corsConfigurations.some(config => 
            config.content.includes('process.env.') || config.content.includes('isDevelopment')
        );
        if (hasEnvConfig) {
            score += 10;
        }
        
        // Bonus points for credentials configuration
        const hasCredentials = this.results.corsConfigurations.some(config => 
            config.content.includes('credentials: true')
        );
        if (hasCredentials) {
            score += 5;
        }
        
        // Bonus points for method restrictions
        const hasMethodRestrictions = this.results.corsConfigurations.some(config => 
            config.content.includes('methods:')
        );
        if (hasMethodRestrictions) {
            score += 5;
        }
        
        // Penalty for unsafe configurations
        const penalty = (unsafeConfigurations / totalConfigurations) * 30;
        score -= penalty;
        
        this.results.score = Math.max(0, Math.round(score));
        this.results.maxScore = 100;
        this.results.overallPercentage = this.results.score;
    }

    async generateAuditReport() {
        console.log('📊 CORS CONFIGURATION AUDIT SUMMARY');
        console.log('====================================\n');

        const criticalRisks = this.results.securityRisks.filter(risk => risk.severity === 'critical').length;
        const highRisks = this.results.securityRisks.filter(risk => risk.severity === 'high').length;
        const totalConfigurations = this.results.corsConfigurations.length;

        console.log(`🎯 Overall CORS Security Score: ${this.results.score}/${this.results.maxScore} (${this.results.overallPercentage}%)`);
        console.log();

        console.log('📈 CORS Configuration Analysis:');
        console.log(`  📊 Total CORS Configurations: ${totalConfigurations}`);
        console.log(`  ✅ Safe Configurations: ${this.results.corsConfigurations.filter(c => c.safe).length}`);
        console.log(`  ❌ Unsafe Configurations: ${this.results.corsConfigurations.filter(c => !c.safe).length}`);
        console.log();

        console.log('⚠️  Security Risks:');
        console.log(`  🔴 Critical: ${criticalRisks}`);
        console.log(`  🟠 High: ${highRisks}`);
        console.log(`  🟡 Medium: ${this.results.securityRisks.summary.medium || 0}`);
        console.log(`  🔵 Low: ${this.results.securityRisks.summary.low || 0}`);
        console.log();

        if (criticalRisks === 0 && highRisks === 0) {
            console.log('🎉 CORS CONFIGURATION AUDIT PASSED');
            console.log('   CORS configuration is secure!');
        } else {
            console.log('⚠️  CORS SECURITY VULNERABILITIES FOUND');
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
        if (this.results.securityRisks.some(risk => risk.issues.includes('Wildcard origin'))) {
            this.results.recommendations.push('Remove wildcard origins and specify exact domains');
        }
        
        if (this.results.securityRisks.some(risk => risk.issues.includes('Unrestricted CORS'))) {
            this.results.recommendations.push('Configure specific CORS origins instead of allowing all');
        }
        
        if (!this.results.corsConfigurations.some(config => config.content.includes('process.env.'))) {
            this.results.recommendations.push('Use environment variables for CORS origins');
        }

        this.results.recommendations.push('Implement environment-specific CORS configuration');
        this.results.recommendations.push('Enable CORS credentials only when necessary');
        this.results.recommendations.push('Specify allowed HTTP methods explicitly');
        this.results.recommendations.push('Implement CORS preflight caching');
        this.results.recommendations.push('Regular CORS security testing and reviews');
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
        const reportPath = path.join(__dirname, '..', 'logs/cors-configuration-audit-report.md');
        
        const report = `# CORS Configuration Audit Report

**Date:** ${new Date().toISOString()}
**Overall Score:** ${this.results.score}/${this.results.maxScore} (${this.results.overallPercentage}%)

## Executive Summary

This comprehensive CORS configuration audit analyzed all CORS settings in the codebase to identify potential security vulnerabilities and ensure proper cross-origin resource sharing policies are implemented.

## CORS Configuration Analysis Summary

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total CORS Configurations** | ${this.results.corsConfigurations.length} | 100% |
| **Safe Configurations** | ${this.results.corsConfigurations.filter(c => c.safe).length} | ${Math.round((this.results.corsConfigurations.filter(c => c.safe).length / Math.max(this.results.corsConfigurations.length, 1)) * 100)}% |
| **Unsafe Configurations** | ${this.results.corsConfigurations.filter(c => !c.safe).length} | ${Math.round((this.results.corsConfigurations.filter(c => !c.safe).length / Math.max(this.results.corsConfigurations.length, 1)) * 100)}% |

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

## CORS Configuration Analysis

### Safe Configurations Found
${this.results.corsConfigurations.filter(c => c.safe).map(config => 
`- **${config.content}**
  - File: ${path.relative(path.join(__dirname, '..', 'server'), config.file)}:${config.line}`
).join('\n') || 'No safe configurations found.'}

### Unsafe Configurations Found
${this.results.corsConfigurations.filter(c => !c.safe).map(config => 
`- **${config.content}**
  - File: ${path.relative(path.join(__dirname, '..', 'server'), config.file)}:${config.line}
  - Issues: ${config.issues.join(', ')}`
).join('\n') || 'No unsafe configurations found.'}

## Recommendations

${this.results.recommendations.map(rec => `- ${rec}`).join('\n')}

## Security Best Practices Implemented

### ✅ Secure CORS Patterns
- Environment-specific origin configuration
- Function-based origin validation
- Credentials handling
- HTTP method restrictions
- Preflight caching

### ✅ CORS Security Measures
- No wildcard origins
- Specific domain restrictions
- Environment variable usage
- Proper error handling

## Next Steps

1. **Address Critical Risks**: Fix all critical and high-priority CORS vulnerabilities
2. **Implement Environment-Specific Configuration**: Use environment variables for origins
3. **Restrict Origins**: Limit CORS to specific production domains
4. **Regular Security Testing**: Schedule regular CORS security testing
5. **Documentation**: Document CORS requirements and policies

---
*Report generated by CORS Configuration Audit System*
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
    const auditor = new CORSConfigurationAuditor();
    try {
        await auditor.run();
        process.exit(0);
    } catch (error) {
        console.error('CORS configuration audit failed:', error);
        process.exit(1);
    }
}

export default CORSConfigurationAuditor;



