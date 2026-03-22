#!/usr/bin/env node

/**
 * Production Deployment Scripts
 * Comprehensive deployment automation for Secure Gate Access Control System
 * Task 19.3 - Production deployment and launch readiness validation
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');

class ProductionDeploymentManager {
  constructor(options = {}) {
    this.paths = {
      repoRoot: path.resolve(__dirname, '..', '..'),
      server: path.resolve(__dirname, '..', '..', 'secure-gate-access', 'server'),
      client: path.resolve(__dirname, '..', '..', 'secure-gate-access', 'client')
    };

    this.options = {
      environment: 'production',
      region: 'us-east-1',
      skipBackup: false,
      skipTests: false,
      autoRollback: true,
      healthCheckTimeout: 300000, // 5 minutes
      deploymentTimeout: 1800000, // 30 minutes
      ...options
    };
    
    this.deploymentId = this.generateDeploymentId();
    this.deploymentLog = [];
    this.rollbackPlan = [];
    
    this.log('info', `Initializing deployment ${this.deploymentId}`);
  }

  hasServerScript(scriptName) {
    try {
      const packageJsonPath = path.join(this.paths.server, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return Boolean(pkg.scripts && pkg.scripts[scriptName]);
    } catch {
      return false;
    }
  }

  generateDeploymentId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const hash = crypto.randomBytes(4).toString('hex');
    return `deploy-${timestamp}-${hash}`;
  }

  log(level, message, data = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      deploymentId: this.deploymentId
    };
    
    this.deploymentLog.push(logEntry);
    
    const emoji = {
      info: '📋',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍'
    };
    
    console.log(`${emoji[level] || '📋'} [${level.toUpperCase()}] ${message}`);
    if (data && this.options.verbose) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }

  async deployToProduction() {
    this.log('info', 'Starting production deployment process');
    console.log('=' .repeat(80));
    
    try {
      // Phase 1: Pre-deployment validation
      await this.preDeploymentValidation();
      
      // Phase 2: Infrastructure preparation
      await this.prepareInfrastructure();
      
      // Phase 3: Database migrations
      await this.runDatabaseMigrations();
      
      // Phase 4: Application deployment
      await this.deployApplication();
      
      // Phase 5: Post-deployment validation
      await this.postDeploymentValidation();
      
      // Phase 6: Traffic routing
      await this.routeTraffic();
      
      // Phase 7: Final health checks
      await this.finalHealthChecks();
      
      this.log('success', 'Production deployment completed successfully');
      await this.generateDeploymentReport();
      
      return {
        success: true,
        deploymentId: this.deploymentId,
        duration: this.getDeploymentDuration(),
        report: await this.getDeploymentSummary()
      };
      
    } catch (error) {
      this.log('error', 'Deployment failed', { error: error.message, stack: error.stack });
      
      if (this.options.autoRollback) {
        await this.executeRollback();
      }
      
      throw error;
    }
  }

  async preDeploymentValidation() {
    this.log('info', 'Phase 1: Pre-deployment validation');
    
    // Check environment variables
    await this.validateEnvironmentVariables();
    
    // Validate infrastructure readiness
    await this.validateInfrastructure();
    
    // Run comprehensive test suite
    if (!this.options.skipTests) {
      await this.runTestSuite();
    }
    
    // Validate security configurations
    await this.validateSecurityConfig();
    
    // Check database connectivity
    await this.validateDatabaseConnection();
    
    // Validate external service dependencies
    await this.validateExternalServices();
    
    this.log('success', 'Pre-deployment validation completed');
  }

  async validateEnvironmentVariables() {
    this.log('info', 'Validating environment variables');
    
    const requiredVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'SESSION_SECRET',
      'MAILGUN_API_KEY',
      'AFRICASTALKING_API_KEY',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'SENTRY_DSN'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    // Validate environment-specific values
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(`NODE_ENV must be 'production', got '${process.env.NODE_ENV}'`);
    }
    
    this.log('success', 'Environment variables validated');
  }

  async validateInfrastructure() {
    this.log('info', 'Validating infrastructure readiness');
    
    try {
      // Check AWS credentials and permissions
      execSync('aws sts get-caller-identity', { stdio: 'pipe' });
      
      // Validate ECS cluster
      const clusterStatus = execSync(`aws ecs describe-clusters --clusters secure-gate-cluster --region ${this.options.region}`, { stdio: 'pipe' });
      const cluster = JSON.parse(clusterStatus.toString());
      
      if (cluster.clusters[0].status !== 'ACTIVE') {
        throw new Error('ECS cluster is not active');
      }
      
      // Validate load balancer
      const albStatus = execSync(`aws elbv2 describe-load-balancers --names secure-gate-alb --region ${this.options.region}`, { stdio: 'pipe' });
      const alb = JSON.parse(albStatus.toString());
      
      if (alb.LoadBalancers[0].State.Code !== 'active') {
        throw new Error('Application Load Balancer is not active');
      }
      
      // Validate RDS instance
      const rdsStatus = execSync(`aws rds describe-db-instances --db-instance-identifier secure-gate-postgres --region ${this.options.region}`, { stdio: 'pipe' });
      const rds = JSON.parse(rdsStatus.toString());
      
      if (rds.DBInstances[0].DBInstanceStatus !== 'available') {
        throw new Error('RDS instance is not available');
      }
      
      this.log('success', 'Infrastructure validation completed');
      
    } catch (error) {
      throw new Error(`Infrastructure validation failed: ${error.message}`);
    }
  }

  async runTestSuite() {
    this.log('info', 'Running comprehensive test suite');
    
    try {
      // Run unit tests
      this.log('info', 'Running unit tests');
      execSync('npm run test:unit', { stdio: 'inherit', cwd: this.paths.server });
      execSync('npm run test', { stdio: 'inherit', cwd: this.paths.client });
      
      // Run integration tests
      this.log('info', 'Running integration tests');
      execSync('npm run test:integration', { stdio: 'inherit', cwd: this.paths.server });
      
      // Run E2E tests
      this.log('info', 'Running E2E tests');
      execSync('npx playwright test', { stdio: 'inherit', cwd: this.paths.repoRoot });
      
      // Run security validation
      this.log('info', 'Running security validation');
      execSync('node scripts/maintenance/comprehensive-validation-runner.js --no-performance --no-privacy', {
        stdio: 'inherit',
        cwd: this.paths.repoRoot
      });
      
      this.log('success', 'Test suite completed successfully');
      
    } catch (error) {
      throw new Error(`Test suite failed: ${error.message}`);
    }
  }

  async validateSecurityConfig() {
    this.log('info', 'Validating security configuration');
    
    // Check SSL certificates
    try {
      const certInfo = execSync(`aws acm describe-certificate --certificate-arn ${process.env.SSL_CERTIFICATE_ARN} --region ${this.options.region}`, { stdio: 'pipe' });
      const cert = JSON.parse(certInfo.toString());
      
      if (cert.Certificate.Status !== 'ISSUED') {
        throw new Error('SSL certificate is not issued');
      }
      
      // Check certificate expiration
      const expirationDate = new Date(cert.Certificate.NotAfter);
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      if (expirationDate < thirtyDaysFromNow) {
        this.log('warning', 'SSL certificate expires within 30 days', { expirationDate });
      }
      
    } catch (error) {
      throw new Error(`SSL certificate validation failed: ${error.message}`);
    }
    
    // Validate WAF configuration
    try {
      const wafInfo = execSync(`aws wafv2 get-web-acl --scope CLOUDFRONT --id ${process.env.WAF_WEB_ACL_ID} --region us-east-1`, { stdio: 'pipe' });
      const waf = JSON.parse(wafInfo.toString());
      
      if (!waf.WebACL) {
        throw new Error('WAF Web ACL not found');
      }
      
    } catch (error) {
      this.log('warning', 'WAF validation failed', { error: error.message });
    }
    
    this.log('success', 'Security configuration validated');
  }

  async validateDatabaseConnection() {
    this.log('info', 'Validating database connection');
    
    try {
      // Test database connection
      const testScript = `
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        (async () => {
          try {
            const client = await pool.connect();
            const result = await client.query('SELECT NOW() as current_time, version() as version');
            console.log('Database connection successful:', result.rows[0]);
            client.release();
            await pool.end();
            process.exit(0);
          } catch (error) {
            console.error('Database connection failed:', error);
            process.exit(1);
          }
        })();
      `;
      
      fs.writeFileSync('/tmp/db-test.js', testScript);
      execSync('node /tmp/db-test.js', { stdio: 'inherit', cwd: this.paths.server });
      fs.unlinkSync('/tmp/db-test.js');
      
      this.log('success', 'Database connection validated');
      
    } catch (error) {
      throw new Error(`Database connection validation failed: ${error.message}`);
    }
  }

  async validateExternalServices() {
    this.log('info', 'Validating external service dependencies');
    
    const services = [
      {
        name: 'Mailgun',
        url: 'https://api.mailgun.net/v3',
        headers: { 'Authorization': `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}` }
      },
      {
        name: 'AfricaTalking',
        url: 'https://api.africastalking.com/version1',
        headers: { 'apiKey': process.env.AFRICASTALKING_API_KEY }
      },
      {
        name: 'Sentry',
        url: process.env.SENTRY_DSN ? process.env.SENTRY_DSN.replace('//', '//test@') : null
      }
    ];
    
    for (const service of services) {
      if (!service.url) continue;
      
      try {
        const response = await fetch(service.url, {
          method: 'GET',
          headers: service.headers || {},
          timeout: 10000
        });
        
        if (response.ok || response.status === 401) { // 401 is expected for some services
          this.log('success', `${service.name} service is reachable`);
        } else {
          this.log('warning', `${service.name} service returned status ${response.status}`);
        }
        
      } catch (error) {
        this.log('warning', `${service.name} service validation failed`, { error: error.message });
      }
    }
  }

  async prepareInfrastructure() {
    this.log('info', 'Phase 2: Infrastructure preparation');
    
    // Create backup of current deployment
    if (!this.options.skipBackup) {
      await this.createDeploymentBackup();
    }
    
    // Scale up infrastructure if needed
    await this.scaleInfrastructure();
    
    // Update security groups and firewall rules
    await this.updateSecurityGroups();
    
    this.log('success', 'Infrastructure preparation completed');
  }

  async createDeploymentBackup() {
    this.log('info', 'Creating deployment backup');
    
    try {
      // Create RDS snapshot
      const snapshotId = `secure-gate-backup-${this.deploymentId}`;
      execSync(`aws rds create-db-snapshot --db-instance-identifier secure-gate-postgres --db-snapshot-identifier ${snapshotId} --region ${this.options.region}`, { stdio: 'pipe' });
      
      this.rollbackPlan.push({
        type: 'rds_snapshot',
        snapshotId,
        action: 'restore_from_snapshot'
      });
      
      // Backup current ECS task definition
      const taskDefArn = execSync(`aws ecs describe-services --cluster secure-gate-cluster --services secure-gate-service --region ${this.options.region} --query 'services[0].taskDefinition' --output text`, { stdio: 'pipe' }).toString().trim();
      
      this.rollbackPlan.push({
        type: 'ecs_task_definition',
        taskDefinitionArn: taskDefArn,
        action: 'update_service'
      });
      
      this.log('success', 'Deployment backup created');
      
    } catch (error) {
      throw new Error(`Backup creation failed: ${error.message}`);
    }
  }

  async scaleInfrastructure() {
    this.log('info', 'Scaling infrastructure for deployment');
    
    try {
      // Temporarily increase ECS service desired count
      execSync(`aws ecs update-service --cluster secure-gate-cluster --service secure-gate-service --desired-count 4 --region ${this.options.region}`, { stdio: 'pipe' });
      
      // Wait for services to be stable
      this.log('info', 'Waiting for services to stabilize');
      execSync(`aws ecs wait services-stable --cluster secure-gate-cluster --services secure-gate-service --region ${this.options.region}`, { stdio: 'pipe' });
      
      this.log('success', 'Infrastructure scaled successfully');
      
    } catch (error) {
      throw new Error(`Infrastructure scaling failed: ${error.message}`);
    }
  }

  async updateSecurityGroups() {
    this.log('info', 'Updating security groups');
    
    // This would typically involve updating security group rules
    // For now, we'll just validate they exist
    try {
      execSync(`aws ec2 describe-security-groups --group-names secure-gate-alb-sg secure-gate-app-sg secure-gate-db-sg --region ${this.options.region}`, { stdio: 'pipe' });
      this.log('success', 'Security groups validated');
    } catch (error) {
      this.log('warning', 'Security group validation failed', { error: error.message });
    }
  }

  async runDatabaseMigrations() {
    this.log('info', 'Phase 3: Running database migrations');
    
    try {
      // Run database migrations
      execSync('npm run db:migrate', { stdio: 'inherit', cwd: this.paths.server });
      
      // Verify migration status
      if (this.hasServerScript('db:status')) {
        execSync('npm run db:status', { stdio: 'inherit', cwd: this.paths.server });
      } else {
        this.log('warning', 'Skipping db:status verification because script is not defined in server/package.json');
      }
      
      this.log('success', 'Database migrations completed');
      
    } catch (error) {
      throw new Error(`Database migration failed: ${error.message}`);
    }
  }

  async deployApplication() {
    this.log('info', 'Phase 4: Deploying application');
    
    try {
      // Build and push Docker images
      await this.buildAndPushImages();
      
      // Update ECS task definition
      await this.updateTaskDefinition();
      
      // Deploy to ECS
      await this.deployToECS();
      
      this.log('success', 'Application deployment completed');
      
    } catch (error) {
      throw new Error(`Application deployment failed: ${error.message}`);
    }
  }

  async buildAndPushImages() {
    this.log('info', 'Building and pushing Docker images');
    
    const imageTag = `${this.deploymentId}`;
    const ecrRegistry = process.env.ECR_REGISTRY;
    
    try {
      // Login to ECR
      execSync(`aws ecr get-login-password --region ${this.options.region} | docker login --username AWS --password-stdin ${ecrRegistry}`, { stdio: 'pipe' });
      
      // Build server image
      execSync(`docker build -t ${ecrRegistry}/secure-gate-server:${imageTag} -f secure-gate-access/server/Dockerfile secure-gate-access/server`, { stdio: 'inherit' });
      execSync(`docker push ${ecrRegistry}/secure-gate-server:${imageTag}`, { stdio: 'inherit' });
      
      // Build client image
      execSync(`docker build -t ${ecrRegistry}/secure-gate-client:${imageTag} -f secure-gate-access/client/Dockerfile secure-gate-access/client`, { stdio: 'inherit' });
      execSync(`docker push ${ecrRegistry}/secure-gate-client:${imageTag}`, { stdio: 'inherit' });
      
      this.log('success', 'Docker images built and pushed');
      
    } catch (error) {
      throw new Error(`Docker build/push failed: ${error.message}`);
    }
  }

  async updateTaskDefinition() {
    this.log('info', 'Updating ECS task definition');
    
    try {
      // Get current task definition
      const currentTaskDef = execSync(`aws ecs describe-task-definition --task-definition secure-gate-task --region ${this.options.region}`, { stdio: 'pipe' });
      const taskDef = JSON.parse(currentTaskDef.toString()).taskDefinition;
      
      // Update image URIs
      const imageTag = this.deploymentId;
      const ecrRegistry = process.env.ECR_REGISTRY;
      
      taskDef.containerDefinitions.forEach(container => {
        if (container.name === 'secure-gate-server') {
          container.image = `${ecrRegistry}/secure-gate-server:${imageTag}`;
        } else if (container.name === 'secure-gate-client') {
          container.image = `${ecrRegistry}/secure-gate-client:${imageTag}`;
        }
      });
      
      // Remove unnecessary fields
      delete taskDef.taskDefinitionArn;
      delete taskDef.revision;
      delete taskDef.status;
      delete taskDef.requiresAttributes;
      delete taskDef.placementConstraints;
      delete taskDef.compatibilities;
      delete taskDef.registeredAt;
      delete taskDef.registeredBy;
      
      // Register new task definition
      const newTaskDefFile = `/tmp/task-definition-${this.deploymentId}.json`;
      fs.writeFileSync(newTaskDefFile, JSON.stringify(taskDef, null, 2));
      
      const newTaskDefResult = execSync(`aws ecs register-task-definition --cli-input-json file://${newTaskDefFile} --region ${this.options.region}`, { stdio: 'pipe' });
      const newTaskDef = JSON.parse(newTaskDefResult.toString());
      
      this.newTaskDefinitionArn = newTaskDef.taskDefinition.taskDefinitionArn;
      
      // Cleanup
      fs.unlinkSync(newTaskDefFile);
      
      this.log('success', 'Task definition updated', { taskDefinitionArn: this.newTaskDefinitionArn });
      
    } catch (error) {
      throw new Error(`Task definition update failed: ${error.message}`);
    }
  }

  async deployToECS() {
    this.log('info', 'Deploying to ECS');
    
    try {
      // Update ECS service with new task definition
      execSync(`aws ecs update-service --cluster secure-gate-cluster --service secure-gate-service --task-definition ${this.newTaskDefinitionArn} --region ${this.options.region}`, { stdio: 'pipe' });
      
      // Wait for deployment to complete
      this.log('info', 'Waiting for ECS deployment to complete (this may take several minutes)');
      execSync(`aws ecs wait services-stable --cluster secure-gate-cluster --services secure-gate-service --region ${this.options.region}`, { stdio: 'pipe' });
      
      this.log('success', 'ECS deployment completed');
      
    } catch (error) {
      throw new Error(`ECS deployment failed: ${error.message}`);
    }
  }

  async postDeploymentValidation() {
    this.log('info', 'Phase 5: Post-deployment validation');
    
    // Wait for application to be ready
    await this.waitForApplicationReady();
    
    // Run health checks
    await this.runHealthChecks();
    
    // Validate critical functionality
    await this.validateCriticalFunctionality();
    
    this.log('success', 'Post-deployment validation completed');
  }

  async waitForApplicationReady() {
    this.log('info', 'Waiting for application to be ready');
    
    const maxAttempts = 30;
    const delayMs = 10000; // 10 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${process.env.APPLICATION_URL}/health`, {
          timeout: 5000
        });
        
        if (response.ok) {
          this.log('success', 'Application is ready');
          return;
        }
        
        this.log('info', `Health check attempt ${attempt}/${maxAttempts} failed, retrying...`);
        
      } catch (error) {
        this.log('info', `Health check attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
      }
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    throw new Error('Application failed to become ready within timeout period');
  }

  async runHealthChecks() {
    this.log('info', 'Running comprehensive health checks');
    
    const healthChecks = [
      { name: 'Basic Health', endpoint: '/health' },
      { name: 'Database Health', endpoint: '/health/db' },
      { name: 'Redis Health', endpoint: '/health/redis' },
      { name: 'External Services', endpoint: '/health/external' }
    ];
    
    for (const check of healthChecks) {
      try {
        const response = await fetch(`${process.env.APPLICATION_URL}${check.endpoint}`, {
          timeout: 10000
        });
        
        if (response.ok) {
          this.log('success', `${check.name} check passed`);
        } else {
          throw new Error(`${check.name} check failed with status ${response.status}`);
        }
        
      } catch (error) {
        throw new Error(`${check.name} check failed: ${error.message}`);
      }
    }
  }

  async validateCriticalFunctionality() {
    this.log('info', 'Validating critical functionality');
    
    try {
      // Run a subset of critical E2E tests
      execSync('npm run test:critical', { stdio: 'inherit', cwd: this.paths.server });
      
      this.log('success', 'Critical functionality validation completed');
      
    } catch (error) {
      throw new Error(`Critical functionality validation failed: ${error.message}`);
    }
  }

  async routeTraffic() {
    this.log('info', 'Phase 6: Routing traffic');
    
    // In a blue-green deployment, this would switch traffic
    // For rolling deployment, traffic is already being routed
    this.log('info', 'Traffic routing completed (rolling deployment)');
  }

  async finalHealthChecks() {
    this.log('info', 'Phase 7: Final health checks');
    
    // Run final comprehensive health checks
    await this.runHealthChecks();
    
    // Scale back to normal capacity
    await this.scaleToNormalCapacity();
    
    this.log('success', 'Final health checks completed');
  }

  async scaleToNormalCapacity() {
    this.log('info', 'Scaling back to normal capacity');
    
    try {
      // Scale back to normal desired count
      execSync(`aws ecs update-service --cluster secure-gate-cluster --service secure-gate-service --desired-count 2 --region ${this.options.region}`, { stdio: 'pipe' });
      
      this.log('success', 'Scaled back to normal capacity');
      
    } catch (error) {
      this.log('warning', 'Failed to scale back to normal capacity', { error: error.message });
    }
  }

  async executeRollback() {
    this.log('warning', 'Executing automatic rollback');
    
    try {
      for (const rollbackStep of this.rollbackPlan.reverse()) {
        switch (rollbackStep.type) {
          case 'ecs_task_definition':
            this.log('info', 'Rolling back ECS service');
            execSync(`aws ecs update-service --cluster secure-gate-cluster --service secure-gate-service --task-definition ${rollbackStep.taskDefinitionArn} --region ${this.options.region}`, { stdio: 'pipe' });
            execSync(`aws ecs wait services-stable --cluster secure-gate-cluster --services secure-gate-service --region ${this.options.region}`, { stdio: 'pipe' });
            break;
            
          case 'rds_snapshot':
            this.log('warning', 'Database rollback requires manual intervention', { snapshotId: rollbackStep.snapshotId });
            break;
        }
      }
      
      this.log('success', 'Rollback completed');
      
    } catch (error) {
      this.log('error', 'Rollback failed', { error: error.message });
      throw new Error(`Rollback failed: ${error.message}`);
    }
  }

  getDeploymentDuration() {
    if (this.deploymentLog.length === 0) return 0;
    
    const startTime = new Date(this.deploymentLog[0].timestamp);
    const endTime = new Date(this.deploymentLog[this.deploymentLog.length - 1].timestamp);
    
    return endTime - startTime;
  }

  async getDeploymentSummary() {
    return {
      deploymentId: this.deploymentId,
      environment: this.options.environment,
      region: this.options.region,
      duration: this.getDeploymentDuration(),
      phases: this.deploymentLog.filter(entry => entry.message.startsWith('Phase')),
      rollbackPlan: this.rollbackPlan,
      newTaskDefinitionArn: this.newTaskDefinitionArn
    };
  }

  async generateDeploymentReport() {
    const report = {
      metadata: {
        deploymentId: this.deploymentId,
        environment: this.options.environment,
        region: this.options.region,
        startTime: this.deploymentLog[0]?.timestamp,
        endTime: this.deploymentLog[this.deploymentLog.length - 1]?.timestamp,
        duration: this.getDeploymentDuration(),
        success: true
      },
      phases: {
        preDeploymentValidation: this.getPhaseStatus('Phase 1'),
        infrastructurePreparation: this.getPhaseStatus('Phase 2'),
        databaseMigrations: this.getPhaseStatus('Phase 3'),
        applicationDeployment: this.getPhaseStatus('Phase 4'),
        postDeploymentValidation: this.getPhaseStatus('Phase 5'),
        trafficRouting: this.getPhaseStatus('Phase 6'),
        finalHealthChecks: this.getPhaseStatus('Phase 7')
      },
      rollbackPlan: this.rollbackPlan,
      deploymentLog: this.deploymentLog,
      summary: await this.getDeploymentSummary()
    };
    
    const reportPath = path.join(__dirname, `deployment-report-${this.deploymentId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log('info', `Deployment report saved to: ${reportPath}`);
    
    return report;
  }

  getPhaseStatus(phasePrefix) {
    const phaseEntries = this.deploymentLog.filter(entry => entry.message.startsWith(phasePrefix));
    return phaseEntries.length > 0 ? 'completed' : 'not_started';
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const options = {
    environment: args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'production',
    region: args.find(arg => arg.startsWith('--region='))?.split('=')[1] || 'us-east-1',
    skipBackup: args.includes('--skip-backup'),
    skipTests: args.includes('--skip-tests'),
    autoRollback: !args.includes('--no-rollback'),
    verbose: args.includes('--verbose') || args.includes('-v')
  };
  
  console.log('🚀 Starting Production Deployment');
  console.log(`🌍 Environment: ${options.environment}`);
  console.log(`📍 Region: ${options.region}`);
  console.log(`🔧 Options:`, options);
  
  const deploymentManager = new ProductionDeploymentManager(options);
  
  deploymentManager.deployToProduction()
    .then(result => {
      console.log('\n✅ Production deployment completed successfully');
      console.log(`📋 Deployment ID: ${result.deploymentId}`);
      console.log(`⏱️  Duration: ${(result.duration / 1000 / 60).toFixed(2)} minutes`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Production deployment failed:', error.message);
      process.exit(1);
    });
}

module.exports = ProductionDeploymentManager;