#!/usr/bin/env node

/**
 * Generate Encryption Key
 * Generates a secure encryption key for local encryption
 */

import crypto from 'crypto';

console.log('🔐 Generating Encryption Key');
console.log('============================\n');

// Generate 256-bit (32 bytes) encryption key
const key = crypto.randomBytes(32).toString('base64');

console.log('Generated encryption key:');
console.log(key);
console.log('\nAdd this to your .env file:');
console.log(`ENCRYPTION_KEY=${key}`);
console.log('\n⚠️  IMPORTANT:');
console.log('   - Keep this key secret and secure');
console.log('   - Never commit this to version control');
console.log('   - Back up this key securely');
console.log('   - If you lose this key, encrypted data cannot be recovered');
console.log('   - For production, use AWS KMS instead of local encryption\n');
