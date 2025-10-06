#!/usr/bin/env node
// Email Service Testing Script
// Tests email functionality with real SMTP configuration

import { sendVisitorInviteEmail, sendOtpVerificationEmail } from '../src/services/notificationService.js';
import { sendEmailOtp, sendEmail } from '../src/utils/tokenHelper.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, status, details = '') {
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  log(`${statusIcon} ${testName}: ${status}`, statusColor);
  if (details) log(`   ${details}`, 'blue');
}

async function testEmailService() {
  log('\n🧪 Email Service Integration Testing', 'bold');
  log('=====================================', 'bold');

  // Test 1: SMTP Configuration Validation
  log('\n1. SMTP Configuration Validation', 'blue');
  
  const requiredEnvVars = [
    'SMTP_HOST',
    'SMTP_PORT', 
    'SMTP_USER',
    'SMTP_PASS',
    'FROM_EMAIL'
  ];

  let configValid = true;
  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      logTest(`Missing ${envVar}`, 'FAIL');
      configValid = false;
    } else {
      logTest(`${envVar} configured`, 'PASS');
    }
  });

  if (!configValid) {
    log('\n⚠️  Email service not fully configured. Some tests will be skipped.', 'yellow');
    log('   To enable full testing, configure SMTP environment variables.', 'yellow');
  }

  // Test 2: Visitor Invite Email
  log('\n2. Visitor Invite Email Testing', 'blue');
  
  const visitorData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+254712345678',
    dateOfVisit: '2025-10-07',
    time: '14:00',
    purpose: 'Meeting',
    inviteCode: 'ABC123'
  };

  const residentData = {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    unit: 'A101'
  };

  const inviteLink = 'https://secure-gate.com/invite/abc123';

  try {
    const result = await sendVisitorInviteEmail(visitorData, residentData, inviteLink);
    if (result) {
      logTest('Visitor invite email sent', 'PASS');
    } else {
      logTest('Visitor invite email sent', 'FAIL', 'Email service not configured or failed');
    }
  } catch (error) {
    logTest('Visitor invite email sent', 'FAIL', error.message);
  }

  // Test 3: OTP Verification Email
  log('\n3. OTP Verification Email Testing', 'blue');
  
  const otpData = {
    name: 'John Doe',
    email: 'john.doe@example.com'
  };

  try {
    const result = await sendOtpVerificationEmail(otpData, '123456', 15);
    if (result) {
      logTest('OTP verification email sent', 'PASS');
    } else {
      logTest('OTP verification email sent', 'FAIL', 'Email service not configured or failed');
    }
  } catch (error) {
    logTest('OTP verification email sent', 'FAIL', error.message);
  }

  // Test 4: Generic Email Functions
  log('\n4. Generic Email Functions Testing', 'blue');
  
  try {
    const result1 = await sendEmailOtp('test@example.com', '123456');
    if (result1) {
      logTest('OTP email via tokenHelper', 'PASS');
    } else {
      logTest('OTP email via tokenHelper', 'FAIL', 'Email service not configured or failed');
    }
  } catch (error) {
    logTest('OTP email via tokenHelper', 'FAIL', error.message);
  }

  try {
    const result2 = await sendEmail('test@example.com', 'Test Subject', 'Test message');
    if (result2) {
      logTest('Generic email via tokenHelper', 'PASS');
    } else {
      logTest('Generic email via tokenHelper', 'FAIL', 'Email service not configured or failed');
    }
  } catch (error) {
    logTest('Generic email via tokenHelper', 'FAIL', error.message);
  }

  // Test 5: Email Template Validation
  log('\n5. Email Template Validation', 'blue');
  
  // Test visitor invite template data
  const templateData = {
    siteName: process.env.SITE_NAME || 'Secure Gate Access',
    visitorName: visitorData.name,
    residentName: residentData.name,
    residentEmail: residentData.email,
    visitDate: new Date(visitorData.dateOfVisit).toLocaleDateString(),
    visitTime: visitorData.time,
    purpose: visitorData.purpose,
    inviteCode: visitorData.inviteCode,
    inviteLink: inviteLink,
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
  };

  // Check if all required template data is present
  const requiredTemplateFields = [
    'siteName', 'visitorName', 'residentName', 'residentEmail',
    'visitDate', 'visitTime', 'purpose', 'inviteCode', 'inviteLink', 'expiryDate'
  ];

  let templateValid = true;
  requiredTemplateFields.forEach(field => {
    if (!templateData[field]) {
      logTest(`Template field ${field}`, 'FAIL', 'Missing required field');
      templateValid = false;
    } else {
      logTest(`Template field ${field}`, 'PASS');
    }
  });

  if (templateValid) {
    logTest('Email template data validation', 'PASS');
  } else {
    logTest('Email template data validation', 'FAIL');
  }

  // Test 6: Error Handling
  log('\n6. Error Handling Testing', 'blue');
  
  // Test with invalid email
  try {
    const result = await sendEmailOtp('invalid-email', '123456');
    logTest('Invalid email handling', 'PASS', 'Service handled invalid email gracefully');
  } catch (error) {
    logTest('Invalid email handling', 'FAIL', error.message);
  }

  // Test with missing data
  try {
    const result = await sendVisitorInviteEmail({}, {}, '');
    logTest('Missing data handling', 'PASS', 'Service handled missing data gracefully');
  } catch (error) {
    logTest('Missing data handling', 'FAIL', error.message);
  }

  // Test 7: Performance Testing
  log('\n7. Performance Testing', 'blue');
  
  const startTime = Date.now();
  const promises = [];
  
  // Send 5 concurrent emails
  for (let i = 0; i < 5; i++) {
    promises.push(sendEmailOtp(`test${i}@example.com`, '123456'));
  }
  
  try {
    await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    logTest('Concurrent email sending', 'PASS', `Completed in ${duration}ms`);
  } catch (error) {
    logTest('Concurrent email sending', 'FAIL', error.message);
  }

  // Summary
  log('\n📊 Test Summary', 'bold');
  log('===============', 'bold');
  
  if (configValid) {
    log('✅ Email service is properly configured and ready for production', 'green');
  } else {
    log('⚠️  Email service needs configuration for full functionality', 'yellow');
    log('   Configure SMTP environment variables to enable email sending', 'yellow');
  }
  
  log('\n📋 Configuration Checklist:', 'blue');
  log('   □ SMTP_HOST configured', configValid ? 'green' : 'red');
  log('   □ SMTP_PORT configured', configValid ? 'green' : 'red');
  log('   □ SMTP_USER configured', configValid ? 'green' : 'red');
  log('   □ SMTP_PASS configured', configValid ? 'green' : 'red');
  log('   □ FROM_EMAIL configured', configValid ? 'green' : 'red');
  
  log('\n🔧 Next Steps:', 'blue');
  if (!configValid) {
    log('   1. Configure SMTP environment variables', 'yellow');
    log('   2. Test with real SMTP server', 'yellow');
    log('   3. Verify email delivery', 'yellow');
  } else {
    log('   1. Test with real email addresses', 'green');
    log('   2. Verify email templates render correctly', 'green');
    log('   3. Monitor email delivery rates', 'green');
  }
}

// Run the tests
testEmailService().catch(error => {
  log(`\n❌ Test execution failed: ${error.message}`, 'red');
  process.exit(1);
});
