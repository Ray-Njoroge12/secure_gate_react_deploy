#!/usr/bin/env node

/**
 * Automated Data Cleanup Script
 * 
 * Implements data retention policies and automated cleanup
 * for compliance with Kenya DPA 2019 requirements.
 */

import { dbManager } from '../src/database/db.enhanced.js';
import loggingService from '../src/services/loggingService.js';
import { cleanupAuditLogs } from '../src/middleware/auditLogger.js';

/**
 * Data retention configuration
 */
const RETENTION_POLICIES = {
  // Visitor data - 90 days
  visitors: {
    table: 'visitors',
    retentionDays: 90,
    conditions: {
      status: ['CHECKED_OUT', 'REVOKED', 'EXPIRED']
    },
    description: 'Visitor records after checkout/revocation'
  },
  
  // Visitor access logs - 1 year
  visitorAccessLogs: {
    table: 'access_logs',
    retentionDays: 365,
    conditions: {
      entity_type: 'visitor'
    },
    description: 'Visitor access logs'
  },
  
  // Authentication logs - 6 months
  authLogs: {
    table: 'audit_logs',
    retentionDays: 180,
    conditions: {
      event_type: ['auth.login.success', 'auth.login.failed', 'auth.logout', 'auth.token.refresh']
    },
    description: 'Authentication logs'
  },
  
  // Security logs - 1 year
  securityLogs: {
    table: 'audit_logs',
    retentionDays: 365,
    conditions: {
      event_type: ['security.alert', 'security.suspicious', 'security.access.denied', 'security.rate_limit']
    },
    description: 'Security event logs'
  },
  
  // System audit logs - 7 years (legal requirement)
  systemAuditLogs: {
    table: 'audit_logs',
    retentionDays: 2555, // 7 years
    conditions: {
      event_type: ['admin.action', 'system.config', 'backup.trigger']
    },
    description: 'System audit logs (legal requirement)'
  },
  
  // Inactive user sessions - 30 days
  inactiveSessions: {
    table: 'sessions',
    retentionDays: 30,
    conditions: {
      last_access: 'inactive'
    },
    description: 'Inactive user sessions'
  },
  
  // OTP resend logs - 7 days
  otpResendLogs: {
    table: 'otp_resend_log',
    retentionDays: 7,
    conditions: {},
    description: 'OTP resend attempt logs'
  },
  
  // Temporary files and cache - 1 day
  tempData: {
    table: 'temp_data',
    retentionDays: 1,
    conditions: {},
    description: 'Temporary data and cache'
  }
};

/**
 * Cleanup statistics
 */
let cleanupStats = {
  totalRecordsDeleted: 0,
  tablesProcessed: 0,
  errors: 0,
  startTime: new Date(),
  endTime: null,
  duration: 0
};

/**
 * Main cleanup function
 */
async function runDataCleanup(options = {}) {
  const {
    dryRun = false,
    verbose = false,
    specificTables = null,
    forceCleanup = false
  } = options;
  
  console.log('🧹 Starting automated data cleanup...');
  console.log(`📅 Started at: ${cleanupStats.startTime.toISOString()}`);
  console.log(`🔍 Mode: ${dryRun ? 'DRY RUN' : 'LIVE CLEANUP'}`);
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No data will be deleted');
  }
  
  try {
    // Test database connection
    await testDatabaseConnection();
    
    // Process each retention policy
    const tablesToProcess = specificTables || Object.keys(RETENTION_POLICIES);
    
    for (const policyKey of tablesToProcess) {
      const policy = RETENTION_POLICIES[policyKey];
      if (!policy) {
        console.warn(`⚠️  Unknown policy: ${policyKey}`);
        continue;
      }
      
      await processRetentionPolicy(policyKey, policy, { dryRun, verbose });
    }
    
    // Cleanup audit logs using the audit logger function
    await cleanupAuditLogs(365); // 1 year retention
    
    // Finalize cleanup
    cleanupStats.endTime = new Date();
    cleanupStats.duration = cleanupStats.endTime - cleanupStats.startTime;
    
    // Log cleanup results
    await logCleanupResults();
    
    console.log('✅ Data cleanup completed successfully');
    console.log(`📊 Statistics:`, cleanupStats);
    
  } catch (error) {
    console.error('❌ Data cleanup failed:', error);
    cleanupStats.errors++;
    throw error;
  }
}

/**
 * Test database connection
 */
async function testDatabaseConnection() {
  try {
    await dbManager.query('SELECT 1');
    console.log('✅ Database connection verified');
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

/**
 * Process a single retention policy
 */
async function processRetentionPolicy(policyKey, policy, options) {
  const { dryRun, verbose } = options;
  
  try {
    console.log(`\n🔄 Processing ${policyKey}: ${policy.description}`);
    
    // Check if table exists
    const tableExists = await checkTableExists(policy.table);
    if (!tableExists) {
      console.log(`⚠️  Table ${policy.table} does not exist, skipping`);
      return;
    }
    
    // Build cleanup query
    const { query, values } = buildCleanupQuery(policy);
    
    if (verbose) {
      console.log(`📝 Query: ${query}`);
      console.log(`📊 Values: ${JSON.stringify(values)}`);
    }
    
    // Get count of records to be deleted
    const countQuery = buildCountQuery(policy);
    const countResult = await dbManager.query(countQuery, values);
    const recordsToDelete = parseInt(countResult.rows[0].count);
    
    console.log(`📊 Found ${recordsToDelete} records to delete`);
    
    if (recordsToDelete === 0) {
      console.log('✅ No records to delete');
      return;
    }
    
    if (dryRun) {
      console.log(`🔍 DRY RUN: Would delete ${recordsToDelete} records from ${policy.table}`);
      return;
    }
    
    // Execute cleanup
    const result = await dbManager.query(query, values);
    const deletedCount = result.rowCount || 0;
    
    console.log(`✅ Deleted ${deletedCount} records from ${policy.table}`);
    
    // Update statistics
    cleanupStats.totalRecordsDeleted += deletedCount;
    cleanupStats.tablesProcessed++;
    
    // Log the cleanup event
    await logCleanupEvent(policyKey, policy, deletedCount);
    
  } catch (error) {
    console.error(`❌ Failed to process ${policyKey}:`, error.message);
    cleanupStats.errors++;
    
    if (verbose) {
      console.error('Stack trace:', error.stack);
    }
  }
}

/**
 * Check if table exists
 */
async function checkTableExists(tableName) {
  try {
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `;
    const result = await dbManager.query(query, [tableName]);
    return result.rows[0].exists;
  } catch (error) {
    return false;
  }
}

/**
 * Build cleanup query based on policy
 */
function buildCleanupQuery(policy) {
  const { table, retentionDays, conditions } = policy;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  let query = `DELETE FROM ${table} WHERE `;
  const values = [];
  let paramCount = 0;
  
  // Add date condition based on table
  if (table === 'visitors') {
    query += `(status = ANY($${++paramCount}) AND updated_at < $${++paramCount})`;
    values.push(Object.values(conditions.status), cutoffDate);
  } else if (table === 'access_logs') {
    query += `(entity_type = $${++paramCount} AND created_at < $${++paramCount})`;
    values.push(conditions.entity_type, cutoffDate);
  } else if (table === 'audit_logs') {
    query += `(event_type = ANY($${++paramCount}) AND timestamp < $${++paramCount})`;
    values.push(Object.values(conditions.event_type), cutoffDate);
  } else if (table === 'sessions') {
    query += `last_access < $${++paramCount}`;
    values.push(cutoffDate);
  } else if (table === 'otp_resend_log') {
    query += `created_at < $${++paramCount}`;
    values.push(cutoffDate);
  } else if (table === 'temp_data') {
    query += `created_at < $${++paramCount}`;
    values.push(cutoffDate);
  } else {
    // Generic cleanup for other tables
    query += `created_at < $${++paramCount}`;
    values.push(cutoffDate);
  }
  
  return { query, values };
}

/**
 * Build count query for dry run
 */
function buildCountQuery(policy) {
  const { table, retentionDays, conditions } = policy;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  let query = `SELECT COUNT(*) FROM ${table} WHERE `;
  const values = [];
  let paramCount = 0;
  
  // Add date condition based on table
  if (table === 'visitors') {
    query += `(status = ANY($${++paramCount}) AND updated_at < $${++paramCount})`;
    values.push(Object.values(conditions.status), cutoffDate);
  } else if (table === 'access_logs') {
    query += `(entity_type = $${++paramCount} AND created_at < $${++paramCount})`;
    values.push(conditions.entity_type, cutoffDate);
  } else if (table === 'audit_logs') {
    query += `(event_type = ANY($${++paramCount}) AND timestamp < $${++paramCount})`;
    values.push(Object.values(conditions.event_type), cutoffDate);
  } else if (table === 'sessions') {
    query += `last_access < $${++paramCount}`;
    values.push(cutoffDate);
  } else if (table === 'otp_resend_log') {
    query += `created_at < $${++paramCount}`;
    values.push(cutoffDate);
  } else if (table === 'temp_data') {
    query += `created_at < $${++paramCount}`;
    values.push(cutoffDate);
  } else {
    // Generic cleanup for other tables
    query += `created_at < $${++paramCount}`;
    values.push(cutoffDate);
  }
  
  return { query, values };
}

/**
 * Log cleanup event
 */
async function logCleanupEvent(policyKey, policy, deletedCount) {
  try {
    const event = {
      type: 'data.cleanup',
      policy: policyKey,
      table: policy.table,
      deletedCount,
      retentionDays: policy.retentionDays,
      timestamp: new Date().toISOString()
    };
    
    await loggingService.logInfo('Data cleanup completed', event);
  } catch (error) {
    console.warn('⚠️  Failed to log cleanup event:', error.message);
  }
}

/**
 * Log cleanup results
 */
async function logCleanupResults() {
  try {
    const results = {
      type: 'data.cleanup.summary',
      ...cleanupStats,
      success: cleanupStats.errors === 0
    };
    
    await loggingService.logInfo('Data cleanup summary', results);
  } catch (error) {
    console.warn('⚠️  Failed to log cleanup results:', error.message);
  }
}

/**
 * Anonymize data before deletion
 */
async function anonymizeData(tableName, records) {
  try {
    console.log(`🔒 Anonymizing ${records.length} records from ${tableName}`);
    
    // Define anonymization rules for each table
    const anonymizationRules = {
      visitors: {
        name: 'Anonymous Visitor',
        email: 'anonymous@example.com',
        phone: '0000000000'
      },
      users: {
        username: 'anonymous_user',
        email: 'anonymous@example.com',
        phone: '0000000000'
      },
      audit_logs: {
        user_email: 'anonymous@example.com',
        ip_address: '0.0.0.0',
        user_agent: 'Anonymous'
      }
    };
    
    const rules = anonymizationRules[tableName];
    if (!rules) {
      console.log(`⚠️  No anonymization rules for ${tableName}`);
      return;
    }
    
    // Anonymize records
    for (const record of records) {
      const updateQuery = buildAnonymizationQuery(tableName, record.id, rules);
      if (updateQuery) {
        await dbManager.query(updateQuery.query, updateQuery.values);
      }
    }
    
    console.log(`✅ Anonymized ${records.length} records`);
    
  } catch (error) {
    console.error(`❌ Failed to anonymize data:`, error.message);
  }
}

/**
 * Build anonymization query
 */
function buildAnonymizationQuery(tableName, recordId, rules) {
  const fields = Object.keys(rules);
  const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
  const values = [recordId, ...Object.values(rules)];
  
  return {
    query: `UPDATE ${tableName} SET ${setClause} WHERE id = $1`,
    values
  };
}

/**
 * Schedule cleanup tasks
 */
export function scheduleCleanupTasks() {
  // Daily cleanup for short-term data
  setInterval(async () => {
    try {
      await runDataCleanup({
        dryRun: false,
        verbose: false,
        specificTables: ['visitors', 'otpResendLogs', 'tempData']
      });
    } catch (error) {
      console.error('❌ Scheduled daily cleanup failed:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
  
  // Weekly cleanup for medium-term data
  setInterval(async () => {
    try {
      await runDataCleanup({
        dryRun: false,
        verbose: false,
        specificTables: ['visitorAccessLogs', 'authLogs', 'inactiveSessions']
      });
    } catch (error) {
      console.error('❌ Scheduled weekly cleanup failed:', error);
    }
  }, 7 * 24 * 60 * 60 * 1000); // 7 days
  
  // Monthly cleanup for long-term data
  setInterval(async () => {
    try {
      await runDataCleanup({
        dryRun: false,
        verbose: false,
        specificTables: ['securityLogs']
      });
    } catch (error) {
      console.error('❌ Scheduled monthly cleanup failed:', error);
    }
  }, 30 * 24 * 60 * 60 * 1000); // 30 days
  
  console.log('📅 Data cleanup tasks scheduled');
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    force: args.includes('--force'),
    specificTables: null
  };
  
  // Parse specific tables argument
  const tablesIndex = args.indexOf('--tables');
  if (tablesIndex !== -1 && args[tablesIndex + 1]) {
    options.specificTables = args[tablesIndex + 1].split(',');
  }
  
  try {
    await runDataCleanup(options);
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runDataCleanup, scheduleCleanupTasks, RETENTION_POLICIES };
