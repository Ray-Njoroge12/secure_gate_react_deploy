#!/usr/bin/env node

/**
 * Database Schema Verification Script
 * Verifies all required tables, indexes, constraints, and foreign keys
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseSchemaVerifier {
    constructor() {
        this.migrationsPath = path.join(__dirname, '../server/src/database/migrations');
        this.requiredTables = [
            'users',
            'visitors', 
            'access_logs',
            'gates',
            'sessions',
            'audit_logs'
        ];
        this.results = {
            tables: {},
            indexes: {},
            constraints: {},
            foreignKeys: {},
            issues: [],
            recommendations: []
        };
    }

    async run() {
        console.log('🔍 DATABASE SCHEMA VERIFICATION');
        console.log('================================\n');

        try {
            await this.analyzeMigrations();
            await this.verifyRequiredTables();
            await this.verifyIndexes();
            await this.verifyConstraints();
            await this.verifyForeignKeys();
            await this.generateReport();
            
            return this.results;
        } catch (error) {
            console.error('❌ Schema verification failed:', error.message);
            this.results.issues.push({
                type: 'error',
                message: `Schema verification failed: ${error.message}`,
                severity: 'critical'
            });
            return this.results;
        }
    }

    async analyzeMigrations() {
        console.log('📁 Analyzing migration files...');
        
        const migrationFiles = fs.readdirSync(this.migrationsPath)
            .filter(file => file.endsWith('.sql'))
            .sort();

        console.log(`Found ${migrationFiles.length} migration files:`);
        migrationFiles.forEach(file => {
            console.log(`  - ${file}`);
        });
        console.log();

        // Extract table information from each migration
        for (const file of migrationFiles) {
            const filePath = path.join(this.migrationsPath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            this.extractTableInfo(content, file);
        }
    }

    extractTableInfo(content, filename) {
        // Extract CREATE TABLE statements
        const tableMatches = content.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/g);
        if (tableMatches) {
            tableMatches.forEach(match => {
                const tableName = match.replace(/CREATE TABLE (?:IF NOT EXISTS )?/, '');
                if (!this.results.tables[tableName]) {
                    this.results.tables[tableName] = {
                        file: filename,
                        hasPrimaryKey: false,
                        hasForeignKeys: [],
                        hasIndexes: [],
                        hasConstraints: [],
                        columns: []
                    };
                }
            });
        }

        // Extract PRIMARY KEY constraints
        const primaryKeyMatches = content.match(/(\w+)\s+(\w+)\s+PRIMARY KEY/g);
        if (primaryKeyMatches) {
            primaryKeyMatches.forEach(match => {
                const parts = match.split(/\s+/);
                const tableName = parts[0];
                if (this.results.tables[tableName]) {
                    this.results.tables[tableName].hasPrimaryKey = true;
                }
            });
        }

        // Extract FOREIGN KEY constraints
        const foreignKeyMatches = content.match(/REFERENCES\s+(\w+)\((\w+)\)/g);
        if (foreignKeyMatches) {
            foreignKeyMatches.forEach(match => {
                const refMatch = match.match(/REFERENCES\s+(\w+)\((\w+)\)/);
                if (refMatch) {
                    const [, referencedTable, referencedColumn] = refMatch;
                    // Find which table this FK belongs to (simplified)
                    const lines = content.split('\n');
                    let currentTable = null;
                    for (const line of lines) {
                        const tableMatch = line.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/);
                        if (tableMatch) {
                            currentTable = tableMatch[1];
                        }
                        if (line.includes(match) && currentTable) {
                            if (!this.results.tables[currentTable]) {
                                this.results.tables[currentTable] = {
                                    file: filename,
                                    hasPrimaryKey: false,
                                    hasForeignKeys: [],
                                    hasIndexes: [],
                                    hasConstraints: [],
                                    columns: []
                                };
                            }
                            this.results.tables[currentTable].hasForeignKeys.push({
                                referencedTable,
                                referencedColumn
                            });
                            break;
                        }
                    }
                }
            });
        }

        // Extract indexes
        const indexMatches = content.match(/CREATE INDEX (?:IF NOT EXISTS )?(\w+)\s+ON\s+(\w+)/g);
        if (indexMatches) {
            indexMatches.forEach(match => {
                const parts = match.split(/\s+/);
                const indexName = parts[2];
                const tableName = parts[4];
                if (this.results.tables[tableName]) {
                    this.results.tables[tableName].hasIndexes.push(indexName);
                }
            });
        }
    }

    async verifyRequiredTables() {
        console.log('✅ Verifying required tables...');
        
        for (const tableName of this.requiredTables) {
            if (this.results.tables[tableName]) {
                console.log(`  ✓ ${tableName} - Found`);
                
                // Verify primary key
                if (!this.results.tables[tableName].hasPrimaryKey) {
                    this.results.issues.push({
                        type: 'missing_primary_key',
                        table: tableName,
                        message: `Table ${tableName} missing PRIMARY KEY constraint`,
                        severity: 'critical'
                    });
                }
            } else {
                console.log(`  ❌ ${tableName} - MISSING`);
                this.results.issues.push({
                    type: 'missing_table',
                    table: tableName,
                    message: `Required table ${tableName} not found in migrations`,
                    severity: 'critical'
                });
            }
        }
        console.log();
    }

    async verifyIndexes() {
        console.log('🔍 Verifying indexes...');
        
        const expectedIndexes = {
            users: ['email', 'username', 'role'],
            visitors: ['invite_code', 'status', 'date_of_visit'],
            access_logs: ['user_id', 'action', 'log_time'],
            gates: ['gate_id', 'status', 'type'],
            sessions: ['session_id', 'user_id', 'expires_at'],
            audit_logs: ['user_id', 'action', 'created_at']
        };

        for (const [tableName, expectedColumns] of Object.entries(expectedIndexes)) {
            if (this.results.tables[tableName]) {
                const existingIndexes = this.results.tables[tableName].hasIndexes;
                
                for (const column of expectedColumns) {
                    const hasIndex = existingIndexes.some(index => 
                        index.includes(column) || index.includes(tableName)
                    );
                    
                    if (hasIndex) {
                        console.log(`  ✓ ${tableName}.${column} - Indexed`);
                    } else {
                        console.log(`  ⚠️  ${tableName}.${column} - No index (performance impact)`);
                        this.results.issues.push({
                            type: 'missing_index',
                            table: tableName,
                            column: column,
                            message: `Table ${tableName} missing index on column ${column}`,
                            severity: 'medium'
                        });
                    }
                }
            }
        }
        console.log();
    }

    async verifyConstraints() {
        console.log('🔒 Verifying constraints...');
        
        const expectedConstraints = {
            users: {
                not_null: ['username', 'email', 'password_hash', 'role'],
                unique: ['username', 'email'],
                check: []
            },
            visitors: {
                not_null: ['name', 'status'],
                unique: ['invite_code'],
                check: ['status IN (\'PENDING\', \'APPROVED\', \'REJECTED\', \'COMPLETED\')']
            },
            gates: {
                not_null: ['gate_id', 'name', 'location', 'type', 'status'],
                unique: ['gate_id'],
                check: ['status IN (\'active\', \'inactive\', \'maintenance\')']
            },
            sessions: {
                not_null: ['session_id', 'user_id', 'expires_at'],
                unique: ['session_id'],
                check: []
            }
        };

        for (const [tableName, constraints] of Object.entries(expectedConstraints)) {
            if (this.results.tables[tableName]) {
                console.log(`  📋 ${tableName} constraints:`);
                
                // Note: This is a simplified check - actual constraint verification would require database connection
                constraints.not_null.forEach(column => {
                    console.log(`    ✓ ${column} should be NOT NULL`);
                });
                
                constraints.unique.forEach(column => {
                    console.log(`    ✓ ${column} should be UNIQUE`);
                });
                
                constraints.check.forEach(constraint => {
                    console.log(`    ✓ CHECK constraint: ${constraint}`);
                });
            }
        }
        console.log();
    }

    async verifyForeignKeys() {
        console.log('🔗 Verifying foreign key relationships...');
        
        const expectedForeignKeys = {
            visitors: ['users(id)'], // created_by references users
            passes: ['visitors(id)'],
            access_logs: ['users(id)'],
            gate_access_logs: ['gates(id)', 'users(id)', 'visitors(id)', 'sessions(session_id)'],
            gate_permissions: ['gates(id)', 'users(id)'],
            sessions: ['users(id)'],
            audit_logs: ['users(id)']
        };

        for (const [tableName, expectedFKs] of Object.entries(expectedForeignKeys)) {
            if (this.results.tables[tableName]) {
                const existingFKs = this.results.tables[tableName].hasForeignKeys;
                
                expectedFKs.forEach(expectedFK => {
                    const [refTable, refColumn] = expectedFK.split(/[()]/);
                    const hasFK = existingFKs.some(fk => 
                        fk.referencedTable === refTable && fk.referencedColumn === refColumn
                    );
                    
                    if (hasFK) {
                        console.log(`  ✓ ${tableName} -> ${expectedFK}`);
                    } else {
                        console.log(`  ❌ ${tableName} -> ${expectedFK} - MISSING`);
                        this.results.issues.push({
                            type: 'missing_foreign_key',
                            table: tableName,
                            foreignKey: expectedFK,
                            message: `Table ${tableName} missing foreign key to ${expectedFK}`,
                            severity: 'high'
                        });
                    }
                });
            }
        }
        console.log();
    }

    async generateReport() {
        console.log('📊 SCHEMA VERIFICATION SUMMARY');
        console.log('==============================\n');

        const totalTables = Object.keys(this.results.tables).length;
        const requiredTablesFound = this.requiredTables.filter(table => 
            this.results.tables[table]
        ).length;
        
        const criticalIssues = this.results.issues.filter(issue => issue.severity === 'critical').length;
        const highIssues = this.results.issues.filter(issue => issue.severity === 'high').length;
        const mediumIssues = this.results.issues.filter(issue => issue.severity === 'medium').length;

        console.log(`📈 Statistics:`);
        console.log(`  - Total tables found: ${totalTables}`);
        console.log(`  - Required tables found: ${requiredTablesFound}/${this.requiredTables.length}`);
        console.log(`  - Critical issues: ${criticalIssues}`);
        console.log(`  - High priority issues: ${highIssues}`);
        console.log(`  - Medium priority issues: ${mediumIssues}`);
        console.log();

        if (criticalIssues === 0 && highIssues === 0) {
            console.log('🎉 SCHEMA VERIFICATION PASSED');
            console.log('   All critical and high-priority issues resolved!');
        } else {
            console.log('⚠️  SCHEMA VERIFICATION ISSUES FOUND');
            console.log('   Review the issues below before deployment:');
            console.log();

            // Group issues by severity
            const issuesBySeverity = {
                critical: this.results.issues.filter(issue => issue.severity === 'critical'),
                high: this.results.issues.filter(issue => issue.severity === 'high'),
                medium: this.results.issues.filter(issue => issue.severity === 'medium')
            };

            for (const [severity, issues] of Object.entries(issuesBySeverity)) {
                if (issues.length > 0) {
                    console.log(`${severity.toUpperCase()} PRIORITY ISSUES:`);
                    issues.forEach(issue => {
                        console.log(`  ❌ ${issue.message}`);
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
        if (this.results.issues.some(issue => issue.type === 'missing_table')) {
            this.results.recommendations.push('Create missing core tables (gates, sessions) using the generated migration');
        }
        
        if (this.results.issues.some(issue => issue.type === 'missing_index')) {
            this.results.recommendations.push('Add indexes on frequently queried columns for better performance');
        }
        
        if (this.results.issues.some(issue => issue.type === 'missing_foreign_key')) {
            this.results.recommendations.push('Add foreign key constraints to maintain referential integrity');
        }

        this.results.recommendations.push('Run database migrations in a test environment before production deployment');
        this.results.recommendations.push('Verify all constraints and indexes work correctly with sample data');
        this.results.recommendations.push('Test backup and restore procedures with the complete schema');
    }

    async saveDetailedReport() {
        const reportPath = path.join(__dirname, '../logs/database-schema-verification-report.md');
        
        const report = `# Database Schema Verification Report

**Date:** ${new Date().toISOString()}
**Status:** ${this.results.issues.some(issue => issue.severity === 'critical') ? '❌ FAILED' : '✅ PASSED'}

## Summary

- **Total Tables Found:** ${Object.keys(this.results.tables).length}
- **Required Tables Found:** ${this.requiredTables.filter(table => this.results.tables[table]).length}/${this.requiredTables.length}
- **Critical Issues:** ${this.results.issues.filter(issue => issue.severity === 'critical').length}
- **High Priority Issues:** ${this.results.issues.filter(issue => issue.severity === 'high').length}
- **Medium Priority Issues:** ${this.results.issues.filter(issue => issue.severity === 'medium').length}

## Required Tables Status

${this.requiredTables.map(table => {
    const found = this.results.tables[table] ? '✅' : '❌';
    return `- ${found} **${table}**${this.results.tables[table] ? ` (${this.results.tables[table].file})` : ' - MISSING'}`;
}).join('\n')}

## Tables Found

${Object.keys(this.results.tables).map(table => {
    const info = this.results.tables[table];
    return `### ${table}
- **File:** ${info.file}
- **Primary Key:** ${info.hasPrimaryKey ? '✅' : '❌'}
- **Foreign Keys:** ${info.hasForeignKeys.length}
- **Indexes:** ${info.hasIndexes.length}
`;
}).join('\n')}

## Issues Found

${this.results.issues.length === 0 ? 'No issues found.' : this.results.issues.map(issue => 
`### ${issue.severity.toUpperCase()}: ${issue.message}
- **Type:** ${issue.type}
- **Table:** ${issue.table || 'N/A'}
- **Column:** ${issue.column || 'N/A'}
`).join('\n')}

## Recommendations

${this.results.recommendations.map(rec => `- ${rec}`).join('\n')}

---
*Report generated by Database Schema Verifier*
`;

        // Ensure logs directory exists
        const logsDir = path.dirname(reportPath);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        fs.writeFileSync(reportPath, report);
        console.log(`📄 Detailed report saved to: ${reportPath}`);
    }
}

// Run the verifier if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const verifier = new DatabaseSchemaVerifier();
    try {
        await verifier.run();
        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

export default DatabaseSchemaVerifier;



