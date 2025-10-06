/**
 * Performance Monitoring Script
 * 
 * This script monitors system performance metrics and provides
 * optimization recommendations.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      cpu: [],
      memory: [],
      responseTime: [],
      throughput: [],
      errorRate: [],
      database: []
    };
    this.startTime = Date.now();
    this.isMonitoring = false;
  }

  /**
   * Start performance monitoring
   */
  async startMonitoring() {
    console.log('📊 Starting performance monitoring...');
    this.isMonitoring = true;
    
    // Start monitoring processes
    this.startSystemMonitoring();
    this.startApplicationMonitoring();
    this.startDatabaseMonitoring();
    
    console.log('✅ Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  async stopMonitoring() {
    console.log('🛑 Stopping performance monitoring...');
    this.isMonitoring = false;
    
    // Generate performance report
    await this.generatePerformanceReport();
    
    console.log('✅ Performance monitoring stopped');
  }

  /**
   * Start system monitoring
   */
  startSystemMonitoring() {
    // Monitor CPU usage
    setInterval(() => {
      if (!this.isMonitoring) return;
      
      const cpuUsage = this.getCPUUsage();
      this.metrics.cpu.push({
        timestamp: Date.now(),
        usage: cpuUsage
      });
    }, 1000);

    // Monitor memory usage
    setInterval(() => {
      if (!this.isMonitoring) return;
      
      const memoryUsage = this.getMemoryUsage();
      this.metrics.memory.push({
        timestamp: Date.now(),
        usage: memoryUsage
      });
    }, 1000);
  }

  /**
   * Start application monitoring
   */
  startApplicationMonitoring() {
    // Monitor API response times
    setInterval(async () => {
      if (!this.isMonitoring) return;
      
      try {
        const startTime = Date.now();
        const response = await fetch('http://localhost:3001/health');
        const responseTime = Date.now() - startTime;
        
        this.metrics.responseTime.push({
          timestamp: Date.now(),
          responseTime: responseTime,
          status: response.status
        });
      } catch (error) {
        this.metrics.errorRate.push({
          timestamp: Date.now(),
          error: error.message
        });
      }
    }, 2000);
  }

  /**
   * Start database monitoring
   */
  startDatabaseMonitoring() {
    // Monitor database performance
    setInterval(async () => {
      if (!this.isMonitoring) return;
      
      try {
        const dbMetrics = await this.getDatabaseMetrics();
        this.metrics.database.push({
          timestamp: Date.now(),
          ...dbMetrics
        });
      } catch (error) {
        console.error('Database monitoring error:', error.message);
      }
    }, 5000);
  }

  /**
   * Get CPU usage
   */
  getCPUUsage() {
    try {
      const cpus = require('os').cpus();
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (let type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });
      
      return 100 - ~~(100 * totalIdle / totalTick);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    try {
      const memUsage = process.memoryUsage();
      const totalMem = require('os').totalmem();
      
      return {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        total: totalMem,
        percentage: (memUsage.rss / totalMem) * 100
      };
    } catch (error) {
      return { percentage: 0 };
    }
  }

  /**
   * Get database metrics
   */
  async getDatabaseMetrics() {
    try {
      // This would connect to your database and get metrics
      // For now, return mock data
      return {
        connections: Math.floor(Math.random() * 10) + 1,
        activeQueries: Math.floor(Math.random() * 5),
        cacheHitRatio: Math.random() * 100,
        avgQueryTime: Math.random() * 100
      };
    } catch (error) {
      return {
        connections: 0,
        activeQueries: 0,
        cacheHitRatio: 0,
        avgQueryTime: 0
      };
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const report = {
      summary: {
        duration: duration,
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date(endTime).toISOString()
      },
      metrics: this.metrics,
      analysis: this.analyzeMetrics(),
      recommendations: this.generateRecommendations()
    };
    
    // Save report
    const reportPath = path.join(__dirname, '../results/performance-monitor-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlReportPath = path.join(__dirname, '../results/performance-monitor-report.html');
    fs.writeFileSync(htmlReportPath, htmlReport);
    
    console.log('📄 Performance report generated');
    console.log(`📊 Report saved to: ${reportPath}`);
    console.log(`🌐 HTML report: ${htmlReportPath}`);
    
    return report;
  }

  /**
   * Analyze performance metrics
   */
  analyzeMetrics() {
    const analysis = {
      cpu: this.analyzeCPUMetrics(),
      memory: this.analyzeMemoryMetrics(),
      responseTime: this.analyzeResponseTimeMetrics(),
      database: this.analyzeDatabaseMetrics()
    };
    
    return analysis;
  }

  /**
   * Analyze CPU metrics
   */
  analyzeCPUMetrics() {
    if (this.metrics.cpu.length === 0) return { status: 'NO_DATA' };
    
    const cpuValues = this.metrics.cpu.map(m => m.usage);
    const avgCPU = cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length;
    const maxCPU = Math.max(...cpuValues);
    
    return {
      average: avgCPU,
      maximum: maxCPU,
      status: avgCPU > 80 ? 'HIGH' : avgCPU > 60 ? 'MEDIUM' : 'LOW',
      recommendation: avgCPU > 80 ? 'Consider CPU optimization' : 'CPU usage is acceptable'
    };
  }

  /**
   * Analyze memory metrics
   */
  analyzeMemoryMetrics() {
    if (this.metrics.memory.length === 0) return { status: 'NO_DATA' };
    
    const memoryValues = this.metrics.memory.map(m => m.usage.percentage);
    const avgMemory = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;
    const maxMemory = Math.max(...memoryValues);
    
    return {
      average: avgMemory,
      maximum: maxMemory,
      status: avgMemory > 80 ? 'HIGH' : avgMemory > 60 ? 'MEDIUM' : 'LOW',
      recommendation: avgMemory > 80 ? 'Consider memory optimization' : 'Memory usage is acceptable'
    };
  }

  /**
   * Analyze response time metrics
   */
  analyzeResponseTimeMetrics() {
    if (this.metrics.responseTime.length === 0) return { status: 'NO_DATA' };
    
    const responseTimes = this.metrics.responseTime.map(m => m.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const p95ResponseTime = this.calculatePercentile(responseTimes, 95);
    
    return {
      average: avgResponseTime,
      maximum: maxResponseTime,
      p95: p95ResponseTime,
      status: avgResponseTime > 1000 ? 'HIGH' : avgResponseTime > 500 ? 'MEDIUM' : 'LOW',
      recommendation: avgResponseTime > 1000 ? 'Consider response time optimization' : 'Response times are acceptable'
    };
  }

  /**
   * Analyze database metrics
   */
  analyzeDatabaseMetrics() {
    if (this.metrics.database.length === 0) return { status: 'NO_DATA' };
    
    const avgQueryTime = this.metrics.database.reduce((sum, m) => sum + m.avgQueryTime, 0) / this.metrics.database.length;
    const avgConnections = this.metrics.database.reduce((sum, m) => sum + m.connections, 0) / this.metrics.database.length;
    
    return {
      averageQueryTime: avgQueryTime,
      averageConnections: avgConnections,
      status: avgQueryTime > 100 ? 'HIGH' : avgQueryTime > 50 ? 'MEDIUM' : 'LOW',
      recommendation: avgQueryTime > 100 ? 'Consider database optimization' : 'Database performance is acceptable'
    };
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(values, percentile) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // CPU recommendations
    const cpuAnalysis = this.analyzeCPUMetrics();
    if (cpuAnalysis.status === 'HIGH') {
      recommendations.push({
        priority: 'HIGH',
        category: 'CPU',
        issue: 'High CPU usage detected',
        recommendation: 'Optimize CPU-intensive operations, consider caching, or scale horizontally',
        impact: 'Performance degradation, potential system instability'
      });
    }
    
    // Memory recommendations
    const memoryAnalysis = this.analyzeMemoryMetrics();
    if (memoryAnalysis.status === 'HIGH') {
      recommendations.push({
        priority: 'HIGH',
        category: 'Memory',
        issue: 'High memory usage detected',
        recommendation: 'Optimize memory usage, implement garbage collection tuning, or increase memory',
        impact: 'Potential memory leaks, system slowdown'
      });
    }
    
    // Response time recommendations
    const responseTimeAnalysis = this.analyzeResponseTimeMetrics();
    if (responseTimeAnalysis.status === 'HIGH') {
      recommendations.push({
        priority: 'HIGH',
        category: 'Response Time',
        issue: 'High response times detected',
        recommendation: 'Optimize API endpoints, implement caching, or optimize database queries',
        impact: 'Poor user experience, potential timeouts'
      });
    }
    
    // Database recommendations
    const databaseAnalysis = this.analyzeDatabaseMetrics();
    if (databaseAnalysis.status === 'HIGH') {
      recommendations.push({
        priority: 'HIGH',
        category: 'Database',
        issue: 'High database query times detected',
        recommendation: 'Optimize database queries, add indexes, or implement connection pooling',
        impact: 'Slow data retrieval, potential timeouts'
      });
    }
    
    return recommendations;
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Monitor Report - Secure Gate Access Control System</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .metric { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .high { border-left: 5px solid #dc3545; background: #f8d7da; }
        .medium { border-left: 5px solid #ffc107; background: #fff3cd; }
        .low { border-left: 5px solid #28a745; background: #d4edda; }
        .recommendation { margin: 10px 0; padding: 10px; background: #e9ecef; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Monitor Report</h1>
        <p>Secure Gate Access Control System</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="metric">
        <h3>CPU Usage</h3>
        <p>Average: ${report.analysis.cpu.average?.toFixed(2) || 'N/A'}%</p>
        <p>Maximum: ${report.analysis.cpu.maximum?.toFixed(2) || 'N/A'}%</p>
        <p>Status: <span class="${report.analysis.cpu.status?.toLowerCase() || 'no-data'}">${report.analysis.cpu.status || 'NO_DATA'}</span></p>
    </div>
    
    <div class="metric">
        <h3>Memory Usage</h3>
        <p>Average: ${report.analysis.memory.average?.toFixed(2) || 'N/A'}%</p>
        <p>Maximum: ${report.analysis.memory.maximum?.toFixed(2) || 'N/A'}%</p>
        <p>Status: <span class="${report.analysis.memory.status?.toLowerCase() || 'no-data'}">${report.analysis.memory.status || 'NO_DATA'}</span></p>
    </div>
    
    <div class="metric">
        <h3>Response Time</h3>
        <p>Average: ${report.analysis.responseTime.average?.toFixed(2) || 'N/A'}ms</p>
        <p>P95: ${report.analysis.responseTime.p95?.toFixed(2) || 'N/A'}ms</p>
        <p>Status: <span class="${report.analysis.responseTime.status?.toLowerCase() || 'no-data'}">${report.analysis.responseTime.status || 'NO_DATA'}</span></p>
    </div>
    
    <div class="metric">
        <h3>Database Performance</h3>
        <p>Average Query Time: ${report.analysis.database.averageQueryTime?.toFixed(2) || 'N/A'}ms</p>
        <p>Average Connections: ${report.analysis.database.averageConnections?.toFixed(2) || 'N/A'}</p>
        <p>Status: <span class="${report.analysis.database.status?.toLowerCase() || 'no-data'}">${report.analysis.database.status || 'NO_DATA'}</span></p>
    </div>
    
    <div class="metric">
        <h3>Recommendations</h3>
        ${report.recommendations.map(rec => `
            <div class="recommendation">
                <strong>${rec.priority} - ${rec.category}:</strong> ${rec.issue}<br>
                <strong>Recommendation:</strong> ${rec.recommendation}<br>
                <strong>Impact:</strong> ${rec.impact}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }
}

export default PerformanceMonitor;
