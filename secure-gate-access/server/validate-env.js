#!/usr/bin/env node
/**
 * Environment Validation Script
 * 
 * This script validates all environment variables and security configurations
 * before deployment. It provides detailed feedback and actionable recommendations.
 */

import dotenv from 'dotenv';
import EnvironmentConfig from './src/config/environment.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

console.log('🔍 Environment Configuration Validation\n');
console.log('='.repeat(50));

// Run comprehensive validation
const validation = EnvironmentConfig.validateAndReport();

console.log('\n📋 Validation Summary:');
console.log('='.repeat(30));

if (validation.errors.length === 0) {
  console.log('✅ Configuration Status: VALID');
  console.log('🚀 Ready for deployment');
} else {
  console.log('❌ Configuration Status: INVALID');
  console.log('🚨 Deployment blocked - fix errors below');
}

console.log(`⚠️  Warnings: ${validation.warnings.length}`);
console.log(`❌ Errors: ${validation.errors.length}`);

if (process.env.NODE_ENV === 'production' && validation.errors.length > 0) {
  console.log('\n🛡️  Production Security Requirements:');
  console.log('   • All JWT secrets must be 64+ characters');
  console.log('   • ENFORCE_HTTPS must be true');
  console.log('   • SECURE_COOKIES must be true');
  console.log('   • OTP_DEBUG_ECHO must be false');
  console.log('   • Strong database credentials required');
}

if (validation.errors.length === 0 && validation.warnings.length === 0) {
  console.log('\n🎉 All environment validations passed!');
  console.log('🔐 Security configuration is production-ready');
}

// Exit with appropriate code
process.exit(validation.errors.length > 0 ? 1 : 0);