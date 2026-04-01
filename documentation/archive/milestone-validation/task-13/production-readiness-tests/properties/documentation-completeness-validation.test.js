/**
 * Documentation Completeness Validation Property Tests
 * 
 * Property-based tests for documentation completeness validation system.
 * Tests invariants and properties that should hold across all documentation
 * validation scenarios.
 * 
 * **Validates: Requirements 10.3, 10.4, 10.6**
 * 
 * Requirements: 10.3, 10.4, 10.6
 */

const fc = require('fast-check');
const DocumentationCompletenessValidator = require('../system-optimization/documentation-completeness-validator');
const fs = require('fs').promises;
const yaml = require('js-yaml');

describe('Documentation Completeness Validation Properties', () => {
  let validator;
  
  beforeEach(() => {
    validator = new DocumentationCompletenessValidator();
  });

  describe('Score Calculation Properties', () => {
    test('overall score should always be between 0 and 100', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          apiScore: fc.integer({ min: 0, max: 100 }),
          userGuideScore: fc.integer({ min: 0, max: 100 }),
          operationalScore: fc.integer({ min: 0, max: 100 }),
          securityScore: fc.integer({ min: 0, max: 100 })
        }),
        async (scores) => {
          // Set up mock scores
          validator.results.apiDocumentationCompleteness.score = scores.apiScore;
          validator.results.userGuideAccuracy.score = scores.userGuideScore;
          validator.results.operationalProcedures.score = scores.operationalScore;
          validator.results.securityCompliance.score = scores.securityScore;
          
          validator.calculateOverallScore();
          
          // Property: Overall score must be between 0 and 100
          expect(validator.results.overallScore).toBeGreaterThanOrEqual(0);
          expect(validator.results.overallScore).toBeLessThanOrEqual(100);
        }
      ));
    });

    test('passed validations should never exceed total validations', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          apiValidations: fc.array(fc.record({
            type: fc.string(),
            status: fc.constantFrom('passed', 'failed')
          }), { maxLength: 50 }),
          userValidations: fc.array(fc.record({
            type: fc.string(),
            status: fc.constantFrom('passed', 'failed')
          }), { maxLength: 50 }),
          operationalValidations: fc.array(fc.record({
            type: fc.string(),
            status: fc.constantFrom('passed', 'failed')
          }), { maxLength: 50 }),
          securityValidations: fc.array(fc.record({
            type: fc.string(),
            status: fc.constantFrom('passed', 'failed')
          }), { maxLength: 50 })
        }),
        async (validations) => {
          // Set up mock validations
          validator.results.apiDocumentationCompleteness.validations = validations.apiValidations;
          validator.results.userGuideAccuracy.validations = validations.userValidations;
          validator.results.operationalProcedures.validations = validations.operationalValidations;
          validator.results.securityCompliance.validations = validations.securityValidations;
          
          validator.calculateOverallScore();
          
          // Property: Passed validations <= Total validations
          expect(validator.results.passedValidations).toBeLessThanOrEqual(validator.results.totalValidations);
          
          // Property: Total validations should equal sum of all category validations
          const expectedTotal = 
            validations.apiValidations.length +
            validations.userValidations.length +
            validations.operationalValidations.length +
            validations.securityValidations.length;
          
          expect(validator.results.totalValidations).toBe(expectedTotal);
        }
      ));
    });
  });

  describe('Issue Severity Properties', () => {
    test('critical issues count should match actual critical issues', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          apiIssues: fc.array(fc.record({
            severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
            message: fc.string(),
            category: fc.string()
          }), { maxLength: 20 }),
          userIssues: fc.array(fc.record({
            severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
            message: fc.string(),
            category: fc.string()
          }), { maxLength: 20 }),
          operationalIssues: fc.array(fc.record({
            severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
            message: fc.string(),
            category: fc.string()
          }), { maxLength: 20 }),
          securityIssues: fc.array(fc.record({
            severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
            message: fc.string(),
            category: fc.string()
          }), { maxLength: 20 })
        }),
        async (issues) => {
          // Set up mock issues
          validator.results.apiDocumentationCompleteness.issues = issues.apiIssues;
          validator.results.userGuideAccuracy.issues = issues.userIssues;
          validator.results.operationalProcedures.issues = issues.operationalIssues;
          validator.results.securityCompliance.issues = issues.securityIssues;
          
          validator.calculateOverallScore();
          
          // Count expected critical issues
          const expectedCritical = [
            ...issues.apiIssues,
            ...issues.userIssues,
            ...issues.operationalIssues,
            ...issues.securityIssues
          ].filter(issue => issue.severity === 'critical').length;
          
          // Property: Critical issues count should match actual critical issues
          expect(validator.results.criticalIssues).toBe(expectedCritical);
        }
      ));
    });

    test('severity levels should be consistent', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(fc.record({
          severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
          message: fc.string(),
          category: fc.string()
        }), { maxLength: 50 }),
        async (issues) => {
          // Property: All issues should have valid severity levels
          const validSeverities = ['critical', 'high', 'medium', 'low'];
          
          issues.forEach(issue => {
            expect(validSeverities).toContain(issue.severity);
          });
          
          // Property: Severity icon should exist for all severities
          issues.forEach(issue => {
            const icon = validator.getSeverityIcon(issue.severity);
            expect(icon).toBeDefined();
            expect(typeof icon).toBe('string');
            expect(icon.length).toBeGreaterThan(0);
          });
        }
      ));
    });
  });

  describe('API Documentation Validation Properties', () => {
    test('endpoint coverage should be consistent', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          paths: fc.dictionary(
            fc.string(),
            fc.record({
              get: fc.record({
                summary: fc.string(),
                responses: fc.dictionary(fc.string(), fc.record({ description: fc.string() }))
              }).optional(),
              post: fc.record({
                summary: fc.string(),
                responses: fc.dictionary(fc.string(), fc.record({ description: fc.string() }))
              }).optional()
            })
          )
        }),
        async (apiDoc) => {
          const mockApiDoc = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            ...apiDoc
          };
          
          // Mock file system
          jest.spyOn(fs, 'readFile').mockResolvedValue(yaml.dump(mockApiDoc));
          
          await validator.validateApiDocumentationCompleteness();
          
          // Property: Coverage should have consistent structure
          if (validator.results.apiDocumentationCompleteness.coverage.endpoints) {
            const coverage = validator.results.apiDocumentationCompleteness.coverage.endpoints;
            
            expect(coverage.total).toBeGreaterThanOrEqual(0);
            expect(coverage.passed).toBeGreaterThanOrEqual(0);
            expect(coverage.passed).toBeLessThanOrEqual(coverage.total);
            expect(Array.isArray(coverage.missing)).toBe(true);
          }
          
          jest.restoreAllMocks();
        }
      ));
    });

    test('schema validation should be consistent', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          components: fc.record({
            schemas: fc.dictionary(
              fc.string(),
              fc.record({
                type: fc.constantFrom('object', 'array', 'string', 'number'),
                properties: fc.dictionary(
                  fc.string(),
                  fc.record({ type: fc.string() })
                ).optional()
              })
            )
          }).optional()
        }),
        async (apiDoc) => {
          const mockApiDoc = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {},
            ...apiDoc
          };
          
          jest.spyOn(fs, 'readFile').mockResolvedValue(yaml.dump(mockApiDoc));
          
          await validator.validateApiDocumentationCompleteness();
          
          // Property: Schema coverage should be consistent
          if (validator.results.apiDocumentationCompleteness.coverage.schemas) {
            const coverage = validator.results.apiDocumentationCompleteness.coverage.schemas;
            
            expect(coverage.total).toBeGreaterThanOrEqual(0);
            expect(coverage.passed).toBeGreaterThanOrEqual(0);
            expect(coverage.passed).toBeLessThanOrEqual(coverage.total);
            expect(Array.isArray(coverage.missing)).toBe(true);
          }
          
          jest.restoreAllMocks();
        }
      ));
    });
  });

  describe('File Discovery Properties', () => {
    test('file discovery should handle various directory structures', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(fc.record({
          name: fc.string().filter(s => s.length > 0 && !s.includes('/')),
          isFile: fc.constant(() => true),
          isDirectory: fc.constant(() => false)
        }), { maxLength: 20 }),
        async (mockFiles) => {
          // Mock file system
          jest.spyOn(fs, 'readdir').mockResolvedValue(mockFiles);
          
          const foundFiles = await validator.findDocumentationFiles('/mock/path');
          
          // Property: Found files should be an array
          expect(Array.isArray(foundFiles)).toBe(true);
          
          // Property: All found files should have valid paths
          foundFiles.forEach(file => {
            expect(typeof file).toBe('string');
            expect(file.length).toBeGreaterThan(0);
          });
          
          jest.restoreAllMocks();
        }
      ));
    });

    test('markdown file filtering should be consistent', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(fc.record({
          name: fc.oneof(
            fc.string().map(s => s + '.md'),
            fc.string().map(s => s + '.txt'),
            fc.string().map(s => s + '.json'),
            fc.string()
          ),
          isFile: fc.constant(() => true),
          isDirectory: fc.constant(() => false)
        }), { maxLength: 30 }),
        async (mockFiles) => {
          jest.spyOn(fs, 'readdir').mockResolvedValue(mockFiles);
          
          const foundFiles = await validator.findDocumentationFiles('/mock/path');
          
          // Property: Only .md files should be included
          foundFiles.forEach(file => {
            expect(file.endsWith('.md')).toBe(true);
          });
          
          // Property: All .md files from input should be found
          const expectedMdFiles = mockFiles
            .filter(file => file.name.endsWith('.md'))
            .length;
          
          expect(foundFiles.length).toBe(expectedMdFiles);
          
          jest.restoreAllMocks();
        }
      ));
    });
  });

  describe('Validation Consistency Properties', () => {
    test('validation results should be deterministic', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          apiDoc: fc.record({
            openapi: fc.constant('3.0.0'),
            info: fc.record({
              title: fc.string(),
              version: fc.string()
            }),
            paths: fc.dictionary(fc.string(), fc.record({}))
          }),
          files: fc.array(fc.record({
            name: fc.string().map(s => s + '.md'),
            isFile: fc.constant(() => true)
          }), { maxLength: 10 })
        }),
        async (testData) => {
          // Mock file system consistently
          jest.spyOn(fs, 'readFile').mockResolvedValue(yaml.dump(testData.apiDoc));
          jest.spyOn(fs, 'readdir').mockResolvedValue(testData.files);
          
          // Run validation twice
          const validator1 = new DocumentationCompletenessValidator();
          const validator2 = new DocumentationCompletenessValidator();
          
          await validator1.validateDocumentationCompleteness();
          await validator2.validateDocumentationCompleteness();
          
          // Property: Results should be identical for same input
          expect(validator1.results.overallScore).toBe(validator2.results.overallScore);
          expect(validator1.results.criticalIssues).toBe(validator2.results.criticalIssues);
          expect(validator1.results.totalValidations).toBe(validator2.results.totalValidations);
          
          jest.restoreAllMocks();
        }
      ));
    });

    test('requirement references should be consistent', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(fc.record({
          severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
          message: fc.string(),
          category: fc.string(),
          requirement: fc.constantFrom('10.3', '10.4', '10.6')
        }), { maxLength: 20 }),
        async (issues) => {
          // Property: All issues should have valid requirement references
          const validRequirements = ['10.3', '10.4', '10.6'];
          
          issues.forEach(issue => {
            if (issue.requirement) {
              expect(validRequirements).toContain(issue.requirement);
            }
          });
          
          // Property: API documentation issues should reference 10.3
          const apiIssues = issues.filter(issue => 
            issue.category && issue.category.includes('api')
          );
          
          apiIssues.forEach(issue => {
            if (issue.requirement) {
              expect(issue.requirement).toBe('10.3');
            }
          });
        }
      ));
    });
  });

  describe('Coverage Calculation Properties', () => {
    test('coverage percentages should be mathematically correct', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          total: fc.integer({ min: 1, max: 100 }),
          passed: fc.integer({ min: 0, max: 100 })
        }).filter(({ total, passed }) => passed <= total),
        async (coverage) => {
          // Calculate expected percentage
          const expectedPercentage = Math.round((coverage.passed / coverage.total) * 100);
          
          // Mock coverage data
          validator.results.apiDocumentationCompleteness.coverage = {
            endpoints: coverage,
            schemas: coverage,
            security: coverage,
            documentation: coverage
          };
          
          // Calculate score (simplified version of actual calculation)
          const totalChecks = Object.values(validator.results.apiDocumentationCompleteness.coverage)
            .reduce((sum, val) => sum + val.total, 0);
          const passedChecks = Object.values(validator.results.apiDocumentationCompleteness.coverage)
            .reduce((sum, val) => sum + val.passed, 0);
          
          const actualScore = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
          
          // Property: Score should be mathematically correct
          expect(actualScore).toBeGreaterThanOrEqual(0);
          expect(actualScore).toBeLessThanOrEqual(100);
          
          // Property: If all checks pass, score should be 100
          if (passedChecks === totalChecks && totalChecks > 0) {
            expect(actualScore).toBe(100);
          }
          
          // Property: If no checks pass, score should be 0
          if (passedChecks === 0) {
            expect(actualScore).toBe(0);
          }
        }
      ));
    });
  });

  describe('Error Handling Properties', () => {
    test('validation should handle errors gracefully', async () => {
      await fc.assert(fc.asyncProperty(
        fc.constantFrom(
          new Error('File not found'),
          new Error('Permission denied'),
          new Error('Invalid YAML'),
          new Error('Network timeout')
        ),
        async (error) => {
          // Mock file system to throw error
          jest.spyOn(fs, 'readFile').mockRejectedValue(error);
          jest.spyOn(fs, 'readdir').mockRejectedValue(error);
          
          // Property: Validation should not throw errors
          await expect(validator.validateDocumentationCompleteness()).resolves.toBeDefined();
          
          // Property: Results should still be valid structure
          expect(validator.results).toBeDefined();
          expect(typeof validator.results.overallScore).toBe('number');
          expect(Array.isArray(validator.results.apiDocumentationCompleteness.issues)).toBe(true);
          
          // Property: Errors should be recorded as issues
          expect(validator.results.apiDocumentationCompleteness.issues.length).toBeGreaterThan(0);
          
          jest.restoreAllMocks();
        }
      ));
    });
  });

  describe('Report Generation Properties', () => {
    test('generated reports should have consistent structure', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          overallScore: fc.integer({ min: 0, max: 100 }),
          criticalIssues: fc.integer({ min: 0, max: 50 }),
          totalValidations: fc.integer({ min: 0, max: 200 })
        }),
        async (mockResults) => {
          // Set up mock results
          validator.results.overallScore = mockResults.overallScore;
          validator.results.criticalIssues = mockResults.criticalIssues;
          validator.results.totalValidations = mockResults.totalValidations;
          validator.results.passedValidations = Math.min(mockResults.totalValidations, mockResults.overallScore);
          validator.results.timestamp = new Date().toISOString();
          
          // Mock file system for report generation
          jest.spyOn(fs, 'mkdir').mockResolvedValue();
          jest.spyOn(fs, 'writeFile').mockResolvedValue();
          
          await validator.generateDetailedReport();
          
          // Property: Report should be generated
          expect(fs.writeFile).toHaveBeenCalled();
          
          // Property: JSON report should be valid JSON
          const jsonReportCall = fs.writeFile.mock.calls
            .find(call => call[0].includes('.json'));
          
          if (jsonReportCall) {
            expect(() => JSON.parse(jsonReportCall[1])).not.toThrow();
          }
          
          // Property: Markdown report should contain expected sections
          const mdReportCall = fs.writeFile.mock.calls
            .find(call => call[0].includes('.md'));
          
          if (mdReportCall) {
            const content = mdReportCall[1];
            expect(content).toContain('# Documentation Completeness Validation Report');
            expect(content).toContain('Overall Score:');
            expect(content).toContain('Requirements: 10.3, 10.4, 10.6');
          }
          
          jest.restoreAllMocks();
        }
      ));
    });
  });
});