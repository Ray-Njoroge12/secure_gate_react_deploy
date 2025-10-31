const https = require('https');
const fs = require('fs');

class ComprehensiveDeploymentTest {
  constructor() {
    this.baseUrl = 'https://secure-gate-react-deploy.vercel.app';
    this.results = {
      deployment: {},
      frontend: {},
      backend: {},
      mailgun: {},
      errors: []
    };
  }

  async runAllTests() {
    console.log('🔍 COMPREHENSIVE DEPLOYMENT ANALYSIS STARTING...\n');
    
    try {
      await this.testDeploymentStatus();
      await this.testFrontendStructure();
      await this.testBackendAPI();
      await this.testMailgunIntegration();
      await this.generateReport();
    } catch (error) {
      console.error('❌ Critical test failure:', error.message);
      this.results.errors.push(error.message);
    }
  }

  async testDeploymentStatus() {
    console.log('📊 Testing Deployment Status...');
    
    return new Promise((resolve) => {
      const req = https.get(this.baseUrl, (res) => {
        this.results.deployment = {
          status: res.statusCode,
          headers: res.headers,
          contentType: res.headers['content-type'],
          server: res.headers['server']
        };
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          this.results.deployment.hasContent = data.length > 0;
          this.results.deployment.isHTML = data.includes('<html');
          this.results.deployment.hasReact = data.includes('react');
          
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Content-Type: ${res.headers['content-type']}`);
          console.log(`   Has HTML: ${this.results.deployment.isHTML}`);
          resolve();
        });
      });
      
      req.on('error', (error) => {
        this.results.deployment.error = error.message;
        console.log(`   ❌ Error: ${error.message}`);
        resolve();
      });
      
      req.setTimeout(10000, () => {
        this.results.deployment.error = 'Timeout';
        console.log('   ❌ Request timeout');
        resolve();
      });
    });
  }

  async testFrontendStructure() {
    console.log('\n🎨 Testing Frontend Structure...');
    
    // Test common frontend routes
    const routes = ['/', '/login', '/register', '/dashboard'];
    
    for (const route of routes) {
      await this.testRoute(route);
    }
  }

  async testRoute(route) {
    return new Promise((resolve) => {
      const url = `${this.baseUrl}${route}`;
      const req = https.get(url, (res) => {
        console.log(`   ${route}: ${res.statusCode}`);
        
        if (!this.results.frontend.routes) {
          this.results.frontend.routes = {};
        }
        this.results.frontend.routes[route] = res.statusCode;
        resolve();
      });
      
      req.on('error', () => {
        if (!this.results.frontend.routes) {
          this.results.frontend.routes = {};
        }
        this.results.frontend.routes[route] = 'ERROR';
        resolve();
      });
      
      req.setTimeout(5000, () => {
        if (!this.results.frontend.routes) {
          this.results.frontend.routes = {};
        }
        this.results.frontend.routes[route] = 'TIMEOUT';
        resolve();
      });
    });
  }

  async testBackendAPI() {
    console.log('\n🔧 Testing Backend API...');
    
    const apiEndpoints = [
      '/api/health',
      '/api/auth/login',
      '/api/visitors'
    ];
    
    for (const endpoint of apiEndpoints) {
      await this.testAPIEndpoint(endpoint);
    }
  }

  async testAPIEndpoint(endpoint) {
    return new Promise((resolve) => {
      const url = `${this.baseUrl}${endpoint}`;
      const req = https.get(url, (res) => {
        console.log(`   ${endpoint}: ${res.statusCode}`);
        
        if (!this.results.backend.endpoints) {
          this.results.backend.endpoints = {};
        }
        this.results.backend.endpoints[endpoint] = res.statusCode;
        resolve();
      });
      
      req.on('error', () => {
        if (!this.results.backend.endpoints) {
          this.results.backend.endpoints = {};
        }
        this.results.backend.endpoints[endpoint] = 'ERROR';
        resolve();
      });
      
      req.setTimeout(5000, () => {
        if (!this.results.backend.endpoints) {
          this.results.backend.endpoints = {};
        }
        this.results.backend.endpoints[endpoint] = 'TIMEOUT';
        resolve();
      });
    });
  }

  async testMailgunIntegration() {
    console.log('\n📧 Testing Mailgun Configuration...');
    
    try {
      // Check environment variables from local config
      const envContent = fs.readFileSync('./secure-gate-access/server/.env', 'utf8');
      const mailgunDomain = envContent.match(/MAILGUN_DOMAIN=(.+)/)?.[1];
      const mailgunApiKey = envContent.match(/MAILGUN_API_KEY=(.+)/)?.[1];
      
      this.results.mailgun = {
        domain: mailgunDomain,
        hasApiKey: !!mailgunApiKey,
        isSandbox: mailgunDomain?.includes('sandbox'),
        configuration: 'LOCAL_ENV_FOUND'
      };
      
      console.log(`   Domain: ${mailgunDomain}`);
      console.log(`   Is Sandbox: ${this.results.mailgun.isSandbox}`);
      console.log(`   Has API Key: ${this.results.mailgun.hasApiKey}`);
      
    } catch (error) {
      this.results.mailgun.error = error.message;
      console.log(`   ❌ Config Error: ${error.message}`);
    }
  }

  async generateReport() {
    console.log('\n📋 COMPREHENSIVE TEST REPORT');
    console.log('================================\n');
    
    // Deployment Analysis
    console.log('🚀 DEPLOYMENT STATUS:');
    if (this.results.deployment.status === 200) {
      console.log('   ✅ Site is live and accessible');
    } else if (this.results.deployment.status === 404) {
      console.log('   ❌ Site returns 404 - Build/routing issue');
    } else {
      console.log(`   ⚠️  Site returns ${this.results.deployment.status}`);
    }
    
    if (this.results.deployment.isHTML) {
      console.log('   ✅ Serving HTML content');
    } else {
      console.log('   ❌ Not serving HTML content');
    }
    
    // Frontend Analysis
    console.log('\n🎨 FRONTEND ANALYSIS:');
    if (this.results.frontend.routes) {
      Object.entries(this.results.frontend.routes).forEach(([route, status]) => {
        const icon = status === 200 ? '✅' : status === 404 ? '❌' : '⚠️';
        console.log(`   ${icon} ${route}: ${status}`);
      });
    }
    
    // Backend Analysis
    console.log('\n🔧 BACKEND ANALYSIS:');
    if (this.results.backend.endpoints) {
      Object.entries(this.results.backend.endpoints).forEach(([endpoint, status]) => {
        const icon = status === 200 ? '✅' : status === 404 ? '❌' : '⚠️';
        console.log(`   ${icon} ${endpoint}: ${status}`);
      });
    }
    
    // Mailgun Analysis
    console.log('\n📧 MAILGUN ANALYSIS:');
    if (this.results.mailgun.domain) {
      console.log(`   ✅ Domain configured: ${this.results.mailgun.domain}`);
      console.log(`   ${this.results.mailgun.isSandbox ? '⚠️' : '✅'} Sandbox mode: ${this.results.mailgun.isSandbox}`);
      console.log(`   ${this.results.mailgun.hasApiKey ? '✅' : '❌'} API Key present: ${this.results.mailgun.hasApiKey}`);
    } else {
      console.log('   ❌ Mailgun configuration not found');
    }
    
    // Critical Issues
    console.log('\n🚨 CRITICAL ISSUES IDENTIFIED:');
    if (this.results.deployment.status !== 200) {
      console.log('   1. ❌ Deployment not serving content properly');
      console.log('      - Check build output directory');
      console.log('      - Verify vercel.json configuration');
      console.log('      - Check deployment logs in Vercel dashboard');
    }
    
    if (!this.results.backend.endpoints || Object.values(this.results.backend.endpoints).every(status => status !== 200)) {
      console.log('   2. ❌ Backend API not accessible');
      console.log('      - Backend may not be deployed');
      console.log('      - Check serverless function configuration');
    }
    
    if (this.results.mailgun.isSandbox) {
      console.log('   3. ⚠️  Mailgun in sandbox mode');
      console.log('      - Emails restricted to authorized recipients');
      console.log('      - Add test emails to authorized recipients list');
    }
    
    // Recommendations
    console.log('\n💡 IMMEDIATE RECOMMENDATIONS:');
    console.log('   1. Fix Vercel deployment configuration');
    console.log('   2. Test local build before deploying');
    console.log('   3. Configure backend serverless functions');
    console.log('   4. Add test emails to Mailgun authorized recipients');
    console.log('   5. Set up environment variables in Vercel dashboard');
    
    // Save detailed report
    fs.writeFileSync('./DEPLOYMENT_TEST_RESULTS.json', JSON.stringify(this.results, null, 2));
    console.log('\n📄 Detailed results saved to: DEPLOYMENT_TEST_RESULTS.json');
  }
}

// Run the comprehensive test
const tester = new ComprehensiveDeploymentTest();
tester.runAllTests().then(() => {
  console.log('\n🎯 COMPREHENSIVE TESTING COMPLETE!');
}).catch(error => {
  console.error('💥 Test suite failed:', error);
});
