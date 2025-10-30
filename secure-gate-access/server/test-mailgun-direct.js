#!/usr/bin/env node

/**
 * Direct Mailgun SMTP Test Script
 * 
 * This script tests Mailgun SMTP connection with different configurations
 */

import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load Mailgun environment
dotenv.config({ path: '.env.mailgun' });

console.log('📧 Mailgun Direct SMTP Test\n');

console.log('📋 Mailgun Configuration:');
console.log(`   Domain: ${process.env.MAILGUN_DOMAIN}`);
console.log(`   API Key: ${process.env.MAILGUN_API_KEY ? 'Set ✅' : 'Not set ❌'}`);
console.log(`   Base URL: ${process.env.MAILGUN_BASE_URL}`);
console.log('');

console.log('📋 SMTP Configuration:');
console.log(`   Host: ${process.env.SMTP_HOST}`);
console.log(`   Port: ${process.env.SMTP_PORT}`);
console.log(`   User: ${process.env.SMTP_USER}`);
console.log(`   Pass: ${process.env.SMTP_PASS ? 'Set ✅' : 'Not set ❌'}`);
console.log(`   From: ${process.env.EMAIL_FROM}`);
console.log('');

// Test different SMTP configurations
const testConfigs = [
  {
    name: 'Standard Mailgun SMTP',
    config: {
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }
  },
  {
    name: 'Mailgun SMTP with TLS',
    config: {
      host: 'smtp.mailgun.org',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }
  },
  {
    name: 'Mailgun SMTP Alternative Port',
    config: {
      host: 'smtp.mailgun.org',
      port: 2525,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }
  }
];

for (const test of testConfigs) {
  console.log(`🧪 Testing: ${test.name}`);
  
  try {
    const transporter = nodemailer.createTransport(test.config);
    
    console.log('   🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('   ✅ SMTP connection successful!');
    
    // Test sending email
    console.log('   📧 Testing email sending...');
    const testEmail = {
      from: process.env.EMAIL_FROM,
      to: process.env.SMTP_USER, // Send to self for testing
      subject: 'Mailgun Test Email',
      html: `
        <h2>Mailgun SMTP Test</h2>
        <p>This is a test email to verify Mailgun SMTP integration.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Configuration:</strong> ${test.name}</p>
        <hr>
        <p><em>This is an automated test email.</em></p>
      `
    };

    const info = await transporter.sendMail(testEmail);
    console.log('   ✅ Test email sent successfully!');
    console.log(`   📧 Message ID: ${info.messageId}`);
    console.log(`   📤 Response: ${info.response}`);
    
    // If we get here, this configuration works
    console.log(`\n🎉 SUCCESS: ${test.name} is working!`);
    console.log('   Use this configuration in your environment file.');
    break;
    
  } catch (error) {
    console.log(`   ❌ ${test.name} failed`);
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('Invalid login')) {
      console.log('   → Authentication issue - check credentials');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('   → Host resolution issue');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('   → Connection refused - check port');
    } else if (error.message.includes('authentication')) {
      console.log('   → Authentication failed');
    }
  }
  
  console.log('');
}

console.log('📝 Mailgun Configuration Notes:');
console.log('');
console.log('1. Sandbox Domain Limitations:');
console.log('   - Can only send to authorized recipients');
console.log('   - Check Mailgun dashboard for authorized emails');
console.log('   - Add test email addresses in Mailgun console');
console.log('');
console.log('2. SMTP Credentials:');
console.log('   - Username: postmaster@yourdomain.mailgun.org');
console.log('   - Password: Your Mailgun API key');
console.log('   - Host: smtp.mailgun.org');
console.log('   - Port: 587 (TLS) or 465 (SSL)');
console.log('');
console.log('3. Production Setup:');
console.log('   - Verify your domain with Mailgun');
console.log('   - Set up DNS records (SPF, DKIM)');
console.log('   - Remove sandbox limitations');
console.log('');
console.log('4. Testing:');
console.log('   - Add authorized recipients in Mailgun dashboard');
console.log('   - Test with authorized email addresses only');
console.log('   - Check Mailgun logs for delivery status');




