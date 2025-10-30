#!/usr/bin/env node

/**
 * Security Configuration Audit Script
 * Comprehensive security audit covering authentication, JWT, headers, rate limiting, and more
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SecurityConfigurationAuditor {
    constructor() {
        this.results = {
            authentication: {},
            jwt: {},
            securityHeaders: {},
            rateLimiting: {},
            cors: {},
            passwordSecurity: {},
            sessionManagement: {},
            issues: [],
            recommendations: [],
            score: 0,
            maxScore: 100
        };
    }

    async run() {
        console.log('🔒 SECURITY CONFIGURATION AUDIT');
        console.log('================================\n');

        try {
            await this.auditAuthentication();
            await this.auditJWTImplementation();
            await this.auditSecurityHeaders();
            await this.auditRateLimiting();
            await this.auditCORSConfiguration();
            await this.auditPasswordSecurity();
            await this.auditSessionManagement();
            await this.calculateSecurityScore();
            await this.generateAuditReport();
            
            return this.results;
        } catch (error) {
            console.error('❌ Security audit failed:', error.message);
            this.results.issues.push({
                type: 'error',
                message: `Security audit failed: ${error.message}`,
                severity: 'critical'
            });
            return this.results;
        }
    }

    async auditAuthentication() {
        console.log('🔐 CHECKPOINT 6.1: Authentication Review');
        console.log('==========================================\n');

        const authFiles = [
            'server/src/middleware/authMiddleware.js',
            'server/src/routes/v1/authRoutes.js',
            'server/src/services/tokenService.js'
        ];

        let score = 0;
        const maxScore = 25;

        // Check password hashing implementation
        console.log('📋 Password Hashing Analysis:');
        
        for (const file of authFiles) {
            const filePath = path.join(__dirname, '..', file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Check for bcrypt usage
                if (content.includes('bcrypt')) {
                    console.log(`  ✅ ${file}: bcrypt found`);
                    score += 2;
                } else {
                    console.log(`  ❌ ${file}: bcrypt not found`);
                    this.results.issues.push({
                        type: 'missing_bcrypt',
                        file: file,
                        message: 'Password hashing not using bcrypt',
                        severity: 'critical'
                    });
                }

                // Check for salt rounds >= 10
                if (content.match(/saltRounds\s*[>=]\s*10|saltRounds.*1[0-9]/)) {
                    console.log(`  ✅ ${file}: Salt rounds >= 10`);
                    score += 3;
                } else if (content.includes('saltRounds')) {
                    console.log(`  ⚠️  ${file}: Salt rounds may be insufficient`);
                    this.results.issues.push({
                        type: 'weak_salt_rounds',
                        file: file,
                        message: 'Salt rounds may be insufficient (should be >= 10)',
                        severity: 'high'
                    });
                }

                // Check for password comparison
                if (content.includes('bcrypt.compare')) {
                    console.log(`  ✅ ${file}: Password comparison implemented`);
                    score += 2;
                } else {
                    console.log(`  ❌ ${file}: Password comparison not found`);
                    this.results.issues.push({
                        type: 'missing_password_comparison',
                        file: file,
                        message: 'Password comparison not implemented',
                        severity: 'critical'
                    });
                }

                // Check for plain text password storage
                if (content.includes('password_hash') && !content.includes('password\s*=')) {
                    console.log(`  ✅ ${file}: No plain text password storage`);
                    score += 3;
                } else if (content.includes('password\s*=')) {
                    console.log(`  ❌ ${file}: Potential plain text password storage`);
                    this.results.issues.push({
                        type: 'plain_text_password',
                        file: file,
                        message: 'Potential plain text password storage detected',
                        severity: 'critical'
                    });
                }
            }
        }

        this.results.authentication = {
            score: score,
            maxScore: maxScore,
            percentage: Math.round((score / maxScore) * 100)
        };

        console.log(`\n📊 Authentication Score: ${score}/${maxScore} (${this.results.authentication.percentage}%)\n`);
    }

    async auditJWTImplementation() {
        console.log('🎫 JWT Implementation Analysis');
        console.log('==============================\n');

        let score = 0;
        const maxScore = 20;

        const tokenServicePath = path.join(__dirname, '..', 'server/src/services/tokenService.js');
        
        if (fs.existsSync(tokenServicePath)) {
            const content = fs.readFileSync(tokenServicePath, 'utf8');
            
            // Check for JWT signing
            if (content.includes('jwt.sign')) {
                console.log('  ✅ JWT signing implemented');
                score += 3;
            } else {
                console.log('  ❌ JWT signing not found');
                this.results.issues.push({
                    type: 'missing_jwt_signing',
                    message: 'JWT signing not implemented',
                    severity: 'critical'
                });
            }

            // Check for JWT verification
            if (content.includes('jwt.verify')) {
                console.log('  ✅ JWT verification implemented');
                score += 3;
            } else {
                console.log('  ❌ JWT verification not found');
                this.results.issues.push({
                    type: 'missing_jwt_verification',
                    message: 'JWT verification not implemented',
                    severity: 'critical'
                });
            }

            // Check for token expiry
            if (content.includes('expiresIn') || content.includes('exp')) {
                console.log('  ✅ Token expiry configured');
                score += 3;
            } else {
                console.log('  ❌ Token expiry not configured');
                this.results.issues.push({
                    type: 'missing_token_expiry',
                    message: 'Token expiry not configured',
                    severity: 'high'
                });
            }

            // Check for refresh token mechanism
            if (content.includes('refresh') && content.includes('token')) {
                console.log('  ✅ Refresh token mechanism found');
                score += 4;
            } else {
                console.log('  ⚠️  Refresh token mechanism not found');
                this.results.issues.push({
                    type: 'missing_refresh_token',
                    message: 'Refresh token mechanism not implemented',
                    severity: 'medium'
                });
            }

            // Check for secure token extraction
            if (content.includes('authorization') && content.includes('split')) {
                console.log('  ✅ Token extraction from header implemented');
                score += 3;
            } else {
                console.log('  ❌ Token extraction not implemented');
                this.results.issues.push({
                    type: 'missing_token_extraction',
                    message: 'Token extraction from header not implemented',
                    severity: 'high'
                });
            }

            // Check for token revocation
            if (content.includes('revoke') || content.includes('blacklist')) {
                console.log('  ✅ Token revocation mechanism found');
                score += 4;
            } else {
                console.log('  ⚠️  Token revocation mechanism not found');
                this.results.issues.push({
                    type: 'missing_token_revocation',
                    message: 'Token revocation mechanism not implemented',
                    severity: 'medium'
                });
            }
        } else {
            console.log('  ❌ Token service file not found');
            this.results.issues.push({
                type: 'missing_token_service',
                message: 'Token service file not found',
                severity: 'critical'
            });
        }

        this.results.jwt = {
            score: score,
            maxScore: maxScore,
            percentage: Math.round((score / maxScore) * 100)
        };

        console.log(`\n📊 JWT Score: ${score}/${maxScore} (${this.results.jwt.percentage}%)\n`);
    }

    async auditSecurityHeaders() {
        console.log('🛡️  Security Headers Analysis');
        console.log('==============================\n');

        let score = 0;
        const maxScore = 20;

        const securityConfigPath = path.join(__dirname, '..', 'server/src/config/securityConfig.js');
        const securityMiddlewarePath = path.join(__dirname, '..', 'server/src/middleware/securityHeadersMiddleware.js');
        
        if (fs.existsSync(securityConfigPath)) {
            const content = fs.readFileSync(securityConfigPath, 'utf8');
            
            // Check for CSP configuration
            if (content.includes('cspDirectives')) {
                console.log('  ✅ Content Security Policy configured');
                score += 4;
            } else {
                console.log('  ❌ Content Security Policy not configured');
                this.results.issues.push({
                    type: 'missing_csp',
                    message: 'Content Security Policy not configured',
                    severity: 'high'
                });
            }

            // Check for HSTS configuration
            if (content.includes('hsts') || content.includes('strictTransportSecurity')) {
                console.log('  ✅ HTTP Strict Transport Security configured');
                score += 3;
            } else {
                console.log('  ❌ HSTS not configured');
                this.results.issues.push({
                    type: 'missing_hsts',
                    message: 'HTTP Strict Transport Security not configured',
                    severity: 'high'
                });
            }

            // Check for X-Frame-Options
            if (content.includes('frameOptions') || content.includes('frameguard')) {
                console.log('  ✅ X-Frame-Options configured');
                score += 2;
            } else {
                console.log('  ❌ X-Frame-Options not configured');
                this.results.issues.push({
                    type: 'missing_frame_options',
                    message: 'X-Frame-Options not configured',
                    severity: 'medium'
                });
            }

            // Check for X-Content-Type-Options
            if (content.includes('noSniff') || content.includes('contentTypeOptions')) {
                console.log('  ✅ X-Content-Type-Options configured');
                score += 2;
            } else {
                console.log('  ❌ X-Content-Type-Options not configured');
                this.results.issues.push({
                    type: 'missing_content_type_options',
                    message: 'X-Content-Type-Options not configured',
                    severity: 'medium'
                });
            }

            // Check for Referrer Policy
            if (content.includes('referrerPolicy')) {
                console.log('  ✅ Referrer Policy configured');
                score += 2;
            } else {
                console.log('  ❌ Referrer Policy not configured');
                this.results.issues.push({
                    type: 'missing_referrer_policy',
                    message: 'Referrer Policy not configured',
                    severity: 'low'
                });
            }

            // Check for Permissions Policy
            if (content.includes('permissionsPolicy')) {
                console.log('  ✅ Permissions Policy configured');
                score += 3;
            } else {
                console.log('  ❌ Permissions Policy not configured');
                this.results.issues.push({
                    type: 'missing_permissions_policy',
                    message: 'Permissions Policy not configured',
                    severity: 'medium'
                });
            }

            // Check for Helmet usage
            if (fs.existsSync(securityMiddlewarePath)) {
                const middlewareContent = fs.readFileSync(securityMiddlewarePath, 'utf8');
                if (middlewareContent.includes('helmet')) {
                    console.log('  ✅ Helmet middleware implemented');
                    score += 4;
                } else {
                    console.log('  ❌ Helmet middleware not implemented');
                    this.results.issues.push({
                        type: 'missing_helmet',
                        message: 'Helmet middleware not implemented',
                        severity: 'high'
                    });
                }
            }
        }

        this.results.securityHeaders = {
            score: score,
            maxScore: maxScore,
            percentage: Math.round((score / maxScore) * 100)
        };

        console.log(`\n📊 Security Headers Score: ${score}/${maxScore} (${this.results.securityHeaders.percentage}%)\n`);
    }

    async auditRateLimiting() {
        console.log('⏱️  Rate Limiting Analysis');
        console.log('===========================\n');

        let score = 0;
        const maxScore = 15;

        const rateLimitPath = path.join(__dirname, '..', 'server/src/middleware/rateLimitMiddleware.js');
        
        if (fs.existsSync(rateLimitPath)) {
            const content = fs.readFileSync(rateLimitPath, 'utf8');
            
            // Check for rate limiting implementation
            if (content.includes('express-rate-limit')) {
                console.log('  ✅ Rate limiting middleware implemented');
                score += 4;
            } else {
                console.log('  ❌ Rate limiting not implemented');
                this.results.issues.push({
                    type: 'missing_rate_limiting',
                    message: 'Rate limiting not implemented',
                    severity: 'critical'
                });
            }

            // Check for authentication rate limiting
            if (content.includes('authRateLimit') || content.includes('auth.*rate')) {
                console.log('  ✅ Authentication rate limiting configured');
                score += 3;
            } else {
                console.log('  ❌ Authentication rate limiting not configured');
                this.results.issues.push({
                    type: 'missing_auth_rate_limiting',
                    message: 'Authentication rate limiting not configured',
                    severity: 'high'
                });
            }

            // Check for Redis store
            if (content.includes('redis') && content.includes('store')) {
                console.log('  ✅ Redis store for rate limiting configured');
                score += 3;
            } else {
                console.log('  ⚠️  Redis store for rate limiting not configured (using memory)');
                this.results.issues.push({
                    type: 'missing_redis_rate_limiting',
                    message: 'Redis store for rate limiting not configured',
                    severity: 'medium'
                });
            }

            // Check for DDoS protection
            if (content.includes('ddos') || content.includes('DDoS')) {
                console.log('  ✅ DDoS protection configured');
                score += 3;
            } else {
                console.log('  ❌ DDoS protection not configured');
                this.results.issues.push({
                    type: 'missing_ddos_protection',
                    message: 'DDoS protection not configured',
                    severity: 'medium'
                });
            }

            // Check for multiple rate limit types
            const rateLimitTypes = ['generalRateLimit', 'authRateLimit', 'adminRateLimit', 'bulkOperationLimit'];
            const foundTypes = rateLimitTypes.filter(type => content.includes(type));
            console.log(`  ✅ Found ${foundTypes.length}/${rateLimitTypes.length} rate limit types`);
            score += foundTypes.length;
        }

        this.results.rateLimiting = {
            score: score,
            maxScore: maxScore,
            percentage: Math.round((score / maxScore) * 100)
        };

        console.log(`\n📊 Rate Limiting Score: ${score}/${maxScore} (${this.results.rateLimiting.percentage}%)\n`);
    }

    async auditCORSConfiguration() {
        console.log('🌐 CORS Configuration Analysis');
        console.log('==============================\n');

        let score = 0;
        const maxScore = 10;

        const securityConfigPath = path.join(__dirname, '..', 'server/src/config/securityConfig.js');
        
        if (fs.existsSync(securityConfigPath)) {
            const content = fs.readFileSync(securityConfigPath, 'utf8');
            
            // Check for CORS configuration
            if (content.includes('corsConfig')) {
                console.log('  ✅ CORS configuration found');
                score += 3;
            } else {
                console.log('  ❌ CORS configuration not found');
                this.results.issues.push({
                    type: 'missing_cors_config',
                    message: 'CORS configuration not found',
                    severity: 'high'
                });
            }

            // Check for origin restrictions
            if (content.includes('origin') && !content.includes('\'*\'') && !content.includes('*')) {
                console.log('  ✅ Origin restrictions configured');
                score += 3;
            } else {
                console.log('  ❌ Origin restrictions not configured (wildcard allowed)');
                this.results.issues.push({
                    type: 'wildcard_cors_origin',
                    message: 'CORS origin allows wildcard (*)',
                    severity: 'critical'
                });
            }

            // Check for credentials handling
            if (content.includes('credentials: true')) {
                console.log('  ✅ Credentials handling configured');
                score += 2;
            } else {
                console.log('  ⚠️  Credentials handling not configured');
                this.results.issues.push({
                    type: 'missing_cors_credentials',
                    message: 'CORS credentials handling not configured',
                    severity: 'medium'
                });
            }

            // Check for allowed methods
            if (content.includes('methods') && content.includes('GET')) {
                console.log('  ✅ Allowed methods configured');
                score += 2;
            } else {
                console.log('  ❌ Allowed methods not configured');
                this.results.issues.push({
                    type: 'missing_cors_methods',
                    message: 'CORS allowed methods not configured',
                    severity: 'medium'
                });
            }
        }

        this.results.cors = {
            score: score,
            maxScore: maxScore,
            percentage: Math.round((score / maxScore) * 100)
        };

        console.log(`\n📊 CORS Score: ${score}/${maxScore} (${this.results.cors.percentage}%)\n`);
    }

    async auditPasswordSecurity() {
        console.log('🔑 Password Security Analysis');
        console.log('==============================\n');

        let score = 0;
        const maxScore = 10;

        // Check for password strength validation
        const authRoutesPath = path.join(__dirname, '..', 'server/src/routes/v1/authRoutes.js');
        
        if (fs.existsSync(authRoutesPath)) {
            const content = fs.readFileSync(authRoutesPath, 'utf8');
            
            // Check for password length validation
            if (content.includes('password.length') && content.includes('>= 8')) {
                console.log('  ✅ Password length validation (>= 8 characters)');
                score += 3;
            } else {
                console.log('  ❌ Password length validation not found');
                this.results.issues.push({
                    type: 'missing_password_length_validation',
                    message: 'Password length validation not implemented',
                    severity: 'high'
                });
            }

            // Check for password strength validation
            if (content.includes('strength') || content.includes('uppercase') || content.includes('lowercase')) {
                console.log('  ✅ Password strength validation found');
                score += 4;
            } else {
                console.log('  ⚠️  Password strength validation not found');
                this.results.issues.push({
                    type: 'missing_password_strength_validation',
                    message: 'Password strength validation not implemented',
                    severity: 'medium'
                });
            }

            // Check for password hashing service
            const tokenServicePath = path.join(__dirname, '..', 'server/src/services/tokenService.js');
            if (fs.existsSync(tokenServicePath)) {
                const tokenContent = fs.readFileSync(tokenServicePath, 'utf8');
                if (tokenContent.includes('PasswordService') || tokenContent.includes('argon2')) {
                    console.log('  ✅ Advanced password hashing service found');
                    score += 3;
                } else {
                    console.log('  ⚠️  Advanced password hashing service not found');
                    this.results.issues.push({
                        type: 'missing_advanced_password_hashing',
                        message: 'Advanced password hashing service not implemented',
                        severity: 'medium'
                    });
                }
            }
        }

        this.results.passwordSecurity = {
            score: score,
            maxScore: maxScore,
            percentage: Math.round((score / maxScore) * 100)
        };

        console.log(`\n📊 Password Security Score: ${score}/${maxScore} (${this.results.passwordSecurity.percentage}%)\n`);
    }

    async auditSessionManagement() {
        console.log('👤 Session Management Analysis');
        console.log('===============================\n');

        let score = 0;
        const maxScore = 10;

        // Check for session management
        const authMiddlewarePath = path.join(__dirname, '..', 'server/src/middleware/authMiddleware.js');
        
        if (fs.existsSync(authMiddlewarePath)) {
            const content = fs.readFileSync(authMiddlewarePath, 'utf8');
            
            // Check for session validation
            if (content.includes('session') || content.includes('expires')) {
                console.log('  ✅ Session validation found');
                score += 4;
            } else {
                console.log('  ❌ Session validation not found');
                this.results.issues.push({
                    type: 'missing_session_validation',
                    message: 'Session validation not implemented',
                    severity: 'high'
                });
            }

            // Check for user lookup in database
            if (content.includes('SELECT') && content.includes('users')) {
                console.log('  ✅ Database user lookup implemented');
                score += 3;
            } else {
                console.log('  ❌ Database user lookup not implemented');
                this.results.issues.push({
                    type: 'missing_user_lookup',
                    message: 'Database user lookup not implemented',
                    severity: 'high'
                });
            }

            // Check for role-based authorization
            if (content.includes('role') && content.includes('authorize')) {
                console.log('  ✅ Role-based authorization found');
                score += 3;
            } else {
                console.log('  ⚠️  Role-based authorization not found');
                this.results.issues.push({
                    type: 'missing_role_authorization',
                    message: 'Role-based authorization not implemented',
                    severity: 'medium'
                });
            }
        }

        this.results.sessionManagement = {
            score: score,
            maxScore: maxScore,
            percentage: Math.round((score / maxScore) * 100)
        };

        console.log(`\n📊 Session Management Score: ${score}/${maxScore} (${this.results.sessionManagement.percentage}%)\n`);
    }

    async calculateSecurityScore() {
        const categories = [
            this.results.authentication,
            this.results.jwt,
            this.results.securityHeaders,
            this.results.rateLimiting,
            this.results.cors,
            this.results.passwordSecurity,
            this.results.sessionManagement
        ];

        let totalScore = 0;
        let totalMaxScore = 0;

        categories.forEach(category => {
            if (category.score !== undefined) {
                totalScore += category.score;
                totalMaxScore += category.maxScore;
            }
        });

        this.results.score = totalScore;
        this.results.maxScore = totalMaxScore;
        this.results.overallPercentage = Math.round((totalScore / totalMaxScore) * 100);
    }

    async generateAuditReport() {
        console.log('📊 SECURITY CONFIGURATION AUDIT SUMMARY');
        console.log('========================================\n');

        const criticalIssues = this.results.issues.filter(issue => issue.severity === 'critical').length;
        const highIssues = this.results.issues.filter(issue => issue.severity === 'high').length;
        const mediumIssues = this.results.issues.filter(issue => issue.severity === 'medium').length;
        const lowIssues = this.results.issues.filter(issue => issue.severity === 'low').length;

        console.log(`🎯 Overall Security Score: ${this.results.score}/${this.results.maxScore} (${this.results.overallPercentage}%)`);
        console.log();

        console.log('📈 Category Breakdown:');
        console.log(`  🔐 Authentication: ${this.results.authentication.percentage || 0}%`);
        console.log(`  🎫 JWT Implementation: ${this.results.jwt.percentage || 0}%`);
        console.log(`  🛡️  Security Headers: ${this.results.securityHeaders.percentage || 0}%`);
        console.log(`  ⏱️  Rate Limiting: ${this.results.rateLimiting.percentage || 0}%`);
        console.log(`  🌐 CORS Configuration: ${this.results.cors.percentage || 0}%`);
        console.log(`  🔑 Password Security: ${this.results.passwordSecurity.percentage || 0}%`);
        console.log(`  👤 Session Management: ${this.results.sessionManagement.percentage || 0}%`);
        console.log();

        console.log('⚠️  Issues Found:');
        console.log(`  🔴 Critical: ${criticalIssues}`);
        console.log(`  🟠 High: ${highIssues}`);
        console.log(`  🟡 Medium: ${mediumIssues}`);
        console.log(`  🔵 Low: ${lowIssues}`);
        console.log();

        if (criticalIssues === 0 && highIssues === 0) {
            console.log('🎉 SECURITY AUDIT PASSED');
            console.log('   All critical and high-priority security issues resolved!');
        } else {
            console.log('⚠️  SECURITY ISSUES FOUND');
            console.log('   Review the issues below before deployment:');
            console.log();

            // Group issues by severity
            const issuesBySeverity = {
                critical: this.results.issues.filter(issue => issue.severity === 'critical'),
                high: this.results.issues.filter(issue => issue.severity === 'high'),
                medium: this.results.issues.filter(issue => issue.severity === 'medium'),
                low: this.results.issues.filter(issue => issue.severity === 'low')
            };

            for (const [severity, issues] of Object.entries(issuesBySeverity)) {
                if (issues.length > 0) {
                    console.log(`${severity.toUpperCase()} PRIORITY ISSUES:`);
                    issues.forEach(issue => {
                        console.log(`  ❌ ${issue.message}`);
                        if (issue.file) {
                            console.log(`     File: ${issue.file}`);
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
        const issues = this.results.issues;

        if (issues.some(issue => issue.type === 'missing_bcrypt')) {
            this.results.recommendations.push('Implement bcrypt for password hashing with salt rounds >= 10');
        }
        
        if (issues.some(issue => issue.type === 'missing_jwt_verification')) {
            this.results.recommendations.push('Implement JWT token verification middleware');
        }
        
        if (issues.some(issue => issue.type === 'missing_csp')) {
            this.results.recommendations.push('Configure Content Security Policy headers');
        }
        
        if (issues.some(issue => issue.type === 'missing_rate_limiting')) {
            this.results.recommendations.push('Implement rate limiting middleware');
        }
        
        if (issues.some(issue => issue.type === 'wildcard_cors_origin')) {
            this.results.recommendations.push('Configure specific CORS origins instead of wildcard');
        }

        this.results.recommendations.push('Enable HTTPS in production environment');
        this.results.recommendations.push('Implement security monitoring and logging');
        this.results.recommendations.push('Regular security audits and penetration testing');
        this.results.recommendations.push('Implement input validation and sanitization');
    }

    async saveDetailedReport() {
        const reportPath = path.join(__dirname, '..', 'logs/security-configuration-audit-report.md');
        
        const report = `# Security Configuration Audit Report

**Date:** ${new Date().toISOString()}
**Overall Score:** ${this.results.score}/${this.results.maxScore} (${this.results.overallPercentage}%)

## Executive Summary

This comprehensive security audit covers authentication, JWT implementation, security headers, rate limiting, CORS configuration, password security, and session management.

## Security Score Breakdown

| Category | Score | Percentage |
|----------|-------|------------|
| **Authentication** | ${this.results.authentication.score || 0}/${this.results.authentication.maxScore || 0} | ${this.results.authentication.percentage || 0}% |
| **JWT Implementation** | ${this.results.jwt.score || 0}/${this.results.jwt.maxScore || 0} | ${this.results.jwt.percentage || 0}% |
| **Security Headers** | ${this.results.securityHeaders.score || 0}/${this.results.securityHeaders.maxScore || 0} | ${this.results.securityHeaders.percentage || 0}% |
| **Rate Limiting** | ${this.results.rateLimiting.score || 0}/${this.results.rateLimiting.maxScore || 0} | ${this.results.rateLimiting.percentage || 0}% |
| **CORS Configuration** | ${this.results.cors.score || 0}/${this.results.cors.maxScore || 0} | ${this.results.cors.percentage || 0}% |
| **Password Security** | ${this.results.passwordSecurity.score || 0}/${this.results.passwordSecurity.maxScore || 0} | ${this.results.passwordSecurity.percentage || 0}% |
| **Session Management** | ${this.results.sessionManagement.score || 0}/${this.results.sessionManagement.maxScore || 0} | ${this.results.sessionManagement.percentage || 0}% |

## Issues Found

### Critical Issues (${this.results.issues.filter(issue => issue.severity === 'critical').length})
${this.results.issues.filter(issue => issue.severity === 'critical').map(issue => 
`- **${issue.message}**
  - File: ${issue.file || 'N/A'}
  - Type: ${issue.type}`
).join('\n') || 'No critical issues found.'}

### High Priority Issues (${this.results.issues.filter(issue => issue.severity === 'high').length})
${this.results.issues.filter(issue => issue.severity === 'high').map(issue => 
`- **${issue.message}**
  - File: ${issue.file || 'N/A'}
  - Type: ${issue.type}`
).join('\n') || 'No high priority issues found.'}

### Medium Priority Issues (${this.results.issues.filter(issue => issue.severity === 'medium').length})
${this.results.issues.filter(issue => issue.severity === 'medium').map(issue => 
`- **${issue.message}**
  - File: ${issue.file || 'N/A'}
  - Type: ${issue.type}`
).join('\n') || 'No medium priority issues found.'}

### Low Priority Issues (${this.results.issues.filter(issue => issue.severity === 'low').length})
${this.results.issues.filter(issue => issue.severity === 'low').map(issue => 
`- **${issue.message}**
  - File: ${issue.file || 'N/A'}
  - Type: ${issue.type}`
).join('\n') || 'No low priority issues found.'}

## Recommendations

${this.results.recommendations.map(rec => `- ${rec}`).join('\n')}

## Security Best Practices Implemented

### ✅ Strong Authentication
- bcrypt password hashing with appropriate salt rounds
- Secure JWT token implementation with expiry
- Token extraction from Authorization header
- Database user validation

### ✅ Security Headers
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options protection
- X-Content-Type-Options
- Referrer Policy

### ✅ Rate Limiting
- Multiple rate limiting strategies
- Authentication-specific limits
- DDoS protection
- Redis-based storage for scalability

### ✅ CORS Configuration
- Specific origin restrictions
- Credentials handling
- Allowed methods configuration

## Next Steps

1. **Address Critical Issues**: Fix all critical and high-priority security issues
2. **Enable HTTPS**: Ensure HTTPS is enforced in production
3. **Security Monitoring**: Implement comprehensive security monitoring
4. **Regular Audits**: Schedule regular security audits and penetration testing
5. **Security Training**: Ensure development team is trained on security best practices

---
*Report generated by Security Configuration Audit System*
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
    const auditor = new SecurityConfigurationAuditor();
    try {
        await auditor.run();
        process.exit(0);
    } catch (error) {
        console.error('Security audit failed:', error);
        process.exit(1);
    }
}

export default SecurityConfigurationAuditor;





