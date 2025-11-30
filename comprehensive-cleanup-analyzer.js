#!/usr/bin/env node

/**
 * Comprehensive System Cleanup Analyzer
 * Identifies duplicates, unused files, and cleanup targets
 * Phase 1: Analysis and Documentation
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = '/Users/raynj/Desktop/secure-gate-react-express';
const results = {
  analysis: {
    totalFiles: 0,
    totalDirectories: 0,
    duplicateFiles: [],
    unusedFiles: [],
    backupFiles: [],
    testFiles: [],
    documentationFiles: [],
    tempFiles: [],
    configDuplicates: [],
    dockerFiles: [],
    environmentFiles: []
  },
  cleanup: {
    safeToDelete: [],
    needsReview: [],
    keepFiles: []
  },
  directories: {}
};

class SystemCleanupAnalyzer {
  constructor() {
    this.fileExtensions = {
      backup: ['.backup', '.bak', '.old', '.orig'],
      temp: ['.tmp', '.temp', '.swp', '.log'],
      test: ['.test.js', '.spec.js', '-test.js', '-spec.js'],
      docs: ['.md', '.txt', '.doc', '.pdf'],
      config: ['.json', '.js', '.yml', '.yaml', '.toml', '.env'],
      docker: ['Dockerfile', '.dockerignore', 'docker-compose']
    };
    
    this.duplicatePatterns = [
      /.*\.backup\d*/,
      /.*-\d+\.\w+$/,
      /.*\.orig$/,
      /.*\.old$/,
      /.*-copy\.\w+$/,
      /.*-duplicate\.\w+$/
    ];
  }

  async analyzeDirectory(dirPath, relativePath = '') {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const relativeItemPath = path.join(relativePath, item);
        
        if (fs.statSync(fullPath).isDirectory()) {
          results.analysis.totalDirectories++;
          results.directories[relativeItemPath] = {
            type: 'directory',
            files: [],
            subdirectories: []
          };
          await this.analyzeDirectory(fullPath, relativeItemPath);
        } else {
          results.analysis.totalFiles++;
          await this.analyzeFile(fullPath, relativeItemPath);
        }
      }
    } catch (error) {
      console.error(`Error analyzing directory ${dirPath}:`, error.message);
    }
  }

  async analyzeFile(filePath, relativePath) {
    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath);
    const fileSize = fs.statSync(filePath).size;
    
    const fileInfo = {
      path: relativePath,
      fullPath: filePath,
      name: fileName,
      extension: fileExt,
      size: fileSize,
      isEmpty: fileSize === 0,
      category: this.categorizeFile(fileName, relativePath)
    };

    // Categorize files
    if (this.isBackupFile(fileName)) {
      results.analysis.backupFiles.push(fileInfo);
    }
    
    if (this.isTestFile(fileName, relativePath)) {
      results.analysis.testFiles.push(fileInfo);
    }
    
    if (this.isDocumentationFile(fileName)) {
      results.analysis.documentationFiles.push(fileInfo);
    }
    
    if (this.isTempFile(fileName)) {
      results.analysis.tempFiles.push(fileInfo);
    }
    
    if (this.isConfigFile(fileName)) {
      await this.analyzeConfigFile(fileInfo);
    }
    
    if (this.isDockerFile(fileName)) {
      results.analysis.dockerFiles.push(fileInfo);
    }
    
    if (this.isEnvironmentFile(fileName)) {
      results.analysis.environmentFiles.push(fileInfo);
    }
    
    if (this.isDuplicateFile(fileName)) {
      results.analysis.duplicateFiles.push(fileInfo);
    }
  }

  categorizeFile(fileName, relativePath) {
    if (this.isBackupFile(fileName)) return 'backup';
    if (this.isTestFile(fileName, relativePath)) return 'test';
    if (this.isDocumentationFile(fileName)) return 'documentation';
    if (this.isTempFile(fileName)) return 'temp';
    if (this.isConfigFile(fileName)) return 'config';
    if (this.isDockerFile(fileName)) return 'docker';
    if (this.isEnvironmentFile(fileName)) return 'environment';
    if (fileName.includes('app.js') || fileName.includes('server.js')) return 'core';
    if (relativePath.includes('node_modules')) return 'dependency';
    if (relativePath.includes('.git')) return 'git';
    return 'source';
  }

  isBackupFile(fileName) {
    return this.fileExtensions.backup.some(ext => fileName.includes(ext)) ||
           fileName.includes('backup') ||
           fileName.includes('.bak') ||
           /\.\d{10,}$/.test(fileName);
  }

  isTestFile(fileName, relativePath) {
    return this.fileExtensions.test.some(pattern => fileName.includes(pattern.replace('.', ''))) ||
           relativePath.includes('/tests/') ||
           relativePath.includes('/test/') ||
           fileName.startsWith('test-') ||
           fileName.includes('-test');
  }

  isDocumentationFile(fileName) {
    return this.fileExtensions.docs.some(ext => fileName.endsWith(ext)) ||
           fileName.toUpperCase().includes('README') ||
           fileName.toUpperCase().includes('CHANGELOG') ||
           fileName.toUpperCase().includes('LICENSE');
  }

  isTempFile(fileName) {
    return this.fileExtensions.temp.some(ext => fileName.endsWith(ext)) ||
           fileName.includes('.tmp') ||
           fileName.includes('temp');
  }

  isConfigFile(fileName) {
    return fileName.endsWith('.json') ||
           fileName.endsWith('.js') && (fileName.includes('config') || fileName.includes('Config')) ||
           fileName.endsWith('.yml') ||
           fileName.endsWith('.yaml') ||
           fileName.endsWith('.toml');
  }

  isDockerFile(fileName) {
    return fileName.includes('Dockerfile') ||
           fileName.includes('docker-compose') ||
           fileName.includes('.dockerignore');
  }

  isEnvironmentFile(fileName) {
    return fileName.startsWith('.env') ||
           fileName.includes('environment') ||
           fileName.includes('secrets');
  }

  isDuplicateFile(fileName) {
    return this.duplicatePatterns.some(pattern => pattern.test(fileName));
  }

  async analyzeConfigFile(fileInfo) {
    // Check for duplicate config files
    const configName = fileInfo.name.replace(/\.(json|js|yml|yaml)$/, '');
    const existing = results.analysis.configDuplicates.find(c => c.baseName === configName);
    
    if (existing) {
      existing.duplicates.push(fileInfo);
    } else {
      results.analysis.configDuplicates.push({
        baseName: configName,
        primary: fileInfo,
        duplicates: []
      });
    }
  }

  generateCleanupRecommendations() {
    // Safe to delete
    results.cleanup.safeToDelete = [
      ...results.analysis.backupFiles.filter(f => !f.name.includes('important')),
      ...results.analysis.tempFiles,
      ...results.analysis.duplicateFiles.filter(f => f.name.includes('.backup')),
      ...results.analysis.testFiles.filter(f => f.isEmpty || f.name.startsWith('test-temp'))
    ];

    // Needs review
    results.cleanup.needsReview = [
      ...results.analysis.configDuplicates.filter(c => c.duplicates.length > 0),
      ...results.analysis.dockerFiles.filter(f => f.name.includes('minimal') || f.name.includes('test')),
      ...results.analysis.environmentFiles.filter(f => f.name.includes('backup'))
    ];

    // Keep files
    results.cleanup.keepFiles = [
      ...results.analysis.testFiles.filter(f => f.path.includes('/tests/') && !f.isEmpty),
      ...results.analysis.documentationFiles.filter(f => f.name.includes('README') || f.name.includes('API')),
      ...results.analysis.configDuplicates.map(c => c.primary)
    ];
  }

  generateReport() {
    const report = `
# COMPREHENSIVE SYSTEM CLEANUP ANALYSIS
## Generated: ${new Date().toISOString()}

## SYSTEM OVERVIEW
- **Total Files**: ${results.analysis.totalFiles}
- **Total Directories**: ${results.analysis.totalDirectories}
- **Backup Files**: ${results.analysis.backupFiles.length}
- **Test Files**: ${results.analysis.testFiles.length}
- **Documentation Files**: ${results.analysis.documentationFiles.length}
- **Temp Files**: ${results.analysis.tempFiles.length}
- **Duplicate Files**: ${results.analysis.duplicateFiles.length}

## CLEANUP RECOMMENDATIONS

### 🔴 SAFE TO DELETE (${results.cleanup.safeToDelete.length} files)
${results.cleanup.safeToDelete.map(f => `- ${f.path} (${f.category})`).join('\n')}

### 🟡 NEEDS REVIEW (${results.cleanup.needsReview.length} items)
${results.cleanup.needsReview.map(f => `- ${f.path || f.baseName} (${f.category || 'config-duplicate'})`).join('\n')}

### 🟢 KEEP FILES (${results.cleanup.keepFiles.length} files)
${results.cleanup.keepFiles.map(f => `- ${f.path} (${f.category})`).join('\n')}

## DETAILED ANALYSIS

### BACKUP FILES (${results.analysis.backupFiles.length})
${results.analysis.backupFiles.map(f => `- ${f.path} (${(f.size/1024).toFixed(2)}KB)`).join('\n')}

### DUPLICATE CONFIG FILES
${results.analysis.configDuplicates.filter(c => c.duplicates.length > 0).map(c => 
  `- **${c.baseName}**: ${c.duplicates.length} duplicates\n  Primary: ${c.primary.path}${c.duplicates.map(d => `\n  Duplicate: ${d.path}`).join('')}`
).join('\n')}

### DOCKER FILES (${results.analysis.dockerFiles.length})
${results.analysis.dockerFiles.map(f => `- ${f.path}`).join('\n')}

### ENVIRONMENT FILES (${results.analysis.environmentFiles.length})
${results.analysis.environmentFiles.map(f => `- ${f.path}`).join('\n')}

## NEXT STEPS
1. Review this analysis
2. Backup critical files before cleanup
3. Execute cleanup in phases
4. Test system functionality after each phase
`;

    return report;
  }

  async run() {
    console.log('🔍 Starting comprehensive system cleanup analysis...');
    console.log(`📂 Analyzing directory: ${rootDir}`);
    
    await this.analyzeDirectory(rootDir);
    
    console.log('📊 Generating cleanup recommendations...');
    this.generateCleanupRecommendations();
    
    console.log('📝 Generating report...');
    const report = this.generateReport();
    
    // Save results
    fs.writeFileSync(path.join(rootDir, 'COMPREHENSIVE_CLEANUP_ANALYSIS.md'), report);
    fs.writeFileSync(path.join(rootDir, 'cleanup-analysis-results.json'), JSON.stringify(results, null, 2));
    
    console.log('✅ Analysis complete!');
    console.log(`📄 Report saved to: COMPREHENSIVE_CLEANUP_ANALYSIS.md`);
    console.log(`📊 Raw data saved to: cleanup-analysis-results.json`);
    
    return results;
  }
}

// Run the analysis
const analyzer = new SystemCleanupAnalyzer();
analyzer.run().catch(console.error);
