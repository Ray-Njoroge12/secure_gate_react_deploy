import pool from './src/database/db.js';

async function checkConstraints() {
  try {
    console.log('Checking existing foreign key constraints...');
    
    const result = await pool.query(`
      SELECT 
        constraint_name, 
        table_name,
        column_name
      FROM information_schema.key_column_usage 
      WHERE constraint_name IN (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name IN ('audit_logs', 'access_logs')
      )
      ORDER BY table_name, constraint_name;
    `);
    
    if (result.rows.length > 0) {
      console.log('Found foreign key constraints:');
      result.rows.forEach(row => {
        console.log(`- ${row.table_name}.${row.column_name} -> ${row.constraint_name}`);
      });
    } else {
      console.log('No foreign key constraints found on audit_logs or access_logs tables');
    }
    
    // Also check what columns exist
    console.log('\nChecking table columns...');
    
    const auditColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs'
      ORDER BY ordinal_position;
    `);
    
    const accessColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'access_logs'
      ORDER BY ordinal_position;
    `);
    
    console.log('\naudit_logs columns:');
    auditColumns.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('\naccess_logs columns:');
    accessColumns.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
  } catch (error) {
    console.error('Error checking constraints:', error.message);
  } finally {
    await pool.end();
  }
}

checkConstraints();