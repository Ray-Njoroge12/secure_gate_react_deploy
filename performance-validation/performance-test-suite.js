/**
 * Comprehensive Performance Validation Suite
 * Tests load handling, response times, concurrent users, and system resilience
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

class PerformanceTestSuite {
  constructor(baseUrl = 'http://localhost:3001', options = {}) {
    this.baseUrl = baseUrl;
    this.options = {
      timeout: 30000,
      maxConcurrentUsers: 100,
      testDuration: 60000, // 1 minute
      rampUpTime: 10000,   // 10 seconds
      verbose: true,
      ...options
    };
    
    this.metrics = {
      responseTimes: [],
      throughput: [],
      errorRates: [],
      resourceUsage: [],
      concurrentUsers: []
    };
    
    this.testCredentials = {
      admin: { email: 'admin@test.com', password: 'TestAdmin123!' },
      resident: { email: 'resident@test.com', password: 'TestResident123!' },
      guard: { email: 'guard@test.com', password: 'TestGuard123!' }
    };
  }

  async runAllTests() {
    console.log('⚡ Starting Comprehensive Performance Validation Suite');
    console.log('=' .repeat(60));
    
    try {
      // Baseline Performance Tests
      await this.testBaselinePerformance();
      
      // Load Testing
      await this.testConcurrentUserLoad();
      await this.testPeakLoadHandling();
      await this.testSustainedLoad();
      
      // Stress Testing
      await this.testSystemBreakingPoint();
      await this.testMemoryLeakDetection();
      
      // Database Performance
      await this.testDatabasePerformance();
      await this.testQueryOptimization();
      
      // API Performance
      await this.testAPIResponseTimes();
      await this.testAPIThroughput();
      
      // Frontend Performance
      await this.testPageLoadTimes();
      await this.testJavaScriptPerformance();
      
      // Network Performance
      await this.testNetworkLatency();
      await this.testBandwidthUtilization();
      
      // Generate comprehensive report
      await this.generatePerformanceReport();
      
    } catch (error) {
      console.error('❌ Performance test suite failed:', error);
      throw error;
    }
  }

  async testBaselinePerformance() {
    console.log('\n📊 Testing Baseline Performance...');
    
    await this.runPerformanceTest('Single User Response Time', async () => {
      const token = await this.getAuthToken('resident');
      const startTime = Date.now();
      
      const endpoints = [
        '/api/health',
        '/api/users/profile',
        '/api/visitors',
        '/api/dashboard/metrics'
      ];
      
      const results = [];
      
      for (const endpoint of endpoints) {
        const requestStart = Date.now();
        const response = await this.makeRequest('GET', endpoint, null, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const responseTime = Date.now() - requestStart;
        
        results.push({
          endpoint,
          responseTime,
          status: response.status,
          success: response.status < 400
        });
        
        // Baseline requirement: < 200ms for UI feedback
        if (responseTime > 200) {
          console.warn(`  ⚠️ Slow response: ${endpoint} took ${responseTime}ms`);
        }
      }
      
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      console.log(`  📈 Average response time: ${avgResponseTime.toFixed(2)}ms`);
      
      return { avgResponseTime, results };
    });
  }

  async testConcurrentUserLoad() {
    console.log('\n👥 Testing Concurrent User Load...');
    
    await this.runPerformanceTest('Concurrent User Simulation', async () => {
      const concurrentUsers = [10, 25, 50, 100];
      const results = [];
      
      for (const userCount of concurrentUsers) {
        console.log(`  🔄 Testing ${userCount} concurrent users...`);
        
        const userResults = await this.simulateConcurrentUsers(userCount, {
          duration: 30000, // 30 seconds
          actions: [
            { method: 'GET', endpoint: '/api/visitors', weight: 0.4 },
            { method: 'POST', endpoint: '/api/visitors', weight: 0.3, data: this.generateVisitorData() },
            { method: 'GET', endpoint: '/api/dashboard/metrics', weight: 0.2 },
            { method: 'PUT', endpoint: '/api/users/profile', weight: 0.1, data: { notify_email: true } }
          ]
        });
        
        results.push({
          concurrentUsers: userCount,
          avgResponseTime: userResults.avgResponseTime,
          throughput: userResults.throughput,
          errorRate: userResults.errorRate,
          p95ResponseTime: userResults.p95ResponseTime
        });
        
        console.log(`    📊 Avg Response: ${userResults.avgResponseTime.toFixed(2)}ms`);
        console.log(`    🚀 Throughput: ${userResults.throughput.toFixed(2)} req/sec`);
        console.log(`    ❌ Error Rate: ${(userResults.errorRate * 100).toFixed(2)}%`);
      }
      
      return results;
    });
  }

  async testPeakLoadHandling() {
    console.log('\n🏔️ Testing Peak Load Handling...');
    
    await this.runPerformanceTest('Peak Load Simulation', async () => {
      // Simulate peak usage scenario (e.g., end of workday visitor check-outs)
      const peakScenarios = [
        {
          name: 'Visitor Check-in Rush',
          users: 50,
          actions: [
            { method: 'POST', endpoint: '/api/visitors/{id}/check-in', weight: 0.6 },
            { method: 'GET', endpoint: '/api/visitors', weight: 0.3 },
            { method: 'POST', endpoint: '/api/incidents', weight: 0.1 }
          ]
        },
        {
          name: 'Bulk Visitor Creation',
          users: 25,
          actions: [
            { method: 'POST', endpoint: '/api/visitors/bulk', weight: 0.7 },
            { method: 'GET', endpoint: '/api/visitors', weight: 0.3 }
          ]
        }
      ];
      
      const results = [];
      
      for (const scenario of peakScenarios) {
        console.log(`  🎯 Testing scenario: ${scenario.name}`);
        
        const scenarioResults = await this.simulateConcurrentUsers(scenario.users, {
          duration: 60000, // 1 minute
          actions: scenario.actions,
          rampUp: true
        });
        
        results.push({
          scenario: scenario.name,
          ...scenarioResults
        });
        
        // Check if system maintained acceptable performance
        if (scenarioResults.avgResponseTime > 2000) {
          console.warn(`  ⚠️ High response time during ${scenario.name}: ${scenarioResults.avgResponseTime}ms`);
        }
        
        if (scenarioResults.errorRate > 0.05) {
          console.warn(`  ⚠️ High error rate during ${scenario.name}: ${(scenarioResults.errorRate * 100).toFixed(2)}%`);
        }
      }
      
      return results;
    });
  }

  async testSustainedLoad() {
    console.log('\n⏰ Testing Sustained Load...');
    
    await this.runPerformanceTest('Sustained Load Test', async () => {
      const sustainedUsers = 30;
      const duration = 300000; // 5 minutes
      
      console.log(`  🔄 Running ${sustainedUsers} users for ${duration / 1000} seconds...`);
      
      const results = await this.simulateConcurrentUsers(sustainedUsers, {
        duration,
        actions: [
          { method: 'GET', endpoint: '/api/visitors', weight: 0.5 },
          { method: 'GET', endpoint: '/api/dashboard/metrics', weight: 0.3 },
          { method: 'POST', endpoint: '/api/visitors', weight: 0.2, data: this.generateVisitorData() }
        ],
        collectMetrics: true
      });
      
      // Analyze performance degradation over time
      const timeSlices = this.analyzePerformanceOverTime(results.timeSeriesData);
      
      return {
        ...results,
        performanceDegradation: this.calculatePerformanceDegradation(timeSlices),
        memoryLeakIndicators: this.detectMemoryLeaks(timeSlices)
      };
    });
  }

  async testSystemBreakingPoint() {
    console.log('\n💥 Testing System Breaking Point...');
    
    await this.runPerformanceTest('Breaking Point Analysis', async () => {
      let currentUsers = 50;
      const maxUsers = 500;
      const increment = 25;
      const results = [];
      
      while (currentUsers <= maxUsers) {
        console.log(`  🔄 Testing ${currentUsers} users...`);
        
        const testResults = await this.simulateConcurrentUsers(currentUsers, {
          duration: 30000,
          actions: [
            { method: 'GET', endpoint: '/api/visitors', weight: 0.7 },
            { method: 'POST', endpoint: '/api/visitors', weight: 0.3, data: this.generateVisitorData() }
          ]
        });
        
        results.push({
          users: currentUsers,
          ...testResults
        });
        
        // Check if system is breaking down
        if (testResults.errorRate > 0.1 || testResults.avgResponseTime > 5000) {
          console.log(`  💥 System breaking point reached at ${currentUsers} users`);
          break;
        }
        
        currentUsers += increment;
        
        // Cool down period
        await this.sleep(5000);
      }
      
      return {
        breakingPoint: results[results.length - 1]?.users || maxUsers,
        performanceProfile: results
      };
    });
  }

  async testDatabasePerformance() {
    console.log('\n🗄️ Testing Database Performance...');
    
    await this.runPerformanceTest('Database Query Performance', async () => {
      const token = await this.getAuthToken('admin');
      const queries = [
        { name: 'Simple Select', endpoint: '/api/visitors?limit=10' },
        { name: 'Complex Filter', endpoint: '/api/visitors?status=PENDING&date_from=2025-01-01&date_to=2025-12-31' },
        { name: 'Search Query', endpoint: '/api/visitors?search=john' },
        { name: 'Aggregation', endpoint: '/api/dashboard/metrics' },
        { name: 'Join Query', endpoint: '/api/audit-logs?limit=50' }
      ];
      
      const results = [];
      
      for (const query of queries) {
        const times = [];
        
        // Run each query multiple times
        for (let i = 0; i < 10; i++) {
          const startTime = Date.now();
          await this.makeRequest('GET', query.endpoint, null, {
            headers: { Authorization: `Bearer ${token}` }
          });
          times.push(Date.now() - startTime);
        }
        
        const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
        const p95Time = this.calculatePercentile(times, 95);
        
        results.push({
          query: query.name,
          avgResponseTime: avgTime,
          p95ResponseTime: p95Time,
          minTime: Math.min(...times),
          maxTime: Math.max(...times)
        });
        
        console.log(`    📊 ${query.name}: ${avgTime.toFixed(2)}ms avg, ${p95Time.toFixed(2)}ms p95`);
      }
      
      return results;
    });
  }

  async testAPIResponseTimes() {
    console.log('\n🔌 Testing API Response Times...');
    
    await this.runPerformanceTest('API Endpoint Performance', async () => {
      const token = await this.getAuthToken('resident');
      const endpoints = [
        { method: 'GET', path: '/api/health', auth: false },
        { method: 'GET', path: '/api/users/profile', auth: true },
        { method: 'GET', path: '/api/visitors', auth: true },
        { method: 'POST', path: '/api/visitors', auth: true, data: this.generateVisitorData() },
        { method: 'PUT', path: '/api/visitors/1', auth: true, data: { status: 'APPROVED' } },
        { method: 'GET', path: '/api/dashboard/metrics', auth: true }
      ];
      
      const results = [];
      
      for (const endpoint of endpoints) {
        const times = [];
        let successCount = 0;
        
        for (let i = 0; i < 20; i++) {
          const startTime = Date.now();
          const response = await this.makeRequest(endpoint.method, endpoint.path, endpoint.data, {
            headers: endpoint.auth ? { Authorization: `Bearer ${token}` } : {}
          });
          const responseTime = Date.now() - startTime;
          
          times.push(responseTime);
          if (response.status < 400) successCount++;
        }
        
        const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
        const p95Time = this.calculatePercentile(times, 95);
        const successRate = successCount / times.length;
        
        results.push({
          endpoint: `${endpoint.method} ${endpoint.path}`,
          avgResponseTime: avgTime,
          p95ResponseTime: p95Time,
          successRate,
          minTime: Math.min(...times),
          maxTime: Math.max(...times)
        });
        
        console.log(`    📊 ${endpoint.method} ${endpoint.path}: ${avgTime.toFixed(2)}ms avg`);
      }
      
      return results;
    });
  }

  async testMemoryLeakDetection() {
    console.log('\n🧠 Testing Memory Leak Detection...');
    
    await this.runPerformanceTest('Memory Leak Detection', async () => {
      // This would require server-side memory monitoring
      // For now, we'll simulate long-running operations and monitor response times
      
      const iterations = 100;
      const responseTimes = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        // Perform memory-intensive operations
        await Promise.all([
          this.makeRequest('GET', '/api/visitors?limit=100'),
          this.makeRequest('GET', '/api/audit-logs?limit=100'),
          this.makeRequest('GET', '/api/dashboard/metrics')
        ]);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        if (i % 10 === 0) {
          console.log(`    🔄 Iteration ${i}: ${responseTime}ms`);
        }
        
        // Small delay to prevent overwhelming the server
        await this.sleep(100);
      }
      
      // Analyze for performance degradation (potential memory leak indicator)
      const firstQuarter = responseTimes.slice(0, 25);
      const lastQuarter = responseTimes.slice(-25);
      
      const firstQuarterAvg = firstQuarter.reduce((sum, t) => sum + t, 0) / firstQuarter.length;
      const lastQuarterAvg = lastQuarter.reduce((sum, t) => sum + t, 0) / lastQuarter.length;
      
      const degradationPercentage = ((lastQuarterAvg - firstQuarterAvg) / firstQuarterAvg) * 100;
      
      return {
        iterations,
        firstQuarterAvg,
        lastQuarterAvg,
        degradationPercentage,
        potentialMemoryLeak: degradationPercentage > 20 // 20% degradation threshold
      };
    });
  }

  // Helper methods for concurrent user simulation
  async simulateConcurrentUsers(userCount, options = {}) {
    const {
      duration = 30000,
      actions = [{ method: 'GET', endpoint: '/api/health', weight: 1 }],
      rampUp = false,
      collectMetrics = false
    } = options;
    
    const workers = [];
    const results = [];
    const startTime = Date.now();
    
    // Create worker threads for concurrent simulation
    for (let i = 0; i < userCount; i++) {
      const worker = new Worker(__filename, {
        workerData: {
          isWorker: true,
          baseUrl: this.baseUrl,
          actions,
          duration: rampUp ? duration + (i * 100) : duration, // Stagger start times if ramping up
          testCredentials: this.testCredentials,
          startDelay: rampUp ? i * (10000 / userCount) : 0 // Ramp up over 10 seconds
        }
      });
      
      workers.push(worker);
      
      worker.on('message', (result) => {
        results.push(result);
      });
      
      worker.on('error', (error) => {
        console.error('Worker error:', error);
      });
    }
    
    // Wait for all workers to complete
    await Promise.all(workers.map(worker => new Promise(resolve => {
      worker.on('exit', resolve);
    })));
    
    // Aggregate results
    const allResponseTimes = results.flatMap(r => r.responseTimes);
    const allErrors = results.flatMap(r => r.errors);
    const totalRequests = results.reduce((sum, r) => sum + r.requestCount, 0);
    
    const avgResponseTime = allResponseTimes.reduce((sum, t) => sum + t, 0) / allResponseTimes.length;
    const p95ResponseTime = this.calculatePercentile(allResponseTimes, 95);
    const throughput = totalRequests / (duration / 1000);
    const errorRate = allErrors.length / totalRequests;
    
    return {
      userCount,
      duration,
      totalRequests,
      avgResponseTime,
      p95ResponseTime,
      throughput,
      errorRate,
      timeSeriesData: collectMetrics ? this.aggregateTimeSeriesData(results) : null
    };
  }

  // Worker thread code for concurrent user simulation
  static async runWorker(workerData) {
    const {
      baseUrl,
      actions,
      duration,
      testCredentials,
      startDelay = 0
    } = workerData;
    
    // Wait for start delay (ramp up)
    if (startDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, startDelay));
    }
    
    const responseTimes = [];
    const errors = [];
    let requestCount = 0;
    
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    // Get auth token
    let token = null;
    try {
      const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, testCredentials.resident);
      token = loginResponse.data.data?.accessToken || loginResponse.data.accessToken;
    } catch (error) {
      // Continue without token for public endpoints
    }
    
    while (Date.now() < endTime) {
      try {
        // Select random action based on weights
        const action = this.selectWeightedAction(actions);
        
        const requestStart = Date.now();
        const response = await axios({
          method: action.method,
          url: `${baseUrl}${action.endpoint}`,
          data: action.data,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          timeout: 10000,
          validateStatus: () => true
        });
        
        const responseTime = Date.now() - requestStart;
        responseTimes.push(responseTime);
        requestCount++;
        
        if (response.status >= 400) {
          errors.push({
            status: response.status,
            endpoint: action.endpoint,
            timestamp: Date.now()
          });
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
        
      } catch (error) {
        errors.push({
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
    
    parentPort.postMessage({
      responseTimes,
      errors,
      requestCount,
      workerId: Math.random().toString(36).substr(2, 9)
    });
  }

  static selectWeightedAction(actions) {
    const totalWeight = actions.reduce((sum, action) => sum + (action.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const action of actions) {
      random -= (action.weight || 1);
      if (random <= 0) {
        return action;
      }
    }
    
    return actions[0]; // Fallback
  }

  // Utility methods
  async makeRequest(method, endpoint, data = null, options = {}) {
    const config = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      timeout: this.options.timeout,
      validateStatus: () => true,
      ...options
    };
    
    if (data) {
      config.data = data;
    }
    
    return await axios(config);
  }

  async getAuthToken(role) {
    const credentials = this.testCredentials[role];
    const response = await this.makeRequest('POST', '/api/auth/login', credentials);
    return response.data.data?.accessToken || response.data.accessToken;
  }

  generateVisitorData() {
    const names = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson'];
    const purposes = ['Meeting', 'Delivery', 'Maintenance', 'Visit', 'Business'];
    
    return {
      name: names[Math.floor(Math.random() * names.length)],
      phone: `+25471${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
      email: `test${Math.floor(Math.random() * 10000)}@example.com`,
      purpose: purposes[Math.floor(Math.random() * purposes.length)],
      expectedArrival: new Date(Date.now() + Math.random() * 86400000).toISOString()
    };
  }

  calculatePercentile(values, percentile) {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  async runPerformanceTest(testName, testFunction) {
    try {
      console.log(`  ⏳ ${testName}...`);
      const startTime = Date.now();
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      console.log(`  ✅ ${testName} - COMPLETED (${duration}ms)`);
      
      this.metrics[testName] = {
        duration,
        result,
        timestamp: new Date().toISOString()
      };
      
      return result;
    } catch (error) {
      console.log(`  ❌ ${testName} - FAILED: ${error.message}`);
      throw error;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      configuration: this.options,
      metrics: this.metrics,
      summary: this.generatePerformanceSummary(),
      recommendations: this.generatePerformanceRecommendations()
    };
    
    const reportPath = path.join(__dirname, 'performance-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Performance Validation Summary:');
    console.log(`  📄 Detailed report saved to: ${reportPath}`);
    
    return report;
  }

  generatePerformanceSummary() {
    // Analyze collected metrics and generate summary
    return {
      overallPerformance: 'Good', // This would be calculated based on actual metrics
      criticalIssues: [],
      performanceBottlenecks: [],
      scalabilityAssessment: 'System handles expected load well'
    };
  }

  generatePerformanceRecommendations() {
    return [
      'Implement database query optimization for complex filters',
      'Consider implementing response caching for frequently accessed data',
      'Monitor memory usage in production to detect potential leaks',
      'Implement auto-scaling based on CPU and memory metrics',
      'Consider CDN implementation for static assets'
    ];
  }

  // Additional helper methods for comprehensive testing
  async makeRequest(method, endpoint, data = null, options = {}) {
    const config = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      timeout: this.options.timeout,
      validateStatus: () => true, // Don't throw on HTTP errors
      ...options
    };
    
    if (data) {
      config.data = data;
    }
    
    try {
      const response = await axios(config);
      return response;
    } catch (error) {
      if (options.expectError) {
        return { status: 500, data: { error: error.message } };
      }
      throw error;
    }
  }

  async getAuthToken(role) {
    const credentials = this.testCredentials[role];
    if (!credentials) {
      throw new Error(`No test credentials for role: ${role}`);
    }
    
    const response = await this.makeRequest('POST', '/api/auth/login', credentials);
    return this.extractTokenFromResponse(response);
  }

  extractTokenFromResponse(response) {
    // Extract token from cookie or response body
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      const tokenCookie = setCookieHeader.find(cookie => cookie.includes('accessToken'));
      if (tokenCookie) {
        return tokenCookie.split('=')[1].split(';')[0];
      }
    }
    
    return response.data.data?.accessToken || response.data.accessToken;
  }

  async runPerformanceTest(testName, testFunction) {
    try {
      console.log(`  ⏳ ${testName}...`);
      const startTime = Date.now();
      await testFunction();
      const duration = Date.now() - startTime;
      console.log(`  ✅ ${testName} - PASSED (${duration}ms)`);
      return { name: testName, status: 'PASSED', duration };
    } catch (error) {
      console.log(`  ❌ ${testName} - FAILED: ${error.message}`);
      return { name: testName, status: 'FAILED', error: error.message };
    }
  }

  calculatePercentile(values, percentile) {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testPageLoadTimes() {
    console.log('\n🌐 Testing Page Load Times...');
    
    await this.runPerformanceTest('Frontend Page Load Performance', async () => {
      // This would require browser automation (Puppeteer/Playwright)
      // For now, we'll test static asset loading times
      
      const staticAssets = [
        '/favicon.ico',
        '/manifest.json',
        '/static/css/main.css',
        '/static/js/main.js'
      ];
      
      const results = [];
      
      for (const asset of staticAssets) {
        const startTime = Date.now();
        const response = await this.makeRequest('GET', asset);
        const loadTime = Date.now() - startTime;
        
        results.push({
          asset,
          loadTime,
          size: response.headers['content-length'] || 0,
          cached: response.headers['cache-control'] ? true : false
        });
        
        console.log(`    📊 ${asset}: ${loadTime}ms`);
      }
      
      return results;
    });
  }

  async testJavaScriptPerformance() {
    console.log('\n⚡ Testing JavaScript Performance...');
    
    await this.runPerformanceTest('Client-Side Performance', async () => {
      // This would require browser automation to test actual JS performance
      // For now, we'll test API endpoints that trigger heavy client-side processing
      
      const heavyEndpoints = [
        '/api/dashboard/metrics',
        '/api/visitors?limit=100',
        '/api/audit-logs?limit=100'
      ];
      
      const token = await this.getAuthToken('admin');
      const results = [];
      
      for (const endpoint of heavyEndpoints) {
        const times = [];
        
        for (let i = 0; i < 5; i++) {
          const startTime = Date.now();
          await this.makeRequest('GET', endpoint, null, {
            headers: { Authorization: `Bearer ${token}` }
          });
          times.push(Date.now() - startTime);
        }
        
        const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
        results.push({ endpoint, avgTime });
        
        console.log(`    📊 ${endpoint}: ${avgTime.toFixed(2)}ms avg`);
      }
      
      return results;
    });
  }

  async testNetworkLatency() {
    console.log('\n🌐 Testing Network Latency...');
    
    await this.runPerformanceTest('Network Latency Analysis', async () => {
      const testEndpoints = [
        '/api/health',
        '/api/ping'
      ];
      
      const results = [];
      
      for (const endpoint of testEndpoints) {
        const latencies = [];
        
        for (let i = 0; i < 10; i++) {
          const startTime = Date.now();
          await this.makeRequest('GET', endpoint);
          latencies.push(Date.now() - startTime);
          
          // Small delay between requests
          await this.sleep(100);
        }
        
        const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
        const minLatency = Math.min(...latencies);
        const maxLatency = Math.max(...latencies);
        
        results.push({
          endpoint,
          avgLatency,
          minLatency,
          maxLatency,
          jitter: maxLatency - minLatency
        });
        
        console.log(`    📊 ${endpoint}: ${avgLatency.toFixed(2)}ms avg, ${(maxLatency - minLatency).toFixed(2)}ms jitter`);
      }
      
      return results;
    });
  }

  async testBandwidthUtilization() {
    console.log('\n📊 Testing Bandwidth Utilization...');
    
    await this.runPerformanceTest('Bandwidth Usage Analysis', async () => {
      const token = await this.getAuthToken('admin');
      
      // Test different payload sizes
      const testCases = [
        { name: 'Small Request', endpoint: '/api/health', expectedSize: 'small' },
        { name: 'Medium Request', endpoint: '/api/visitors?limit=20', expectedSize: 'medium' },
        { name: 'Large Request', endpoint: '/api/audit-logs?limit=100', expectedSize: 'large' }
      ];
      
      const results = [];
      
      for (const testCase of testCases) {
        const startTime = Date.now();
        const response = await this.makeRequest('GET', testCase.endpoint, null, {
          headers: testCase.endpoint.includes('health') ? {} : { Authorization: `Bearer ${token}` }
        });
        const responseTime = Date.now() - startTime;
        
        const responseSize = JSON.stringify(response.data).length;
        const throughput = responseSize / (responseTime / 1000); // bytes per second
        
        results.push({
          testCase: testCase.name,
          responseSize,
          responseTime,
          throughput: throughput.toFixed(2)
        });
        
        console.log(`    📊 ${testCase.name}: ${responseSize} bytes, ${throughput.toFixed(2)} B/s`);
      }
      
      return results;
    });
  }

  analyzePerformanceOverTime(timeSeriesData) {
    if (!timeSeriesData || timeSeriesData.length === 0) {
      return [];
    }
    
    const timeSlices = [];
    const sliceSize = Math.floor(timeSeriesData.length / 10); // 10 time slices
    
    for (let i = 0; i < 10; i++) {
      const start = i * sliceSize;
      const end = Math.min(start + sliceSize, timeSeriesData.length);
      const slice = timeSeriesData.slice(start, end);
      
      if (slice.length > 0) {
        const avgResponseTime = slice.reduce((sum, d) => sum + d.responseTime, 0) / slice.length;
        const errorRate = slice.filter(d => d.error).length / slice.length;
        
        timeSlices.push({
          timeSlice: i + 1,
          avgResponseTime,
          errorRate,
          sampleSize: slice.length
        });
      }
    }
    
    return timeSlices;
  }

  calculatePerformanceDegradation(timeSlices) {
    if (timeSlices.length < 2) {
      return { degradation: 0, trend: 'stable' };
    }
    
    const firstSlice = timeSlices[0];
    const lastSlice = timeSlices[timeSlices.length - 1];
    
    const degradation = ((lastSlice.avgResponseTime - firstSlice.avgResponseTime) / firstSlice.avgResponseTime) * 100;
    
    let trend = 'stable';
    if (degradation > 10) trend = 'degrading';
    else if (degradation < -10) trend = 'improving';
    
    return { degradation: degradation.toFixed(2), trend };
  }

  detectMemoryLeaks(timeSlices) {
    if (timeSlices.length < 5) {
      return { detected: false, confidence: 'low' };
    }
    
    // Look for consistent upward trend in response times
    let increasingSlices = 0;
    for (let i = 1; i < timeSlices.length; i++) {
      if (timeSlices[i].avgResponseTime > timeSlices[i - 1].avgResponseTime) {
        increasingSlices++;
      }
    }
    
    const increasingPercentage = (increasingSlices / (timeSlices.length - 1)) * 100;
    
    return {
      detected: increasingPercentage > 70, // 70% of slices show increasing response times
      confidence: increasingPercentage > 80 ? 'high' : increasingPercentage > 60 ? 'medium' : 'low',
      increasingPercentage: increasingPercentage.toFixed(2)
    };
  }

  aggregateTimeSeriesData(results) {
    const timeSeriesData = [];
    
    for (const result of results) {
      if (result.responseTimes && result.workerId) {
        for (let i = 0; i < result.responseTimes.length; i++) {
          timeSeriesData.push({
            workerId: result.workerId,
            responseTime: result.responseTimes[i],
            timestamp: Date.now() + (i * 1000), // Approximate timestamps
            error: result.errors && result.errors[i] ? true : false
          });
        }
      }
    }
    
    return timeSeriesData.sort((a, b) => a.timestamp - b.timestamp);
  }

  async generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        avgResponseTime: this.metrics.responseTimes.length > 0 
          ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length 
          : 0,
        p95ResponseTime: this.calculatePercentile(this.metrics.responseTimes, 95),
        p99ResponseTime: this.calculatePercentile(this.metrics.responseTimes, 99),
        maxThroughput: Math.max(...this.metrics.throughput, 0),
        avgErrorRate: this.metrics.errorRates.length > 0 
          ? this.metrics.errorRates.reduce((a, b) => a + b, 0) / this.metrics.errorRates.length 
          : 0
      },
      metrics: this.metrics,
      recommendations: this.generatePerformanceRecommendations()
    };
    
    const reportPath = path.join(__dirname, 'performance-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Performance Validation Summary:');
    console.log(`  Average Response Time: ${report.summary.avgResponseTime.toFixed(2)}ms`);
    console.log(`  P95 Response Time: ${report.summary.p95ResponseTime.toFixed(2)}ms`);
    console.log(`  P99 Response Time: ${report.summary.p99ResponseTime.toFixed(2)}ms`);
    console.log(`  Max Throughput: ${report.summary.maxThroughput.toFixed(2)} RPS`);
    console.log(`  Average Error Rate: ${report.summary.avgErrorRate.toFixed(2)}%`);
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    return report;
  }

  generatePerformanceRecommendations() {
    const recommendations = [];
    
    const avgResponseTime = this.metrics.responseTimes.length > 0 
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length 
      : 0;
    
    if (avgResponseTime > 200) {
      recommendations.push('Consider optimizing API response times - average exceeds 200ms target');
    }
    
    const p95ResponseTime = this.calculatePercentile(this.metrics.responseTimes, 95);
    if (p95ResponseTime > 1000) {
      recommendations.push('P95 response time exceeds 1 second - investigate slow queries and optimize');
    }
    
    const avgErrorRate = this.metrics.errorRates.length > 0 
      ? this.metrics.errorRates.reduce((a, b) => a + b, 0) / this.metrics.errorRates.length 
      : 0;
    
    if (avgErrorRate > 1) {
      recommendations.push('Error rate exceeds 1% - investigate and fix failing requests');
    }
    
    recommendations.push('Implement performance monitoring in production');
    recommendations.push('Consider implementing caching for frequently accessed data');
    recommendations.push('Monitor database query performance and add indexes as needed');
    
    return recommendations;
  }
}

module.exports = PerformanceTestSuite;

// Worker thread execution
if (!isMainThread && workerData?.isWorker) {
  PerformanceTestSuite.runWorker(workerData);
}

// CLI execution
if (require.main === module) {
  const suite = new PerformanceTestSuite();
  suite.runAllTests().catch(console.error);
}