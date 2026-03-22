
import { db } from '../src/database/db.enhanced.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function resolveAdminPassword() {
  const cliPassword = process.argv[2]?.trim();
  const envPassword = process.env.ADMIN_PASSWORD?.trim();

  if (cliPassword) return cliPassword;
  if (envPassword) return envPassword;

  // Generate a strong one-time password if none is provided.
  return `${crypto.randomBytes(18).toString('base64url')}A1!`;
}

async function resetAdmin() {
  try {
    console.log('🔄 Connecting to database...');
    await db.initializeAsync();

    const password = resolveAdminPassword();
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Update existing admin or create if missing
    const res = await db.query("SELECT * FROM users WHERE role = 'admin' LIMIT 1");

    if (res.rows.length > 0) {
      console.log('✅ Found existing admin. Resetting password...');
      const adminEmail = res.rows[0].email;
      await db.query("UPDATE users SET password_hash = $1 WHERE role = 'admin'", [hash]);
      console.log('✅ Admin password updated successfully.');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${password}`);
      console.log('   Source: CLI arg, ADMIN_PASSWORD env var, or generated secure fallback');
    } else {
      console.log('⚠️ No admin found. Creating new admin...');
      const newAdmin = await db.query(`
        INSERT INTO users (username, email, password_hash, role, account_status)
        VALUES ($1, $2, $3, 'admin', 'active')
        RETURNING email
      `, ['admin', 'admin@securegate.com', hash]);
      console.log('✅ Admin account created.');
      console.log(`   Email: ${newAdmin.rows[0].email}`);
      console.log(`   Password: ${password}`);
      console.log('   Source: CLI arg, ADMIN_PASSWORD env var, or generated secure fallback');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

resetAdmin();
