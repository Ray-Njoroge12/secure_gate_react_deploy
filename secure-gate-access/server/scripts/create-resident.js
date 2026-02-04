#!/usr/bin/env node

/**
 * Create Resident Script
 * 
 * Creates a new resident user with proper initialization:
 * - Validates estate assignment
 * - Initializes MFA columns
 * - Validates house/unit number
 * - Sets up notification preferences
 * 
 * Usage: npm run create:resident
 * 
 * RES-006: Dedicated resident creation script for proper onboarding
 */

import { dbManager } from '../src/database/db.enhanced.js';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function validateEstate(estateId) {
  const result = await dbManager.query(
    'SELECT id, name FROM estates WHERE id = $1',
    [estateId]
  );
  return result.rows[0];
}

async function validateHouseNumber(houseNumber, estateId) {
  // Check if house number is already taken in this estate
  const result = await dbManager.query(
    'SELECT id, username FROM users WHERE house = $1 AND estate_id = $2 AND role = $3',
    [houseNumber.toUpperCase(), estateId, 'resident']
  );
  return result.rows.length === 0;
}

async function createResident() {
  console.log('\n🏠 Secure Gate - Resident Creation Script\n');
  console.log('This script will create a new resident with proper onboarding.\n');

  try {
    // Connect to database
    await dbManager.connect();

    // List available estates
    console.log('📋 Available Estates:\n');
    const estates = await dbManager.query('SELECT id, name FROM estates ORDER BY id');
    if (estates.rows.length === 0) {
      console.error('❌ No estates found. Please create an estate first.');
      process.exit(1);
    }
    estates.rows.forEach(e => console.log(`   ${e.id}: ${e.name}`));
    console.log('');

    // Get estate selection
    const estateId = await question('Enter Estate ID: ');
    const estate = await validateEstate(parseInt(estateId, 10));
    if (!estate) {
      console.error('❌ Invalid estate ID');
      process.exit(1);
    }
    console.log(`✓ Estate: ${estate.name}\n`);

    // Get resident details
    const username = await question('Username: ');
    const email = await question('Email: ');
    const firstName = await question('First Name: ');
    const lastName = await question('Last Name: ');
    const phone = await question('Phone (with country code, e.g., +254712345678): ');
    const houseNumber = await question('House/Unit Number: ');
    const password = await question('Password (min 8 chars, 1 uppercase, 1 number): ');

    // Validate inputs
    if (!username || username.length < 3) {
      console.error('❌ Username must be at least 3 characters');
      process.exit(1);
    }

    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address');
      process.exit(1);
    }

    if (!password || password.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      console.error('❌ Password must contain at least one uppercase letter and one number');
      process.exit(1);
    }

    if (!houseNumber) {
      console.error('❌ House number is required');
      process.exit(1);
    }

    // Check if house number is available
    const houseAvailable = await validateHouseNumber(houseNumber, estate.id);
    if (!houseAvailable) {
      console.error(`❌ House number ${houseNumber.toUpperCase()} is already assigned to another resident in this estate`);
      process.exit(1);
    }

    // Check for existing user
    const existing = await dbManager.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      console.error('❌ A user with this username or email already exists');
      process.exit(1);
    }

    // Get notification preferences
    console.log('\n📬 Notification Preferences:');
    const notifyEmail = (await question('Enable email notifications? (y/n): ')).toLowerCase() === 'y';
    const notifySms = (await question('Enable SMS notifications? (y/n): ')).toLowerCase() === 'y';
    const notifyWhatsApp = (await question('Enable WhatsApp notifications? (y/n): ')).toLowerCase() === 'y';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create resident with MFA columns initialized (RES-006 FIX)
    const result = await dbManager.query(
      `INSERT INTO users (
        username, email, password, first_name, last_name, phone, house,
        role, estate_id, verified, area,
        notify_email, notify_sms, notify_whatsapp,
        mfa_enabled, mfa_secret, backup_codes,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        'resident', $8, true, 'Residential',
        $9, $10, $11,
        false, NULL, NULL,
        NOW(), NOW()
      ) RETURNING id, username, email, house, estate_id`,
      [
        username,
        email.toLowerCase(),
        hashedPassword,
        firstName,
        lastName,
        phone,
        houseNumber.toUpperCase(),
        estate.id,
        notifyEmail,
        notifySms,
        notifyWhatsApp
      ]
    );

    const resident = result.rows[0];

    console.log('\n✅ Resident created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Resident Details:');
    console.log(`   ID:          ${resident.id}`);
    console.log(`   Username:    ${resident.username}`);
    console.log(`   Email:       ${resident.email}`);
    console.log(`   House:       ${resident.house}`);
    console.log(`   Estate:      ${estate.name} (ID: ${estate.id})`);
    console.log(`   Name:        ${firstName} ${lastName}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n🔐 Security Setup (Recommended):');
    console.log('   1. Log in to the Secure Gate portal');
    console.log('   2. Go to Settings → Security');
    console.log('   3. Enable Multi-Factor Authentication (MFA)');
    console.log('   4. Save backup codes in a secure location');
    console.log('');
    console.log('📱 Mobile App Setup:');
    console.log('   1. Download the Secure Gate app');
    console.log('   2. Log in with your credentials');
    console.log('   3. Enable push notifications for visitor alerts');
    console.log('');
    console.log('🏠 Visitor Management:');
    console.log('   • Pre-register expected visitors');
    console.log('   • Approve/reject walk-in visitors in real-time');
    console.log('   • View visitor history and analytics');
    console.log('   • Set up favorite visitors for quick invites');
    console.log('');
    console.log('⚠️  IMPORTANT: MFA is recommended for bulk invite operations');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error creating resident:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await dbManager.disconnect();
  }
}

createResident();
