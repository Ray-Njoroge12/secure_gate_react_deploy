#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Calculate correct relative path to logger from any file
const getCorrectLoggerPath = (filePath) => {
  const dirs = filePath.split('/').slice(0, -1); // Remove filename
  const depth = dirs.length;
  
  // From any file in src/, we need to go up to src/ then down to utils/logger
  return '../'.repeat(depth) + 'utils/logger';
};

// Fix logger imports in a file
const fixLoggerImport = (filePath) => {
  try {
    const fullPath = path.join('/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client', filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Calculate correct relative path
    const correctPath = getCorrectLoggerPath(filePath);
    
    // Replace any logger import with the correct path
    const oldImportRegex = /import\s+logger\s+from\s+['"][^'"]*utils\/logger['"];?/g;
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
const main = () => {
  try {
    const { execSync } = require('child_process');
    
    // Find all files with logger imports
    const result = execSync('grep -r "import.*logger.*from.*utils/logger" src/ --include="*.js" --include="*.jsx" -l', { 
      cwd: '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client',
      encoding: 'utf8' 
    });
    
    const files = result.trim().split('\n').filter(Boolean);
    console.log(`Found ${files.length} files with logger imports`);
    
    let fixedCount = 0;
    files.forEach(filePath => {
      if (fixLoggerImport(filePath)) {
        fixedCount++;
      }
    });
    
    console.log(`Fixed ${fixedCount} files`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};

main();
