#!/usr/bin/env node

/**
 * CDN Performance Testing Script
 * 
 * This script tests CDN and load balancer performance improvements
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';
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

class CDNPerformanceTester {
  constructor() {
    this.baseUrl = process.env.FRONTEND_URL || 'https://securegate.com';
    this.apiUrl = process.env.API_URL || 'https://securegate.com/api';
    this.testResults = [];
    this.concurrency = 10;
    this.iterations = 50;
  }

  /**
   * Measure response time for a single request
   */
  async measureResponseTime(url, options = {}) {
    const start = performance.now();
    
    try {
      const response = await fetch(url, {
        timeout: 30000,
        ...options
      });
      
      const end = performance.now();
      const responseTime = end - start;
      
      return {
        success: true,
        status: response.status,
        responseTime,
        contentLength: response.headers.get('content-length'),
        cacheStatus: response.headers.get('cf-cache-status') || response.headers.get('x-cache-status'),
        server: response.headers.get('server'),
        contentType: response.headers.get('content-type'),
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      const end = performance.now();
      return {
        success: false,
        error: error.message,
        responseTime: end - performance.now()
      };
    }
  }

  /**
   * Run concurrent requests
   */
  async runConcurrentRequests(url, options = {}) {
    const promises = Array(this.concurrency).fill().map(() => 
      this.measureResponseTime(url, options)
    );
    
    const results = await Promise.all(promises);
    return results;
  }

  /**
   * Calculate statistics from results
   */
  calculateStats(results) {
    const successful = results.filter(r => r.success);
    const responseTimes = successful.map(r => r.responseTime);
    
    if (responseTimes.length === 0) {
      return {
        success: false,
        error: 'No successful requests'
      };
    }
    
    responseTimes.sort((a, b) => a - b);
    
    const min = responseTimes[0];
    const max = responseTimes[responseTimes.length - 1];
    const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const median = responseTimes[Math.floor(responseTimes.length / 2)];
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];
    
    return {
      success: true,
      total: results.length,
      successful: successful.length,
      failed: results.length - successful.length,
      successRate: (successful.length / results.length) * 100,
      responseTime: {
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        avg: Math.round(avg * 100) / 100,
        median: Math.round(median * 100) / 100,
        p95: Math.round(p95 * 100) / 100,
        p99: Math.round(p99 * 100) / 100
      },
      cacheStats: this.analyzeCacheStats(successful)
    };
  }

  /**
   * Analyze cache statistics
   */
  analyzeCacheStats(results) {
    const cacheStatuses = results.map(r => r.cacheStatus).filter(Boolean);
    const cacheCounts = {};
    
    cacheStatuses.forEach(status => {
      cacheCounts[status] = (cacheCounts[status] || 0) + 1;
    });
    
    return {
      totalCached: cacheStatuses.length,
      cacheHitRate: cacheStatuses.length > 0 ? (cacheCounts['HIT'] || 0) / cacheStatuses.length * 100 : 0,
      statuses: cacheCounts
    };
  }

  /**
   * Test homepage performance
   */
  async testHomepage() {
    console.log(`${colors.blue}🏠 Testing homepage performance...${colors.reset}`);
    
    const url = this.baseUrl;
    const results = [];
    
    for (let i = 0; i < this.iterations; i++) {
      const batch = await this.runConcurrentRequests(url);
      results.push(...batch);
      
      if (i % 10 === 0) {
        process.stdout.write('.');
      }
    }
    
    console.log('');
    
    const stats = this.calculateStats(results);
    this.testResults.push({
      test: 'Homepage',
      url,
      stats
    });
    
    if (stats.success) {
      console.log(`${colors.green}✓${colors.reset} Homepage Performance:`);
      console.log(`   Success Rate: ${stats.successRate.toFixed(1)}%`);
      console.log(`   Avg Response Time: ${stats.responseTime.avg}ms`);
      console.log(`   P95 Response Time: ${stats.responseTime.p95}ms`);
      console.log(`   Cache Hit Rate: ${stats.cacheStats.cacheHitRate.toFixed(1)}%`);
    } else {
      console.log(`${colors.red}✗${colors.reset} Homepage test failed: ${stats.error}`);
    }
    
    return stats;
  }

  /**
   * Test static assets performance
   */
  async testStaticAssets() {
    console.log(`${colors.blue}📦 Testing static assets performance...${colors.reset}`);
    
    const staticUrls = [
      `${this.baseUrl}/static/css/main.css`,
      `${this.baseUrl}/static/js/bundle.js`,
      `${this.baseUrl}/favicon.ico`,
      `${this.baseUrl}/static/media/logo.svg`
    ];
    
    const allResults = [];
    
    for (const url of staticUrls) {
      console.log(`   Testing: ${url}`);
      const results = [];
      
      for (let i = 0; i < this.iterations / 2; i++) {
        const batch = await this.runConcurrentRequests(url);
        results.push(...batch);
      }
      
      const stats = this.calculateStats(results);
      allResults.push({ url, stats });
      
      if (stats.success) {
        console.log(`     Success Rate: ${stats.successRate.toFixed(1)}%`);
        console.log(`     Avg Response Time: ${stats.responseTime.avg}ms`);
        console.log(`     Cache Hit Rate: ${stats.cacheStats.cacheHitRate.toFixed(1)}%`);
      }
    }
    
    this.testResults.push({
      test: 'Static Assets',
      results: allResults
    });
    
    return allResults;
  }

  /**
   * Test API performance
   */
  async testAPI() {
    console.log(`${colors.blue}🔌 Testing API performance...${colors.reset}`);
    
    const apiEndpoints = [
      `${this.apiUrl}/health`,
      `${this.apiUrl}/system/info`,
      `${this.apiUrl}/cache/stats`
    ];
    
    const allResults = [];
    
    for (const url of apiEndpoints) {
      console.log(`   Testing: ${url}`);
      const results = [];
      
      for (let i = 0; i < this.iterations / 2; i++) {
        const batch = await this.runConcurrentRequests(url);
        results.push(...batch);
      }
      
      const stats = this.calculateStats(results);
      allResults.push({ url, stats });
      
      if (stats.success) {
        console.log(`     Success Rate: ${stats.successRate.toFixed(1)}%`);
        console.log(`     Avg Response Time: ${stats.responseTime.avg}ms`);
        console.log(`     Cache Hit Rate: ${stats.cacheStats.cacheHitRate.toFixed(1)}%`);
      }
    }
    
    this.testResults.push({
      test: 'API Endpoints',
      results: allResults
    });
    
    return allResults;
  }

  /**
   * Test SSL/TLS performance
   */
  async testSSLPerformance() {
    console.log(`${colors.blue}🔒 Testing SSL/TLS performance...${colors.reset}`);
    
    const httpsUrl = this.baseUrl;
    const results = [];
    
    // Test SSL handshake time
    for (let i = 0; i < 10; i++) {
      const result = await this.measureResponseTime(httpsUrl);
      if (result.success) {
        results.push(result);
      }
    }
    
    const stats = this.calculateStats(results);
    this.testResults.push({
      test: 'SSL/TLS',
      url: httpsUrl,
      stats
    });
    
    if (stats.success) {
      console.log(`${colors.green}✓${colors.reset} SSL Performance:`);
      console.log(`   Success Rate: ${stats.successRate.toFixed(1)}%`);
      console.log(`   Avg Response Time: ${stats.responseTime.avg}ms`);
      console.log(`   Min Response Time: ${stats.responseTime.min}ms`);
    } else {
      console.log(`${colors.red}✗${colors.reset} SSL test failed: ${stats.error}`);
    }
    
    return stats;
  }

  /**
   * Test CDN headers and features
   */
  async testCDNFeatures() {
    console.log(`${colors.blue}🌐 Testing CDN features...${colors.reset}`);
    
    try {
      const response = await fetch(this.baseUrl, { timeout: 10000 });
      const headers = Object.fromEntries(response.headers.entries());
      
      const features = {
        cloudflare: headers['cf-ray'] ? '✓ Cloudflare detected' : '✗ Cloudflare not detected',
        compression: headers['content-encoding'] ? `✓ Compression: ${headers['content-encoding']}` : '✗ No compression',
        cache: headers['cf-cache-status'] ? `✓ Cache status: ${headers['cf-cache-status']}` : '✗ No cache info',
        security: {
          hsts: headers['strict-transport-security'] ? '✓ HSTS enabled' : '✗ HSTS missing',
          csp: headers['content-security-policy'] ? '✓ CSP enabled' : '✗ CSP missing',
          xframe: headers['x-frame-options'] ? '✓ X-Frame-Options enabled' : '✗ X-Frame-Options missing'
        }
      };
      
      console.log(`${colors.green}✓${colors.reset} CDN Features:`);
      console.log(`   ${features.cloudflare}`);
      console.log(`   ${features.compression}`);
      console.log(`   ${features.cache}`);
      console.log(`   ${features.security.hsts}`);
      console.log(`   ${features.security.csp}`);
      console.log(`   ${features.security.xframe}`);
      
      this.testResults.push({
        test: 'CDN Features',
        features
      });
      
      return features;
    } catch (error) {
      console.log(`${colors.red}✗${colors.reset} CDN features test failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Test load balancer health
   */
  async testLoadBalancerHealth() {
    console.log(`${colors.blue}⚖️ Testing load balancer health...${colors.reset}`);
    
    const healthUrls = [
      `${this.baseUrl}/health`,
      `${this.baseUrl}/nginx_status`
    ];
    
    const results = [];
    
    for (const url of healthUrls) {
      try {
        const response = await fetch(url, { timeout: 5000 });
        const result = {
          url,
          status: response.status,
          healthy: response.status === 200,
          responseTime: await this.measureResponseTime(url).then(r => r.responseTime)
        };
        results.push(result);
        
        console.log(`   ${url}: ${result.healthy ? '✓ Healthy' : '✗ Unhealthy'} (${result.status})`);
      } catch (error) {
        console.log(`   ${url}: ✗ Error - ${error.message}`);
        results.push({ url, healthy: false, error: error.message });
      }
    }
    
    this.testResults.push({
      test: 'Load Balancer Health',
      results
    });
    
    return results;
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    console.log(`${colors.blue}📊 Generating performance report...${colors.reset}`);
    
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      testConfiguration: {
        concurrency: this.concurrency,
        iterations: this.iterations,
        totalRequests: this.concurrency * this.iterations
      },
      results: this.testResults,
      summary: this.generateSummary()
    };
    
    console.log(`${colors.green}✓${colors.reset} Performance Report Generated`);
    console.log(`\n${colors.cyan}📋 Performance Summary:${colors.reset}`);
    console.log(`   Total Tests: ${report.results.length}`);
    console.log(`   Overall Status: ${report.summary.overallStatus}`);
    console.log(`   Average Response Time: ${report.summary.avgResponseTime}ms`);
    console.log(`   Cache Hit Rate: ${report.summary.cacheHitRate}%`);
    console.log(`   Success Rate: ${report.summary.successRate}%`);
    
    return report;
  }

  /**
   * Generate summary statistics
   */
  generateSummary() {
    let totalResponseTime = 0;
    let totalCacheHits = 0;
    let totalRequests = 0;
    let successfulRequests = 0;
    let testCount = 0;
    
    this.testResults.forEach(test => {
      if (test.stats && test.stats.success) {
        totalResponseTime += test.stats.responseTime.avg;
        totalCacheHits += test.stats.cacheStats.cacheHitRate;
        totalRequests += test.stats.total;
        successfulRequests += test.stats.successful;
        testCount++;
      }
    });
    
    return {
      overallStatus: successfulRequests / totalRequests > 0.95 ? 'EXCELLENT' : 
                    successfulRequests / totalRequests > 0.9 ? 'GOOD' : 'NEEDS_IMPROVEMENT',
      avgResponseTime: testCount > 0 ? Math.round(totalResponseTime / testCount * 100) / 100 : 0,
      cacheHitRate: testCount > 0 ? Math.round(totalCacheHits / testCount * 100) / 100 : 0,
      successRate: totalRequests > 0 ? Math.round(successfulRequests / totalRequests * 100 * 100) / 100 : 0
    };
  }

  /**
   * Run all performance tests
   */
  async runAllTests() {
    console.log(`${colors.bright}${colors.blue}🚀 Starting CDN Performance Tests${colors.reset}\n`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Concurrency: ${this.concurrency}`);
    console.log(`Iterations: ${this.iterations}`);
    console.log(`Total Requests: ${this.concurrency * this.iterations}\n`);
    
    try {
      await this.testCDNFeatures();
      await this.testLoadBalancerHealth();
      await this.testHomepage();
      await this.testStaticAssets();
      await this.testAPI();
      await this.testSSLPerformance();
      
      const report = this.generatePerformanceReport();
      
      console.log(`\n${colors.bright}${colors.green}🎉 CDN Performance testing completed!${colors.reset}`);
      
      console.log(`\n${colors.blue}💡 Performance Recommendations:${colors.reset}`);
      
      if (report.summary.avgResponseTime > 1000) {
        console.log('   • Consider optimizing backend response times');
      }
      
      if (report.summary.cacheHitRate < 80) {
        console.log('   • Improve cache configuration for better hit rates');
      }
      
      if (report.summary.successRate < 99) {
        console.log('   • Investigate failed requests and improve reliability');
      }
      
      console.log('   • Monitor performance metrics continuously');
      console.log('   • Set up automated performance alerts');
      console.log('   • Consider implementing CDN analytics');
      
      return report;
    } catch (error) {
      console.log(`\n${colors.red}❌ Performance testing failed: ${error.message}${colors.reset}`);
      throw error;
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new CDNPerformanceTester();
  tester.runAllTests().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

export default CDNPerformanceTester;
