#!/usr/bin/env node

/**
 * Comprehensive Signup System Analysis
 * Analyzes the entire signup/registration system for gaps, errors, and readiness
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class SignupSystemAnalyzer {
  constructor() {
    this.basePath = '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access';
    this.analysis = {
      timestamp: new Date().toISOString(),
      backend: {
        routes: [],
        services: [],
        validation: [],
        middleware: [],
        tests: [],
        issues: []
      },
      frontend: {
        components: [],
        pages: [],
        contexts: [],
        services: [],
        issues: []
      },
      email: {
        implementation: null,
        status: 'NOT_IMPLEMENTED',
        issues: []
      },
      phone: {
        validation: [],
        identification: [],
        issues: []
      },
      duplicates: [],
      unused: [],
      critical_gaps: [],
      recommendations: []
    };
  }

  async analyzeSystem() {
    console.log('🔍 Starting comprehensive signup system analysis...\n');

    try {
      await this.analyzeBackend();
      await this.analyzeFrontend();
      await this.analyzeEmailSystem();
      await this.analyzePhoneValidation();
      await this.findDuplicates();
      await this.findUnusedFiles();
      await this.identifyCriticalGaps();
      await this.generateRecommendations();

      await this.writeReport();
      console.log('\n✅ Analysis complete! Report saved to signup-analysis-report.json');
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  }

  async analyzeBackend() {
    console.log('📊 Analyzing backend components...');

    // Auth routes
    const authRoutesPath = path.join(this.basePath, 'server/src/routes/authRoutes.js');
    if (fs.existsSync(authRoutesPath)) {
      const content = fs.readFileSync(authRoutesPath, 'utf8');
      this.analysis.backend.routes.push({
        file: authRoutesPath,
        endpoints: this.extractEndpoints(content),
        hasRegister: content.includes('/register'),
        hasSignup: content.includes('/signup'),
        hasValidation: content.includes('validation'),
        hasEmailVerification: content.includes('email') && content.includes('verif'),
        hasPhoneValidation: content.includes('phone'),
        issues: this.findBackendIssues(content, 'authRoutes')
      });
    } else {
      this.analysis.backend.issues.push('Auth routes file not found');
    }

    // User service
    const userServicePath = path.join(this.basePath, 'server/src/services/userService.js');
    if (fs.existsSync(userServicePath)) {
      const content = fs.readFileSync(userServicePath, 'utf8');
      this.analysis.backend.services.push({
        file: userServicePath,
        hasCreateUser: content.includes('createUser') || content.includes('create'),
        hasValidation: content.includes('validation') || content.includes('validate'),
        hasEncryption: content.includes('bcrypt') || content.includes('hash'),
        hasEmailHandling: content.includes('email'),
        hasPhoneHandling: content.includes('phone'),
        issues: this.findBackendIssues(content, 'userService')
      });
    }

    // Email service
    const emailServicePath = path.join(this.basePath, 'server/src/services/emailService.js');
    if (fs.existsSync(emailServicePath)) {
      const content = fs.readFileSync(emailServicePath, 'utf8');
      this.analysis.backend.services.push({
        file: emailServicePath,
        isStub: content.includes('STUB') || content.includes('TODO'),
        hasRealImplementation: !content.includes('console.log'),
        issues: content.includes('STUB') ? ['Email service is a stub - needs real implementation'] : []
      });
    }

    // Validation files
    const validationPath = path.join(this.basePath, 'server/src/validation/authValidation.js');
    if (fs.existsSync(validationPath)) {
      const content = fs.readFileSync(validationPath, 'utf8');
      this.analysis.backend.validation.push({
        file: validationPath,
        hasEmailValidation: content.includes('email'),
        hasPasswordValidation: content.includes('password'),
        hasPhoneValidation: content.includes('phone'),
        issues: this.findValidationIssues(content)
      });
    }
  }

  async analyzeFrontend() {
    console.log('📊 Analyzing frontend components...');

    // Login page
    const loginPath = path.join(this.basePath, 'client/src/pages/Login.jsx');
    if (fs.existsSync(loginPath)) {
      const content = fs.readFileSync(loginPath, 'utf8');
      this.analysis.frontend.pages.push({
        file: loginPath,
        hasLoginForm: content.includes('form') || content.includes('input'),
        hasErrorHandling: content.includes('error') || content.includes('Error'),
        hasValidation: content.includes('validation') || content.includes('validate'),
        issues: this.findFrontendIssues(content, 'Login')
      });
    }

    // Register page
    const registerPath = path.join(this.basePath, 'client/src/pages/Register.js');
    if (fs.existsSync(registerPath)) {
      const content = fs.readFileSync(registerPath, 'utf8');
      this.analysis.frontend.pages.push({
        file: registerPath,
        hasSignupForm: content.includes('form') || content.includes('register'),
        hasPhoneField: content.includes('phone'),
        hasEmailField: content.includes('email'),
        hasPasswordField: content.includes('password'),
        hasValidation: content.includes('validation') || content.includes('validate'),
        hasErrorHandling: content.includes('error') || content.includes('Error'),
        issues: this.findFrontendIssues(content, 'Register')
      });
    }

    // Auth context
    const authContextPath = path.join(this.basePath, 'client/src/contexts/AuthContext.js');
    if (fs.existsSync(authContextPath)) {
      const content = fs.readFileSync(authContextPath, 'utf8');
      this.analysis.frontend.contexts.push({
        file: authContextPath,
        hasLogin: content.includes('login'),
        hasRegister: content.includes('register') || content.includes('signup'),
        hasErrorHandling: content.includes('error'),
        issues: this.findFrontendIssues(content, 'AuthContext')
      });
    }
  }

  async analyzeEmailSystem() {
    console.log('📧 Analyzing email system...');

    const emailServicePath = path.join(this.basePath, 'server/src/services/emailService.js');
    if (fs.existsSync(emailServicePath)) {
      const content = fs.readFileSync(emailServicePath, 'utf8');
      
      this.analysis.email = {
        implementation: 'STUB',
        status: content.includes('STUB') ? 'NOT_IMPLEMENTED' : 'IMPLEMENTED',
        hasTemplates: fs.existsSync(path.join(this.basePath, 'server/src/templates/email-templates.js')),
        hasMailgun: content.includes('mailgun'),
        hasSMTP: content.includes('smtp') || content.includes('nodemailer'),
        issues: []
      };

      if (content.includes('STUB') || content.includes('TODO')) {
        this.analysis.email.issues.push('Email service is not implemented - only stub exists');
      }

      if (content.includes('console.log')) {
        this.analysis.email.issues.push('Email service uses console.log instead of actual email sending');
      }
    } else {
      this.analysis.email.issues.push('Email service file not found');
    }
  }

  async analyzePhoneValidation() {
    console.log('📱 Analyzing phone validation...');

    // Search for phone validation in backend
    try {
      const { stdout } = await execAsync(`grep -r "phone" ${this.basePath}/server/src --include="*.js"`);
      const phoneReferences = stdout.split('\n').filter(line => line.trim());
      
      this.analysis.phone.validation = phoneReferences.map(ref => {
        const [file, ...contentParts] = ref.split(':');
        return {
          file: file.replace(this.basePath, ''),
          content: contentParts.join(':').trim(),
          hasValidation: contentParts.join(':').includes('validation') || contentParts.join(':').includes('validate')
        };
      });
    } catch (error) {
      this.analysis.phone.issues.push('Could not analyze phone validation in backend');
    }

    // Search for phone validation in frontend
    try {
      const { stdout } = await execAsync(`grep -r "phone" ${this.basePath}/client/src --include="*.js" --include="*.jsx"`);
      const frontendPhoneRefs = stdout.split('\n').filter(line => line.trim());
      
      frontendPhoneRefs.forEach(ref => {
        const [file, ...contentParts] = ref.split(':');
        this.analysis.phone.validation.push({
          file: file.replace(this.basePath, ''),
          content: contentParts.join(':').trim(),
          context: 'frontend'
        });
      });
    } catch (error) {
      this.analysis.phone.issues.push('Could not analyze phone validation in frontend');
    }

    // Check for phone number identification/formatting libraries
    const packageJsonPath = path.join(this.basePath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      this.analysis.phone.identification = {
        hasLibphonenumber: !!deps['libphonenumber-js'] || !!deps['google-libphonenumber'],
        hasPhoneValidationLibs: Object.keys(deps).some(dep => dep.includes('phone')),
        dependencies: Object.keys(deps).filter(dep => dep.includes('phone'))
      };
    }
  }

  async findDuplicates() {
    console.log('🔍 Finding duplicate files...');

    const duplicatePatterns = [
      'Register',
      'register',
      'signup',
      'SignUp',
      'auth',
      'Auth',
      'login',
      'Login'
    ];

    for (const pattern of duplicatePatterns) {
      try {
        const { stdout } = await execAsync(`find ${this.basePath} -name "*${pattern}*" -type f`);
        const files = stdout.split('\n').filter(f => f.trim() && !f.includes('node_modules'));
        
        if (files.length > 1) {
          this.analysis.duplicates.push({
            pattern,
            files: files.map(f => f.replace(this.basePath, '')),
            count: files.length
          });
        }
      } catch (error) {
        // Pattern not found, which is fine
      }
    }
  }

  async findUnusedFiles() {
    console.log('🗑️ Finding unused files...');

    // Look for files in archived_duplicates folder
    const archivedPath = path.join(this.basePath, 'archived_duplicates');
    if (fs.existsSync(archivedPath)) {
      const archivedFiles = fs.readdirSync(archivedPath);
      this.analysis.unused = archivedFiles.map(file => ({
        file: `archived_duplicates/${file}`,
        reason: 'File in archived_duplicates folder'
      }));
    }

    // Look for test files that might be outdated
    try {
      const { stdout } = await execAsync(`find ${this.basePath} -name "*.test.js" -o -name "*.spec.js"`);
      const testFiles = stdout.split('\n').filter(f => f.trim());
      
      for (const testFile of testFiles) {
        if (testFile.includes('old') || testFile.includes('backup') || testFile.includes('temp')) {
          this.analysis.unused.push({
            file: testFile.replace(this.basePath, ''),
            reason: 'Appears to be old/backup test file'
          });
        }
      }
    } catch (error) {
      // No test files found
    }
  }

  identifyCriticalGaps() {
    console.log('⚠️ Identifying critical gaps...');

    // Check for missing email implementation
    if (this.analysis.email.status === 'NOT_IMPLEMENTED') {
      this.analysis.critical_gaps.push({
        type: 'EMAIL_SERVICE',
        severity: 'HIGH',
        description: 'Email service is not implemented - signup confirmation emails will not work',
        impact: 'Users cannot verify their email addresses during signup'
      });
    }

    // Check for missing phone validation
    const hasPhoneValidation = this.analysis.phone.validation.some(v => v.hasValidation);
    if (!hasPhoneValidation) {
      this.analysis.critical_gaps.push({
        type: 'PHONE_VALIDATION',
        severity: 'MEDIUM',
        description: 'No proper phone number validation found',
        impact: 'Invalid phone numbers may be stored in the system'
      });
    }

    // Check for missing phone identification library
    if (!this.analysis.phone.identification.hasLibphonenumber && !this.analysis.phone.identification.hasPhoneValidationLibs) {
      this.analysis.critical_gaps.push({
        type: 'PHONE_IDENTIFICATION',
        severity: 'MEDIUM',
        description: 'No phone number identification/formatting library found',
        impact: 'Phone numbers may not be properly formatted or validated by country'
      });
    }

    // Check for frontend-backend integration
    const hasBackendRegister = this.analysis.backend.routes.some(r => r.hasRegister);
    const hasFrontendRegister = this.analysis.frontend.pages.some(p => p.hasSignupForm);
    
    if (hasBackendRegister && !hasFrontendRegister) {
      this.analysis.critical_gaps.push({
        type: 'FRONTEND_SIGNUP',
        severity: 'HIGH',
        description: 'Backend has register endpoint but frontend signup form may be incomplete',
        impact: 'Users cannot complete signup process through the UI'
      });
    }

    // Check for duplicate files
    if (this.analysis.duplicates.length > 0) {
      this.analysis.critical_gaps.push({
        type: 'DUPLICATE_FILES',
        severity: 'LOW',
        description: `Found ${this.analysis.duplicates.length} sets of duplicate files`,
        impact: 'Code maintenance issues and potential confusion'
      });
    }
  }

  generateRecommendations() {
    console.log('💡 Generating recommendations...');

    // Email service implementation
    if (this.analysis.email.status === 'NOT_IMPLEMENTED') {
      this.analysis.recommendations.push({
        priority: 'HIGH',
        category: 'EMAIL',
        title: 'Implement Email Service',
        description: 'Replace email service stub with actual implementation',
        actions: [
          'Choose email provider (Mailgun, SendGrid, AWS SES)',
          'Install required dependencies (nodemailer, etc.)',
          'Update emailService.js with real implementation',
          'Add email templates and configuration',
          'Test email delivery in development and production'
        ]
      });
    }

    // Phone validation implementation
    if (!this.analysis.phone.identification.hasLibphonenumber) {
      this.analysis.recommendations.push({
        priority: 'MEDIUM',
        category: 'PHONE',
        title: 'Add Phone Number Validation Library',
        description: 'Install and configure phone number validation library',
        actions: [
          'Install libphonenumber-js or google-libphonenumber',
          'Add phone validation to backend validation schemas',
          'Add phone formatting to frontend forms',
          'Test phone validation with various country formats'
        ]
      });
    }

    // Code cleanup
    if (this.analysis.duplicates.length > 0 || this.analysis.unused.length > 0) {
      this.analysis.recommendations.push({
        priority: 'LOW',
        category: 'CLEANUP',
        title: 'Clean Up Duplicate and Unused Files',
        description: 'Remove or consolidate duplicate files and clean up unused code',
        actions: [
          'Review duplicate files and merge or remove as appropriate',
          'Remove files from archived_duplicates folder if no longer needed',
          'Update imports and references after file removal',
          'Run tests to ensure no functionality is broken'
        ]
      });
    }

    // Error handling
    this.analysis.recommendations.push({
      priority: 'MEDIUM',
      category: 'ERROR_HANDLING',
      title: 'Improve Error Handling and Logging',
      description: 'Enhance error handling throughout the signup flow',
      actions: [
        'Add comprehensive error logging in backend services',
        'Improve user-friendly error messages in frontend',
        'Add validation error details from backend to frontend',
        'Test error scenarios (network failures, validation errors, etc.)'
      ]
    });

    // Testing
    this.analysis.recommendations.push({
      priority: 'MEDIUM',
      category: 'TESTING',
      title: 'Comprehensive End-to-End Testing',
      description: 'Create thorough tests for the entire signup flow',
      actions: [
        'Create integration tests for signup API endpoints',
        'Add frontend component tests for signup forms',
        'Create end-to-end tests covering full user journey',
        'Test email delivery and phone validation scenarios'
      ]
    });
  }

  extractEndpoints(content) {
    const endpoints = [];
    const routePattern = /router\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = routePattern.exec(content)) !== null) {
      endpoints.push({
        method: match[1].toUpperCase(),
        path: match[2]
      });
    }
    return endpoints;
  }

  findBackendIssues(content, type) {
    const issues = [];
    
    if (content.includes('TODO')) {
      issues.push('Contains TODO comments - incomplete implementation');
    }
    
    if (content.includes('console.log') && !content.includes('logger')) {
      issues.push('Uses console.log instead of proper logging');
    }
    
    if (type === 'authRoutes' && !content.includes('validation')) {
      issues.push('Missing input validation');
    }
    
    if (type === 'userService' && !content.includes('bcrypt') && !content.includes('hash')) {
      issues.push('Password hashing may be missing');
    }
    
    return issues;
  }

  findFrontendIssues(content, type) {
    const issues = [];
    
    if (content.includes('TODO')) {
      issues.push('Contains TODO comments - incomplete implementation');
    }
    
    if (type === 'Register' && !content.includes('validation')) {
      issues.push('Missing client-side validation');
    }
    
    if (!content.includes('error') && !content.includes('Error')) {
      issues.push('Missing error handling');
    }
    
    return issues;
  }

  findValidationIssues(content) {
    const issues = [];
    
    if (!content.includes('email')) {
      issues.push('Missing email validation');
    }
    
    if (!content.includes('password')) {
      issues.push('Missing password validation');
    }
    
    if (!content.includes('phone')) {
      issues.push('Missing phone validation');
    }
    
    return issues;
  }

  async writeReport() {
    const reportPath = path.join(process.cwd(), 'signup-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.analysis, null, 2));
    
    // Also create a summary report
    const summary = {
      timestamp: this.analysis.timestamp,
      summary: {
        total_issues: this.analysis.critical_gaps.length,
        email_status: this.analysis.email.status,
        phone_validation_status: this.analysis.phone.validation.length > 0 ? 'PARTIAL' : 'MISSING',
        duplicate_files: this.analysis.duplicates.length,
        unused_files: this.analysis.unused.length,
        recommendations: this.analysis.recommendations.length
      },
      critical_gaps: this.analysis.critical_gaps,
      top_recommendations: this.analysis.recommendations.slice(0, 3)
    };
    
    const summaryPath = path.join(process.cwd(), 'signup-analysis-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('\n📋 ANALYSIS SUMMARY:');
    console.log(`• Total Critical Gaps: ${this.analysis.critical_gaps.length}`);
    console.log(`• Email Service Status: ${this.analysis.email.status}`);
    console.log(`• Duplicate File Sets: ${this.analysis.duplicates.length}`);
    console.log(`• Unused Files: ${this.analysis.unused.length}`);
    console.log(`• Recommendations: ${this.analysis.recommendations.length}`);
  }
}

// Run the analysis
const analyzer = new SignupSystemAnalyzer();
analyzer.analyzeSystem().catch(console.error);
