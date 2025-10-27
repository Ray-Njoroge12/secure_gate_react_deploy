#!/usr/bin/env node

/**
 * Consent Mechanism Audit Script
 * Comprehensive audit of consent collection and management for Kenya DPA 2019 compliance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ConsentMechanismAuditor {
    constructor() {
        this.results = {
            frontendConsent: [],
            backendConsent: [],
            databaseConsent: [],
            privacyPolicy: [],
            consentComponents: [],
            missingFeatures: [],
            recommendations: [],
            score: 0,
            maxScore: 100
        };
        
        this.requiredConsentElements = [
            'privacy_policy_page',
            'consent_checkbox',
            'clear_language',
            'consent_timestamp',
            'consent_withdrawal',
            'consent_storage',
            'consent_validation',
            'consent_types'
        ];
    }

    async run() {
        console.log('🔐 CONSENT MECHANISM AUDIT');
        console.log('==========================\n');

        try {
            await this.auditFrontendConsent();
            await this.auditBackendConsent();
            await this.auditDatabaseConsent();
            await this.auditPrivacyPolicy();
            await this.auditConsentComponents();
            await this.identifyMissingFeatures();
            await this.calculateScore();
            await this.generateAuditReport();
            
            return this.results;
        } catch (error) {
            console.error('❌ Consent mechanism audit failed:', error.message);
            this.results.recommendations.push({
                type: 'error',
                message: `Consent mechanism audit failed: ${error.message}`,
                severity: 'critical'
            });
            return this.results;
        }
    }

    async auditFrontendConsent() {
        console.log('🖥️  FRONTEND CONSENT ANALYSIS');
        console.log('=============================\n');

        const clientDir = path.join(__dirname, '..', 'client', 'src');
        
        // Check for consent-related components
        const consentComponents = [
            'CookieConsentBanner.jsx',
            'PrivacyPolicy.jsx',
            'ConsentForm.jsx',
            'ConsentModal.jsx'
        ];

        console.log('📄 Checking for consent components...');
        for (const component of consentComponents) {
            const componentPath = path.join(clientDir, 'components', component);
            if (fs.existsSync(componentPath)) {
                const content = fs.readFileSync(componentPath, 'utf8');
                console.log(`  ✅ ${component}: Found`);
                
                this.analyzeConsentComponent(component, content);
            } else {
                console.log(`  ❌ ${component}: Not found`);
                this.results.missingFeatures.push({
                    type: 'component',
                    name: component,
                    location: 'frontend',
                    severity: 'high'
                });
            }
        }

        // Check visitor forms for consent
        console.log('\n📋 Checking visitor forms for consent...');
        const visitorForms = [
            'pages/resident/AddVisitor.jsx',
            'pages/resident/AddVisitorEnhanced.jsx',
            'pages/resident/AddVisitorWizard.jsx'
        ];

        for (const form of visitorForms) {
            const formPath = path.join(clientDir, form);
            if (fs.existsSync(formPath)) {
                const content = fs.readFileSync(formPath, 'utf8');
                console.log(`  📄 ${form}: Found`);
                
                const consentAnalysis = this.analyzeFormConsent(form, content);
                if (consentAnalysis.hasConsent) {
                    console.log(`    ✅ Consent mechanism found`);
                    this.results.frontendConsent.push({
                        component: form,
                        type: 'visitor_form',
                        hasConsent: true,
                        features: consentAnalysis.features
                    });
                } else {
                    console.log(`    ❌ No consent mechanism found`);
                    this.results.missingFeatures.push({
                        type: 'consent_form',
                        name: form,
                        location: 'frontend',
                        severity: 'critical'
                    });
                }
            }
        }

        // Check for privacy policy
        console.log('\n📜 Checking for privacy policy...');
        const privacyPolicyFiles = [
            'pages/PrivacyPolicy.jsx',
            'pages/privacy-policy.jsx',
            'components/PrivacyPolicy.jsx',
            'components/privacy-policy.jsx'
        ];

        let privacyPolicyFound = false;
        for (const file of privacyPolicyFiles) {
            const filePath = path.join(clientDir, file);
            if (fs.existsSync(filePath)) {
                console.log(`  ✅ Privacy policy found: ${file}`);
                privacyPolicyFound = true;
                this.results.privacyPolicy.push({
                    file: file,
                    status: 'found',
                    location: 'frontend'
                });
                break;
            }
        }

        if (!privacyPolicyFound) {
            console.log(`  ❌ Privacy policy not found`);
            this.results.missingFeatures.push({
                type: 'privacy_policy',
                name: 'Privacy Policy',
                location: 'frontend',
                severity: 'critical'
            });
        }
    }

    async auditBackendConsent() {
        console.log('\n🔧 BACKEND CONSENT ANALYSIS');
        console.log('============================\n');

        const serverDir = path.join(__dirname, '..', 'server', 'src');
        
        // Check consent routes
        console.log('🛣️  Checking consent routes...');
        const consentRoutesPath = path.join(serverDir, 'routes', 'consentRoutes.js');
        if (fs.existsSync(consentRoutesPath)) {
            const content = fs.readFileSync(consentRoutesPath, 'utf8');
            console.log(`  ✅ Consent routes found: consentRoutes.js`);
            
            const routeAnalysis = this.analyzeConsentRoutes(content);
            this.results.backendConsent.push({
                file: 'consentRoutes.js',
                status: 'found',
                routes: routeAnalysis.routes,
                features: routeAnalysis.features
            });
            
            console.log(`    📊 Routes found: ${routeAnalysis.routes.length}`);
            routeAnalysis.routes.forEach(route => {
                console.log(`      - ${route.method} ${route.path}: ${route.description}`);
            });
        } else {
            console.log(`  ❌ Consent routes not found`);
            this.results.missingFeatures.push({
                type: 'consent_routes',
                name: 'consentRoutes.js',
                location: 'backend',
                severity: 'critical'
            });
        }

        // Check consent middleware
        console.log('\n🔒 Checking consent middleware...');
        const consentMiddlewarePath = path.join(serverDir, 'middleware', 'consentMiddleware.js');
        if (fs.existsSync(consentMiddlewarePath)) {
            const content = fs.readFileSync(consentMiddlewarePath, 'utf8');
            console.log(`  ✅ Consent middleware found: consentMiddleware.js`);
            
            const middlewareAnalysis = this.analyzeConsentMiddleware(content);
            this.results.backendConsent.push({
                file: 'consentMiddleware.js',
                status: 'found',
                features: middlewareAnalysis.features,
                functions: middlewareAnalysis.functions
            });
            
            console.log(`    📊 Functions found: ${middlewareAnalysis.functions.length}`);
            middlewareAnalysis.functions.forEach(func => {
                console.log(`      - ${func.name}: ${func.description}`);
            });
        } else {
            console.log(`  ❌ Consent middleware not found`);
            this.results.missingFeatures.push({
                type: 'consent_middleware',
                name: 'consentMiddleware.js',
                location: 'backend',
                severity: 'critical'
            });
        }

        // Check compliance middleware
        console.log('\n📋 Checking compliance middleware...');
        const complianceMiddlewarePath = path.join(serverDir, 'middleware', 'complianceMiddleware.js');
        if (fs.existsSync(complianceMiddlewarePath)) {
            const content = fs.readFileSync(complianceMiddlewarePath, 'utf8');
            console.log(`  ✅ Compliance middleware found: complianceMiddleware.js`);
            
            const complianceAnalysis = this.analyzeComplianceMiddleware(content);
            this.results.backendConsent.push({
                file: 'complianceMiddleware.js',
                status: 'found',
                features: complianceAnalysis.features
            });
        } else {
            console.log(`  ❌ Compliance middleware not found`);
        }
    }

    async auditDatabaseConsent() {
        console.log('\n🗄️  DATABASE CONSENT ANALYSIS');
        console.log('==============================\n');

        const migrationsDir = path.join(__dirname, '..', 'server', 'src', 'database', 'migrations');
        
        // Check for consent tables in migrations
        console.log('📊 Checking consent tables in migrations...');
        const migrationFiles = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql'));
        
        let consentTablesFound = false;
        for (const file of migrationFiles) {
            const filePath = path.join(migrationsDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            if (content.includes('consent_records') || content.includes('consent')) {
                console.log(`  ✅ Consent tables found in: ${file}`);
                consentTablesFound = true;
                
                const tableAnalysis = this.analyzeConsentTables(content);
                this.results.databaseConsent.push({
                    file: file,
                    status: 'found',
                    tables: tableAnalysis.tables,
                    fields: tableAnalysis.fields
                });
                
                tableAnalysis.tables.forEach(table => {
                    console.log(`    📋 Table: ${table.name}`);
                    console.log(`      Fields: ${table.fields.join(', ')}`);
                });
            }
        }

        if (!consentTablesFound) {
            console.log(`  ❌ No consent tables found in migrations`);
            this.results.missingFeatures.push({
                type: 'consent_tables',
                name: 'consent_records',
                location: 'database',
                severity: 'critical'
            });
        }

        // Check visitors table for consent fields
        console.log('\n👥 Checking visitors table for consent fields...');
        const initialSchemaPath = path.join(migrationsDir, '001_initial_schema.sql');
        if (fs.existsSync(initialSchemaPath)) {
            const content = fs.readFileSync(initialSchemaPath, 'utf8');
            
            const visitorTableAnalysis = this.analyzeVisitorsTable(content);
            if (visitorTableAnalysis.hasConsentFields) {
                console.log(`  ✅ Visitors table has consent fields`);
                this.results.databaseConsent.push({
                    file: '001_initial_schema.sql',
                    table: 'visitors',
                    status: 'has_consent_fields',
                    fields: visitorTableAnalysis.consentFields
                });
                
                visitorTableAnalysis.consentFields.forEach(field => {
                    console.log(`    ✅ ${field.name}: ${field.type}`);
                });
            } else {
                console.log(`  ❌ Visitors table missing consent fields`);
                this.results.missingFeatures.push({
                    type: 'visitor_consent_fields',
                    name: 'visitors table',
                    location: 'database',
                    severity: 'high',
                    requiredFields: ['consent_given', 'consent_timestamp', 'consent_ip_address']
                });
            }
        }
    }

    async auditPrivacyPolicy() {
        console.log('\n📜 PRIVACY POLICY ANALYSIS');
        console.log('===========================\n');

        // Check for privacy policy in multiple locations
        const privacyPolicyLocations = [
            'client/public/privacy-policy.html',
            'client/src/pages/PrivacyPolicy.jsx',
            'client/src/components/PrivacyPolicy.jsx',
            'docs/privacy-policy.md',
            'PRIVACY_POLICY.md'
        ];

        let privacyPolicyFound = false;
        for (const location of privacyPolicyLocations) {
            const filePath = path.join(__dirname, '..', location);
            if (fs.existsSync(filePath)) {
                console.log(`  ✅ Privacy policy found: ${location}`);
                privacyPolicyFound = true;
                
                const content = fs.readFileSync(filePath, 'utf8');
                const policyAnalysis = this.analyzePrivacyPolicy(content);
                
                this.results.privacyPolicy.push({
                    file: location,
                    status: 'found',
                    sections: policyAnalysis.sections,
                    compliance: policyAnalysis.compliance
                });
                
                console.log(`    📊 Sections found: ${policyAnalysis.sections.length}`);
                policyAnalysis.sections.forEach(section => {
                    console.log(`      - ${section}`);
                });
                break;
            }
        }

        if (!privacyPolicyFound) {
            console.log(`  ❌ Privacy policy not found`);
            this.results.missingFeatures.push({
                type: 'privacy_policy',
                name: 'Privacy Policy',
                location: 'documentation',
                severity: 'critical'
            });
        }
    }

    async auditConsentComponents() {
        console.log('\n🧩 CONSENT COMPONENTS ANALYSIS');
        console.log('==============================\n');

        const clientDir = path.join(__dirname, '..', 'client', 'src');
        
        // Analyze CookieConsentBanner if it exists
        const cookieBannerPath = path.join(clientDir, 'components', 'CookieConsentBanner.jsx');
        if (fs.existsSync(cookieBannerPath)) {
            const content = fs.readFileSync(cookieBannerPath, 'utf8');
            console.log('🍪 Analyzing CookieConsentBanner...');
            
            const bannerAnalysis = this.analyzeCookieBanner(content);
            this.results.consentComponents.push({
                component: 'CookieConsentBanner',
                status: 'found',
                features: bannerAnalysis.features,
                compliance: bannerAnalysis.compliance
            });
            
            console.log(`  📊 Features found: ${bannerAnalysis.features.length}`);
            bannerAnalysis.features.forEach(feature => {
                console.log(`    ✅ ${feature}`);
            });
            
            if (bannerAnalysis.compliance.issues.length > 0) {
                console.log(`  ⚠️  Compliance issues:`);
                bannerAnalysis.compliance.issues.forEach(issue => {
                    console.log(`    ❌ ${issue}`);
                });
            }
        } else {
            console.log('🍪 CookieConsentBanner not found');
        }
    }

    analyzeConsentComponent(componentName, content) {
        const features = [];
        const issues = [];
        
        if (content.includes('consent')) features.push('Consent management');
        if (content.includes('privacy')) features.push('Privacy policy reference');
        if (content.includes('checkbox')) features.push('Consent checkbox');
        if (content.includes('timestamp')) features.push('Timestamp recording');
        if (content.includes('withdraw')) features.push('Consent withdrawal');
        if (content.includes('localStorage')) features.push('Local storage');
        if (content.includes('backend')) features.push('Backend integration');
        
        if (!content.includes('required')) issues.push('Missing required validation');
        if (!content.includes('timestamp')) issues.push('Missing timestamp recording');
        
        this.results.consentComponents.push({
            component: componentName,
            features: features,
            issues: issues
        });
    }

    analyzeFormConsent(formName, content) {
        const features = [];
        let hasConsent = false;
        
        if (content.includes('consent')) {
            hasConsent = true;
            features.push('Consent checkbox');
        }
        if (content.includes('privacy')) features.push('Privacy policy link');
        if (content.includes('terms')) features.push('Terms and conditions');
        if (content.includes('required')) features.push('Required validation');
        if (content.includes('timestamp')) features.push('Timestamp recording');
        
        return { hasConsent, features };
    }

    analyzeConsentRoutes(content) {
        const routes = [];
        const features = [];
        
        // Extract route information
        const routeMatches = content.match(/router\.(get|post|put|delete)\('([^']+)'/g);
        if (routeMatches) {
            routeMatches.forEach(match => {
                const [method, path] = match.match(/router\.(get|post|put|delete)\('([^']+)'/).slice(1);
                routes.push({
                    method: method.toUpperCase(),
                    path: path,
                    description: this.getRouteDescription(path)
                });
            });
        }
        
        if (content.includes('give')) features.push('Consent giving');
        if (content.includes('withdraw')) features.push('Consent withdrawal');
        if (content.includes('history')) features.push('Consent history');
        if (content.includes('check')) features.push('Consent validation');
        if (content.includes('statistics')) features.push('Consent statistics');
        
        return { routes, features };
    }

    analyzeConsentMiddleware(content) {
        const functions = [];
        const features = [];
        
        // Extract function information
        const functionMatches = content.match(/export\s+(async\s+)?function\s+(\w+)/g);
        if (functionMatches) {
            functionMatches.forEach(match => {
                const functionName = match.match(/function\s+(\w+)/)[1];
                functions.push({
                    name: functionName,
                    description: this.getFunctionDescription(functionName)
                });
            });
        }
        
        if (content.includes('recordConsent')) features.push('Consent recording');
        if (content.includes('withdrawConsent')) features.push('Consent withdrawal');
        if (content.includes('validateConsent')) features.push('Consent validation');
        if (content.includes('getConsentHistory')) features.push('Consent history');
        
        return { functions, features };
    }

    analyzeComplianceMiddleware(content) {
        const features = [];
        
        if (content.includes('consent')) features.push('Consent logging');
        if (content.includes('compliance')) features.push('Compliance tracking');
        if (content.includes('audit')) features.push('Audit logging');
        
        return { features };
    }

    analyzeConsentTables(content) {
        const tables = [];
        const fields = [];
        
        // Extract table information
        const tableMatches = content.match(/CREATE TABLE.*?consent_records.*?\(([\s\S]*?)\)/i);
        if (tableMatches) {
            const tableContent = tableMatches[1];
            const fieldMatches = tableContent.match(/(\w+)\s+([^,\n]+)/g);
            
            if (fieldMatches) {
                fieldMatches.forEach(match => {
                    const [fieldName, fieldType] = match.trim().split(/\s+/);
                    fields.push({ name: fieldName, type: fieldType });
                });
            }
            
            tables.push({
                name: 'consent_records',
                fields: fields.map(f => f.name)
            });
        }
        
        return { tables, fields };
    }

    analyzeVisitorsTable(content) {
        const consentFields = [];
        let hasConsentFields = false;
        
        // Check for consent-related fields in visitors table
        const consentFieldPatterns = [
            'consent_given',
            'consent_timestamp',
            'consent_ip_address',
            'consent_type'
        ];
        
        consentFieldPatterns.forEach(pattern => {
            if (content.includes(pattern)) {
                hasConsentFields = true;
                consentFields.push({
                    name: pattern,
                    type: 'BOOLEAN/TIMESTAMP/VARCHAR'
                });
            }
        });
        
        return { hasConsentFields, consentFields };
    }

    analyzePrivacyPolicy(content) {
        const sections = [];
        const compliance = { score: 0, issues: [] };
        
        // Common privacy policy sections
        const requiredSections = [
            'data collection',
            'data processing',
            'data storage',
            'data sharing',
            'user rights',
            'contact information',
            'cookies',
            'third parties'
        ];
        
        requiredSections.forEach(section => {
            if (content.toLowerCase().includes(section)) {
                sections.push(section);
                compliance.score += 10;
            } else {
                compliance.issues.push(`Missing ${section} section`);
            }
        });
        
        return { sections, compliance };
    }

    analyzeCookieBanner(content) {
        const features = [];
        const compliance = { score: 0, issues: [] };
        
        // Check for required features
        if (content.includes('Accept All')) features.push('Accept all option');
        if (content.includes('Reject All')) features.push('Reject all option');
        if (content.includes('Customize')) features.push('Customization option');
        if (content.includes('localStorage')) features.push('Local storage');
        if (content.includes('backend')) features.push('Backend integration');
        if (content.includes('privacy-policy')) features.push('Privacy policy link');
        
        // Compliance checks
        if (content.includes('Accept All')) compliance.score += 20;
        else compliance.issues.push('Missing accept all option');
        
        if (content.includes('Reject All')) compliance.score += 20;
        else compliance.issues.push('Missing reject all option');
        
        if (content.includes('Customize')) compliance.score += 15;
        else compliance.issues.push('Missing customization option');
        
        if (content.includes('privacy-policy')) compliance.score += 15;
        else compliance.issues.push('Missing privacy policy link');
        
        return { features, compliance };
    }

    async identifyMissingFeatures() {
        console.log('\n❌ MISSING FEATURES ANALYSIS');
        console.log('=============================\n');

        const missingFeatures = this.results.missingFeatures;
        
        if (missingFeatures.length === 0) {
            console.log('✅ No critical missing features identified');
            return;
        }
        
        console.log(`📊 Missing features identified: ${missingFeatures.length}`);
        
        missingFeatures.forEach(feature => {
            const severityIcon = feature.severity === 'critical' ? '🔴' : 
                                feature.severity === 'high' ? '🟡' : '🟢';
            console.log(`${severityIcon} ${feature.type}: ${feature.name} (${feature.location})`);
            
            if (feature.requiredFields) {
                console.log(`   Required fields: ${feature.requiredFields.join(', ')}`);
            }
        });
    }

    async calculateScore() {
        let score = 0;
        const maxScore = 100;
        
        // Frontend consent (30 points)
        const frontendScore = Math.min(this.results.frontendConsent.length * 15, 30);
        score += frontendScore;
        
        // Backend consent (30 points)
        const backendScore = Math.min(this.results.backendConsent.length * 15, 30);
        score += backendScore;
        
        // Database consent (20 points)
        const databaseScore = Math.min(this.results.databaseConsent.length * 10, 20);
        score += databaseScore;
        
        // Privacy policy (10 points)
        const privacyScore = this.results.privacyPolicy.length > 0 ? 10 : 0;
        score += privacyScore;
        
        // Consent components (10 points)
        const componentScore = Math.min(this.results.consentComponents.length * 5, 10);
        score += componentScore;
        
        // Deduct points for missing features
        const missingPenalty = Math.min(this.results.missingFeatures.length * 5, 30);
        score = Math.max(score - missingPenalty, 0);
        
        this.results.score = score;
        this.results.maxScore = maxScore;
        this.results.overallPercentage = Math.round((score / maxScore) * 100);
    }

    async generateAuditReport() {
        console.log('\n📊 CONSENT MECHANISM AUDIT SUMMARY');
        console.log('===================================\n');

        const missingFeatures = this.results.missingFeatures;
        const criticalMissing = missingFeatures.filter(f => f.severity === 'critical').length;
        const highMissing = missingFeatures.filter(f => f.severity === 'high').length;

        console.log(`🎯 Overall Consent Mechanism Score: ${this.results.score}/${this.results.maxScore} (${this.results.overallPercentage}%)`);
        console.log();

        console.log('📈 Implementation Status:');
        console.log(`  ✅ Frontend Consent: ${this.results.frontendConsent.length} components`);
        console.log(`  ✅ Backend Consent: ${this.results.backendConsent.length} modules`);
        console.log(`  ✅ Database Consent: ${this.results.databaseConsent.length} tables`);
        console.log(`  ✅ Privacy Policy: ${this.results.privacyPolicy.length} found`);
        console.log(`  ✅ Consent Components: ${this.results.consentComponents.length} found`);
        console.log();

        console.log('❌ Missing Features:');
        console.log(`  🔴 Critical: ${criticalMissing}`);
        console.log(`  🟡 High: ${highMissing}`);
        console.log(`  🟢 Medium: ${missingFeatures.length - criticalMissing - highMissing}`);
        console.log();

        if (criticalMissing === 0 && highMissing <= 2) {
            console.log('🎉 CONSENT MECHANISM AUDIT PASSED');
            console.log('   System has adequate consent collection mechanisms!');
        } else {
            console.log('⚠️  CONSENT MECHANISM ISSUES FOUND');
            console.log('   Review the issues below before deployment:');
            console.log();

            // Show critical and high priority missing features
            const criticalIssues = missingFeatures.filter(f => f.severity === 'critical' || f.severity === 'high').slice(0, 5);
            
            criticalIssues.forEach(feature => {
                console.log(`🔴 ${feature.severity.toUpperCase()}: ${feature.type} - ${feature.name}`);
                console.log(`   Location: ${feature.location}`);
                if (feature.requiredFields) {
                    console.log(`   Required: ${feature.requiredFields.join(', ')}`);
                }
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
        const missingFeatures = this.results.missingFeatures;
        
        if (missingFeatures.some(f => f.type === 'consent_form')) {
            this.results.recommendations.push('Add consent checkboxes to visitor registration forms');
        }
        
        if (missingFeatures.some(f => f.type === 'visitor_consent_fields')) {
            this.results.recommendations.push('Add consent fields to visitors table in database');
        }
        
        if (missingFeatures.some(f => f.type === 'privacy_policy')) {
            this.results.recommendations.push('Create comprehensive privacy policy page');
        }
        
        if (missingFeatures.some(f => f.type === 'consent_routes')) {
            this.results.recommendations.push('Implement consent management API routes');
        }
        
        if (missingFeatures.some(f => f.type === 'consent_middleware')) {
            this.results.recommendations.push('Implement consent validation middleware');
        }

        this.results.recommendations.push('Ensure consent checkboxes are not pre-checked');
        this.results.recommendations.push('Record consent timestamp and IP address');
        this.results.recommendations.push('Implement consent withdrawal functionality');
        this.results.recommendations.push('Add clear language explaining data use');
        this.results.recommendations.push('Link to privacy policy from consent forms');
    }

    getRouteDescription(path) {
        const descriptions = {
            '/give': 'Record user consent',
            '/withdraw': 'Withdraw user consent',
            '/history': 'Get consent history',
            '/check': 'Check consent validity',
            '/statistics': 'Get consent statistics',
            '/types': 'Get consent types',
            '/required': 'Get required consents'
        };
        return descriptions[path] || 'Consent management endpoint';
    }

    getFunctionDescription(functionName) {
        const descriptions = {
            'recordConsent': 'Record user consent in database',
            'withdrawConsent': 'Withdraw user consent',
            'validateConsent': 'Validate consent requirements',
            'getConsentHistory': 'Retrieve consent history',
            'getConsentStatistics': 'Get consent statistics'
        };
        return descriptions[functionName] || 'Consent management function';
    }

    async saveDetailedReport() {
        const reportPath = path.join(__dirname, '..', 'logs/consent-mechanism-audit-report.md');
        
        const missingFeatures = this.results.missingFeatures;
        const criticalMissing = missingFeatures.filter(f => f.severity === 'critical').length;
        const highMissing = missingFeatures.filter(f => f.severity === 'high').length;
        
        const report = `# Consent Mechanism Audit Report

**Date:** ${new Date().toISOString()}
**Overall Score:** ${this.results.score}/${this.results.maxScore} (${this.results.overallPercentage}%)
**Compliance Framework:** Kenya Data Protection Act 2019

## Executive Summary

This comprehensive consent mechanism audit evaluated the implementation of consent collection and management systems for Kenya DPA 2019 compliance.

## Implementation Status

### Frontend Consent Components
${this.results.frontendConsent.map(consent => 
`- **${consent.component}**: ${consent.hasConsent ? '✅ Has consent' : '❌ No consent'} (${consent.features.join(', ')})`
).join('\n')}

### Backend Consent Implementation
${this.results.backendConsent.map(consent => 
`- **${consent.file}**: ${consent.status} (${consent.features.join(', ')})`
).join('\n')}

### Database Consent Tables
${this.results.databaseConsent.map(consent => 
`- **${consent.file}**: ${consent.status} (${consent.tables ? consent.tables.map(t => t.name).join(', ') : 'N/A'})`
).join('\n')}

### Privacy Policy
${this.results.privacyPolicy.map(policy => 
`- **${policy.file}**: ${policy.status} (${policy.sections ? policy.sections.join(', ') : 'N/A'})`
).join('\n')}

### Consent Components
${this.results.consentComponents.map(component => 
`- **${component.component}**: ${component.status} (${component.features.join(', ')})`
).join('\n')}

## Missing Features

### Critical Issues
${missingFeatures.filter(f => f.severity === 'critical').map(feature => 
`- **${feature.type}**: ${feature.name} (${feature.location})`
).join('\n') || 'No critical issues found.'}

### High Priority Issues
${missingFeatures.filter(f => f.severity === 'high').map(feature => 
`- **${feature.type}**: ${feature.name} (${feature.location})`
).join('\n') || 'No high priority issues found.'}

## Recommendations

${this.results.recommendations.map(rec => `- ${rec}`).join('\n')}

## Required Database Schema Changes

\`\`\`sql
-- Add consent fields to visitors table
ALTER TABLE visitors ADD COLUMN consent_given BOOLEAN DEFAULT FALSE;
ALTER TABLE visitors ADD COLUMN consent_timestamp TIMESTAMP;
ALTER TABLE visitors ADD COLUMN consent_ip_address VARCHAR(45);
ALTER TABLE visitors ADD COLUMN consent_type VARCHAR(50);
ALTER TABLE visitors ADD COLUMN consent_version VARCHAR(20) DEFAULT '1.0';
\`\`\`

## Required Frontend Components

### Consent Checkbox Example
\`\`\`jsx
<FormGroup>
  <FormControlLabel
    control={
      <Checkbox
        checked={consentGiven}
        onChange={(e) => setConsentGiven(e.target.checked)}
        required
      />
    }
    label={
      <span>
        I agree to the <Link to="/privacy">Privacy Policy</Link> 
        and consent to the processing of my personal data
      </span>
    }
  />
</FormGroup>
\`\`\`

## Next Steps

1. **Implement Missing Components**: Add consent mechanisms to visitor forms
2. **Database Updates**: Add consent fields to visitors table
3. **Privacy Policy**: Create comprehensive privacy policy page
4. **Consent Validation**: Implement consent validation middleware
5. **Testing**: Test consent collection and withdrawal flows

---
*Report generated by Consent Mechanism Audit System*
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
    const auditor = new ConsentMechanismAuditor();
    try {
        await auditor.run();
        process.exit(0);
    } catch (error) {
        console.error('Consent mechanism audit failed:', error);
        process.exit(1);
    }
}

export default ConsentMechanismAuditor;


