/**
 * Data Migration Script: Encrypt Existing ID Numbers
 * 
 * This script:
 * 1. Finds all visitors with plaintext ID numbers
 * 2. Encrypts them using the encryption service
 * 3. Stores encrypted values in id_number_encrypted column
 * 4. Updates encryption timestamp
 * 
 * Usage: node scripts/migrate-id-numbers.js
 */

import { dbManager } from '../src/database/db.enhanced.js';
import encryptionService from '../src/services/encryptionService.js';
import logger from '../src/config/logger.js';

async function migrateIdNumbers() {
  console.log('🔐 Starting ID Number Encryption Migration...\n');
  
  try {
    // Step 1: Count total records to migrate
    const countResult = await dbManager.query(
      `SELECT COUNT(*) as total 
       FROM visitors 
       WHERE id_number IS NOT NULL 
       AND id_number != '' 
       AND id_number_encrypted IS NULL`
    );
    
    const totalRecords = parseInt(countResult.rows[0].total);
    console.log(`📊 Found ${totalRecords} ID numbers to encrypt\n`);
    
    if (totalRecords === 0) {
      console.log('✅ No ID numbers need encryption. Migration complete!');
      return;
    }
    
    // Step 2: Fetch all visitors with unencrypted ID numbers
    const visitorsResult = await dbManager.query(
      `SELECT id, id_number, name 
       FROM visitors 
       WHERE id_number IS NOT NULL 
       AND id_number != '' 
       AND id_number_encrypted IS NULL
       ORDER BY id`
    );
    
    const visitors = visitorsResult.rows;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    console.log('🔄 Encrypting ID numbers...\n');
    
    // Step 3: Encrypt each ID number
    for (let i = 0; i < visitors.length; i++) {
      const visitor = visitors[i];
      
      try {
        // Encrypt the ID number
        const encrypted = await encryptionService.encrypt(visitor.id_number);
        
        // Update the database
        await dbManager.query(
          `UPDATE visitors 
           SET id_number_encrypted = $1, 
               id_number_encrypted_at = NOW()
           WHERE id = $2`,
          [encrypted, visitor.id]
        );
        
        successCount++;
        
        // Progress indicator (every 10 records or last record)
        if ((i + 1) % 10 === 0 || i === visitors.length - 1) {
          const progress = ((i + 1) / visitors.length * 100).toFixed(1);
          console.log(`  Progress: ${i + 1}/${visitors.length} (${progress}%) - ${visitor.name}`);
        }
        
      } catch (error) {
        errorCount++;
        errors.push({
          visitorId: visitor.id,
          visitorName: visitor.name,
          error: error.message
        });
        
        logger.error(`Failed to encrypt ID for visitor ${visitor.id}:`, error);
      }
    }
    
    // Step 4: Report results
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Complete!\n');
    console.log(`✅ Successfully encrypted: ${successCount} records`);
    
    if (errorCount > 0) {
      console.log(`❌ Failed to encrypt: ${errorCount} records`);
      console.log('\nErrors:');
      errors.forEach(err => {
        console.log(`  - Visitor ${err.visitorId} (${err.visitorName}): ${err.error}`);
      });
    }
    
    // Step 5: Verify migration
    const verifyResult = await dbManager.query(
      `SELECT 
        COUNT(*) FILTER (WHERE id_number IS NOT NULL AND id_number_encrypted IS NOT NULL) as encrypted,
        COUNT(*) FILTER (WHERE id_number IS NOT NULL AND id_number_encrypted IS NULL) as unencrypted
       FROM visitors
       WHERE id_number IS NOT NULL AND id_number != ''`
    );
    
    const stats = verifyResult.rows[0];
    console.log('\n📈 Verification:');
    console.log(`  Encrypted: ${stats.encrypted}`);
    console.log(`  Unencrypted: ${stats.unencrypted}`);
    
    if (parseInt(stats.unencrypted) === 0) {
      console.log('\n✅ All ID numbers are now encrypted!');
    } else {
      console.log(`\n⚠️  ${stats.unencrypted} ID numbers still need encryption`);
    }
    
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    logger.error('ID number migration failed', error);
    throw error;
  }
}

// Run migration
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateIdNumbers()
    .then(() => {
      console.log('\n✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateIdNumbers;
