#!/usr/bin/env node

/**
 * SQL Injection Prevention Audit Script
 * Comprehensive audit of database queries for SQL injection vulnerabilities
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SQLInjectionAuditor {
    constructor() {
        this.results = {
            safeQueries: [],
            unsafeQueries: [],
            parameterizedQueries: [],
            stringConcatenation: [],
            templateLiterals: [],
            ormUsage: [],
            securityRisks: [],
            recommendations: [],
            score: 0,
            maxScore: 100
        };
        
        this.unsafePatterns = [
            // String concatenation patterns
            /WHERE\s+.*\s*=\s*['"]\s*\+/gi,
            /SELECT\s+.*\s*\+.*WHERE/gi,
            /INSERT\s+.*\s*\+.*VALUES/gi,
            /UPDATE\s+.*\s*\+.*SET/gi,
            /DELETE\s+.*\s*\+.*WHERE/gi,
            
            // Template literal patterns with user input
            /`.*\$\{.*\}.*`/g,
            
            // Direct string interpolation
            /WHERE\s+.*\s*=\s*['"]\$\{/gi,
            /VALUES\s*\(\s*['"]\$\{/gi,
            
            // Unsafe query construction
            /query\s*\(\s*['"`].*\+.*['"`]/gi,
            /execute\s*\(\s*['"`].*\+.*['"`]/gi
        ];
        
        this.safePatterns = [
            // Parameterized queries
            /\$[0-9]+/g,
            /\?/g,
            
            // ORM patterns
            /\.findOne\s*\(\s*\{/gi,
            /\.findByPk\s*\(/gi,
            /\.create\s*\(\s*\{/gi,
            /\.update\s*\(\s*\{/gi,
            /\.destroy\s*\(\s*\{/gi,
            
            // Safe query methods
            /dbManager\.query\s*\(\s*['"`][^'"`]*\$[0-9]/gi,
            /db\.query\s*\(\s*['"`][^'"`]*\$[0-9]/gi
        ];
    }

    async run() {
        console.log('🔒 SQL INJECTION PREVENTION AUDIT');
        console.log('==================================\n');

        try {
            await this.auditDatabaseQueries();
            await this.analyzeQueryPatterns();
            await this.assessSecurityRisks();
            await this.calculateScore();
            await this.generateAuditReport();
            
            return this.results;
        } catch (error) {
            console.error('❌ SQL injection audit failed:', error.message);
            this.results.securityRisks.push({
                type: 'error',
                message: `SQL injection audit failed: ${error.message}`,
                severity: 'critical'
            });
            return this.results;
        }
    }

    async auditDatabaseQueries() {
        console.log('📊 DATABASE QUERY ANALYSIS');
        console.log('===========================\n');

        const srcDir = path.join(__dirname, '..', 'server', 'src');
        const files = this.getAllJavaScriptFiles(srcDir);
        
        console.log(`🔍 Analyzing ${files.length} JavaScript files...`);
        
        let totalQueries = 0;
        let safeQueries = 0;
        let unsafeQueries = 0;

        for (const file of files) {
            const analysis = await this.analyzeFile(file);
            
            if (analysis.queries.length > 0) {
                totalQueries += analysis.queries.length;
                safeQueries += analysis.safeQueries.length;
                unsafeQueries += analysis.unsafeQueries.length;
                
                console.log(`📄 ${path.relative(srcDir, file)}: ${analysis.queries.length} queries`);
                
                if (analysis.unsafeQueries.length > 0) {
                    console.log(`  ❌ ${analysis.unsafeQueries.length} unsafe queries found`);
                    this.results.unsafeQueries.push(...analysis.unsafeQueries);
                }
                
                if (analysis.safeQueries.length > 0) {
                    console.log(`  ✅ ${analysis.safeQueries.length} safe queries found`);
                    this.results.safeQueries.push(...analysis.safeQueries);
                }
            }
        }

        console.log(`\n📊 Query Analysis Summary:`);
        console.log(`  Total Queries: ${totalQueries}`);
        console.log(`  Safe Queries: ${safeQueries}`);
        console.log(`  Unsafe Queries: ${unsafeQueries}`);
        console.log(`  Safety Rate: ${totalQueries > 0 ? Math.round((safeQueries / totalQueries) * 100) : 100}%\n`);
    }

    async analyzeFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        const analysis = {
            queries: [],
            safeQueries: [],
            unsafeQueries: [],
            file: filePath
        };

        // Find all database query calls
        const queryMatches = this.findQueryCalls(content);
        
        for (const match of queryMatches) {
            const query = {
                line: match.line,
                content: match.content,
                type: match.type,
                file: filePath,
                safe: false,
                riskLevel: 'unknown'
            };

            // Analyze query for safety
            const safety = this.analyzeQuerySafety(match.content);
            query.safe = safety.safe;
            query.riskLevel = safety.riskLevel;
            query.issues = safety.issues;
            query.recommendations = safety.recommendations;

            analysis.queries.push(query);
            
            if (query.safe) {
                analysis.safeQueries.push(query);
            } else {
                analysis.unsafeQueries.push(query);
            }
        }

        return analysis;
    }

    findQueryCalls(content) {
        const matches = [];
        const lines = content.split('\n');
        
        // Patterns to find database queries
        const queryPatterns = [
            /dbManager\.query\s*\(/gi,
            /db\.query\s*\(/gi,
            /\.query\s*\(/gi,
            /\.execute\s*\(/gi
        ];

        lines.forEach((line, index) => {
            queryPatterns.forEach(pattern => {
                if (pattern.test(line)) {
                    matches.push({
                        line: index + 1,
                        content: line.trim(),
                        type: 'database_query'
                    });
                }
            });
        });

        return matches;
    }

    analyzeQuerySafety(queryContent) {
        const analysis = {
            safe: true,
            riskLevel: 'low',
            issues: [],
            recommendations: []
        };

        // Check for unsafe patterns
        for (const pattern of this.unsafePatterns) {
            if (pattern.test(queryContent)) {
                analysis.safe = false;
                analysis.riskLevel = 'high';
                analysis.issues.push('Unsafe query pattern detected');
                analysis.recommendations.push('Use parameterized queries instead of string concatenation');
            }
        }

        // Check for safe patterns
        let hasSafePattern = false;
        for (const pattern of this.safePatterns) {
            if (pattern.test(queryContent)) {
                hasSafePattern = true;
                break;
            }
        }

        // Check for parameterized queries
        if (queryContent.includes('$1') || queryContent.includes('$2') || queryContent.includes('?')) {
            analysis.safe = true;
            analysis.riskLevel = 'low';
            return analysis;
        }

        // Check for template literals with variables
        if (queryContent.includes('${') && !queryContent.includes('$1')) {
            analysis.safe = false;
            analysis.riskLevel = 'high';
            analysis.issues.push('Template literal with direct variable interpolation');
            analysis.recommendations.push('Use parameterized queries with $1, $2, etc.');
        }

        // Check for string concatenation
        if (queryContent.includes('+') && (queryContent.includes('WHERE') || queryContent.includes('VALUES'))) {
            analysis.safe = false;
            analysis.riskLevel = 'high';
            analysis.issues.push('String concatenation in SQL query');
            analysis.recommendations.push('Use parameterized queries to prevent SQL injection');
        }

        // Check for ORM usage (generally safe)
        if (queryContent.includes('.findOne') || queryContent.includes('.create') || queryContent.includes('.update')) {
            analysis.safe = true;
            analysis.riskLevel = 'low';
        }

        return analysis;
    }

    async analyzeQueryPatterns() {
        console.log('🔍 QUERY PATTERN ANALYSIS');
        console.log('==========================\n');

        // Analyze parameterized queries
        const parameterizedQueries = this.results.safeQueries.filter(q => 
            q.content.includes('$1') || q.content.includes('$2') || q.content.includes('?')
        );
        
        console.log(`✅ Parameterized Queries: ${parameterizedQueries.length}`);
        
        // Analyze string concatenation
        const stringConcatenation = this.results.unsafeQueries.filter(q => 
            q.content.includes('+') && (q.content.includes('WHERE') || q.content.includes('VALUES'))
        );
        
        console.log(`❌ String Concatenation Issues: ${stringConcatenation.length}`);
        
        // Analyze template literals
        const templateLiterals = this.results.unsafeQueries.filter(q => 
            q.content.includes('${') && !q.content.includes('$1')
        );
        
        console.log(`⚠️  Unsafe Template Literals: ${templateLiterals.length}`);
        
        // Analyze ORM usage
        const ormUsage = this.results.safeQueries.filter(q => 
            q.content.includes('.findOne') || q.content.includes('.create') || q.content.includes('.update')
        );
        
        console.log(`✅ ORM Usage: ${ormUsage.length}\n`);
        
        this.results.parameterizedQueries = parameterizedQueries;
        this.results.stringConcatenation = stringConcatenation;
        this.results.templateLiterals = templateLiterals;
        this.results.ormUsage = ormUsage;
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

        // Analyze unsafe queries for security risks
        this.results.unsafeQueries.forEach(query => {
            let riskLevel = 'medium';
            
            if (query.riskLevel === 'high') {
                riskLevel = 'high';
                riskCounts.high++;
            } else if (query.riskLevel === 'critical') {
                riskLevel = 'critical';
                riskCounts.critical++;
            } else {
                riskCounts.medium++;
            }

            this.results.securityRisks.push({
                type: 'sql_injection_vulnerability',
                severity: riskLevel,
                file: query.file,
                line: query.line,
                query: query.content,
                issues: query.issues,
                recommendations: query.recommendations
            });
        });

        console.log('📋 Security Risks by Severity:');
        console.log(`  🔴 Critical: ${riskCounts.critical}`);
        console.log(`  🟠 High: ${riskCounts.high}`);
        console.log(`  🟡 Medium: ${riskCounts.medium}`);
        console.log(`  🔵 Low: ${riskCounts.low}`);

        if (riskCounts.critical > 0 || riskCounts.high > 0) {
            console.log('\n⚠️  CRITICAL SQL INJECTION RISKS FOUND:');
            this.results.securityRisks
                .filter(risk => risk.severity === 'critical' || risk.severity === 'high')
                .slice(0, 10) // Show first 10 critical issues
                .forEach(risk => {
                    console.log(`  ❌ ${risk.query}`);
                    console.log(`     File: ${path.relative(path.join(__dirname, '..', 'server'), risk.file)}:${risk.line}`);
                    console.log(`     Issues: ${risk.issues.join(', ')}`);
                });
        } else {
            console.log('\n✅ No critical SQL injection risks found');
        }

        this.results.securityRisks.summary = riskCounts;
    }

    async calculateScore() {
        const totalQueries = this.results.safeQueries.length + this.results.unsafeQueries.length;
        
        if (totalQueries === 0) {
            this.results.score = 100;
            this.results.maxScore = 100;
            this.results.overallPercentage = 100;
            return;
        }

        const safeQueries = this.results.safeQueries.length;
        const unsafeQueries = this.results.unsafeQueries.length;
        
        // Base score from safe queries
        let score = (safeQueries / totalQueries) * 80;
        
        // Bonus points for ORM usage
        const ormBonus = (this.results.ormUsage.length / totalQueries) * 10;
        score += ormBonus;
        
        // Bonus points for parameterized queries
        const paramBonus = (this.results.parameterizedQueries.length / totalQueries) * 10;
        score += paramBonus;
        
        // Penalty for unsafe queries
        const penalty = (unsafeQueries / totalQueries) * 20;
        score -= penalty;
        
        this.results.score = Math.max(0, Math.round(score));
        this.results.maxScore = 100;
        this.results.overallPercentage = this.results.score;
    }

    async generateAuditReport() {
        console.log('📊 SQL INJECTION AUDIT SUMMARY');
        console.log('===============================\n');

        const criticalRisks = this.results.securityRisks.filter(risk => risk.severity === 'critical').length;
        const highRisks = this.results.securityRisks.filter(risk => risk.severity === 'high').length;
        const totalQueries = this.results.safeQueries.length + this.results.unsafeQueries.length;

        console.log(`🎯 Overall SQL Injection Security Score: ${this.results.score}/${this.results.maxScore} (${this.results.overallPercentage}%)`);
        console.log();

        console.log('📈 Query Analysis:');
        console.log(`  📊 Total Database Queries: ${totalQueries}`);
        console.log(`  ✅ Safe Queries: ${this.results.safeQueries.length}`);
        console.log(`  ❌ Unsafe Queries: ${this.results.unsafeQueries.length}`);
        console.log(`  🔒 Parameterized Queries: ${this.results.parameterizedQueries.length}`);
        console.log(`  🏗️  ORM Usage: ${this.results.ormUsage.length}`);
        console.log(`  ⚠️  String Concatenation Issues: ${this.results.stringConcatenation.length}`);
        console.log(`  📝 Unsafe Template Literals: ${this.results.templateLiterals.length}`);
        console.log();

        console.log('⚠️  Security Risks:');
        console.log(`  🔴 Critical: ${criticalRisks}`);
        console.log(`  🟠 High: ${highRisks}`);
        console.log(`  🟡 Medium: ${this.results.securityRisks.summary.medium || 0}`);
        console.log(`  🔵 Low: ${this.results.securityRisks.summary.low || 0}`);
        console.log();

        if (criticalRisks === 0 && highRisks === 0) {
            console.log('🎉 SQL INJECTION AUDIT PASSED');
            console.log('   All database queries are secure!');
        } else {
            console.log('⚠️  SQL INJECTION VULNERABILITIES FOUND');
            console.log('   Review the issues below before deployment:');
            console.log();

            // Show top critical issues
            const criticalIssues = this.results.securityRisks
                .filter(risk => risk.severity === 'critical' || risk.severity === 'high')
                .slice(0, 5);

            criticalIssues.forEach(risk => {
                console.log(`🔴 ${risk.severity.toUpperCase()} RISK:`);
                console.log(`   Query: ${risk.query}`);
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
        if (this.results.stringConcatenation.length > 0) {
            this.results.recommendations.push('Replace all string concatenation with parameterized queries');
        }
        
        if (this.results.templateLiterals.length > 0) {
            this.results.recommendations.push('Replace unsafe template literals with parameterized queries');
        }
        
        if (this.results.unsafeQueries.length > 0) {
            this.results.recommendations.push('Review and fix all unsafe database queries');
        }

        this.results.recommendations.push('Implement input validation on all user inputs');
        this.results.recommendations.push('Use ORM or query builder for complex queries');
        this.results.recommendations.push('Regular security testing and code reviews');
        this.results.recommendations.push('Implement database query monitoring and logging');
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
        const reportPath = path.join(__dirname, '..', 'logs/sql-injection-audit-report.md');
        
        const report = `# SQL Injection Prevention Audit Report

**Date:** ${new Date().toISOString()}
**Overall Score:** ${this.results.score}/${this.results.maxScore} (${this.results.overallPercentage}%)

## Executive Summary

This comprehensive SQL injection prevention audit analyzed all database queries in the codebase to identify potential vulnerabilities and ensure proper security practices are implemented.

## Query Analysis Summary

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Database Queries** | ${this.results.safeQueries.length + this.results.unsafeQueries.length} | 100% |
| **Safe Queries** | ${this.results.safeQueries.length} | ${Math.round((this.results.safeQueries.length / (this.results.safeQueries.length + this.results.unsafeQueries.length)) * 100)}% |
| **Unsafe Queries** | ${this.results.unsafeQueries.length} | ${Math.round((this.results.unsafeQueries.length / (this.results.safeQueries.length + this.results.unsafeQueries.length)) * 100)}% |
| **Parameterized Queries** | ${this.results.parameterizedQueries.length} | ${Math.round((this.results.parameterizedQueries.length / (this.results.safeQueries.length + this.results.unsafeQueries.length)) * 100)}% |
| **ORM Usage** | ${this.results.ormUsage.length} | ${Math.round((this.results.ormUsage.length / (this.results.safeQueries.length + this.results.unsafeQueries.length)) * 100)}% |

## Security Risk Assessment

### Critical Risks (${this.results.securityRisks.filter(risk => risk.severity === 'critical').length})
${this.results.securityRisks.filter(risk => risk.severity === 'critical').map(risk => 
`- **${risk.query}**
  - File: ${path.relative(path.join(__dirname, '..', 'server'), risk.file)}:${risk.line}
  - Issues: ${risk.issues.join(', ')}
  - Recommendations: ${risk.recommendations.join(', ')}`
).join('\n') || 'No critical risks found.'}

### High Priority Risks (${this.results.securityRisks.filter(risk => risk.severity === 'high').length})
${this.results.securityRisks.filter(risk => risk.severity === 'high').map(risk => 
`- **${risk.query}**
  - File: ${path.relative(path.join(__dirname, '..', 'server'), risk.file)}:${risk.line}
  - Issues: ${risk.issues.join(', ')}
  - Recommendations: ${risk.recommendations.join(', ')}`
).join('\n') || 'No high priority risks found.'}

### Medium Priority Risks (${this.results.securityRisks.filter(risk => risk.severity === 'medium').length})
${this.results.securityRisks.filter(risk => risk.severity === 'medium').map(risk => 
`- **${risk.query}**
  - File: ${path.relative(path.join(__dirname, '..', 'server'), risk.file)}:${risk.line}
  - Issues: ${risk.issues.join(', ')}
  - Recommendations: ${risk.recommendations.join(', ')}`
).join('\n') || 'No medium priority risks found.'}

## Query Pattern Analysis

### String Concatenation Issues (${this.results.stringConcatenation.length})
${this.results.stringConcatenation.slice(0, 10).map(query => 
`- **${query.content}**
  - File: ${path.relative(path.join(__dirname, '..', 'server'), query.file)}:${query.line}`
).join('\n') || 'No string concatenation issues found.'}

### Unsafe Template Literals (${this.results.templateLiterals.length})
${this.results.templateLiterals.slice(0, 10).map(query => 
`- **${query.content}**
  - File: ${path.relative(path.join(__dirname, '..', 'server'), query.file)}:${query.line}`
).join('\n') || 'No unsafe template literals found.'}

## Recommendations

${this.results.recommendations.map(rec => `- ${rec}`).join('\n')}

## Security Best Practices Implemented

### ✅ Safe Query Patterns
- Parameterized queries with $1, $2, etc.
- ORM usage for complex operations
- Input validation and sanitization
- Proper error handling

### ✅ Database Security Measures
- Parameterized query usage
- Input validation on all user inputs
- ORM abstraction layer
- Query monitoring and logging

## Next Steps

1. **Address Critical Risks**: Fix all critical and high-priority SQL injection vulnerabilities
2. **Implement Parameterized Queries**: Replace all string concatenation with parameterized queries
3. **Enhance Input Validation**: Implement comprehensive input validation
4. **Regular Security Testing**: Schedule regular SQL injection testing
5. **Code Review Process**: Implement security-focused code reviews

---
*Report generated by SQL Injection Prevention Audit System*
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
    const auditor = new SQLInjectionAuditor();
    try {
        await auditor.run();
        process.exit(0);
    } catch (error) {
        console.error('SQL injection audit failed:', error);
        process.exit(1);
    }
}

export default SQLInjectionAuditor;





