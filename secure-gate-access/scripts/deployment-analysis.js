#!/usr/bin/env node

/**
 * Deployment Analysis Script
 * 
 * This script analyzes the current system state and provides deployment recommendations
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

class DeploymentAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.analysisResults = {
      systemStatus: {},
      deploymentOptions: [],
      missingComponents: [],
      recommendations: [],
      criticalIssues: [],
      warnings: []
    };
  }

  /**
   * Check system requirements
   */
  checkSystemRequirements() {
    console.log(`${colors.blue}🔍 Checking system requirements...${colors.reset}`);
    
    const requirements = {
      node: false,
      npm: false,
      docker: false,
      dockerCompose: false,
      git: false,
      ssh: false
    };

    try {
      // Check Node.js
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      requirements.node = true;
      console.log(`   ${colors.green}✓${colors.reset} Node.js: ${nodeVersion}`);
    } catch (error) {
      console.log(`   ${colors.red}✗${colors.reset} Node.js: Not installed`);
      this.analysisResults.criticalIssues.push('Node.js is required but not installed');
    }

    try {
      // Check npm
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      requirements.npm = true;
      console.log(`   ${colors.green}✓${colors.reset} npm: ${npmVersion}`);
    } catch (error) {
      console.log(`   ${colors.red}✗${colors.reset} npm: Not installed`);
    }

    try {
      // Check Docker
      const dockerVersion = execSync('docker --version', { encoding: 'utf8' }).trim();
      requirements.docker = true;
      console.log(`   ${colors.green}✓${colors.reset} Docker: ${dockerVersion}`);
    } catch (error) {
      console.log(`   ${colors.red}✗${colors.reset} Docker: Not installed`);
      this.analysisResults.criticalIssues.push('Docker is required for containerized deployment');
    }

    try {
      // Check Docker Compose
      const dockerComposeVersion = execSync('docker-compose --version', { encoding: 'utf8' }).trim();
      requirements.dockerCompose = true;
      console.log(`   ${colors.green}✓${colors.reset} Docker Compose: ${dockerComposeVersion}`);
    } catch (error) {
      console.log(`   ${colors.red}✗${colors.reset} Docker Compose: Not installed`);
    }

    try {
      // Check Git
      const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
      requirements.git = true;
      console.log(`   ${colors.green}✓${colors.reset} Git: ${gitVersion}`);
    } catch (error) {
      console.log(`   ${colors.red}✗${colors.reset} Git: Not installed`);
    }

    // Check SSH keys
    try {
      const sshKeys = execSync('ls ~/.ssh/id_* 2>/dev/null || echo "none"', { encoding: 'utf8' }).trim();
      if (sshKeys !== 'none') {
        requirements.ssh = true;
        console.log(`   ${colors.green}✓${colors.reset} SSH Keys: Available`);
      } else {
        console.log(`   ${colors.yellow}⚠${colors.reset} SSH Keys: Not found (required for remote deployment)`);
        this.analysisResults.warnings.push('SSH keys not found - required for remote server deployment');
      }
    } catch (error) {
      console.log(`   ${colors.yellow}⚠${colors.reset} SSH Keys: Not accessible`);
    }

    this.analysisResults.systemStatus = requirements;
    return requirements;
  }

  /**
   * Analyze project structure
   */
  analyzeProjectStructure() {
    console.log(`${colors.blue}📁 Analyzing project structure...${colors.reset}`);
    
    const structure = {
      client: false,
      server: false,
      docker: false,
      scripts: false,
      monitoring: false,
      nginx: false,
      ssl: false
    };

    // Check client directory
    if (fs.existsSync(path.join(this.projectRoot, 'client'))) {
      structure.client = true;
      console.log(`   ${colors.green}✓${colors.reset} Client directory: Present`);
    } else {
      console.log(`   ${colors.red}✗${colors.reset} Client directory: Missing`);
      this.analysisResults.criticalIssues.push('Client directory is missing');
    }

    // Check server directory
    if (fs.existsSync(path.join(this.projectRoot, 'server'))) {
      structure.server = true;
      console.log(`   ${colors.green}✓${colors.reset} Server directory: Present`);
    } else {
      console.log(`   ${colors.red}✗${colors.reset} Server directory: Missing`);
      this.analysisResults.criticalIssues.push('Server directory is missing');
    }

    // Check Docker files
    const dockerFiles = ['docker-compose.prod.yml', 'client/Dockerfile.prod', 'server/Dockerfile.prod'];
    let dockerCount = 0;
    for (const file of dockerFiles) {
      if (fs.existsSync(path.join(this.projectRoot, file))) {
        dockerCount++;
      }
    }
    
    if (dockerCount === dockerFiles.length) {
      structure.docker = true;
      console.log(`   ${colors.green}✓${colors.reset} Docker configuration: Complete`);
    } else {
      console.log(`   ${colors.yellow}⚠${colors.reset} Docker configuration: Partial (${dockerCount}/${dockerFiles.length} files)`);
      this.analysisResults.warnings.push(`Docker configuration incomplete - ${dockerFiles.length - dockerCount} files missing`);
    }

    // Check scripts directory
    if (fs.existsSync(path.join(this.projectRoot, 'scripts'))) {
      structure.scripts = true;
      const scriptCount = fs.readdirSync(path.join(this.projectRoot, 'scripts')).length;
      console.log(`   ${colors.green}✓${colors.reset} Scripts directory: Present (${scriptCount} scripts)`);
    } else {
      console.log(`   ${colors.red}✗${colors.reset} Scripts directory: Missing`);
    }

    // Check monitoring configuration
    if (fs.existsSync(path.join(this.projectRoot, 'monitoring'))) {
      structure.monitoring = true;
      console.log(`   ${colors.green}✓${colors.reset} Monitoring configuration: Present`);
    } else {
      console.log(`   ${colors.yellow}⚠${colors.reset} Monitoring configuration: Missing`);
    }

    // Check Nginx configuration
    if (fs.existsSync(path.join(this.projectRoot, 'nginx'))) {
      structure.nginx = true;
      console.log(`   ${colors.green}✓${colors.reset} Nginx configuration: Present`);
    } else {
      console.log(`   ${colors.red}✗${colors.reset} Nginx configuration: Missing`);
    }

    // Check SSL directory
    if (fs.existsSync(path.join(this.projectRoot, 'nginx/ssl'))) {
      structure.ssl = true;
      console.log(`   ${colors.green}✓${colors.reset} SSL certificates: Present`);
    } else {
      console.log(`   ${colors.yellow}⚠${colors.reset} SSL certificates: Missing`);
      this.analysisResults.warnings.push('SSL certificates not found - HTTPS deployment will require certificate setup');
    }

    return structure;
  }

  /**
   * Check environment configuration
   */
  checkEnvironmentConfiguration() {
    console.log(`${colors.blue}🔧 Checking environment configuration...${colors.reset}`);
    
    const envFile = path.join(this.projectRoot, '.env.production');
    if (fs.existsSync(envFile)) {
      console.log(`   ${colors.green}✓${colors.reset} Production environment file: Present`);
      
      // Read and analyze environment variables
      const envContent = fs.readFileSync(envFile, 'utf8');
      const requiredVars = [
        'NODE_ENV', 'PORT', 'DB_HOST', 'DB_PORT', 'DB_NAME', 
        'DB_USER', 'DB_PASSWORD', 'JWT_SECRET', 'REDIS_URL'
      ];
      
      let missingVars = [];
      for (const varName of requiredVars) {
        if (!envContent.includes(`${varName}=`)) {
          missingVars.push(varName);
        }
      }
      
      if (missingVars.length === 0) {
        console.log(`   ${colors.green}✓${colors.reset} Required environment variables: Complete`);
      } else {
        console.log(`   ${colors.red}✗${colors.reset} Missing environment variables: ${missingVars.join(', ')}`);
        this.analysisResults.criticalIssues.push(`Missing required environment variables: ${missingVars.join(', ')}`);
      }
    } else {
      console.log(`   ${colors.red}✗${colors.reset} Production environment file: Missing`);
      this.analysisResults.criticalIssues.push('Production environment file (.env.production) is missing');
    }
  }

  /**
   * Analyze deployment options
   */
  analyzeDeploymentOptions() {
    console.log(`${colors.blue}🚀 Analyzing deployment options...${colors.reset}`);
    
    const options = [];

    // Local Docker deployment
    if (this.analysisResults.systemStatus.docker && this.analysisResults.systemStatus.dockerCompose) {
      options.push({
        name: 'Local Docker Deployment',
        type: 'local',
        description: 'Deploy using Docker Compose on local machine',
        requirements: ['Docker', 'Docker Compose'],
        pros: ['Quick setup', 'No external dependencies', 'Easy testing'],
        cons: ['Not accessible externally', 'Limited scalability', 'No high availability'],
        difficulty: 'Easy',
        estimatedTime: '30 minutes',
        commands: [
          'docker-compose -f docker-compose.prod.yml up -d',
          'docker-compose logs -f'
        ]
      });
    }

    // Cloud deployment options
    const cloudProviders = [
      {
        name: 'AWS',
        services: ['EC2', 'ECS', 'Elastic Beanstalk', 'App Runner'],
        cost: 'Medium to High',
        complexity: 'Medium to High'
      },
      {
        name: 'Google Cloud Platform',
        services: ['Compute Engine', 'Cloud Run', 'App Engine'],
        cost: 'Medium',
        complexity: 'Medium'
      },
      {
        name: 'DigitalOcean',
        services: ['Droplets', 'App Platform', 'Kubernetes'],
        cost: 'Low to Medium',
        complexity: 'Low to Medium'
      },
      {
        name: 'Linode',
        services: ['Linodes', 'Kubernetes Engine'],
        cost: 'Low',
        complexity: 'Low to Medium'
      },
      {
        name: 'Railway',
        services: ['Railway App'],
        cost: 'Low to Medium',
        complexity: 'Low'
      },
      {
        name: 'Render',
        services: ['Web Services', 'Background Workers'],
        cost: 'Low to Medium',
        complexity: 'Low'
      }
    ];

    for (const provider of cloudProviders) {
      options.push({
        name: `${provider.name} Deployment`,
        type: 'cloud',
        description: `Deploy to ${provider.name} using container services`,
        requirements: [`${provider.name} account`, 'Docker knowledge', 'Domain name (optional)'],
        pros: ['Scalable', 'High availability', 'External access', 'Managed services'],
        cons: ['Cost', 'Complexity', 'Vendor lock-in'],
        difficulty: provider.complexity,
        estimatedTime: '2-4 hours',
        setupSteps: [
          `Create ${provider.name} account`,
          'Configure container registry',
          'Set up environment variables',
          'Deploy using provider CLI or dashboard',
          'Configure domain and SSL'
        ]
      });
    }

    // VPS deployment
    options.push({
      name: 'VPS Deployment',
      type: 'vps',
      description: 'Deploy to Virtual Private Server (VPS)',
      requirements: ['VPS provider account', 'SSH access', 'Domain name'],
      pros: ['Full control', 'Cost effective', 'Customizable'],
      cons: ['Manual setup', 'No managed services', 'Requires maintenance'],
      difficulty: 'Medium',
      estimatedTime: '3-5 hours',
      setupSteps: [
        'Provision VPS (Ubuntu 20.04+ recommended)',
        'Install Docker and Docker Compose',
        'Clone repository',
        'Configure environment variables',
        'Set up SSL certificates',
        'Configure domain and DNS',
        'Deploy application'
      ]
    });

    this.analysisResults.deploymentOptions = options;
    return options;
  }

  /**
   * Identify missing components
   */
  identifyMissingComponents() {
    console.log(`${colors.blue}🔍 Identifying missing components...${colors.reset}`);
    
    const missing = [];

    // Check for blue-green deployment files
    const blueGreenFiles = [
      'docker-compose.blue.yml',
      'docker-compose.green.yml',
      'deployment/blue-green-deploy.sh'
    ];

    for (const file of blueGreenFiles) {
      if (!fs.existsSync(path.join(this.projectRoot, file))) {
        missing.push(file);
      }
    }

    if (missing.length > 0) {
      console.log(`   ${colors.yellow}⚠${colors.reset} Blue-green deployment files missing: ${missing.join(', ')}`);
      this.analysisResults.warnings.push('Blue-green deployment files missing');
    }

    // Check for smoke tests
    const smokeTestFiles = [
      'deployment/smoke-tests.sh',
      'tests/smoke/'
    ];

    let smokeTestsMissing = true;
    for (const file of smokeTestFiles) {
      if (fs.existsSync(path.join(this.projectRoot, file))) {
        smokeTestsMissing = false;
        break;
      }
    }

    if (smokeTestsMissing) {
      console.log(`   ${colors.yellow}⚠${colors.reset} Smoke tests missing`);
      this.analysisResults.warnings.push('Smoke tests not found');
    }

    // Check for deployment documentation
    const docFiles = [
      'DEPLOYMENT_GUIDE.md',
      'deployment/CI-CD-DOCUMENTATION.md'
    ];

    for (const file of docFiles) {
      if (!fs.existsSync(path.join(this.projectRoot, file))) {
        missing.push(file);
      }
    }

    if (missing.length > 0) {
      console.log(`   ${colors.yellow}⚠${colors.reset} Documentation files missing: ${missing.join(', ')}`);
    }

    this.analysisResults.missingComponents = missing;
    return missing;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    console.log(`${colors.blue}💡 Generating recommendations...${colors.reset}`);
    
    const recommendations = [];

    // Critical issues recommendations
    if (this.analysisResults.criticalIssues.length > 0) {
      recommendations.push({
        priority: 'Critical',
        action: 'Fix critical issues before deployment',
        details: this.analysisResults.criticalIssues
      });
    }

    // SSH key recommendations
    if (!this.analysisResults.systemStatus.ssh) {
      recommendations.push({
        priority: 'High',
        action: 'Generate SSH key pair for remote deployment',
        details: [
          'Run: ssh-keygen -t ed25519 -C "your-email@example.com"',
          'Add public key to cloud provider or VPS',
          'Test SSH connection before deployment'
        ]
      });
    }

    // Environment configuration recommendations
    recommendations.push({
      priority: 'High',
      action: 'Complete environment configuration',
      details: [
        'Fill in all required environment variables',
        'Generate secure secrets for production',
        'Configure database and Redis connections',
        'Set up SSL certificate paths'
      ]
    });

    // Deployment strategy recommendations
    recommendations.push({
      priority: 'Medium',
      action: 'Choose appropriate deployment strategy',
      details: [
        'For testing: Use local Docker deployment',
        'For production: Consider cloud provider with managed services',
        'For cost optimization: Use VPS with manual setup'
      ]
    });

    // Security recommendations
    recommendations.push({
      priority: 'High',
      action: 'Implement security measures',
      details: [
        'Set up SSL certificates',
        'Configure firewall rules',
        'Enable security headers',
        'Set up monitoring and alerting'
      ]
    });

    this.analysisResults.recommendations = recommendations;
    return recommendations;
  }

  /**
   * Generate deployment analysis report
   */
  generateReport() {
    console.log(`${colors.blue}📋 Generating deployment analysis report...${colors.reset}`);
    
    const report = {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      systemStatus: this.analysisResults.systemStatus,
      deploymentOptions: this.analysisResults.deploymentOptions,
      missingComponents: this.analysisResults.missingComponents,
      recommendations: this.analysisResults.recommendations,
      criticalIssues: this.analysisResults.criticalIssues,
      warnings: this.analysisResults.warnings,
      deploymentReadiness: this.calculateDeploymentReadiness()
    };

    console.log(`${colors.green}✓${colors.reset} Deployment analysis report generated`);
    
    // Display summary
    console.log(`\n${colors.cyan}📊 Deployment Analysis Summary:${colors.reset}`);
    console.log(`   Deployment Readiness: ${report.deploymentReadiness.score}/100`);
    console.log(`   Critical Issues: ${report.criticalIssues.length}`);
    console.log(`   Warnings: ${report.warnings.length}`);
    console.log(`   Deployment Options: ${report.deploymentOptions.length}`);
    
    return report;
  }

  /**
   * Calculate deployment readiness score
   */
  calculateDeploymentReadiness() {
    let score = 100;
    
    // Deduct points for critical issues
    score -= this.analysisResults.criticalIssues.length * 20;
    
    // Deduct points for warnings
    score -= this.analysisResults.warnings.length * 5;
    
    // Deduct points for missing components
    score -= this.analysisResults.missingComponents.length * 3;
    
    // Ensure score doesn't go below 0
    score = Math.max(0, score);
    
    let status = 'NOT_READY';
    if (score >= 90) {
      status = 'READY';
    } else if (score >= 70) {
      status = 'READY_WITH_WARNINGS';
    }
    
    return { score, status };
  }

  /**
   * Save report to file
   */
  saveReportToFile(report) {
    const logsDir = path.join(this.projectRoot, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const reportFile = path.join(logsDir, `deployment-analysis-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`${colors.blue}   Report saved to: ${reportFile}${colors.reset}`);
    return reportFile;
  }

  /**
   * Display deployment options
   */
  displayDeploymentOptions(report) {
    console.log(`\n${colors.bright}${colors.blue}🚀 Available Deployment Options:${colors.reset}\n`);
    
    for (const option of report.deploymentOptions) {
      const statusColor = option.difficulty === 'Easy' ? colors.green : 
                         option.difficulty === 'Medium' ? colors.yellow : colors.red;
      
      console.log(`${colors.bright}${colors.cyan}${option.name}${colors.reset}`);
      console.log(`   Type: ${option.type}`);
      console.log(`   Description: ${option.description}`);
      console.log(`   Difficulty: ${statusColor}${option.difficulty}${colors.reset}`);
      console.log(`   Estimated Time: ${option.estimatedTime}`);
      console.log(`   Requirements: ${option.requirements.join(', ')}`);
      console.log(`   Pros: ${option.pros.join(', ')}`);
      console.log(`   Cons: ${option.cons.join(', ')}`);
      console.log('');
    }
  }

  /**
   * Display recommendations
   */
  displayRecommendations(report) {
    console.log(`\n${colors.bright}${colors.blue}💡 Recommendations:${colors.reset}\n`);
    
    for (const rec of report.recommendations) {
      const priorityColor = rec.priority === 'Critical' ? colors.red :
                           rec.priority === 'High' ? colors.yellow : colors.blue;
      
      console.log(`${priorityColor}${rec.priority}${colors.reset}: ${rec.action}`);
      for (const detail of rec.details) {
        console.log(`   • ${detail}`);
      }
      console.log('');
    }
  }

  /**
   * Run complete deployment analysis
   */
  run() {
    console.log(`${colors.bright}${colors.blue}🚀 Starting Deployment Analysis${colors.reset}\n`);
    console.log(`Project Root: ${this.projectRoot}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);
    
    try {
      this.checkSystemRequirements();
      console.log('');
      
      this.analyzeProjectStructure();
      console.log('');
      
      this.checkEnvironmentConfiguration();
      console.log('');
      
      this.analyzeDeploymentOptions();
      console.log('');
      
      this.identifyMissingComponents();
      console.log('');
      
      this.generateRecommendations();
      console.log('');
      
      const report = this.generateReport();
      this.saveReportToFile(report);
      
      this.displayDeploymentOptions(report);
      this.displayRecommendations(report);
      
      console.log(`${colors.bright}${colors.green}🎉 Deployment analysis completed!${colors.reset}`);
      
      if (report.deploymentReadiness.status === 'READY') {
        console.log(`\n${colors.bright}${colors.green}✅ System is READY for deployment!${colors.reset}`);
      } else if (report.deploymentReadiness.status === 'READY_WITH_WARNINGS') {
        console.log(`\n${colors.bright}${colors.yellow}⚠️ System is ready for deployment with warnings${colors.reset}`);
      } else {
        console.log(`\n${colors.bright}${colors.red}❌ System needs attention before deployment${colors.reset}`);
      }
      
      return report;
    } catch (error) {
      console.log(`\n${colors.red}❌ Deployment analysis failed: ${error.message}${colors.reset}`);
      throw error;
    }
  }
}

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new DeploymentAnalyzer();
  try {
    analyzer.run();
  } catch (error) {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

export default DeploymentAnalyzer;
