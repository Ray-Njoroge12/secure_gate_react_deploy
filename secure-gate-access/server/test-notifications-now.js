#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

console.log('📧 Testing Notification Services\n');

console.log('Environment Check:');
console.log('  EMAIL_PROVIDER:', process.env.EMAIL_PROVIDER);
console.log('  MAILGUN_API_KEY:', process.env.MAILGUN_API_KEY ? 'Set ✅' : 'Not set ❌');
console.log('  MAILGUN_DOMAIN:', process.env.MAILGUN_DOMAIN);
console.log('  SMS_PROVIDER:', process.env.SMS_PROVIDER);
console.log('  AT_USERNAME:', process.env.AT_USERNAME);
console.log('  AT_API_KEY:', process.env.AT_API_KEY ? 'Set ✅' : 'Not set ❌');
console.log('  ENABLE_EMAIL_NOTIFICATIONS:', process.env.ENABLE_EMAIL_NOTIFICATIONS);
console.log('  ENABLE_SMS_NOTIFICATIONS:', process.env.ENABLE_SMS_NOTIFICATIONS);
console.log('');

const notificationService = await import('./src/services/notificationService.js');

console.log('🧪 Test 1: Email Notification via Mailgun');
const emailResult = await notificationService.sendVisitorInviteEmail(
  {
    name: 'Test Visitor',
    email: 'nn0200774@gmail.com',
    dateOfVisit: '2025-10-16',
    time: '14:00',
    purpose: 'Testing Email Notification',
    inviteCode: 'EMAIL-TEST-001'
  },
  {
    name: 'Test Resident',
    email: 'nn0200774@gmail.com'
  },
  'http://localhost:5001/invite/EMAIL-TEST-001'
);
console.log(emailResult ? '✅ Email sent successfully!' : '❌ Email failed');
console.log('');

console.log('🧪 Test 2: SMS Notification via Africas Talking');
const smsResult = await notificationService.sendVisitorInviteSms(
  {
    name: 'Test Visitor',
    phone: '+254748192563',
    dateOfVisit: '2025-10-16',
    time: '14:00',
    purpose: 'Testing SMS Notification',
    inviteCode: 'SMS-TEST-001'
  },
  {
    name: 'Test Resident'
  },
  'http://localhost:5001/invite/SMS-TEST-001'
);
console.log(smsResult ? '✅ SMS sent successfully!' : '❌ SMS failed');

console.log('\n📊 Test Summary:');
console.log('  Email:', emailResult ? 'WORKING ✅' : 'FAILED ❌');
console.log('  SMS:', smsResult ? 'WORKING ✅' : 'FAILED ❌');



