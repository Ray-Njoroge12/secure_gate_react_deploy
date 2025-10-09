#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find all files that import logger
const findLoggerImports = () => {
  try {
    const { execSync } = require('child_process');
    const result = execSync('grep -r "import.*logger.*from" src/ --include="*.js" --include="*.jsx" -l', { 
      cwd: '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client',
      encoding: 'utf8' 
    });
    return result.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error finding files:', error.message);
    return [];
  }
};

// Fix logger import in a file
const fixLoggerImport = (filePath) => {
  try {
    const fullPath = path.join('/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client', filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Calculate correct relative path to logger
    const dirs = filePath.split('/').slice(0, -1);
    const depth = dirs.length;
    const relativePath = '../'.repeat(depth) + 'utils/logger';
    
    // Replace any logger import with the correct path
    const oldImportRegex = /import\s+logger\s+from\s+['"][^'"]*logger['"];?/g;
    const newImport = `import logger from '${relativePath}';`;
    
    if (oldImportRegex.test(content)) {
      content = content.replace(oldImportRegex, newImport);
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Fixed: ${filePath} -> ${relativePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
    return false;
  }
};

// Main execution
console.log('Finding files with logger imports...');
const files = findLoggerImports();
console.log(`Found ${files.length} files with logger imports`);

let fixedCount = 0;
files.forEach(file => {
  if (fixLoggerImport(file)) {
    fixedCount++;
  }
});

console.log(`Fixed ${fixedCount} files`);
