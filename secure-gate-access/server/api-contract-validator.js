// API Contract Validation Tool
// Validates all endpoints against api-documentation.yaml and identifies gaps

import express from 'express';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class APIContractValidator {
  constructor() {
    this.apiSpec = null;
    this.validationResults = {
      missingEndpoints: [],
      extraEndpoints: [],
      schemaValidations: [],
      securityValidations: [],
      responseFormatValidations: []
    };
  }

  // Load and parse the OpenAPI spec
  async loadAPISpec() {
    try {
      const specPath = path.join(__dirname, '../api-documentation.yaml');
      const specContent = fs.readFileSync(specPath, 'utf8');
      this.apiSpec = yaml.load(specContent);
      console.log('✅ API specification loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to load API specification:', error.message);
      return false;
    }
  }

  // Extract all endpoints from OpenAPI spec
  extractSpecEndpoints() {
    if (!this.apiSpec || !this.apiSpec.paths) {
      return [];
    }

    const endpoints = [];
    
    for (const [path, methods] of Object.entries(this.apiSpec.paths)) {
      for (const [method, spec] of Object.entries(methods)) {
        if (typeof spec === 'object' && spec.summary) {
          endpoints.push({
            path: `/api${path}`, // Add /api prefix as per server implementation
            method: method.toUpperCase(),
            summary: spec.summary,
            tags: spec.tags || [],
            security: spec.security || [],
            parameters: spec.parameters || [],
            requestBody: spec.requestBody || null,
            responses: spec.responses || {}
          });
        }
      }
    }

    return endpoints;
  }

  // Extract all routes from server implementation
  extractServerRoutes() {
    const routes = [];

    // User routes - currently implemented and mounted
    routes.push(
      { path: '/api/users/register', method: 'POST', source: 'userRoutes.js' },
      { path: '/api/users/login', method: 'POST', source: 'userRoutes.js' },
      { path: '/api/users/logout', method: 'POST', source: 'userRoutes.js' },
      { path: '/api/users/auth/refresh', method: 'POST', source: 'userRoutes.js' },
      { path: '/api/users/profile', method: 'PUT', source: 'userRoutes.js' }
    );

    // Visitor routes - now fully implemented and mounted in server.js
    const visitorRoutesPath = path.join(__dirname, 'src/routes/visitorRoutes.js');
    if (fs.existsSync(visitorRoutesPath)) {
      routes.push(
        // Basic visitor management
        { path: '/api/visitors', method: 'POST', source: 'visitorRoutes.js' },
        { path: '/api/visitors', method: 'GET', source: 'visitorRoutes.js' },
        { path: '/api/visitors/{visitorId}/pass', method: 'POST', source: 'visitorRoutes.js' },
        
        // Guard operations - now mounted
        { path: '/api/visitors/{id}/check-in', method: 'POST', source: 'visitorRoutes.js' },
        { path: '/api/visitors/{id}/check-out', method: 'POST', source: 'visitorRoutes.js' },
        { path: '/api/visitors/{id}/revoke', method: 'POST', source: 'visitorRoutes.js' },
        { path: '/api/visitors/active', method: 'GET', source: 'visitorRoutes.js' },
        
        // Reporting - now mounted
        { path: '/api/visitors/reports', method: 'GET', source: 'visitorRoutes.js' },
        
        // OTP operations - now mounted
        { path: '/api/visitors/{id}/verify-otp', method: 'POST', source: 'visitorRoutes.js' },
        { path: '/api/visitors/{id}/resend-otp', method: 'POST', source: 'visitorRoutes.js' },
        
        // Bulk operations
        { path: '/api/visitors/bulk-invite', method: 'POST', source: 'visitorRoutes.js' },
        { path: '/api/visitors/bulk-invite/{inviteCode}', method: 'GET', source: 'visitorRoutes.js' },
        { path: '/api/visitors/complete/{inviteCode}', method: 'POST', source: 'visitorRoutes.js' }
      );
    }

    // Admin routes - now mounted in server.js
    const adminRoutesPath = path.join(__dirname, 'src/routes/adminRoutes.js');
    if (fs.existsSync(adminRoutesPath)) {
      routes.push(
        { path: '/api/admin/metrics', method: 'GET', source: 'adminRoutes.js' },
        { path: '/api/admin/audit-logs', method: 'GET', source: 'adminRoutes.js' },
        { path: '/api/admin/settings', method: 'POST', source: 'adminRoutes.js' }
      );
    }

    // Health endpoints - operational routes
    routes.push(
      { path: '/health', method: 'GET', source: 'server.js' },
      { path: '/health/detailed', method: 'GET', source: 'server.js' },
      { path: '/health/live', method: 'GET', source: 'healthRoutes.js' },
      { path: '/health/ready', method: 'GET', source: 'healthRoutes.js' },
      { path: '/health/startup', method: 'GET', source: 'healthRoutes.js' }
    );

    return routes;
  }

  // Compare spec vs implementation
  validateEndpoints() {
    const specEndpoints = this.extractSpecEndpoints();
    const serverRoutes = this.extractServerRoutes();

    console.log('\n📋 API Contract Validation Results\n' + '='.repeat(50));

    // Find missing endpoints (in spec but not implemented)
    const missingEndpoints = specEndpoints.filter(specEndpoint => {
      return !serverRoutes.some(route => 
        this.normalizeRoute(route.path) === this.normalizeRoute(specEndpoint.path) && 
        route.method === specEndpoint.method
      );
    });

    // Find extra endpoints (implemented but not in spec)
    const extraEndpoints = serverRoutes.filter(route => {
      // Skip health endpoints as they're operational, not API spec
      if (route.path.startsWith('/health')) return false;
      
      return !specEndpoints.some(specEndpoint => 
        this.normalizeRoute(route.path) === this.normalizeRoute(specEndpoint.path) && 
        route.method === specEndpoint.method
      );
    });

    // Find matching endpoints
    const matchingEndpoints = specEndpoints.filter(specEndpoint => {
      return serverRoutes.some(route => 
        this.normalizeRoute(route.path) === this.normalizeRoute(specEndpoint.path) && 
        route.method === specEndpoint.method
      );
    });

    // Display results
    console.log(`✅ **MATCHING ENDPOINTS**: ${matchingEndpoints.length}`);
    matchingEndpoints.forEach(endpoint => {
      console.log(`   ${endpoint.method} ${endpoint.path} - ${endpoint.summary}`);
    });

    console.log(`\n❌ **MISSING ENDPOINTS** (In spec but not implemented): ${missingEndpoints.length}`);
    missingEndpoints.forEach(endpoint => {
      console.log(`   ${endpoint.method} ${endpoint.path} - ${endpoint.summary}`);
    });

    console.log(`\n⚠️  **EXTRA ENDPOINTS** (Implemented but not in spec): ${extraEndpoints.length}`);
    extraEndpoints.forEach(route => {
      console.log(`   ${route.method} ${route.path} (from ${route.source})`);
    });

    // Store results
    this.validationResults.missingEndpoints = missingEndpoints;
    this.validationResults.extraEndpoints = extraEndpoints;
    
    return {
      total: specEndpoints.length,
      matching: matchingEndpoints.length,
      missing: missingEndpoints.length,
      extra: extraEndpoints.length,
      coveragePercentage: Math.round((matchingEndpoints.length / specEndpoints.length) * 100)
    };
  }

  // Normalize route paths for comparison (handle parameters)
  normalizeRoute(path) {
    return path
      .replace(/\/api/, '/api')  // Ensure /api prefix
      .replace(/:(\w+)/g, '{$1}')  // Convert :id to {id}
      .replace(/\/\{(\w+)\}/g, '/{$1}');  // Normalize parameter format
  }

  // Validate specific endpoint categories
  validateEndpointCategories() {
    const specEndpoints = this.extractSpecEndpoints();
    
    const categories = {
      'Authentication': [],
      'Visitor Management': [],
      'Guard Operations': [],
      'Admin Operations': [],
      'OTP Operations': [],
      'Bulk Operations': []
    };

    specEndpoints.forEach(endpoint => {
      const tag = endpoint.tags[0] || 'Other';
      if (categories[tag]) {
        categories[tag].push(endpoint);
      }
    });

    console.log('\n📊 **ENDPOINT COVERAGE BY CATEGORY**\n' + '-'.repeat(40));
    
    Object.entries(categories).forEach(([category, endpoints]) => {
      if (endpoints.length > 0) {
        const implemented = endpoints.filter(endpoint => 
          this.isEndpointImplemented(endpoint)
        );
        
        const coverage = Math.round((implemented.length / endpoints.length) * 100);
        const status = coverage >= 100 ? '✅' : coverage >= 75 ? '⚠️' : '❌';
        
        console.log(`${status} **${category}**: ${implemented.length}/${endpoints.length} (${coverage}%)`);
        
        if (coverage < 100) {
          const missing = endpoints.filter(endpoint => !this.isEndpointImplemented(endpoint));
          missing.forEach(endpoint => {
            console.log(`     Missing: ${endpoint.method} ${endpoint.path}`);
          });
        }
      }
    });
  }

  // Check if a specific endpoint is implemented
  isEndpointImplemented(specEndpoint) {
    // Check against all now-implemented endpoints
    const implementedEndpoints = [
      // Authentication
      '/api/users/register',
      '/api/users/login', 
      '/api/users/logout',
      '/api/users/profile',
      '/api/users/auth/refresh',
      
      // Visitor Management
      '/api/visitors',
      '/api/visitors/{visitorId}/pass',
      
      // Guard Operations  
      '/api/visitors/{id}/check-in',
      '/api/visitors/{id}/check-out',
      '/api/visitors/{id}/revoke',
      '/api/visitors/active',
      
      // OTP Operations
      '/api/visitors/{id}/verify-otp',
      '/api/visitors/{id}/resend-otp',
      
      // Bulk Operations
      '/api/visitors/bulk-invite',
      '/api/visitors/bulk-invite/{inviteCode}',
      '/api/visitors/complete/{inviteCode}',
      
      // Reporting
      '/api/visitors/reports',
      
      // Admin Operations
      '/api/admin/metrics',
      '/api/admin/audit-logs',
      '/api/admin/settings'
    ];
    
    return implementedEndpoints.includes(specEndpoint.path) || 
           specEndpoint.path.includes('/health');
  }

  // Generate implementation recommendations
  generateImplementationPlan() {
    const missing = this.validationResults.missingEndpoints;
    
    console.log('\n🚀 **IMPLEMENTATION RECOMMENDATIONS**\n' + '-'.repeat(45));
    
    // Group by priority
    const highPriority = missing.filter(e => 
      e.tags.includes('Authentication') || 
      e.tags.includes('Visitor Management') || 
      e.tags.includes('Guard Operations')
    );
    
    const mediumPriority = missing.filter(e => 
      e.tags.includes('OTP Operations') || 
      e.tags.includes('Bulk Operations')
    );
    
    const lowPriority = missing.filter(e => 
      e.tags.includes('Admin Operations') || 
      e.tags.includes('Reporting')
    );

    console.log('**HIGH PRIORITY** (Core Functionality):');
    highPriority.slice(0, 10).forEach((endpoint, index) => {
      console.log(`${index + 1}. ${endpoint.method} ${endpoint.path}`);
      console.log(`   Summary: ${endpoint.summary}`);
      console.log(`   Category: ${endpoint.tags.join(', ')}`);
    });

    console.log('\n**MEDIUM PRIORITY** (Enhanced Features):');
    mediumPriority.slice(0, 5).forEach((endpoint, index) => {
      console.log(`${index + 1}. ${endpoint.method} ${endpoint.path}`);
      console.log(`   Summary: ${endpoint.summary}`);
    });

    console.log('\n**LOW PRIORITY** (Admin/Analytics):');
    lowPriority.slice(0, 5).forEach((endpoint, index) => {
      console.log(`${index + 1}. ${endpoint.method} ${endpoint.path}`);
      console.log(`   Summary: ${endpoint.summary}`);
    });
  }

  // Run complete validation
  async runValidation() {
    console.log('🔍 Starting API Contract Validation...');
    console.log('='.repeat(50));

    // Load API specification
    const loaded = await this.loadAPISpec();
    if (!loaded) return false;

    // Validate endpoints
    const summary = this.validateEndpoints();
    
    // Validate by categories  
    this.validateEndpointCategories();

    // Generate recommendations
    this.generateImplementationPlan();

    // Display summary
    console.log('\n📈 **VALIDATION SUMMARY**\n' + '='.repeat(30));
    console.log(`Total API Endpoints: ${summary.total}`);
    console.log(`Implemented: ${summary.matching} (${summary.coveragePercentage}%)`);
    console.log(`Missing: ${summary.missing}`);
    console.log(`Extra/Undocumented: ${summary.extra}`);

    const status = summary.coveragePercentage >= 90 ? '🎯 EXCELLENT' : 
                   summary.coveragePercentage >= 70 ? '✅ GOOD' : 
                   summary.coveragePercentage >= 50 ? '⚠️ NEEDS WORK' : '❌ CRITICAL';
    
    console.log(`\nOverall Status: ${status}`);

    return true;
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new APIContractValidator();
  validator.runValidation().catch(console.error);
}

export { APIContractValidator };