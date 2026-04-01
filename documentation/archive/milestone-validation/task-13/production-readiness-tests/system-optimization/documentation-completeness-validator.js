/**
 * Documentation Completeness Validation System
 * 
 * Comprehensive documentation validation system implementing task 12.3 requirements:
 * - API documentation completeness audit
 * - User guide accuracy and completeness validation  
 * - Operational procedure documentation testing
 * - Security and compliance documentation validation
 * 
 * Requirements: 10.3, 10.4, 10.6
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

class DocumentationCompletenessValidator {
  constructor() {
    this.results = {
      apiDocumentationCompleteness: { score: 0, issues: [], validations: [], coverage: {} },
      userGuideAccuracy: { score: 0, issues: [], validations: [], completeness: {} },
      operationalProcedures: { score: 0, issues: [], validations: [], coverage: {} },
      securityCompliance: { score: 0, issues: [], validations: [], coverage: {} },
      overallScore: 0,
      totalValidations: 0,
      passedValidations: 0,
      criticalIssues: 0,
      timestamp: new Date().toISOString()
    };
    
    // API Documentation Requirements
    this.apiRequirements = {
      endpoints: {
        authentication: ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout'],
        visitors: ['/api/visitors', '/api/visitors/{id}', '/api/visitors/{id}/check-in', '/api/visitors/{id}/check-out'],
        admin: ['/api/admin/users', '/api/admin/metrics', '/api/admin/audit-logs'],
        health: ['/api/health', '/api/health/detailed'],
        realtime: ['/ws', '/api/notifications']
      },
      schemas: ['User', 'Visitor', 'Estate', 'ErrorResponse', 'SuccessResponse', 'AuditLog'],
      security: ['JWT', 'CSRF', 'RateLimit', 'CORS'],
      examples: ['request', 'response', 'error'],
      documentation: ['description', 'parameters', 'responses', 'security']
    };
    
    // User Guide Requirements
    this.userGuideRequirements = {
      roles: ['super-admin', 'estate-admin', 'guard', 'resident', 'visitor'],
      workflows: ['visitor-invitation', 'check-in-process', 'user-management', 'reporting'],
      features: ['dashboard', 'notifications', 'mobile-app', 'offline-mode'],
      troubleshooting: ['common-issues', 'error-messages', 'support-contact'],
      accessibility: ['keyboard-navigation', 'screen-reader', 'high-contrast']
    };
    
    // Operational Procedure Requirements
    this.operationalRequirements = {
      deployment: ['environment-setup', 'database-migration', 'ssl-certificates', 'monitoring'],
      monitoring: ['health-checks', 'alerting', 'log-aggregation', 'performance-metrics'],
      backup: ['database-backup', 'file-backup', 'disaster-recovery', 'testing-procedures'],
      security: ['vulnerability-scanning', 'penetration-testing', 'incident-response', 'compliance-audits'],
      maintenance: ['updates', 'scaling', 'troubleshooting', 'performance-tuning']
    };
    
    // Security and Compliance Requirements
    this.securityComplianceRequirements = {
      gdpr: ['data-processing', 'consent-management', 'data-subject-rights', 'breach-procedures'],
      kdpa: ['data-protection', 'consent-mechanisms', 'data-transfer', 'compliance-monitoring'],
      security: ['authentication', 'authorization', 'encryption', 'audit-logging'],
      privacy: ['data-minimization', 'retention-policies', 'anonymization', 'access-controls']
    };
  }

  async validateDocumentationCompleteness() {
    console.log('🔍 Starting comprehensive documentation completeness validation...');
    console.log('Requirements: 10.3, 10.4, 10.6');
    
    try {
      await this.validateApiDocumentationCompleteness();
      await this.validateUserGuideAccuracy();
      await this.validateOperationalProcedureDocumentation();
      await this.validateSecurityComplianceDocumentation();
      
      this.calculateOverallScore();
      this.generateComprehensiveReport();
      
      return this.results;
    } catch (error) {
      console.error('❌ Documentation completeness validation failed:', error);
      throw error;
    }
  }

  async validateApiDocumentationCompleteness() {
    console.log('📚 Validating API documentation completeness...');
    
    const apiDocPath = path.join(process.cwd(), 'secure-gate-access', 'api-documentation.yaml');
    
    try {
      const apiDocContent = await fs.readFile(apiDocPath, 'utf8');
      const apiDoc = yaml.load(apiDocContent);
      
      // Validate endpoint coverage
      await this.validateEndpointCoverage(apiDoc);
      
      // Validate schema completeness
      await this.validateSchemaCompleteness(apiDoc);
      
      // Validate security documentation
      await this.validateApiSecurityDocumentation(apiDoc);
      
      // Validate examples and descriptions
      await this.validateApiExamplesAndDescriptions(apiDoc);
      
      // Validate error handling documentation
      await this.validateErrorHandlingDocumentation(apiDoc);
      
      // Calculate API documentation score
      const totalChecks = Object.values(this.results.apiDocumentationCompleteness.coverage).reduce((sum, val) => sum + val.total, 0);
      const passedChecks = Object.values(this.results.apiDocumentationCompleteness.coverage).reduce((sum, val) => sum + val.passed, 0);
      
      this.results.apiDocumentationCompleteness.score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
      
    } catch (error) {
      this.results.apiDocumentationCompleteness.issues.push({
        severity: 'critical',
        category: 'file-access',
        message: 'API documentation file not found or invalid',
        file: apiDocPath,
        recommendation: 'Create comprehensive OpenAPI/Swagger documentation',
        requirement: '10.3'
      });
    }
  }

  async validateEndpointCoverage(apiDoc) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    if (!apiDoc.paths) {
      this.results.apiDocumentationCompleteness.issues.push({
        severity: 'critical',
        category: 'structure',
        message: 'No API paths defined in documentation',
        recommendation: 'Add comprehensive endpoint documentation',
        requirement: '10.3'
      });
      return;
    }
    
    const documentedPaths = Object.keys(apiDoc.paths);
    
    // Check each category of endpoints
    for (const [category, endpoints] of Object.entries(this.apiRequirements.endpoints)) {
      for (const endpoint of endpoints) {
        coverage.total++;
        
        const isDocumented = documentedPaths.some(path => {
          // Handle parameterized paths
          const pattern = endpoint.replace(/\{[^}]+\}/g, '[^/]+');
          return new RegExp(`^${pattern}$`).test(path) || path === endpoint;
        });
        
        if (isDocumented) {
          coverage.passed++;
          this.results.apiDocumentationCompleteness.validations.push({
            type: 'endpoint-coverage',
            category,
            endpoint,
            status: 'passed',
            message: `Endpoint ${endpoint} is documented`
          });
        } else {
          coverage.missing.push(endpoint);
          this.results.apiDocumentationCompleteness.issues.push({
            severity: 'high',
            category: 'endpoint-coverage',
            message: `Missing documentation for ${category} endpoint: ${endpoint}`,
            recommendation: `Add comprehensive documentation for ${endpoint}`,
            requirement: '10.3'
          });
        }
      }
    }
    
    this.results.apiDocumentationCompleteness.coverage.endpoints = coverage;
  }

  async validateSchemaCompleteness(apiDoc) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    const schemas = apiDoc.components?.schemas || {};
    
    for (const requiredSchema of this.apiRequirements.schemas) {
      coverage.total++;
      
      if (schemas[requiredSchema]) {
        coverage.passed++;
        
        // Validate schema structure
        const schema = schemas[requiredSchema];
        if (schema.type && schema.properties) {
          this.results.apiDocumentationCompleteness.validations.push({
            type: 'schema-completeness',
            schema: requiredSchema,
            status: 'passed',
            message: `Schema ${requiredSchema} is properly defined`
          });
        } else {
          this.results.apiDocumentationCompleteness.issues.push({
            severity: 'medium',
            category: 'schema-structure',
            message: `Schema ${requiredSchema} lacks proper structure`,
            recommendation: `Add type and properties to ${requiredSchema} schema`,
            requirement: '10.3'
          });
        }
      } else {
        coverage.missing.push(requiredSchema);
        this.results.apiDocumentationCompleteness.issues.push({
          severity: 'high',
          category: 'schema-missing',
          message: `Missing required schema: ${requiredSchema}`,
          recommendation: `Add ${requiredSchema} schema definition`,
          requirement: '10.3'
        });
      }
    }
    
    this.results.apiDocumentationCompleteness.coverage.schemas = coverage;
  }

  async validateApiSecurityDocumentation(apiDoc) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    // Check security schemes
    const securitySchemes = apiDoc.components?.securitySchemes || {};
    
    for (const securityType of this.apiRequirements.security) {
      coverage.total++;
      
      const hasScheme = Object.values(securitySchemes).some(scheme => 
        scheme.type?.toLowerCase().includes(securityType.toLowerCase()) ||
        scheme.description?.toLowerCase().includes(securityType.toLowerCase())
      );
      
      if (hasScheme) {
        coverage.passed++;
        this.results.apiDocumentationCompleteness.validations.push({
          type: 'security-documentation',
          securityType,
          status: 'passed',
          message: `${securityType} security is documented`
        });
      } else {
        coverage.missing.push(securityType);
        this.results.apiDocumentationCompleteness.issues.push({
          severity: 'high',
          category: 'security-documentation',
          message: `Missing ${securityType} security documentation`,
          recommendation: `Add ${securityType} security scheme documentation`,
          requirement: '10.3'
        });
      }
    }
    
    this.results.apiDocumentationCompleteness.coverage.security = coverage;
  }

  async validateApiExamplesAndDescriptions(apiDoc) {
    const coverage = { total: 0, passed: 0, issues: [] };
    
    if (!apiDoc.paths) return;
    
    for (const [path, methods] of Object.entries(apiDoc.paths)) {
      for (const [method, spec] of Object.entries(methods)) {
        coverage.total++;
        
        let hasDescription = !!spec.description || !!spec.summary;
        let hasExamples = false;
        let hasResponses = !!spec.responses;
        
        // Check for examples in responses
        if (spec.responses) {
          hasExamples = Object.values(spec.responses).some(response => 
            response.content && Object.values(response.content).some(content => 
              content.examples || content.example
            )
          );
        }
        
        if (hasDescription && hasExamples && hasResponses) {
          coverage.passed++;
          this.results.apiDocumentationCompleteness.validations.push({
            type: 'endpoint-documentation',
            endpoint: `${method.toUpperCase()} ${path}`,
            status: 'passed',
            message: 'Endpoint has complete documentation'
          });
        } else {
          const missing = [];
          if (!hasDescription) missing.push('description');
          if (!hasExamples) missing.push('examples');
          if (!hasResponses) missing.push('responses');
          
          this.results.apiDocumentationCompleteness.issues.push({
            severity: 'medium',
            category: 'endpoint-documentation',
            message: `${method.toUpperCase()} ${path} missing: ${missing.join(', ')}`,
            recommendation: `Add ${missing.join(', ')} to endpoint documentation`,
            requirement: '10.3'
          });
        }
      }
    }
    
    this.results.apiDocumentationCompleteness.coverage.documentation = coverage;
  }

  async validateErrorHandlingDocumentation(apiDoc) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    if (!apiDoc.paths) return;
    
    const commonErrorCodes = ['400', '401', '403', '404', '500'];
    
    for (const [path, methods] of Object.entries(apiDoc.paths)) {
      for (const [method, spec] of Object.entries(methods)) {
        if (spec.responses) {
          coverage.total++;
          
          const hasErrorResponses = commonErrorCodes.some(code => spec.responses[code]);
          
          if (hasErrorResponses) {
            coverage.passed++;
            this.results.apiDocumentationCompleteness.validations.push({
              type: 'error-documentation',
              endpoint: `${method.toUpperCase()} ${path}`,
              status: 'passed',
              message: 'Endpoint has error response documentation'
            });
          } else {
            this.results.apiDocumentationCompleteness.issues.push({
              severity: 'medium',
              category: 'error-documentation',
              message: `${method.toUpperCase()} ${path} missing error response documentation`,
              recommendation: 'Add common error response codes (400, 401, 403, 404, 500)',
              requirement: '10.3'
            });
          }
        }
      }
    }
    
    this.results.apiDocumentationCompleteness.coverage.errorHandling = coverage;
  }

  async validateUserGuideAccuracy() {
    console.log('📖 Validating user guide accuracy and completeness...');
    
    const docsDir = path.join(process.cwd(), 'secure-gate-access', 'docs');
    const rootDocsDir = path.join(process.cwd(), 'docs');
    
    // Search for documentation in multiple locations
    const searchPaths = [docsDir, rootDocsDir, process.cwd()];
    const foundDocs = new Map();
    
    for (const searchPath of searchPaths) {
      try {
        const docs = await this.findDocumentationFiles(searchPath);
        docs.forEach(doc => {
          const key = path.basename(doc).toLowerCase();
          if (!foundDocs.has(key)) {
            foundDocs.set(key, doc);
          }
        });
      } catch (error) {
        // Directory might not exist, continue
      }
    }
    
    // Validate role-specific guides
    await this.validateRoleSpecificGuides(foundDocs);
    
    // Validate workflow documentation
    await this.validateWorkflowDocumentation(foundDocs);
    
    // Validate feature documentation
    await this.validateFeatureDocumentation(foundDocs);
    
    // Validate troubleshooting guides
    await this.validateTroubleshootingGuides(foundDocs);
    
    // Validate accessibility documentation
    await this.validateAccessibilityDocumentation(foundDocs);
    
    // Calculate user guide score
    const totalChecks = Object.values(this.results.userGuideAccuracy.completeness).reduce((sum, val) => sum + val.total, 0);
    const passedChecks = Object.values(this.results.userGuideAccuracy.completeness).reduce((sum, val) => sum + val.passed, 0);
    
    this.results.userGuideAccuracy.score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
  }

  async findDocumentationFiles(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          try {
            const subFiles = await this.findDocumentationFiles(fullPath);
            files.push(...subFiles);
          } catch (error) {
            // Skip inaccessible directories
          }
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory access error
    }
    
    return files;
  }

  async validateRoleSpecificGuides(foundDocs) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    for (const role of this.userGuideRequirements.roles) {
      coverage.total++;
      
      const hasGuide = Array.from(foundDocs.keys()).some(filename => 
        filename.includes(role) || filename.includes(role.replace('-', ''))
      );
      
      if (hasGuide) {
        coverage.passed++;
        this.results.userGuideAccuracy.validations.push({
          type: 'role-guide',
          role,
          status: 'passed',
          message: `${role} guide found`
        });
      } else {
        coverage.missing.push(role);
        this.results.userGuideAccuracy.issues.push({
          severity: 'high',
          category: 'role-guides',
          message: `Missing user guide for ${role}`,
          recommendation: `Create comprehensive ${role} user guide`,
          requirement: '10.4'
        });
      }
    }
    
    this.results.userGuideAccuracy.completeness.roleGuides = coverage;
  }

  async validateWorkflowDocumentation(foundDocs) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    for (const workflow of this.userGuideRequirements.workflows) {
      coverage.total++;
      
      const hasWorkflowDoc = Array.from(foundDocs.keys()).some(filename => 
        filename.includes(workflow) || filename.includes(workflow.replace('-', ''))
      );
      
      if (hasWorkflowDoc) {
        coverage.passed++;
        this.results.userGuideAccuracy.validations.push({
          type: 'workflow-documentation',
          workflow,
          status: 'passed',
          message: `${workflow} workflow documented`
        });
      } else {
        coverage.missing.push(workflow);
        this.results.userGuideAccuracy.issues.push({
          severity: 'medium',
          category: 'workflow-documentation',
          message: `Missing workflow documentation for ${workflow}`,
          recommendation: `Create step-by-step ${workflow} workflow guide`,
          requirement: '10.4'
        });
      }
    }
    
    this.results.userGuideAccuracy.completeness.workflows = coverage;
  }

  async validateFeatureDocumentation(foundDocs) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    for (const feature of this.userGuideRequirements.features) {
      coverage.total++;
      
      const hasFeatureDoc = Array.from(foundDocs.keys()).some(filename => 
        filename.includes(feature) || filename.includes(feature.replace('-', ''))
      );
      
      if (hasFeatureDoc) {
        coverage.passed++;
        this.results.userGuideAccuracy.validations.push({
          type: 'feature-documentation',
          feature,
          status: 'passed',
          message: `${feature} feature documented`
        });
      } else {
        coverage.missing.push(feature);
        this.results.userGuideAccuracy.issues.push({
          severity: 'medium',
          category: 'feature-documentation',
          message: `Missing feature documentation for ${feature}`,
          recommendation: `Create comprehensive ${feature} feature guide`,
          requirement: '10.4'
        });
      }
    }
    
    this.results.userGuideAccuracy.completeness.features = coverage;
  }

  async validateTroubleshootingGuides(foundDocs) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    for (const troubleshootingArea of this.userGuideRequirements.troubleshooting) {
      coverage.total++;
      
      const hasTroubleshootingDoc = Array.from(foundDocs.keys()).some(filename => 
        filename.includes('troubleshoot') || filename.includes('faq') || 
        filename.includes('support') || filename.includes(troubleshootingArea)
      );
      
      if (hasTroubleshootingDoc) {
        coverage.passed++;
        this.results.userGuideAccuracy.validations.push({
          type: 'troubleshooting-documentation',
          area: troubleshootingArea,
          status: 'passed',
          message: `${troubleshootingArea} troubleshooting documented`
        });
      } else {
        coverage.missing.push(troubleshootingArea);
        this.results.userGuideAccuracy.issues.push({
          severity: 'medium',
          category: 'troubleshooting-documentation',
          message: `Missing troubleshooting documentation for ${troubleshootingArea}`,
          recommendation: `Create ${troubleshootingArea} troubleshooting guide`,
          requirement: '10.4'
        });
      }
    }
    
    this.results.userGuideAccuracy.completeness.troubleshooting = coverage;
  }

  async validateAccessibilityDocumentation(foundDocs) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    for (const accessibilityFeature of this.userGuideRequirements.accessibility) {
      coverage.total++;
      
      const hasAccessibilityDoc = Array.from(foundDocs.keys()).some(filename => 
        filename.includes('accessibility') || filename.includes('a11y') || 
        filename.includes(accessibilityFeature)
      );
      
      if (hasAccessibilityDoc) {
        coverage.passed++;
        this.results.userGuideAccuracy.validations.push({
          type: 'accessibility-documentation',
          feature: accessibilityFeature,
          status: 'passed',
          message: `${accessibilityFeature} accessibility documented`
        });
      } else {
        coverage.missing.push(accessibilityFeature);
        this.results.userGuideAccuracy.issues.push({
          severity: 'medium',
          category: 'accessibility-documentation',
          message: `Missing accessibility documentation for ${accessibilityFeature}`,
          recommendation: `Create ${accessibilityFeature} accessibility guide`,
          requirement: '10.4'
        });
      }
    }
    
    this.results.userGuideAccuracy.completeness.accessibility = coverage;
  }

  async validateOperationalProcedureDocumentation() {
    console.log('⚙️ Validating operational procedure documentation...');
    
    const searchPaths = [
      process.cwd(),
      path.join(process.cwd(), 'docs'),
      path.join(process.cwd(), 'secure-gate-access', 'docs'),
      path.join(process.cwd(), 'deployment'),
      path.join(process.cwd(), 'monitoring'),
      path.join(process.cwd(), 'scripts')
    ];
    
    const foundDocs = new Map();
    
    for (const searchPath of searchPaths) {
      try {
        const docs = await this.findDocumentationFiles(searchPath);
        docs.forEach(doc => {
          const key = path.basename(doc).toLowerCase();
          if (!foundDocs.has(key)) {
            foundDocs.set(key, doc);
          }
        });
      } catch (error) {
        // Directory might not exist
      }
    }
    
    // Validate each operational area
    await this.validateDeploymentProcedures(foundDocs);
    await this.validateMonitoringProcedures(foundDocs);
    await this.validateBackupProcedures(foundDocs);
    await this.validateSecurityProcedures(foundDocs);
    await this.validateMaintenanceProcedures(foundDocs);
    
    // Calculate operational procedures score
    const totalChecks = Object.values(this.results.operationalProcedures.coverage).reduce((sum, val) => sum + val.total, 0);
    const passedChecks = Object.values(this.results.operationalProcedures.coverage).reduce((sum, val) => sum + val.passed, 0);
    
    this.results.operationalProcedures.score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
  }

  async validateDeploymentProcedures(foundDocs) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    for (const procedure of this.operationalRequirements.deployment) {
      coverage.total++;
      
      const hasDoc = Array.from(foundDocs.keys()).some(filename => 
        filename.includes('deploy') || filename.includes(procedure) ||
        filename.includes('setup') || filename.includes('install')
      );
      
      if (hasDoc) {
        coverage.passed++;
        this.results.operationalProcedures.validations.push({
          type: 'deployment-procedures',
          procedure,
          status: 'passed',
          message: `${procedure} deployment procedure documented`
        });
      } else {
        coverage.missing.push(procedure);
        this.results.operationalProcedures.issues.push({
          severity: 'high',
          category: 'deployment-procedures',
          message: `Missing deployment procedure documentation for ${procedure}`,
          recommendation: `Create detailed ${procedure} deployment procedure`,
          requirement: '10.6'
        });
      }
    }
    
    this.results.operationalProcedures.coverage.deployment = coverage;
  }

  async validateMonitoringProcedures(foundDocs) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    for (const procedure of this.operationalRequirements.monitoring) {
      coverage.total++;
      
      const hasDoc = Array.from(foundDocs.keys()).some(filename => 
        filename.includes('monitor') || filename.includes(procedure) ||
        filename.includes('alert') || filename.includes('observability')
      );
      
      if (hasDoc) {
        coverage.passed++;
        this.results.operationalProcedures.validations.push({
          type: 'monitoring-procedures',
          procedure,
          status: 'passed',
          message: `${procedure} monitoring procedure documented`
        });
      } else {
        coverage.missing.push(procedure);
        this.results.operationalProcedures.issues.push({
          severity: 'high',
          category: 'monitoring-procedures',
          message: `Missing monitoring procedure documentation for ${procedure}`,
          recommendation: `Create detailed ${procedure} monitoring procedure`,
          requirement: '10.6'
        });
      }
    }
    
    this.results.operationalProcedures.coverage.monitoring = coverage;
  }

  async validateBackupProcedures(foundDocs) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    for (const procedure of this.operationalRequirements.backup) {
      coverage.total++;
      
      const hasDoc = Array.from(foundDocs.keys()).some(filename => 
        filename.includes('backup') || filename.includes(procedure) ||
        filename.includes('recovery') || filename.includes('disaster')
      );
      
      if (hasDoc) {
        coverage.passed++;
        this.results.operationalProcedures.validations.push({
          type: 'backup-procedures',
          procedure,
          status: 'passed',
          message: `${procedure} backup procedure documented`
        });
      } else {
        coverage.missing.push(procedure);
        this.results.operationalProcedures.issues.push({
          severity: 'critical',
          category: 'backup-procedures',
          message: `Missing backup procedure documentation for ${procedure}`,
          recommendation: `Create detailed ${procedure} backup procedure`,
          requirement: '10.6'
        });
      }
    }
    
    this.results.operationalProcedures.coverage.backup = coverage;
  }

  async validateSecurityProcedures(foundDocs) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    for (const procedure of this.operationalRequirements.security) {
      coverage.total++;
      
      const hasDoc = Array.from(foundDocs.keys()).some(filename => 
        filename.includes('security') || filename.includes(procedure) ||
        filename.includes('incident') || filename.includes('vulnerability')
      );
      
      if (hasDoc) {
        coverage.passed++;
        this.results.operationalProcedures.validations.push({
          type: 'security-procedures',
          procedure,
          status: 'passed',
          message: `${procedure} security procedure documented`
        });
      } else {
        coverage.missing.push(procedure);
        this.results.operationalProcedures.issues.push({
          severity: 'critical',
          category: 'security-procedures',
          message: `Missing security procedure documentation for ${procedure}`,
          recommendation: `Create detailed ${procedure} security procedure`,
          requirement: '10.6'
        });
      }
    }
    
    this.results.operationalProcedures.coverage.security = coverage;
  }

  async validateMaintenanceProcedures(foundDocs) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    for (const procedure of this.operationalRequirements.maintenance) {
      coverage.total++;
      
      const hasDoc = Array.from(foundDocs.keys()).some(filename => 
        filename.includes('maintenance') || filename.includes(procedure) ||
        filename.includes('update') || filename.includes('scaling')
      );
      
      if (hasDoc) {
        coverage.passed++;
        this.results.operationalProcedures.validations.push({
          type: 'maintenance-procedures',
          procedure,
          status: 'passed',
          message: `${procedure} maintenance procedure documented`
        });
      } else {
        coverage.missing.push(procedure);
        this.results.operationalProcedures.issues.push({
          severity: 'high',
          category: 'maintenance-procedures',
          message: `Missing maintenance procedure documentation for ${procedure}`,
          recommendation: `Create detailed ${procedure} maintenance procedure`,
          requirement: '10.6'
        });
      }
    }
    
    this.results.operationalProcedures.coverage.maintenance = coverage;
  }

  async validateSecurityComplianceDocumentation() {
    console.log('🔒 Validating security and compliance documentation...');
    
    const searchPaths = [
      process.cwd(),
      path.join(process.cwd(), 'docs'),
      path.join(process.cwd(), 'secure-gate-access', 'docs'),
      path.join(process.cwd(), 'security-validation'),
      path.join(process.cwd(), 'privacy-validation'),
      path.join(process.cwd(), 'production-readiness-tests', 'compliance-documentation')
    ];
    
    const foundDocs = new Map();
    
    for (const searchPath of searchPaths) {
      try {
        const docs = await this.findDocumentationFiles(searchPath);
        docs.forEach(doc => {
          const key = path.basename(doc).toLowerCase();
          if (!foundDocs.has(key)) {
            foundDocs.set(key, doc);
          }
        });
      } catch (error) {
        // Directory might not exist
      }
    }
    
    // Validate GDPR compliance documentation
    await this.validateGDPRDocumentation(foundDocs);
    
    // Validate KDPA compliance documentation
    await this.validateKDPADocumentation(foundDocs);
    
    // Validate security documentation
    await this.validateSecurityDocumentation(foundDocs);
    
    // Validate privacy documentation
    await this.validatePrivacyDocumentation(foundDocs);
    
    // Calculate security compliance score
    const totalChecks = Object.values(this.results.securityCompliance.coverage).reduce((sum, val) => sum + val.total, 0);
    const passedChecks = Object.values(this.results.securityCompliance.coverage).reduce((sum, val) => sum + val.passed, 0);
    
    this.results.securityCompliance.score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
  }

  async validateGDPRDocumentation(foundDocs) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    for (const requirement of this.securityComplianceRequirements.gdpr) {
      coverage.total++;
      
      const hasDoc = Array.from(foundDocs.keys()).some(filename => 
        filename.includes('gdpr') || filename.includes(requirement) ||
        filename.includes('privacy') || filename.includes('data-protection')
      );
      
      if (hasDoc) {
        coverage.passed++;
        this.results.securityCompliance.validations.push({
          type: 'gdpr-documentation',
          requirement,
          status: 'passed',
          message: `GDPR ${requirement} documented`
        });
      } else {
        coverage.missing.push(requirement);
        this.results.securityCompliance.issues.push({
          severity: 'critical',
          category: 'gdpr-compliance',
          message: `Missing GDPR documentation for ${requirement}`,
          recommendation: `Create comprehensive GDPR ${requirement} documentation`,
          requirement: '10.3'
        });
      }
    }
    
    this.results.securityCompliance.coverage.gdpr = coverage;
  }

  async validateKDPADocumentation(foundDocs) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    for (const requirement of this.securityComplianceRequirements.kdpa) {
      coverage.total++;
      
      const hasDoc = Array.from(foundDocs.keys()).some(filename => 
        filename.includes('kdpa') || filename.includes(requirement) ||
        filename.includes('kenya') || filename.includes('data-protection')
      );
      
      if (hasDoc) {
        coverage.passed++;
        this.results.securityCompliance.validations.push({
          type: 'kdpa-documentation',
          requirement,
          status: 'passed',
          message: `KDPA ${requirement} documented`
        });
      } else {
        coverage.missing.push(requirement);
        this.results.securityCompliance.issues.push({
          severity: 'critical',
          category: 'kdpa-compliance',
          message: `Missing KDPA documentation for ${requirement}`,
          recommendation: `Create comprehensive KDPA ${requirement} documentation`,
          requirement: '10.3'
        });
      }
    }
    
    this.results.securityCompliance.coverage.kdpa = coverage;
  }

  async validateSecurityDocumentation(foundDocs) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    for (const requirement of this.securityComplianceRequirements.security) {
      coverage.total++;
      
      const hasDoc = Array.from(foundDocs.keys()).some(filename => 
        filename.includes('security') || filename.includes(requirement) ||
        filename.includes('auth') || filename.includes('encryption')
      );
      
      if (hasDoc) {
        coverage.passed++;
        this.results.securityCompliance.validations.push({
          type: 'security-documentation',
          requirement,
          status: 'passed',
          message: `Security ${requirement} documented`
        });
      } else {
        coverage.missing.push(requirement);
        this.results.securityCompliance.issues.push({
          severity: 'high',
          category: 'security-documentation',
          message: `Missing security documentation for ${requirement}`,
          recommendation: `Create comprehensive security ${requirement} documentation`,
          requirement: '10.3'
        });
      }
    }
    
    this.results.securityCompliance.coverage.security = coverage;
  }

  async validatePrivacyDocumentation(foundDocs) {
    const coverage = { total: 0, passed: 0, missing: [] };
    
    for (const requirement of this.securityComplianceRequirements.privacy) {
      coverage.total++;
      
      const hasDoc = Array.from(foundDocs.keys()).some(filename => 
        filename.includes('privacy') || filename.includes(requirement) ||
        filename.includes('data') || filename.includes('retention')
      );
      
      if (hasDoc) {
        coverage.passed++;
        this.results.securityCompliance.validations.push({
          type: 'privacy-documentation',
          requirement,
          status: 'passed',
          message: `Privacy ${requirement} documented`
        });
      } else {
        coverage.missing.push(requirement);
        this.results.securityCompliance.issues.push({
          severity: 'high',
          category: 'privacy-documentation',
          message: `Missing privacy documentation for ${requirement}`,
          recommendation: `Create comprehensive privacy ${requirement} documentation`,
          requirement: '10.3'
        });
      }
    }
    
    this.results.securityCompliance.coverage.privacy = coverage;
  }

  calculateOverallScore() {
    const weights = {
      apiDocumentationCompleteness: 0.3,
      userGuideAccuracy: 0.25,
      operationalProcedures: 0.25,
      securityCompliance: 0.2
    };
    
    this.results.overallScore = Math.round(
      this.results.apiDocumentationCompleteness.score * weights.apiDocumentationCompleteness +
      this.results.userGuideAccuracy.score * weights.userGuideAccuracy +
      this.results.operationalProcedures.score * weights.operationalProcedures +
      this.results.securityCompliance.score * weights.securityCompliance
    );
    
    // Count total validations
    this.results.totalValidations = 
      this.results.apiDocumentationCompleteness.validations.length +
      this.results.userGuideAccuracy.validations.length +
      this.results.operationalProcedures.validations.length +
      this.results.securityCompliance.validations.length;
    
    // Count passed validations
    this.results.passedValidations = [
      ...this.results.apiDocumentationCompleteness.validations,
      ...this.results.userGuideAccuracy.validations,
      ...this.results.operationalProcedures.validations,
      ...this.results.securityCompliance.validations
    ].filter(validation => validation.status === 'passed').length;
    
    // Count critical issues
    this.results.criticalIssues = [
      ...this.results.apiDocumentationCompleteness.issues,
      ...this.results.userGuideAccuracy.issues,
      ...this.results.operationalProcedures.issues,
      ...this.results.securityCompliance.issues
    ].filter(issue => issue.severity === 'critical').length;
  }

  generateComprehensiveReport() {
    console.log('\n📊 Documentation Completeness Validation Report');
    console.log('================================================');
    console.log(`Overall Score: ${this.results.overallScore}/100`);
    console.log(`Passed Validations: ${this.results.passedValidations}/${this.results.totalValidations}`);
    console.log(`Critical Issues: ${this.results.criticalIssues}`);
    console.log(`Requirements: 10.3, 10.4, 10.6`);
    
    console.log('\n📚 API Documentation Completeness:', `${this.results.apiDocumentationCompleteness.score}/100`);
    this.printCategoryResults(this.results.apiDocumentationCompleteness);
    
    console.log('\n📖 User Guide Accuracy & Completeness:', `${this.results.userGuideAccuracy.score}/100`);
    this.printCategoryResults(this.results.userGuideAccuracy);
    
    console.log('\n⚙️ Operational Procedure Documentation:', `${this.results.operationalProcedures.score}/100`);
    this.printCategoryResults(this.results.operationalProcedures);
    
    console.log('\n🔒 Security & Compliance Documentation:', `${this.results.securityCompliance.score}/100`);
    this.printCategoryResults(this.results.securityCompliance);
    
    this.printRecommendations();
    this.printValidationSummary();
  }

  printCategoryResults(category) {
    if (category.issues.length > 0) {
      category.issues.slice(0, 5).forEach(issue => {
        console.log(`  ${this.getSeverityIcon(issue.severity)} ${issue.message}`);
      });
      if (category.issues.length > 5) {
        console.log(`  ... and ${category.issues.length - 5} more issues`);
      }
    }
    
    if (category.validations.length > 0) {
      const passedValidations = category.validations.filter(v => v.status === 'passed').length;
      console.log(`  ✅ ${passedValidations} validations passed`);
    }
  }

  printRecommendations() {
    console.log('\n💡 Top Priority Recommendations:');
    
    const criticalIssues = [
      ...this.results.apiDocumentationCompleteness.issues,
      ...this.results.userGuideAccuracy.issues,
      ...this.results.operationalProcedures.issues,
      ...this.results.securityCompliance.issues
    ].filter(issue => issue.severity === 'critical');
    
    const highIssues = [
      ...this.results.apiDocumentationCompleteness.issues,
      ...this.results.userGuideAccuracy.issues,
      ...this.results.operationalProcedures.issues,
      ...this.results.securityCompliance.issues
    ].filter(issue => issue.severity === 'high');
    
    const topRecommendations = [...criticalIssues, ...highIssues]
      .slice(0, 10)
      .map(issue => `${issue.recommendation} (${issue.requirement})`);
    
    [...new Set(topRecommendations)].forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }

  printValidationSummary() {
    console.log('\n📋 Validation Summary:');
    
    if (this.results.overallScore >= 90) {
      console.log('✅ Documentation is comprehensive and production-ready!');
    } else if (this.results.overallScore >= 75) {
      console.log('⚠️ Documentation is mostly complete but needs minor improvements');
    } else if (this.results.overallScore >= 60) {
      console.log('🔶 Documentation needs significant improvements before production');
    } else {
      console.log('❌ Documentation is incomplete and requires major work before production');
    }
    
    console.log(`\n🎯 Task 12.3 Status: ${this.results.criticalIssues === 0 && this.results.overallScore >= 75 ? 'PASSED' : 'NEEDS WORK'}`);
  }

  getSeverityIcon(severity) {
    const icons = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵'
    };
    return icons[severity] || '⚪';
  }

  async generateDetailedReport() {
    const reportPath = path.join(process.cwd(), 'production-readiness-tests', 'reports', 'documentation-completeness-validation-report.json');
    
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
      console.log(`📄 Detailed report saved to: ${reportPath}`);
      
      // Also generate a summary report
      const summaryPath = path.join(process.cwd(), 'production-readiness-tests', 'reports', 'documentation-completeness-summary.md');
      await this.generateMarkdownSummary(summaryPath);
      
    } catch (error) {
      console.error('❌ Failed to save detailed report:', error);
    }
  }

  async generateMarkdownSummary(summaryPath) {
    const summary = `# Documentation Completeness Validation Report

**Generated:** ${this.results.timestamp}
**Requirements:** 10.3, 10.4, 10.6
**Overall Score:** ${this.results.overallScore}/100

## Summary

- **Total Validations:** ${this.results.totalValidations}
- **Passed Validations:** ${this.results.passedValidations}
- **Critical Issues:** ${this.results.criticalIssues}
- **Status:** ${this.results.criticalIssues === 0 && this.results.overallScore >= 75 ? 'PASSED' : 'NEEDS WORK'}

## Category Scores

| Category | Score | Issues | Status |
|----------|-------|--------|--------|
| API Documentation Completeness | ${this.results.apiDocumentationCompleteness.score}/100 | ${this.results.apiDocumentationCompleteness.issues.length} | ${this.results.apiDocumentationCompleteness.score >= 75 ? '✅' : '❌'} |
| User Guide Accuracy | ${this.results.userGuideAccuracy.score}/100 | ${this.results.userGuideAccuracy.issues.length} | ${this.results.userGuideAccuracy.score >= 75 ? '✅' : '❌'} |
| Operational Procedures | ${this.results.operationalProcedures.score}/100 | ${this.results.operationalProcedures.issues.length} | ${this.results.operationalProcedures.score >= 75 ? '✅' : '❌'} |
| Security & Compliance | ${this.results.securityCompliance.score}/100 | ${this.results.securityCompliance.issues.length} | ${this.results.securityCompliance.score >= 75 ? '✅' : '❌'} |

## Critical Issues

${this.results.criticalIssues > 0 ? 
  [
    ...this.results.apiDocumentationCompleteness.issues,
    ...this.results.userGuideAccuracy.issues,
    ...this.results.operationalProcedures.issues,
    ...this.results.securityCompliance.issues
  ].filter(issue => issue.severity === 'critical')
   .map(issue => `- **${issue.category}:** ${issue.message}`)
   .join('\n') 
  : 'No critical issues found.'}

## Recommendations

${[
  ...this.results.apiDocumentationCompleteness.issues,
  ...this.results.userGuideAccuracy.issues,
  ...this.results.operationalProcedures.issues,
  ...this.results.securityCompliance.issues
].filter(issue => issue.severity === 'critical' || issue.severity === 'high')
 .slice(0, 10)
 .map(issue => `- ${issue.recommendation} (${issue.requirement})`)
 .join('\n')}

## Next Steps

${this.results.overallScore >= 75 ? 
  '✅ Documentation validation passed. Ready for production deployment.' :
  '❌ Address critical and high-priority issues before production deployment.'}
`;

    try {
      await fs.writeFile(summaryPath, summary);
      console.log(`📄 Summary report saved to: ${summaryPath}`);
    } catch (error) {
      console.error('❌ Failed to save summary report:', error);
    }
  }
}

// Export for use in other modules
module.exports = DocumentationCompletenessValidator;

// CLI execution
if (require.main === module) {
  const validator = new DocumentationCompletenessValidator();
  
  validator.validateDocumentationCompleteness()
    .then(async (results) => {
      await validator.generateDetailedReport();
      
      // Exit with appropriate code
      if (results.criticalIssues > 0) {
        console.log('\n❌ Critical issues found - documentation validation failed');
        process.exit(1);
      } else if (results.overallScore < 75) {
        console.log('\n⚠️ Documentation needs improvements before production');
        process.exit(1);
      } else {
        console.log('\n✅ Documentation completeness validation passed');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('❌ Documentation completeness validation failed:', error);
      process.exit(1);
    });
}