/**
 * Production Environment Deployment Readiness Validator
 * 
 * Validates: Requirements 7.1, 7.7
 * 
 * This validator ensures that the production environment is properly configured
 * and ready for zero-downtime deployment with proper rollback capabilities.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class DeploymentReadinessValidator {
  constructor() {
    this.results = {
      deployment: {
        zeroDowntime: false,
        rollbackCapability: false,
        environmentConfig: false,
        databaseMigrations: false
      },
      infrastructure: {
        loadBalancer: false,
        autoScaling: false,
        healthChecks: false,
        monitoring: false
      },
      security: {
        sslCertificates: false,
        secretsManagement: false,
        accessControls: false,
        auditLogging: false
      },
      validation: {
        smokeTests: false,
        integrationTests: false,
        performanceTests: false,
        securityScans: false
      }
    };
    this.issues = [];
    this.recommendations = [];
  }

  async validateDeploymentReadiness() {
    console.log('🚀 Starting Production Deployment Readiness Validation...');
    
    try {
      await this.validateZeroDowntimeDeployment();
      await this.validateRollbackCapabilities();
      await this.validateEnvironmentConfiguration();
      await this.validateDatabaseMigrations();
      await this.validateInfrastructureReadiness();
      await this.validateSecurityConfiguration();
      await this.validateTestingPipeline();
      
      return this.generateDeploymentReport();
    } catch (error) {
      this.issues.push({
        category: 'deployment',
        severity: 'critical',
        issue: 'Deployment validation failed',
        details: error.message,
        recommendation: 'Review deployment configuration and resolve critical issues'
      });
      
      return this.generateDeploymentReport();
    }
  }

  async validateZeroDowntimeDeployment() {
    console.log('  📋 Validating zero-downtime deployment configuration...');
    
    try {
      // Check for blue-green or rolling deployment configuration
      const deploymentConfigs = [
        'docker-compose.yml',
        'kubernetes/deployment.yaml',
        'terraform/main.tf',
        '.github/workflows/deploy.yml'
      ];
      
      let hasDeploymentConfig = false;
      
      for (const config of deploymentConfigs) {
        try {
          const content = await fs.readFile(config, 'utf8');
          
          // Check for zero-downtime deployment patterns
          if (content.includes('rolling') || 
              content.includes('blue-green') ||
              content.includes('maxUnavailable: 0') ||
              content.includes('strategy: RollingUpdate')) {
            hasDeploymentConfig = true;
            break;
          }
        } catch (error) {
          // File doesn't exist, continue checking
        }
      }
      
      if (hasDeploymentConfig) {
        this.results.deployment.zeroDowntime = true;
      } else {
        this.issues.push({
          category: 'deployment',
          severity: 'high',
          issue: 'No zero-downtime deployment configuration found',
          recommendation: 'Configure rolling updates or blue-green deployment strategy'
        });
      }
      
      // Check for health check endpoints
      const healthCheckPaths = [
        'secure-gate-access/server/src/routes/health.js',
        'secure-gate-access/server/src/controllers/healthController.js'
      ];
      
      let hasHealthChecks = false;
      for (const healthPath of healthCheckPaths) {
        try {
          await fs.access(healthPath);
          hasHealthChecks = true;
          break;
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasHealthChecks) {
        this.issues.push({
          category: 'deployment',
          severity: 'medium',
          issue: 'Health check endpoints not found',
          recommendation: 'Implement /health and /ready endpoints for deployment validation'
        });
      }
      
    } catch (error) {
      this.issues.push({
        category: 'deployment',
        severity: 'high',
        issue: 'Failed to validate zero-downtime deployment',
        details: error.message
      });
    }
  }
  async validateRollbackCapabilities() {
    console.log('  🔄 Validating rollback capabilities...');
    
    try {
      // Check for version tagging and rollback scripts
      const rollbackIndicators = [
        '.github/workflows/rollback.yml',
        'scripts/rollback.sh',
        'kubernetes/rollback.yaml',
        'package.json' // Check for version management
      ];
      
      let hasRollbackCapability = false;
      
      for (const indicator of rollbackIndicators) {
        try {
          const content = await fs.readFile(indicator, 'utf8');
          
          if (indicator === 'package.json') {
            const packageJson = JSON.parse(content);
            if (packageJson.version && packageJson.scripts) {
              hasRollbackCapability = true;
            }
          } else if (content.includes('rollback') || content.includes('revert')) {
            hasRollbackCapability = true;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (hasRollbackCapability) {
        this.results.deployment.rollbackCapability = true;
      } else {
        this.issues.push({
          category: 'deployment',
          severity: 'high',
          issue: 'No rollback capabilities configured',
          recommendation: 'Implement automated rollback procedures and version management'
        });
      }
      
      // Check for database migration rollback capabilities
      try {
        const migrationPath = 'secure-gate-access/server/src/database/migrations';
        const migrations = await fs.readdir(migrationPath);
        
        let hasRollbackMigrations = false;
        for (const migration of migrations) {
          const content = await fs.readFile(path.join(migrationPath, migration), 'utf8');
          if (content.includes('DOWN') || content.includes('rollback') || content.includes('DROP')) {
            hasRollbackMigrations = true;
            break;
          }
        }
        
        if (!hasRollbackMigrations) {
          this.issues.push({
            category: 'deployment',
            severity: 'medium',
            issue: 'Database migrations lack rollback procedures',
            recommendation: 'Add rollback/down migrations for all database changes'
          });
        }
      } catch (error) {
        this.issues.push({
          category: 'deployment',
          severity: 'low',
          issue: 'Could not validate database migration rollbacks',
          details: error.message
        });
      }
      
    } catch (error) {
      this.issues.push({
        category: 'deployment',
        severity: 'high',
        issue: 'Failed to validate rollback capabilities',
        details: error.message
      });
    }
  }

  async validateEnvironmentConfiguration() {
    console.log('  ⚙️ Validating environment configuration...');
    
    try {
      // Check for environment configuration files
      const envFiles = [
        'secure-gate-access/server/.env.production',
        'secure-gate-access/server/.env.example',
        'secure-gate-access/client/.env.production',
        'secure-gate-access/client/.env.example'
      ];
      
      let validEnvConfig = true;
      
      for (const envFile of envFiles) {
        try {
          const content = await fs.readFile(envFile, 'utf8');
          
          // Check for required production environment variables
          const requiredVars = [
            'NODE_ENV',
            'DATABASE_URL',
            'JWT_SECRET',
            'FRONTEND_URL'
          ];
          
          for (const requiredVar of requiredVars) {
            if (!content.includes(requiredVar)) {
              this.issues.push({
                category: 'environment',
                severity: 'medium',
                issue: `Missing required environment variable: ${requiredVar}`,
                file: envFile,
                recommendation: `Add ${requiredVar} to environment configuration`
              });
              validEnvConfig = false;
            }
          }
        } catch (error) {
          this.issues.push({
            category: 'environment',
            severity: 'medium',
            issue: `Environment file not found: ${envFile}`,
            recommendation: 'Create production environment configuration files'
          });
          validEnvConfig = false;
        }
      }
      
      this.results.deployment.environmentConfig = validEnvConfig;
      
      // Check for secrets management
      const secretsFiles = [
        'terraform/secrets.tf',
        'kubernetes/secrets.yaml',
        '.github/workflows/deploy.yml'
      ];
      
      let hasSecretsManagement = false;
      for (const secretsFile of secretsFiles) {
        try {
          const content = await fs.readFile(secretsFile, 'utf8');
          if (content.includes('secret') || content.includes('SECRET')) {
            hasSecretsManagement = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasSecretsManagement) {
        this.issues.push({
          category: 'security',
          severity: 'high',
          issue: 'No secrets management configuration found',
          recommendation: 'Implement secure secrets management (AWS Secrets Manager, Kubernetes Secrets, etc.)'
        });
      }
      
    } catch (error) {
      this.issues.push({
        category: 'environment',
        severity: 'high',
        issue: 'Failed to validate environment configuration',
        details: error.message
      });
    }
  }

  async validateDatabaseMigrations() {
    console.log('  🗄️ Validating database migration procedures...');
    
    try {
      const migrationPath = 'secure-gate-access/server/src/database/migrations';
      
      try {
        const migrations = await fs.readdir(migrationPath);
        
        if (migrations.length === 0) {
          this.issues.push({
            category: 'database',
            severity: 'medium',
            issue: 'No database migrations found',
            recommendation: 'Ensure database schema is properly versioned with migrations'
          });
          return;
        }
        
        // Check migration naming convention
        const migrationPattern = /^\d{3}_.*\.sql$/;
        let validMigrations = 0;
        
        for (const migration of migrations) {
          if (migrationPattern.test(migration)) {
            validMigrations++;
          } else {
            this.issues.push({
              category: 'database',
              severity: 'low',
              issue: `Migration file doesn't follow naming convention: ${migration}`,
              recommendation: 'Use format: 001_description.sql'
            });
          }
        }
        
        if (validMigrations > 0) {
          this.results.deployment.databaseMigrations = true;
        }
        
        // Check for migration runner/management
        const migrationRunners = [
          'secure-gate-access/server/src/database/migrate.js',
          'secure-gate-access/server/scripts/migrate.js',
          'secure-gate-access/server/package.json'
        ];
        
        let hasMigrationRunner = false;
        for (const runner of migrationRunners) {
          try {
            const content = await fs.readFile(runner, 'utf8');
            if (content.includes('migrate') || content.includes('migration')) {
              hasMigrationRunner = true;
              break;
            }
          } catch (error) {
            // Continue checking
          }
        }
        
        if (!hasMigrationRunner) {
          this.issues.push({
            category: 'database',
            severity: 'medium',
            issue: 'No database migration runner found',
            recommendation: 'Implement automated migration execution for deployments'
          });
        }
        
      } catch (error) {
        this.issues.push({
          category: 'database',
          severity: 'medium',
          issue: 'Migration directory not found',
          recommendation: 'Create database migration system for schema versioning'
        });
      }
      
    } catch (error) {
      this.issues.push({
        category: 'database',
        severity: 'high',
        issue: 'Failed to validate database migrations',
        details: error.message
      });
    }
  }
  async validateInfrastructureReadiness() {
    console.log('  🏗️ Validating infrastructure readiness...');
    
    try {
      // Check for infrastructure as code
      const infraFiles = [
        'terraform/main.tf',
        'cloudformation/template.yaml',
        'kubernetes/deployment.yaml',
        'docker-compose.production.yml'
      ];
      
      let hasInfrastructure = false;
      for (const infraFile of infraFiles) {
        try {
          await fs.access(infraFile);
          hasInfrastructure = true;
          
          const content = await fs.readFile(infraFile, 'utf8');
          
          // Check for load balancer configuration
          if (content.includes('load_balancer') || 
              content.includes('LoadBalancer') ||
              content.includes('ingress')) {
            this.results.infrastructure.loadBalancer = true;
          }
          
          // Check for auto-scaling configuration
          if (content.includes('auto_scaling') || 
              content.includes('AutoScaling') ||
              content.includes('replicas')) {
            this.results.infrastructure.autoScaling = true;
          }
          
          // Check for health checks
          if (content.includes('health_check') || 
              content.includes('healthcheck') ||
              content.includes('livenessProbe')) {
            this.results.infrastructure.healthChecks = true;
          }
          
          break;
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasInfrastructure) {
        this.issues.push({
          category: 'infrastructure',
          severity: 'high',
          issue: 'No infrastructure as code configuration found',
          recommendation: 'Implement infrastructure as code (Terraform, CloudFormation, or Kubernetes)'
        });
      }
      
      // Check for monitoring configuration
      const monitoringFiles = [
        'monitoring/prometheus.yml',
        'monitoring/grafana-dashboard.json',
        'docker-compose.monitoring.yml'
      ];
      
      let hasMonitoring = false;
      for (const monitoringFile of monitoringFiles) {
        try {
          await fs.access(monitoringFile);
          hasMonitoring = true;
          this.results.infrastructure.monitoring = true;
          break;
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasMonitoring) {
        this.issues.push({
          category: 'monitoring',
          severity: 'medium',
          issue: 'No monitoring configuration found',
          recommendation: 'Set up monitoring with Prometheus, Grafana, or similar tools'
        });
      }
      
    } catch (error) {
      this.issues.push({
        category: 'infrastructure',
        severity: 'high',
        issue: 'Failed to validate infrastructure readiness',
        details: error.message
      });
    }
  }

  async validateSecurityConfiguration() {
    console.log('  🔒 Validating security configuration...');
    
    try {
      // Check for SSL/TLS configuration
      const sslFiles = [
        'nginx/ssl.conf',
        'traefik/tls.yml',
        'kubernetes/tls-secret.yaml'
      ];
      
      let hasSSLConfig = false;
      for (const sslFile of sslFiles) {
        try {
          const content = await fs.readFile(sslFile, 'utf8');
          if (content.includes('ssl') || content.includes('tls') || content.includes('https')) {
            hasSSLConfig = true;
            this.results.security.sslCertificates = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasSSLConfig) {
        this.issues.push({
          category: 'security',
          severity: 'high',
          issue: 'No SSL/TLS configuration found',
          recommendation: 'Configure SSL certificates and HTTPS enforcement'
        });
      }
      
      // Check for security headers configuration
      const securityConfigFiles = [
        'secure-gate-access/server/src/middleware/security.js',
        'nginx/security-headers.conf'
      ];
      
      let hasSecurityHeaders = false;
      for (const configFile of securityConfigFiles) {
        try {
          const content = await fs.readFile(configFile, 'utf8');
          if (content.includes('helmet') || 
              content.includes('Content-Security-Policy') ||
              content.includes('X-Frame-Options')) {
            hasSecurityHeaders = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasSecurityHeaders) {
        this.issues.push({
          category: 'security',
          severity: 'medium',
          issue: 'Security headers not configured',
          recommendation: 'Implement security headers (CSP, HSTS, X-Frame-Options, etc.)'
        });
      }
      
      // Check for audit logging configuration
      const auditLogFiles = [
        'secure-gate-access/server/src/middleware/auditLogger.js',
        'secure-gate-access/server/src/services/loggingService.js'
      ];
      
      let hasAuditLogging = false;
      for (const logFile of auditLogFiles) {
        try {
          const content = await fs.readFile(logFile, 'utf8');
          if (content.includes('audit') || content.includes('security')) {
            hasAuditLogging = true;
            this.results.security.auditLogging = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasAuditLogging) {
        this.issues.push({
          category: 'security',
          severity: 'medium',
          issue: 'Audit logging not configured',
          recommendation: 'Implement comprehensive audit logging for security events'
        });
      }
      
    } catch (error) {
      this.issues.push({
        category: 'security',
        severity: 'high',
        issue: 'Failed to validate security configuration',
        details: error.message
      });
    }
  }

  async validateTestingPipeline() {
    console.log('  🧪 Validating testing pipeline...');
    
    try {
      // Check for CI/CD pipeline
      const ciFiles = [
        '.github/workflows/ci.yml',
        '.github/workflows/test.yml',
        '.gitlab-ci.yml',
        'Jenkinsfile'
      ];
      
      let hasCIPipeline = false;
      for (const ciFile of ciFiles) {
        try {
          const content = await fs.readFile(ciFile, 'utf8');
          
          // Check for smoke tests
          if (content.includes('smoke') || content.includes('health-check')) {
            this.results.validation.smokeTests = true;
          }
          
          // Check for integration tests
          if (content.includes('integration') || content.includes('e2e')) {
            this.results.validation.integrationTests = true;
          }
          
          // Check for performance tests
          if (content.includes('performance') || content.includes('load')) {
            this.results.validation.performanceTests = true;
          }
          
          // Check for security scans
          if (content.includes('security') || content.includes('audit') || content.includes('scan')) {
            this.results.validation.securityScans = true;
          }
          
          hasCIPipeline = true;
          break;
        } catch (error) {
          // Continue checking
        }
      }
      
      if (!hasCIPipeline) {
        this.issues.push({
          category: 'testing',
          severity: 'high',
          issue: 'No CI/CD pipeline found',
          recommendation: 'Implement automated testing pipeline with GitHub Actions or similar'
        });
      }
      
      // Check for test coverage
      const testFiles = [
        'secure-gate-access/server/package.json',
        'secure-gate-access/client/package.json'
      ];
      
      for (const testFile of testFiles) {
        try {
          const content = await fs.readFile(testFile, 'utf8');
          const packageJson = JSON.parse(content);
          
          if (!packageJson.scripts || !packageJson.scripts.test) {
            this.issues.push({
              category: 'testing',
              severity: 'medium',
              issue: `No test script found in ${testFile}`,
              recommendation: 'Add test scripts to package.json'
            });
          }
        } catch (error) {
          // Continue checking
        }
      }
      
    } catch (error) {
      this.issues.push({
        category: 'testing',
        severity: 'high',
        issue: 'Failed to validate testing pipeline',
        details: error.message
      });
    }
  }

  generateDeploymentReport() {
    const totalChecks = Object.values(this.results).reduce((total, category) => {
      return total + Object.keys(category).length;
    }, 0);
    
    const passedChecks = Object.values(this.results).reduce((total, category) => {
      return total + Object.values(category).filter(Boolean).length;
    }, 0);
    
    const readinessScore = Math.round((passedChecks / totalChecks) * 100);
    
    const criticalIssues = this.issues.filter(issue => issue.severity === 'critical').length;
    const highIssues = this.issues.filter(issue => issue.severity === 'high').length;
    const mediumIssues = this.issues.filter(issue => issue.severity === 'medium').length;
    const lowIssues = this.issues.filter(issue => issue.severity === 'low').length;
    
    const isProductionReady = criticalIssues === 0 && highIssues === 0 && readinessScore >= 80;
    
    const report = {
      timestamp: new Date().toISOString(),
      readinessScore,
      isProductionReady,
      summary: {
        totalChecks,
        passedChecks,
        failedChecks: totalChecks - passedChecks
      },
      issues: {
        critical: criticalIssues,
        high: highIssues,
        medium: mediumIssues,
        low: lowIssues,
        total: this.issues.length
      },
      results: this.results,
      detailedIssues: this.issues,
      recommendations: this.generateRecommendations()
    };
    
    console.log('\n📊 Deployment Readiness Report:');
    console.log(`   Readiness Score: ${readinessScore}%`);
    console.log(`   Production Ready: ${isProductionReady ? '✅ YES' : '❌ NO'}`);
    console.log(`   Critical Issues: ${criticalIssues}`);
    console.log(`   High Issues: ${highIssues}`);
    console.log(`   Medium Issues: ${mediumIssues}`);
    console.log(`   Low Issues: ${lowIssues}`);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.issues.filter(i => i.severity === 'critical').length > 0) {
      recommendations.push('🚨 CRITICAL: Resolve all critical issues before deployment');
    }
    
    if (this.issues.filter(i => i.severity === 'high').length > 0) {
      recommendations.push('⚠️ HIGH: Address high-severity issues for production readiness');
    }
    
    if (!this.results.deployment.zeroDowntime) {
      recommendations.push('🔄 Configure zero-downtime deployment strategy');
    }
    
    if (!this.results.deployment.rollbackCapability) {
      recommendations.push('↩️ Implement automated rollback procedures');
    }
    
    if (!this.results.infrastructure.monitoring) {
      recommendations.push('📊 Set up comprehensive monitoring and alerting');
    }
    
    if (!this.results.security.sslCertificates) {
      recommendations.push('🔒 Configure SSL/TLS certificates and HTTPS enforcement');
    }
    
    return recommendations;
  }
}

module.exports = DeploymentReadinessValidator;