#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all JS/JSX files with console statements
const findFilesWithConsole = () => {
  try {
    const result = execSync('grep -r "console\\.\\(log\\|warn\\|error\\)" src/ --include="*.js" --include="*.jsx" -l', { 
      cwd: '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client',
      encoding: 'utf8' 
    });
    return result.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error finding files:', error.message);
    return [];
  }
};

// Replace console statements in a file
const replaceConsoleInFile = (filePath) => {
  try {
    const fullPath = path.join('/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client', filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Skip if already imports logger
    if (content.includes("import logger from") || content.includes("from './logger'") || content.includes("from '../logger'")) {
      return false;
    }
    
    let modified = false;
    let newContent = content;
    
    // Add logger import at the top
    const importMatch = newContent.match(/^import\s+.*?from\s+['"][^'"]+['"];?\s*$/m);
    if (importMatch) {
      // Add after the last import
      const lastImportIndex = newContent.lastIndexOf(importMatch[0]) + importMatch[0].length;
      const beforeImports = newContent.substring(0, lastImportIndex);
      const afterImports = newContent.substring(lastImportIndex);
      
      // Calculate relative path to logger
      const dirs = filePath.split('/').slice(0, -1);
      const depth = dirs.length;
      const relativePath = '../'.repeat(depth) + 'utils/logger';
      
      newContent = beforeImports + `\nimport logger from '${relativePath}';` + afterImports;
      modified = true;
    } else {
      // Add at the very beginning
      newContent = "import logger from './utils/logger';\n" + newContent;
      modified = true;
    }
    
    // Replace console.log with logger.debug
    newContent = newContent.replace(/console\.log\(/g, 'logger.debug(');
    
    // Replace console.warn with logger.warn
    newContent = newContent.replace(/console\.warn\(/g, 'logger.warn(');
    
    // Replace console.error with logger.error
    newContent = newContent.replace(/console\.error\(/g, 'logger.error(');
    
    if (modified && newContent !== content) {
      fs.writeFileSync(fullPath, newContent, 'utf8');
      console.log(`Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
    return false;
  }
};

// Main execution
console.log('Finding files with console statements...');
const files = findFilesWithConsole();
console.log(`Found ${files.length} files with console statements`);

let fixedCount = 0;
files.forEach(file => {
  if (replaceConsoleInFile(file)) {
    fixedCount++;
  }
});

console.log(`Fixed ${fixedCount} files`);
