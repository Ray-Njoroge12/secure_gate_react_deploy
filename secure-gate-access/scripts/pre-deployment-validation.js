#!/usr/bin/env node

/**
 * Pre-Deployment Validation Script
 * 
 * This script runs comprehensive pre-deployment checks and generates a readiness report
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
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

class PreDeploymentValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.validationResults = [];
    this.criticalIssues = [];
    this.warnings = [];
    this.recommendations = [];
  }

  /**
   * Log validation result
   */
  logResult(category, test, status, message, details = null) {
    const result = {
      category,
      test,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.validationResults.push(result);
    
    const statusColor = status === 'PASS' ? colors.green : 
                       status === 'WARN' ? colors.yellow : colors.red;
    const statusIcon = status === 'PASS' ? '✓' : 
                      status === 'WARN' ? '⚠' : '✗';
    
    console.log(`   ${statusColor}${statusIcon}${colors.reset} ${test}: ${message}`);
    
    if (status === 'FAIL') {
      this.criticalIssues.push(result);
    } else if (status === 'WARN') {
      this.warnings.push(result);
    }
  }

  /**
   * Check environment configuration
   */
  async checkEnvironmentConfiguration() {
    console.log(`${colors.blue}🔧 Checking environment configuration...${colors.reset}`);
    
    // Check production environment file
    const envFile = path.join(this.projectRoot, '.env.production');
    if (fs.existsSync(envFile)) {
      this.logResult('Environment', 'Production Environment File', 'PASS', 'Production environment file exists');
      
      // Validate environment variables
      const envContent = fs.readFileSync(envFile, 'utf8');
      const requiredVars = [
        'NODE_ENV',
        'PORT',
        'DB_HOST',
        'DB_PORT',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD',
        'JWT_SECRET',
        'REDIS_URL',
        'CLOUDFLARE_API_TOKEN',
        'CLOUDFLARE_ZONE_ID'
      ];
      
      let missingVars = [];
      for (const varName of requiredVars) {
        if (!envContent.includes(`${varName}=`)) {
          missingVars.push(varName);
        }
      }
      
      if (missingVars.length === 0) {
        this.logResult('Environment', 'Required Environment Variables', 'PASS', 'All required environment variables present');
      } else {
        this.logResult('Environment', 'Required Environment Variables', 'FAIL', `Missing variables: ${missingVars.join(', ')}`);
      }
    } else {
      this.logResult('Environment', 'Production Environment File', 'FAIL', 'Production environment file not found');
    }
    
    // Check environment validation script
    const envValidationScript = path.join(this.projectRoot, 'scripts', 'validate-env-simple.js');
    if (fs.existsSync(envValidationScript)) {
      this.logResult('Environment', 'Environment Validation Script', 'PASS', 'Environment validation script exists');
    } else {
      this.logResult('Environment', 'Environment Validation Script', 'WARN', 'Environment validation script not found');
    }
  }

  /**
   * Check SSL/TLS configuration
   */
  async checkSSLConfiguration() {
    console.log(`${colors.blue}🔒 Checking SSL/TLS configuration...${colors.reset}`);
    
    // Check SSL setup script
    const sslScript = path.join(this.projectRoot, 'scripts', 'setup-ssl-cloudflare.sh');
    if (fs.existsSync(sslScript)) {
      this.logResult('SSL', 'SSL Setup Script', 'PASS', 'SSL setup script exists');
    } else {
      this.logResult('SSL', 'SSL Setup Script', 'WARN', 'SSL setup script not found');
    }
    
    // Check SSL validation script
    const sslValidationScript = path.join(this.projectRoot, 'scripts', 'validate-ssl.sh');
    if (fs.existsSync(sslValidationScript)) {
      this.logResult('SSL', 'SSL Validation Script', 'PASS', 'SSL validation script exists');
    } else {
      this.logResult('SSL', 'SSL Validation Script', 'WARN', 'SSL validation script not found');
    }
    
    // Check SSL certificates directory
    const sslDir = path.join(this.projectRoot, 'ssl');
    if (fs.existsSync(sslDir)) {
      this.logResult('SSL', 'SSL Certificates Directory', 'PASS', 'SSL certificates directory exists');
      
      // Check for certificate files
      const certFile = path.join(sslDir, 'securegate.crt');
      const keyFile = path.join(sslDir, 'securegate.key');
      
      if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
        this.logResult('SSL', 'SSL Certificate Files', 'PASS', 'SSL certificate files exist');
      } else {
        this.logResult('SSL', 'SSL Certificate Files', 'WARN', 'SSL certificate files not found');
      }
    } else {
      this.logResult('SSL', 'SSL Certificates Directory', 'WARN', 'SSL certificates directory not found');
    }
  }

  /**
   * Check frontend configuration
   */
  async checkFrontendConfiguration() {
    console.log(`${colors.blue}🎨 Checking frontend configuration...${colors.reset}`);
    
    const clientDir = path.join(this.projectRoot, 'client');
    if (fs.existsSync(clientDir)) {
      this.logResult('Frontend', 'Client Directory', 'PASS', 'Client directory exists');
      
      // Check package.json
      const packageJson = path.join(clientDir, 'package.json');
      if (fs.existsSync(packageJson)) {
        this.logResult('Frontend', 'Package.json', 'PASS', 'Package.json exists');
        
        // Check for production build script
        const packageContent = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
        if (packageContent.scripts && packageContent.scripts.build) {
          this.logResult('Frontend', 'Build Script', 'PASS', 'Build script exists');
        } else {
          this.logResult('Frontend', 'Build Script', 'FAIL', 'Build script not found');
        }
      } else {
        this.logResult('Frontend', 'Package.json', 'FAIL', 'Package.json not found');
      }
      
      // Check service worker
      const serviceWorker = path.join(clientDir, 'src', 'service-worker.js');
      if (fs.existsSync(serviceWorker)) {
        this.logResult('Frontend', 'Service Worker', 'PASS', 'Service worker exists');
      } else {
        this.logResult('Frontend', 'Service Worker', 'WARN', 'Service worker not found');
      }
      
      // Check PWA manifest
      const manifest = path.join(clientDir, 'public', 'manifest.json');
      if (fs.existsSync(manifest)) {
        this.logResult('Frontend', 'PWA Manifest', 'PASS', 'PWA manifest exists');
      } else {
        this.logResult('Frontend', 'PWA Manifest', 'WARN', 'PWA manifest not found');
      }
      
      // Check performance monitoring
      const performanceMonitoring = path.join(clientDir, 'src', 'utils', 'performanceMonitoring.js');
      if (fs.existsSync(performanceMonitoring)) {
        this.logResult('Frontend', 'Performance Monitoring', 'PASS', 'Performance monitoring exists');
      } else {
        this.logResult('Frontend', 'Performance Monitoring', 'WARN', 'Performance monitoring not found');
      }
    } else {
      this.logResult('Frontend', 'Client Directory', 'FAIL', 'Client directory not found');
    }
  }

  /**
   * Check backend configuration
   */
  async checkBackendConfiguration() {
    console.log(`${colors.blue}⚙️ Checking backend configuration...${colors.reset}`);
    
    const serverDir = path.join(this.projectRoot, 'server');
    if (fs.existsSync(serverDir)) {
      this.logResult('Backend', 'Server Directory', 'PASS', 'Server directory exists');
      
      // Check package.json
      const packageJson = path.join(serverDir, 'package.json');
      if (fs.existsSync(packageJson)) {
        this.logResult('Backend', 'Package.json', 'PASS', 'Package.json exists');
      } else {
        this.logResult('Backend', 'Package.json', 'FAIL', 'Package.json not found');
      }
      
      // Check main server file
      const serverFile = path.join(serverDir, 'server.js');
      if (fs.existsSync(serverFile)) {
        this.logResult('Backend', 'Server File', 'PASS', 'Server file exists');
      } else {
        this.logResult('Backend', 'Server File', 'FAIL', 'Server file not found');
      }
      
      // Check cache middleware
      const cacheMiddleware = path.join(serverDir, 'src', 'middleware', 'cacheMiddleware.js');
      if (fs.existsSync(cacheMiddleware)) {
        this.logResult('Backend', 'Cache Middleware', 'PASS', 'Cache middleware exists');
      } else {
        this.logResult('Backend', 'Cache Middleware', 'WARN', 'Cache middleware not found');
      }
      
      // Check database configuration
      const dbConfig = path.join(serverDir, 'src', 'database', 'db.enhanced.js');
      if (fs.existsSync(dbConfig)) {
        this.logResult('Backend', 'Database Configuration', 'PASS', 'Database configuration exists');
      } else {
        this.logResult('Backend', 'Database Configuration', 'FAIL', 'Database configuration not found');
      }
      
      // Check security middleware
      const securityMiddleware = path.join(serverDir, 'src', 'middleware', 'securityHeadersMiddleware.js');
      if (fs.existsSync(securityMiddleware)) {
        this.logResult('Backend', 'Security Middleware', 'PASS', 'Security middleware exists');
      } else {
        this.logResult('Backend', 'Security Middleware', 'WARN', 'Security middleware not found');
      }
    } else {
      this.logResult('Backend', 'Server Directory', 'FAIL', 'Server directory not found');
    }
  }

  /**
   * Check Docker configuration
   */
  async checkDockerConfiguration() {
    console.log(`${colors.blue}🐳 Checking Docker configuration...${colors.reset}`);
    
    // Check Docker Compose files
    const dockerComposeFiles = [
      'docker-compose.prod.yml',
      'docker-compose.blue.yml',
      'docker-compose.green.yml'
    ];
    
    for (const file of dockerComposeFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        this.logResult('Docker', `Docker Compose: ${file}`, 'PASS', `${file} exists`);
      } else {
        this.logResult('Docker', `Docker Compose: ${file}`, 'WARN', `${file} not found`);
      }
    }
    
    // Check Dockerfiles
    const dockerfiles = [
      'client/Dockerfile.prod',
      'server/Dockerfile.prod'
    ];
    
    for (const dockerfile of dockerfiles) {
      const filePath = path.join(this.projectRoot, dockerfile);
      if (fs.existsSync(filePath)) {
        this.logResult('Docker', `Dockerfile: ${dockerfile}`, 'PASS', `${dockerfile} exists`);
      } else {
        this.logResult('Docker', `Dockerfile: ${dockerfile}`, 'WARN', `${dockerfile} not found`);
      }
    }
  }

  /**
   * Check monitoring configuration
   */
  async checkMonitoringConfiguration() {
    console.log(`${colors.blue}📊 Checking monitoring configuration...${colors.reset}`);
    
    const monitoringDir = path.join(this.projectRoot, 'monitoring');
    if (fs.existsSync(monitoringDir)) {
      this.logResult('Monitoring', 'Monitoring Directory', 'PASS', 'Monitoring directory exists');
      
      // Check Prometheus configuration
      const prometheusConfig = path.join(monitoringDir, 'prometheus.yml');
      if (fs.existsSync(prometheusConfig)) {
        this.logResult('Monitoring', 'Prometheus Configuration', 'PASS', 'Prometheus configuration exists');
      } else {
        this.logResult('Monitoring', 'Prometheus Configuration', 'WARN', 'Prometheus configuration not found');
      }
      
      // Check alert rules
      const alertRules = path.join(monitoringDir, 'prometheus', 'alert_rules.yml');
      if (fs.existsSync(alertRules)) {
        this.logResult('Monitoring', 'Alert Rules', 'PASS', 'Alert rules exist');
      } else {
        this.logResult('Monitoring', 'Alert Rules', 'WARN', 'Alert rules not found');
      }
      
      // Check Alertmanager configuration
      const alertmanagerConfig = path.join(monitoringDir, 'alertmanager', 'config.yml');
      if (fs.existsSync(alertmanagerConfig)) {
        this.logResult('Monitoring', 'Alertmanager Configuration', 'PASS', 'Alertmanager configuration exists');
      } else {
        this.logResult('Monitoring', 'Alertmanager Configuration', 'WARN', 'Alertmanager configuration not found');
      }
    } else {
      this.logResult('Monitoring', 'Monitoring Directory', 'WARN', 'Monitoring directory not found');
    }
  }

  /**
   * Check scripts and automation
   */
  async checkScriptsAndAutomation() {
    console.log(`${colors.blue}🤖 Checking scripts and automation...${colors.reset}`);
    
    const scriptsDir = path.join(this.projectRoot, 'scripts');
    if (fs.existsSync(scriptsDir)) {
      this.logResult('Scripts', 'Scripts Directory', 'PASS', 'Scripts directory exists');
      
      // Check critical scripts
      const criticalScripts = [
        'validate-env-simple.js',
        'setup-ssl-cloudflare.sh',
        'validate-ssl.sh',
        'configure-cloudflare-cdn.js',
        'test-cdn-performance.js',
        'security-hardening.js',
        'owasp-security-scan.js',
        'validate-security.sh',
        'log-analysis.sh',
        'setup-db-replication.sh',
        'test-backup-restore.sh'
      ];
      
      for (const script of criticalScripts) {
        const scriptPath = path.join(scriptsDir, script);
        if (fs.existsSync(scriptPath)) {
          this.logResult('Scripts', `Script: ${script}`, 'PASS', `${script} exists`);
        } else {
          this.logResult('Scripts', `Script: ${script}`, 'WARN', `${script} not found`);
        }
      }
    } else {
      this.logResult('Scripts', 'Scripts Directory', 'FAIL', 'Scripts directory not found');
    }
  }

  /**
   * Check security configuration
   */
  async checkSecurityConfiguration() {
    console.log(`${colors.blue}🛡️ Checking security configuration...${colors.reset}`);
    
    // Check security scripts
    const securityScripts = [
      'scripts/security-hardening.js',
      'scripts/owasp-security-scan.js',
      'scripts/validate-security.sh'
    ];
    
    for (const script of securityScripts) {
      const scriptPath = path.join(this.projectRoot, script);
      if (fs.existsSync(scriptPath)) {
        this.logResult('Security', `Security Script: ${script.split('/').pop()}`, 'PASS', 'Security script exists');
      } else {
        this.logResult('Security', `Security Script: ${script.split('/').pop()}`, 'WARN', 'Security script not found');
      }
    }
    
    // Check security middleware
    const securityMiddleware = path.join(this.projectRoot, 'server', 'src', 'middleware', 'securityHeadersMiddleware.js');
    if (fs.existsSync(securityMiddleware)) {
      this.logResult('Security', 'Security Middleware', 'PASS', 'Security middleware exists');
    } else {
      this.logResult('Security', 'Security Middleware', 'WARN', 'Security middleware not found');
    }
  }

  /**
   * Check database configuration
   */
  async checkDatabaseConfiguration() {
    console.log(`${colors.blue}🗄️ Checking database configuration...${colors.reset}`);
    
    // Check database scripts
    const dbScripts = [
      'scripts/setup-db-replication.sh',
      'scripts/test-backup-restore.sh'
    ];
    
    for (const script of dbScripts) {
      const scriptPath = path.join(this.projectRoot, script);
      if (fs.existsSync(scriptPath)) {
        this.logResult('Database', `Database Script: ${script.split('/').pop()}`, 'PASS', 'Database script exists');
      } else {
        this.logResult('Database', `Database Script: ${script.split('/').pop()}`, 'WARN', 'Database script not found');
      }
    }
    
    // Check database configuration files
    const dbConfig = path.join(this.projectRoot, 'server', 'src', 'database', 'db.enhanced.js');
    if (fs.existsSync(dbConfig)) {
      this.logResult('Database', 'Database Configuration', 'PASS', 'Database configuration exists');
    } else {
      this.logResult('Database', 'Database Configuration', 'FAIL', 'Database configuration not found');
    }
  }

  /**
   * Check deployment configuration
   */
  async checkDeploymentConfiguration() {
    console.log(`${colors.blue}🚀 Checking deployment configuration...${colors.reset}`);
    
    // Check deployment scripts
    const deploymentScripts = [
      'deployment/blue-green-deploy.sh',
      'deployment/container-health-monitor.sh',
      'deployment/restart-policy-manager.sh',
      'deployment/smoke-tests.sh'
    ];
    
    for (const script of deploymentScripts) {
      const scriptPath = path.join(this.projectRoot, script);
      if (fs.existsSync(scriptPath)) {
        this.logResult('Deployment', `Deployment Script: ${script.split('/').pop()}`, 'PASS', 'Deployment script exists');
      } else {
        this.logResult('Deployment', `Deployment Script: ${script.split('/').pop()}`, 'WARN', 'Deployment script not found');
      }
    }
    
    // Check deployment documentation
    const deploymentDocs = [
      'DEPLOYMENT_GUIDE.md',
      'deployment/CI-CD-DOCUMENTATION.md',
      'deployment/COMPLIANCE_DOCUMENTATION.md'
    ];
    
    for (const doc of deploymentDocs) {
      const docPath = path.join(this.projectRoot, doc);
      if (fs.existsSync(docPath)) {
        this.logResult('Deployment', `Documentation: ${doc}`, 'PASS', 'Documentation exists');
      } else {
        this.logResult('Deployment', `Documentation: ${doc}`, 'WARN', 'Documentation not found');
      }
    }
  }

  /**
   * Check file permissions
   */
  async checkFilePermissions() {
    console.log(`${colors.blue}🔐 Checking file permissions...${colors.reset}`);
    
    try {
      // Check if scripts are executable
      const scriptsDir = path.join(this.projectRoot, 'scripts');
      if (fs.existsSync(scriptsDir)) {
        const scriptFiles = fs.readdirSync(scriptsDir).filter(file => 
          file.endsWith('.sh') || file.endsWith('.js')
        );
        
        for (const script of scriptFiles) {
          const scriptPath = path.join(scriptsDir, script);
          try {
            const stats = fs.statSync(scriptPath);
            const isExecutable = !!(stats.mode & parseInt('111', 8));
            
            if (isExecutable) {
              this.logResult('Permissions', `Script: ${script}`, 'PASS', 'Script is executable');
            } else {
              this.logResult('Permissions', `Script: ${script}`, 'WARN', 'Script is not executable');
            }
          } catch (error) {
            this.logResult('Permissions', `Script: ${script}`, 'WARN', 'Could not check permissions');
          }
        }
      }
    } catch (error) {
      this.logResult('Permissions', 'File Permissions Check', 'WARN', 'Could not check file permissions');
    }
  }

  /**
   * Generate deployment readiness report
   */
  generateDeploymentReadinessReport() {
    console.log(`${colors.blue}📋 Generating deployment readiness report...${colors.reset}`);
    
    // Calculate overall score
    const totalTests = this.validationResults.length;
    const passedTests = this.validationResults.filter(r => r.status === 'PASS').length;
    const warningTests = this.validationResults.filter(r => r.status === 'WARN').length;
    const failedTests = this.validationResults.filter(r => r.status === 'FAIL').length;
    
    const overallScore = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    // Determine deployment readiness
    let deploymentStatus = 'NOT_READY';
    let statusColor = colors.red;
    
    if (failedTests === 0 && warningTests <= 5) {
      deploymentStatus = 'READY';
      statusColor = colors.green;
    } else if (failedTests <= 2 && warningTests <= 10) {
      deploymentStatus = 'READY_WITH_WARNINGS';
      statusColor = colors.yellow;
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      deploymentStatus,
      overallScore,
      summary: {
        totalTests,
        passedTests,
        warningTests,
        failedTests,
        criticalIssues: this.criticalIssues.length,
        warnings: this.warnings.length
      },
      results: this.validationResults,
      criticalIssues: this.criticalIssues,
      warnings: this.warnings,
      recommendations: this.generateRecommendations()
    };
    
    console.log(`${colors.green}✓${colors.reset} Deployment readiness report generated`);
    
    // Display summary
    console.log(`\n${colors.cyan}📊 Deployment Readiness Summary:${colors.reset}`);
    console.log(`   Overall Score: ${overallScore}/100`);
    console.log(`   Deployment Status: ${statusColor}${deploymentStatus}${colors.reset}`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Warnings: ${warningTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Critical Issues: ${this.criticalIssues.length}`);
    
    return report;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.criticalIssues.length > 0) {
      recommendations.push('Address all critical issues before deployment');
    }
    
    if (this.warnings.length > 0) {
      recommendations.push('Review and address warnings for optimal deployment');
    }
    
    recommendations.push('Run comprehensive security scans before deployment');
    recommendations.push('Test all functionality in staging environment');
    recommendations.push('Ensure all monitoring and alerting is configured');
    recommendations.push('Verify backup and recovery procedures');
    recommendations.push('Schedule maintenance window for deployment');
    recommendations.push('Prepare rollback procedures');
    recommendations.push('Notify stakeholders of deployment schedule');
    
    return recommendations;
  }

  /**
   * Save report to file
   */
  saveReportToFile(report) {
    const logsDir = path.join(this.projectRoot, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const reportFile = path.join(logsDir, `deployment-readiness-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`${colors.blue}   Report saved to: ${reportFile}${colors.reset}`);
    return reportFile;
  }

  /**
   * Run complete pre-deployment validation
   */
  async runValidation() {
    console.log(`${colors.bright}${colors.blue}🚀 Starting Pre-Deployment Validation${colors.reset}\n`);
    console.log(`Project Root: ${this.projectRoot}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);
    
    try {
      await this.checkEnvironmentConfiguration();
      await this.checkSSLConfiguration();
      await this.checkFrontendConfiguration();
      await this.checkBackendConfiguration();
      await this.checkDockerConfiguration();
      await this.checkMonitoringConfiguration();
      await this.checkScriptsAndAutomation();
      await this.checkSecurityConfiguration();
      await this.checkDatabaseConfiguration();
      await this.checkDeploymentConfiguration();
      await this.checkFilePermissions();
      
      const report = this.generateDeploymentReadinessReport();
      const reportFile = this.saveReportToFile(report);
      
      console.log(`\n${colors.bright}${colors.green}🎉 Pre-deployment validation completed!${colors.reset}`);
      
      console.log(`\n${colors.blue}💡 Next Steps:${colors.reset}`);
      for (const recommendation of report.recommendations) {
        console.log(`   • ${recommendation}`);
      }
      
      if (report.deploymentStatus === 'READY') {
        console.log(`\n${colors.bright}${colors.green}✅ System is READY for deployment!${colors.reset}`);
      } else if (report.deploymentStatus === 'READY_WITH_WARNINGS') {
        console.log(`\n${colors.bright}${colors.yellow}⚠️ System is ready for deployment with warnings${colors.reset}`);
      } else {
        console.log(`\n${colors.bright}${colors.red}❌ System is NOT READY for deployment${colors.reset}`);
      }
      
      return report;
    } catch (error) {
      console.log(`\n${colors.red}❌ Pre-deployment validation failed: ${error.message}${colors.reset}`);
      throw error;
    }
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new PreDeploymentValidator();
  validator.runValidation().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

export default PreDeploymentValidator;
