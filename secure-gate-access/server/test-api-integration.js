#!/usr/bin/env node
/**
 * Test script to verify Mailgun and Africa's Talking API integration
 */

import dotenv from 'dotenv';
import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import AfricasTalking from 'africastalking';

// Load environment variables
dotenv.config();

console.log('='.repeat(60));
console.log('API Integration Test');
console.log('='.repeat(60));

// Test Mailgun Configuration
async function testMailgun() {
  console.log('\n📧 MAILGUN API TEST');
  console.log('-'.repeat(60));
  
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const baseUrl = process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net';
  
  if (!apiKey || !domain) {
    console.log('❌ Mailgun not configured');
    console.log('   Missing: MAILGUN_API_KEY or MAILGUN_DOMAIN');
    return false;
  }
  
  console.log(`✓ API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log(`✓ Domain: ${domain}`);
  console.log(`✓ Base URL: ${baseUrl}`);
  
  try {
    const mailgun = new Mailgun(FormData);
    const client = mailgun.client({
      username: 'api',
      key: apiKey,
      url: baseUrl
    });
    
    // Test by getting domain info (doesn't send email)
    console.log('\n🔍 Testing API connection...');
    const domainInfo = await client.domains.get(domain);
    console.log('✅ Mailgun API connection successful!');
    console.log(`   Domain state: ${domainInfo.state}`);
    console.log(`   Domain type: ${domainInfo.type}`);
    
    // Check if we can send (requires verified recipients for sandbox)
    if (domain.includes('sandbox')) {
      console.log('\n⚠️  Note: You are using a Mailgun SANDBOX domain');
      console.log('   You can only send to authorized recipients');
      console.log('   Add authorized recipients in Mailgun dashboard');
      console.log('   Or use a verified domain for production');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Mailgun API test failed');
    console.log(`   Error: ${error.message}`);
    if (error.status) {
      console.log(`   Status: ${error.status}`);
    }
    return false;
  }
}

// Test Africa's Talking Configuration
async function testAfricasTalking() {
  console.log('\n📱 AFRICA\'S TALKING API TEST');
  console.log('-'.repeat(60));
  
  const apiKey = process.env.AT_API_KEY || process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AT_USERNAME || process.env.AFRICASTALKING_USERNAME;
  
  if (!apiKey || !username) {
    console.log('❌ Africa\'s Talking not configured');
    console.log('   Missing: AT_API_KEY/AFRICASTALKING_API_KEY or AT_USERNAME/AFRICASTALKING_USERNAME');
    console.log('   Set these in your .env file or Render environment variables');
    return false;
  }
  
  console.log(`✓ API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log(`✓ Username: ${username}`);
  
  try {
    const africasTalking = AfricasTalking({
      apiKey: apiKey,
      username: username
    });
    
    // Test by checking account balance
    console.log('\n🔍 Testing API connection...');
    const application = africasTalking.APPLICATION;
    const balance = await application.fetchApplicationData();
    
    console.log('✅ Africa\'s Talking API connection successful!');
    console.log(`   User data retrieved successfully`);
    
    // Try to get SMS service
    const sms = africasTalking.SMS;
    console.log('✓ SMS service initialized');
    
    return true;
  } catch (error) {
    console.log('❌ Africa\'s Talking API test failed');
    console.log(`   Error: ${error.message}`);
    if (error.status) {
      console.log(`   Status: ${error.status}`);
    }
    return false;
  }
}

// Check which providers are configured
async function checkConfiguration() {
  console.log('\n⚙️  ENVIRONMENT CONFIGURATION');
  console.log('-'.repeat(60));
  
  const emailProvider = process.env.EMAIL_PROVIDER;
  const smsProvider = process.env.SMS_PROVIDER;
  const enableEmail = process.env.ENABLE_EMAIL_NOTIFICATIONS;
  const enableSMS = process.env.ENABLE_SMS_NOTIFICATIONS;
  const enableExternal = process.env.ENABLE_EXTERNAL_NOTIFICATIONS;
  
  console.log(`Email Provider: ${emailProvider || 'Not set (defaults to smtp)'}`);
  console.log(`SMS Provider: ${smsProvider || 'Not set'}`);
  console.log(`Enable Email Notifications: ${enableEmail || 'Not set'}`);
  console.log(`Enable SMS Notifications: ${enableSMS || 'Not set'}`);
  console.log(`Enable External Notifications: ${enableExternal || 'Not set'}`);
  
  if (enableExternal !== 'true') {
    console.log('\n⚠️  WARNING: ENABLE_EXTERNAL_NOTIFICATIONS is not set to "true"');
    console.log('   External notifications (email/SMS) will be disabled');
  }
  
  if (enableEmail !== 'true') {
    console.log('\n⚠️  WARNING: ENABLE_EMAIL_NOTIFICATIONS is not set to "true"');
    console.log('   Email notifications will be disabled');
  }
  
  if (enableSMS !== 'true') {
    console.log('\n⚠️  WARNING: ENABLE_SMS_NOTIFICATIONS is not set to "true"');
    console.log('   SMS notifications will be disabled');
  }
}

// Main test execution
async function main() {
  await checkConfiguration();
  
  const mailgunOk = await testMailgun();
  const atOk = await testAfricasTalking();
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Mailgun: ${mailgunOk ? '✅ WORKING' : '❌ NOT CONFIGURED/FAILED'}`);
  console.log(`Africa's Talking: ${atOk ? '✅ WORKING' : '❌ NOT CONFIGURED/FAILED'}`);
  console.log('='.repeat(60));
  
  if (!mailgunOk && !atOk) {
    console.log('\n⚠️  No notification providers are configured!');
    console.log('   Please configure at least one provider in environment variables');
  }
  
  process.exit(mailgunOk || atOk ? 0 : 1);
}

main().catch(error => {
  console.error('\n❌ Test failed with error:', error);
  process.exit(1);
});
