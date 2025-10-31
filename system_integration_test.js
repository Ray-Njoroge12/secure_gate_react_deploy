#!/usr/bin/env node

/**
 * Comprehensive System Integration Test
 * Tests domain integration, Mailgun configuration, and critical paths
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

class SystemIntegrationTest {
  constructor() {
    this.results = {
      domain: {},
      mailgun: {},
      configuration: {},
      criticalPaths: {},
      security: {}
    };
    this.baseUrl = 'https://secure-gate-react-deploy.vercel.app';
    this.localUrl = 'http://localhost:3000';
  }

  async runAllTests() {
    console.log('🧪 COMPREHENSIVE SYSTEM INTEGRATION TEST');
    console.log('========================================\n');

    await this.testDomainIntegration();
    await this.testMailgunConfiguration();
    await this.testConfigurationFiles();
    await this.testCriticalPaths();
    await this.testSecurityConfiguration();
    
    this.generateReport();
  }

  async testDomainIntegration() {
    console.log('1️⃣ DOMAIN INTEGRATION TESTS');
    console.log('---------------------------');

    // Test Vercel domain accessibility
    try {
      const response = await this.makeRequest(this.baseUrl);
      this.results.domain.vercelAccess = {
        status: response.statusCode,
        headers: response.headers,
        accessible: response.statusCode < 400
      };
      console.log(`✅ Vercel Domain: ${response.statusCode} ${response.statusCode < 400 ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);
    } catch (error) {
      this.results.domain.vercelAccess = { error: error.message, accessible: false };
      console.log(`❌ Vercel Domain: ERROR - ${error.message}`);
    }

    // Test SSL/HTTPS
    try {
      const sslInfo = await this.checkSSL(this.baseUrl);
      this.results.domain.ssl = sslInfo;
      console.log(`✅ SSL Certificate: ${sslInfo.valid ? 'VALID' : 'INVALID'}`);
    } catch (error) {
      this.results.domain.ssl = { error: error.message, valid: false };
      console.log(`❌ SSL Certificate: ERROR - ${error.message}`);
    }

    // Test API endpoint routing
    try {
      const apiResponse = await this.makeRequest(`${this.baseUrl}/api/health`);
      this.results.domain.apiRouting = {
        status: apiResponse.statusCode,
        working: apiResponse.statusCode === 200
      };
      console.log(`${apiResponse.statusCode === 200 ? '✅' : '❌'} API Routing: ${apiResponse.statusCode}`);
    } catch (error) {
      this.results.domain.apiRouting = { error: error.message, working: false };
      console.log(`❌ API Routing: ERROR - ${error.message}`);
    }

    console.log('');
  }

  async testMailgunConfiguration() {
    console.log('2️⃣ MAILGUN CONFIGURATION TESTS');
    console.log('------------------------------');

    // Check environment variables
    const envPath = path.join(__dirname, 'secure-gate-access/server/.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      const mailgunDomain = this.extractEnvVar(envContent, 'MAILGUN_DOMAIN');
      const mailgunApiKey = this.extractEnvVar(envContent, 'MAILGUN_API_KEY');
      const emailProvider = this.extractEnvVar(envContent, 'EMAIL_PROVIDER');
      
      this.results.mailgun.configuration = {
        domain: mailgunDomain,
        apiKeyPresent: !!mailgunApiKey,
        provider: emailProvider,
        isSandbox: mailgunDomain?.includes('sandbox')
      };

      console.log(`✅ Mailgun Domain: ${mailgunDomain}`);
      console.log(`✅ API Key: ${mailgunApiKey ? 'PRESENT' : 'MISSING'}`);
      console.log(`✅ Email Provider: ${emailProvider}`);
      console.log(`${mailgunDomain?.includes('sandbox') ? '⚠️' : '✅'} Sandbox Mode: ${mailgunDomain?.includes('sandbox') ? 'YES' : 'NO'}`);
    } else {
      console.log('❌ Environment file not found');
      this.results.mailgun.configuration = { error: 'Environment file not found' };
    }

    console.log('');
  }

  async testConfigurationFiles() {
    console.log('3️⃣ CONFIGURATION FILES TESTS');
    console.log('----------------------------');

    // Test vercel.json
    const vercelConfig = path.join(__dirname, 'vercel.json');
    if (fs.existsSync(vercelConfig)) {
      try {
        const config = JSON.parse(fs.readFileSync(vercelConfig, 'utf8'));
        this.results.configuration.vercel = {
          present: true,
          hasRoutes: !!config.routes,
          hasBuildCommand: !!config.buildCommand,
          hasOutputDirectory: !!config.outputDirectory
        };
        console.log('✅ vercel.json: PRESENT');
        console.log(`✅ Routes configured: ${config.routes ? 'YES' : 'NO'}`);
        console.log(`✅ Build command: ${config.buildCommand ? 'YES' : 'NO'}`);
      } catch (error) {
        console.log(`❌ vercel.json: INVALID JSON - ${error.message}`);
        this.results.configuration.vercel = { error: error.message };
      }
    } else {
      console.log('❌ vercel.json: NOT FOUND');
      this.results.configuration.vercel = { present: false };
    }

    // Test production environment
    const prodEnv = path.join(__dirname, 'secure-gate-access/client/.env.production');
    if (fs.existsSync(prodEnv)) {
      const prodContent = fs.readFileSync(prodEnv, 'utf8');
      const apiUrl = this.extractEnvVar(prodContent, 'REACT_APP_API_URL');
      
      this.results.configuration.production = {
        present: true,
        apiUrl: apiUrl,
        correctDomain: apiUrl?.includes('secure-gate-react-deploy.vercel.app')
      };
      
      console.log('✅ .env.production: PRESENT');
      console.log(`${apiUrl?.includes('secure-gate-react-deploy.vercel.app') ? '✅' : '❌'} API URL: ${apiUrl}`);
    } else {
      console.log('❌ .env.production: NOT FOUND');
      this.results.configuration.production = { present: false };
    }

    console.log('');
  }

  async testCriticalPaths() {
    console.log('4️⃣ CRITICAL PATH TESTS');
    console.log('---------------------');

    // Test build directory
    const buildDir = path.join(__dirname, 'secure-gate-access/client/build');
    if (fs.existsSync(buildDir)) {
      const buildFiles = fs.readdirSync(buildDir);
      this.results.criticalPaths.build = {
        present: true,
        hasIndex: buildFiles.includes('index.html'),
        hasAssets: buildFiles.includes('static'),
        fileCount: buildFiles.length
      };
      
      console.log('✅ Build directory: PRESENT');
      console.log(`✅ index.html: ${buildFiles.includes('index.html') ? 'PRESENT' : 'MISSING'}`);
      console.log(`✅ Static assets: ${buildFiles.includes('static') ? 'PRESENT' : 'MISSING'}`);
    } else {
      console.log('❌ Build directory: NOT FOUND');
      this.results.criticalPaths.build = { present: false };
    }

    // Test package.json
    const clientPackage = path.join(__dirname, 'secure-gate-access/client/package.json');
    if (fs.existsSync(clientPackage)) {
      const packageData = JSON.parse(fs.readFileSync(clientPackage, 'utf8'));
      this.results.criticalPaths.package = {
        present: true,
        hasBuildScript: !!packageData.scripts?.build,
        hasProductionBuild: !!packageData.scripts?.['build:production'],
        proxy: packageData.proxy
      };
      
      console.log('✅ package.json: PRESENT');
      console.log(`✅ Build script: ${packageData.scripts?.build ? 'PRESENT' : 'MISSING'}`);
      console.log(`✅ Production build: ${packageData.scripts?.['build:production'] ? 'PRESENT' : 'MISSING'}`);
      console.log(`⚠️ Proxy setting: ${packageData.proxy || 'NONE'}`);
    } else {
      console.log('❌ package.json: NOT FOUND');
    }

    console.log('');
  }

  async testSecurityConfiguration() {
    console.log('5️⃣ SECURITY CONFIGURATION TESTS');
    console.log('-------------------------------');

    // Check CORS configuration
    const corsConfig = path.join(__dirname, 'secure-gate-access/server/src/config/securityConfig.js');
    if (fs.existsSync(corsConfig)) {
      const corsContent = fs.readFileSync(corsConfig, 'utf8');
      const hasVercelDomain = corsContent.includes('secure-gate-react-deploy.vercel.app');
      
      this.results.security.cors = {
        present: true,
        hasCorrectDomain: hasVercelDomain
      };
      
      console.log('✅ CORS config: PRESENT');
      console.log(`${hasVercelDomain ? '✅' : '❌'} Vercel domain in CORS: ${hasVercelDomain ? 'YES' : 'NO'}`);
    } else {
      console.log('❌ CORS config: NOT FOUND');
      this.results.security.cors = { present: false };
    }

    console.log('');
  }

  generateReport() {
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('========================\n');

    const overallStatus = this.calculateOverallStatus();
    
    console.log(`🎯 Overall Status: ${overallStatus.healthy ? '✅ HEALTHY' : '❌ NEEDS ATTENTION'}`);
    console.log(`📈 Health Score: ${overallStatus.score}/100\n`);

    if (overallStatus.issues.length > 0) {
      console.log('🚨 CRITICAL ISSUES TO FIX:');
      overallStatus.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
      console.log('');
    }

    if (overallStatus.recommendations.length > 0) {
      console.log('💡 RECOMMENDATIONS:');
      overallStatus.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      console.log('');
    }

    // Save detailed results
    fs.writeFileSync('system_test_results.json', JSON.stringify(this.results, null, 2));
    console.log('📄 Detailed results saved to: system_test_results.json');
  }

  calculateOverallStatus() {
    const issues = [];
    const recommendations = [];
    let score = 100;

    // Check domain issues
    if (!this.results.domain.vercelAccess?.accessible) {
      issues.push('Vercel deployment not accessible - check vercel.json configuration');
      score -= 30;
    }

    if (!this.results.domain.ssl?.valid) {
      issues.push('SSL certificate issues detected');
      score -= 10;
    }

    // Check Mailgun issues
    if (this.results.mailgun.configuration?.isSandbox) {
      recommendations.push('Using Mailgun sandbox - add authorized recipients for testing');
    }

    if (!this.results.mailgun.configuration?.apiKeyPresent) {
      issues.push('Mailgun API key missing');
      score -= 20;
    }

    // Check configuration issues
    if (!this.results.configuration.vercel?.present) {
      issues.push('vercel.json configuration missing');
      score -= 25;
    }

    if (!this.results.criticalPaths.build?.present) {
      issues.push('Build directory missing - run npm run build:production');
      score -= 15;
    }

    return {
      healthy: score >= 80,
      score: Math.max(0, score),
      issues,
      recommendations
    };
  }

  // Helper methods
  makeRequest(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const request = client.get(url, (response) => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers
        });
      });
      request.on('error', reject);
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  checkSSL(url) {
    return new Promise((resolve, reject) => {
      const request = https.get(url, (response) => {
        const cert = response.connection.getPeerCertificate();
        resolve({
          valid: response.connection.authorized,
          issuer: cert.issuer,
          validFrom: cert.valid_from,
          validTo: cert.valid_to
        });
      });
      request.on('error', reject);
    });
  }

  extractEnvVar(content, varName) {
    const regex = new RegExp(`^${varName}=(.*)$`, 'm');
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }
}

// Run the tests
const tester = new SystemIntegrationTest();
tester.runAllTests().catch(console.error);
