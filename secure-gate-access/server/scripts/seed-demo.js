#!/usr/bin/env node
/**
 * Demo Seed Script - Seeds the database with demo users for video demonstration
 * 
 * Usage: node scripts/seed-demo.js
 * 
 * This creates users for all roles with known credentials for demo purposes.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import argon2 from 'argon2';
import { dbManager } from '../src/database/db.enhanced.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env files
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

// Demo user credentials - Store these for the demo video
const DEMO_USERS = [
  {
    username: 'super_admin',
    email: 'super.admin@securegate.demo',
    password: 'SuperAdmin@2026!',
    first_name: 'Super',
    last_name: 'Administrator',
    role: 'super_admin',
    phone: '+254700000001',
    account_status: 'active',
    verified: true,
    estate_id: null, // Super admin has access to all estates
    area: 'System',
    house: 'ADMIN'
  },
  {
    username: 'admin_oakridge',
    email: 'admin@oakridge.demo',
    password: 'Admin@2026!',
    first_name: 'Estate',
    last_name: 'Administrator',
    role: 'admin',
    phone: '+254700000002',
    account_status: 'active',
    verified: true,
    estate_id: 1,
    area: 'Administration',
    house: 'OFFICE'
  },
  {
    username: 'guard_main',
    email: 'guard.main@oakridge.demo',
    password: 'Guard@2026!',
    first_name: 'Main Gate',
    last_name: 'Security',
    role: 'guard',
    phone: '+254700000003',
    account_status: 'active',
    verified: true,
    estate_id: 1,
    area: 'Main Gate',
    house: 'SECURITY'
  },
  {
    username: 'guard_back',
    email: 'guard.back@oakridge.demo',
    password: 'Guard@2026!',
    first_name: 'Back Gate',
    last_name: 'Security',
    role: 'guard',
    phone: '+254700000004',
    account_status: 'active',
    verified: true,
    estate_id: 1,
    area: 'Back Gate',
    house: 'SECURITY'
  },
  {
    username: 'john_resident',
    email: 'john.smith@resident.demo',
    password: 'Resident@2026!',
    first_name: 'John',
    last_name: 'Smith',
    role: 'resident',
    phone: '+254700000005',
    account_status: 'active',
    verified: true,
    estate_id: 1,
    area: 'Block A',
    house: 'A-101'
  },
  {
    username: 'jane_resident',
    email: 'jane.doe@resident.demo',
    password: 'Resident@2026!',
    first_name: 'Jane',
    last_name: 'Doe',
    role: 'resident',
    phone: '+254700000006',
    account_status: 'active',
    verified: true,
    estate_id: 1,
    area: 'Block B',
    house: 'B-205'
  },
  {
    username: 'mike_resident',
    email: 'mike.johnson@resident.demo',
    password: 'Resident@2026!',
    first_name: 'Mike',
    last_name: 'Johnson',
    role: 'resident',
    phone: '+254700000007',
    account_status: 'active',
    verified: true,
    estate_id: 1,
    area: 'Block C',
    house: 'C-302'
  },
  // Pending resident for approval demo
  {
    username: 'pending_resident',
    email: 'pending@resident.demo',
    password: 'Pending@2026!',
    first_name: 'Pending',
    last_name: 'Approval',
    role: 'resident',
    phone: '+254700000008',
    account_status: 'pending',
    verified: true,
    estate_id: 1,
    area: 'Block D',
    house: 'D-401'
  }
];

// Demo estates
const DEMO_ESTATES = [
  {
    id: 1,
    name: 'Oakridge Estate',
    slug: 'oakridge-estate',
    timezone: 'Africa/Nairobi',
    address_line1: '123 Oakridge Drive',
    city: 'Nairobi',
    country: 'Kenya',
    contact_phone: '+254700000000',
    contact_email: 'info@oakridge.demo'
  },
  {
    id: 2,
    name: 'Sunset Gardens',
    slug: 'sunset-gardens',
    timezone: 'Africa/Nairobi',
    address_line1: '456 Sunset Boulevard',
    city: 'Nairobi',
    country: 'Kenya',
    contact_phone: '+254700000100',
    contact_email: 'info@sunsetgardens.demo'
  }
];

async function columnExists(tableName, columnName) {
  const res = await dbManager.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1`,
    [tableName, columnName]
  );
  return res.rows.length > 0;
}

async function seedEstates() {
  console.log('\n📍 Seeding demo estates...');
  
  for (const estate of DEMO_ESTATES) {
    try {
      await dbManager.query(`
        INSERT INTO estates (id, name, slug, timezone, address_line1, city, country, contact_phone, contact_email, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          timezone = EXCLUDED.timezone,
          address_line1 = EXCLUDED.address_line1,
          city = EXCLUDED.city,
          country = EXCLUDED.country,
          contact_phone = EXCLUDED.contact_phone,
          contact_email = EXCLUDED.contact_email,
          updated_at = NOW()
      `, [
        estate.id,
        estate.name,
        estate.slug,
        estate.timezone,
        estate.address_line1,
        estate.city,
        estate.country,
        estate.contact_phone,
        estate.contact_email
      ]);
      console.log(`   ✅ Estate: ${estate.name} (ID: ${estate.id})`);
    } catch (error) {
      console.error(`   ❌ Failed to seed estate ${estate.name}:`, error.message);
    }
  }
  
  // Reset sequence
  await dbManager.query(`SELECT setval(pg_get_serial_sequence('estates', 'id'), (SELECT COALESCE(MAX(id), 1) FROM estates))`);
}

async function seedUsers() {
  console.log('\n👤 Seeding demo users...');
  
  const hasEstateId = await columnExists('users', 'estate_id');
  const hasAccountStatus = await columnExists('users', 'account_status');
  const hasFirstName = await columnExists('users', 'first_name');
  const hasLastName = await columnExists('users', 'last_name');
  const hasMfaEnabled = await columnExists('users', 'mfa_enabled');
  
  for (const user of DEMO_USERS) {
    try {
      const passwordHash = await argon2.hash(user.password);
      
      // Check if user already exists (handle NULL estate_id case)
      let existingUser;
      if (user.estate_id === null) {
        existingUser = await dbManager.query(
          `SELECT id FROM users WHERE email = $1 AND estate_id IS NULL`,
          [user.email]
        );
      } else {
        existingUser = await dbManager.query(
          `SELECT id FROM users WHERE email = $1 AND estate_id = $2`,
          [user.email, user.estate_id]
        );
      }
      
      if (existingUser.rows.length > 0) {
        // Update existing user
        const updateParts = [
          'username = $1',
          'password_hash = $2',
          'role = $3',
          'phone = $4',
          'verified = $5',
          'area = $6',
          'house = $7',
          'updated_at = NOW()'
        ];
        const updateValues = [user.username, passwordHash, user.role, user.phone, user.verified, user.area, user.house];
        let paramIdx = 8;
        
        if (hasAccountStatus) {
          updateParts.push(`account_status = $${paramIdx++}`);
          updateValues.push(user.account_status);
        }
        
        if (hasFirstName) {
          updateParts.push(`first_name = $${paramIdx++}`);
          updateValues.push(user.first_name);
        }
        
        if (hasLastName) {
          updateParts.push(`last_name = $${paramIdx++}`);
          updateValues.push(user.last_name);
        }
        
        if (hasMfaEnabled) {
          updateParts.push(`mfa_enabled = $${paramIdx++}`);
          updateValues.push(false);
        }
        
        updateValues.push(existingUser.rows[0].id);
        
        await dbManager.query(
          `UPDATE users SET ${updateParts.join(', ')} WHERE id = $${paramIdx}`,
          updateValues
        );
        
        console.log(`   🔄 ${user.role.padEnd(12)} | ${user.username.padEnd(18)} | ${user.email} (updated)`);
      } else {
        // Insert new user
        const columns = ['username', 'email', 'password_hash', 'role', 'phone', 'verified', 'area', 'house'];
        const values = [user.username, user.email, passwordHash, user.role, user.phone, user.verified, user.area, user.house];
        
        if (hasEstateId) {
          columns.push('estate_id');
          values.push(user.estate_id);
        }
        
        if (hasAccountStatus) {
          columns.push('account_status');
          values.push(user.account_status);
        }
        
        if (hasFirstName) {
          columns.push('first_name');
          values.push(user.first_name);
        }
        
        if (hasLastName) {
          columns.push('last_name');
          values.push(user.last_name);
        }
        
        if (hasMfaEnabled) {
          columns.push('mfa_enabled');
          values.push(false);
        }
        
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        await dbManager.query(
          `INSERT INTO users (${columns.join(', ')}, created_at, updated_at)
           VALUES (${placeholders}, NOW(), NOW())`,
          values
        );
        
        console.log(`   ✅ ${user.role.padEnd(12)} | ${user.username.padEnd(18)} | ${user.email}`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to seed user ${user.username}:`, error.message);
    }
  }
}

async function seedDemoVisitors() {
  console.log('\n🚗 Seeding demo visitors...');
  
  // Get a resident to create visitors for
  const residentResult = await dbManager.query(
    `SELECT id, email, estate_id FROM users WHERE role = 'resident' AND email LIKE '%@resident.demo' LIMIT 1`
  );
  
  if (residentResult.rows.length === 0) {
    console.log('   ⚠️  No demo resident found, skipping visitor seeding');
    return;
  }
  
  const resident = residentResult.rows[0];
  const hasResidentId = await columnExists('visitors', 'resident_id');
  
  // Clear old demo visitors first
  await dbManager.query(`DELETE FROM visitors WHERE email LIKE '%@visitor.demo' OR email LIKE '%@contractor.demo' OR email LIKE '%@delivery.demo'`);
  
  const visitors = [
    {
      name: 'Alice Visitor',
      phone: '+254711111111',
      email: 'alice@visitor.demo',
      purpose: 'Family Visit',
      status: 'PENDING',
      date_of_visit: new Date().toISOString().split('T')[0],
      time_of_visit: '14:00',
      invite_code: `DEMO-ALICE-${Date.now()}`
    },
    {
      name: 'Bob Contractor',
      phone: '+254711111112',
      email: 'bob@contractor.demo',
      purpose: 'Plumbing Repair',
      status: 'APPROVED',
      date_of_visit: new Date().toISOString().split('T')[0],
      time_of_visit: '10:00',
      invite_code: `DEMO-BOB-${Date.now()}`
    },
    {
      name: 'Carol Delivery',
      phone: '+254711111113',
      email: 'carol@delivery.demo',
      purpose: 'Package Delivery',
      status: 'CHECKED_IN',
      date_of_visit: new Date().toISOString().split('T')[0],
      time_of_visit: '09:00',
      invite_code: `DEMO-CAROL-${Date.now()}`,
      check_in_time: new Date()
    }
  ];
  
  for (const visitor of visitors) {
    try {
      const columns = ['name', 'phone', 'email', 'purpose', 'status', 'date_of_visit', 'time_of_visit', 'invite_code', 'created_by', 'estate_id'];
      const values = [visitor.name, visitor.phone, visitor.email, visitor.purpose, visitor.status, visitor.date_of_visit, visitor.time_of_visit, visitor.invite_code, resident.email, resident.estate_id || 1];
      
      if (hasResidentId) {
        columns.push('resident_id');
        values.push(resident.id);
      }
      
      if (visitor.check_in_time) {
        columns.push('check_in_time');
        values.push(visitor.check_in_time);
      }
      
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      await dbManager.query(
        `INSERT INTO visitors (${columns.join(', ')}, created_at, updated_at)
         VALUES (${placeholders}, NOW(), NOW())`,
        values
      );
      
      console.log(`   ✅ Visitor: ${visitor.name} (${visitor.status})`);
    } catch (error) {
      console.error(`   ❌ Failed to seed visitor ${visitor.name}:`, error.message);
    }
  }
}

async function printCredentials() {
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('                        DEMO CREDENTIALS');
  console.log('═'.repeat(80));
  console.log('');
  console.log('  ROLE            USERNAME              EMAIL                              PASSWORD');
  console.log('  ─'.repeat(40));
  
  for (const user of DEMO_USERS) {
    console.log(`  ${user.role.padEnd(14)} ${user.username.padEnd(20)} ${user.email.padEnd(35)} ${user.password}`);
  }
  
  console.log('');
  console.log('═'.repeat(80));
  console.log('');
  console.log('  📧 EMAIL SIMULATION: Open MailHog at http://localhost:8025');
  console.log('  📱 SMS SIMULATION:   Check /api/dev/messages or server/data/local_messages.json');
  console.log('');
  console.log('═'.repeat(80));
}

async function run() {
  try {
    console.log('🚀 Starting Demo Database Seed...');
    console.log('─'.repeat(50));
    
    await dbManager.initializeAsync();
    
    await seedEstates();
    await seedUsers();
    await seedDemoVisitors();
    
    await printCredentials();
    
    console.log('\n✅ Demo seeding complete!\n');
    
  } catch (error) {
    console.error('\n❌ Demo seeding failed:', error);
    throw error;
  } finally {
    await dbManager.disconnect();
  }
}

run()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
