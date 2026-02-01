/**
 * Documentation Validation System
 * 
 * Comprehensive documentation audit and validation system for production readiness.
 * Validates API documentation completeness, user guides accuracy, operational procedures,
 * and documentation structure organization.
 * 
 * Requirements: 5.4
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

class DocumentationValidator {
  constructor() {
    this.results = {
      apiDocumentation: { score: 0, issues: [], recommendations: [] },
      userGuides: { score: 0, issues: [], recommendations: [] },
      operationalProcedures: { score: 0, issues: [], recommendations: [] },
      documentationStructure: { score: 0, issues: [], recommendations: [] },
      overallScore: 0,
      totalIssues: 0,
      criticalIssues: 0
    };
    
    this.requiredApiEndpoints = [
      '/api/auth/login', '/api/auth/register', '/api/auth/refresh',
      '/api/visitors', '/api/visitors/{id}', '/api/visitors/{id}/check-in',
      '/api/admin/users', '/api/admin/metrics', '/api/health'
    ];
    
    this.requiredUserGuides = [
      'user-guide', 'admin-guide', 'guard-guide', 'resident-guide',
      'installation-guide', 'troubleshooting-guide'
    ];
    
    this.requiredOperationalDocs = [
      'deployment-guide', 'monitoring-guide', 'backup-procedures',
      'security-procedures', 'incident-response'
    ];
  }

  async validateDocumentation() {
    console.log('🔍 Starting comprehensive documentation validation...');
    
    try {
      await this.validateApiDocumentation();
      await this.validateUserGuides();
      await this.validateOperationalProcedures();
      await this.validateDocumentationStructure();
      
      this.calculateOverallScore();
      this.generateReport();
      
      return this.results;
    } catch (error) {
      console.error('❌ Documentation validation failed:', error);
      throw error;
    }
  }

  async validateApiDocumentation() {
    console.log('📚 Validating API documentation...');
    
    try {
      // Check for OpenAPI/Swagger documentation
      const apiDocPath = path.join(process.cwd(), 'secure-gate-access', 'api-documentation.yaml');
      
      try {
        const apiDocContent = await fs.readFile(apiDocPath, 'utf8');
        const apiDoc = yaml.load(apiDocContent);
        
        // Validate OpenAPI structure
        this.validateOpenApiStructure(apiDoc);
        
        // Validate endpoint coverage
        this.validateEndpointCoverage(apiDoc);
        
        // Validate response schemas
        this.validateResponseSchemas(apiDoc);
        
        // Validate security documentation
        this.validateSecurityDocumentation(apiDoc);
        
        this.results.apiDocumentation.score = Math.max(0, 100 - (this.results.apiDocumentation.issues.length * 10));
        
      } catch (fileError) {
        this.results.apiDocumentation.issues.push({
          severity: 'critical',
          message: 'API documentation file not found or invalid',
          file: apiDocPath,
          recommendation: 'Create comprehensive OpenAPI/Swagger documentation'
        });
      }
      
    } catch (error) {
      console.error('❌ API documentation validation failed:', error);
      this.results.apiDocumentation.issues.push({
        severity: 'critical',
        message: `API documentation validation error: ${error.message}`,
        recommendation: 'Fix API documentation validation process'
      });
    }
  }

  validateOpenApiStructure(apiDoc) {
    const requiredFields = ['openapi', 'info', 'paths', 'components'];
    
    requiredFields.forEach(field => {
      if (!apiDoc[field]) {
        this.results.apiDocumentation.issues.push({
          severity: 'high',
          message: `Missing required OpenAPI field: ${field}`,
          recommendation: `Add ${field} section to API documentation`
        });
      }
    });
    
    // Validate info section
    if (apiDoc.info) {
      const requiredInfoFields = ['title', 'version', 'description'];
      requiredInfoFields.forEach(field => {
        if (!apiDoc.info[field]) {
          this.results.apiDocumentation.issues.push({
            severity: 'medium',
            message: `Missing API info field: ${field}`,
            recommendation: `Add ${field} to API info section`
          });
        }
      });
    }
  }

  validateEndpointCoverage(apiDoc) {
    if (!apiDoc.paths) return;
    
    const documentedEndpoints = Object.keys(apiDoc.paths);
    
    this.requiredApiEndpoints.forEach(endpoint => {
      const found = documentedEndpoints.some(docEndpoint => {
        // Handle parameterized endpoints
        const pattern = endpoint.replace(/\{[^}]+\}/g, '[^/]+');
        return new RegExp(`^${pattern}$`).test(docEndpoint) || docEndpoint === endpoint;
      });
      
      if (!found) {
        this.results.apiDocumentation.issues.push({
          severity: 'high',
          message: `Missing documentation for required endpoint: ${endpoint}`,
          recommendation: `Add comprehensive documentation for ${endpoint}`
        });
      }
    });
    
    // Validate endpoint documentation completeness
    Object.entries(apiDoc.paths).forEach(([endpoint, methods]) => {
      Object.entries(methods).forEach(([method, spec]) => {
        if (!spec.summary) {
          this.results.apiDocumentation.issues.push({
            severity: 'medium',
            message: `Missing summary for ${method.toUpperCase()} ${endpoint}`,
            recommendation: 'Add descriptive summary to endpoint'
          });
        }
        
        if (!spec.responses) {
          this.results.apiDocumentation.issues.push({
            severity: 'high',
            message: `Missing response documentation for ${method.toUpperCase()} ${endpoint}`,
            recommendation: 'Add response schemas and examples'
          });
        }
      });
    });
  }

  validateResponseSchemas(apiDoc) {
    if (!apiDoc.components || !apiDoc.components.schemas) {
      this.results.apiDocumentation.issues.push({
        severity: 'high',
        message: 'Missing response schemas in components section',
        recommendation: 'Add comprehensive response schemas'
      });
      return;
    }
    
    const requiredSchemas = [
      'User', 'Visitor', 'Estate', 'ErrorResponse', 'SuccessResponse'
    ];
    
    requiredSchemas.forEach(schema => {
      if (!apiDoc.components.schemas[schema]) {
        this.results.apiDocumentation.issues.push({
          severity: 'medium',
          message: `Missing schema definition: ${schema}`,
          recommendation: `Add ${schema} schema to components`
        });
      }
    });
  }

  validateSecurityDocumentation(apiDoc) {
    if (!apiDoc.components || !apiDoc.components.securitySchemes) {
      this.results.apiDocumentation.issues.push({
        severity: 'high',
        message: 'Missing security scheme documentation',
        recommendation: 'Add JWT authentication documentation'
      });
    }
    
    if (!apiDoc.security) {
      this.results.apiDocumentation.issues.push({
        severity: 'medium',
        message: 'Missing global security requirements',
        recommendation: 'Add security requirements to API documentation'
      });
    }
  }

  async validateUserGuides() {
    console.log('📖 Validating user guides...');
    
    const docsDir = path.join(process.cwd(), 'secure-gate-access', 'docs');
    
    try {
      const files = await fs.readdir(docsDir, { withFileTypes: true });
      const docFiles = files
        .filter(file => file.isFile() && file.name.endsWith('.md'))
        .map(file => file.name);
      
      // Check for required user guides
      this.requiredUserGuides.forEach(guide => {
        const found = docFiles.some(file => 
          file.toLowerCase().includes(guide.toLowerCase())
        );
        
        if (!found) {
          this.results.userGuides.issues.push({
            severity: 'high',
            message: `Missing required user guide: ${guide}`,
            recommendation: `Create comprehensive ${guide} documentation`
          });
        }
      });
      
      // Validate existing guides
      for (const file of docFiles) {
        await this.validateUserGuideContent(path.join(docsDir, file));
      }
      
      this.results.userGuides.score = Math.max(0, 100 - (this.results.userGuides.issues.length * 8));
      
    } catch (error) {
      this.results.userGuides.issues.push({
        severity: 'critical',
        message: 'Unable to access documentation directory',
        recommendation: 'Create docs directory with user guides'
      });
    }
  }

  async validateUserGuideContent(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      // Check for basic structure
      if (!content.includes('# ') && !content.includes('## ')) {
        this.results.userGuides.issues.push({
          severity: 'medium',
          message: `Poor structure in ${fileName}`,
          file: filePath,
          recommendation: 'Add proper headings and structure'
        });
      }
      
      // Check for minimum content length
      if (content.length < 500) {
        this.results.userGuides.issues.push({
          severity: 'medium',
          message: `Insufficient content in ${fileName}`,
          file: filePath,
          recommendation: 'Expand documentation with detailed instructions'
        });
      }
      
      // Check for screenshots or examples
      if (!content.includes('![') && !content.includes('```')) {
        this.results.userGuides.issues.push({
          severity: 'low',
          message: `No visual aids in ${fileName}`,
          file: filePath,
          recommendation: 'Add screenshots or code examples'
        });
      }
      
    } catch (error) {
      this.results.userGuides.issues.push({
        severity: 'medium',
        message: `Unable to validate ${path.basename(filePath)}`,
        recommendation: 'Fix file access or format issues'
      });
    }
  }

  async validateOperationalProcedures() {
    console.log('⚙️ Validating operational procedures...');
    
    const rootDir = process.cwd();
    const searchPaths = [
      path.join(rootDir, 'docs'),
      path.join(rootDir, 'secure-gate-access', 'docs'),
      rootDir
    ];
    
    const foundDocs = new Set();
    
    for (const searchPath of searchPaths) {
      try {
        const files = await this.findMarkdownFiles(searchPath);
        
        files.forEach(file => {
          const fileName = path.basename(file).toLowerCase();
          this.requiredOperationalDocs.forEach(doc => {
            if (fileName.includes(doc.toLowerCase())) {
              foundDocs.add(doc);
            }
          });
        });
        
      } catch (error) {
        // Directory might not exist, continue searching
      }
    }
    
    // Check for missing operational documents
    this.requiredOperationalDocs.forEach(doc => {
      if (!foundDocs.has(doc)) {
        this.results.operationalProcedures.issues.push({
          severity: 'high',
          message: `Missing operational document: ${doc}`,
          recommendation: `Create ${doc} with detailed procedures`
        });
      }
    });
    
    // Validate specific operational requirements
    await this.validateSpecificOperationalDocs(foundDocs);
    
    this.results.operationalProcedures.score = Math.max(0, 100 - (this.results.operationalProcedures.issues.length * 12));
  }

  async findMarkdownFiles(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subFiles = await this.findMarkdownFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory access error, return empty array
    }
    
    return files;
  }

  async validateSpecificOperationalDocs(foundDocs) {
    // Check for deployment readiness indicators
    const deploymentIndicators = [
      'DEPLOYMENT_READY', 'PRODUCTION_READY', 'LAUNCH_READINESS'
    ];
    
    let hasDeploymentReadiness = false;
    
    try {
      const rootFiles = await fs.readdir(process.cwd());
      hasDeploymentReadiness = rootFiles.some(file => 
        deploymentIndicators.some(indicator => 
          file.toUpperCase().includes(indicator)
        )
      );
    } catch (error) {
      // Continue validation
    }
    
    if (!hasDeploymentReadiness) {
      this.results.operationalProcedures.issues.push({
        severity: 'medium',
        message: 'No deployment readiness documentation found',
        recommendation: 'Create deployment readiness checklist and status files'
      });
    }
    
    // Check for environment configuration documentation
    if (!foundDocs.has('deployment-guide')) {
      this.results.operationalProcedures.issues.push({
        severity: 'high',
        message: 'Missing environment setup documentation',
        recommendation: 'Document environment variables and configuration'
      });
    }
  }

  async validateDocumentationStructure() {
    console.log('🗂️ Validating documentation structure...');
    
    const rootDir = process.cwd();
    const expectedStructure = {
      'README.md': 'Project overview and quick start',
      'docs/': 'Documentation directory',
      'api-documentation.yaml': 'API specification',
      '.env.example': 'Environment configuration template'
    };
    
    for (const [item, description] of Object.entries(expectedStructure)) {
      const itemPath = path.join(rootDir, 'secure-gate-access', item);
      const rootItemPath = path.join(rootDir, item);
      
      try {
        // Check in secure-gate-access directory first, then root
        let exists = false;
        try {
          await fs.access(itemPath);
          exists = true;
        } catch {
          try {
            await fs.access(rootItemPath);
            exists = true;
          } catch {
            exists = false;
          }
        }
        
        if (!exists) {
          this.results.documentationStructure.issues.push({
            severity: item.endsWith('/') ? 'medium' : 'high',
            message: `Missing ${description}: ${item}`,
            recommendation: `Create ${item} with ${description.toLowerCase()}`
          });
        }
      } catch (error) {
        this.results.documentationStructure.issues.push({
          severity: 'medium',
          message: `Unable to validate ${item}`,
          recommendation: `Ensure ${item} exists and is accessible`
        });
      }
    }
    
    // Check for documentation organization
    await this.validateDocumentationOrganization();
    
    this.results.documentationStructure.score = Math.max(0, 100 - (this.results.documentationStructure.issues.length * 10));
  }

  async validateDocumentationOrganization() {
    const rootDir = process.cwd();
    
    try {
      const files = await fs.readdir(rootDir);
      const mdFiles = files.filter(file => file.endsWith('.md'));
      
      // Check for too many markdown files in root (should be organized)
      if (mdFiles.length > 20) {
        this.results.documentationStructure.issues.push({
          severity: 'medium',
          message: `Too many markdown files in root directory (${mdFiles.length})`,
          recommendation: 'Organize documentation files into appropriate directories'
        });
      }
      
      // Check for naming consistency
      const inconsistentNames = mdFiles.filter(file => {
        const name = file.toLowerCase();
        return name.includes('_') && name.includes('-');
      });
      
      if (inconsistentNames.length > 0) {
        this.results.documentationStructure.issues.push({
          severity: 'low',
          message: 'Inconsistent file naming convention',
          files: inconsistentNames,
          recommendation: 'Use consistent naming (prefer kebab-case)'
        });
      }
      
    } catch (error) {
      this.results.documentationStructure.issues.push({
        severity: 'low',
        message: 'Unable to validate documentation organization',
        recommendation: 'Ensure proper file system access'
      });
    }
  }

  calculateOverallScore() {
    const weights = {
      apiDocumentation: 0.3,
      userGuides: 0.25,
      operationalProcedures: 0.3,
      documentationStructure: 0.15
    };
    
    this.results.overallScore = Math.round(
      this.results.apiDocumentation.score * weights.apiDocumentation +
      this.results.userGuides.score * weights.userGuides +
      this.results.operationalProcedures.score * weights.operationalProcedures +
      this.results.documentationStructure.score * weights.documentationStructure
    );
    
    // Count total issues
    this.results.totalIssues = 
      this.results.apiDocumentation.issues.length +
      this.results.userGuides.issues.length +
      this.results.operationalProcedures.issues.length +
      this.results.documentationStructure.issues.length;
    
    // Count critical issues
    this.results.criticalIssues = [
      ...this.results.apiDocumentation.issues,
      ...this.results.userGuides.issues,
      ...this.results.operationalProcedures.issues,
      ...this.results.documentationStructure.issues
    ].filter(issue => issue.severity === 'critical').length;
  }

  generateReport() {
    console.log('\n📊 Documentation Validation Report');
    console.log('=====================================');
    console.log(`Overall Score: ${this.results.overallScore}/100`);
    console.log(`Total Issues: ${this.results.totalIssues}`);
    console.log(`Critical Issues: ${this.results.criticalIssues}`);
    
    console.log('\n📚 API Documentation:', `${this.results.apiDocumentation.score}/100`);
    if (this.results.apiDocumentation.issues.length > 0) {
      this.results.apiDocumentation.issues.forEach(issue => {
        console.log(`  ${this.getSeverityIcon(issue.severity)} ${issue.message}`);
      });
    }
    
    console.log('\n📖 User Guides:', `${this.results.userGuides.score}/100`);
    if (this.results.userGuides.issues.length > 0) {
      this.results.userGuides.issues.forEach(issue => {
        console.log(`  ${this.getSeverityIcon(issue.severity)} ${issue.message}`);
      });
    }
    
    console.log('\n⚙️ Operational Procedures:', `${this.results.operationalProcedures.score}/100`);
    if (this.results.operationalProcedures.issues.length > 0) {
      this.results.operationalProcedures.issues.forEach(issue => {
        console.log(`  ${this.getSeverityIcon(issue.severity)} ${issue.message}`);
      });
    }
    
    console.log('\n🗂️ Documentation Structure:', `${this.results.documentationStructure.score}/100`);
    if (this.results.documentationStructure.issues.length > 0) {
      this.results.documentationStructure.issues.forEach(issue => {
        console.log(`  ${this.getSeverityIcon(issue.severity)} ${issue.message}`);
      });
    }
    
    console.log('\n💡 Recommendations:');
    const allRecommendations = [
      ...this.results.apiDocumentation.issues,
      ...this.results.userGuides.issues,
      ...this.results.operationalProcedures.issues,
      ...this.results.documentationStructure.issues
    ].filter(issue => issue.severity === 'critical' || issue.severity === 'high')
     .map(issue => issue.recommendation);
    
    [...new Set(allRecommendations)].slice(0, 5).forEach(rec => {
      console.log(`  • ${rec}`);
    });
    
    if (this.results.overallScore >= 85) {
      console.log('\n✅ Documentation is production-ready!');
    } else if (this.results.overallScore >= 70) {
      console.log('\n⚠️ Documentation needs minor improvements before production');
    } else {
      console.log('\n❌ Documentation requires significant improvements before production');
    }
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
    const reportPath = path.join(process.cwd(), 'production-readiness-tests', 'reports', 'documentation-validation-report.json');
    
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
      console.log(`📄 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.error('❌ Failed to save detailed report:', error);
    }
  }
}

// Export for use in other modules
module.exports = DocumentationValidator;

// CLI execution
if (require.main === module) {
  const validator = new DocumentationValidator();
  
  validator.validateDocumentation()
    .then(async (results) => {
      await validator.generateDetailedReport();
      
      // Exit with appropriate code
      if (results.criticalIssues > 0) {
        process.exit(1);
      } else if (results.overallScore < 70) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('❌ Documentation validation failed:', error);
      process.exit(1);
    });
}