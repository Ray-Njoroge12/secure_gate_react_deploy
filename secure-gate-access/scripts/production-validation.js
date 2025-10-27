#!/usr/bin/env node

/**
 * Production Deployment Validation Script
 * 
 * This script validates the production deployment and runs comprehensive tests
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class ProductionValidator {
  constructor() {
    this.baseUrl = process.env.FRONTEND_URL || 'https://securegate.com';
    this.apiUrl = process.env.API_URL || 'https://securegate.com/api';
    this.validationResults = [];
    this.criticalIssues = [];
    this.warnings = [];
  }

  /**
   * Log validation result
   */
  logResult(category, test, status, message, details = null) {
    const result = {
      category,
      test,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.validationResults.push(result);
    
    const statusColor = status === 'PASS' ? colors.green : 
                       status === 'WARN' ? colors.yellow : colors.red;
    const statusIcon = status === 'PASS' ? '✓' : 
                      status === 'WARN' ? '⚠' : '✗';
    
    console.log(`   ${statusColor}${statusIcon}${colors.reset} ${test}: ${message}`);
    
    if (status === 'FAIL') {
      this.criticalIssues.push(result);
    } else if (status === 'WARN') {
      this.warnings.push(result);
    }
  }

  /**
   * Make HTTP request
   */
  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        timeout: 10000,
        ...options
      });
      
      return {
        success: true,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url,
        body: options.includeBody ? await response.text() : null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        url
      };
    }
  }

  /**
   * Test application availability
   */
  async testApplicationAvailability() {
    console.log(`${colors.blue}🌐 Testing application availability...${colors.reset}`);
    
    const endpoints = [
      { url: this.baseUrl, name: 'Frontend' },
      { url: `${this.apiUrl}/health`, name: 'API Health' },
      { url: `${this.apiUrl}/system/info`, name: 'System Info' }
    ];
    
    for (const endpoint of endpoints) {
      const response = await this.makeRequest(endpoint.url);
      
      if (response.success && response.status === 200) {
        this.logResult('Availability', endpoint.name, 'PASS', 'Endpoint accessible');
      } else {
        this.logResult('Availability', endpoint.name, 'FAIL', 
          `Endpoint not accessible (${response.status || 'error'})`);
      }
    }
  }

  /**
   * Test SSL/TLS configuration
   */
  async testSSLConfiguration() {
    console.log(`${colors.blue}🔒 Testing SSL/TLS configuration...${colors.reset}`);
    
    const response = await this.makeRequest(this.baseUrl);
    
    if (response.success && response.url.startsWith('https://')) {
      this.logResult('SSL', 'HTTPS Enforcement', 'PASS', 'HTTPS properly configured');
      
      // Check security headers
      const securityHeaders = [
        'strict-transport-security',
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'content-security-policy'
      ];
      
      let headerCount = 0;
      for (const header of securityHeaders) {
        if (response.headers[header]) {
          headerCount++;
        }
      }
      
      const headerScore = Math.round((headerCount / securityHeaders.length) * 100);
      
      if (headerScore >= 80) {
        this.logResult('SSL', 'Security Headers', 'PASS', `${headerScore}% of security headers present`);
      } else {
        this.logResult('SSL', 'Security Headers', 'WARN', `${headerScore}% of security headers present`);
      }
    } else {
      this.logResult('SSL', 'HTTPS Enforcement', 'FAIL', 'HTTPS not properly configured');
    }
  }

  /**
   * Test API functionality
   */
  async testAPIFunctionality() {
    console.log(`${colors.blue}🔌 Testing API functionality...${colors.reset}`);
    
    const apiTests = [
      {
        name: 'Health Check',
        url: `${this.apiUrl}/health`,
        expectedStatus: 200
      },
      {
        name: 'System Info',
        url: `${this.apiUrl}/system/info`,
        expectedStatus: 200
      },
      {
        name: 'Cache Stats',
        url: `${this.apiUrl}/cache/stats`,
        expectedStatus: 200
      },
      {
        name: 'Unauthorized Access',
        url: `${this.apiUrl}/users/profile`,
        expectedStatus: 401
      }
    ];
    
    for (const test of apiTests) {
      const response = await this.makeRequest(test.url);
      
      if (response.success && response.status === test.expectedStatus) {
        this.logResult('API', test.name, 'PASS', `Expected status ${test.expectedStatus} received`);
      } else {
        this.logResult('API', test.name, 'FAIL', 
          `Expected status ${test.expectedStatus}, got ${response.status || 'error'}`);
      }
    }
  }

  /**
   * Test performance
   */
  async testPerformance() {
    console.log(`${colors.blue}⚡ Testing performance...${colors.reset}`);
    
    const performanceTests = [
      { url: this.baseUrl, name: 'Frontend Load Time' },
      { url: `${this.apiUrl}/health`, name: 'API Response Time' }
    ];
    
    for (const test of performanceTests) {
      const startTime = Date.now();
      const response = await this.makeRequest(test.url);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.success) {
        if (responseTime < 1000) {
          this.logResult('Performance', test.name, 'PASS', `${responseTime}ms (excellent)`);
        } else if (responseTime < 2000) {
          this.logResult('Performance', test.name, 'PASS', `${responseTime}ms (good)`);
        } else if (responseTime < 5000) {
          this.logResult('Performance', test.name, 'WARN', `${responseTime}ms (acceptable)`);
        } else {
          this.logResult('Performance', test.name, 'FAIL', `${responseTime}ms (poor)`);
        }
      } else {
        this.logResult('Performance', test.name, 'FAIL', 'Request failed');
      }
    }
  }

  /**
   * Test caching functionality
   */
  async testCachingFunctionality() {
    console.log(`${colors.blue}💾 Testing caching functionality...${colors.reset}`);
    
    // Test cache stats endpoint
    const cacheStatsResponse = await this.makeRequest(`${this.apiUrl}/cache/stats`);
    
    if (cacheStatsResponse.success && cacheStatsResponse.status === 200) {
      this.logResult('Caching', 'Cache Stats Endpoint', 'PASS', 'Cache stats accessible');
      
      // Test cache headers
      const testResponse = await this.makeRequest(`${this.apiUrl}/health`);
      if (testResponse.headers['x-cache-status']) {
        this.logResult('Caching', 'Cache Headers', 'PASS', 'Cache headers present');
      } else {
        this.logResult('Caching', 'Cache Headers', 'WARN', 'Cache headers not detected');
      }
    } else {
      this.logResult('Caching', 'Cache Stats Endpoint', 'FAIL', 'Cache stats not accessible');
    }
  }

  /**
   * Test security features
   */
  async testSecurityFeatures() {
    console.log(`${colors.blue}🛡️ Testing security features...${colors.reset}`);
    
    // Test rate limiting
    let rateLimitHit = false;
    for (let i = 0; i < 20; i++) {
      const response = await this.makeRequest(`${this.apiUrl}/health`);
      if (response.success && response.status === 429) {
        rateLimitHit = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (rateLimitHit) {
      this.logResult('Security', 'Rate Limiting', 'PASS', 'Rate limiting active');
    } else {
      this.logResult('Security', 'Rate Limiting', 'WARN', 'Rate limiting not detected');
    }
    
    // Test SQL injection protection
    const sqlTestResponse = await this.makeRequest(`${this.apiUrl}/auth/login?username=' OR '1'='1`);
    if (sqlTestResponse.success && (sqlTestResponse.status === 400 || sqlTestResponse.status === 403)) {
      this.logResult('Security', 'SQL Injection Protection', 'PASS', 'SQL injection blocked');
    } else {
      this.logResult('Security', 'SQL Injection Protection', 'WARN', 'SQL injection protection not confirmed');
    }
  }

  /**
   * Test monitoring endpoints
   */
  async testMonitoringEndpoints() {
    console.log(`${colors.blue}📊 Testing monitoring endpoints...${colors.reset}`);
    
    const monitoringEndpoints = [
      { url: `${this.apiUrl}/health`, name: 'Health Check' },
      { url: `${this.apiUrl}/system/info`, name: 'System Info' },
      { url: `${this.apiUrl}/cache/stats`, name: 'Cache Stats' }
    ];
    
    for (const endpoint of monitoringEndpoints) {
      const response = await this.makeRequest(endpoint.url);
      
      if (response.success && response.status === 200) {
        this.logResult('Monitoring', endpoint.name, 'PASS', 'Monitoring endpoint accessible');
      } else {
        this.logResult('Monitoring', endpoint.name, 'FAIL', 
          `Monitoring endpoint not accessible (${response.status || 'error'})`);
      }
    }
  }

  /**
   * Test database connectivity
   */
  async testDatabaseConnectivity() {
    console.log(`${colors.blue}🗄️ Testing database connectivity...${colors.reset}`);
    
    // Test system info endpoint which should require database access
    const response = await this.makeRequest(`${this.apiUrl}/system/info`);
    
    if (response.success && response.status === 200) {
      this.logResult('Database', 'Database Connectivity', 'PASS', 'Database connection working');
    } else {
      this.logResult('Database', 'Database Connectivity', 'FAIL', 
        `Database connection issue (${response.status || 'error'})`);
    }
  }

  /**
   * Test Docker containers
   */
  async testDockerContainers() {
    console.log(`${colors.blue}🐳 Testing Docker containers...${colors.reset}`);
    
    try {
      // Check if Docker is running
      const dockerPsOutput = execSync('docker ps --format "table {{.Names}}\t{{.Status}}"', { encoding: 'utf8' });
      
      if (dockerPsOutput.includes('securegate')) {
        this.logResult('Docker', 'Container Status', 'PASS', 'SecureGate containers running');
      } else {
        this.logResult('Docker', 'Container Status', 'WARN', 'SecureGate containers not detected');
      }
      
      // Check container health
      const healthCheckOutput = execSync('docker ps --filter "health=healthy" --format "{{.Names}}"', { encoding: 'utf8' });
      
      if (healthCheckOutput.includes('securegate')) {
        this.logResult('Docker', 'Container Health', 'PASS', 'Containers healthy');
      } else {
        this.logResult('Docker', 'Container Health', 'WARN', 'Container health status unclear');
      }
      
    } catch (error) {
      this.logResult('Docker', 'Container Check', 'WARN', 'Could not check container status');
    }
  }

  /**
   * Test log files
   */
  async testLogFiles() {
    console.log(`${colors.blue}📝 Testing log files...${colors.reset}`);
    
    const logsDir = path.join(process.cwd(), 'logs');
    
    if (fs.existsSync(logsDir)) {
      this.logResult('Logging', 'Logs Directory', 'PASS', 'Logs directory exists');
      
      // Check for recent log files
      const logFiles = fs.readdirSync(logsDir).filter(file => file.endsWith('.log'));
      
      if (logFiles.length > 0) {
        this.logResult('Logging', 'Log Files', 'PASS', `${logFiles.length} log files found`);
      } else {
        this.logResult('Logging', 'Log Files', 'WARN', 'No log files found');
      }
    } else {
      this.logResult('Logging', 'Logs Directory', 'WARN', 'Logs directory not found');
    }
  }

  /**
   * Generate production validation report
   */
  generateProductionReport() {
    console.log(`${colors.blue}📋 Generating production validation report...${colors.reset}`);
    
    // Calculate overall score
    const totalTests = this.validationResults.length;
    const passedTests = this.validationResults.filter(r => r.status === 'PASS').length;
    const warningTests = this.validationResults.filter(r => r.status === 'WARN').length;
    const failedTests = this.validationResults.filter(r => r.status === 'FAIL').length;
    
    const overallScore = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    // Determine production readiness
    let productionStatus = 'NOT_READY';
    let statusColor = colors.red;
    
    if (failedTests === 0 && warningTests <= 3) {
      productionStatus = 'READY';
      statusColor = colors.green;
    } else if (failedTests <= 1 && warningTests <= 5) {
      productionStatus = 'READY_WITH_WARNINGS';
      statusColor = colors.yellow;
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      apiUrl: this.apiUrl,
      productionStatus,
      overallScore,
      summary: {
        totalTests,
        passedTests,
        warningTests,
        failedTests,
        criticalIssues: this.criticalIssues.length,
        warnings: this.warnings.length
      },
      results: this.validationResults,
      criticalIssues: this.criticalIssues,
      warnings: this.warnings,
      recommendations: this.generateRecommendations()
    };
    
    console.log(`${colors.green}✓${colors.reset} Production validation report generated`);
    
    // Display summary
    console.log(`\n${colors.cyan}📊 Production Validation Summary:${colors.reset}`);
    console.log(`   Overall Score: ${overallScore}/100`);
    console.log(`   Production Status: ${statusColor}${productionStatus}${colors.reset}`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Warnings: ${warningTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Critical Issues: ${this.criticalIssues.length}`);
    
    return report;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.criticalIssues.length > 0) {
      recommendations.push('Address all critical issues immediately');
    }
    
    if (this.warnings.length > 0) {
      recommendations.push('Review and address warnings for optimal performance');
    }
    
    recommendations.push('Monitor application performance continuously');
    recommendations.push('Set up automated health checks');
    recommendations.push('Schedule regular security audits');
    recommendations.push('Implement log monitoring and alerting');
    recommendations.push('Plan for scaling and capacity management');
    recommendations.push('Establish incident response procedures');
    recommendations.push('Schedule regular maintenance windows');
    recommendations.push('Keep documentation updated');
    
    return recommendations;
  }

  /**
   * Save report to file
   */
  saveReportToFile(report) {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const reportFile = path.join(logsDir, `production-validation-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`${colors.blue}   Report saved to: ${reportFile}${colors.reset}`);
    return reportFile;
  }

  /**
   * Run complete production validation
   */
  async runValidation() {
    console.log(`${colors.bright}${colors.blue}🚀 Starting Production Deployment Validation${colors.reset}\n`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`API URL: ${this.apiUrl}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);
    
    try {
      await this.testApplicationAvailability();
      await this.testSSLConfiguration();
      await this.testAPIFunctionality();
      await this.testPerformance();
      await this.testCachingFunctionality();
      await this.testSecurityFeatures();
      await this.testMonitoringEndpoints();
      await this.testDatabaseConnectivity();
      await this.testDockerContainers();
      await this.testLogFiles();
      
      const report = this.generateProductionReport();
      const reportFile = this.saveReportToFile(report);
      
      console.log(`\n${colors.bright}${colors.green}🎉 Production validation completed!${colors.reset}`);
      
      console.log(`\n${colors.blue}💡 Recommendations:${colors.reset}`);
      for (const recommendation of report.recommendations) {
        console.log(`   • ${recommendation}`);
      }
      
      if (report.productionStatus === 'READY') {
        console.log(`\n${colors.bright}${colors.green}✅ Production deployment is READY and VALIDATED!${colors.reset}`);
      } else if (report.productionStatus === 'READY_WITH_WARNINGS') {
        console.log(`\n${colors.bright}${colors.yellow}⚠️ Production deployment is ready with warnings${colors.reset}`);
      } else {
        console.log(`\n${colors.bright}${colors.red}❌ Production deployment needs attention${colors.reset}`);
      }
      
      return report;
    } catch (error) {
      console.log(`\n${colors.red}❌ Production validation failed: ${error.message}${colors.reset}`);
      throw error;
    }
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ProductionValidator();
  validator.runValidation().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

export default ProductionValidator;
