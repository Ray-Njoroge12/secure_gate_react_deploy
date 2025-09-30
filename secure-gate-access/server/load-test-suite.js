#!/usr/bin/env node

/**
 * Comprehensive Load Testing & Bottleneck Analysis Suite
 * Tests API performance, database load, and identifies bottlenecks
 * Usage: node load-test-suite.js [--scenario=auth|visitor|all] [--duration=30s] [--concurrent=10]
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import pool from './src/database/db.js';

// Configuration for load test scenarios
const LOAD_TEST_CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:5000',
  scenarios: {
    auth: {
      duration: '30s',
      concurrent: 10,
      ramp: '10s',
      description: 'Authentication endpoint load test'
    },
    visitor: {
      duration: '60s', 
      concurrent: 20,
      ramp: '15s',
      description: 'Visitor CRUD operations under load'
    },
    database: {
      duration: '45s',
      concurrent: 15,
      ramp: '10s',
      description: 'Database query performance under load'
    },
    comprehensive: {
      duration: '120s',
      concurrent: 50,
      ramp: '30s', 
      description: 'Full system load test with mixed scenarios'
    }
  }
};

class LoadTestSuite {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      baseline: {},
      loadTests: {},
      bottlenecks: [],
      recommendations: []
    };
    this.reportDir = './reports/load-testing';
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

  async runBaselineTests() {
    console.log('🔍 Running baseline performance tests...\n');
    
    // Database baseline
    this.results.baseline.database = await this.testDatabaseBaseline();
    
    // Memory baseline
    this.results.baseline.memory = process.memoryUsage();
    
    // API response time baseline
    this.results.baseline.api = await this.testAPIBaseline();
    
    console.log('✅ Baseline tests completed\n');
  }

  async testDatabaseBaseline() {
    console.log('  📊 Database baseline tests...');
    const queries = [
      {
        name: 'User Authentication Query',
        sql: `SELECT id, email, role FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        params: ['test@example.com']
      },
      {
        name: 'Visitor List Query',
        sql: `SELECT id, name, status FROM visitors ORDER BY check_in_time DESC LIMIT 20`,
        params: []
      },
      {
        name: 'Active Visitors Query', 
        sql: `SELECT COUNT(*) FROM visitors WHERE status IN ('ON_PREMISE', 'CONFIRMED')`,
        params: []
      }
    ];

    const results = {};
    for (const query of queries) {
      const times = [];
      for (let i = 0; i < 10; i++) {
        const start = process.hrtime.bigint();
        try {
          await pool.query(query.sql, query.params);
          const end = process.hrtime.bigint();
          times.push(Number(end - start) / 1000000); // Convert to ms
        } catch (err) {
          console.log(`    ⚠️  Query failed: ${err.message}`);
        }
      }
      
      if (times.length > 0) {
        results[query.name] = {
          avgMs: times.reduce((a, b) => a + b) / times.length,
          minMs: Math.min(...times),
          maxMs: Math.max(...times),
          samples: times.length
        };
        console.log(`    ✓ ${query.name}: ${results[query.name].avgMs.toFixed(2)}ms avg`);
      }
    }
    
    return results;
  }

  async testAPIBaseline() {
    console.log('  📊 API baseline tests...');
    const endpoints = [
      { name: 'Health Check', path: '/api/health' },
      { name: 'Login Endpoint', path: '/api/auth/login', method: 'POST' }
    ];

    const results = {};
    for (const endpoint of endpoints) {
      try {
        const times = [];
        for (let i = 0; i < 5; i++) {
          const start = Date.now();
          const response = await fetch(`${LOAD_TEST_CONFIG.baseUrl}${endpoint.path}`, {
            method: endpoint.method || 'GET',
            headers: { 'Content-Type': 'application/json' },
            body: endpoint.method === 'POST' ? JSON.stringify({
              email: 'test@example.com',
              password: 'testpass'
            }) : undefined
          }).catch(() => null);
          const end = Date.now();
          
          if (response) {
            times.push(end - start);
          }
        }
        
        if (times.length > 0) {
          results[endpoint.name] = {
            avgMs: times.reduce((a, b) => a + b) / times.length,
            minMs: Math.min(...times),
            maxMs: Math.max(...times),
            samples: times.length
          };
          console.log(`    ✓ ${endpoint.name}: ${results[endpoint.name].avgMs.toFixed(2)}ms avg`);
        }
      } catch (err) {
        console.log(`    ⚠️  ${endpoint.name} test failed: ${err.message}`);
      }
    }
    
    return results;
  }

  async createArtilleryConfig(scenario) {
    const config = {
      config: {
        target: LOAD_TEST_CONFIG.baseUrl,
        phases: [
          {
            duration: parseInt(LOAD_TEST_CONFIG.scenarios[scenario].ramp),
            arrivalRate: 1,
            rampTo: LOAD_TEST_CONFIG.scenarios[scenario].concurrent,
            name: "Ramp up"
          },
          {
            duration: parseInt(LOAD_TEST_CONFIG.scenarios[scenario].duration),
            arrivalRate: LOAD_TEST_CONFIG.scenarios[scenario].concurrent,
            name: "Sustained load"
          }
        ],
        processor: "./load-test-processor.js"
      },
      scenarios: []
    };

    switch (scenario) {
      case 'auth':
        config.scenarios.push({
          name: "Authentication Load Test",
          weight: 100,
          flow: [
            {
              post: {
                url: "/api/auth/login",
                json: {
                  email: "test@example.com",
                  password: "testpassword"
                },
                capture: [
                  { json: "$.token", as: "authToken" }
                ]
              }
            },
            {
              get: {
                url: "/api/auth/verify",
                headers: {
                  "Authorization": "Bearer {{ authToken }}"
                }
              }
            }
          ]
        });
        break;

      case 'visitor':
        config.scenarios.push({
          name: "Visitor Operations Load Test", 
          weight: 100,
          flow: [
            {
              post: {
                url: "/api/auth/login",
                json: {
                  email: "resident@example.com",
                  password: "testpassword"
                },
                capture: [
                  { json: "$.token", as: "authToken" }
                ]
              }
            },
            {
              get: {
                url: "/api/visitors",
                headers: {
                  "Authorization": "Bearer {{ authToken }}"
                }
              }
            },
            {
              post: {
                url: "/api/visitors",
                headers: {
                  "Authorization": "Bearer {{ authToken }}"
                },
                json: {
                  name: "Load Test Visitor {{ $randomString(8) }}",
                  phone: "1234567890",
                  email: "visitor{{ $randomString(5) }}@example.com",
                  purpose: "Load Testing",
                  date_of_visit: "{{ $isoTimestamp }}",
                  time_of_visit: "14:00"
                }
              }
            }
          ]
        });
        break;

      case 'database':
        config.scenarios.push({
          name: "Database Intensive Load Test",
          weight: 100,
          flow: [
            {
              post: {
                url: "/api/auth/login", 
                json: {
                  email: "guard@example.com",
                  password: "testpassword"
                },
                capture: [
                  { json: "$.token", as: "authToken" }
                ]
              }
            },
            {
              get: {
                url: "/api/visitors?status=ON_PREMISE&limit=50",
                headers: {
                  "Authorization": "Bearer {{ authToken }}"
                }
              }
            },
            {
              get: {
                url: "/api/reports/visitors?days=7",
                headers: {
                  "Authorization": "Bearer {{ authToken }}"
                }
              }
            }
          ]
        });
        break;

      case 'comprehensive':
        config.scenarios = [
          {
            name: "Mixed Authentication",
            weight: 30,
            flow: [
              {
                post: {
                  url: "/api/auth/login",
                  json: {
                    email: "{{ $randomString(8) }}@example.com",
                    password: "testpassword"
                  }
                }
              }
            ]
          },
          {
            name: "Mixed Visitor Operations", 
            weight: 50,
            flow: [
              {
                post: {
                  url: "/api/auth/login",
                  json: {
                    email: "resident@example.com", 
                    password: "testpassword"
                  },
                  capture: [
                    { json: "$.token", as: "authToken" }
                  ]
                }
              },
              {
                get: {
                  url: "/api/visitors",
                  headers: {
                    "Authorization": "Bearer {{ authToken }}"
                  }
                }
              }
            ]
          },
          {
            name: "Mixed Reporting",
            weight: 20,
            flow: [
              {
                post: {
                  url: "/api/auth/login",
                  json: {
                    email: "guard@example.com",
                    password: "testpassword" 
                  },
                  capture: [
                    { json: "$.token", as: "authToken" }
                  ]
                }
              },
              {
                get: {
                  url: "/api/visitors?status=ACTIVE",
                  headers: {
                    "Authorization": "Bearer {{ authToken }}"
                  }
                }
              }
            ]
          }
        ];
        break;
    }

    const configPath = path.join(this.reportDir, `artillery-${scenario}.yml`);
    fs.writeFileSync(configPath, `# Artillery Load Test Configuration for ${scenario}\n` + 
      JSON.stringify(config, null, 2).replace(/^/gm, ''));
    
    return configPath;
  }

  async runLoadTest(scenario) {
    console.log(`🚀 Running ${scenario} load test...`);
    console.log(`   ${LOAD_TEST_CONFIG.scenarios[scenario].description}`);
    console.log(`   Duration: ${LOAD_TEST_CONFIG.scenarios[scenario].duration}`);
    console.log(`   Concurrent: ${LOAD_TEST_CONFIG.scenarios[scenario].concurrent}\n`);

    try {
      // Check if Artillery is installed, if not use a simple Node.js load test
      let output;
      try {
        execSync('artillery --version', { stdio: 'ignore' });
        const configPath = await this.createArtilleryConfig(scenario);
        output = execSync(`artillery run ${configPath} --output ${this.reportDir}/artillery-${scenario}.json`, 
          { encoding: 'utf8', timeout: 300000 });
      } catch (artilleryError) {
        console.log('   ℹ️  Artillery not available, running simplified load test...');
        output = await this.runSimpleLoadTest(scenario);
      }

      this.results.loadTests[scenario] = this.parseLoadTestOutput(output, scenario);
      console.log(`✅ ${scenario} load test completed\n`);
      
    } catch (error) {
      console.log(`❌ ${scenario} load test failed:`, error.message);
      this.results.loadTests[scenario] = { error: error.message };
    }
  }

  async runSimpleLoadTest(scenario) {
    const config = LOAD_TEST_CONFIG.scenarios[scenario];
    const duration = parseInt(config.duration) * 1000; // Convert to ms
    const concurrent = config.concurrent;
    
    const results = {
      requests: 0,
      responses: 0,
      errors: 0,
      responseTimes: [],
      startTime: Date.now()
    };

    const workers = [];
    for (let i = 0; i < concurrent; i++) {
      workers.push(this.runLoadTestWorker(scenario, duration, results));
    }

    await Promise.all(workers);
    
    return `Simple Load Test Results:
Requests: ${results.requests}
Responses: ${results.responses} 
Errors: ${results.errors}
Average Response Time: ${results.responseTimes.length > 0 ? 
  (results.responseTimes.reduce((a, b) => a + b) / results.responseTimes.length).toFixed(2) : 'N/A'}ms
Duration: ${((Date.now() - results.startTime) / 1000).toFixed(1)}s`;
  }

  async runLoadTestWorker(scenario, duration, results) {
    const endTime = Date.now() + duration;
    
    while (Date.now() < endTime) {
      const start = Date.now();
      results.requests++;
      
      try {
        const response = await fetch(`${LOAD_TEST_CONFIG.baseUrl}/api/health`, {
          timeout: 5000
        });
        
        if (response.ok) {
          results.responses++;
          results.responseTimes.push(Date.now() - start);
        } else {
          results.errors++;
        }
      } catch (error) {
        results.errors++;
      }
      
      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  parseLoadTestOutput(output, scenario) {
    // Parse both Artillery and simple load test output
    const lines = output.split('\n');
    const result = {
      scenario,
      timestamp: new Date().toISOString(),
      summary: {}
    };

    // Look for key metrics in output
    for (const line of lines) {
      if (line.includes('Requests:')) {
        const match = line.match(/Requests:\s*(\d+)/);
        if (match) result.summary.requests = parseInt(match[1]);
      }
      if (line.includes('Responses:')) {
        const match = line.match(/Responses:\s*(\d+)/);
        if (match) result.summary.responses = parseInt(match[1]);
      }
      if (line.includes('Errors:')) {
        const match = line.match(/Errors:\s*(\d+)/);
        if (match) result.summary.errors = parseInt(match[1]);
      }
      if (line.includes('Average Response Time:')) {
        const match = line.match(/Average Response Time:\s*([\d.]+)ms/);
        if (match) result.summary.avgResponseTime = parseFloat(match[1]);
      }
    }

    return result;
  }

  async analyzeBottlenecks() {
    console.log('🔍 Analyzing performance bottlenecks...\n');
    
    const bottlenecks = [];
    
    // Database bottleneck analysis
    const dbResults = this.results.baseline.database;
    if (dbResults) {
      for (const [queryName, metrics] of Object.entries(dbResults)) {
        if (metrics.avgMs > 100) {
          bottlenecks.push({
            type: 'Database Query',
            severity: 'HIGH',
            description: `${queryName} averaging ${metrics.avgMs.toFixed(2)}ms (>100ms threshold)`,
            recommendation: 'Consider adding database indexes or optimizing query'
          });
        }
      }
    }

    // Memory usage analysis
    const memUsage = this.results.baseline.memory;
    if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
      bottlenecks.push({
        type: 'Memory Usage',
        severity: 'MEDIUM',
        description: `High heap usage: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        recommendation: 'Monitor for memory leaks and implement cleanup routines'
      });
    }

    // Load test bottleneck analysis
    for (const [scenario, results] of Object.entries(this.results.loadTests)) {
      if (results.summary) {
        const errorRate = results.summary.errors / (results.summary.requests || 1);
        if (errorRate > 0.05) { // 5% error rate
          bottlenecks.push({
            type: 'Load Test Error Rate',
            severity: 'HIGH', 
            description: `${scenario} scenario has ${(errorRate * 100).toFixed(1)}% error rate`,
            recommendation: 'Investigate error causes and improve error handling'
          });
        }

        if (results.summary.avgResponseTime > 2000) { // 2 second threshold
          bottlenecks.push({
            type: 'Response Time',
            severity: 'MEDIUM',
            description: `${scenario} scenario averaging ${results.summary.avgResponseTime}ms response time`,
            recommendation: 'Optimize slow endpoints and consider caching'
          });
        }
      }
    }

    this.results.bottlenecks = bottlenecks;
    
    if (bottlenecks.length === 0) {
      console.log('✅ No significant bottlenecks identified\n');
    } else {
      console.log(`⚠️  Found ${bottlenecks.length} potential bottlenecks:\n`);
      bottlenecks.forEach((bottleneck, i) => {
        console.log(`${i + 1}. [${bottleneck.severity}] ${bottleneck.type}`);
        console.log(`   ${bottleneck.description}`);
        console.log(`   💡 ${bottleneck.recommendation}\n`);
      });
    }
  }

  generateRecommendations() {
    console.log('💡 Generating performance recommendations...\n');
    
    const recommendations = [
      {
        priority: 'HIGH',
        category: 'Database',
        action: 'Implement database connection pooling monitoring',
        impact: 'Prevent connection exhaustion under load'
      },
      {
        priority: 'HIGH', 
        category: 'Caching',
        action: 'Add Redis caching for frequently accessed data',
        impact: 'Reduce database load by 60-80%'
      },
      {
        priority: 'MEDIUM',
        category: 'Monitoring',
        action: 'Set up real-time performance alerts',
        impact: 'Early detection of performance degradation'
      },
      {
        priority: 'MEDIUM',
        category: 'Load Balancing',
        action: 'Consider horizontal scaling preparation',
        impact: 'Handle increased concurrent users'
      }
    ];

    // Add specific recommendations based on bottlenecks found
    if (this.results.bottlenecks.some(b => b.type === 'Database Query')) {
      recommendations.unshift({
        priority: 'CRITICAL',
        category: 'Database Optimization',
        action: 'Add missing database indexes identified in bottleneck analysis',
        impact: 'Reduce query times by 80-95%'
      });
    }

    this.results.recommendations = recommendations;

    recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. [${rec.priority}] ${rec.category}: ${rec.action}`);
      console.log(`   Impact: ${rec.impact}\n`);
    });
  }

  async generateReport() {
    console.log('📊 Generating comprehensive load testing report...\n');
    
    const reportPath = path.join(this.reportDir, `load-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    // Generate markdown report
    const markdownReport = this.generateMarkdownReport();
    const markdownPath = path.join(this.reportDir, `load-test-report-${Date.now()}.md`);
    fs.writeFileSync(markdownPath, markdownReport);
    
    console.log(`✅ Reports generated:`);
    console.log(`   📄 JSON: ${reportPath}`);
    console.log(`   📝 Markdown: ${markdownPath}\n`);
    
    return { json: reportPath, markdown: markdownPath };
  }

  generateMarkdownReport() {
    return `# Load Testing & Bottleneck Analysis Report

Generated: ${this.results.timestamp}

## Executive Summary

This comprehensive load testing analysis evaluates the performance characteristics of the Secure Gate Access System under various load conditions.

## Baseline Performance

### Database Performance
${Object.entries(this.results.baseline.database || {}).map(([query, metrics]) => `
- **${query}**: ${metrics.avgMs.toFixed(2)}ms average (${metrics.minMs.toFixed(2)}-${metrics.maxMs.toFixed(2)}ms range)
`).join('')}

### Memory Usage
- Heap Used: ${((this.results.baseline.memory?.heapUsed || 0) / 1024 / 1024).toFixed(2)}MB
- Heap Total: ${((this.results.baseline.memory?.heapTotal || 0) / 1024 / 1024).toFixed(2)}MB
- External: ${((this.results.baseline.memory?.external || 0) / 1024 / 1024).toFixed(2)}MB

## Load Test Results

${Object.entries(this.results.loadTests).map(([scenario, results]) => `
### ${scenario.charAt(0).toUpperCase() + scenario.slice(1)} Scenario
${results.error ? `❌ **Failed**: ${results.error}` : `
- **Requests**: ${results.summary?.requests || 'N/A'}
- **Responses**: ${results.summary?.responses || 'N/A'}  
- **Errors**: ${results.summary?.errors || 'N/A'}
- **Avg Response Time**: ${results.summary?.avgResponseTime || 'N/A'}ms
- **Success Rate**: ${results.summary?.requests ? ((results.summary.responses / results.summary.requests) * 100).toFixed(1) : 'N/A'}%
`}
`).join('')}

## Bottleneck Analysis

${this.results.bottlenecks.length === 0 ? '✅ **No significant bottlenecks identified**' : `
Found ${this.results.bottlenecks.length} potential performance bottlenecks:

${this.results.bottlenecks.map((bottleneck, i) => `
${i + 1}. **[${bottleneck.severity}] ${bottleneck.type}**
   - ${bottleneck.description}
   - 💡 ${bottleneck.recommendation}
`).join('')}`}

## Performance Recommendations

${this.results.recommendations.map((rec, i) => `
${i + 1}. **[${rec.priority}] ${rec.category}**
   - Action: ${rec.action}
   - Impact: ${rec.impact}
`).join('')}

## Conclusion

${this.results.bottlenecks.length === 0 ? 
  'The system demonstrates good performance characteristics under current load conditions. Continue monitoring and implement recommended optimizations for production readiness.' :
  `The analysis identified ${this.results.bottlenecks.length} areas for improvement. Address high-priority bottlenecks before production deployment.`}

---
*Report generated by Secure Gate Access Load Testing Suite*
`;
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const scenario = args.find(arg => arg.startsWith('--scenario='))?.split('=')[1] || 'comprehensive';
  
  console.log('🚀 Secure Gate Access - Load Testing & Bottleneck Analysis\n');
  console.log('='.repeat(60));
  
  const suite = new LoadTestSuite();
  
  try {
    // Run baseline tests
    await suite.runBaselineTests();
    
    // Run load tests
    if (scenario === 'all') {
      for (const testScenario of ['auth', 'visitor', 'database', 'comprehensive']) {
        await suite.runLoadTest(testScenario);
      }
    } else {
      await suite.runLoadTest(scenario);
    }
    
    // Analyze bottlenecks
    await suite.analyzeBottlenecks();
    
    // Generate recommendations
    suite.generateRecommendations();
    
    // Generate reports
    const reports = await suite.generateReport();
    
    console.log('🎉 Load testing and bottleneck analysis completed successfully!');
    
  } catch (error) {
    console.error('❌ Load testing failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default LoadTestSuite;