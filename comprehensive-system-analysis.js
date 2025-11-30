#!/usr/bin/env node

/**
 * COMPREHENSIVE FRONTEND-BACKEND SYSTEM ANALYSIS
 * ==============================================
 * 
 * This script performs an exhaustive analysis of the React frontend 
 * and Express backend to identify:
 * - Code errors and mismatches
 * - File duplications and unused files  
 * - Configuration inconsistencies
 * - Import/export issues
 * - Naming conflicts
 * - Build and runtime issues
 */

import { readFile, readdir, stat } from 'fs/promises';
import { dirname, join, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const FRONTEND_DIR = join(__dirname, 'secure-gate-access/client');
const BACKEND_DIR = join(__dirname, 'secure-gate-access/server');
const ANALYSIS_RESULTS = [];

// Utility functions
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, data };
  console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
  ANALYSIS_RESULTS.push(logEntry);
};

const checkFileExists = async (filePath) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

const getAllFiles = async (dir, extensions = ['.js', '.jsx', '.ts', '.tsx', '.json']) => {
  const files = [];
  
  const scanDir = async (currentDir) => {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && 
            !['node_modules', 'build', 'dist'].includes(entry.name)) {
          await scanDir(fullPath);
        } else if (entry.isFile() && extensions.includes(extname(entry.name))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      log('warn', `Cannot scan directory: ${currentDir}`, { error: error.message });
    }
  };
  
  await scanDir(dir);
  return files;
};

// Analysis functions
async function analyzeFrontendStructure() {
  log('info', '🔍 ANALYZING FRONTEND STRUCTURE');
  
  const analysis = {
    packageJson: null,
    srcStructure: {},
    publicStructure: {},
    configFiles: {},
    issues: []
  };

  try {
    // Check package.json
    const packageJsonPath = join(FRONTEND_DIR, 'package.json');
    if (await checkFileExists(packageJsonPath)) {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
      analysis.packageJson = {
        name: packageJson.name,
        version: packageJson.version,
        dependencies: Object.keys(packageJson.dependencies || {}),
        devDependencies: Object.keys(packageJson.devDependencies || {}),
        scripts: packageJson.scripts,
        proxy: packageJson.proxy
      };
    } else {
      analysis.issues.push({
        type: 'MISSING_FILE',
        severity: 'CRITICAL',
        file: 'package.json',
        message: 'Frontend package.json not found'
      });
    }

    // Check src directory structure
    const srcDir = join(FRONTEND_DIR, 'src');
    if (await checkFileExists(srcDir)) {
      const srcFiles = await getAllFiles(srcDir);
      analysis.srcStructure = {
        totalFiles: srcFiles.length,
        components: srcFiles.filter(f => f.includes('/components/')).length,
        pages: srcFiles.filter(f => f.includes('/pages/')).length,
        services: srcFiles.filter(f => f.includes('/services/')).length,
        utils: srcFiles.filter(f => f.includes('/utils/')).length,
        context: srcFiles.filter(f => f.includes('/context/')).length,
        hooks: srcFiles.filter(f => f.includes('/hooks/')).length
      };
    } else {
      analysis.issues.push({
        type: 'MISSING_DIRECTORY',
        severity: 'CRITICAL',
        directory: 'src',
        message: 'Frontend src directory not found'
      });
    }

    // Check public directory
    const publicDir = join(FRONTEND_DIR, 'public');
    if (await checkFileExists(publicDir)) {
      const publicFiles = await readdir(publicDir);
      analysis.publicStructure = {
        files: publicFiles,
        hasIndexHtml: publicFiles.includes('index.html'),
        hasManifest: publicFiles.includes('manifest.json')
      };
    }

    // Check critical files
    const criticalFiles = [
      'src/index.js',
      'src/App.js',
      'src/index.css',
      'public/index.html'
    ];

    for (const file of criticalFiles) {
      const filePath = join(FRONTEND_DIR, file);
      if (!(await checkFileExists(filePath))) {
        analysis.issues.push({
          type: 'MISSING_CRITICAL_FILE',
          severity: 'HIGH',
          file,
          message: `Critical file ${file} not found`
        });
      }
    }

  } catch (error) {
    analysis.issues.push({
      type: 'ANALYSIS_ERROR',
      severity: 'HIGH',
      message: 'Error analyzing frontend structure',
      error: error.message
    });
  }

  log('info', 'Frontend Structure Analysis Complete', analysis);
  return analysis;
}

async function analyzeBackendStructure() {
  log('info', '🔍 ANALYZING BACKEND STRUCTURE');
  
  const analysis = {
    packageJson: null,
    srcStructure: {},
    serverFile: null,
    issues: []
  };

  try {
    // Check package.json
    const packageJsonPath = join(BACKEND_DIR, 'package.json');
    if (await checkFileExists(packageJsonPath)) {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
      analysis.packageJson = {
        name: packageJson.name,
        version: packageJson.version,
        dependencies: Object.keys(packageJson.dependencies || {}),
        devDependencies: Object.keys(packageJson.devDependencies || {}),
        scripts: packageJson.scripts,
        main: packageJson.main,
        type: packageJson.type
      };
    } else {
      analysis.issues.push({
        type: 'MISSING_FILE',
        severity: 'CRITICAL',
        file: 'package.json',
        message: 'Backend package.json not found'
      });
    }

    // Check src directory structure
    const srcDir = join(BACKEND_DIR, 'src');
    if (await checkFileExists(srcDir)) {
      const srcFiles = await getAllFiles(srcDir);
      analysis.srcStructure = {
        totalFiles: srcFiles.length,
        routes: srcFiles.filter(f => f.includes('/routes/')).length,
        services: srcFiles.filter(f => f.includes('/services/')).length,
        middleware: srcFiles.filter(f => f.includes('/middleware/')).length,
        models: srcFiles.filter(f => f.includes('/models/')).length,
        controllers: srcFiles.filter(f => f.includes('/controllers/')).length,
        config: srcFiles.filter(f => f.includes('/config/')).length,
        database: srcFiles.filter(f => f.includes('/database/')).length
      };
    }

    // Check server entry file
    const serverFiles = ['server.js', 'app.js', 'index.js'];
    for (const serverFile of serverFiles) {
      const serverPath = join(BACKEND_DIR, serverFile);
      if (await checkFileExists(serverPath)) {
        analysis.serverFile = serverFile;
        break;
      }
    }

    if (!analysis.serverFile) {
      analysis.issues.push({
        type: 'MISSING_SERVER_FILE',
        severity: 'CRITICAL',
        message: 'No server entry file found (server.js, app.js, or index.js)'
      });
    }

  } catch (error) {
    analysis.issues.push({
      type: 'ANALYSIS_ERROR',
      severity: 'HIGH',
      message: 'Error analyzing backend structure',
      error: error.message
    });
  }

  log('info', 'Backend Structure Analysis Complete', analysis);
  return analysis;
}

async function analyzeDuplicateFiles() {
  log('info', '🔍 ANALYZING DUPLICATE FILES');
  
  const frontendFiles = await getAllFiles(FRONTEND_DIR);
  const backendFiles = await getAllFiles(BACKEND_DIR);
  const allFiles = [...frontendFiles, ...backendFiles];
  
  const filesByName = {};
  const duplicates = [];
  
  for (const filePath of allFiles) {
    const fileName = basename(filePath);
    if (!filesByName[fileName]) {
      filesByName[fileName] = [];
    }
    filesByName[fileName].push(filePath);
  }
  
  for (const [fileName, paths] of Object.entries(filesByName)) {
    if (paths.length > 1) {
      duplicates.push({
        fileName,
        paths,
        count: paths.length
      });
    }
  }
  
  const analysis = {
    totalFiles: allFiles.length,
    duplicateFileNames: duplicates.length,
    duplicates: duplicates.filter(d => d.count > 2) // Only show files with 3+ duplicates
  };
  
  log('info', 'Duplicate Files Analysis Complete', analysis);
  return analysis;
}

async function analyzeImportExportIssues() {
  log('info', '🔍 ANALYZING IMPORT/EXPORT ISSUES');
  
  const issues = [];
  const frontendFiles = await getAllFiles(FRONTEND_DIR, ['.js', '.jsx']);
  
  for (const filePath of frontendFiles) {
    try {
      const content = await readFile(filePath, 'utf-8');
      
      // Check for common import issues
      const lines = content.split('\\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check for relative import issues
        if (line.startsWith('import') && line.includes('../')) {
          const importMatch = line.match(/from\\s+['"]([^'"]+)['"]/);
          if (importMatch) {
            const importPath = importMatch[1];
            if (importPath.startsWith('../') && importPath.split('../').length > 3) {
              issues.push({
                type: 'DEEP_RELATIVE_IMPORT',
                severity: 'MEDIUM',
                file: filePath,
                line: i + 1,
                issue: `Deep relative import: ${importPath}`
              });
            }
          }
        }
        
        // Check for missing file extensions in imports
        if (line.startsWith('import') && line.includes('./') && !line.includes('.js') && !line.includes('.jsx')) {
          issues.push({
            type: 'MISSING_EXTENSION',
            severity: 'LOW',
            file: filePath,
            line: i + 1,
            issue: 'Import without file extension'
          });
        }
        
        // Check for unused imports (basic check)
        if (line.startsWith('import') && line.includes('{')) {
          const importMatch = line.match(/import\\s+{([^}]+)}/);
          if (importMatch) {
            const imports = importMatch[1].split(',').map(i => i.trim());
            for (const imp of imports) {
              const regex = new RegExp(`\\b${imp}\\b`, 'g');
              const matches = content.match(regex);
              if (!matches || matches.length <= 1) { // Only appears in import
                issues.push({
                  type: 'UNUSED_IMPORT',
                  severity: 'LOW',
                  file: filePath,
                  line: i + 1,
                  issue: `Potentially unused import: ${imp}`
                });
              }
            }
          }
        }
      }
      
    } catch (error) {
      issues.push({
        type: 'FILE_READ_ERROR',
        severity: 'MEDIUM',
        file: filePath,
        issue: `Cannot read file: ${error.message}`
      });
    }
  }
  
  const analysis = {
    totalFiles: frontendFiles.length,
    issues: issues.slice(0, 20) // Limit to first 20 issues
  };
  
  log('info', 'Import/Export Issues Analysis Complete', analysis);
  return analysis;
}

async function analyzeConfigurationMismatches() {
  log('info', '🔍 ANALYZING CONFIGURATION MISMATCHES');
  
  const analysis = {
    ports: {},
    environment: {},
    mismatches: []
  };
  
  try {
    // Frontend configuration
    const frontendPackage = await readFile(join(FRONTEND_DIR, 'package.json'), 'utf-8');
    const frontendPkg = JSON.parse(frontendPackage);
    
    let frontendEnv = {};
    try {
      const frontendEnvContent = await readFile(join(FRONTEND_DIR, '.env'), 'utf-8');
      frontendEnvContent.split('\\n').forEach(line => {
        const match = line.match(/^([^#\\s][^=]*?)=(.*)$/);
        if (match) {
          frontendEnv[match[1].trim()] = match[2].trim();
        }
      });
    } catch (error) {
      analysis.mismatches.push({
        type: 'MISSING_ENV_FILE',
        severity: 'MEDIUM',
        component: 'frontend',
        message: 'Frontend .env file not found'
      });
    }
    
    // Backend configuration
    let backendEnv = {};
    try {
      const backendEnvContent = await readFile(join(BACKEND_DIR, '.env'), 'utf-8');
      backendEnvContent.split('\\n').forEach(line => {
        const match = line.match(/^([^#\\s][^=]*?)=(.*)$/);
        if (match) {
          backendEnv[match[1].trim()] = match[2].trim();
        }
      });
    } catch (error) {
      analysis.mismatches.push({
        type: 'MISSING_ENV_FILE',
        severity: 'HIGH',
        component: 'backend',
        message: 'Backend .env file not found'
      });
    }
    
    // Analyze port configurations
    analysis.ports = {
      frontend: {
        defaultPort: 3000,
        proxy: frontendPkg.proxy,
        envApiUrl: frontendEnv.REACT_APP_API_URL
      },
      backend: {
        port: backendEnv.PORT || '5000',
        nodeEnv: backendEnv.NODE_ENV || 'development'
      }
    };
    
    // Check for port mismatches
    if (frontendPkg.proxy) {
      const proxyPort = frontendPkg.proxy.match(/:(\d+)$/)?.[1];
      if (proxyPort && proxyPort !== backendEnv.PORT) {
        analysis.mismatches.push({
          type: 'PORT_MISMATCH',
          severity: 'HIGH',
          message: `Frontend proxy port (${proxyPort}) doesn't match backend port (${backendEnv.PORT})`
        });
      }
    }
    
    if (frontendEnv.REACT_APP_API_URL) {
      const apiUrlPort = frontendEnv.REACT_APP_API_URL.match(/:(\d+)/)?.[1];
      if (apiUrlPort && apiUrlPort !== backendEnv.PORT) {
        analysis.mismatches.push({
          type: 'API_URL_MISMATCH',
          severity: 'HIGH',
          message: `Frontend API URL port (${apiUrlPort}) doesn't match backend port (${backendEnv.PORT})`
        });
      }
    }
    
    analysis.environment = {
      frontend: frontendEnv,
      backend: backendEnv
    };
    
  } catch (error) {
    analysis.mismatches.push({
      type: 'CONFIG_ANALYSIS_ERROR',
      severity: 'HIGH',
      message: 'Error analyzing configurations',
      error: error.message
    });
  }
  
  log('info', 'Configuration Mismatches Analysis Complete', analysis);
  return analysis;
}

async function analyzeCriticalCodeIssues() {
  log('info', '🔍 ANALYZING CRITICAL CODE ISSUES');
  
  const issues = [];
  
  // Check critical frontend files
  const criticalFrontendFiles = [
    'src/index.js',
    'src/App.js',
    'src/context/AuthContext.js',
    'src/services/http.js'
  ];
  
  for (const file of criticalFrontendFiles) {
    const filePath = join(FRONTEND_DIR, file);
    if (await checkFileExists(filePath)) {
      try {
        const content = await readFile(filePath, 'utf-8');
        
        // Check for syntax issues
        if (content.includes('import React') && !content.includes('from "react"') && 
            !content.includes("from 'react'")) {
          issues.push({
            type: 'IMPORT_SYNTAX_ERROR',
            severity: 'HIGH',
            file,
            message: 'Incomplete React import statement'
          });
        }
        
        // Check for undefined variables/functions
        const lines = content.split('\\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes('undefined') && !line.includes('!== undefined') && 
              !line.includes('=== undefined') && !line.includes('typeof')) {
            issues.push({
              type: 'UNDEFINED_REFERENCE',
              severity: 'MEDIUM',
              file,
              line: i + 1,
              message: 'Potential undefined reference'
            });
          }
        }
        
      } catch (error) {
        issues.push({
          type: 'FILE_READ_ERROR',
          severity: 'HIGH',
          file,
          message: `Cannot read critical file: ${error.message}`
        });
      }
    } else {
      issues.push({
        type: 'MISSING_CRITICAL_FILE',
        severity: 'CRITICAL',
        file,
        message: 'Critical frontend file is missing'
      });
    }
  }
  
  // Check critical backend files
  const criticalBackendFiles = [
    'server.js',
    'src/app.js',
    'src/routes/authRoutes.js'
  ];
  
  for (const file of criticalBackendFiles) {
    const filePath = join(BACKEND_DIR, file);
    if (await checkFileExists(filePath)) {
      try {
        const content = await readFile(filePath, 'utf-8');
        
        // Check for port configuration issues
        if (file === 'server.js' && !content.includes('process.env.PORT')) {
          issues.push({
            type: 'MISSING_PORT_CONFIG',
            severity: 'HIGH',
            file,
            message: 'Server file missing PORT environment variable usage'
          });
        }
        
        // Check for CORS issues
        if (file === 'src/app.js' && !content.includes('cors')) {
          issues.push({
            type: 'MISSING_CORS',
            severity: 'HIGH',
            file,
            message: 'App file missing CORS configuration'
          });
        }
        
      } catch (error) {
        issues.push({
          type: 'FILE_READ_ERROR',
          severity: 'HIGH',
          file,
          message: `Cannot read critical file: ${error.message}`
        });
      }
    } else {
      issues.push({
        type: 'MISSING_CRITICAL_FILE',
        severity: 'CRITICAL',
        file,
        message: 'Critical backend file is missing'
      });
    }
  }
  
  const analysis = {
    totalIssues: issues.length,
    criticalIssues: issues.filter(i => i.severity === 'CRITICAL').length,
    highIssues: issues.filter(i => i.severity === 'HIGH').length,
    issues: issues.slice(0, 15) // Limit output
  };
  
  log('info', 'Critical Code Issues Analysis Complete', analysis);
  return analysis;
}

async function checkBuildAndRuntime() {
  log('info', '🔍 CHECKING BUILD AND RUNTIME ISSUES');
  
  const issues = [];
  
  // Check frontend build files
  const frontendBuildDir = join(FRONTEND_DIR, 'build');
  const frontendNodeModules = join(FRONTEND_DIR, 'node_modules');
  
  if (!(await checkFileExists(frontendNodeModules))) {
    issues.push({
      type: 'MISSING_DEPENDENCIES',
      severity: 'CRITICAL',
      component: 'frontend',
      message: 'Frontend node_modules directory not found'
    });
  }
  
  // Check backend build files
  const backendNodeModules = join(BACKEND_DIR, 'node_modules');
  
  if (!(await checkFileExists(backendNodeModules))) {
    issues.push({
      type: 'MISSING_DEPENDENCIES',
      severity: 'CRITICAL',
      component: 'backend',
      message: 'Backend node_modules directory not found'
    });
  }
  
  // Check for lock files
  const frontendPackageLock = join(FRONTEND_DIR, 'package-lock.json');
  const backendPackageLock = join(BACKEND_DIR, 'package-lock.json');
  
  if (!(await checkFileExists(frontendPackageLock))) {
    issues.push({
      type: 'MISSING_LOCK_FILE',
      severity: 'MEDIUM',
      component: 'frontend',
      message: 'Frontend package-lock.json not found'
    });
  }
  
  if (!(await checkFileExists(backendPackageLock))) {
    issues.push({
      type: 'MISSING_LOCK_FILE',
      severity: 'MEDIUM',
      component: 'backend',
      message: 'Backend package-lock.json not found'
    });
  }
  
  const analysis = {
    issues,
    recommendations: [
      'Run npm install in both frontend and backend directories',
      'Check for build errors in console logs',
      'Verify all environment variables are set correctly',
      'Ensure all required dependencies are installed'
    ]
  };
  
  log('info', 'Build and Runtime Check Complete', analysis);
  return analysis;
}

// Main analysis function
async function runComprehensiveAnalysis() {
  console.log('🚀 STARTING COMPREHENSIVE FRONTEND-BACKEND ANALYSIS\\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    analyses: {},
    summary: {
      criticalIssues: 0,
      highIssues: 0,
      totalIssues: 0,
      recommendations: []
    }
  };
  
  try {
    results.analyses.frontendStructure = await analyzeFrontendStructure();
    results.analyses.backendStructure = await analyzeBackendStructure();
    results.analyses.duplicateFiles = await analyzeDuplicateFiles();
    results.analyses.importExportIssues = await analyzeImportExportIssues();
    results.analyses.configurationMismatches = await analyzeConfigurationMismatches();
    results.analyses.criticalCodeIssues = await analyzeCriticalCodeIssues();
    results.analyses.buildRuntimeCheck = await checkBuildAndRuntime();
    
    // Compile summary
    Object.values(results.analyses).forEach(analysis => {
      if (analysis.issues) {
        analysis.issues.forEach(issue => {
          results.summary.totalIssues++;
          if (issue.severity === 'CRITICAL') results.summary.criticalIssues++;
          if (issue.severity === 'HIGH') results.summary.highIssues++;
        });
      }
      if (analysis.mismatches) {
        analysis.mismatches.forEach(mismatch => {
          results.summary.totalIssues++;
          if (mismatch.severity === 'CRITICAL') results.summary.criticalIssues++;
          if (mismatch.severity === 'HIGH') results.summary.highIssues++;
        });
      }
    });
    
    // Generate recommendations
    if (results.summary.criticalIssues > 0) {
      results.summary.recommendations.push('🚨 Address critical issues immediately');
    }
    if (results.analyses.configurationMismatches?.mismatches?.length > 0) {
      results.summary.recommendations.push('🔧 Fix configuration mismatches');
    }
    if (results.analyses.buildRuntimeCheck?.issues?.length > 0) {
      results.summary.recommendations.push('📦 Install missing dependencies');
    }
    
    // Write results to file
    await import('fs/promises').then(fs => 
      fs.writeFile(
        join(__dirname, 'comprehensive-system-analysis.json'), 
        JSON.stringify(results, null, 2)
      )
    );
    
    console.log('\\n📊 ANALYSIS COMPLETE');
    console.log(`Critical Issues: ${results.summary.criticalIssues}`);
    console.log(`High Priority Issues: ${results.summary.highIssues}`);
    console.log(`Total Issues: ${results.summary.totalIssues}`);
    console.log('\\n📝 Detailed results saved to: comprehensive-system-analysis.json');
    
    if (results.summary.criticalIssues > 0) {
      console.log('\\n🚨 CRITICAL ISSUES FOUND - SYSTEM LIKELY UNSTABLE');
    }
    
  } catch (error) {
    log('error', 'Analysis failed', { error: error.message });
    console.error('Analysis failed:', error);
  }
}

// Execute analysis
runComprehensiveAnalysis();
