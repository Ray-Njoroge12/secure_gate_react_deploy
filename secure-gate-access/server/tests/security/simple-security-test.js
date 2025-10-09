#!/usr/bin/env node

/**
 * Simple Security Test
 * 
 * This script performs basic security testing without requiring
 * the server to be running.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SimpleSecurityTest {
  constructor() {
    this.results = {
      npmAudit: null,
      fileSecurity: [],
      dependencySecurity: [],
      configurationSecurity: [],
      vulnerabilities: []
    };
  }

  /**
   * Run npm audit
   */
  async runNpmAudit() {
    console.log('📦 Running NPM audit...');
    
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
            this.results.npmAudit = result;
            console.log(`✅ NPM audit completed: ${result.metadata?.vulnerabilities?.total || 0} vulnerabilities found`);
            resolve(result);
          } catch (e) {
            console.log('⚠️  NPM audit completed but could not parse results');
            resolve({ vulnerabilities: 0, dependencies: 0 });
          }
        } else {
          console.log(`❌ NPM audit failed: ${errorOutput}`);
          reject(new Error(`npm audit failed: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Check file security
   */
  async checkFileSecurity() {
    console.log('🔒 Checking file security...');
    
    const securityChecks = [
      {
        name: 'Environment file security',
        check: () => {
          const envPath = path.join(process.cwd(), '.env');
          if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const hasSecrets = envContent.includes('SECRET') || envContent.includes('PASSWORD') || envContent.includes('KEY');
            return {
              exists: true,
              hasSecrets: hasSecrets,
              secure: !hasSecrets || envContent.includes('example') || envContent.includes('your_')
            };
          }
          return { exists: false, secure: true };
        }
      },
      {
        name: 'Package.json security',
        check: () => {
          const packagePath = path.join(process.cwd(), 'package.json');
          if (fs.existsSync(packagePath)) {
            const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            const hasSecurityScripts = packageContent.scripts && (
              packageContent.scripts.audit || 
              packageContent.scripts['test:security'] ||
              packageContent.scripts['test:all']
            );
            return {
              exists: true,
              hasSecurityScripts: hasSecurityScripts,
              secure: hasSecurityScripts
            };
          }
          return { exists: false, secure: false };
        }
      },
      {
        name: 'Git ignore security',
        check: () => {
          const gitignorePath = path.join(process.cwd(), '.gitignore');
          if (fs.existsSync(gitignorePath)) {
            const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
            const ignoresSecrets = gitignoreContent.includes('.env') || gitignoreContent.includes('secrets');
            return {
              exists: true,
              ignoresSecrets: ignoresSecrets,
              secure: ignoresSecrets
            };
          }
          return { exists: false, secure: false };
        }
      }
    ];
    
    for (const check of securityChecks) {
      try {
        const result = check.check();
        this.results.fileSecurity.push({
          name: check.name,
          result: result,
          secure: result.secure
        });
        
        if (result.secure) {
          console.log(`  ✅ ${check.name}: Secure`);
        } else {
          console.log(`  ❌ ${check.name}: Security issue detected`);
          this.results.vulnerabilities.push({
            type: 'File Security',
            issue: check.name,
            severity: 'MEDIUM',
            description: 'File security issue detected'
          });
        }
      } catch (error) {
        console.log(`  ⚠️  ${check.name}: Error - ${error.message}`);
      }
    }
  }

  /**
   * Check dependency security
   */
  async checkDependencySecurity() {
    console.log('📦 Checking dependency security...');
    
    const packagePath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const dependencies = { ...packageContent.dependencies, ...packageContent.devDependencies };
      
      const securityChecks = [
        {
          name: 'Security dependencies',
          check: () => {
            const securityDeps = ['helmet', 'bcrypt', 'jsonwebtoken', 'express-rate-limit', 'cors'];
            const hasSecurityDeps = securityDeps.some(dep => dependencies[dep]);
            return {
              hasSecurityDeps: hasSecurityDeps,
              secure: hasSecurityDeps
            };
          }
        },
        {
          name: 'Outdated dependencies',
          check: () => {
            // This is a simplified check - in reality, you'd use npm outdated
            const hasOldDeps = Object.keys(dependencies).some(dep => {
              const version = dependencies[dep];
              return version.includes('^0.') || version.includes('~0.');
            });
            return {
              hasOldDeps: hasOldDeps,
              secure: !hasOldDeps
            };
          }
        }
      ];
      
      for (const check of securityChecks) {
        try {
          const result = check.check();
          this.results.dependencySecurity.push({
            name: check.name,
            result: result,
            secure: result.secure
          });
          
          if (result.secure) {
            console.log(`  ✅ ${check.name}: Secure`);
          } else {
            console.log(`  ❌ ${check.name}: Security issue detected`);
            this.results.vulnerabilities.push({
              type: 'Dependency Security',
              issue: check.name,
              severity: 'MEDIUM',
              description: 'Dependency security issue detected'
            });
          }
        } catch (error) {
          console.log(`  ⚠️  ${check.name}: Error - ${error.message}`);
        }
      }
    }
  }

  /**
   * Check configuration security
   */
  async checkConfigurationSecurity() {
    console.log('⚙️  Checking configuration security...');
    
    const configChecks = [
      {
        name: 'Environment validation',
        check: () => {
          const validateEnvPath = path.join(process.cwd(), 'src/config/validateEnv.js');
          return {
            exists: fs.existsSync(validateEnvPath),
            secure: fs.existsSync(validateEnvPath)
          };
        }
      },
      {
        name: 'Security middleware',
        check: () => {
          const helmetPath = path.join(process.cwd(), 'src/middleware');
          const hasSecurityMiddleware = fs.existsSync(helmetPath);
          return {
            exists: hasSecurityMiddleware,
            secure: hasSecurityMiddleware
          };
        }
      },
      {
        name: 'Error handling',
        check: () => {
          const errorHandlerPath = path.join(process.cwd(), 'src/middleware/standardizedErrorHandler.js');
          return {
            exists: fs.existsSync(errorHandlerPath),
            secure: fs.existsSync(errorHandlerPath)
          };
        }
      }
    ];
    
    for (const check of configChecks) {
      try {
        const result = check.check();
        this.results.configurationSecurity.push({
          name: check.name,
          result: result,
          secure: result.secure
        });
        
        if (result.secure) {
          console.log(`  ✅ ${check.name}: Secure`);
        } else {
          console.log(`  ❌ ${check.name}: Security issue detected`);
          this.results.vulnerabilities.push({
            type: 'Configuration Security',
            issue: check.name,
            severity: 'HIGH',
            description: 'Configuration security issue detected'
          });
        }
      } catch (error) {
        console.log(`  ⚠️  ${check.name}: Error - ${error.message}`);
      }
    }
  }

  /**
   * Calculate security score
   */
  calculateSecurityScore() {
    const totalChecks = this.results.fileSecurity.length + 
                       this.results.dependencySecurity.length + 
                       this.results.configurationSecurity.length;
    
    const passedChecks = this.results.fileSecurity.filter(c => c.secure).length +
                        this.results.dependencySecurity.filter(c => c.secure).length +
                        this.results.configurationSecurity.filter(c => c.secure).length;
    
    const npmVulns = this.results.npmAudit?.metadata?.vulnerabilities?.total || 0;
    const npmScore = Math.max(0, 100 - (npmVulns * 10)); // Deduct 10 points per vulnerability
    
    const configScore = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;
    
    return Math.round((configScore + npmScore) / 2);
  }

  /**
   * Generate security report
   */
  async generateReport() {
    console.log('\n📄 Generating security report...');
    
    const securityScore = this.calculateSecurityScore();
    
    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        securityScore: securityScore,
        totalVulnerabilities: this.results.vulnerabilities.length,
        npmVulnerabilities: this.results.npmAudit?.metadata?.vulnerabilities?.total || 0,
        fileSecurity: this.results.fileSecurity.filter(c => c.secure).length,
        dependencySecurity: this.results.dependencySecurity.filter(c => c.secure).length,
        configurationSecurity: this.results.configurationSecurity.filter(c => c.secure).length
      },
      npmAudit: this.results.npmAudit,
      vulnerabilities: this.results.vulnerabilities,
      fileSecurity: this.results.fileSecurity,
      dependencySecurity: this.results.dependencySecurity,
      configurationSecurity: this.results.configurationSecurity,
      recommendations: this.generateRecommendations()
    };
    
    // Save JSON report
    const reportPath = path.join(__dirname, '../results/simple-security-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlReportPath = path.join(__dirname, '../results/simple-security-report.html');
    fs.writeFileSync(htmlReportPath, htmlReport);
    
    console.log('✅ Security report generated');
    console.log(`📊 JSON Report: ${reportPath}`);
    console.log(`🌐 HTML Report: ${htmlReportPath}`);
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // NPM vulnerabilities
    const npmVulns = this.results.npmAudit?.metadata?.vulnerabilities?.total || 0;
    if (npmVulns > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Dependencies',
        issue: `${npmVulns} npm vulnerabilities found`,
        recommendation: 'Update vulnerable dependencies using npm audit fix',
        impact: 'System has vulnerable dependencies'
      });
    }
    
    // File security issues
    const fileIssues = this.results.fileSecurity.filter(c => !c.secure);
    if (fileIssues.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'File Security',
        issue: `${fileIssues.length} file security issues found`,
        recommendation: 'Review and secure file configurations',
        impact: 'System has file security issues'
      });
    }
    
    // Configuration security issues
    const configIssues = this.results.configurationSecurity.filter(c => !c.secure);
    if (configIssues.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Configuration',
        issue: `${configIssues.length} configuration security issues found`,
        recommendation: 'Implement missing security configurations',
        impact: 'System has configuration security issues'
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
    <title>Simple Security Report - Secure Gate Access Control System</title>
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
        <h1>Simple Security Report</h1>
        <p>Secure Gate Access Control System</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="score ${report.summary.securityScore >= 80 ? 'low' : report.summary.securityScore >= 60 ? 'medium' : 'high'}">
        Security Score: ${report.summary.securityScore}%
    </div>
    
    <div class="section">
        <h3>Summary</h3>
        <p><strong>NPM Vulnerabilities:</strong> ${report.summary.npmVulnerabilities}</p>
        <p><strong>File Security:</strong> ${report.summary.fileSecurity} checks passed</p>
        <p><strong>Dependency Security:</strong> ${report.summary.dependencySecurity} checks passed</p>
        <p><strong>Configuration Security:</strong> ${report.summary.configurationSecurity} checks passed</p>
    </div>
    
    <div class="section">
        <h3>NPM Audit Results</h3>
        <p><strong>Total Vulnerabilities:</strong> ${report.npmAudit?.metadata?.vulnerabilities?.total || 0}</p>
        <p><strong>Critical:</strong> ${report.npmAudit?.metadata?.vulnerabilities?.critical || 0}</p>
        <p><strong>High:</strong> ${report.npmAudit?.metadata?.vulnerabilities?.high || 0}</p>
        <p><strong>Moderate:</strong> ${report.npmAudit?.metadata?.vulnerabilities?.moderate || 0}</p>
        <p><strong>Low:</strong> ${report.npmAudit?.metadata?.vulnerabilities?.low || 0}</p>
    </div>
    
    <div class="section">
        <h3>Vulnerabilities</h3>
        ${report.vulnerabilities.length === 0 ? '<p>No vulnerabilities found</p>' : report.vulnerabilities.map(vuln => `
            <div class="recommendation">
                <strong>${vuln.type}:</strong> ${vuln.issue}<br>
                <strong>Severity:</strong> ${vuln.severity}<br>
                <strong>Description:</strong> ${vuln.description}
            </div>
        `).join('')}
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
    const securityScore = this.calculateSecurityScore();
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 SIMPLE SECURITY TEST COMPLETE');
    console.log('=' .repeat(60));
    
    console.log(`📊 Security Score: ${securityScore}%`);
    console.log(`📦 NPM Vulnerabilities: ${this.results.npmAudit?.metadata?.vulnerabilities?.total || 0}`);
    console.log(`🔒 File Security: ${this.results.fileSecurity.filter(c => c.secure).length}/${this.results.fileSecurity.length} checks passed`);
    console.log(`📦 Dependency Security: ${this.results.dependencySecurity.filter(c => c.secure).length}/${this.results.dependencySecurity.length} checks passed`);
    console.log(`⚙️  Configuration Security: ${this.results.configurationSecurity.filter(c => c.secure).length}/${this.results.configurationSecurity.length} checks passed`);
    console.log(`❌ Total Vulnerabilities: ${this.results.vulnerabilities.length}`);
    console.log('');
    
    console.log('📄 Reports Generated:');
    console.log('  - Simple Security Report: tests/results/simple-security-report.html');
    console.log('  - JSON Report: tests/results/simple-security-report.json');
    console.log('');
    
    if (securityScore >= 80) {
      console.log('✅ SECURITY TEST PASSED - System is secure');
    } else if (securityScore >= 60) {
      console.log('⚠️  SECURITY TEST WARNING - Address security issues');
    } else {
      console.log('❌ SECURITY TEST FAILED - Critical security issues must be addressed');
    }
    
    console.log('=' .repeat(60));
  }

  /**
   * Run all security tests
   */
  async runAllTests() {
    console.log('🔒 SIMPLE SECURITY TEST SUITE');
    console.log('=' .repeat(50));
    console.log('📋 Basic Security Testing without Server');
    console.log('⏱️  Estimated Duration: 1-2 minutes');
    console.log('');

    try {
      // Run NPM audit
      await this.runNpmAudit();
      
      // Check file security
      await this.checkFileSecurity();
      
      // Check dependency security
      await this.checkDependencySecurity();
      
      // Check configuration security
      await this.checkConfigurationSecurity();
      
      // Generate report
      await this.generateReport();
      
      // Display summary
      this.displaySummary();
      
      console.log('\n✅ Simple security testing completed successfully');
      
    } catch (error) {
      console.error('❌ Simple security testing failed:', error.message);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const tester = new SimpleSecurityTest();
  
  try {
    await tester.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('❌ Simple security testing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

export default SimpleSecurityTest;




