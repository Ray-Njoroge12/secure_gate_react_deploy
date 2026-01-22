
import { db } from './src/database/db.enhanced.js';
import bcrypt from 'bcryptjs';

async function setupAdmin() {
  try {
    console.log('🔄 Connecting to database...');
    await db.initializeAsync();

    // Check for existing admin
    const res = await db.query("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
    
    if (res.rows.length > 0) {
      const admin = res.rows[0];
      console.log('✅ Admin account already exists:');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Username: ${admin.username}`);
      console.log('   (If you do not know the password, we can reset it)');
    } else {
      console.log('⚠️ No admin found. Creating default admin...');
      const password = 'admin123';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      
      const newAdmin = await db.query(`
        INSERT INTO users (username, email, password_hash, role, account_status)
        VALUES ($1, $2, $3, 'admin', 'active')
        RETURNING id, username, email
      `, ['admin', 'admin@securegate.com', hash]);
      
      console.log('✅ Admin account created:');
      console.log(`   Email: ${newAdmin.rows[0].email}`);
      console.log(`   Password: ${password}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

setupAdmin();
