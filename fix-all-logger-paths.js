#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files that need specific path fixes
const pathFixes = {
  'src/utils/errorMapper.js': './logger',
  'src/utils/errorHandler.js': './logger',
  'src/utils/errorHandling.js': './logger',
  'src/utils/apiErrorHandler.js': './logger',
  'src/utils/errorReporting.js': './logger',
  'src/utils/browserDetection.js': './logger',
  'src/utils/navigationHelpers.js': './logger',
  'src/utils/responsiveTestUtils.js': './logger',
  'src/utils/bundleOptimizer.js': './logger',
  'src/utils/performanceOptimization.js': './logger',
  'src/utils/tailwindMigration.js': './logger',
  'src/utils/validationRules.js': './logger',
  'src/utils/performanceMonitor.js': './logger',
  'src/utils/responsive.js': './logger',
  'src/contexts/ErrorContext.jsx': '../utils/logger',
  'src/contexts/SearchContext.jsx': '../utils/logger',
  'src/contexts/BrowserCompatibilityContext.jsx': '../utils/logger',
  'src/context/AuthContext.js': '../utils/logger',
  'src/setupTests.js': './utils/logger'
};

// Fix logger import in a specific file
const fixLoggerImport = (filePath, correctPath) => {
  try {
    const fullPath = path.join('/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client', filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace any logger import with the correct path
    const oldImportRegex = /import\s+logger\s+from\s+['"][^'"]*logger['"];?/g;
    const newImport = `import logger from '${correctPath}';`;
    
    if (oldImportRegex.test(content)) {
      content = content.replace(oldImportRegex, newImport);
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Fixed: ${filePath} -> ${correctPath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
    return false;
  }
};

// Main execution
console.log('Fixing logger import paths...');

let fixedCount = 0;
Object.entries(pathFixes).forEach(([filePath, correctPath]) => {
  if (fixLoggerImport(filePath, correctPath)) {
    fixedCount++;
  }
});

console.log(`Fixed ${fixedCount} files`);
