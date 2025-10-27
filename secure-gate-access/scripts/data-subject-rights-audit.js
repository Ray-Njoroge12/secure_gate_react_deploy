#!/usr/bin/env node

/**
 * Data Subject Rights (DSR) Audit Script
 * Comprehensive audit of Data Subject Rights implementation for Kenya DPA 2019 compliance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DataSubjectRightsAuditor {
    constructor() {
        this.results = {
            dsrEndpoints: [],
            dsrServices: [],
            dsrDatabase: [],
            missingRights: [],
            implementedRights: [],
            recommendations: [],
            score: 0,
            maxScore: 100
        };
        
        this.requiredDSRRights = [
            'right_to_access',
            'right_to_rectification', 
            'right_to_erasure',
            'right_to_restrict_processing',
            'right_to_data_portability',
            'right_to_object',
            'right_to_withdraw_consent'
        ];
        
        this.requiredEndpoints = [
            { right: 'right_to_access', method: 'GET', path: '/api/dsr/data-export', description: 'Export all user data' },
            { right: 'right_to_rectification', method: 'PUT', path: '/api/dsr/profile', description: 'Update user profile' },
            { right: 'right_to_erasure', method: 'DELETE', path: '/api/dsr/account', description: 'Delete user account' },
            { right: 'right_to_restrict_processing', method: 'POST', path: '/api/dsr/restrict-processing', description: 'Restrict data processing' },
            { right: 'right_to_data_portability', method: 'GET', path: '/api/dsr/export-portable', description: 'Export data in portable format' },
            { right: 'right_to_object', method: 'POST', path: '/api/dsr/object-processing', description: 'Object to data processing' },
            { right: 'right_to_withdraw_consent', method: 'POST', path: '/api/dsr/withdraw-consent', description: 'Withdraw consent' }
        ];
    }

    async run() {
        console.log('👤 DATA SUBJECT RIGHTS (DSR) AUDIT');
        console.log('===================================\n');

        try {
            await this.auditDSREndpoints();
            await this.auditDSRServices();
            await this.auditDSRDatabase();
            await this.analyzeDSRImplementation();
            await this.calculateScore();
            await this.generateAuditReport();
            
            return this.results;
        } catch (error) {
            console.error('❌ Data Subject Rights audit failed:', error.message);
            this.results.recommendations.push({
                type: 'error',
                message: `Data Subject Rights audit failed: ${error.message}`,
                severity: 'critical'
            });
            return this.results;
        }
    }

    async auditDSREndpoints() {
        console.log('🛣️  DSR ENDPOINTS ANALYSIS');
        console.log('===========================\n');

        const serverDir = path.join(__dirname, '..', 'server', 'src');
        const routeFiles = this.getAllRouteFiles(serverDir);
        
        console.log(`🔍 Analyzing ${routeFiles.length} route files for DSR endpoints...`);
        
        let totalEndpoints = 0;
        let dsrEndpoints = 0;

        for (const file of routeFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const analysis = this.analyzeRouteFile(file, content);
            
            totalEndpoints += analysis.totalEndpoints;
            dsrEndpoints += analysis.dsrEndpoints;
            
            if (analysis.dsrEndpoints > 0) {
                console.log(`📄 ${path.relative(serverDir, file)}: ${analysis.dsrEndpoints} DSR endpoints`);
                
                analysis.endpoints.forEach(endpoint => {
                    console.log(`  ✅ ${endpoint.method} ${endpoint.path}: ${endpoint.description}`);
                    this.results.dsrEndpoints.push(endpoint);
                });
            }
        }

        console.log(`\n📊 DSR Endpoints Summary:`);
        console.log(`  Total Endpoints: ${totalEndpoints}`);
        console.log(`  DSR Endpoints: ${dsrEndpoints}`);
        console.log(`  Coverage: ${totalEndpoints > 0 ? Math.round((dsrEndpoints / totalEndpoints) * 100) : 0}%\n`);
    }

    async auditDSRServices() {
        console.log('🔧 DSR SERVICES ANALYSIS');
        console.log('=========================\n');

        const serverDir = path.join(__dirname, '..', 'server', 'src');
        const serviceFiles = this.getAllServiceFiles(serverDir);
        
        console.log(`🔍 Analyzing ${serviceFiles.length} service files for DSR functionality...`);
        
        let totalServices = 0;
        let dsrServices = 0;

        for (const file of serviceFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const analysis = this.analyzeServiceFile(file, content);
            
            totalServices += analysis.totalServices;
            dsrServices += analysis.dsrServices;
            
            if (analysis.dsrServices > 0) {
                console.log(`📄 ${path.relative(serverDir, file)}: ${analysis.dsrServices} DSR services`);
                
                analysis.services.forEach(service => {
                    console.log(`  ✅ ${service.name}: ${service.description}`);
                    this.results.dsrServices.push(service);
                });
            }
        }

        console.log(`\n📊 DSR Services Summary:`);
        console.log(`  Total Services: ${totalServices}`);
        console.log(`  DSR Services: ${dsrServices}`);
        console.log(`  Coverage: ${totalServices > 0 ? Math.round((dsrServices / totalServices) * 100) : 0}%\n`);
    }

    async auditDSRDatabase() {
        console.log('🗄️  DSR DATABASE ANALYSIS');
        console.log('==========================\n');

        const migrationsDir = path.join(__dirname, '..', 'server', 'src', 'database', 'migrations');
        
        console.log('📊 Checking DSR-related database tables...');
        
        const migrationFiles = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql'));
        let dsrTables = 0;
        let totalTables = 0;

        for (const file of migrationFiles) {
            const filePath = path.join(migrationsDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            const analysis = this.analyzeMigrationFile(file, content);
            totalTables += analysis.totalTables;
            dsrTables += analysis.dsrTables;
            
            if (analysis.dsrTables > 0) {
                console.log(`📄 ${file}: ${analysis.dsrTables} DSR tables`);
                
                analysis.tables.forEach(table => {
                    console.log(`  ✅ ${table.name}: ${table.description}`);
                    this.results.dsrDatabase.push(table);
                });
            }
        }

        console.log(`\n📊 DSR Database Summary:`);
        console.log(`  Total Tables: ${totalTables}`);
        console.log(`  DSR Tables: ${dsrTables}`);
        console.log(`  Coverage: ${totalTables > 0 ? Math.round((dsrTables / totalTables) * 100) : 0}%\n`);
    }

    async analyzeDSRImplementation() {
        console.log('📋 DSR IMPLEMENTATION ANALYSIS');
        console.log('===============================\n');

        // Check for required DSR rights
        for (const right of this.requiredDSRRights) {
            const isImplemented = this.checkDSRRightImplementation(right);
            
            if (isImplemented) {
                console.log(`✅ ${this.formatDSRRight(right)}: Implemented`);
                this.results.implementedRights.push({
                    right: right,
                    status: 'implemented',
                    description: this.getDSRRightDescription(right)
                });
            } else {
                console.log(`❌ ${this.formatDSRRight(right)}: Not implemented`);
                this.results.missingRights.push({
                    right: right,
                    status: 'missing',
                    description: this.getDSRRightDescription(right),
                    severity: 'high'
                });
            }
        }

        // Check for required endpoints
        console.log('\n🛣️  Required DSR Endpoints:');
        for (const endpoint of this.requiredEndpoints) {
            const isImplemented = this.checkEndpointImplementation(endpoint);
            
            if (isImplemented) {
                console.log(`✅ ${endpoint.method} ${endpoint.path}: ${endpoint.description}`);
            } else {
                console.log(`❌ ${endpoint.method} ${endpoint.path}: ${endpoint.description} - MISSING`);
                this.results.missingRights.push({
                    type: 'endpoint',
                    right: endpoint.right,
                    method: endpoint.method,
                    path: endpoint.path,
                    description: endpoint.description,
                    severity: 'critical'
                });
            }
        }
    }

    analyzeRouteFile(filePath, content) {
        const analysis = {
            totalEndpoints: 0,
            dsrEndpoints: 0,
            endpoints: []
        };

        // Count total endpoints
        const routeMatches = content.match(/router\.(get|post|put|delete|patch)\s*\(/gi);
        if (routeMatches) {
            analysis.totalEndpoints = routeMatches.length;
        }

        // Find DSR-related endpoints
        const dsrPatterns = [
            /\/me/g,
            /\/profile/g,
            /\/account/g,
            /\/export/g,
            /\/delete/g,
            /\/erasure/g,
            /\/portability/g,
            /\/object/g,
            /\/restrict/g,
            /\/withdraw/g,
            /dsar/g,
            /data.*subject/g
        ];

        const lines = content.split('\n');
        lines.forEach((line, index) => {
            dsrPatterns.forEach(pattern => {
                if (pattern.test(line)) {
                    const endpoint = this.extractEndpointFromLine(line, index + 1);
                    if (endpoint) {
                        analysis.endpoints.push(endpoint);
                        analysis.dsrEndpoints++;
                    }
                }
            });
        });

        return analysis;
    }

    analyzeServiceFile(filePath, content) {
        const analysis = {
            totalServices: 0,
            dsrServices: 0,
            services: []
        };

        // Count total services
        const serviceMatches = content.match(/export\s+(async\s+)?function\s+\w+/gi);
        if (serviceMatches) {
            analysis.totalServices = serviceMatches.length;
        }

        // Find DSR-related services
        const dsrPatterns = [
            /export.*data/i,
            /delete.*user/i,
            /update.*profile/i,
            /data.*portability/i,
            /consent.*withdraw/i,
            /dsar/i,
            /data.*subject/i
        ];

        const lines = content.split('\n');
        lines.forEach((line, index) => {
            dsrPatterns.forEach(pattern => {
                if (pattern.test(line)) {
                    const service = this.extractServiceFromLine(line, index + 1);
                    if (service) {
                        analysis.services.push(service);
                        analysis.dsrServices++;
                    }
                }
            });
        });

        return analysis;
    }

    analyzeMigrationFile(fileName, content) {
        const analysis = {
            totalTables: 0,
            dsrTables: 0,
            tables: []
        };

        // Count total tables
        const tableMatches = content.match(/CREATE TABLE.*?\(/gi);
        if (tableMatches) {
            analysis.totalTables = tableMatches.length;
        }

        // Find DSR-related tables
        const dsrTablePatterns = [
            /dsar_requests/i,
            /deletion_requests/i,
            /portability_requests/i,
            /consent_records/i,
            /user.*data/i,
            /audit.*log/i
        ];

        dsrTablePatterns.forEach(pattern => {
            if (pattern.test(content)) {
                const tableName = this.extractTableName(content, pattern);
                if (tableName) {
                    analysis.tables.push({
                        name: tableName,
                        description: this.getTableDescription(tableName),
                        file: fileName
                    });
                    analysis.dsrTables++;
                }
            }
        });

        return analysis;
    }

    checkDSRRightImplementation(right) {
        // Check if the right is implemented based on existing endpoints and services
        const hasEndpoint = this.results.dsrEndpoints.some(endpoint => 
            this.isEndpointForRight(endpoint, right)
        );
        
        const hasService = this.results.dsrServices.some(service => 
            this.isServiceForRight(service, right)
        );
        
        const hasDatabase = this.results.dsrDatabase.some(table => 
            this.isTableForRight(table, right)
        );

        return hasEndpoint || hasService || hasDatabase;
    }

    checkEndpointImplementation(endpoint) {
        return this.results.dsrEndpoints.some(existing => {
            const methodMatch = existing.method.toLowerCase() === endpoint.method.toLowerCase();
            const pathMatch = existing.path === endpoint.path || 
                            existing.path.includes(endpoint.path.split('/').pop()) ||
                            endpoint.path.includes(existing.path.split('/').pop());
            return methodMatch && pathMatch;
        });
    }

    extractEndpointFromLine(line, lineNumber) {
        const methodMatch = line.match(/router\.(get|post|put|delete|patch)/i);
        const pathMatch = line.match(/['"`]([^'"`]+)['"`]/);
        
        if (methodMatch && pathMatch) {
            return {
                method: methodMatch[1].toUpperCase(),
                path: pathMatch[1],
                description: this.getEndpointDescription(pathMatch[1]),
                line: lineNumber
            };
        }
        
        return null;
    }

    extractServiceFromLine(line, lineNumber) {
        const functionMatch = line.match(/export\s+(async\s+)?function\s+(\w+)/i);
        
        if (functionMatch) {
            return {
                name: functionMatch[2],
                description: this.getServiceDescription(functionMatch[2]),
                line: lineNumber
            };
        }
        
        return null;
    }

    extractTableName(content, pattern) {
        const match = content.match(pattern);
        if (match) {
            return match[0];
        }
        return null;
    }

    isEndpointForRight(endpoint, right) {
        const rightMappings = {
            'right_to_access': ['/me', '/export', '/profile'],
            'right_to_rectification': ['/profile', '/update'],
            'right_to_erasure': ['/delete', '/erasure'],
            'right_to_restrict_processing': ['/restrict'],
            'right_to_data_portability': ['/export', '/portability'],
            'right_to_object': ['/object'],
            'right_to_withdraw_consent': ['/withdraw', '/consent']
        };
        
        const patterns = rightMappings[right] || [];
        return patterns.some(pattern => endpoint.path.includes(pattern));
    }

    isServiceForRight(service, right) {
        const rightMappings = {
            'right_to_access': ['export', 'profile', 'get'],
            'right_to_rectification': ['update', 'profile', 'modify'],
            'right_to_erasure': ['delete', 'remove', 'erase'],
            'right_to_restrict_processing': ['restrict', 'limit'],
            'right_to_data_portability': ['export', 'portability'],
            'right_to_object': ['object', 'reject'],
            'right_to_withdraw_consent': ['withdraw', 'consent']
        };
        
        const patterns = rightMappings[right] || [];
        return patterns.some(pattern => service.name.toLowerCase().includes(pattern));
    }

    isTableForRight(table, right) {
        const rightMappings = {
            'right_to_access': ['dsar_requests', 'user_data'],
            'right_to_rectification': ['user_data', 'profile'],
            'right_to_erasure': ['deletion_requests', 'user_data'],
            'right_to_restrict_processing': ['user_data'],
            'right_to_data_portability': ['portability_requests'],
            'right_to_object': ['user_data'],
            'right_to_withdraw_consent': ['consent_records']
        };
        
        const patterns = rightMappings[right] || [];
        return patterns.some(pattern => table.name.toLowerCase().includes(pattern));
    }

    formatDSRRight(right) {
        return right.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    getDSRRightDescription(right) {
        const descriptions = {
            'right_to_access': 'Users can request and receive copies of their personal data',
            'right_to_rectification': 'Users can correct inaccurate or incomplete personal data',
            'right_to_erasure': 'Users can request deletion of their personal data (right to be forgotten)',
            'right_to_restrict_processing': 'Users can limit how their data is processed',
            'right_to_data_portability': 'Users can receive their data in a portable format',
            'right_to_object': 'Users can object to certain types of data processing',
            'right_to_withdraw_consent': 'Users can withdraw previously given consent'
        };
        return descriptions[right] || 'Data subject right';
    }

    getEndpointDescription(path) {
        if (path.includes('/me')) return 'User profile endpoint';
        if (path.includes('/export')) return 'Data export endpoint';
        if (path.includes('/delete')) return 'Account deletion endpoint';
        if (path.includes('/update')) return 'Profile update endpoint';
        if (path.includes('/consent')) return 'Consent management endpoint';
        return 'Data subject rights endpoint';
    }

    getServiceDescription(serviceName) {
        if (serviceName.includes('export')) return 'Data export service';
        if (serviceName.includes('delete')) return 'Account deletion service';
        if (serviceName.includes('update')) return 'Profile update service';
        if (serviceName.includes('consent')) return 'Consent management service';
        return 'Data subject rights service';
    }

    getTableDescription(tableName) {
        if (tableName.includes('dsar')) return 'Data Subject Access Requests';
        if (tableName.includes('deletion')) return 'Data deletion requests';
        if (tableName.includes('portability')) return 'Data portability requests';
        if (tableName.includes('consent')) return 'Consent management';
        return 'Data subject rights table';
    }

    getAllRouteFiles(dir) {
        const files = [];
        
        function traverse(currentDir) {
            const items = fs.readdirSync(currentDir);
            
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                    traverse(fullPath);
                } else if (stat.isFile() && (item.includes('route') || item.endsWith('.js'))) {
                    files.push(fullPath);
                }
            }
        }
        
        traverse(dir);
        return files;
    }

    getAllServiceFiles(dir) {
        const files = [];
        
        function traverse(currentDir) {
            const items = fs.readdirSync(currentDir);
            
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                    traverse(fullPath);
                } else if (stat.isFile() && (item.includes('service') || item.includes('Service')) && item.endsWith('.js')) {
                    files.push(fullPath);
                }
            }
        }
        
        traverse(dir);
        return files;
    }

    async calculateScore() {
        let score = 0;
        const maxScore = 100;
        
        // Score based on implemented rights (40 points)
        const implementedRights = this.results.implementedRights.length;
        const totalRights = this.requiredDSRRights.length;
        score += Math.round((implementedRights / totalRights) * 40);
        
        // Score based on DSR endpoints (30 points)
        const dsrEndpoints = this.results.dsrEndpoints.length;
        score += Math.min(dsrEndpoints * 5, 30);
        
        // Score based on DSR services (20 points)
        const dsrServices = this.results.dsrServices.length;
        score += Math.min(dsrServices * 3, 20);
        
        // Score based on DSR database tables (10 points)
        const dsrTables = this.results.dsrDatabase.length;
        score += Math.min(dsrTables * 2, 10);
        
        // Deduct points for missing critical rights
        const criticalMissing = this.results.missingRights.filter(r => r.severity === 'critical').length;
        score = Math.max(score - (criticalMissing * 10), 0);
        
        this.results.score = score;
        this.results.maxScore = maxScore;
        this.results.overallPercentage = Math.round((score / maxScore) * 100);
    }

    async generateAuditReport() {
        console.log('\n📊 DATA SUBJECT RIGHTS AUDIT SUMMARY');
        console.log('=====================================\n');

        const implementedRights = this.results.implementedRights.length;
        const missingRights = this.results.missingRights.length;
        const totalRights = this.requiredDSRRights.length;

        console.log(`🎯 Overall DSR Score: ${this.results.score}/${this.results.maxScore} (${this.results.overallPercentage}%)`);
        console.log();

        console.log('📈 Data Subject Rights Implementation:');
        console.log(`  ✅ Implemented: ${implementedRights}/${totalRights}`);
        console.log(`  ❌ Missing: ${missingRights}/${totalRights}`);
        console.log(`  📊 Coverage: ${Math.round((implementedRights / totalRights) * 100)}%`);
        console.log();

        console.log('🛣️  DSR Infrastructure:');
        console.log(`  📄 DSR Endpoints: ${this.results.dsrEndpoints.length}`);
        console.log(`  🔧 DSR Services: ${this.results.dsrServices.length}`);
        console.log(`  🗄️  DSR Database Tables: ${this.results.dsrDatabase.length}`);
        console.log();

        if (implementedRights >= totalRights * 0.8) {
            console.log('🎉 DATA SUBJECT RIGHTS AUDIT PASSED');
            console.log('   System has comprehensive DSR implementation!');
        } else {
            console.log('⚠️  DATA SUBJECT RIGHTS ISSUES FOUND');
            console.log('   Review the issues below before deployment:');
            console.log();

            // Show missing rights
            const criticalIssues = this.results.missingRights.filter(r => r.severity === 'critical');
            const highIssues = this.results.missingRights.filter(r => r.severity === 'high');
            
            if (criticalIssues.length > 0) {
                console.log('🔴 CRITICAL MISSING RIGHTS:');
                criticalIssues.slice(0, 5).forEach(right => {
                    console.log(`  - ${right.right}: ${right.description}`);
                });
                console.log();
            }
            
            if (highIssues.length > 0) {
                console.log('🟡 HIGH PRIORITY MISSING RIGHTS:');
                highIssues.slice(0, 5).forEach(right => {
                    console.log(`  - ${right.right}: ${right.description}`);
                });
                console.log();
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
        const missingRights = this.results.missingRights;
        
        if (missingRights.some(r => r.right === 'right_to_access')) {
            this.results.recommendations.push('Implement data export endpoint (GET /api/users/me/data-export)');
        }
        
        if (missingRights.some(r => r.right === 'right_to_erasure')) {
            this.results.recommendations.push('Implement account deletion endpoint (DELETE /api/users/me)');
        }
        
        if (missingRights.some(r => r.right === 'right_to_rectification')) {
            this.results.recommendations.push('Implement profile update endpoint (PUT /api/users/me)');
        }
        
        if (missingRights.some(r => r.right === 'right_to_data_portability')) {
            this.results.recommendations.push('Implement data portability endpoint (GET /api/users/me/export)');
        }
        
        if (missingRights.some(r => r.right === 'right_to_restrict_processing')) {
            this.results.recommendations.push('Implement processing restriction endpoint (POST /api/users/me/restrict)');
        }
        
        if (missingRights.some(r => r.right === 'right_to_object')) {
            this.results.recommendations.push('Implement objection endpoint (POST /api/users/me/object)');
        }
        
        if (missingRights.some(r => r.right === 'right_to_withdraw_consent')) {
            this.results.recommendations.push('Implement consent withdrawal endpoint (POST /api/users/me/withdraw-consent)');
        }

        this.results.recommendations.push('Ensure all DSR endpoints are properly authenticated and authorized');
        this.results.recommendations.push('Implement audit logging for all DSR operations');
        this.results.recommendations.push('Add rate limiting to DSR endpoints to prevent abuse');
        this.results.recommendations.push('Test all DSR endpoints for proper functionality');
        this.results.recommendations.push('Document DSR endpoints in API documentation');
    }

    async saveDetailedReport() {
        const reportPath = path.join(__dirname, '..', 'logs/data-subject-rights-audit-report.md');
        
        const implementedRights = this.results.implementedRights.length;
        const missingRights = this.results.missingRights.length;
        const totalRights = this.requiredDSRRights.length;
        
        const report = `# Data Subject Rights (DSR) Audit Report

**Date:** ${new Date().toISOString()}
**Overall Score:** ${this.results.score}/${this.results.maxScore} (${this.results.overallPercentage}%)
**Compliance Framework:** Kenya Data Protection Act 2019

## Executive Summary

This comprehensive Data Subject Rights audit evaluated the implementation of all seven fundamental data subject rights required under Kenya DPA 2019.

## Data Subject Rights Implementation

### Implemented Rights (${implementedRights}/${totalRights})
${this.results.implementedRights.map(right => 
`- **${this.formatDSRRight(right.right)}**: ✅ ${right.description}`
).join('\n')}

### Missing Rights (${missingRights}/${totalRights})
${this.results.missingRights.map(right => 
`- **${this.formatDSRRight(right.right)}**: ❌ ${right.description}`
).join('\n')}

## DSR Infrastructure

### DSR Endpoints (${this.results.dsrEndpoints.length})
${this.results.dsrEndpoints.map(endpoint => 
`- **${endpoint.method} ${endpoint.path}**: ${endpoint.description}`
).join('\n')}

### DSR Services (${this.results.dsrServices.length})
${this.results.dsrServices.map(service => 
`- **${service.name}**: ${service.description}`
).join('\n')}

### DSR Database Tables (${this.results.dsrDatabase.length})
${this.results.dsrDatabase.map(table => 
`- **${table.name}**: ${table.description}`
).join('\n')}

## Required DSR Endpoints

${this.requiredEndpoints.map(endpoint => {
  const isImplemented = this.results.dsrEndpoints.some(existing => 
    existing.method.toLowerCase() === endpoint.method.toLowerCase() &&
    existing.path === endpoint.path
  );
  return `- **${endpoint.method} ${endpoint.path}**: ${isImplemented ? '✅ Implemented' : '❌ Missing'} - ${endpoint.description}`;
}).join('\n')}

## Recommendations

${this.results.recommendations.map(rec => `- ${rec}`).join('\n')}

## Implementation Examples

### Right to Access (Data Export)
\`\`\`javascript
router.get('/api/users/me/data-export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Gather all user data
    const userData = await User.findByPk(userId);
    const visitorData = await Visitor.findAll({ where: { created_by: userId } });
    const accessLogs = await AccessLog.findAll({ where: { user_id: userId } });
    
    // Compile into exportable format
    const exportData = {
      personal_info: userData,
      visitors_registered: visitorData,
      access_logs: accessLogs,
      exported_at: new Date().toISOString()
    };
    
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ message: 'Export failed' });
  }
});
\`\`\`

### Right to Erasure (Account Deletion)
\`\`\`javascript
router.delete('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Anonymize instead of delete (for audit trail)
    await User.update({
      name: 'Deleted User',
      email: \`deleted_\${userId}@anonymized.com\`,
      phone: null,
      deleted_at: new Date()
    }, { where: { id: userId } });
    
    res.json({ message: 'Account successfully deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Deletion failed' });
  }
});
\`\`\`

## Next Steps

1. **Implement Missing DSR Endpoints**: Add all missing data subject rights endpoints
2. **Test DSR Functionality**: Ensure all endpoints work correctly
3. **Add Authentication**: Secure all DSR endpoints with proper authentication
4. **Audit Logging**: Log all DSR operations for compliance
5. **Rate Limiting**: Add rate limiting to prevent abuse
6. **Documentation**: Document all DSR endpoints in API documentation

---
*Report generated by Data Subject Rights Audit System*
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
    const auditor = new DataSubjectRightsAuditor();
    try {
        await auditor.run();
        process.exit(0);
    } catch (error) {
        console.error('Data Subject Rights audit failed:', error);
        process.exit(1);
    }
}

export default DataSubjectRightsAuditor;
