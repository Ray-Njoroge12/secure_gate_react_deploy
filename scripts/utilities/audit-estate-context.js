/**
 * Estate Context Audit Script
 * Scans codebase for database queries that may be missing estate_id filtering
 * Part of Security Implementation Plan - Sprint 1.2
 * 
 * Usage: node scripts/audit-estate-context.js
 * 
 * This script identifies potential cross-estate data leakage vulnerabilities
 * by finding SQL queries on multi-tenant tables that don't filter by estate_id.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tables that should ALWAYS have estate_id filtering for security
const SENSITIVE_TABLES = [
    'visitors',
    'users',
    'qr_codes',
    'visitor_passes',
    'announcements',
    'incidents',
    'deliveries',
    'audit_logs',
    'notifications'
];

// Directories to scan
const SCAN_DIRECTORIES = [
    path.join(__dirname, '../secure-gate-access/server/src/controllers'),
    path.join(__dirname, '../secure-gate-access/server/src/routes'),
    path.join(__dirname, '../secure-gate-access/server/src/services')
];

// Files to skip (already known to be safe or not applicable)
const SKIP_FILES = [
    'authRoutes.js', // Auth routes legitimately access without estate_id
    'healthRoutes.js',
    'tenantProvisioningRoutes.js' // Manages estates themselves
];

// Regex patterns to find SQL queries
const QUERY_PATTERNS = [
    /dbManager\.query\s*\(\s*[`'"]([^`'"]+)[`'"]/g,
    /dbManager\.query\s*\(\s*`([\s\S]*?)`/g,
    /pool\.query\s*\(\s*[`'"]([^`'"]+)[`'"]/g,
    /client\.query\s*\(\s*[`'"]([^`'"]+)[`'"]/g
];

// Results storage
const issues = [];
const safeQueries = [];
let filesScanned = 0;
let queriesAnalyzed = 0;

/**
 * Check if a query touches sensitive tables
 */
function touchesSensitiveTable(query) {
    const normalizedQuery = query.toLowerCase();

    for (const table of SENSITIVE_TABLES) {
        // Check for table name in FROM, JOIN, INTO, UPDATE clauses
        const patterns = [
            new RegExp(`\\bfrom\\s+${table}\\b`, 'i'),
            new RegExp(`\\bjoin\\s+${table}\\b`, 'i'),
            new RegExp(`\\binto\\s+${table}\\b`, 'i'),
            new RegExp(`\\bupdate\\s+${table}\\b`, 'i'),
            new RegExp(`\\bdelete\\s+from\\s+${table}\\b`, 'i')
        ];

        for (const pattern of patterns) {
            if (pattern.test(query)) {
                return table;
            }
        }
    }

    return null;
}

/**
 * Check if query has estate_id filtering
 */
function hasEstateFiltering(query) {
    const normalizedQuery = query.toLowerCase();

    // Check for various estate filtering patterns
    const estatePatterns = [
        /estate_id\s*=/i,
        /estate_id\s+is\s+not\s+distinct\s+from/i,
        /\.estate_id\s*=/i,
        /where.*estate_id/i,
        /and\s+estate_id/i,
        /estate_id\s*\$\d+/i
    ];

    return estatePatterns.some(pattern => pattern.test(query));
}

/**
 * Get line number for a match in content
 */
function getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
}

/**
 * Analyze a single file for estate context issues
 */
function analyzeFile(filePath) {
    const fileName = path.basename(filePath);

    if (SKIP_FILES.includes(fileName)) {
        return;
    }

    let content;
    try {
        content = fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        console.error(`  ⚠️ Cannot read file: ${filePath}`);
        return;
    }

    filesScanned++;

    // Find all SQL queries in the file
    for (const pattern of QUERY_PATTERNS) {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);

        while ((match = regex.exec(content)) !== null) {
            const query = match[1];
            queriesAnalyzed++;

            // Check if query touches sensitive tables
            const sensitiveTable = touchesSensitiveTable(query);

            if (sensitiveTable) {
                const lineNumber = getLineNumber(content, match.index);
                const hasEstate = hasEstateFiltering(query);

                if (!hasEstate) {
                    issues.push({
                        file: filePath,
                        fileName,
                        line: lineNumber,
                        table: sensitiveTable,
                        severity: 'HIGH',
                        query: query.substring(0, 150).replace(/\s+/g, ' ').trim() + (query.length > 150 ? '...' : ''),
                        recommendation: `Add estate_id filtering: AND ${sensitiveTable}.estate_id = $X`
                    });
                } else {
                    safeQueries.push({
                        file: fileName,
                        line: lineNumber,
                        table: sensitiveTable,
                        status: 'OK'
                    });
                }
            }
        }
    }
}

/**
 * Recursively scan a directory
 */
function scanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        console.error(`  ⚠️ Directory not found: ${dirPath}`);
        return;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            // Skip node_modules and test directories
            if (!['node_modules', '__tests__', 'test', 'tests'].includes(entry.name)) {
                scanDirectory(fullPath);
            }
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            analyzeFile(fullPath);
        }
    }
}

/**
 * Generate report
 */
function generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 ESTATE CONTEXT AUDIT REPORT');
    console.log('='.repeat(80));
    console.log(`\n📊 Scan Summary:`);
    console.log(`   Files scanned: ${filesScanned}`);
    console.log(`   Queries analyzed: ${queriesAnalyzed}`);
    console.log(`   Safe queries: ${safeQueries.length}`);
    console.log(`   Issues found: ${issues.length}`);

    if (issues.length === 0) {
        console.log('\n✅ No estate context issues found!');
        return;
    }

    console.log('\n' + '-'.repeat(80));
    console.log('⚠️  ISSUES REQUIRING ATTENTION');
    console.log('-'.repeat(80));

    // Group by file
    const byFile = {};
    for (const issue of issues) {
        if (!byFile[issue.fileName]) {
            byFile[issue.fileName] = [];
        }
        byFile[issue.fileName].push(issue);
    }

    let issueNum = 1;
    for (const [fileName, fileIssues] of Object.entries(byFile)) {
        console.log(`\n📁 ${fileName}`);
        console.log(`   Path: ${fileIssues[0].file}`);

        for (const issue of fileIssues) {
            console.log(`\n   ${issueNum}. [${issue.severity}] Line ${issue.line}`);
            console.log(`      Table: ${issue.table}`);
            console.log(`      Query: ${issue.query}`);
            console.log(`      Fix: ${issue.recommendation}`);
            issueNum++;
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📋 RECOMMENDED ACTIONS');
    console.log('='.repeat(80));
    console.log(`
1. Review each flagged query to confirm it needs estate filtering
2. Add estate_id parameter to the WHERE clause
3. Ensure the route has requireEstateContext middleware
4. Add unit tests to verify estate isolation
5. Consider adding a database trigger for additional protection

Example fix:
  // BEFORE (Vulnerable)
  const result = await dbManager.query(
    'SELECT * FROM visitors WHERE id = $1',
    [visitorId]
  );

  // AFTER (Secure)
  const result = await dbManager.query(
    'SELECT * FROM visitors WHERE id = $1 AND estate_id = $2',
    [visitorId, req.user.estate_id]
  );
`);

    // Generate JSON report for CI/CD
    const reportPath = path.join(__dirname, '../estate-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
            filesScanned,
            queriesAnalyzed,
            safeQueries: safeQueries.length,
            issuesFound: issues.length
        },
        issues,
        safeQueries
    }, null, 2));

    console.log(`\n📄 Full report saved to: ${reportPath}`);
}

// Main execution
console.log('🔍 Starting Estate Context Audit...\n');

for (const dir of SCAN_DIRECTORIES) {
    console.log(`Scanning: ${dir}`);
    scanDirectory(dir);
}

generateReport();

// Exit with error code if issues found (for CI/CD)
if (issues.length > 0) {
    console.log(`\n❌ Audit failed: ${issues.length} issues require attention\n`);
    process.exit(1);
} else {
    console.log('\n✅ Audit passed: All queries have proper estate filtering\n');
    process.exit(0);
}
