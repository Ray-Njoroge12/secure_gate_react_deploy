#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix logger import paths
const fixLoggerImports = () => {
  try {
    const { execSync } = require('child_process');
    
    // Find all files with incorrect logger imports
    const result = execSync('grep -r "import.*logger.*from.*\\.\\./\\.\\./\\.\\./utils/logger" src/ --include="*.js" --include="*.jsx" -l', { 
      cwd: '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client',
      encoding: 'utf8' 
    });
    
    const files = result.trim().split('\n').filter(Boolean);
    console.log(`Found ${files.length} files with incorrect logger imports`);
    
    files.forEach(filePath => {
      const fullPath = path.join('/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client', filePath);
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Calculate correct relative path to logger
      const dirs = filePath.split('/').slice(0, -1);
      const depth = dirs.length;
      const relativePath = '../'.repeat(depth) + 'utils/logger';
      
      // Replace incorrect import with correct path
      const oldImportRegex = /import\s+logger\s+from\s+['"][^'"]*utils\/logger['"];?/g;
      const newImport = `import logger from '${relativePath}';`;
      
      if (oldImportRegex.test(content)) {
        content = content.replace(oldImportRegex, newImport);
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed: ${filePath} -> ${relativePath}`);
      }
    });
    
    console.log('Logger import fixes completed');
    
  } catch (error) {
    console.error('Error fixing logger imports:', error.message);
  }
};

// Fix logger imports
fixLoggerImports();
