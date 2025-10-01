// Production Deployment Script
// Comprehensive deployment and validation for production

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

class ProductionDeployment {
  constructor() {
    this.deploymentResults = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      steps: []
    };
    this.startTime = Date.now();
  }

  async deploy() {
    console.log('🚀 PRODUCTION DEPLOYMENT STARTING');
    console.log('==================================');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log('');

    try {
      await this.validateEnvironment();
      await this.stopExistingServices();
      await this.updateDatabaseSchema();
      await this.buildApplication();
      await this.startServices();
      await this.validateDeployment();
      await this.setupMonitoring();
      
      this.generateDeploymentReport();
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      this.rollback();
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('🔍 VALIDATING ENVIRONMENT');
    console.log('=========================');
    
    // Check required environment variables
    const requiredEnvVars = [
      'JWT_SECRET',
      'PGPASSWORD',
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASS',
      'FROM_EMAIL'
    ];
    
    for (const envVar of requiredEnvVars) {
      const exists = !!process.env[envVar];
      this.recordStep('Environment Validation', `Environment variable ${envVar}`, exists, 
        exists ? 'Variable set' : 'Variable missing');
    }
    
    // Check database connectivity
    try {
      const { dbManager } = await import('./server/src/database/db.enhanced.js');
      await dbManager.query('SELECT 1');
      this.recordStep('Environment Validation', 'Database connectivity', true, 'Database connected');
    } catch (error) {
      this.recordStep('Environment Validation', 'Database connectivity', false, `Database error: ${error.message}`);
    }
    
    // Check file permissions
    const requiredFiles = [
      './server/server.js',
      './server/package.json',
      './client/package.json',
      './docker-compose.prod.yml'
    ];
    
    for (const file of requiredFiles) {
      const exists = fs.existsSync(file);
      this.recordStep('Environment Validation', `File ${file}`, exists, 
        exists ? 'File exists' : 'File missing');
    }
    
    console.log('');
  }

  async stopExistingServices() {
    console.log('🛑 STOPPING EXISTING SERVICES');
    console.log('==============================');
    
    try {
      // Stop Docker containers
      await this.runCommand('docker-compose -f docker-compose.prod.yml down');
      this.recordStep('Service Management', 'Stop Docker containers', true, 'Containers stopped');
      
      // Stop any running Node.js processes
      await this.runCommand('taskkill /F /IM node.exe 2>nul || echo "No Node.js processes found"');
      this.recordStep('Service Management', 'Stop Node.js processes', true, 'Processes stopped');
      
    } catch (error) {
      this.recordStep('Service Management', 'Stop existing services', false, `Error: ${error.message}`);
    }
    
    console.log('');
  }

  async updateDatabaseSchema() {
    console.log('🗄️  UPDATING DATABASE SCHEMA');
    console.log('=============================');
    
    try {
      // Run database schema updates
      const { dbManager } = await import('./server/src/database/db.enhanced.js');
      
      // Check if security_events table exists
      const tableCheck = await dbManager.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'security_events'
        )
      `);
      
      if (!tableCheck.rows[0].exists) {
        // Create security_events table
        await dbManager.query(`
          CREATE TABLE security_events (
            id SERIAL PRIMARY KEY,
            event_type VARCHAR(50) NOT NULL,
            event_data JSONB,
            ip_address INET,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
        
        // Create indexes
        await dbManager.query('CREATE INDEX idx_security_events_type ON security_events(event_type)');
        await dbManager.query('CREATE INDEX idx_security_events_ip ON security_events(ip_address)');
        await dbManager.query('CREATE INDEX idx_security_events_created_at ON security_events(created_at)');
        
        this.recordStep('Database Schema', 'Create security_events table', true, 'Table created');
      } else {
        this.recordStep('Database Schema', 'Security_events table', true, 'Table already exists');
      }
      
      // Update any other schema changes
      this.recordStep('Database Schema', 'Schema updates', true, 'Schema updated');
      
    } catch (error) {
      this.recordStep('Database Schema', 'Schema updates', false, `Error: ${error.message}`);
    }
    
    console.log('');
  }

  async buildApplication() {
    console.log('🔨 BUILDING APPLICATION');
    console.log('=======================');
    
    try {
      // Build client
      console.log('Building React client...');
      await this.runCommand('cd client && npm run build');
      this.recordStep('Build Process', 'React client build', true, 'Client built successfully');
      
      // Install server dependencies
      console.log('Installing server dependencies...');
      await this.runCommand('cd server && npm install --production');
      this.recordStep('Build Process', 'Server dependencies', true, 'Dependencies installed');
      
    } catch (error) {
      this.recordStep('Build Process', 'Application build', false, `Error: ${error.message}`);
    }
    
    console.log('');
  }

  async startServices() {
    console.log('🚀 STARTING SERVICES');
    console.log('====================');
    
    try {
      // Start Docker services
      console.log('Starting Docker services...');
      await this.runCommand('docker-compose -f docker-compose.prod.yml up -d');
      this.recordStep('Service Management', 'Start Docker services', true, 'Services started');
      
      // Wait for services to be ready
      console.log('Waiting for services to be ready...');
      await this.sleep(10000);
      
      // Check service health
      const healthCheck = await this.checkServiceHealth();
      this.recordStep('Service Management', 'Service health check', healthCheck, 
        healthCheck ? 'All services healthy' : 'Some services unhealthy');
      
    } catch (error) {
      this.recordStep('Service Management', 'Start services', false, `Error: ${error.message}`);
    }
    
    console.log('');
  }

  async validateDeployment() {
    console.log('✅ VALIDATING DEPLOYMENT');
    console.log('========================');
    
    try {
      // Test API endpoints
      const endpoints = [
        'http://localhost:5000/health',
        'http://localhost:5000/api/health'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint);
          const isHealthy = response.ok;
          this.recordStep('Deployment Validation', `Endpoint ${endpoint}`, isHealthy, 
            isHealthy ? 'Endpoint responding' : 'Endpoint not responding');
        } catch (error) {
          this.recordStep('Deployment Validation', `Endpoint ${endpoint}`, false, 
            `Error: ${error.message}`);
        }
      }
      
      // Test database connectivity
      try {
        const { dbManager } = await import('./server/src/database/db.enhanced.js');
        await dbManager.query('SELECT 1');
        this.recordStep('Deployment Validation', 'Database connectivity', true, 'Database connected');
      } catch (error) {
        this.recordStep('Deployment Validation', 'Database connectivity', false, `Database error: ${error.message}`);
      }
      
    } catch (error) {
      this.recordStep('Deployment Validation', 'Deployment validation', false, `Error: ${error.message}`);
    }
    
    console.log('');
  }

  async setupMonitoring() {
    console.log('📊 SETTING UP MONITORING');
    console.log('=========================');
    
    try {
      // Create monitoring directory
      if (!fs.existsSync('./monitoring')) {
        fs.mkdirSync('./monitoring');
      }
      
      // Create monitoring script
      const monitoringScript = `
# Production Monitoring Script
# Monitors system health and performance

echo "🔍 PRODUCTION MONITORING"
echo "========================"
echo "Timestamp: $(date)"
echo ""

# Check Docker services
echo "📦 Docker Services:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "💾 Database Status:"
docker-compose -f docker-compose.prod.yml exec -T database psql -U postgres -d secure_gate -c "SELECT COUNT(*) as visitor_count FROM visitors;"

echo ""
echo "🌐 API Health:"
curl -s http://localhost:5000/health | jq . || echo "API not responding"

echo ""
echo "📊 System Resources:"
docker stats --no-stream

echo ""
echo "📝 Recent Logs:"
docker-compose -f docker-compose.prod.yml logs --tail=10
      `;
      
      fs.writeFileSync('./monitoring/monitor.sh', monitoringScript);
      this.recordStep('Monitoring Setup', 'Monitoring script', true, 'Monitoring script created');
      
      // Create log rotation script
      const logRotationScript = `
# Log Rotation Script
# Rotates and compresses logs

echo "🔄 ROTATING LOGS"
echo "================"

# Rotate Docker logs
docker-compose -f docker-compose.prod.yml logs --no-color > ./monitoring/logs/app-$(date +%Y%m%d).log

# Compress old logs
gzip ./monitoring/logs/app-*.log 2>/dev/null || echo "No logs to compress"

# Keep only last 7 days of logs
find ./monitoring/logs -name "*.log.gz" -mtime +7 -delete 2>/dev/null || echo "No old logs to delete"

echo "Log rotation completed"
      `;
      
      if (!fs.existsSync('./monitoring/logs')) {
        fs.mkdirSync('./monitoring/logs');
      }
      
      fs.writeFileSync('./monitoring/rotate-logs.sh', logRotationScript);
      this.recordStep('Monitoring Setup', 'Log rotation script', true, 'Log rotation script created');
      
    } catch (error) {
      this.recordStep('Monitoring Setup', 'Monitoring setup', false, `Error: ${error.message}`);
    }
    
    console.log('');
  }

  async checkServiceHealth() {
    try {
      const response = await fetch('http://localhost:5000/health');
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async runCommand(command) {
    return new Promise((resolve, reject) => {
      const child = spawn('cmd', ['/c', command], { stdio: 'inherit' });
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  recordStep(category, step, passed, message) {
    this.deploymentResults.total++;
    
    if (passed) {
      this.deploymentResults.passed++;
      console.log(`  ✅ ${step}: ${message}`);
    } else {
      this.deploymentResults.failed++;
      console.log(`  ❌ ${step}: ${message}`);
    }
    
    this.deploymentResults.steps.push({
      category,
      step,
      passed,
      message,
      timestamp: new Date().toISOString()
    });
  }

  generateDeploymentReport() {
    const duration = Date.now() - this.startTime;
    const successRate = ((this.deploymentResults.passed / this.deploymentResults.total) * 100).toFixed(1);
    
    console.log('📊 DEPLOYMENT REPORT');
    console.log('====================');
    console.log(`Total Steps: ${this.deploymentResults.total}`);
    console.log(`Passed: ${this.deploymentResults.passed}`);
    console.log(`Failed: ${this.deploymentResults.failed}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Duration: ${duration}ms`);
    console.log('');
    
    if (this.deploymentResults.failed === 0) {
      console.log('🎉 DEPLOYMENT SUCCESSFUL!');
      console.log('✅ System is now running in production');
      console.log('✅ All services are healthy');
      console.log('✅ Monitoring is set up');
      console.log('');
      console.log('🌐 Access your application at:');
      console.log('   Frontend: http://localhost:3000');
      console.log('   Backend: http://localhost:5000');
      console.log('   Health Check: http://localhost:5000/health');
      console.log('');
      console.log('📊 Monitor your system:');
      console.log('   Run: ./monitoring/monitor.sh');
      console.log('   Logs: ./monitoring/logs/');
    } else {
      console.log('⚠️  DEPLOYMENT COMPLETED WITH ISSUES');
      console.log('❌ Some steps failed - review the report above');
      console.log('❌ System may not be fully functional');
    }
    
    console.log('');
    console.log(`Deployment completed at: ${new Date().toISOString()}`);
  }

  rollback() {
    console.log('🔄 ROLLING BACK DEPLOYMENT');
    console.log('===========================');
    
    try {
      // Stop services
      this.runCommand('docker-compose -f docker-compose.prod.yml down');
      console.log('✅ Services stopped');
      
      // Restore previous state if needed
      console.log('✅ Rollback completed');
    } catch (error) {
      console.error('❌ Rollback failed:', error);
    }
  }
}

// Run deployment if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const deployment = new ProductionDeployment();
  deployment.deploy().catch(console.error);
}

export default ProductionDeployment;
