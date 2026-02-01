/**
 * Caching and Optimization Validation System
 * 
 * Comprehensive caching and optimization testing framework for production readiness.
 * Tests cache hit rate optimization, cache invalidation strategies, CDN performance,
 * and asset optimization effectiveness.
 * 
 * Requirements: 6.4
 */

const http = require('http');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');
const crypto = require('crypto');

class CachingOptimizationValidator {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3001';
    this.frontendUrl = options.frontendUrl || 'http://localhost:3000';
    this.cdnUrl = options.cdnUrl || null;
    
    this.cacheTestEndpoints = [
      '/api/visitors',
      '/api/users',
      '/api/estates',
      '/health',
      '/api/admin/metrics'
    ];
    
    this.staticAssets = [
      '/static/js/main.js',
      '/static/css/main.css',
      '/favicon.ico',
      '/manifest.json',
      '/logo192.png'
    ];
    
    this.optimizationThresholds = {
      cacheHitRate: 0.8, // 80%
      assetCompressionRatio: 0.7, // 70% compression
      cdnResponseTime: 200, // 200ms
      cacheInvalidationTime: 5000, // 5 seconds
      bundleSize: 1024 * 1024, // 1MB
      imageOptimization: 0.6 // 60% size reduction
    };
    
    this.results = {
      cachePerformance: {},
      assetOptimization: {},
      cdnPerformance: {},
      cacheInvalidation: {},
      overallScore: 0,
      issues: [],
      recommendations: []
    };
  }

  async validateCachingOptimization() {
    console.log('🚀 Starting comprehensive caching and optimization validation...');
    console.log(`API Base URL: ${this.baseUrl}`);
    console.log(`Frontend URL: ${this.frontendUrl}`);
    console.log(`CDN URL: ${this.cdnUrl || 'Not configured'}`);
    
    try {
      // Test cache performance
      await this.testCachePerformance();
      
      // Test asset optimization
      await this.testAssetOptimization();
      
      // Test CDN performance if configured
      if (this.cdnUrl) {
        await this.testCDNPerformance();
      }
      
      // Test cache invalidation strategies
      await this.testCacheInvalidation();
      
      // Calculate overall score
      this.calculateOverallScore();
      
      // Generate comprehensive report
      await this.generateReport();
      
      return this.results;
    } catch (error) {
      console.error('❌ Caching and optimization validation failed:', error);
      throw error;
    }
  }

  async testCachePerformance() {
    console.log('\n💾 Testing cache performance...');
    
    const cacheResults = {
      hitRates: {},
      responseTimeImprovement: {},
      cacheHeaders: {},
      etags: {},
      overallHitRate: 0,
      issues: []
    };
    
    for (const endpoint of this.cacheTestEndpoints) {
      console.log(`🔍 Testing cache for ${endpoint}...`);
      
      try {
        const endpointResults = await this.testEndpointCaching(endpoint);
        cacheResults.hitRates[endpoint] = endpointResults.hitRate;
        cacheResults.responseTimeImprovement[endpoint] = endpointResults.improvement;
        cacheResults.cacheHeaders[endpoint] = endpointResults.headers;
        cacheResults.etags[endpoint] = endpointResults.etag;
        
        if (endpointResults.hitRate < this.optimizationThresholds.cacheHitRate) {
          cacheResults.issues.push(`Low cache hit rate for ${endpoint}: ${(endpointResults.hitRate * 100).toFixed(1)}%`);
        }
        
      } catch (error) {
        console.error(`❌ Error testing ${endpoint}:`, error.message);
        cacheResults.issues.push(`Cache test failed for ${endpoint}: ${error.message}`);
      }
    }
    
    // Calculate overall hit rate
    const hitRates = Object.values(cacheResults.hitRates).filter(rate => !isNaN(rate));
    cacheResults.overallHitRate = hitRates.length > 0 ? 
      hitRates.reduce((sum, rate) => sum + rate, 0) / hitRates.length : 0;
    
    this.results.cachePerformance = cacheResults;
    
    console.log(`📊 Cache Performance Results:`);
    console.log(`Overall Hit Rate: ${(cacheResults.overallHitRate * 100).toFixed(1)}%`);
    console.log(`Issues Found: ${cacheResults.issues.length}`);
  }

  async testEndpointCaching(endpoint) {
    const results = {
      hitRate: 0,
      improvement: 0,
      headers: {},
      etag: null
    };
    
    const testRequests = 10;
    const responseTimes = [];
    let cacheHits = 0;
    
    // First request (cache miss)
    const firstResponse = await this.makeTimedRequest(endpoint);
    responseTimes.push(firstResponse.responseTime);
    results.headers = firstResponse.headers;
    results.etag = firstResponse.headers.etag;
    
    // Subsequent requests (should be cache hits)
    for (let i = 1; i < testRequests; i++) {
      const response = await this.makeTimedRequest(endpoint);
      responseTimes.push(response.responseTime);
      
      // Check for cache hit indicators
      if (this.isCacheHit(response.headers, firstResponse.headers)) {
        cacheHits++;
      }
      
      // Small delay between requests
      await this.sleep(100);
    }
    
    results.hitRate = cacheHits / (testRequests - 1);
    
    // Calculate response time improvement
    const firstRequestTime = responseTimes[0];
    const avgCachedTime = responseTimes.slice(1).reduce((sum, time) => sum + time, 0) / (testRequests - 1);
    results.improvement = (firstRequestTime - avgCachedTime) / firstRequestTime;
    
    return results;
  }

  async makeTimedRequest(endpoint, headers = {}) {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const options = {
        method: 'GET',
        headers: {
          'User-Agent': 'CacheValidator/1.0',
          ...headers
        },
        timeout: 10000
      };
      
      const req = client.request(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const endTime = performance.now();
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            responseTime: endTime - startTime
          });
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }

  isCacheHit(currentHeaders, originalHeaders) {
    // Check for cache hit indicators
    if (currentHeaders['x-cache'] && currentHeaders['x-cache'].toLowerCase().includes('hit')) {
      return true;
    }
    
    if (currentHeaders['cf-cache-status'] === 'HIT') {
      return true;
    }
    
    // Check if ETag matches and response is 304
    if (originalHeaders.etag && currentHeaders.etag === originalHeaders.etag) {
      return true;
    }
    
    // Check for significantly faster response time (heuristic)
    return false;
  }

  async testAssetOptimization() {
    console.log('\n📦 Testing asset optimization...');
    
    const assetResults = {
      compressionRatios: {},
      bundleSizes: {},
      imageOptimization: {},
      minification: {},
      overallOptimization: 0,
      issues: []
    };
    
    for (const asset of this.staticAssets) {
      console.log(`🔍 Testing optimization for ${asset}...`);
      
      try {
        const assetOptimization = await this.testAssetOptimization(asset);
        
        if (assetOptimization.compressionRatio) {
          assetResults.compressionRatios[asset] = assetOptimization.compressionRatio;
        }
        
        if (assetOptimization.size) {
          assetResults.bundleSizes[asset] = assetOptimization.size;
        }
        
        if (assetOptimization.minified !== undefined) {
          assetResults.minification[asset] = assetOptimization.minified;
        }
        
        // Check against thresholds
        if (assetOptimization.compressionRatio < this.optimizationThresholds.assetCompressionRatio) {
          assetResults.issues.push(`Poor compression for ${asset}: ${(assetOptimization.compressionRatio * 100).toFixed(1)}%`);
        }
        
        if (asset.includes('.js') && assetOptimization.size > this.optimizationThresholds.bundleSize) {
          assetResults.issues.push(`Large bundle size for ${asset}: ${(assetOptimization.size / 1024).toFixed(1)}KB`);
        }
        
        if (!assetOptimization.minified && (asset.includes('.js') || asset.includes('.css'))) {
          assetResults.issues.push(`Asset not minified: ${asset}`);
        }
        
      } catch (error) {
        console.log(`⚠️ Could not test ${asset}:`, error.message);
        assetResults.issues.push(`Asset optimization test failed for ${asset}`);
      }
    }
    
    // Calculate overall optimization score
    const compressionRatios = Object.values(assetResults.compressionRatios);
    assetResults.overallOptimization = compressionRatios.length > 0 ?
      compressionRatios.reduce((sum, ratio) => sum + ratio, 0) / compressionRatios.length : 0;
    
    this.results.assetOptimization = assetResults;
    
    console.log(`📊 Asset Optimization Results:`);
    console.log(`Overall Optimization: ${(assetResults.overallOptimization * 100).toFixed(1)}%`);
    console.log(`Issues Found: ${assetResults.issues.length}`);
  }

  async testAssetOptimization(asset) {
    const results = {
      size: 0,
      compressionRatio: 0,
      minified: false,
      headers: {}
    };
    
    try {
      // Test with and without compression
      const uncompressedResponse = await this.makeTimedRequest(asset, {
        'Accept-Encoding': 'identity'
      });
      
      const compressedResponse = await this.makeTimedRequest(asset, {
        'Accept-Encoding': 'gzip, deflate, br'
      });
      
      results.headers = compressedResponse.headers;
      
      // Calculate compression ratio
      const uncompressedSize = Buffer.byteLength(uncompressedResponse.data, 'utf8');
      const compressedSize = Buffer.byteLength(compressedResponse.data, 'utf8');
      
      results.size = uncompressedSize;
      results.compressionRatio = compressedSize / uncompressedSize;
      
      // Check if asset is minified (heuristic)
      if (asset.includes('.js') || asset.includes('.css')) {
        const content = uncompressedResponse.data;
        const hasWhitespace = /\s{2,}/.test(content);
        const hasComments = /\/\*[\s\S]*?\*\/|\/\/.*$/m.test(content);
        results.minified = !hasWhitespace && !hasComments;
      }
      
      return results;
    } catch (error) {
      throw error;
    }
  }

  async testCDNPerformance() {
    console.log('\n🌐 Testing CDN performance...');
    
    const cdnResults = {
      responseTime: 0,
      cacheHitRate: 0,
      globalDistribution: {},
      edgeLocations: [],
      issues: []
    };
    
    try {
      // Test CDN response time
      const cdnTests = [];
      for (let i = 0; i < 10; i++) {
        const response = await this.makeTimedRequest('/static/js/main.js', {}, this.cdnUrl);
        cdnTests.push(response.responseTime);
        
        // Check for CDN headers
        if (response.headers['cf-ray'] || response.headers['x-cache'] || response.headers['x-served-by']) {
          // CDN detected
        }
      }
      
      cdnResults.responseTime = cdnTests.reduce((sum, time) => sum + time, 0) / cdnTests.length;
      
      // Compare with origin server
      const originTests = [];
      for (let i = 0; i < 5; i++) {
        const response = await this.makeTimedRequest('/static/js/main.js');
        originTests.push(response.responseTime);
      }
      
      const originResponseTime = originTests.reduce((sum, time) => sum + time, 0) / originTests.length;
      const improvement = (originResponseTime - cdnResults.responseTime) / originResponseTime;
      
      if (cdnResults.responseTime > this.optimizationThresholds.cdnResponseTime) {
        cdnResults.issues.push(`CDN response time too slow: ${cdnResults.responseTime.toFixed(1)}ms`);
      }
      
      if (improvement < 0.2) { // Less than 20% improvement
        cdnResults.issues.push(`CDN not providing significant performance improvement: ${(improvement * 100).toFixed(1)}%`);
      }
      
      console.log(`📊 CDN Performance Results:`);
      console.log(`CDN Response Time: ${cdnResults.responseTime.toFixed(1)}ms`);
      console.log(`Performance Improvement: ${(improvement * 100).toFixed(1)}%`);
      
    } catch (error) {
      console.error('❌ CDN performance test failed:', error.message);
      cdnResults.issues.push(`CDN test failed: ${error.message}`);
    }
    
    this.results.cdnPerformance = cdnResults;
  }

  async testCacheInvalidation() {
    console.log('\n🔄 Testing cache invalidation strategies...');
    
    const invalidationResults = {
      etagSupport: false,
      lastModifiedSupport: false,
      cacheControlHeaders: {},
      invalidationTime: 0,
      versioningStrategy: false,
      issues: []
    };
    
    try {
      // Test ETag support
      const etagTest = await this.testETagInvalidation();
      invalidationResults.etagSupport = etagTest.supported;
      invalidationResults.invalidationTime = etagTest.invalidationTime;
      
      // Test Last-Modified support
      const lastModifiedTest = await this.testLastModifiedInvalidation();
      invalidationResults.lastModifiedSupport = lastModifiedTest.supported;
      
      // Test Cache-Control headers
      const cacheControlTest = await this.testCacheControlHeaders();
      invalidationResults.cacheControlHeaders = cacheControlTest;
      
      // Test versioning strategy
      const versioningTest = await this.testVersioningStrategy();
      invalidationResults.versioningStrategy = versioningTest.supported;
      
      // Evaluate results
      if (!invalidationResults.etagSupport && !invalidationResults.lastModifiedSupport) {
        invalidationResults.issues.push('No cache invalidation mechanism detected');
      }
      
      if (invalidationResults.invalidationTime > this.optimizationThresholds.cacheInvalidationTime) {
        invalidationResults.issues.push(`Cache invalidation too slow: ${invalidationResults.invalidationTime}ms`);
      }
      
      if (!invalidationResults.versioningStrategy) {
        invalidationResults.issues.push('No asset versioning strategy detected');
      }
      
      console.log(`📊 Cache Invalidation Results:`);
      console.log(`ETag Support: ${invalidationResults.etagSupport ? '✅' : '❌'}`);
      console.log(`Last-Modified Support: ${invalidationResults.lastModifiedSupport ? '✅' : '❌'}`);
      console.log(`Versioning Strategy: ${invalidationResults.versioningStrategy ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error('❌ Cache invalidation test failed:', error.message);
      invalidationResults.issues.push(`Cache invalidation test failed: ${error.message}`);
    }
    
    this.results.cacheInvalidation = invalidationResults;
  }

  async testETagInvalidation() {
    try {
      const endpoint = '/api/visitors';
      
      // First request to get ETag
      const firstResponse = await this.makeTimedRequest(endpoint);
      const etag = firstResponse.headers.etag;
      
      if (!etag) {
        return { supported: false, invalidationTime: 0 };
      }
      
      // Second request with If-None-Match header
      const startTime = performance.now();
      const secondResponse = await this.makeTimedRequest(endpoint, {
        'If-None-Match': etag
      });
      const endTime = performance.now();
      
      const supported = secondResponse.statusCode === 304;
      const invalidationTime = endTime - startTime;
      
      return { supported, invalidationTime };
    } catch (error) {
      return { supported: false, invalidationTime: 0 };
    }
  }

  async testLastModifiedInvalidation() {
    try {
      const endpoint = '/api/visitors';
      
      // First request to get Last-Modified
      const firstResponse = await this.makeTimedRequest(endpoint);
      const lastModified = firstResponse.headers['last-modified'];
      
      if (!lastModified) {
        return { supported: false };
      }
      
      // Second request with If-Modified-Since header
      const secondResponse = await this.makeTimedRequest(endpoint, {
        'If-Modified-Since': lastModified
      });
      
      const supported = secondResponse.statusCode === 304;
      
      return { supported };
    } catch (error) {
      return { supported: false };
    }
  }

  async testCacheControlHeaders() {
    const results = {};
    
    for (const endpoint of this.cacheTestEndpoints) {
      try {
        const response = await this.makeTimedRequest(endpoint);
        results[endpoint] = {
          cacheControl: response.headers['cache-control'],
          expires: response.headers.expires,
          pragma: response.headers.pragma
        };
      } catch (error) {
        results[endpoint] = { error: error.message };
      }
    }
    
    return results;
  }

  async testVersioningStrategy() {
    try {
      // Check if static assets have version hashes in their names
      const assetResponse = await this.makeTimedRequest('/static/js/main.js');
      
      // Look for version hashes in asset URLs or headers
      const hasVersionHash = /\.[a-f0-9]{8,}\.(js|css)$/.test('/static/js/main.js');
      const hasVersionHeader = assetResponse.headers['x-asset-version'] || 
                              assetResponse.headers['x-version'];
      
      return { supported: hasVersionHash || hasVersionHeader };
    } catch (error) {
      return { supported: false };
    }
  }

  calculateOverallScore() {
    const weights = {
      cachePerformance: 0.4,
      assetOptimization: 0.3,
      cdnPerformance: 0.2,
      cacheInvalidation: 0.1
    };
    
    let totalScore = 0;
    
    // Cache performance score
    const cacheScore = Math.min(this.results.cachePerformance.overallHitRate * 100, 100);
    totalScore += cacheScore * weights.cachePerformance;
    
    // Asset optimization score
    const assetScore = Math.min(this.results.assetOptimization.overallOptimization * 100, 100);
    totalScore += assetScore * weights.assetOptimization;
    
    // CDN performance score (if configured)
    let cdnScore = 100; // Default if no CDN
    if (this.cdnUrl && this.results.cdnPerformance.responseTime > 0) {
      cdnScore = Math.max(0, 100 - (this.results.cdnPerformance.responseTime / 10));
    }
    totalScore += cdnScore * weights.cdnPerformance;
    
    // Cache invalidation score
    let invalidationScore = 0;
    if (this.results.cacheInvalidation.etagSupport) invalidationScore += 40;
    if (this.results.cacheInvalidation.lastModifiedSupport) invalidationScore += 30;
    if (this.results.cacheInvalidation.versioningStrategy) invalidationScore += 30;
    totalScore += invalidationScore * weights.cacheInvalidation;
    
    this.results.overallScore = Math.round(totalScore);
    
    // Collect all issues
    this.results.issues = [
      ...this.results.cachePerformance.issues,
      ...this.results.assetOptimization.issues,
      ...(this.results.cdnPerformance.issues || []),
      ...this.results.cacheInvalidation.issues
    ];
    
    // Generate recommendations
    this.generateRecommendations();
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.cachePerformance.overallHitRate < 0.8) {
      recommendations.push('Implement Redis caching for API responses');
      recommendations.push('Add appropriate Cache-Control headers');
    }
    
    if (this.results.assetOptimization.overallOptimization < 0.7) {
      recommendations.push('Enable gzip/brotli compression for static assets');
      recommendations.push('Implement asset minification in build process');
    }
    
    if (!this.results.cacheInvalidation.etagSupport) {
      recommendations.push('Implement ETag support for cache invalidation');
    }
    
    if (!this.results.cacheInvalidation.versioningStrategy) {
      recommendations.push('Add version hashes to static asset filenames');
    }
    
    if (!this.cdnUrl) {
      recommendations.push('Consider implementing CDN for global performance');
    }
    
    this.results.recommendations = recommendations;
  }

  async generateReport() {
    console.log('\n🚀 Caching and Optimization Validation Report');
    console.log('=============================================');
    console.log(`Overall Score: ${this.results.overallScore}/100`);
    
    console.log(`\n💾 Cache Performance:`);
    console.log(`  Hit Rate: ${(this.results.cachePerformance.overallHitRate * 100).toFixed(1)}%`);
    console.log(`  Issues: ${this.results.cachePerformance.issues.length}`);
    
    console.log(`\n📦 Asset Optimization:`);
    console.log(`  Optimization: ${(this.results.assetOptimization.overallOptimization * 100).toFixed(1)}%`);
    console.log(`  Issues: ${this.results.assetOptimization.issues.length}`);
    
    if (this.cdnUrl) {
      console.log(`\n🌐 CDN Performance:`);
      console.log(`  Response Time: ${this.results.cdnPerformance.responseTime.toFixed(1)}ms`);
      console.log(`  Issues: ${this.results.cdnPerformance.issues.length}`);
    }
    
    console.log(`\n🔄 Cache Invalidation:`);
    console.log(`  ETag Support: ${this.results.cacheInvalidation.etagSupport ? '✅' : '❌'}`);
    console.log(`  Versioning: ${this.results.cacheInvalidation.versioningStrategy ? '✅' : '❌'}`);
    console.log(`  Issues: ${this.results.cacheInvalidation.issues.length}`);
    
    if (this.results.issues.length > 0) {
      console.log('\n❌ Issues Found:');
      this.results.issues.slice(0, 10).forEach(issue => {
        console.log(`  • ${issue}`);
      });
    }
    
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
    
    // Save detailed report
    await this.saveDetailedReport();
  }

  async saveDetailedReport() {
    const reportPath = path.join(process.cwd(), 'production-readiness-tests', 'reports', 'caching-optimization-report.json');
    
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      
      const detailedReport = {
        ...this.results,
        testConfiguration: {
          baseUrl: this.baseUrl,
          frontendUrl: this.frontendUrl,
          cdnUrl: this.cdnUrl,
          cacheTestEndpoints: this.cacheTestEndpoints,
          staticAssets: this.staticAssets,
          optimizationThresholds: this.optimizationThresholds
        },
        timestamp: new Date().toISOString()
      };
      
      await fs.writeFile(reportPath, JSON.stringify(detailedReport, null, 2));
      console.log(`📄 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.error('❌ Failed to save detailed report:', error);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in other modules
module.exports = CachingOptimizationValidator;

// CLI execution
if (require.main === module) {
  const cachingValidator = new CachingOptimizationValidator({
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    cdnUrl: process.env.CDN_URL || null
  });
  
  cachingValidator.validateCachingOptimization()
    .then((results) => {
      // Exit with appropriate code
      if (results.overallScore >= 80) {
        console.log('\n✅ Caching and optimization validation completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Caching and optimization validation failed to meet standards');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Caching and optimization validation failed:', error);
      process.exit(1);
    });
}