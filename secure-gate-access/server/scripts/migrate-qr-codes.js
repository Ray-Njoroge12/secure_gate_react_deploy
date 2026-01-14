/**
 * QR Code Token Migration Script
 * 
 * This script migrates existing QR codes to use the new token-based system.
 * It generates tokens for all existing visitors that don't have tokens yet.
 * 
 * Date: January 7, 2026
 * Run: node scripts/migrate-qr-codes.js
 */

import pool from '../src/config/database.js';
import qrTokenService from '../src/services/qrTokenService.js';
import { logger } from '../src/utils/logger.js';

const BATCH_SIZE = 100; // Process in batches to avoid memory issues

async function migrateQRCodes() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        QR Code Token Migration Script                 ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check if qr_token_mapping table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'qr_token_mapping'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('❌ ERROR: qr_token_mapping table does not exist!');
      console.log('Please run migration 038_add_qr_token_mapping.sql first.');
      process.exit(1);
    }

    // Get count of visitors needing migration
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM visitors v
      WHERE v.status IN ('pending', 'verified', 'checked_in')
      AND NOT EXISTS (
        SELECT 1 FROM qr_token_mapping qtm 
        WHERE qtm.visitor_id = v.id
      )
    `);

    const totalToMigrate = parseInt(countResult.rows[0].total);
    
    if (totalToMigrate === 0) {
      console.log('✅ No visitors need migration - all have tokens!');
      await client.query('COMMIT');
      return;
    }

    console.log(`📊 Found ${totalToMigrate} visitors needing token generation`);
    console.log('');

    let migratedCount = 0;
    let errorCount = 0;
    let offset = 0;

    // Process in batches
    while (offset < totalToMigrate) {
      console.log(`Processing batch: ${offset + 1} - ${Math.min(offset + BATCH_SIZE, totalToMigrate)}...`);

      const { rows: visitors } = await client.query(`
        SELECT v.id, v.name, v.status
        FROM visitors v
        WHERE v.status IN ('pending', 'verified', 'checked_in')
        AND NOT EXISTS (
          SELECT 1 FROM qr_token_mapping qtm 
          WHERE qtm.visitor_id = v.id
        )
        ORDER BY v.id
        LIMIT $1 OFFSET $2
      `, [BATCH_SIZE, offset]);

      for (const visitor of visitors) {
        try {
          // Generate token using the service
          const token = await qrTokenService.generateToken(visitor.id);
          
          migratedCount++;
          
          if (migratedCount % 10 === 0) {
            process.stdout.write(`\r  Migrated: ${migratedCount}/${totalToMigrate} (${Math.round(migratedCount/totalToMigrate*100)}%)`);
          }
          
        } catch (error) {
          errorCount++;
          logger.error(`Failed to migrate visitor ${visitor.id}: ${error.message}`);
        }
      }

      offset += BATCH_SIZE;
    }

    console.log(''); // New line after progress
    console.log('');

    // Verification
    console.log('🔍 Verifying migration...');
    
    const verifyResult = await client.query(`
      SELECT COUNT(*) as tokens_created
      FROM qr_token_mapping
      WHERE created_at >= NOW() - INTERVAL '1 hour'
    `);

    const tokensCreated = parseInt(verifyResult.rows[0].tokens_created);

    await client.query('COMMIT');

    // Final summary
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║                  Migration Summary                     ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`✅ Successfully migrated: ${migratedCount} visitors`);
    console.log(`❌ Failed migrations: ${errorCount}`);
    console.log(`📊 Tokens created: ${tokensCreated}`);
    console.log('');

    if (errorCount > 0) {
      console.log('⚠️  Some migrations failed - check logs for details');
    } else {
      console.log('✨ All visitors successfully migrated to token system!');
    }

    console.log('');
    console.log('Next steps:');
    console.log('  1. Verify tokens are working with QR code generation');
    console.log('  2. Test QR code scanning with new tokens');
    console.log('  3. Monitor logs for any validation issues');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('');
    console.error('❌ MIGRATION FAILED:', error.message);
    console.error('');
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    client.release();
  }
}

// Run migration
console.log('Starting QR code token migration...');
console.log('');

migrateQRCodes()
  .then(() => {
    console.log('Migration script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
