import pool from './src/database/db.js';
import { auditLog } from './src/services/auditService.js';

async function testAuditLog() {
    try {
        console.log('Testing audit log with UUID...');
        
        // Test with a known UUID from the database
        const testUserId = '3ed64e11-a72a-4fd4-aa7f-a20c13404a66'; // resident@test.com
        
        await auditLog(testUserId, 'test.action', 'test_entity', 'test_id', { test: 'data' }, '127.0.0.1');
        console.log('✅ Audit log insertion successful');
        
        // Check if it was inserted
        const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1');
        console.log('Latest audit log entry:');
        console.table(result.rows[0]);
        
    } catch (error) {
        console.error('❌ Audit log failed:', error.message);
        console.error('Full error:', error);
    } finally {
        process.exit(0);
    }
}

testAuditLog();