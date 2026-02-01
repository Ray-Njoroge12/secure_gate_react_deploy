/**
 * Documentation Completeness Validator Tests
 * 
 * Comprehensive test suite for documentation completeness validation system.
 * Tests all aspects of API documentation, user guides, operational procedures,
 * and security compliance documentation validation.
 * 
 * Requirements: 10.3, 10.4, 10.6
 */

const DocumentationCompletenessValidator = require('./documentation-completeness-validator');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

describe('DocumentationCompletenessValidator', () => {
  let validator;
  let mockFs;
  
  beforeEach(() => {
    validator = new DocumentationCompletenessValidator();
    
    // Mock file system operations
    mockFs = {
      readFile: jest.spyOn(fs, 'readFile'),
      readdir: jest.spyOn(fs, 'readdir'),
      access: jest.spyOn(fs, 'access'),
      mkdir: jest.spyOn(fs, 'mkdir'),
      writeFile: jest.spyOn(fs, 'writeFile')
    };
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('API Documentation Completeness Validation', () => {
    test('should validate complete API documentation', async () => {
      const mockApiDoc = {
        openapi: '3.0.0',
        info: {
          title: 'Secure Gate API',
          version: '1.0.0',
          description: 'Comprehensive API documentation'
        },
        paths: {
          '/api/auth/login': {
            post: {
              summary: 'User login',
              description: 'Authenticate user with credentials',
              responses: {
                '200': { description: 'Success' },
                '401': { description: 'Unauthorized' }
              }
            }
          },
          '/api/visitors': {
            get: {
              summary: 'Get visitors',
              description: 'Retrieve visitor list',
              responses: {
                '200': { 
                  description: 'Success',
                  content: {
                    'application/json': {
                      examples: {
                        success: {
                          value: { visitors: [] }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: { id: { type: 'integer' } }
            },
            Visitor: {
              type: 'object',
              properties: { id: { type: 'integer' } }
            },
            ErrorResponse: {
              type: 'object',
              properties: { message: { type: 'string' } }
            }
          },
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        },
        security: [{ bearerAuth: [] }]
      };
      
      mockFs.readFile.mockResolvedValue(yaml.dump(mockApiDoc));
      
      await validator.validateApiDocumentationCompleteness();
      
      expect(validator.results.apiDocumentationCompleteness.score).toBeGreaterThan(0);
      expect(validator.results.apiDocumentationCompleteness.validations.length).toBeGreaterThan(0);
    });

    test('should detect missing API documentation file', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      
      await validator.validateApiDocumentationCompleteness();
      
      const criticalIssues = validator.results.apiDocumentationCompleteness.issues
        .filter(issue => issue.severity === 'critical');
      
      expect(criticalIssues.length).toBeGreaterThan(0);
      expect(criticalIssues[0].message).toContain('API documentation file not found');
    });

    test('should validate endpoint coverage', async () => {
      const incompleteApiDoc = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/api/auth/login': {
            post: { summary: 'Login' }
          }
          // Missing many required endpoints
        }
      };
      
      mockFs.readFile.mockResolvedValue(yaml.dump(incompleteApiDoc));
      
      await validator.validateApiDocumentationCompleteness();
      
      const endpointIssues = validator.results.apiDocumentationCompleteness.issues
        .filter(issue => issue.category === 'endpoint-coverage');
      
      expect(endpointIssues.length).toBeGreaterThan(0);
    });

    test('should validate schema completeness', async () => {
      const apiDocWithoutSchemas = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            // Missing required schemas
          }
        }
      };
      
      mockFs.readFile.mockResolvedValue(yaml.dump(apiDocWithoutSchemas));
      
      await validator.validateApiDocumentationCompleteness();
      
      const schemaIssues = validator.results.apiDocumentationCompleteness.issues
        .filter(issue => issue.category === 'schema-missing');
      
      expect(schemaIssues.length).toBeGreaterThan(0);
    });

    test('should validate security documentation', async () => {
      const apiDocWithoutSecurity = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {},
        components: {
          // Missing securitySchemes
        }
      };
      
      mockFs.readFile.mockResolvedValue(yaml.dump(apiDocWithoutSecurity));
      
      await validator.validateApiDocumentationCompleteness();
      
      const securityIssues = validator.results.apiDocumentationCompleteness.issues
        .filter(issue => issue.category === 'security-documentation');
      
      expect(securityIssues.length).toBeGreaterThan(0);
    });
  });

  describe('User Guide Accuracy Validation', () => {
    test('should validate role-specific guides', async () => {
      const mockFiles = [
        { name: 'super-admin-guide.md', isFile: () => true },
        { name: 'estate-admin-guide.md', isFile: () => true },
        { name: 'guard-guide.md', isFile: () => true },
        { name: 'resident-guide.md', isFile: () => true }
      ];
      
      mockFs.readdir.mockResolvedValue(mockFiles);
      
      await validator.validateUserGuideAccuracy();
      
      const roleGuideValidations = validator.results.userGuideAccuracy.validations
        .filter(v => v.type === 'role-guide');
      
      expect(roleGuideValidations.length).toBeGreaterThan(0);
    });

    test('should detect missing user guides', async () => {
      mockFs.readdir.mockResolvedValue([]);
      
      await validator.validateUserGuideAccuracy();
      
      const missingGuideIssues = validator.results.userGuideAccuracy.issues
        .filter(issue => issue.category === 'role-guides');
      
      expect(missingGuideIssues.length).toBeGreaterThan(0);
    });

    test('should validate workflow documentation', async () => {
      const mockFiles = [
        { name: 'visitor-invitation-workflow.md', isFile: () => true },
        { name: 'check-in-process.md', isFile: () => true }
      ];
      
      mockFs.readdir.mockResolvedValue(mockFiles);
      
      await validator.validateUserGuideAccuracy();
      
      const workflowValidations = validator.results.userGuideAccuracy.validations
        .filter(v => v.type === 'workflow-documentation');
      
      expect(workflowValidations.length).toBeGreaterThan(0);
    });

    test('should validate accessibility documentation', async () => {
      const mockFiles = [
        { name: 'accessibility-guide.md', isFile: () => true },
        { name: 'keyboard-navigation.md', isFile: () => true }
      ];
      
      mockFs.readdir.mockResolvedValue(mockFiles);
      
      await validator.validateUserGuideAccuracy();
      
      const accessibilityValidations = validator.results.userGuideAccuracy.validations
        .filter(v => v.type === 'accessibility-documentation');
      
      expect(accessibilityValidations.length).toBeGreaterThan(0);
    });
  });

  describe('Operational Procedure Documentation Validation', () => {
    test('should validate deployment procedures', async () => {
      const mockFiles = [
        { name: 'deployment-guide.md', isFile: () => true },
        { name: 'environment-setup.md', isFile: () => true }
      ];
      
      mockFs.readdir.mockResolvedValue(mockFiles);
      
      await validator.validateOperationalProcedureDocumentation();
      
      const deploymentValidations = validator.results.operationalProcedures.validations
        .filter(v => v.type === 'deployment-procedures');
      
      expect(deploymentValidations.length).toBeGreaterThan(0);
    });

    test('should validate monitoring procedures', async () => {
      const mockFiles = [
        { name: 'monitoring-guide.md', isFile: () => true },
        { name: 'alerting-setup.md', isFile: () => true }
      ];
      
      mockFs.readdir.mockResolvedValue(mockFiles);
      
      await validator.validateOperationalProcedureDocumentation();
      
      const monitoringValidations = validator.results.operationalProcedures.validations
        .filter(v => v.type === 'monitoring-procedures');
      
      expect(monitoringValidations.length).toBeGreaterThan(0);
    });

    test('should validate backup procedures', async () => {
      const mockFiles = [
        { name: 'backup-procedures.md', isFile: () => true },
        { name: 'disaster-recovery.md', isFile: () => true }
      ];
      
      mockFs.readdir.mockResolvedValue(mockFiles);
      
      await validator.validateOperationalProcedureDocumentation();
      
      const backupValidations = validator.results.operationalProcedures.validations
        .filter(v => v.type === 'backup-procedures');
      
      expect(backupValidations.length).toBeGreaterThan(0);
    });

    test('should detect missing critical operational procedures', async () => {
      mockFs.readdir.mockResolvedValue([]);
      
      await validator.validateOperationalProcedureDocumentation();
      
      const criticalIssues = validator.results.operationalProcedures.issues
        .filter(issue => issue.severity === 'critical');
      
      expect(criticalIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Security and Compliance Documentation Validation', () => {
    test('should validate GDPR documentation', async () => {
      const mockFiles = [
        { name: 'gdpr-compliance.md', isFile: () => true },
        { name: 'data-processing.md', isFile: () => true }
      ];
      
      mockFs.readdir.mockResolvedValue(mockFiles);
      
      await validator.validateSecurityComplianceDocumentation();
      
      const gdprValidations = validator.results.securityCompliance.validations
        .filter(v => v.type === 'gdpr-documentation');
      
      expect(gdprValidations.length).toBeGreaterThan(0);
    });

    test('should validate KDPA documentation', async () => {
      const mockFiles = [
        { name: 'kdpa-compliance.md', isFile: () => true },
        { name: 'kenya-data-protection.md', isFile: () => true }
      ];
      
      mockFs.readdir.mockResolvedValue(mockFiles);
      
      await validator.validateSecurityComplianceDocumentation();
      
      const kdpaValidations = validator.results.securityCompliance.validations
        .filter(v => v.type === 'kdpa-documentation');
      
      expect(kdpaValidations.length).toBeGreaterThan(0);
    });

    test('should validate security documentation', async () => {
      const mockFiles = [
        { name: 'security-guide.md', isFile: () => true },
        { name: 'authentication.md', isFile: () => true }
      ];
      
      mockFs.readdir.mockResolvedValue(mockFiles);
      
      await validator.validateSecurityComplianceDocumentation();
      
      const securityValidations = validator.results.securityCompliance.validations
        .filter(v => v.type === 'security-documentation');
      
      expect(securityValidations.length).toBeGreaterThan(0);
    });

    test('should detect missing compliance documentation', async () => {
      mockFs.readdir.mockResolvedValue([]);
      
      await validator.validateSecurityComplianceDocumentation();
      
      const criticalIssues = validator.results.securityCompliance.issues
        .filter(issue => issue.severity === 'critical');
      
      expect(criticalIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Overall Validation and Scoring', () => {
    test('should calculate overall score correctly', async () => {
      // Mock all validations to return some results
      mockFs.readFile.mockResolvedValue(yaml.dump({
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {},
        components: { schemas: {} }
      }));
      mockFs.readdir.mockResolvedValue([]);
      
      await validator.validateDocumentationCompleteness();
      
      expect(validator.results.overallScore).toBeGreaterThanOrEqual(0);
      expect(validator.results.overallScore).toBeLessThanOrEqual(100);
    });

    test('should count validations correctly', async () => {
      mockFs.readFile.mockResolvedValue(yaml.dump({
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {},
        components: { schemas: {} }
      }));
      mockFs.readdir.mockResolvedValue([]);
      
      await validator.validateDocumentationCompleteness();
      
      expect(validator.results.totalValidations).toBeGreaterThanOrEqual(0);
      expect(validator.results.passedValidations).toBeGreaterThanOrEqual(0);
      expect(validator.results.passedValidations).toBeLessThanOrEqual(validator.results.totalValidations);
    });

    test('should identify critical issues', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      mockFs.readdir.mockResolvedValue([]);
      
      await validator.validateDocumentationCompleteness();
      
      expect(validator.results.criticalIssues).toBeGreaterThan(0);
    });

    test('should generate comprehensive report', async () => {
      mockFs.readFile.mockResolvedValue(yaml.dump({
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {},
        components: { schemas: {} }
      }));
      mockFs.readdir.mockResolvedValue([]);
      mockFs.mkdir.mockResolvedValue();
      mockFs.writeFile.mockResolvedValue();
      
      await validator.validateDocumentationCompleteness();
      await validator.generateDetailedReport();
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('documentation-completeness-validation-report.json'),
        expect.any(String)
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle file system errors gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));
      mockFs.readdir.mockRejectedValue(new Error('Directory not found'));
      
      await expect(validator.validateDocumentationCompleteness()).resolves.toBeDefined();
      
      expect(validator.results.apiDocumentationCompleteness.issues.length).toBeGreaterThan(0);
    });

    test('should handle invalid YAML gracefully', async () => {
      mockFs.readFile.mockResolvedValue('invalid: yaml: content: [');
      
      await validator.validateApiDocumentationCompleteness();
      
      expect(validator.results.apiDocumentationCompleteness.issues.length).toBeGreaterThan(0);
    });

    test('should handle missing directories gracefully', async () => {
      mockFs.readdir.mockRejectedValue(new Error('ENOENT: no such file or directory'));
      
      await validator.validateUserGuideAccuracy();
      
      expect(validator.results.userGuideAccuracy.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Report Generation', () => {
    test('should generate markdown summary', async () => {
      mockFs.readFile.mockResolvedValue(yaml.dump({
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {},
        components: { schemas: {} }
      }));
      mockFs.readdir.mockResolvedValue([]);
      mockFs.mkdir.mockResolvedValue();
      mockFs.writeFile.mockResolvedValue();
      
      await validator.validateDocumentationCompleteness();
      await validator.generateDetailedReport();
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('documentation-completeness-summary.md'),
        expect.stringContaining('# Documentation Completeness Validation Report')
      );
    });

    test('should include requirement references in report', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      mockFs.readdir.mockResolvedValue([]);
      
      await validator.validateDocumentationCompleteness();
      
      const hasRequirementReferences = validator.results.apiDocumentationCompleteness.issues
        .some(issue => issue.requirement);
      
      expect(hasRequirementReferences).toBe(true);
    });
  });

  describe('Integration with Requirements', () => {
    test('should validate requirement 10.3 (API documentation completeness)', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      
      await validator.validateApiDocumentationCompleteness();
      
      const req103Issues = validator.results.apiDocumentationCompleteness.issues
        .filter(issue => issue.requirement === '10.3');
      
      expect(req103Issues.length).toBeGreaterThan(0);
    });

    test('should validate requirement 10.4 (user guide accuracy)', async () => {
      mockFs.readdir.mockResolvedValue([]);
      
      await validator.validateUserGuideAccuracy();
      
      const req104Issues = validator.results.userGuideAccuracy.issues
        .filter(issue => issue.requirement === '10.4');
      
      expect(req104Issues.length).toBeGreaterThan(0);
    });

    test('should validate requirement 10.6 (operational procedures)', async () => {
      mockFs.readdir.mockResolvedValue([]);
      
      await validator.validateOperationalProcedureDocumentation();
      
      const req106Issues = validator.results.operationalProcedures.issues
        .filter(issue => issue.requirement === '10.6');
      
      expect(req106Issues.length).toBeGreaterThan(0);
    });
  });
});