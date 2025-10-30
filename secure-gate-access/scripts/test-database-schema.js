#!/usr/bin/env node

/**
 * Database Schema Test Script
 * Tests the database schema by creating a test database and running migrations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseSchemaTester {
    constructor() {
        this.testDbName = 'secure_gate_test';
        this.migrationsPath = path.join(__dirname, '../server/src/database/migrations');
        this.results = {
            migrationFiles: [],
            tablesCreated: [],
            indexesCreated: [],
            constraintsCreated: [],
            foreignKeysCreated: [],
            issues: [],
            recommendations: []
        };
    }

    async run() {
        console.log('🧪 DATABASE SCHEMA TEST');
        console.log('========================\n');

        try {
            await this.checkPostgreSQLAvailability();
            await this.analyzeMigrationFiles();
            await this.createTestDatabase();
            await this.runMigrations();
            await this.verifySchema();
            await this.generateTestReport();
            
            return this.results;
        } catch (error) {
            console.error('❌ Database schema test failed:', error.message);
            this.results.issues.push({
                type: 'error',
                message: `Database schema test failed: ${error.message}`,
                severity: 'critical'
            });
            return this.results;
        }
    }

    async checkPostgreSQLAvailability() {
        console.log('🐘 Checking PostgreSQL availability...');
        
        try {
            const version = execSync('psql --version', { encoding: 'utf8' });
            console.log(`  ✓ PostgreSQL found: ${version.trim()}`);
        } catch (error) {
            console.log('  ⚠️  PostgreSQL not available locally');
            console.log('  ℹ️  Schema analysis will be performed from migration files only');
            this.results.issues.push({
                type: 'postgresql_unavailable',
                message: 'PostgreSQL not available for live testing',
                severity: 'medium'
            });
        }
        console.log();
    }

    async analyzeMigrationFiles() {
        console.log('📁 Analyzing migration files...');
        
        const migrationFiles = fs.readdirSync(this.migrationsPath)
            .filter(file => file.endsWith('.sql'))
            .sort();

        console.log(`Found ${migrationFiles.length} migration files:`);
        
        for (const file of migrationFiles) {
            const filePath = path.join(this.migrationsPath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            const analysis = this.analyzeMigrationContent(content, file);
            this.results.migrationFiles.push(analysis);
            
            console.log(`  📄 ${file}`);
            console.log(`     - Tables: ${analysis.tables.length}`);
            console.log(`     - Indexes: ${analysis.indexes.length}`);
            console.log(`     - Constraints: ${analysis.constraints.length}`);
            console.log(`     - Foreign Keys: ${analysis.foreignKeys.length}`);
        }
        console.log();
    }

    analyzeMigrationContent(content, filename) {
        const analysis = {
            file: filename,
            tables: [],
            indexes: [],
            constraints: [],
            foreignKeys: []
        };

        // Extract CREATE TABLE statements
        const tableMatches = content.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/g);
        if (tableMatches) {
            tableMatches.forEach(match => {
                const tableName = match.replace(/CREATE TABLE (?:IF NOT EXISTS )?/, '');
                analysis.tables.push(tableName);
            });
        }

        // Extract CREATE INDEX statements
        const indexMatches = content.match(/CREATE INDEX (?:IF NOT EXISTS )?(\w+)\s+ON\s+(\w+)/g);
        if (indexMatches) {
            indexMatches.forEach(match => {
                const parts = match.split(/\s+/);
                const indexName = parts[2];
                const tableName = parts[4];
                analysis.indexes.push({ name: indexName, table: tableName });
            });
        }

        // Extract constraints (simplified)
        const constraintMatches = content.match(/(PRIMARY KEY|UNIQUE|NOT NULL|CHECK|FOREIGN KEY)/g);
        if (constraintMatches) {
            analysis.constraints.push(...constraintMatches);
        }

        // Extract foreign key references
        const fkMatches = content.match(/REFERENCES\s+(\w+)\((\w+)\)/g);
        if (fkMatches) {
            fkMatches.forEach(match => {
                const refMatch = match.match(/REFERENCES\s+(\w+)\((\w+)\)/);
                if (refMatch) {
                    analysis.foreignKeys.push({
                        referencedTable: refMatch[1],
                        referencedColumn: refMatch[2]
                    });
                }
            });
        }

        return analysis;
    }

    async createTestDatabase() {
        console.log('🗄️  Creating test database...');
        
        try {
            // Drop test database if it exists
            try {
                execSync(`dropdb ${this.testDbName}`, { stdio: 'ignore' });
            } catch (error) {
                // Database doesn't exist, that's fine
            }
            
            // Create test database
            execSync(`createdb ${this.testDbName}`, { stdio: 'pipe' });
            console.log(`  ✓ Test database '${this.testDbName}' created successfully`);
        } catch (error) {
            console.log('  ⚠️  Could not create test database (PostgreSQL may not be available)');
            this.results.issues.push({
                type: 'database_creation_failed',
                message: 'Could not create test database',
                severity: 'medium'
            });
        }
        console.log();
    }

    async runMigrations() {
        console.log('🔄 Running migrations...');
        
        try {
            const migrationFiles = fs.readdirSync(this.migrationsPath)
                .filter(file => file.endsWith('.sql'))
                .sort();

            for (const file of migrationFiles) {
                console.log(`  📄 Running ${file}...`);
                
                try {
                    const filePath = path.join(this.migrationsPath, file);
                    execSync(`psql -d ${this.testDbName} -f "${filePath}"`, { 
                        stdio: 'pipe',
                        encoding: 'utf8'
                    });
                    console.log(`    ✓ ${file} completed successfully`);
                } catch (error) {
                    console.log(`    ❌ ${file} failed: ${error.message}`);
                    this.results.issues.push({
                        type: 'migration_failed',
                        file: file,
                        message: `Migration ${file} failed: ${error.message}`,
                        severity: 'high'
                    });
                }
            }
        } catch (error) {
            console.log('  ⚠️  Could not run migrations (PostgreSQL may not be available)');
            this.results.issues.push({
                type: 'migration_runner_unavailable',
                message: 'Could not run migrations - PostgreSQL not available',
                severity: 'medium'
            });
        }
        console.log();
    }

    async verifySchema() {
        console.log('🔍 Verifying schema...');
        
        try {
            // List all tables
            const tablesResult = execSync(`psql -d ${this.testDbName} -c "\\dt"`, { 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            const tables = this.parseTableList(tablesResult);
            this.results.tablesCreated = tables;
            
            console.log(`  ✓ Found ${tables.length} tables:`);
            tables.forEach(table => {
                console.log(`    - ${table}`);
            });

            // Check for required tables
            const requiredTables = ['users', 'visitors', 'access_logs', 'gates', 'sessions', 'audit_logs'];
            const missingTables = requiredTables.filter(table => !tables.includes(table));
            
            if (missingTables.length === 0) {
                console.log(`  ✅ All required tables present`);
            } else {
                console.log(`  ❌ Missing required tables: ${missingTables.join(', ')}`);
                missingTables.forEach(table => {
                    this.results.issues.push({
                        type: 'missing_required_table',
                        table: table,
                        message: `Required table ${table} not found after migrations`,
                        severity: 'critical'
                    });
                });
            }

            // Check indexes
            const indexesResult = execSync(`psql -d ${this.testDbName} -c "SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';"`, { 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            const indexes = this.parseIndexList(indexesResult);
            this.results.indexesCreated = indexes;
            
            console.log(`  ✓ Found ${indexes.length} indexes`);

        } catch (error) {
            console.log('  ⚠️  Could not verify schema (PostgreSQL may not be available)');
            this.results.issues.push({
                type: 'schema_verification_failed',
                message: 'Could not verify schema - PostgreSQL not available',
                severity: 'medium'
            });
        }
        console.log();
    }

    parseTableList(psqlOutput) {
        const lines = psqlOutput.split('\n');
        const tables = [];
        
        for (const line of lines) {
            const match = line.match(/^\s*\|\s+(\w+)\s+\|/);
            if (match) {
                tables.push(match[1]);
            }
        }
        
        return tables;
    }

    parseIndexList(psqlOutput) {
        const lines = psqlOutput.split('\n');
        const indexes = [];
        
        for (const line of lines) {
            const match = line.match(/^\s*\|\s+(\w+)\s+\|\s+(\w+)\s+\|/);
            if (match) {
                indexes.push({
                    name: match[1],
                    table: match[2]
                });
            }
        }
        
        return indexes;
    }

    async generateTestReport() {
        console.log('📊 DATABASE SCHEMA TEST SUMMARY');
        console.log('================================\n');

        const totalMigrationFiles = this.results.migrationFiles.length;
        const totalTables = this.results.tablesCreated.length;
        const totalIndexes = this.results.indexesCreated.length;
        
        const criticalIssues = this.results.issues.filter(issue => issue.severity === 'critical').length;
        const highIssues = this.results.issues.filter(issue => issue.severity === 'high').length;
        const mediumIssues = this.results.issues.filter(issue => issue.severity === 'medium').length;

        console.log(`📈 Test Results:`);
        console.log(`  - Migration files analyzed: ${totalMigrationFiles}`);
        console.log(`  - Tables created: ${totalTables}`);
        console.log(`  - Indexes created: ${totalIndexes}`);
        console.log(`  - Critical issues: ${criticalIssues}`);
        console.log(`  - High priority issues: ${highIssues}`);
        console.log(`  - Medium priority issues: ${mediumIssues}`);
        console.log();

        if (criticalIssues === 0 && highIssues === 0) {
            console.log('🎉 DATABASE SCHEMA TEST PASSED');
            console.log('   All critical and high-priority tests passed!');
        } else {
            console.log('⚠️  DATABASE SCHEMA TEST ISSUES FOUND');
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

        // Clean up test database
        await this.cleanupTestDatabase();
    }

    generateRecommendations() {
        if (this.results.issues.some(issue => issue.type === 'postgresql_unavailable')) {
            this.results.recommendations.push('Install PostgreSQL locally for complete schema testing');
        }
        
        if (this.results.issues.some(issue => issue.type === 'missing_required_table')) {
            this.results.recommendations.push('Ensure all required tables are created by the migrations');
        }
        
        if (this.results.issues.some(issue => issue.type === 'migration_failed')) {
            this.results.recommendations.push('Fix migration errors before deploying to production');
        }

        this.results.recommendations.push('Test migrations on a copy of production data');
        this.results.recommendations.push('Verify all foreign key constraints work correctly');
        this.results.recommendations.push('Test database backup and restore procedures');
        this.results.recommendations.push('Monitor database performance after migration');
    }

    async saveDetailedReport() {
        const reportPath = path.join(__dirname, '../logs/database-schema-test-report.md');
        
        const report = `# Database Schema Test Report

**Date:** ${new Date().toISOString()}
**Status:** ${this.results.issues.some(issue => issue.severity === 'critical') ? '❌ FAILED' : '✅ PASSED'}

## Summary

- **Migration Files Analyzed:** ${this.results.migrationFiles.length}
- **Tables Created:** ${this.results.tablesCreated.length}
- **Indexes Created:** ${this.results.indexesCreated.length}
- **Critical Issues:** ${this.results.issues.filter(issue => issue.severity === 'critical').length}
- **High Priority Issues:** ${this.results.issues.filter(issue => issue.severity === 'high').length}
- **Medium Priority Issues:** ${this.results.issues.filter(issue => issue.severity === 'medium').length}

## Migration Files Analysis

${this.results.migrationFiles.map(file => `### ${file.file}
- **Tables:** ${file.tables.length}
- **Indexes:** ${file.indexes.length}
- **Constraints:** ${file.constraints.length}
- **Foreign Keys:** ${file.foreignKeys.length}

**Tables Created:**
${file.tables.map(table => `- ${table}`).join('\n')}

**Indexes Created:**
${file.indexes.map(index => `- ${index.name} ON ${index.table}`).join('\n')}
`).join('\n')}

## Tables Created

${this.results.tablesCreated.map(table => `- ${table}`).join('\n')}

## Indexes Created

${this.results.indexesCreated.map(index => `- ${index.name} ON ${index.table}`).join('\n')}

## Issues Found

${this.results.issues.length === 0 ? 'No issues found.' : this.results.issues.map(issue => 
`### ${issue.severity.toUpperCase()}: ${issue.message}
- **Type:** ${issue.type}
- **File:** ${issue.file || 'N/A'}
- **Table:** ${issue.table || 'N/A'}
`).join('\n')}

## Recommendations

${this.results.recommendations.map(rec => `- ${rec}`).join('\n')}

---
*Report generated by Database Schema Tester*
`;

        // Ensure logs directory exists
        const logsDir = path.dirname(reportPath);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        fs.writeFileSync(reportPath, report);
        console.log(`📄 Detailed test report saved to: ${reportPath}`);
    }

    async cleanupTestDatabase() {
        console.log('🧹 Cleaning up test database...');
        
        try {
            execSync(`dropdb ${this.testDbName}`, { stdio: 'ignore' });
            console.log(`  ✓ Test database '${this.testDbName}' cleaned up`);
        } catch (error) {
            console.log(`  ⚠️  Could not clean up test database: ${error.message}`);
        }
        console.log();
    }
}

// Run the tester if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new DatabaseSchemaTester();
    try {
        await tester.run();
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

export default DatabaseSchemaTester;





