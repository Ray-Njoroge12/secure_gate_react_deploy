/**
 * Stress and Endurance Testing System
 * 
 * Comprehensive stress and endurance testing framework for production readiness.
 * Tests traffic spike simulation, system recovery capabilities, memory leak detection,
 * and long-running operation stability under extreme conditions.
 * 
 * Requirements: 6.2, 6.5
 */

const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Import load testing system for base functionality
const LoadTestingSystem = require('./load-testing-system');

class StressEnduranceTestingSystem extends LoadTestingSystem {
  constructor(options = {}) {
    super(options);
    
    this.stressTestConfig = {
      maxStressUsers: options.maxStressUsers || 500,
      spikeUsers: options.spikeUsers || 1000,
      enduranceTestDuration: options.enduranceTestDuration || 3600000, // 1 hour
      memoryLeakThreshold: options.memoryLeakThreshold || 100 * 1024 * 1024, // 100MB
      recoveryTimeThreshold: options.recoveryTimeThreshold || 30000, // 30 seconds
    };
    
    this.stressResults = {
      stressTest: null,
      spikeTest: null,
      enduranceTest: null,
      memoryLeakTest: null,
      recoveryTest: null,
      overallStressScore: 0
    };
    
    this.memorySnapshots = [];
    this.systemMetrics = [];
  }

  async runStressEnduranceTests() {
    console.log('💥 Starting comprehensive stress and endurance testing...');
    console.log(`Max Stress Users: ${this.stressTestConfig.maxStressUsers}`);
    console.log(`Spike Users: ${this.stressTestConfig.spikeUsers}`);
    console.log(`Endurance Duration: ${this.stressTestConfig.enduranceTestDuration / 1000}s`);
    
    try {
      // Run stress test
      this.stressResults.stressTest = await this.runStressTest();
      
      // Run traffic spike test
      this.stressResults.spikeTest = await this.runTrafficSpikeTest();
      
      // Run endurance test
      this.stressResults.enduranceTest = await this.runEnduranceTest();
      
      // Run memory leak detection
      this.stressResults.memoryLeakTest = await this.runMemoryLeakTest();
      
      // Run recovery test
      this.stressResults.recoveryTest = await this.runRecoveryTest();
      
      // Calculate overall stress score
      this.calculateOverallStressScore();
      
      // Generate comprehensive report
      await this.generateStressReport();
      
      return this.stressResults;
    } catch (error) {
      console.error('❌ Stress and endurance testing failed:', error);
      throw error;
    }
  }

  async runStressTest() {
    console.log('\n💥 Running stress test...');
    
    const stressResults = {
      maxUsersReached: 0,
      breakingPoint: null,
      degradationPoint: null,
      recoveryTime: 0,
      systemStability: true,
      errorRateProgression: []
    };
    
    try {
      // Gradually increase load until system breaks or reaches max
      const userIncrements = [50, 100, 200, 300, 400, 500];
      let previousResults = null;
      
      for (const userCount of userIncrements) {
        if (userCount > this.stressTestConfig.maxStressUsers) break;
        
        console.log(`🔥 Testing with ${userCount} concurrent users...`);
        
        const stressTest = new LoadTestingSystem({
          baseUrl: this.baseUrl,
          maxConcurrentUsers: userCount,
          testDuration: 30000, // 30 seconds per increment
          rampUpTime: 5000 // 5 seconds ramp up
        });
        
        const results = await stressTest.runLoadTest();
        stressResults.maxUsersReached = userCount;
        
        // Record error rate progression
        stressResults.errorRateProgression.push({
          users: userCount,
          errorRate: results.errorRate,
          avgResponseTime: results.averageResponseTime,
          throughput: results.throughput
        });
        
        // Check for degradation point (response time doubles)
        if (previousResults && !stressResults.degradationPoint) {
          if (results.averageResponseTime > previousResults.averageResponseTime * 2) {
            stressResults.degradationPoint = userCount;
            console.log(`⚠️ Performance degradation detected at ${userCount} users`);
          }
        }
        
        // Check for breaking point (error rate > 10% or response time > 5s)
        if (results.errorRate > 0.1 || results.averageResponseTime > 5000) {
          stressResults.breakingPoint = userCount;
          console.log(`💥 System breaking point reached at ${userCount} users`);
          break;
        }
        
        previousResults = results;
        
        // Small recovery period between increments
        await this.sleep(5000);
      }
      
      // Test recovery after stress
      console.log('🔄 Testing system recovery...');
      const recoveryStartTime = Date.now();
      
      // Wait for system to recover
      let recovered = false;
      while (Date.now() - recoveryStartTime < 60000 && !recovered) { // Max 1 minute
        try {
          const healthCheck = await this.makeRequest('/health', 'GET');
          if (healthCheck) {
            recovered = true;
            stressResults.recoveryTime = Date.now() - recoveryStartTime;
          }
        } catch (error) {
          await this.sleep(2000);
        }
      }
      
      stressResults.systemStability = recovered;
      
      console.log(`📊 Stress Test Results:`);
      console.log(`Max Users Reached: ${stressResults.maxUsersReached}`);
      console.log(`Degradation Point: ${stressResults.degradationPoint || 'Not reached'}`);
      console.log(`Breaking Point: ${stressResults.breakingPoint || 'Not reached'}`);
      console.log(`Recovery Time: ${stressResults.recoveryTime}ms`);
      console.log(`System Stability: ${stressResults.systemStability ? '✅' : '❌'}`);
      
      return stressResults;
    } catch (error) {
      console.error('❌ Stress test failed:', error);
      stressResults.systemStability = false;
      return stressResults;
    }
  }

  async runTrafficSpikeTest() {
    console.log('\n🚀 Running traffic spike test...');
    
    const spikeResults = {
      baselinePerformance: null,
      spikePerformance: null,
      recoveryPerformance: null,
      spikeHandled: false,
      performanceImpact: 0,
      recoveryTime: 0
    };
    
    try {
      // Establish baseline
      console.log('📊 Establishing baseline performance...');
      const baselineTest = new LoadTestingSystem({
        baseUrl: this.baseUrl,
        maxConcurrentUsers: 20,
        testDuration: 30000
      });
      
      spikeResults.baselinePerformance = await baselineTest.runLoadTest();
      
      // Wait for system to stabilize
      await this.sleep(10000);
      
      // Execute traffic spike
      console.log('💥 Executing traffic spike...');
      const spikeTest = new LoadTestingSystem({
        baseUrl: this.baseUrl,
        maxConcurrentUsers: this.stressTestConfig.spikeUsers,
        testDuration: 60000, // 1 minute spike
        rampUpTime: 2000 // Very fast ramp up to simulate spike
      });
      
      const spikeStartTime = Date.now();
      spikeResults.spikePerformance = await spikeTest.runLoadTest();
      
      // Calculate performance impact
      const baselineAvgTime = spikeResults.baselinePerformance.averageResponseTime;
      const spikeAvgTime = spikeResults.spikePerformance.averageResponseTime;
      spikeResults.performanceImpact = ((spikeAvgTime - baselineAvgTime) / baselineAvgTime) * 100;
      
      // Check if spike was handled (error rate < 20%)
      spikeResults.spikeHandled = spikeResults.spikePerformance.errorRate < 0.2;
      
      // Wait for recovery
      console.log('🔄 Testing recovery after spike...');
      await this.sleep(30000); // Wait 30 seconds for recovery
      
      // Test recovery performance
      const recoveryTest = new LoadTestingSystem({
        baseUrl: this.baseUrl,
        maxConcurrentUsers: 20,
        testDuration: 30000
      });
      
      const recoveryStartTime = Date.now();
      spikeResults.recoveryPerformance = await recoveryTest.runLoadTest();
      spikeResults.recoveryTime = Date.now() - spikeStartTime;
      
      console.log(`📊 Traffic Spike Results:`);
      console.log(`Baseline Avg Response: ${baselineAvgTime.toFixed(2)}ms`);
      console.log(`Spike Avg Response: ${spikeAvgTime.toFixed(2)}ms`);
      console.log(`Performance Impact: ${spikeResults.performanceImpact.toFixed(1)}%`);
      console.log(`Spike Handled: ${spikeResults.spikeHandled ? '✅' : '❌'}`);
      console.log(`Recovery Time: ${spikeResults.recoveryTime}ms`);
      
      return spikeResults;
    } catch (error) {
      console.error('❌ Traffic spike test failed:', error);
      spikeResults.spikeHandled = false;
      return spikeResults;
    }
  }

  async runEnduranceTest() {
    console.log('\n⏰ Running endurance test...');
    
    const enduranceResults = {
      testDuration: this.stressTestConfig.enduranceTestDuration,
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      memoryLeakDetected: false,
      performanceDegradation: false,
      systemStability: true,
      hourlyMetrics: []
    };
    
    try {
      const startTime = Date.now();
      const endTime = startTime + this.stressTestConfig.enduranceTestDuration;
      const metricsInterval = 300000; // 5 minutes
      let nextMetricsTime = startTime + metricsInterval;
      
      console.log(`🏃 Starting ${this.stressTestConfig.enduranceTestDuration / 1000}s endurance test...`);
      
      // Run continuous load for endurance test duration
      const enduranceTest = new LoadTestingSystem({
        baseUrl: this.baseUrl,
        maxConcurrentUsers: 50, // Moderate sustained load
        testDuration: this.stressTestConfig.enduranceTestDuration,
        rampUpTime: 30000 // 30 second ramp up
      });
      
      // Start memory monitoring
      const memoryMonitoringPromise = this.monitorMemoryUsage(this.stressTestConfig.enduranceTestDuration);
      
      // Run the endurance test
      const results = await enduranceTest.runLoadTest();
      
      // Wait for memory monitoring to complete
      const memoryResults = await memoryMonitoringPromise;
      
      enduranceResults.totalRequests = results.totalRequests;
      enduranceResults.averageResponseTime = results.averageResponseTime;
      enduranceResults.errorRate = results.errorRate;
      enduranceResults.memoryLeakDetected = memoryResults.leakDetected;
      
      // Analyze performance degradation over time
      enduranceResults.performanceDegradation = this.analyzePerformanceDegradation(results.responseTimes);
      
      // System is stable if error rate is low and no major memory leaks
      enduranceResults.systemStability = results.errorRate < 0.05 && !memoryResults.leakDetected;
      
      console.log(`📊 Endurance Test Results:`);
      console.log(`Total Requests: ${enduranceResults.totalRequests}`);
      console.log(`Average Response Time: ${enduranceResults.averageResponseTime.toFixed(2)}ms`);
      console.log(`Error Rate: ${(enduranceResults.errorRate * 100).toFixed(2)}%`);
      console.log(`Memory Leak Detected: ${enduranceResults.memoryLeakDetected ? '❌' : '✅'}`);
      console.log(`Performance Degradation: ${enduranceResults.performanceDegradation ? '❌' : '✅'}`);
      console.log(`System Stability: ${enduranceResults.systemStability ? '✅' : '❌'}`);
      
      return enduranceResults;
    } catch (error) {
      console.error('❌ Endurance test failed:', error);
      enduranceResults.systemStability = false;
      return enduranceResults;
    }
  }

  async monitorMemoryUsage(duration) {
    const memoryResults = {
      initialMemory: 0,
      finalMemory: 0,
      peakMemory: 0,
      leakDetected: false,
      snapshots: []
    };
    
    const startTime = Date.now();
    const endTime = startTime + duration;
    const snapshotInterval = 60000; // 1 minute intervals
    
    try {
      while (Date.now() < endTime) {
        try {
          // Get system memory info (this is a simplified approach)
          const memoryInfo = process.memoryUsage();
          const timestamp = Date.now();
          
          const snapshot = {
            timestamp,
            heapUsed: memoryInfo.heapUsed,
            heapTotal: memoryInfo.heapTotal,
            external: memoryInfo.external,
            rss: memoryInfo.rss
          };
          
          memoryResults.snapshots.push(snapshot);
          
          if (memoryResults.snapshots.length === 1) {
            memoryResults.initialMemory = memoryInfo.heapUsed;
          }
          
          memoryResults.finalMemory = memoryInfo.heapUsed;
          memoryResults.peakMemory = Math.max(memoryResults.peakMemory, memoryInfo.heapUsed);
          
          // Simple leak detection: memory consistently growing
          if (memoryResults.snapshots.length > 10) {
            const recentSnapshots = memoryResults.snapshots.slice(-10);
            const trend = this.calculateMemoryTrend(recentSnapshots);
            
            if (trend > this.stressTestConfig.memoryLeakThreshold) {
              memoryResults.leakDetected = true;
            }
          }
          
        } catch (error) {
          console.log('⚠️ Memory monitoring error:', error.message);
        }
        
        await this.sleep(snapshotInterval);
      }
      
      return memoryResults;
    } catch (error) {
      console.error('❌ Memory monitoring failed:', error);
      return memoryResults;
    }
  }

  calculateMemoryTrend(snapshots) {
    if (snapshots.length < 2) return 0;
    
    const first = snapshots[0].heapUsed;
    const last = snapshots[snapshots.length - 1].heapUsed;
    
    return last - first;
  }

  analyzePerformanceDegradation(responseTimes) {
    if (responseTimes.length < 100) return false;
    
    // Split response times into early and late periods
    const splitPoint = Math.floor(responseTimes.length / 2);
    const earlyTimes = responseTimes.slice(0, splitPoint);
    const lateTimes = responseTimes.slice(splitPoint);
    
    const earlyAvg = earlyTimes.reduce((sum, time) => sum + time, 0) / earlyTimes.length;
    const lateAvg = lateTimes.reduce((sum, time) => sum + time, 0) / lateTimes.length;
    
    // Degradation if late period is 50% slower than early period
    return lateAvg > earlyAvg * 1.5;
  }

  async runMemoryLeakTest() {
    console.log('\n🧠 Running memory leak detection test...');
    
    const memoryLeakResults = {
      testDuration: 600000, // 10 minutes
      memoryGrowth: 0,
      leakDetected: false,
      gcEffectiveness: 0,
      memorySnapshots: []
    };
    
    try {
      const startTime = Date.now();
      const endTime = startTime + memoryLeakResults.testDuration;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const initialMemory = process.memoryUsage();
      memoryLeakResults.memorySnapshots.push({
        timestamp: startTime,
        memory: initialMemory.heapUsed
      });
      
      // Run memory-intensive operations
      const memoryTest = new LoadTestingSystem({
        baseUrl: this.baseUrl,
        maxConcurrentUsers: 100,
        testDuration: memoryLeakResults.testDuration,
        rampUpTime: 10000
      });
      
      // Monitor memory during test
      const monitoringPromise = this.monitorMemoryDuringTest(memoryLeakResults);
      
      // Run the test
      await memoryTest.runLoadTest();
      
      // Stop monitoring
      await monitoringPromise;
      
      // Force garbage collection again
      if (global.gc) {
        global.gc();
        await this.sleep(5000); // Wait for GC to complete
      }
      
      const finalMemory = process.memoryUsage();
      memoryLeakResults.memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Detect leak if memory grew significantly after GC
      memoryLeakResults.leakDetected = memoryLeakResults.memoryGrowth > this.stressTestConfig.memoryLeakThreshold;
      
      // Calculate GC effectiveness
      const peakMemory = Math.max(...memoryLeakResults.memorySnapshots.map(s => s.memory));
      memoryLeakResults.gcEffectiveness = ((peakMemory - finalMemory.heapUsed) / peakMemory) * 100;
      
      console.log(`📊 Memory Leak Test Results:`);
      console.log(`Memory Growth: ${(memoryLeakResults.memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Leak Detected: ${memoryLeakResults.leakDetected ? '❌' : '✅'}`);
      console.log(`GC Effectiveness: ${memoryLeakResults.gcEffectiveness.toFixed(1)}%`);
      
      return memoryLeakResults;
    } catch (error) {
      console.error('❌ Memory leak test failed:', error);
      memoryLeakResults.leakDetected = true; // Assume leak on error
      return memoryLeakResults;
    }
  }

  async monitorMemoryDuringTest(results) {
    const monitoringDuration = results.testDuration;
    const startTime = Date.now();
    const endTime = startTime + monitoringDuration;
    
    while (Date.now() < endTime) {
      const currentMemory = process.memoryUsage();
      results.memorySnapshots.push({
        timestamp: Date.now(),
        memory: currentMemory.heapUsed
      });
      
      await this.sleep(30000); // Sample every 30 seconds
    }
  }

  async runRecoveryTest() {
    console.log('\n🔄 Running system recovery test...');
    
    const recoveryResults = {
      overloadRecoveryTime: 0,
      errorRecoveryTime: 0,
      serviceAvailability: 0,
      dataConsistency: true,
      recoverySuccess: false
    };
    
    try {
      // Step 1: Overload the system
      console.log('💥 Overloading system...');
      const overloadTest = new LoadTestingSystem({
        baseUrl: this.baseUrl,
        maxConcurrentUsers: this.stressTestConfig.spikeUsers,
        testDuration: 30000, // 30 seconds of overload
        rampUpTime: 1000 // Very fast ramp up
      });
      
      await overloadTest.runLoadTest();
      
      // Step 2: Measure recovery time
      console.log('⏱️ Measuring recovery time...');
      const recoveryStartTime = Date.now();
      let systemRecovered = false;
      let consecutiveSuccesses = 0;
      
      while (Date.now() - recoveryStartTime < 120000 && !systemRecovered) { // Max 2 minutes
        try {
          const healthResponse = await this.makeRequest('/health', 'GET');
          
          if (healthResponse) {
            consecutiveSuccesses++;
            
            // Consider recovered after 5 consecutive successful health checks
            if (consecutiveSuccesses >= 5) {
              systemRecovered = true;
              recoveryResults.overloadRecoveryTime = Date.now() - recoveryStartTime;
            }
          } else {
            consecutiveSuccesses = 0;
          }
        } catch (error) {
          consecutiveSuccesses = 0;
        }
        
        await this.sleep(2000); // Check every 2 seconds
      }
      
      // Step 3: Test service availability after recovery
      if (systemRecovered) {
        console.log('🔍 Testing service availability after recovery...');
        const availabilityTest = new LoadTestingSystem({
          baseUrl: this.baseUrl,
          maxConcurrentUsers: 20,
          testDuration: 30000
        });
        
        const availabilityResults = await availabilityTest.runLoadTest();
        recoveryResults.serviceAvailability = (1 - availabilityResults.errorRate) * 100;
        
        // Step 4: Test data consistency
        recoveryResults.dataConsistency = await this.testDataConsistency();
      }
      
      recoveryResults.recoverySuccess = systemRecovered && 
                                       recoveryResults.serviceAvailability > 95 && 
                                       recoveryResults.dataConsistency;
      
      console.log(`📊 Recovery Test Results:`);
      console.log(`Recovery Time: ${recoveryResults.overloadRecoveryTime}ms`);
      console.log(`Service Availability: ${recoveryResults.serviceAvailability.toFixed(1)}%`);
      console.log(`Data Consistency: ${recoveryResults.dataConsistency ? '✅' : '❌'}`);
      console.log(`Recovery Success: ${recoveryResults.recoverySuccess ? '✅' : '❌'}`);
      
      return recoveryResults;
    } catch (error) {
      console.error('❌ Recovery test failed:', error);
      recoveryResults.recoverySuccess = false;
      return recoveryResults;
    }
  }

  async testDataConsistency() {
    try {
      // Test basic data operations to ensure consistency
      const testData = {
        name: 'Recovery Test Visitor',
        phone: '+254700000000',
        purpose: 'Data consistency test',
        expectedArrival: new Date(Date.now() + 3600000).toISOString()
      };
      
      // Create a test record
      const createResponse = await this.makeRequest('/api/visitors', 'POST', testData, {
        'Authorization': `Bearer ${this.authToken}`
      });
      
      if (!createResponse.success) {
        return false;
      }
      
      const visitorId = createResponse.data.visitor.id;
      
      // Retrieve the record
      const getResponse = await this.makeRequest(`/api/visitors/${visitorId}`, 'GET', null, {
        'Authorization': `Bearer ${this.authToken}`
      });
      
      if (!getResponse.success) {
        return false;
      }
      
      // Verify data integrity
      const visitor = getResponse.data.visitor;
      const dataConsistent = visitor.name === testData.name && 
                             visitor.phone === testData.phone &&
                             visitor.purpose === testData.purpose;
      
      // Clean up test data
      try {
        await this.makeRequest(`/api/visitors/${visitorId}`, 'DELETE', null, {
          'Authorization': `Bearer ${this.authToken}`
        });
      } catch (cleanupError) {
        // Cleanup error doesn't affect consistency test
      }
      
      return dataConsistent;
    } catch (error) {
      console.log('⚠️ Data consistency test error:', error.message);
      return false;
    }
  }

  calculateOverallStressScore() {
    const weights = {
      stressTest: 0.25,
      spikeTest: 0.25,
      enduranceTest: 0.25,
      memoryLeakTest: 0.15,
      recoveryTest: 0.1
    };
    
    let totalScore = 0;
    
    // Stress test score
    if (this.stressResults.stressTest) {
      const stressScore = this.stressResults.stressTest.systemStability ? 100 : 
                         (this.stressResults.stressTest.maxUsersReached / this.stressTestConfig.maxStressUsers) * 100;
      totalScore += stressScore * weights.stressTest;
    }
    
    // Spike test score
    if (this.stressResults.spikeTest) {
      const spikeScore = this.stressResults.spikeTest.spikeHandled ? 100 : 50;
      totalScore += spikeScore * weights.spikeTest;
    }
    
    // Endurance test score
    if (this.stressResults.enduranceTest) {
      const enduranceScore = this.stressResults.enduranceTest.systemStability ? 100 : 50;
      totalScore += enduranceScore * weights.enduranceTest;
    }
    
    // Memory leak test score
    if (this.stressResults.memoryLeakTest) {
      const memoryScore = this.stressResults.memoryLeakTest.leakDetected ? 0 : 100;
      totalScore += memoryScore * weights.memoryLeakTest;
    }
    
    // Recovery test score
    if (this.stressResults.recoveryTest) {
      const recoveryScore = this.stressResults.recoveryTest.recoverySuccess ? 100 : 0;
      totalScore += recoveryScore * weights.recoveryTest;
    }
    
    this.stressResults.overallStressScore = Math.round(totalScore);
  }

  async generateStressReport() {
    console.log('\n💥 Stress and Endurance Testing Report');
    console.log('======================================');
    console.log(`Overall Stress Score: ${this.stressResults.overallStressScore}/100`);
    
    if (this.stressResults.stressTest) {
      console.log(`\n🔥 Stress Test: ${this.stressResults.stressTest.systemStability ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`  Max Users: ${this.stressResults.stressTest.maxUsersReached}`);
      console.log(`  Breaking Point: ${this.stressResults.stressTest.breakingPoint || 'Not reached'}`);
    }
    
    if (this.stressResults.spikeTest) {
      console.log(`\n🚀 Spike Test: ${this.stressResults.spikeTest.spikeHandled ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`  Performance Impact: ${this.stressResults.spikeTest.performanceImpact.toFixed(1)}%`);
    }
    
    if (this.stressResults.enduranceTest) {
      console.log(`\n⏰ Endurance Test: ${this.stressResults.enduranceTest.systemStability ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`  Memory Leak: ${this.stressResults.enduranceTest.memoryLeakDetected ? '❌' : '✅'}`);
    }
    
    if (this.stressResults.memoryLeakTest) {
      console.log(`\n🧠 Memory Leak Test: ${this.stressResults.memoryLeakTest.leakDetected ? '❌ FAILED' : '✅ PASSED'}`);
      console.log(`  Memory Growth: ${(this.stressResults.memoryLeakTest.memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    }
    
    if (this.stressResults.recoveryTest) {
      console.log(`\n🔄 Recovery Test: ${this.stressResults.recoveryTest.recoverySuccess ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`  Recovery Time: ${this.stressResults.recoveryTest.overloadRecoveryTime}ms`);
    }
    
    // Save detailed report
    await this.saveStressReport();
  }

  async saveStressReport() {
    const reportPath = path.join(process.cwd(), 'production-readiness-tests', 'reports', 'stress-endurance-report.json');
    
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      
      const detailedReport = {
        ...this.stressResults,
        testConfiguration: this.stressTestConfig,
        timestamp: new Date().toISOString()
      };
      
      await fs.writeFile(reportPath, JSON.stringify(detailedReport, null, 2));
      console.log(`📄 Detailed stress report saved to: ${reportPath}`);
    } catch (error) {
      console.error('❌ Failed to save stress report:', error);
    }
  }
}

// Export for use in other modules
module.exports = StressEnduranceTestingSystem;

// CLI execution
if (require.main === module) {
  const stressTester = new StressEnduranceTestingSystem({
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3001',
    maxStressUsers: parseInt(process.env.MAX_STRESS_USERS) || 500,
    spikeUsers: parseInt(process.env.SPIKE_USERS) || 1000,
    enduranceTestDuration: parseInt(process.env.ENDURANCE_DURATION) || 3600000
  });
  
  stressTester.runStressEnduranceTests()
    .then((results) => {
      // Exit with appropriate code
      if (results.overallStressScore >= 80) {
        console.log('\n✅ Stress and endurance testing completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Stress and endurance testing failed to meet standards');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Stress and endurance testing failed:', error);
      process.exit(1);
    });
}