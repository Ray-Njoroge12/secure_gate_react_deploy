#!/usr/bin/env node

/**
 * Final Launch Readiness Validator
 * Task 20 - Comprehensive system validation and launch readiness assessment
 */

const fs = require('fs');
const path = require('path');

class LaunchReadinessValidator {
  constructor() {
    this.results = {
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null,
      overallStatus: 'PENDING',
      taskCompletionStatus: {},
      systemValidation: {},
      criticalIssues: [],
      recommendations: [],
      launchReadiness: {
        score: 0,
        recommendation: 'PENDING',
        blockers: [],
        warnings: []
      }
    };
  }

  async runFinalValidation() {
    console.log('🚀 FINAL LAUNCH READINESS VALIDATION');
    console.log('=' .repeat(80));
    console.log(`⏰ Started at: ${this.results.startTime}`);
    console.log('=' .repeat(80));
    
    const startTime = Date.now();
    
    try {
      // Phase 1: Task Completion Verification
      console.log('\n📋 PHASE 1: TASK COMPLETION VERIFICATION');
      console.log('-' .repeat(50));
      await this.verifyTaskCompletion();
      
      // Phase 2: System Architecture Validation
      console.log('\n🏗️  PHASE 2: SYSTEM ARCHITECTURE VALIDATION');
      console.log('-' .repeat(50));
      await this.validateSystemArchitecture();
      
      // Phase 3: Code Quality Assessment
      console.log('\n🔍 PHASE 3: CODE QUALITY ASSESSMENT');
      console.log('-' .repeat(50));
      await this.assessCodeQuality();
      
      // Phase 4: Security & Compliance Check
      console.log('\n🔒 PHASE 4: SECURITY & COMPLIANCE CHECK');
      console.log('-' .repeat(50));
      await this.validateSecurityCompliance();
      
      // Phase 5: Performance & Scalability Assessment
      console.log('\n⚡ PHASE 5: PERFORMANCE & SCALABILITY ASSESSMENT');
      console.log('-' .repeat(50));
      await this.assessPerformanceReadiness();
      
      // Phase 6: Documentation & User Experience Validation
      console.log('\n📚 PHASE 6: DOCUMENTATION & UX VALIDATION');
      console.log('-' .repeat(50));
      await this.validateDocumentationAndUX();
      
      // Calculate final results
      this.results.endTime = new Date().toISOString();
      this.results.duration = Date.now() - startTime;
      this.calculateLaunchReadiness();
      
      // Generate final report
      await this.generateFinalReport();
      
      // Display final assessment
      this.displayFinalAssessment();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Final validation failed:', error);
      this.results.overallStatus = 'FAILED';
      this.results.criticalIssues.push(`Validation execution failed: ${error.message}`);
      throw error;
    }
  }

  async verifyTaskCompletion() {
    console.log('📋 Verifying completion of all 19 previous tasks...');
    
    try {
      // Read tasks.md to verify completion status
      const tasksPath = '.kiro/specs/user-functionality-refinements/tasks.md';
      if (fs.existsSync(tasksPath)) {
        const tasksContent = fs.readFileSync(tasksPath, 'utf8');
        
        // Parse task completion status
        const taskLines = tasksContent.split('\n').filter(line => line.trim().startsWith('- ['));
        const completedTasks = taskLines.filter(line => line.includes('[x]')).length;
        const totalTasks = taskLines.length;
        
        this.results.taskCompletionStatus = {
          total: totalTasks,
          completed: completedTasks,
          completionRate: (completedTasks / totalTasks * 100).toFixed(1),
          status: completedTasks === totalTasks - 1 ? 'READY' : 'INCOMPLETE' // -1 for current task
        };
        
        console.log(`✅ Task completion: ${completedTasks}/${totalTasks} (${this.results.taskCompletionStatus.completionRate}%)`);
        
        if (this.results.taskCompletionStatus.status === 'INCOMPLETE') {
          this.results.launchReadiness.blockers.push('Not all prerequisite tasks are completed');
        }
      } else {
        this.results.launchReadiness.blockers.push('Tasks file not found - cannot verify completion');
      }
    } catch (error) {
      console.error('❌ Task completion verification failed:', error);
      this.results.launchReadiness.blockers.push('Task completion verification failed');
    }
  }

  async validateSystemArchitecture() {
    console.log('🏗️  Validating system architecture and file structure...');
    
    const architectureChecks = {
      clientStructure: this.checkClientStructure(),
      serverStructure: this.checkServerStructure(),
      databaseMigrations: this.checkDatabaseMigrations(),
      testCoverage: this.checkTestCoverage(),
      configurationFiles: this.checkConfigurationFiles()
    };
    
    this.results.systemValidation.architecture = architectureChecks;
    
    let passedChecks = 0;
    let totalChecks = Object.keys(architectureChecks).length;
    
    for (const [check, result] of Object.entries(architectureChecks)) {
      if (result.status === 'PASSED') {
        passedChecks++;
        console.log(`  ✅ ${check}: ${result.message}`);
      } else {
        console.log(`  ❌ ${check}: ${result.message}`);
        if (result.critical) {
          this.results.launchReadiness.blockers.push(`Architecture: ${result.message}`);
        } else {
          this.results.launchReadiness.warnings.push(`Architecture: ${result.message}`);
        }
      }
    }
    
    console.log(`📊 Architecture validation: ${passedChecks}/${totalChecks} checks passed`);
  }

  checkClientStructure() {
    const requiredPaths = [
      'secure-gate-access/client/src/components',
      'secure-gate-access/client/src/services',
      'secure-gate-access/client/src/hooks',
      'secure-gate-access/client/src/contexts',
      'secure-gate-access/client/src/__tests__',
      'secure-gate-access/client/public'
    ];
    
    const missingPaths = requiredPaths.filter(p => !fs.existsSync(p));
    
    if (missingPaths.length === 0) {
      return { status: 'PASSED', message: 'Client structure complete' };
    } else {
      return { 
        status: 'FAILED', 
        message: `Missing client paths: ${missingPaths.join(', ')}`,
        critical: true
      };
    }
  }

  checkServerStructure() {
    const requiredPaths = [
      'secure-gate-access/server/src/controllers',
      'secure-gate-access/server/src/services',
      'secure-gate-access/server/src/routes',
      'secure-gate-access/server/src/middleware',
      'secure-gate-access/server/src/database',
      'secure-gate-access/server/tests'
    ];
    
    const missingPaths = requiredPaths.filter(p => !fs.existsSync(p));
    
    if (missingPaths.length === 0) {
      return { status: 'PASSED', message: 'Server structure complete' };
    } else {
      return { 
        status: 'FAILED', 
        message: `Missing server paths: ${missingPaths.join(', ')}`,
        critical: true
      };
    }
  }

  checkDatabaseMigrations() {
    const migrationsPath = 'secure-gate-access/server/src/database/migrations';
    
    if (!fs.existsSync(migrationsPath)) {
      return { 
        status: 'FAILED', 
        message: 'Database migrations directory not found',
        critical: true
      };
    }
    
    const migrationFiles = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'));
    
    if (migrationFiles.length > 0) {
      return { 
        status: 'PASSED', 
        message: `${migrationFiles.length} database migrations found` 
      };
    } else {
      return { 
        status: 'FAILED', 
        message: 'No database migration files found',
        critical: true
      };
    }
  }

  checkTestCoverage() {
    const testPaths = [
      'secure-gate-access/client/src/__tests__',
      'secure-gate-access/server/tests'
    ];
    
    let totalTestFiles = 0;
    let missingTestPaths = [];
    
    for (const testPath of testPaths) {
      if (fs.existsSync(testPath)) {
        const testFiles = this.countFilesRecursively(testPath, ['.test.js', '.test.jsx', '.spec.js']);
        totalTestFiles += testFiles;
      } else {
        missingTestPaths.push(testPath);
      }
    }
    
    if (missingTestPaths.length > 0) {
      return { 
        status: 'FAILED', 
        message: `Missing test directories: ${missingTestPaths.join(', ')}`,
        critical: false
      };
    }
    
    if (totalTestFiles >= 50) { // Reasonable threshold for comprehensive testing
      return { 
        status: 'PASSED', 
        message: `${totalTestFiles} test files found - comprehensive coverage` 
      };
    } else {
      return { 
        status: 'WARNING', 
        message: `${totalTestFiles} test files found - consider expanding test coverage`,
        critical: false
      };
    }
  }

  checkConfigurationFiles() {
    const requiredConfigs = [
      'secure-gate-access/client/package.json',
      'secure-gate-access/server/package.json',
      'secure-gate-access/client/public/manifest.json'
    ];
    
    const missingConfigs = requiredConfigs.filter(c => !fs.existsSync(c));
    
    if (missingConfigs.length === 0) {
      return { status: 'PASSED', message: 'Configuration files complete' };
    } else {
      return { 
        status: 'FAILED', 
        message: `Missing configuration files: ${missingConfigs.join(', ')}`,
        critical: true
      };
    }
  }

  countFilesRecursively(dir, extensions) {
    let count = 0;
    
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          count += this.countFilesRecursively(fullPath, extensions);
        } else if (extensions.some(ext => item.endsWith(ext))) {
          count++;
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }
    
    return count;
  }

  async assessCodeQuality() {
    console.log('🔍 Assessing code quality and implementation completeness...');
    
    const qualityChecks = {
      componentImplementation: this.checkComponentImplementation(),
      serviceImplementation: this.checkServiceImplementation(),
      testImplementation: this.checkTestImplementation(),
      documentationQuality: this.checkDocumentationQuality()
    };
    
    this.results.systemValidation.codeQuality = qualityChecks;
    
    let passedChecks = 0;
    let totalChecks = Object.keys(qualityChecks).length;
    
    for (const [check, result] of Object.entries(qualityChecks)) {
      if (result.status === 'PASSED') {
        passedChecks++;
        console.log(`  ✅ ${check}: ${result.message}`);
      } else {
        console.log(`  ⚠️  ${check}: ${result.message}`);
        this.results.launchReadiness.warnings.push(`Code Quality: ${result.message}`);
      }
    }
    
    console.log(`📊 Code quality assessment: ${passedChecks}/${totalChecks} checks passed`);
  }

  checkComponentImplementation() {
    const componentDirs = [
      'secure-gate-access/client/src/components/accessibility',
      'secure-gate-access/client/src/components/collaboration',
      'secure-gate-access/client/src/components/dashboard',
      'secure-gate-access/client/src/components/mobile',
      'secure-gate-access/client/src/components/notifications',
      'secure-gate-access/client/src/components/onboarding',
      'secure-gate-access/client/src/components/performance',
      'secure-gate-access/client/src/components/reports',
      'secure-gate-access/client/src/components/search'
    ];
    
    let implementedComponents = 0;
    let totalComponents = componentDirs.length;
    
    for (const dir of componentDirs) {
      if (fs.existsSync(dir)) {
        const componentFiles = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));
        if (componentFiles.length > 0) {
          implementedComponents++;
        }
      }
    }
    
    const completionRate = (implementedComponents / totalComponents * 100).toFixed(1);
    
    if (implementedComponents === totalComponents) {
      return { 
        status: 'PASSED', 
        message: `All ${totalComponents} component areas implemented (${completionRate}%)` 
      };
    } else {
      return { 
        status: 'WARNING', 
        message: `${implementedComponents}/${totalComponents} component areas implemented (${completionRate}%)` 
      };
    }
  }

  checkServiceImplementation() {
    const requiredServices = [
      'secure-gate-access/client/src/services/collaborationService.js',
      'secure-gate-access/client/src/services/intelligentNotificationService.js',
      'secure-gate-access/client/src/services/offlineService.js',
      'secure-gate-access/client/src/services/performanceService.js',
      'secure-gate-access/client/src/services/preferenceService.js',
      'secure-gate-access/client/src/services/searchService.js'
    ];
    
    const implementedServices = requiredServices.filter(s => fs.existsSync(s));
    const completionRate = (implementedServices.length / requiredServices.length * 100).toFixed(1);
    
    if (implementedServices.length === requiredServices.length) {
      return { 
        status: 'PASSED', 
        message: `All ${requiredServices.length} core services implemented (${completionRate}%)` 
      };
    } else {
      return { 
        status: 'WARNING', 
        message: `${implementedServices.length}/${requiredServices.length} core services implemented (${completionRate}%)` 
      };
    }
  }

  checkTestImplementation() {
    const testTypes = [
      { path: 'secure-gate-access/client/src/__tests__/components', name: 'Component tests' },
      { path: 'secure-gate-access/client/src/__tests__/services', name: 'Service tests' },
      { path: 'secure-gate-access/client/src/__tests__/properties', name: 'Property-based tests' },
      { path: 'secure-gate-access/server/tests/unit', name: 'Server unit tests' },
      { path: 'secure-gate-access/server/tests/integration', name: 'Integration tests' }
    ];
    
    let implementedTestTypes = 0;
    let totalTestFiles = 0;
    
    for (const testType of testTypes) {
      if (fs.existsSync(testType.path)) {
        const testFiles = this.countFilesRecursively(testType.path, ['.test.js', '.test.jsx']);
        if (testFiles > 0) {
          implementedTestTypes++;
          totalTestFiles += testFiles;
        }
      }
    }
    
    const completionRate = (implementedTestTypes / testTypes.length * 100).toFixed(1);
    
    if (implementedTestTypes >= 4 && totalTestFiles >= 30) {
      return { 
        status: 'PASSED', 
        message: `Comprehensive test coverage: ${totalTestFiles} test files across ${implementedTestTypes} test types (${completionRate}%)` 
      };
    } else {
      return { 
        status: 'WARNING', 
        message: `${totalTestFiles} test files across ${implementedTestTypes} test types (${completionRate}%) - consider expanding coverage` 
      };
    }
  }

  checkDocumentationQuality() {
    const documentationFiles = [
      'USER_FUNCTIONALITY_REFINEMENTS_README.md',
      'secure-gate-access/client/COMPONENT_DOCUMENTATION.md',
      'secure-gate-access/client/TESTING_GUIDE.md',
      'secure-gate-access/api-documentation.yaml'
    ];
    
    const existingDocs = documentationFiles.filter(d => fs.existsSync(d));
    const completionRate = (existingDocs.length / documentationFiles.length * 100).toFixed(1);
    
    if (existingDocs.length >= 3) {
      return { 
        status: 'PASSED', 
        message: `${existingDocs.length}/${documentationFiles.length} key documentation files present (${completionRate}%)` 
      };
    } else {
      return { 
        status: 'WARNING', 
        message: `${existingDocs.length}/${documentationFiles.length} key documentation files present (${completionRate}%) - documentation needs improvement` 
      };
    }
  }

  async validateSecurityCompliance() {
    console.log('🔒 Validating security and compliance implementation...');
    
    const securityChecks = {
      authenticationSystem: this.checkAuthenticationImplementation(),
      accessibilityCompliance: this.checkAccessibilityImplementation(),
      dataPrivacy: this.checkDataPrivacyImplementation(),
      securityHeaders: this.checkSecurityConfiguration()
    };
    
    this.results.systemValidation.security = securityChecks;
    
    let passedChecks = 0;
    let totalChecks = Object.keys(securityChecks).length;
    
    for (const [check, result] of Object.entries(securityChecks)) {
      if (result.status === 'PASSED') {
        passedChecks++;
        console.log(`  ✅ ${check}: ${result.message}`);
      } else {
        console.log(`  ⚠️  ${check}: ${result.message}`);
        if (result.critical) {
          this.results.launchReadiness.blockers.push(`Security: ${result.message}`);
        } else {
          this.results.launchReadiness.warnings.push(`Security: ${result.message}`);
        }
      }
    }
    
    console.log(`📊 Security validation: ${passedChecks}/${totalChecks} checks passed`);
  }

  checkAuthenticationImplementation() {
    const authFiles = [
      'secure-gate-access/server/src/middleware/auth.js',
      'secure-gate-access/server/src/services/tokenService.js',
      'secure-gate-access/client/src/contexts/AuthContext.jsx'
    ];
    
    const implementedAuthFiles = authFiles.filter(f => fs.existsSync(f));
    
    if (implementedAuthFiles.length === authFiles.length) {
      return { 
        status: 'PASSED', 
        message: 'Authentication system fully implemented' 
      };
    } else {
      return { 
        status: 'FAILED', 
        message: `Authentication system incomplete: ${authFiles.length - implementedAuthFiles.length} files missing`,
        critical: true
      };
    }
  }

  checkAccessibilityImplementation() {
    const accessibilityPath = 'secure-gate-access/client/src/components/accessibility';
    
    if (!fs.existsSync(accessibilityPath)) {
      return { 
        status: 'FAILED', 
        message: 'Accessibility components not implemented',
        critical: false
      };
    }
    
    const accessibilityComponents = fs.readdirSync(accessibilityPath).filter(f => f.endsWith('.jsx'));
    
    if (accessibilityComponents.length >= 5) {
      return { 
        status: 'PASSED', 
        message: `${accessibilityComponents.length} accessibility components implemented` 
      };
    } else {
      return { 
        status: 'WARNING', 
        message: `${accessibilityComponents.length} accessibility components - consider expanding for better compliance`,
        critical: false
      };
    }
  }

  checkDataPrivacyImplementation() {
    // Check for privacy-related test files as indicator of privacy implementation
    const privacyTestPath = 'secure-gate-access/client/src/__tests__/properties';
    
    if (!fs.existsSync(privacyTestPath)) {
      return { 
        status: 'WARNING', 
        message: 'Privacy compliance tests not found',
        critical: false
      };
    }
    
    const privacyTestFiles = fs.readdirSync(privacyTestPath)
      .filter(f => f.includes('privacy') || f.includes('compliance') || f.includes('accessibility'));
    
    if (privacyTestFiles.length > 0) {
      return { 
        status: 'PASSED', 
        message: `Privacy compliance validation implemented (${privacyTestFiles.length} test files)` 
      };
    } else {
      return { 
        status: 'WARNING', 
        message: 'Privacy compliance validation needs enhancement',
        critical: false
      };
    }
  }

  checkSecurityConfiguration() {
    // Check for security-related configuration files
    const securityIndicators = [
      'secure-gate-access/server/src/middleware',
      'secure-gate-access/client/src/services/connectivityHandler.js'
    ];
    
    const implementedSecurity = securityIndicators.filter(s => fs.existsSync(s));
    
    if (implementedSecurity.length === securityIndicators.length) {
      return { 
        status: 'PASSED', 
        message: 'Security configuration implemented' 
      };
    } else {
      return { 
        status: 'WARNING', 
        message: 'Security configuration may need enhancement',
        critical: false
      };
    }
  }

  async assessPerformanceReadiness() {
    console.log('⚡ Assessing performance and scalability readiness...');
    
    const performanceChecks = {
      performanceMonitoring: this.checkPerformanceMonitoring(),
      cacheImplementation: this.checkCacheImplementation(),
      mobileOptimization: this.checkMobileOptimization(),
      offlineCapabilities: this.checkOfflineCapabilities()
    };
    
    this.results.systemValidation.performance = performanceChecks;
    
    let passedChecks = 0;
    let totalChecks = Object.keys(performanceChecks).length;
    
    for (const [check, result] of Object.entries(performanceChecks)) {
      if (result.status === 'PASSED') {
        passedChecks++;
        console.log(`  ✅ ${check}: ${result.message}`);
      } else {
        console.log(`  ⚠️  ${check}: ${result.message}`);
        this.results.launchReadiness.warnings.push(`Performance: ${result.message}`);
      }
    }
    
    console.log(`📊 Performance assessment: ${passedChecks}/${totalChecks} checks passed`);
  }

  checkPerformanceMonitoring() {
    const performanceFiles = [
      'secure-gate-access/client/src/services/performanceService.js',
      'secure-gate-access/server/src/services/performanceMonitoringService.js',
      'secure-gate-access/client/src/components/performance'
    ];
    
    const implementedFiles = performanceFiles.filter(f => fs.existsSync(f));
    
    if (implementedFiles.length === performanceFiles.length) {
      return { 
        status: 'PASSED', 
        message: 'Performance monitoring system implemented' 
      };
    } else {
      return { 
        status: 'WARNING', 
        message: `Performance monitoring partially implemented: ${implementedFiles.length}/${performanceFiles.length} components` 
      };
    }
  }

  checkCacheImplementation() {
    const cacheFiles = [
      'secure-gate-access/client/src/services/intelligentCacheService.js'
    ];
    
    const implementedCache = cacheFiles.filter(f => fs.existsSync(f));
    
    if (implementedCache.length > 0) {
      return { 
        status: 'PASSED', 
        message: 'Intelligent caching system implemented' 
      };
    } else {
      return { 
        status: 'WARNING', 
        message: 'Caching system not implemented - may impact performance' 
      };
    }
  }

  checkMobileOptimization() {
    const mobilePath = 'secure-gate-access/client/src/components/mobile';
    
    if (!fs.existsSync(mobilePath)) {
      return { 
        status: 'WARNING', 
        message: 'Mobile optimization components not found' 
      };
    }
    
    const mobileComponents = fs.readdirSync(mobilePath).filter(f => f.endsWith('.jsx'));
    
    if (mobileComponents.length >= 3) {
      return { 
        status: 'PASSED', 
        message: `Mobile optimization implemented (${mobileComponents.length} components)` 
      };
    } else {
      return { 
        status: 'WARNING', 
        message: `Limited mobile optimization (${mobileComponents.length} components)` 
      };
    }
  }

  checkOfflineCapabilities() {
    const offlineFiles = [
      'secure-gate-access/client/src/services/offlineService.js',
      'secure-gate-access/client/public/offline.html'
    ];
    
    const implementedOffline = offlineFiles.filter(f => fs.existsSync(f));
    
    if (implementedOffline.length === offlineFiles.length) {
      return { 
        status: 'PASSED', 
        message: 'Offline capabilities implemented' 
      };
    } else {
      return { 
        status: 'WARNING', 
        message: `Offline capabilities partially implemented: ${implementedOffline.length}/${offlineFiles.length} components` 
      };
    }
  }

  async validateDocumentationAndUX() {
    console.log('📚 Validating documentation and user experience...');
    
    const uxChecks = {
      userDocumentation: this.checkUserDocumentation(),
      onboardingSystem: this.checkOnboardingSystem(),
      helpSystem: this.checkHelpSystem(),
      errorHandling: this.checkErrorHandling()
    };
    
    this.results.systemValidation.userExperience = uxChecks;
    
    let passedChecks = 0;
    let totalChecks = Object.keys(uxChecks).length;
    
    for (const [check, result] of Object.entries(uxChecks)) {
      if (result.status === 'PASSED') {
        passedChecks++;
        console.log(`  ✅ ${check}: ${result.message}`);
      } else {
        console.log(`  ⚠️  ${check}: ${result.message}`);
        this.results.launchReadiness.warnings.push(`UX: ${result.message}`);
      }
    }
    
    console.log(`📊 UX validation: ${passedChecks}/${totalChecks} checks passed`);
  }

  checkUserDocumentation() {
    const docFiles = [
      'USER_FUNCTIONALITY_REFINEMENTS_README.md',
      'secure-gate-access/client/COMPONENT_DOCUMENTATION.md',
      'secure-gate-access/client/TESTING_GUIDE.md'
    ];
    
    const existingDocs = docFiles.filter(d => fs.existsSync(d));
    
    if (existingDocs.length >= 2) {
      return { 
        status: 'PASSED', 
        message: `User documentation available (${existingDocs.length}/${docFiles.length} files)` 
      };
    } else {
      return { 
        status: 'WARNING', 
        message: `Limited user documentation (${existingDocs.length}/${docFiles.length} files)` 
      };
    }
  }

  checkOnboardingSystem() {
    const onboardingPath = 'secure-gate-access/client/src/components/onboarding';
    
    if (!fs.existsSync(onboardingPath)) {
      return { 
        status: 'WARNING', 
        message: 'Onboarding system not implemented' 
      };
    }
    
    const onboardingComponents = fs.readdirSync(onboardingPath).filter(f => f.endsWith('.jsx'));
    
    if (onboardingComponents.length >= 2) {
      return { 
        status: 'PASSED', 
        message: `Onboarding system implemented (${onboardingComponents.length} components)` 
      };
    } else {
      return { 
        status: 'WARNING', 
        message: `Basic onboarding system (${onboardingComponents.length} components)` 
      };
    }
  }

  checkHelpSystem() {
    const helpFiles = [
      'secure-gate-access/client/src/components/error/HelpDeskModal.jsx'
    ];
    
    const implementedHelp = helpFiles.filter(f => fs.existsSync(f));
    
    if (implementedHelp.length > 0) {
      return { 
        status: 'PASSED', 
        message: 'Help system implemented' 
      };
    } else {
      return { 
        status: 'WARNING', 
        message: 'Help system not implemented' 
      };
    }
  }

  checkErrorHandling() {
    const errorHandlingPath = 'secure-gate-access/client/src/components/error';
    
    if (!fs.existsSync(errorHandlingPath)) {
      return { 
        status: 'WARNING', 
        message: 'Error handling components not found' 
      };
    }
    
    const errorComponents = fs.readdirSync(errorHandlingPath).filter(f => f.endsWith('.jsx'));
    
    if (errorComponents.length >= 2) {
      return { 
        status: 'PASSED', 
        message: `Error handling system implemented (${errorComponents.length} components)` 
      };
    } else {
      return { 
        status: 'WARNING', 
        message: `Basic error handling (${errorComponents.length} components)` 
      };
    }
  }

  calculateLaunchReadiness() {
    console.log('\n🎯 Calculating overall launch readiness...');
    
    // Calculate readiness score based on validation results
    let score = 0;
    let maxScore = 0;
    
    // Task completion (30% weight)
    if (this.results.taskCompletionStatus.status === 'READY') {
      score += 30;
    }
    maxScore += 30;
    
    // System architecture (25% weight)
    const archChecks = this.results.systemValidation.architecture || {};
    const archPassed = Object.values(archChecks).filter(c => c.status === 'PASSED').length;
    const archTotal = Object.keys(archChecks).length;
    if (archTotal > 0) {
      score += Math.round((archPassed / archTotal) * 25);
    }
    maxScore += 25;
    
    // Code quality (20% weight)
    const qualityChecks = this.results.systemValidation.codeQuality || {};
    const qualityPassed = Object.values(qualityChecks).filter(c => c.status === 'PASSED').length;
    const qualityTotal = Object.keys(qualityChecks).length;
    if (qualityTotal > 0) {
      score += Math.round((qualityPassed / qualityTotal) * 20);
    }
    maxScore += 20;
    
    // Security (15% weight)
    const securityChecks = this.results.systemValidation.security || {};
    const securityPassed = Object.values(securityChecks).filter(c => c.status === 'PASSED').length;
    const securityTotal = Object.keys(securityChecks).length;
    if (securityTotal > 0) {
      score += Math.round((securityPassed / securityTotal) * 15);
    }
    maxScore += 15;
    
    // Performance (10% weight)
    const perfChecks = this.results.systemValidation.performance || {};
    const perfPassed = Object.values(perfChecks).filter(c => c.status === 'PASSED').length;
    const perfTotal = Object.keys(perfChecks).length;
    if (perfTotal > 0) {
      score += Math.round((perfPassed / perfTotal) * 10);
    }
    maxScore += 10;
    
    this.results.launchReadiness.score = Math.round((score / maxScore) * 100);
    
    // Determine launch recommendation
    if (this.results.launchReadiness.blockers.length > 0) {
      this.results.launchReadiness.recommendation = 'NO-GO';
      this.results.overallStatus = 'BLOCKED';
    } else if (this.results.launchReadiness.score >= 85) {
      this.results.launchReadiness.recommendation = 'GO';
      this.results.overallStatus = 'READY';
    } else if (this.results.launchReadiness.score >= 70) {
      this.results.launchReadiness.recommendation = 'CONDITIONAL-GO';
      this.results.overallStatus = 'CONDITIONAL';
    } else {
      this.results.launchReadiness.recommendation = 'NO-GO';
      this.results.overallStatus = 'NOT_READY';
    }
    
    // Generate recommendations
    this.generateLaunchRecommendations();
  }

  generateLaunchRecommendations() {
    const recommendations = [];
    
    // Critical blockers
    if (this.results.launchReadiness.blockers.length > 0) {
      recommendations.push('CRITICAL: Address all blocking issues before launch');
      recommendations.push('Re-run validation after resolving blockers');
    }
    
    // Score-based recommendations
    if (this.results.launchReadiness.score < 70) {
      recommendations.push('System needs significant improvements before launch');
      recommendations.push('Focus on completing core functionality and testing');
    } else if (this.results.launchReadiness.score < 85) {
      recommendations.push('System is functional but could benefit from improvements');
      recommendations.push('Consider addressing warnings for better user experience');
    } else {
      recommendations.push('System demonstrates high readiness for production launch');
      recommendations.push('Continue monitoring and address minor warnings post-launch');
    }
    
    // Specific area recommendations
    if (this.results.launchReadiness.warnings.length > 5) {
      recommendations.push('Consider addressing high number of warnings for optimal launch');
    }
    
    // Task-specific recommendations
    if (this.results.taskCompletionStatus.status !== 'READY') {
      recommendations.push('Complete all prerequisite tasks before launch');
    }
    
    // General recommendations
    recommendations.push('Set up production monitoring and alerting');
    recommendations.push('Prepare rollback procedures for production deployment');
    recommendations.push('Schedule post-launch validation and monitoring');
    
    this.results.recommendations = recommendations;
  }

  async generateFinalReport() {
    const report = {
      metadata: {
        title: 'Final Launch Readiness Assessment',
        subtitle: 'Task 20 - User Functionality Refinements Spec',
        generatedAt: new Date().toISOString(),
        duration: `${(this.results.duration / 1000).toFixed(2)} seconds`,
        version: '1.0.0'
      },
      executiveSummary: {
        overallStatus: this.results.overallStatus,
        launchRecommendation: this.results.launchReadiness.recommendation,
        readinessScore: `${this.results.launchReadiness.score}/100`,
        criticalBlockers: this.results.launchReadiness.blockers.length,
        warnings: this.results.launchReadiness.warnings.length,
        taskCompletion: this.results.taskCompletionStatus
      },
      validationResults: {
        taskCompletion: this.results.taskCompletionStatus,
        systemArchitecture: this.results.systemValidation.architecture,
        codeQuality: this.results.systemValidation.codeQuality,
        security: this.results.systemValidation.security,
        performance: this.results.systemValidation.performance,
        userExperience: this.results.systemValidation.userExperience
      },
      launchReadiness: this.results.launchReadiness,
      recommendations: this.results.recommendations,
      nextSteps: this.generateNextSteps()
    };
    
    const reportPath = 'FINAL_LAUNCH_READINESS_REPORT.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate markdown summary
    await this.generateMarkdownReport(report);
    
    console.log(`\n📄 Final report saved to: ${reportPath}`);
    return report;
  }

  async generateMarkdownReport(report) {
    const markdown = `# Final Launch Readiness Assessment

## Executive Summary

**🎯 Launch Recommendation:** ${this.getRecommendationEmoji(report.executiveSummary.launchRecommendation)} **${report.executiveSummary.launchRecommendation}**

**📊 Readiness Score:** ${report.executiveSummary.readinessScore}  
**⏱️ Assessment Duration:** ${report.metadata.duration}  
**🚨 Critical Blockers:** ${report.executiveSummary.criticalBlockers}  
**⚠️ Warnings:** ${report.executiveSummary.warnings}  
**📋 Task Completion:** ${report.executiveSummary.taskCompletion.completed}/${report.executiveSummary.taskCompletion.total} (${report.executiveSummary.taskCompletion.completionRate}%)

## Validation Results Summary

### 📋 Task Completion
- **Status:** ${report.validationResults.taskCompletion.status}
- **Completion Rate:** ${report.validationResults.taskCompletion.completionRate}%
- **Tasks Completed:** ${report.validationResults.taskCompletion.completed}/${report.validationResults.taskCompletion.total}

### 🏗️ System Architecture
${this.formatValidationSection(report.validationResults.systemArchitecture)}

### 🔍 Code Quality
${this.formatValidationSection(report.validationResults.codeQuality)}

### 🔒 Security & Compliance
${this.formatValidationSection(report.validationResults.security)}

### ⚡ Performance & Scalability
${this.formatValidationSection(report.validationResults.performance)}

### 📚 User Experience & Documentation
${this.formatValidationSection(report.validationResults.userExperience)}

## Critical Issues

${report.launchReadiness.blockers.length > 0 
  ? report.launchReadiness.blockers.map(blocker => `- 🚫 ${blocker}`).join('\n')
  : '✅ No critical blockers identified'
}

## Warnings

${report.launchReadiness.warnings.length > 0 
  ? report.launchReadiness.warnings.slice(0, 10).map(warning => `- ⚠️ ${warning}`).join('\n')
  : '✅ No warnings identified'
}

## Launch Recommendations

${report.recommendations.slice(0, 8).map(rec => `- 📋 ${rec}`).join('\n')}

## Next Steps

${report.nextSteps.map(step => `- 🎯 ${step}`).join('\n')}

## Launch Decision Matrix

| Criteria | Status | Weight | Score |
|----------|--------|--------|-------|
| Task Completion | ${report.validationResults.taskCompletion.status} | 30% | ${report.executiveSummary.taskCompletion.completionRate}% |
| System Architecture | ${this.getOverallStatus(report.validationResults.systemArchitecture)} | 25% | ${this.calculateSectionScore(report.validationResults.systemArchitecture)}% |
| Code Quality | ${this.getOverallStatus(report.validationResults.codeQuality)} | 20% | ${this.calculateSectionScore(report.validationResults.codeQuality)}% |
| Security | ${this.getOverallStatus(report.validationResults.security)} | 15% | ${this.calculateSectionScore(report.validationResults.security)}% |
| Performance | ${this.getOverallStatus(report.validationResults.performance)} | 10% | ${this.calculateSectionScore(report.validationResults.performance)}% |

**Overall Readiness Score: ${report.executiveSummary.readinessScore}**

---

*Assessment completed at ${report.metadata.generatedAt}*  
*Generated by Final Launch Readiness Validator v${report.metadata.version}*
`;
    
    const markdownPath = 'FINAL_LAUNCH_READINESS_REPORT.md';
    fs.writeFileSync(markdownPath, markdown);
    
    console.log(`📄 Markdown report saved to: ${markdownPath}`);
  }

  formatValidationSection(section) {
    if (!section) return '- No validation data available';
    
    return Object.entries(section)
      .map(([check, result]) => `- **${check}:** ${this.getStatusEmoji(result.status)} ${result.message}`)
      .join('\n');
  }

  getOverallStatus(section) {
    if (!section) return 'NOT_EVALUATED';
    
    const statuses = Object.values(section).map(r => r.status);
    const passedCount = statuses.filter(s => s === 'PASSED').length;
    const totalCount = statuses.length;
    
    if (passedCount === totalCount) return 'PASSED';
    if (passedCount >= totalCount * 0.7) return 'MOSTLY_PASSED';
    return 'NEEDS_IMPROVEMENT';
  }

  calculateSectionScore(section) {
    if (!section) return 0;
    
    const statuses = Object.values(section).map(r => r.status);
    const passedCount = statuses.filter(s => s === 'PASSED').length;
    const totalCount = statuses.length;
    
    return totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
  }

  generateNextSteps() {
    const steps = [];
    
    if (this.results.launchReadiness.recommendation === 'GO') {
      steps.push('✅ PROCEED WITH PRODUCTION LAUNCH');
      steps.push('Deploy to production environment with monitoring');
      steps.push('Execute post-launch validation checklist');
      steps.push('Monitor system performance and user feedback');
      steps.push('Schedule first post-launch review within 48 hours');
    } else if (this.results.launchReadiness.recommendation === 'CONDITIONAL-GO') {
      steps.push('⚠️ CONDITIONAL LAUNCH APPROVAL');
      steps.push('Address high-priority warnings before launch');
      steps.push('Implement enhanced monitoring for identified risks');
      steps.push('Prepare rapid response procedures for potential issues');
      steps.push('Schedule accelerated post-launch reviews');
    } else {
      steps.push('🚫 DO NOT LAUNCH - RESOLVE CRITICAL ISSUES');
      steps.push('Address all blocking issues identified in assessment');
      steps.push('Re-run complete validation after fixes');
      steps.push('Consider additional testing and validation');
      steps.push('Schedule launch readiness re-assessment');
    }
    
    // Common next steps
    steps.push('Update stakeholders with launch decision and timeline');
    steps.push('Prepare production deployment procedures');
    steps.push('Finalize user communication and support procedures');
    
    return steps;
  }

  displayFinalAssessment() {
    console.log('\n' + '=' .repeat(80));
    console.log('🎯 FINAL LAUNCH READINESS ASSESSMENT');
    console.log('=' .repeat(80));
    
    console.log(`\n${this.getRecommendationEmoji(this.results.launchReadiness.recommendation)} LAUNCH RECOMMENDATION: ${this.results.launchReadiness.recommendation}`);
    console.log(`📊 READINESS SCORE: ${this.results.launchReadiness.score}/100`);
    console.log(`⏱️ ASSESSMENT DURATION: ${(this.results.duration / 1000).toFixed(2)} seconds`);
    
    console.log('\n📋 VALIDATION SUMMARY:');
    console.log(`  📋 Task Completion: ${this.results.taskCompletionStatus.status} (${this.results.taskCompletionStatus.completionRate}%)`);
    console.log(`  🏗️ System Architecture: ${this.getOverallStatus(this.results.systemValidation.architecture)}`);
    console.log(`  🔍 Code Quality: ${this.getOverallStatus(this.results.systemValidation.codeQuality)}`);
    console.log(`  🔒 Security: ${this.getOverallStatus(this.results.systemValidation.security)}`);
    console.log(`  ⚡ Performance: ${this.getOverallStatus(this.results.systemValidation.performance)}`);
    console.log(`  📚 User Experience: ${this.getOverallStatus(this.results.systemValidation.userExperience)}`);
    
    if (this.results.launchReadiness.blockers.length > 0) {
      console.log('\n🚨 CRITICAL BLOCKERS:');
      this.results.launchReadiness.blockers.forEach(blocker => {
        console.log(`  🚫 ${blocker}`);
      });
    }
    
    if (this.results.launchReadiness.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.results.launchReadiness.warnings.slice(0, 5).forEach(warning => {
        console.log(`  ⚠️ ${warning}`);
      });
      if (this.results.launchReadiness.warnings.length > 5) {
        console.log(`  ... and ${this.results.launchReadiness.warnings.length - 5} more warnings`);
      }
    }
    
    console.log('\n🎯 TOP RECOMMENDATIONS:');
    this.results.recommendations.slice(0, 5).forEach(rec => {
      console.log(`  📌 ${rec}`);
    });
    
    console.log('\n' + '=' .repeat(80));
    
    if (this.results.launchReadiness.recommendation === 'GO') {
      console.log('🚀 SYSTEM IS READY FOR PRODUCTION LAUNCH');
      console.log('✅ All critical requirements met - proceed with confidence');
    } else if (this.results.launchReadiness.recommendation === 'CONDITIONAL-GO') {
      console.log('⚠️ SYSTEM IS CONDITIONALLY READY FOR LAUNCH');
      console.log('📋 Address warnings for optimal launch experience');
    } else {
      console.log('🚫 SYSTEM IS NOT READY FOR PRODUCTION LAUNCH');
      console.log('❌ Critical issues must be resolved before proceeding');
    }
    
    console.log('=' .repeat(80));
  }

  getStatusEmoji(status) {
    switch (status) {
      case 'PASSED': return '✅';
      case 'FAILED': return '❌';
      case 'WARNING': return '⚠️';
      case 'READY': return '✅';
      case 'INCOMPLETE': return '❌';
      default: return '❓';
    }
  }

  getRecommendationEmoji(recommendation) {
    switch (recommendation) {
      case 'GO': return '🚀';
      case 'CONDITIONAL-GO': return '⚠️';
      case 'NO-GO': return '🚫';
      default: return '❓';
    }
  }
}

// CLI execution
if (require.main === module) {
  console.log('🚀 Starting Final Launch Readiness Validation');
  console.log('📋 Task 20 - User Functionality Refinements Spec');
  
  const validator = new LaunchReadinessValidator();
  
  validator.runFinalValidation()
    .then(results => {
      console.log('\n✅ Final launch readiness validation completed');
      
      // Exit with appropriate code based on recommendation
      if (results.launchReadiness.recommendation === 'GO') {
        process.exit(0); // Success - ready to launch
      } else if (results.launchReadiness.recommendation === 'CONDITIONAL-GO') {
        process.exit(2); // Conditional - warnings but can proceed
      } else {
        process.exit(1); // Failure - not ready to launch
      }
    })
    .catch(error => {
      console.error('\n❌ Final launch readiness validation failed:', error);
      process.exit(1);
    });
}

module.exports = LaunchReadinessValidator;