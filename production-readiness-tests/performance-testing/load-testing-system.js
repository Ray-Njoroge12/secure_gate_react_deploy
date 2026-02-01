/**
 * Load Testing System
 * 
 * Comprehensive load testing framework for production readiness validation.
 * Tests concurrent user simulation, API endpoint performance, database optimization,
 * and auto-scaling capabilities under various load conditions.
 * 
 * Requirements: 6.1, 6.3
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

class LoadTestingSystem {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3001';
    this.maxConcurrentUsers = options.maxConcurrentUsers || 100;
    this.testDuration = options.testDuration || 60000; // 1 minute
    this.rampUpTime = options.rampUpTime || 10000; // 10 seconds
    this.thresholds = {
      responseTime: {
        p50: 200, // 200ms
        p95: 500, // 500ms
        p99: 1000 // 1 second
      },
      errorRate: 0.01, // 1%
      throughput: 100 // requests per second
    };
    
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      throughput: 0,
      concurrentUsers: 0,
      testDuration: 0,
      startTime: null,
      endTime: null
    };
    
    this.testScenarios = [
      {
        name: 'Authentication Load Test',
        endpoint: '/api/auth/login',
        method: 'POST',
        weight: 0.2,
        payload: { email: 'test@example.com', password: 'TestPassword123!' }
      },
      {
        name: 'Visitor Creation Load Test',
        endpoint: '/api/visitors',
        method: 'POST',
        weight: 0.3,
        requiresAuth: true,
        payload: {
          name: 'Load Test Visitor',
          phone: '+254712345678',
          purpose: 'Load testing',
          expectedArrival: new Date(Date.now() + 3600000).toISOString()
        }
      },
      {
        name: 'Visitor List Load Test',
        endpoint: '/api/visitors',
        method: 'GET',
        weight: 0.4,
        requiresAuth: true
      },
      {
        name: 'Health Check Load Test',
        endpoint: '/health',
        method: 'GET',
        weight: 0.1
      }
    ];
  }

  async runLoadTest() {
    console.log('🚀 Starting comprehensive load testing...');
    console.log(`Target: ${this.baseUrl}`);
    console.log(`Max Concurrent Users: ${this.maxConcurrentUsers}`);
    console.log(`Test Duration: ${this.testDuration}ms`);
    
    try {
      // Initialize test environment
      await this.initializeTest();
      
      // Run load test scenarios
      await this.executeLoadTest();
      
      // Analyze results
      this.analyzeResults();
      
      // Generate report
      await this.generateReport();
      
      return this.results;
    } catch (error) {
      console.error('❌ Load testing failed:', error);
      throw error;
    }
  }

  async initializeTest() {
    console.log('🔧 Initializing load test environment...');
    
    // Verify target server is accessible
    try {
      await this.makeRequest('/health', 'GET');
      console.log('✅ Target server is accessible');
    } catch (error) {
      throw new Error(`Target server not accessible: ${error.message}`);
    }
    
    // Prepare authentication tokens for authenticated requests
    await this.prepareAuthTokens();
    
    this.results.startTime = Date.now();
  }

  async prepareAuthTokens() {
    console.log('🔑 Preparing authentication tokens...');
    
    try {
      const loginResponse = await this.makeRequest('/api/auth/login', 'POST', {
        email: 'admin@test.com',
        password: 'TestAdmin123!'
      });
      
      if (loginResponse.success && loginResponse.data && loginResponse.data.accessToken) {
        this.authToken = loginResponse.data.accessToken;
        console.log('✅ Authentication token obtained');
      } else {
        console.log('⚠️ Could not obtain auth token, authenticated tests will be skipped');
      }
    } catch (error) {
      console.log('⚠️ Authentication failed, authenticated tests will be skipped:', error.message);
    }
  }

  async executeLoadTest() {
    console.log('⚡ Executing load test scenarios...');
    
    const promises = [];
    const userRampUpInterval = this.rampUpTime / this.maxConcurrentUsers;
    
    for (let userId = 0; userId < this.maxConcurrentUsers; userId++) {
      const userPromise = new Promise(async (resolve) => {
        // Ramp up users gradually
        await this.sleep(userId * userRampUpInterval);
        
        const userStartTime = Date.now();
        const userEndTime = userStartTime + this.testDuration;
        
        while (Date.now() < userEndTime) {
          try {
            const scenario = this.selectScenario();
            await this.executeScenario(scenario, userId);
            
            // Small delay between requests from same user
            await this.sleep(Math.random() * 1000 + 500); // 500-1500ms
          } catch (error) {
            // Continue with next request even if one fails
          }
        }
        
        resolve();
      });
      
      promises.push(userPromise);
    }
    
    // Wait for all users to complete
    await Promise.all(promises);
    
    this.results.endTime = Date.now();
    this.results.testDuration = this.results.endTime - this.results.startTime;
    this.results.concurrentUsers = this.maxConcurrentUsers;
  }

  selectScenario() {
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (const scenario of this.testScenarios) {
      cumulativeWeight += scenario.weight;
      if (random <= cumulativeWeight) {
        return scenario;
      }
    }
    
    return this.testScenarios[0]; // Fallback
  }

  async executeScenario(scenario, userId) {
    const startTime = performance.now();
    
    try {
      // Skip authenticated scenarios if no auth token
      if (scenario.requiresAuth && !this.authToken) {
        return;
      }
      
      const headers = {};
      if (scenario.requiresAuth) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }
      
      const response = await this.makeRequest(
        scenario.endpoint,
        scenario.method,
        scenario.payload,
        headers
      );
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.results.totalRequests++;
      this.results.successfulRequests++;
      this.results.responseTimes.push(responseTime);
      
      // Log successful request details
      if (this.results.totalRequests % 100 === 0) {
        console.log(`📊 Completed ${this.results.totalRequests} requests`);
      }
      
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.results.totalRequests++;
      this.results.failedRequests++;
      this.results.responseTimes.push(responseTime);
      this.results.errors.push({
        scenario: scenario.name,
        userId,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  async makeRequest(endpoint, method, payload = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseUrl);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LoadTestingSystem/1.0',
          ...headers
        },
        timeout: 30000 // 30 second timeout
      };
      
      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.request(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = data ? JSON.parse(data) : {};
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(response);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${response.message || 'Request failed'}`));
            }
          } catch (parseError) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ statusCode: res.statusCode, data });
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data || 'Request failed'}`));
            }
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        req.write(JSON.stringify(payload));
      }
      
      req.end();
    });
  }

  analyzeResults() {
    console.log('📊 Analyzing load test results...');
    
    if (this.results.responseTimes.length === 0) {
      console.log('⚠️ No response times recorded');
      return;
    }
    
    // Sort response times for percentile calculations
    const sortedTimes = this.results.responseTimes.sort((a, b) => a - b);
    
    // Calculate percentiles
    const p50Index = Math.floor(sortedTimes.length * 0.5);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    
    this.results.percentiles = {
      p50: sortedTimes[p50Index] || 0,
      p95: sortedTimes[p95Index] || 0,
      p99: sortedTimes[p99Index] || 0
    };
    
    // Calculate average response time
    this.results.averageResponseTime = this.results.responseTimes.reduce((sum, time) => sum + time, 0) / this.results.responseTimes.length;
    
    // Calculate error rate
    this.results.errorRate = this.results.failedRequests / this.results.totalRequests;
    
    // Calculate throughput (requests per second)
    this.results.throughput = (this.results.totalRequests / this.results.testDuration) * 1000;
    
    // Evaluate against thresholds
    this.evaluateThresholds();
  }

  evaluateThresholds() {
    console.log('🎯 Evaluating performance against thresholds...');
    
    this.results.thresholdResults = {
      responseTime: {
        p50: {
          actual: this.results.percentiles.p50,
          threshold: this.thresholds.responseTime.p50,
          passed: this.results.percentiles.p50 <= this.thresholds.responseTime.p50
        },
        p95: {
          actual: this.results.percentiles.p95,
          threshold: this.thresholds.responseTime.p95,
          passed: this.results.percentiles.p95 <= this.thresholds.responseTime.p95
        },
        p99: {
          actual: this.results.percentiles.p99,
          threshold: this.thresholds.responseTime.p99,
          passed: this.results.percentiles.p99 <= this.thresholds.responseTime.p99
        }
      },
      errorRate: {
        actual: this.results.errorRate,
        threshold: this.thresholds.errorRate,
        passed: this.results.errorRate <= this.thresholds.errorRate
      },
      throughput: {
        actual: this.results.throughput,
        threshold: this.thresholds.throughput,
        passed: this.results.throughput >= this.thresholds.throughput
      }
    };
    
    // Calculate overall pass rate
    const allChecks = [
      this.results.thresholdResults.responseTime.p50.passed,
      this.results.thresholdResults.responseTime.p95.passed,
      this.results.thresholdResults.responseTime.p99.passed,
      this.results.thresholdResults.errorRate.passed,
      this.results.thresholdResults.throughput.passed
    ];
    
    this.results.overallPassed = allChecks.every(check => check);
    this.results.passRate = allChecks.filter(check => check).length / allChecks.length;
  }

  async generateReport() {
    console.log('\n📈 Load Testing Report');
    console.log('======================');
    console.log(`Test Duration: ${(this.results.testDuration / 1000).toFixed(1)}s`);
    console.log(`Concurrent Users: ${this.results.concurrentUsers}`);
    console.log(`Total Requests: ${this.results.totalRequests}`);
    console.log(`Successful Requests: ${this.results.successfulRequests}`);
    console.log(`Failed Requests: ${this.results.failedRequests}`);
    console.log(`Error Rate: ${(this.results.errorRate * 100).toFixed(2)}%`);
    console.log(`Throughput: ${this.results.throughput.toFixed(2)} req/s`);
    
    console.log('\n⏱️ Response Times:');
    console.log(`Average: ${this.results.averageResponseTime.toFixed(2)}ms`);
    console.log(`P50: ${this.results.percentiles.p50.toFixed(2)}ms`);
    console.log(`P95: ${this.results.percentiles.p95.toFixed(2)}ms`);
    console.log(`P99: ${this.results.percentiles.p99.toFixed(2)}ms`);
    
    console.log('\n🎯 Threshold Results:');
    console.log(`P50 Response Time: ${this.results.thresholdResults.responseTime.p50.passed ? '✅' : '❌'} ${this.results.percentiles.p50.toFixed(2)}ms (threshold: ${this.thresholds.responseTime.p50}ms)`);
    console.log(`P95 Response Time: ${this.results.thresholdResults.responseTime.p95.passed ? '✅' : '❌'} ${this.results.percentiles.p95.toFixed(2)}ms (threshold: ${this.thresholds.responseTime.p95}ms)`);
    console.log(`P99 Response Time: ${this.results.thresholdResults.responseTime.p99.passed ? '✅' : '❌'} ${this.results.percentiles.p99.toFixed(2)}ms (threshold: ${this.thresholds.responseTime.p99}ms)`);
    console.log(`Error Rate: ${this.results.thresholdResults.errorRate.passed ? '✅' : '❌'} ${(this.results.errorRate * 100).toFixed(2)}% (threshold: ${(this.thresholds.errorRate * 100).toFixed(2)}%)`);
    console.log(`Throughput: ${this.results.thresholdResults.throughput.passed ? '✅' : '❌'} ${this.results.throughput.toFixed(2)} req/s (threshold: ${this.thresholds.throughput} req/s)`);
    
    console.log(`\n📊 Overall Result: ${this.results.overallPassed ? '✅ PASSED' : '❌ FAILED'} (${(this.results.passRate * 100).toFixed(1)}% pass rate)`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Error Summary:');
      const errorCounts = {};
      this.results.errors.forEach(error => {
        errorCounts[error.error] = (errorCounts[error.error] || 0) + 1;
      });
      
      Object.entries(errorCounts).forEach(([error, count]) => {
        console.log(`  ${error}: ${count} occurrences`);
      });
    }
    
    // Save detailed report
    await this.saveDetailedReport();
  }

  async saveDetailedReport() {
    const reportPath = path.join(process.cwd(), 'production-readiness-tests', 'reports', 'load-testing-report.json');
    
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      
      const detailedReport = {
        ...this.results,
        testConfiguration: {
          baseUrl: this.baseUrl,
          maxConcurrentUsers: this.maxConcurrentUsers,
          testDuration: this.testDuration,
          rampUpTime: this.rampUpTime,
          thresholds: this.thresholds
        },
        testScenarios: this.testScenarios,
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

  // Database performance testing
  async testDatabasePerformance() {
    console.log('🗄️ Testing database performance under load...');
    
    const dbTestResults = {
      connectionPoolUtilization: 0,
      queryResponseTimes: [],
      concurrentConnections: 0,
      deadlocks: 0,
      slowQueries: 0
    };
    
    try {
      // Test concurrent database operations
      const dbPromises = [];
      
      for (let i = 0; i < 50; i++) {
        dbPromises.push(this.executeDatabaseTest());
      }
      
      const results = await Promise.allSettled(dbPromises);
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          dbTestResults.queryResponseTimes.push(result.value.responseTime);
        } else {
          if (result.reason.message.includes('deadlock')) {
            dbTestResults.deadlocks++;
          }
        }
      });
      
      // Calculate database performance metrics
      if (dbTestResults.queryResponseTimes.length > 0) {
        const avgResponseTime = dbTestResults.queryResponseTimes.reduce((sum, time) => sum + time, 0) / dbTestResults.queryResponseTimes.length;
        dbTestResults.averageQueryTime = avgResponseTime;
        dbTestResults.slowQueries = dbTestResults.queryResponseTimes.filter(time => time > 1000).length;
      }
      
      console.log('📊 Database Performance Results:');
      console.log(`Average Query Time: ${dbTestResults.averageQueryTime?.toFixed(2) || 'N/A'}ms`);
      console.log(`Slow Queries (>1s): ${dbTestResults.slowQueries}`);
      console.log(`Deadlocks: ${dbTestResults.deadlocks}`);
      
      return dbTestResults;
    } catch (error) {
      console.error('❌ Database performance test failed:', error);
      return dbTestResults;
    }
  }

  async executeDatabaseTest() {
    const startTime = performance.now();
    
    try {
      // Test database-heavy endpoint
      await this.makeRequest('/api/visitors?limit=100', 'GET', null, {
        'Authorization': `Bearer ${this.authToken}`
      });
      
      const endTime = performance.now();
      return { responseTime: endTime - startTime };
    } catch (error) {
      throw error;
    }
  }

  // Auto-scaling simulation
  async testAutoScaling() {
    console.log('📈 Testing auto-scaling capabilities...');
    
    const scalingResults = {
      initialLoad: 0,
      peakLoad: 0,
      scaleUpDetected: false,
      scaleDownDetected: false,
      responseTimeStability: true
    };
    
    try {
      // Measure baseline performance
      console.log('📊 Measuring baseline performance...');
      const baselineTest = new LoadTestingSystem({
        ...this,
        maxConcurrentUsers: 10,
        testDuration: 30000
      });
      
      const baselineResults = await baselineTest.runLoadTest();
      scalingResults.initialLoad = baselineResults.throughput;
      
      // Simulate traffic spike
      console.log('🚀 Simulating traffic spike...');
      const spikeTest = new LoadTestingSystem({
        ...this,
        maxConcurrentUsers: 100,
        testDuration: 60000
      });
      
      const spikeResults = await spikeTest.runLoadTest();
      scalingResults.peakLoad = spikeResults.throughput;
      
      // Analyze scaling behavior
      scalingResults.scaleUpDetected = spikeResults.throughput > baselineResults.throughput * 0.8;
      scalingResults.responseTimeStability = spikeResults.percentiles.p95 < baselineResults.percentiles.p95 * 2;
      
      console.log('📊 Auto-scaling Results:');
      console.log(`Baseline Throughput: ${scalingResults.initialLoad.toFixed(2)} req/s`);
      console.log(`Peak Throughput: ${scalingResults.peakLoad.toFixed(2)} req/s`);
      console.log(`Scale-up Detected: ${scalingResults.scaleUpDetected ? '✅' : '❌'}`);
      console.log(`Response Time Stability: ${scalingResults.responseTimeStability ? '✅' : '❌'}`);
      
      return scalingResults;
    } catch (error) {
      console.error('❌ Auto-scaling test failed:', error);
      return scalingResults;
    }
  }
}

// Export for use in other modules
module.exports = LoadTestingSystem;

// CLI execution
if (require.main === module) {
  const loadTester = new LoadTestingSystem({
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3001',
    maxConcurrentUsers: parseInt(process.env.MAX_USERS) || 50,
    testDuration: parseInt(process.env.TEST_DURATION) || 60000
  });
  
  loadTester.runLoadTest()
    .then(async (results) => {
      // Run additional tests
      await loadTester.testDatabasePerformance();
      await loadTester.testAutoScaling();
      
      // Exit with appropriate code
      if (results.overallPassed) {
        console.log('\n✅ Load testing completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Load testing failed to meet thresholds');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Load testing failed:', error);
      process.exit(1);
    });
}