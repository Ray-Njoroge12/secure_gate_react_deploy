#!/usr/bin/env node

/**
 * Email Integration Test Script
 * 
 * This script tests the nodemailer SMTP integration and checks
 * if it's configured with actual mailing service credentials
 */

import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('📧 Email Integration Analysis\n');

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });
dotenv.config({ path: join(__dirname, '.env.production') });
dotenv.config({ path: join(__dirname, '.env.test') });

console.log('📋 Current SMTP Configuration:');
console.log(`   SMTP Host: ${process.env.SMTP_HOST || 'Not set'}`);
console.log(`   SMTP Port: ${process.env.SMTP_PORT || 'Not set'}`);
console.log(`   SMTP Secure: ${process.env.SMTP_SECURE || 'Not set'}`);
console.log(`   SMTP User: ${process.env.SMTP_USER || 'Not set'}`);
console.log(`   SMTP Pass: ${process.env.SMTP_PASS ? 'Set ✅' : 'Not set ❌'}`);
console.log(`   Email From: ${process.env.EMAIL_FROM || process.env.FROM_EMAIL || 'Not set'}`);
console.log(`   Email From Name: ${process.env.EMAIL_FROM_NAME || process.env.SMTP_FROM_NAME || 'Not set'}`);
console.log('');

// Check if configuration looks like placeholders
const isPlaceholderConfig = 
  process.env.SMTP_USER === 'your-email@gmail.com' ||
  process.env.SMTP_PASS === 'your-app-password' ||
  process.env.SMTP_HOST === 'smtp.gmail.com' ||
  !process.env.SMTP_USER ||
  !process.env.SMTP_PASS;

if (isPlaceholderConfig) {
  console.log('⚠️  PLACEHOLDER CONFIGURATION DETECTED');
  console.log('   The SMTP configuration appears to use placeholder values.');
  console.log('   You need to configure actual email service credentials.');
  console.log('');
}

// Test SMTP connection
console.log('🧪 Testing SMTP Connection...');

if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.log('❌ SMTP not configured - missing required credentials');
  console.log('');
  console.log('📝 Required SMTP Configuration:');
  console.log('   SMTP_HOST=smtp.gmail.com (or your email provider)');
  console.log('   SMTP_USER=your-actual-email@gmail.com');
  console.log('   SMTP_PASS=your-actual-app-password');
  console.log('   EMAIL_FROM=noreply@yourdomain.com');
  console.log('');
} else {
  try {
    // Create transporter
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };

    const transporter = nodemailer.createTransport(smtpConfig);

    console.log('🔍 Verifying SMTP connection...');
    
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    
    console.log('');
    console.log('📧 Testing email sending...');
    
    // Test email sending
    const testEmail = {
      from: process.env.EMAIL_FROM || process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Send to self for testing
      subject: 'Test Email - Secure Gate Integration',
      html: `
        <h2>Email Integration Test</h2>
        <p>This is a test email to verify the SMTP integration is working correctly.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>System:</strong> Secure Gate Access Control</p>
        <hr>
        <p><em>This is an automated test email.</em></p>
      `
    };

    const info = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    
  } catch (error) {
    console.log('❌ SMTP connection failed');
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('Invalid login')) {
      console.log('   → Check your email credentials (username/password)');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('   → Check your SMTP host configuration');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('   → Check your SMTP port configuration');
    } else if (error.message.includes('authentication')) {
      console.log('   → Enable "Less secure app access" or use App Passwords');
    }
  }
}

console.log('');

// Test with notification service
console.log('🔧 Testing Notification Service Integration...');

try {
  const notificationService = await import('./src/services/notificationService.js');
  
  const testVisitorData = {
    name: 'John Test',
    email: process.env.SMTP_USER || 'test@example.com',
    dateOfVisit: '2025-01-15',
    time: '10:00 AM',
    purpose: 'Testing email integration',
    inviteCode: 'EMAIL123'
  };

  const testResidentData = {
    name: 'Jane Resident',
    email: 'jane@example.com'
  };

  const testInviteLink = 'https://securegate.test.com/invite/EMAIL123';

  console.log('📧 Testing visitor invitation email...');
  
  const emailResult = await notificationService.sendVisitorInviteEmail(
    testVisitorData,
    testResidentData,
    testInviteLink
  );

  if (emailResult) {
    console.log('✅ Notification service email sent successfully!');
  } else {
    console.log('❌ Notification service email failed');
  }

} catch (error) {
  console.log('❌ Notification service test failed');
  console.log(`   Error: ${error.message}`);
}

console.log('');
console.log('📊 Email Service Status Summary:');
console.log('');

if (isPlaceholderConfig) {
  console.log('🔴 STATUS: NOT CONFIGURED');
  console.log('   - Using placeholder credentials');
  console.log('   - Email functionality not working');
  console.log('   - Need to configure actual SMTP service');
} else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  console.log('🟡 STATUS: CONFIGURED BUT NEEDS TESTING');
  console.log('   - SMTP credentials are set');
  console.log('   - Need to verify actual connectivity');
  console.log('   - May need to test with real email service');
} else {
  console.log('🔴 STATUS: INCOMPLETE CONFIGURATION');
  console.log('   - Missing required SMTP credentials');
  console.log('   - Email functionality not available');
}

console.log('');
console.log('📝 Next Steps for Email Configuration:');
console.log('');
console.log('1. Choose an Email Service Provider:');
console.log('   - Gmail (requires App Password)');
console.log('   - Outlook/Hotmail');
console.log('   - SendGrid (recommended for production)');
console.log('   - AWS SES (recommended for production)');
console.log('   - Mailgun');
console.log('   - Custom SMTP server');
console.log('');
console.log('2. Get SMTP Credentials:');
console.log('   - Username/email address');
console.log('   - Password or App Password');
console.log('   - SMTP host and port');
console.log('   - Security settings (SSL/TLS)');
console.log('');
console.log('3. Update Environment Variables:');
console.log('   SMTP_HOST=your-smtp-host');
console.log('   SMTP_PORT=587');
console.log('   SMTP_SECURE=false');
console.log('   SMTP_USER=your-email@domain.com');
console.log('   SMTP_PASS=your-app-password');
console.log('   EMAIL_FROM=noreply@yourdomain.com');
console.log('');
console.log('4. Test the Configuration:');
console.log('   node test-email-integration.js');
console.log('');
console.log('💡 Recommended Email Services:');
console.log('');
console.log('For Development/Testing:');
console.log('   - Gmail with App Password');
console.log('   - Mailtrap (for testing)');
console.log('');
console.log('For Production:');
console.log('   - SendGrid (reliable, good deliverability)');
console.log('   - AWS SES (cost-effective, scalable)');
console.log('   - Mailgun (developer-friendly)');
console.log('   - Custom SMTP server');
