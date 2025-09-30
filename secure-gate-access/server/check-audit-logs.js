import pool from './src/database/db.js';

async function checkAuditLogsStructure() {
  try {
    console.log('✅ Connected to PostgreSQL');
    
    // Check audit_logs table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Audit logs table structure:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type}) - nullable: ${row.is_nullable}`);
    });
    
    // Check constraints
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'audit_logs';
    `);
    
    console.log('\n🔗 Constraints:');
    constraints.rows.forEach(row => {
      console.log(`   - ${row.constraint_name} (${row.constraint_type})`);
    });
    
    // Check foreign key details
    const fkDetails = await pool.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'audit_logs';
    `);
    
    console.log('\n🔗 Foreign key details:');
    if (fkDetails.rows.length === 0) {
      console.log('   - No foreign key constraints found');
    } else {
      fkDetails.rows.forEach(row => {
        console.log(`   - ${row.constraint_name}: ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
        console.log(`     UPDATE: ${row.update_rule}, DELETE: ${row.delete_rule}`);
      });
    }
    
    // Check users table structure
    const usersResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id' 
      ORDER BY column_name;
    `);
    
    console.log('\n👤 Users table ID column:');
    usersResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
    
    // Try to delete a test user to see what errors occur
    console.log('\n🧪 Testing deletion behavior...');
    try {
      // Check if we can identify any users with audit logs
      const userAuditCount = await pool.query(`
        SELECT u.id, u.email, COUNT(al.id) as audit_count 
        FROM users u 
        LEFT JOIN audit_logs al ON u.id::text = al.user_id OR u.id::uuid = al.user_id::uuid
        GROUP BY u.id, u.email 
        ORDER BY audit_count DESC 
        LIMIT 5;
      `);
      
      console.log('Users with audit logs:');
      userAuditCount.rows.forEach(row => {
        console.log(`   - ${row.email}: ${row.audit_count} audit entries`);
      });
    } catch (testError) {
      console.log(`   - Error testing user-audit relationship: ${testError.message}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAuditLogsStructure();