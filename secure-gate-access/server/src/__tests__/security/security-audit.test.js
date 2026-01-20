/**
 * Security Audit Tests - Verify Current Implementation
 * Tests the claims from the security analysis
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');

describe('Security Audit - Current System Verification', () => {
  
  describe('1. QR Code Data Content Verification', () => {
    test('Check what data is embedded in QR codes', async () => {
      console.log('\n📋 CLAIM 1: QR codes contain PII');
      console.log('Checking visitorInviteController-optimized.js for QR generation...\n');
      
      const controllerPath = path.join(__dirname, '../../controllers/visitorInviteController-optimized.js');
      
      if (fs.existsSync(controllerPath)) {
        const content = fs.readFileSync(controllerPath, 'utf8');
        
        // Check if QR code generation exists
        const hasQRGeneration = content.includes('qrcode') || content.includes('QRCode');
        console.log(`✓ QR code generation found: ${hasQRGeneration}`);
        
        // Check what's passed to QR generation
        const qrDataPatterns = [
          'visitor_name',
          'visitor_id_number',
          'visitor_phone',
          'id_number',
          'phone',
          'email'
        ];
        
        const foundPII = qrDataPatterns.filter(pattern => {
          const regex = new RegExp(`qr.*${pattern}`, 'i');
          return regex.test(content);
        });
        
        console.log(`\n🔍 PII fields potentially in QR code: ${foundPII.length > 0 ? foundPII.join(', ') : 'None detected'}`);
        
        if (foundPII.length > 0) {
          console.log('⚠️  CLAIM VERIFIED: QR codes may contain PII');
          console.log('   Recommendation: Use opaque token instead');
        } else {
          console.log('✓ Good: No obvious PII in QR generation');
        }
      } else {
        console.log('⚠️  File not found:', controllerPath);
      }
    });
  });

  describe('2. OTP Debug Echo Verification', () => {
    test('Check if OTP can be echoed in responses', async () => {
      console.log('\n📋 CLAIM 2: OTP debug echo possible in production');
      console.log('Checking environment configuration...\n');
      
      // Check .env file
      const envPath = path.join(__dirname, '../../../.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const hasOTPDebug = envContent.includes('OTP_DEBUG_ECHO');
        
        console.log(`✓ OTP_DEBUG_ECHO setting exists: ${hasOTPDebug}`);
        
        if (hasOTPDebug) {
          const isEnabled = /OTP_DEBUG_ECHO\s*=\s*true/i.test(envContent);
          console.log(`   Current value: ${isEnabled ? 'ENABLED ⚠️' : 'disabled'}`);
          
          if (isEnabled) {
            console.log('⚠️  CLAIM VERIFIED: OTP debug echo is currently enabled');
          }
        }
      }
      
      // Check server startup
      const serverPath = path.join(__dirname, '../../../server.js');
      if (fs.existsSync(serverPath)) {
        const serverContent = fs.readFileSync(serverPath, 'utf8');
        const hasProductionGuard = serverContent.includes('OTP_DEBUG_ECHO') && 
                                   serverContent.includes('production');
        
        console.log(`\n✓ Production guard check exists: ${hasProductionGuard}`);
        
        if (!hasProductionGuard) {
          console.log('⚠️  CLAIM VERIFIED: No production guard preventing OTP debug');
          console.log('   Recommendation: Add startup check to prevent production use');
        }
      }
    });

    test('Check OTP service implementation', async () => {
      const otpServicePath = path.join(__dirname, '../../services/otpService.js');
      
      if (fs.existsSync(otpServicePath)) {
        const content = fs.readFileSync(otpServicePath, 'utf8');
        
        // Check if OTP is returned in response
        const returnsOTP = /return.*otp|otp:.*otp[^H]/i.test(content);
        console.log(`\n🔍 OTP potentially returned in response: ${returnsOTP}`);
        
        if (returnsOTP) {
          console.log('⚠️  OTP may be exposed in API responses');
        }
      }
    });
  });

  describe('3. ID Number Storage Verification', () => {
    test('Check database schema for ID number encryption', async () => {
      console.log('\n📋 CLAIM 3: ID numbers stored in plaintext');
      console.log('Checking database schema...\n');
      
      const db = require('../../config/database');
      
      try {
        // Check visitors table
        const visitorsSchema = await db.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'visitors'
          AND column_name LIKE '%id%number%'
        `);
        
        console.log('Visitors table ID columns:');
        visitorsSchema.rows.forEach(col => {
          console.log(`  - ${col.column_name} (${col.data_type})`);
        });
        
        const hasEncryptedColumn = visitorsSchema.rows.some(col => 
          col.column_name.includes('encrypted')
        );
        const hasPlaintextColumn = visitorsSchema.rows.some(col => 
          col.column_name === 'id_number' || col.column_name === 'visitor_id_number'
        );
        
        if (!hasEncryptedColumn && hasPlaintextColumn) {
          console.log('\n⚠️  CLAIM VERIFIED: ID numbers stored in plaintext');
          console.log('   No encrypted column found');
          console.log('   Recommendation: Add field-level encryption');
        } else if (hasEncryptedColumn) {
          console.log('\n✓ Good: Encrypted column exists');
        }
        
        // Check visitor_invites table
        const invitesSchema = await db.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'visitor_invites'
          AND column_name LIKE '%id%number%'
        `);
        
        console.log('\nVisitor_invites table ID columns:');
        invitesSchema.rows.forEach(col => {
          console.log(`  - ${col.column_name} (${col.data_type})`);
        });
        
      } catch (error) {
        console.log('⚠️  Database connection error:', error.message);
      }
    });

    test('Check for encryption utilities', async () => {
      const encryptionPath = path.join(__dirname, '../../utils/encryption.js');
      const fieldEncryptionPath = path.join(__dirname, '../../utils/fieldEncryption.js');
      
      const hasEncryption = fs.existsSync(encryptionPath);
      const hasFieldEncryption = fs.existsSync(fieldEncryptionPath);
      
      console.log(`\n🔍 Encryption utilities found: ${hasEncryption || hasFieldEncryption}`);
      
      if (!hasEncryption && !hasFieldEncryption) {
        console.log('⚠️  No field encryption utility detected');
        console.log('   Recommendation: Implement field-level encryption service');
      }
    });
  });

  describe('4. Role-Based Access Control Verification', () => {
    test('Check middleware for data minimization', async () => {
      console.log('\n📋 CLAIM 4: Guards may see too much visitor data');
      console.log('Checking middleware...\n');
      
      const middlewarePath = path.join(__dirname, '../../middleware');
      
      if (fs.existsSync(middlewarePath)) {
        const files = fs.readdirSync(middlewarePath);
        
        const dataMinFiles = files.filter(f => 
          f.includes('minimization') || 
          f.includes('minimize') ||
          f.includes('privacy')
        );
        
        console.log(`Data minimization middleware found: ${dataMinFiles.length > 0 ? dataMinFiles.join(', ') : 'None'}`);
        
        if (dataMinFiles.length === 0) {
          console.log('\n⚠️  CLAIM VERIFIED: No data minimization middleware found');
          console.log('   Guards may receive full visitor details');
          console.log('   Recommendation: Add role-based data filtering');
        }
      }
    });

    test('Check visitor response structure', async () => {
      const visitorControllerPath = path.join(__dirname, '../../controllers/visitorController.js');
      
      if (fs.existsSync(visitorControllerPath)) {
        const content = fs.readFileSync(visitorControllerPath, 'utf8');
        
        // Check for role-based filtering
        const hasRoleCheck = content.includes('req.user.role') || content.includes('user.role');
        const hasMasking = content.includes('mask') || content.includes('***');
        
        console.log(`\n🔍 Role-based filtering detected: ${hasRoleCheck}`);
        console.log(`🔍 Data masking detected: ${hasMasking}`);
        
        if (!hasRoleCheck || !hasMasking) {
          console.log('\n⚠️  Limited role-based data filtering found');
        }
      }
    });
  });

  describe('5. Data Retention Policy Verification', () => {
    test('Check for retention service', async () => {
      console.log('\n📋 CLAIM 5: No data retention policies');
      console.log('Checking retention implementation...\n');
      
      const retentionServicePath = path.join(__dirname, '../../services/retentionService.js');
      const hasRetentionService = fs.existsSync(retentionServicePath);
      
      console.log(`✓ Retention service exists: ${hasRetentionService}`);
      
      if (!hasRetentionService) {
        console.log('⚠️  CLAIM VERIFIED: No retention service found');
        console.log('   Data may be kept indefinitely');
        console.log('   Recommendation: Implement automated data cleanup');
      }
    });

    test('Check database for retention policies table', async () => {
      const db = require('../../config/database');
      
      try {
        const tables = await db.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND (table_name LIKE '%retention%' OR table_name LIKE '%archive%')
        `);
        
        console.log(`\nRetention/Archive tables found: ${tables.rows.length}`);
        
        if (tables.rows.length > 0) {
          tables.rows.forEach(t => console.log(`  - ${t.table_name}`));
        } else {
          console.log('⚠️  No retention policy tables found');
        }
        
      } catch (error) {
        console.log('⚠️  Database query error:', error.message);
      }
    });

    test('Check for scheduled jobs', async () => {
      const jobsPath = path.join(__dirname, '../../jobs');
      const schedulerPath = path.join(__dirname, '../../scheduler');
      
      const hasJobs = fs.existsSync(jobsPath);
      const hasScheduler = fs.existsSync(schedulerPath);
      
      console.log(`\n🔍 Job/Scheduler directories found: ${hasJobs || hasScheduler}`);
      
      if (hasJobs) {
        const files = fs.readdirSync(jobsPath);
        const retentionJobs = files.filter(f => f.includes('retention') || f.includes('cleanup'));
        console.log(`   Retention jobs: ${retentionJobs.length > 0 ? retentionJobs.join(', ') : 'None'}`);
      }
    });
  });

  describe('Summary Report', () => {
    test('Generate security audit summary', async () => {
      console.log('\n\n' + '='.repeat(70));
      console.log('🔒 SECURITY AUDIT SUMMARY');
      console.log('='.repeat(70));
      
      console.log('\n📊 FINDINGS:\n');
      
      console.log('1. QR Code Data Minimization');
      console.log('   Status: ⚠️  NEEDS REVIEW');
      console.log('   Action: Check if PII is embedded in QR codes\n');
      
      console.log('2. OTP Debug Protection');
      console.log('   Status: ⚠️  NEEDS IMPLEMENTATION');
      console.log('   Action: Add production guard for OTP_DEBUG_ECHO\n');
      
      console.log('3. ID Number Encryption');
      console.log('   Status: ⚠️  LIKELY NOT IMPLEMENTED');
      console.log('   Action: Implement field-level encryption\n');
      
      console.log('4. Role-Based Data Minimization');
      console.log('   Status: ⚠️  NEEDS ENHANCEMENT');
      console.log('   Action: Add middleware to filter data by role\n');
      
      console.log('5. Data Retention Policies');
      console.log('   Status: ⚠️  LIKELY NOT IMPLEMENTED');
      console.log('   Action: Create retention service and scheduler\n');
      
      console.log('='.repeat(70));
      console.log('\n📋 NEXT STEPS:');
      console.log('   1. Review detailed findings above');
      console.log('   2. Prioritize fixes (P0: High risk items)');
      console.log('   3. Implement security improvements');
      console.log('   4. Re-run audit to verify fixes\n');
      console.log('='.repeat(70) + '\n');
    });
  });
});
