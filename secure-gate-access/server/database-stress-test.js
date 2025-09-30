#!/usr/bin/env node

/**
 * Database Stress Testing & Connection Pool Analysis
 * Tests database performance under heavy concurrent load
 * Usage: node database-stress-test.js [--connections=50] [--duration=60] [--queries=1000]
 */

import pool from './src/database/db.js';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DatabaseStressTest {
  constructor(options = {}) {
    this.config = {
      maxConnections: options.connections || 50,
      duration: (options.duration || 60) * 1000, // Convert to ms
      targetQueries: options.queries || 1000,
      reportInterval: 5000, // 5 seconds
      ...options
    };
    
    this.stats = {
      queriesExecuted: 0,
      queriesSucceeded: 0,
      queriesFailed: 0,
      connectionErrors: 0,
      responseTimes: [],
      errorsByType: {},
      startTime: null,
      endTime: null
    };
    
    this.workers = [];
    this.reportDir = './reports/stress-testing';
    this.ensureReportDir();
  }

  ensureReportDir() {
    if (!fs.existsSync('./reports')) {
      fs.mkdirSync('./reports', { recursive: true });
    }
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async testConnectionPool() {
    console.log('🔍 Testing database connection pool limits...\n');
    
    const poolConfig = pool.options || {};
    console.log(`   📊 Pool Configuration:`);
    console.log(`      Max Connections: ${poolConfig.max || 'Default (10)'}`);
    console.log(`      Min Connections: ${poolConfig.min || 'Default (0)'}`);
    console.log(`      Idle Timeout: ${poolConfig.idleTimeoutMillis || 'Default (30000)'}ms`);
    console.log(`      Connection Timeout: ${poolConfig.connectionTimeoutMillis || 'Default (2000)'}ms\n`);

    // Test incremental connection load
    const connectionResults = [];
    for (let connections = 5; connections <= Math.min(this.config.maxConnections, 100); connections += 5) {
      console.log(`   Testing ${connections} concurrent connections...`);
      
      const result = await this.testConcurrentConnections(connections);
      connectionResults.push({ connections, ...result });
      
      if (result.errorRate > 0.1) { // 10% error rate threshold
        console.log(`   ⚠️  High error rate (${(result.errorRate * 100).toFixed(1)}%) at ${connections} connections`);
        break;
      }
    }

    return connectionResults;
  }

  async testConcurrentConnections(connectionCount) {
    const promises = [];
    const startTime = Date.now();
    
    for (let i = 0; i < connectionCount; i++) {
      promises.push(this.executeTestQuery(`concurrent-${i}`));
    }
    
    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return {
      succeeded,
      failed,
      errorRate: failed / connectionCount,
      totalTime: endTime - startTime,
      avgTimePerQuery: (endTime - startTime) / connectionCount
    };
  }

  async executeTestQuery(workerId) {
    const testQueries = [
      'SELECT COUNT(*) FROM users',
      'SELECT COUNT(*) FROM visitors WHERE status = $1',
      'SELECT email FROM users WHERE role = $1 LIMIT 5',
      'SELECT name, status FROM visitors ORDER BY check_in_time DESC LIMIT 10'
    ];
    
    const query = testQueries[Math.floor(Math.random() * testQueries.length)];
    const params = query.includes('$1') ? ['ACTIVE'] : [];
    
    try {
      const start = process.hrtime.bigint();
      const result = await pool.query(query, params);
      const end = process.hrtime.bigint();
      
      return {
        workerId,
        success: true,
        responseTime: Number(end - start) / 1000000, // Convert to ms
        rowCount: result.rowCount
      };
    } catch (error) {
      return {
        workerId,
        success: false,
        error: error.message,
        errorCode: error.code
      };
    }
  }

  async runSustainedLoadTest() {
    console.log('🚀 Running sustained database load test...\n');
    console.log(`   Duration: ${this.config.duration / 1000}s`);
    console.log(`   Max Concurrent: ${this.config.maxConnections}`);
    console.log(`   Target Queries: ${this.config.targetQueries}\n`);

    this.stats.startTime = Date.now();
    const endTime = this.stats.startTime + this.config.duration;
    
    // Start progress reporting
    const reportInterval = setInterval(() => {
      this.reportProgress();
    }, this.config.reportInterval);

    // Create worker promises for concurrent execution
    const workerCount = Math.min(this.config.maxConnections, 20); // Limit actual worker threads
    const queriesPerWorker = Math.ceil(this.config.targetQueries / workerCount);
    
    console.log(`   Starting ${workerCount} worker threads (${queriesPerWorker} queries each)...\n`);
    
    const workerPromises = [];
    for (let i = 0; i < workerCount; i++) {
      workerPromises.push(this.createWorker(i, queriesPerWorker, endTime));
    }

    // Wait for all workers to complete
    const workerResults = await Promise.allSettled(workerPromises);
    
    clearInterval(reportInterval);
    this.stats.endTime = Date.now();
    
    // Aggregate worker results
    this.aggregateWorkerResults(workerResults);
    
    console.log('\n✅ Sustained load test completed\n');
    return this.stats;
  }

  async createWorker(workerId, targetQueries, endTime) {
    return new Promise((resolve, reject) => {
      // Since we can't easily use worker threads with ES modules, 
      // simulate with async execution instead
      this.simulateWorker(workerId, targetQueries, endTime)
        .then(resolve)
        .catch(reject);
    });
  }

  async simulateWorker(workerId, targetQueries, endTime) {
    const workerStats = {
      workerId,
      queriesExecuted: 0,
      queriesSucceeded: 0,
      queriesFailed: 0,
      responseTimes: [],
      errors: []
    };

    while (Date.now() < endTime && workerStats.queriesExecuted < targetQueries) {
      const result = await this.executeTestQuery(workerId);
      workerStats.queriesExecuted++;
      
      if (result.success) {
        workerStats.queriesSucceeded++;
        workerStats.responseTimes.push(result.responseTime);
      } else {
        workerStats.queriesFailed++;
        workerStats.errors.push(result.error);
      }
      
      // Small delay to prevent overwhelming
      if (Math.random() < 0.1) { // 10% chance of small delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
      }
    }

    return workerStats;
  }

  aggregateWorkerResults(workerResults) {
    for (const result of workerResults) {
      if (result.status === 'fulfilled' && result.value) {
        const workerStats = result.value;
        this.stats.queriesExecuted += workerStats.queriesExecuted;
        this.stats.queriesSucceeded += workerStats.queriesSucceeded;
        this.stats.queriesFailed += workerStats.queriesFailed;
        this.stats.responseTimes.push(...workerStats.responseTimes);
        
        // Track error types
        for (const error of workerStats.errors) {
          this.stats.errorsByType[error] = (this.stats.errorsByType[error] || 0) + 1;
        }
      }
    }
  }

  reportProgress() {
    const elapsed = Date.now() - this.stats.startTime;
    const qps = this.stats.queriesExecuted / (elapsed / 1000);
    const errorRate = this.stats.queriesFailed / (this.stats.queriesExecuted || 1);
    
    console.log(`   📊 Progress: ${this.stats.queriesExecuted} queries | ${qps.toFixed(1)} QPS | ${(errorRate * 100).toFixed(1)}% errors`);
  }

  async analyzePerformance() {
    console.log('📊 Analyzing database performance under load...\n');
    
    const analysis = {
      totalDuration: this.stats.endTime - this.stats.startTime,
      averageQPS: this.stats.queriesExecuted / ((this.stats.endTime - this.stats.startTime) / 1000),
      successRate: this.stats.queriesSucceeded / (this.stats.queriesExecuted || 1),
      errorRate: this.stats.queriesFailed / (this.stats.queriesExecuted || 1),
      responseTimeStats: this.calculateResponseTimeStats(),
      bottlenecks: [],
      recommendations: []
    };

    // Identify bottlenecks
    if (analysis.errorRate > 0.05) { // 5% threshold
      analysis.bottlenecks.push({
        type: 'High Error Rate',
        severity: 'HIGH',
        value: `${(analysis.errorRate * 100).toFixed(1)}%`,
        description: 'Database queries failing at high rate under load'
      });
    }

    if (analysis.responseTimeStats.p95 > 1000) { // 1 second threshold
      analysis.bottlenecks.push({
        type: 'Slow Query Performance',
        severity: 'MEDIUM',
        value: `${analysis.responseTimeStats.p95.toFixed(0)}ms P95`,
        description: '95th percentile response time exceeds 1 second'
      });
    }

    if (analysis.averageQPS < 10) { // Low throughput threshold
      analysis.bottlenecks.push({
        type: 'Low Throughput',
        severity: 'MEDIUM', 
        value: `${analysis.averageQPS.toFixed(1)} QPS`,
        description: 'Database throughput lower than expected'
      });
    }

    // Generate recommendations
    if (analysis.bottlenecks.length > 0) {
      analysis.recommendations = [
        'Consider increasing database connection pool size',
        'Review and optimize slow database queries',
        'Implement query result caching for frequently accessed data',
        'Monitor database server resources (CPU, Memory, I/O)',
        'Consider database indexing improvements'
      ];
    } else {
      analysis.recommendations = [
        'Database performance is acceptable under current load',
        'Continue monitoring for production workloads',
        'Consider load testing with higher concurrent connections',
        'Implement proactive monitoring and alerting'
      ];
    }

    return analysis;
  }

  calculateResponseTimeStats() {
    if (this.stats.responseTimes.length === 0) {
      return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.stats.responseTimes].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      min: sorted[0],
      max: sorted[len - 1],
      avg: sorted.reduce((a, b) => a + b) / len,
      p50: sorted[Math.floor(len * 0.5)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)]
    };
  }

  async generateReport(connectionResults, performanceAnalysis) {
    console.log('📄 Generating database stress test report...\n');
    
    const report = {
      timestamp: new Date().toISOString(),
      configuration: this.config,
      statistics: this.stats,
      connectionPoolTest: connectionResults,
      performanceAnalysis,
      summary: {
        passedTests: [],
        failedTests: [],
        warnings: []
      }
    };

    // Determine test outcomes
    if (performanceAnalysis.errorRate < 0.01) {
      report.summary.passedTests.push('Low error rate (<1%)');
    } else {
      report.summary.failedTests.push(`High error rate: ${(performanceAnalysis.errorRate * 100).toFixed(1)}%`);
    }

    if (performanceAnalysis.averageQPS > 20) {
      report.summary.passedTests.push('Good throughput (>20 QPS)');
    } else {
      report.summary.warnings.push(`Low throughput: ${performanceAnalysis.averageQPS.toFixed(1)} QPS`);
    }

    if (performanceAnalysis.responseTimeStats.p95 < 500) {
      report.summary.passedTests.push('Good response times (P95 <500ms)');
    } else {
      report.summary.warnings.push(`Slow P95 response time: ${performanceAnalysis.responseTimeStats.p95.toFixed(0)}ms`);
    }

    // Save report
    const reportPath = `${this.reportDir}/database-stress-test-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate markdown summary
    const markdownPath = `${this.reportDir}/database-stress-test-${Date.now()}.md`;
    fs.writeFileSync(markdownPath, this.generateMarkdownReport(report));
    
    console.log(`✅ Reports saved:`);
    console.log(`   📄 JSON: ${reportPath}`);
    console.log(`   📝 Markdown: ${markdownPath}\n`);
    
    return report;
  }

  generateMarkdownReport(report) {
    return `# Database Stress Test Report

**Generated:** ${report.timestamp}

## Test Configuration
- **Max Connections:** ${report.configuration.maxConnections}
- **Duration:** ${report.configuration.duration / 1000}s
- **Target Queries:** ${report.configuration.targetQueries}

## Test Results Summary

### Overall Performance
- **Total Queries:** ${report.statistics.queriesExecuted}
- **Success Rate:** ${(report.performanceAnalysis.successRate * 100).toFixed(1)}%
- **Average QPS:** ${report.performanceAnalysis.averageQPS.toFixed(1)}
- **Total Duration:** ${(report.performanceAnalysis.totalDuration / 1000).toFixed(1)}s

### Response Time Statistics
- **Average:** ${report.performanceAnalysis.responseTimeStats.avg.toFixed(2)}ms
- **P50:** ${report.performanceAnalysis.responseTimeStats.p50.toFixed(2)}ms
- **P95:** ${report.performanceAnalysis.responseTimeStats.p95.toFixed(2)}ms
- **P99:** ${report.performanceAnalysis.responseTimeStats.p99.toFixed(2)}ms

## Connection Pool Analysis
${report.connectionPoolTest.map((test, i) => `
### ${test.connections} Concurrent Connections
- Success Rate: ${((1 - test.errorRate) * 100).toFixed(1)}%
- Average Time: ${test.avgTimePerQuery.toFixed(2)}ms
- Total Time: ${test.totalTime}ms
`).join('')}

## Bottlenecks Identified
${report.performanceAnalysis.bottlenecks.length === 0 ? 
  '✅ **No significant bottlenecks detected**' : 
  report.performanceAnalysis.bottlenecks.map((bottleneck, i) => `
${i + 1}. **[${bottleneck.severity}] ${bottleneck.type}**
   - Value: ${bottleneck.value}
   - ${bottleneck.description}
`).join('')}

## Recommendations
${report.performanceAnalysis.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

## Test Status
${report.summary.passedTests.length > 0 ? `
### ✅ Passed Tests
${report.summary.passedTests.map(test => `- ${test}`).join('\n')}
` : ''}

${report.summary.failedTests.length > 0 ? `
### ❌ Failed Tests  
${report.summary.failedTests.map(test => `- ${test}`).join('\n')}
` : ''}

${report.summary.warnings.length > 0 ? `
### ⚠️ Warnings
${report.summary.warnings.map(warning => `- ${warning}`).join('\n')}
` : ''}

---
*Generated by Database Stress Testing Suite*
`;
  }

  async run() {
    console.log('🗄️  Database Stress Testing & Connection Pool Analysis\n');
    console.log('='.repeat(60) + '\n');
    
    try {
      // Test connection pool limits
      const connectionResults = await this.testConnectionPool();
      
      // Run sustained load test
      await this.runSustainedLoadTest();
      
      // Analyze performance
      const performanceAnalysis = await this.analyzePerformance();
      
      // Generate report
      const report = await this.generateReport(connectionResults, performanceAnalysis);
      
      console.log('🎉 Database stress testing completed successfully!');
      
      // Print summary
      console.log('\n📊 Quick Summary:');
      console.log(`   Success Rate: ${(performanceAnalysis.successRate * 100).toFixed(1)}%`);
      console.log(`   Average QPS: ${performanceAnalysis.averageQPS.toFixed(1)}`);
      console.log(`   P95 Response Time: ${performanceAnalysis.responseTimeStats.p95.toFixed(0)}ms`);
      console.log(`   Bottlenecks Found: ${performanceAnalysis.bottlenecks.length}`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Database stress testing failed:', error.message);
      throw error;
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const connections = parseInt(args.find(arg => arg.startsWith('--connections='))?.split('=')[1]) || 50;
  const duration = parseInt(args.find(arg => arg.startsWith('--duration='))?.split('=')[1]) || 60;
  const queries = parseInt(args.find(arg => arg.startsWith('--queries='))?.split('=')[1]) || 1000;
  
  const stressTest = new DatabaseStressTest({
    connections,
    duration,
    queries
  });
  
  await stressTest.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default DatabaseStressTest;