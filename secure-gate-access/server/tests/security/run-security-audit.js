#!/usr/bin/env node

/**
 * Security Audit Runner
 * 
 * This script executes comprehensive security auditing including
 * OWASP Top 10 testing, vulnerability testing, and security validation.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SecurityAuditRunner {
  constructor() {
    this.services = {
      backend: null,
      frontend: null
    };
    this.auditResults = {
      securityAudit: null,
      vulnerabilityTests: null,
      npmAudit: null,
      overallScore: 0
    };
  }

  /**
   * Start required services
   */
  async startServices() {
    console.log('🚀 Starting required services...');
    
    try {
      // Start backend server
      console.log('📡 Starting backend server...');
      this.services.backend = spawn('npm', ['run', 'dev'], {
        cwd: process.cwd(),
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test', PORT: '3001' }
      });
      
      // Start frontend server
      console.log('🌐 Starting frontend server...');
      this.services.frontend = spawn('npm', ['start'], {
        cwd: path.join(process.cwd(), '../client'),
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test', PORT: '3000' }
      });
      
      // Wait for services to be ready
      await this.waitForServices();
      
      console.log('✅ All services started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start services:', error.message);
      throw error;
    }
  }

  /**
   * Wait for services to be ready
   */
  async waitForServices() {
    const maxAttempts = 30;
    const delay = 2000;
    
    console.log('⏳ Waiting for services to be ready...');
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Check backend health
        const backendResponse = await fetch('http://localhost:3001/health');
        if (backendResponse.ok) {
          console.log('✅ Backend is ready');
          
          // Check frontend
          const frontendResponse = await fetch('http://localhost:3000');
          if (frontendResponse.ok) {
            console.log('✅ Frontend is ready');
            return;
          }
        }
      } catch (error) {
        // Services not ready yet
      }
      
      console.log(`⏳ Waiting for services... attempt ${i + 1}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error('Services did not become ready within timeout');
  }

  /**
   * Stop services
   */
  async stopServices() {
    console.log('🛑 Stopping services...');
    
    if (this.services.backend) {
      this.services.backend.kill();
      console.log('✅ Backend server stopped');
    }
    
    if (this.services.frontend) {
      this.services.frontend.kill();
      console.log('✅ Frontend server stopped');
    }
  }

  /**
   * Run security audit
   */
  async runSecurityAudit() {
    console.log('\n🔒 Running Security Audit...');
    
    try {
      const auditor = new SecurityAuditor();
      const result = await auditor.runSecurityAudit();
      this.auditResults.securityAudit = result;
      console.log('✅ Security audit completed');
      return result;
    } catch (error) {
      console.error('❌ Security audit failed:', error.message);
      throw error;
    }
  }

  /**
   * Run vulnerability tests
   */
  async runVulnerabilityTests() {
    console.log('\n💉 Running Vulnerability Tests...');
    
    try {
      const tester = new VulnerabilityTester();
      const result = await tester.runVulnerabilityTests();
      this.auditResults.vulnerabilityTests = result;
      console.log('✅ Vulnerability tests completed');
      return result;
    } catch (error) {
      console.error('❌ Vulnerability tests failed:', error.message);
      throw error;
    }
  }

  /**
   * Run npm audit
   */
  async runNpmAudit() {
    console.log('\n📦 Running NPM Audit...');
    
    try {
      const result = await this.runNpmAuditCommand();
      this.auditResults.npmAudit = result;
      console.log('✅ NPM audit completed');
      return result;
    } catch (error) {
      console.error('❌ NPM audit failed:', error.message);
      throw error;
    }
  }

  /**
   * Run npm audit command
   */
  async runNpmAuditCommand() {
    return new Promise((resolve, reject) => {
      const auditProcess = spawn('npm', ['audit', '--json'], {
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      
      let output = '';
      let errorOutput = '';
      
      auditProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      auditProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      auditProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve({
              vulnerabilities: result.metadata?.vulnerabilities?.total || 0,
              dependencies: result.metadata?.dependencies || 0,
              advisories: result.advisories || {}
            });
          } catch (e) {
            resolve({ vulnerabilities: 0, dependencies: 0, advisories: {} });
          }
        } else {
          reject(new Error(`npm audit failed: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Run all security tests
   */
  async runAllSecurityTests() {
    try {
      console.log('🔒 COMPREHENSIVE SECURITY AUDIT SUITE');
      console.log('=' .repeat(50));
      console.log('📋 OWASP Top 10 + Vulnerability Testing + NPM Audit');
      console.log('⏱️  Estimated Duration: 25-30 minutes');
      console.log('');

      // Start services
      await this.startServices();
      
      // Run security audit
      await this.runSecurityAudit();
      
      // Run vulnerability tests
      await this.runVulnerabilityTests();
      
      // Run npm audit
      await this.runNpmAudit();
      
      // Calculate overall security score
      this.calculateOverallScore();
      
      // Generate comprehensive report
      await this.generateComprehensiveReport();
      
      // Display summary
      this.displaySummary();
      
      return this.auditResults;
      
    } catch (error) {
      console.error('❌ Security testing failed:', error.message);
      throw error;
    } finally {
      // Always stop services
      await this.stopServices();
    }
  }

  /**
   * Calculate overall security score
   */
  calculateOverallScore() {
    let totalScore = 0;
    let totalWeight = 0;
    
    // Security audit score (weight: 40%)
    if (this.auditResults.securityAudit) {
      const securityScore = this.auditResults.securityAudit.summary?.securityScore || 0;
      totalScore += securityScore * 0.4;
      totalWeight += 0.4;
    }
    
    // Vulnerability test score (weight: 40%)
    if (this.auditResults.vulnerabilityTests) {
      const vulnCount = this.auditResults.vulnerabilityTests.vulnerabilities?.length || 0;
      const vulnScore = Math.max(0, 100 - (vulnCount * 10)); // Deduct 10 points per vulnerability
      totalScore += vulnScore * 0.4;
      totalWeight += 0.4;
    }
    
    // NPM audit score (weight: 20%)
    if (this.auditResults.npmAudit) {
      const npmVulns = this.auditResults.npmAudit.vulnerabilities || 0;
      const npmScore = Math.max(0, 100 - (npmVulns * 5)); // Deduct 5 points per npm vulnerability
      totalScore += npmScore * 0.2;
      totalWeight += 0.2;
    }
    
    this.auditResults.overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Generate comprehensive security report
   */
  async generateComprehensiveReport() {
    console.log('\n📄 Generating comprehensive security report...');
    
    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        overallScore: this.auditResults.overallScore,
        securityAudit: this.auditResults.securityAudit?.summary || {},
        vulnerabilityTests: this.auditResults.vulnerabilityTests?.summary || {},
        npmAudit: this.auditResults.npmAudit || {}
      },
      results: this.auditResults,
      recommendations: this.generateRecommendations()
    };
    
    // Save report
    const reportPath = path.join(__dirname, '../results/comprehensive-security-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlReportPath = path.join(__dirname, '../results/comprehensive-security-report.html');
    fs.writeFileSync(htmlReportPath, htmlReport);
    
    console.log('✅ Comprehensive security report generated');
    console.log(`📊 Report saved to: ${reportPath}`);
    console.log(`🌐 HTML report: ${htmlReportPath}`);
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Overall security score recommendations
    if (this.auditResults.overallScore < 60) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Overall Security',
        issue: 'Low overall security score',
        recommendation: 'Implement comprehensive security improvements immediately',
        impact: 'System is highly vulnerable to security attacks'
      });
    } else if (this.auditResults.overallScore < 80) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Overall Security',
        issue: 'Moderate security score',
        recommendation: 'Address security issues before production deployment',
        impact: 'System has significant security risks'
      });
    }
    
    // Security audit recommendations
    if (this.auditResults.securityAudit?.vulnerabilities) {
      const securityVulns = this.auditResults.securityAudit.vulnerabilities;
      if (securityVulns.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Security Audit',
          issue: `${securityVulns.length} security vulnerabilities found`,
          recommendation: 'Address security audit findings',
          impact: 'System has security vulnerabilities'
        });
      }
    }
    
    // Vulnerability test recommendations
    if (this.auditResults.vulnerabilityTests?.vulnerabilities) {
      const vulnTests = this.auditResults.vulnerabilityTests.vulnerabilities;
      if (vulnTests.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Vulnerability Testing',
          issue: `${vulnTests.length} vulnerability test failures`,
          recommendation: 'Fix vulnerability test failures',
          impact: 'System is vulnerable to specific attack vectors'
        });
      }
    }
    
    // NPM audit recommendations
    if (this.auditResults.npmAudit?.vulnerabilities > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Dependencies',
        issue: `${this.auditResults.npmAudit.vulnerabilities} npm vulnerabilities found`,
        recommendation: 'Update vulnerable dependencies',
        impact: 'System has vulnerable dependencies'
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
    <title>Comprehensive Security Report - Secure Gate Access Control System</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .score { font-size: 2em; font-weight: bold; margin: 20px 0; }
        .high { color: #dc3545; }
        .medium { color: #ffc107; }
        .low { color: #28a745; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .recommendation { margin: 10px 0; padding: 10px; background: #e9ecef; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Comprehensive Security Report</h1>
        <p>Secure Gate Access Control System</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="score ${report.summary.overallScore >= 80 ? 'low' : report.summary.overallScore >= 60 ? 'medium' : 'high'}">
        Overall Security Score: ${report.summary.overallScore}%
    </div>
    
    <div class="section">
        <h3>Security Audit Results</h3>
        <p>Score: ${report.summary.securityAudit.securityScore || 'N/A'}%</p>
        <p>Vulnerabilities: ${report.summary.securityAudit.totalVulnerabilities || 0}</p>
        <p>Critical: ${report.summary.securityAudit.criticalVulnerabilities || 0}</p>
        <p>High: ${report.summary.securityAudit.highVulnerabilities || 0}</p>
    </div>
    
    <div class="section">
        <h3>Vulnerability Test Results</h3>
        <p>Total Vulnerabilities: ${report.summary.vulnerabilityTests.totalVulnerabilities || 0}</p>
        <p>Critical: ${report.summary.vulnerabilityTests.criticalVulnerabilities || 0}</p>
        <p>High: ${report.summary.vulnerabilityTests.highVulnerabilities || 0}</p>
        <p>Medium: ${report.summary.vulnerabilityTests.mediumVulnerabilities || 0}</p>
    </div>
    
    <div class="section">
        <h3>NPM Audit Results</h3>
        <p>Vulnerabilities: ${report.summary.npmAudit.vulnerabilities || 0}</p>
        <p>Dependencies: ${report.summary.npmAudit.dependencies || 0}</p>
    </div>
    
    <div class="section">
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

  /**
   * Display test summary
   */
  displaySummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 COMPREHENSIVE SECURITY AUDIT COMPLETE');
    console.log('=' .repeat(60));
    
    console.log(`📊 Overall Security Score: ${this.auditResults.overallScore}%`);
    console.log(`🔒 Security Audit: ${this.auditResults.securityAudit ? 'COMPLETED' : 'FAILED'}`);
    console.log(`💉 Vulnerability Tests: ${this.auditResults.vulnerabilityTests ? 'COMPLETED' : 'FAILED'}`);
    console.log(`📦 NPM Audit: ${this.auditResults.npmAudit ? 'COMPLETED' : 'FAILED'}`);
    console.log('');
    
    console.log('📄 Reports Generated:');
    console.log('  - Comprehensive Security Report: tests/results/comprehensive-security-report.html');
    console.log('  - Security Audit Report: tests/results/security-audit-report.html');
    console.log('  - Vulnerability Test Report: tests/results/vulnerability-test-report.html');
    console.log('  - JSON Reports: tests/results/*.json');
    console.log('');
    
    if (this.auditResults.overallScore >= 80) {
      console.log('✅ SECURITY AUDIT PASSED - System is secure');
    } else if (this.auditResults.overallScore >= 60) {
      console.log('⚠️  SECURITY AUDIT WARNING - Address vulnerabilities before production');
    } else {
      console.log('❌ SECURITY AUDIT FAILED - Critical vulnerabilities must be addressed');
    }
    
    console.log('=' .repeat(60));
  }

  /**
   * Handle process termination
   */
  setupGracefulShutdown() {
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await this.stopServices();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await this.stopServices();
      process.exit(0);
    });
  }
}

// Main execution
async function main() {
  const runner = new SecurityAuditRunner();
  
  // Setup graceful shutdown
  runner.setupGracefulShutdown();
  
  try {
    await runner.runAllSecurityTests();
    process.exit(0);
  } catch (error) {
    console.error('❌ Security testing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = SecurityAuditRunner;
