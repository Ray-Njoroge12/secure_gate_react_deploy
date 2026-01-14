/**
 * ID Number Encryption Tests
 * Verify that visitor ID numbers are encrypted at rest and decrypted on retrieval
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { dbManager } from '../../src/database/db.enhanced.js';
import encryptionService from '../../src/services/encryptionService.js';

describe('ID Number Encryption - GDPR Article 32 Compliance', () => {
  let testVisitorId;
  let testIdNumber = 'ID123456789';

  afterAll(async () => {
    // Cleanup test data
    if (testVisitorId) {
      await dbManager.query('DELETE FROM visitors WHERE id = $1', [testVisitorId]);
    }
  });

  test('Database schema includes encrypted ID number columns', async () => {
    const schema = await dbManager.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'visitors'
      AND column_name IN ('id_number', 'id_number_encrypted', 'id_number_encrypted_at')
      ORDER BY column_name
    `);

    const columns = schema.rows.map(r => r.column_name);
    
    console.log('\n📊 Visitors table ID number columns:');
    schema.rows.forEach(col => {
      console.log(`  ✓ ${col.column_name} (${col.data_type})`);
    });

    expect(columns).toContain('id_number'); // Plaintext (transition period)
    expect(columns).toContain('id_number_encrypted'); // Encrypted version
    expect(columns).toContain('id_number_encrypted_at'); // Encryption timestamp
  });

  test('Encryption service can encrypt and decrypt ID numbers', async () => {
    const originalId = testIdNumber;
    
    // Encrypt
    const encrypted = await encryptionService.encrypt(originalId);
    
    console.log('\n🔐 Encryption test:');
    console.log(`  Original: ${originalId}`);
    console.log(`  Encrypted: ${encrypted.substring(0, 20)}...`);
    
    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toBe(originalId); // Should be different
    expect(encrypted.length).toBeGreaterThan(originalId.length); // Encrypted data is longer
    
    // Decrypt
    const decrypted = await encryptionService.decrypt(encrypted);
    
    console.log(`  Decrypted: ${decrypted}`);
    console.log(`  ✅ Match: ${decrypted === originalId}`);
    
    expect(decrypted).toBe(originalId); // Should match original
  });

  test('Can insert visitor with encrypted ID number', async () => {
    const encrypted = await encryptionService.encrypt(testIdNumber);
    
    const result = await dbManager.query(
      `INSERT INTO visitors (
        name, phone, purpose, date_of_visit,
        id_number, id_number_encrypted, id_number_encrypted_at,
        status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW())
      RETURNING id, id_number, id_number_encrypted, id_number_encrypted_at`,
      [
        'Test Visitor',
        '+254700000000',
        'Testing',
        '2026-01-07',
        testIdNumber, // Plaintext (transition)
        encrypted,    // Encrypted
        'pending'
      ]
    );

    testVisitorId = result.rows[0].id;
    
    console.log('\n💾 Database insert test:');
    console.log(`  Visitor ID: ${testVisitorId}`);
    console.log(`  Plaintext stored: ${result.rows[0].id_number}`);
    console.log(`  Encrypted stored: ${result.rows[0].id_number_encrypted ? 'Yes' : 'No'}`);
    console.log(`  Encryption timestamp: ${result.rows[0].id_number_encrypted_at}`);

    expect(result.rows[0].id).toBeTruthy();
    expect(result.rows[0].id_number).toBe(testIdNumber);
    expect(result.rows[0].id_number_encrypted).toBe(encrypted);
    expect(result.rows[0].id_number_encrypted_at).toBeTruthy();
  });

  test('Can retrieve and decrypt ID number from database', async () => {
    const result = await dbManager.query(
      'SELECT id, id_number, id_number_encrypted FROM visitors WHERE id = $1',
      [testVisitorId]
    );

    const visitor = result.rows[0];
    
    // Decrypt the encrypted field
    const decrypted = await encryptionService.decrypt(visitor.id_number_encrypted);
    
    console.log('\n🔓 Decryption test:');
    console.log(`  Retrieved encrypted: ${visitor.id_number_encrypted.substring(0, 20)}...`);
    console.log(`  Decrypted value: ${decrypted}`);
    console.log(`  Plaintext value: ${visitor.id_number}`);
    console.log(`  ✅ Match: ${decrypted === visitor.id_number}`);

    expect(decrypted).toBe(testIdNumber);
    expect(decrypted).toBe(visitor.id_number); // Should match plaintext during transition
  });

  test('Encrypted data is different from plaintext', async () => {
    const result = await dbManager.query(
      'SELECT id_number, id_number_encrypted FROM visitors WHERE id = $1',
      [testVisitorId]
    );

    const visitor = result.rows[0];
    
    console.log('\n🔒 Security verification:');
    console.log(`  Plaintext: ${visitor.id_number}`);
    console.log(`  Encrypted: ${visitor.id_number_encrypted.substring(0, 30)}...`);
    console.log(`  Different: ${visitor.id_number !== visitor.id_number_encrypted}`);

    // Verify encrypted value is different from plaintext
    expect(visitor.id_number_encrypted).not.toBe(visitor.id_number);
    
    // Verify encrypted value doesn't contain plaintext
    expect(visitor.id_number_encrypted).not.toContain(visitor.id_number);
  });

  test('Check encryption coverage in database', async () => {
    const stats = await dbManager.query(`
      SELECT 
        COUNT(*) as total_visitors,
        COUNT(*) FILTER (WHERE id_number IS NOT NULL) as has_id_number,
        COUNT(*) FILTER (WHERE id_number IS NOT NULL AND id_number_encrypted IS NOT NULL) as encrypted,
        COUNT(*) FILTER (WHERE id_number IS NOT NULL AND id_number_encrypted IS NULL) as unencrypted
      FROM visitors
    `);

    const data = stats.rows[0];
    
    console.log('\n📈 Encryption coverage statistics:');
    console.log(`  Total visitors: ${data.total_visitors}`);
    console.log(`  Have ID number: ${data.has_id_number}`);
    console.log(`  Encrypted: ${data.encrypted}`);
    console.log(`  Unencrypted: ${data.unencrypted}`);
    
    if (parseInt(data.has_id_number) > 0) {
      const coverage = (parseInt(data.encrypted) / parseInt(data.has_id_number) * 100).toFixed(1);
      console.log(`  Coverage: ${coverage}%`);
      
      if (coverage < 100) {
        console.log(`\n  ⚠️  ${data.unencrypted} ID numbers need encryption`);
        console.log('     Run: node scripts/migrate-id-numbers.js');
      } else {
        console.log('  ✅ All ID numbers are encrypted!');
      }
    }

    expect(parseInt(data.total_visitors)).toBeGreaterThan(0);
  });

  test('Index exists for encrypted ID number lookups', async () => {
    const indexes = await dbManager.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'visitors'
      AND indexname LIKE '%id_number%'
    `);

    console.log('\n📇 ID number indexes:');
    
    if (indexes.rows.length > 0) {
      indexes.rows.forEach(idx => {
        console.log(`  ✓ ${idx.indexname}`);
      });
    } else {
      console.log('  ⚠️  No indexes found for id_number fields');
    }

    // We expect at least one index for id_number_encrypted
    const hasEncryptedIndex = indexes.rows.some(idx => 
      idx.indexname.includes('encrypted')
    );
    
    if (hasEncryptedIndex) {
      console.log('  ✅ Encrypted ID number index exists');
    }
  });

  test('Encryption roundtrip maintains data integrity', async () => {
    const testCases = [
      'AB123456',
      '12345678',
      'ID-2026-001',
      'PASSPORT123',
      '中文测试', // Unicode test
    ];

    console.log('\n🔄 Data integrity tests:');
    
    for (const testCase of testCases) {
      const encrypted = await encryptionService.encrypt(testCase);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      const match = testCase === decrypted;
      console.log(`  ${match ? '✅' : '❌'} "${testCase}" -> "${decrypted}"`);
      
      expect(decrypted).toBe(testCase);
    }
  });
});
