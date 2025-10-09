#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all test files that import render from @testing-library/react
const findTestFiles = () => {
  try {
    const result = execSync('find src -name "*.test.js" -o -name "*.test.jsx" | head -50', { 
      cwd: '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client',
      encoding: 'utf8' 
    });
    return result.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error finding test files:', error.message);
    return [];
  }
};

// Fix import statements in a file
const fixImports = (filePath) => {
  try {
    const fullPath = path.join('/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client', filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Calculate relative path to test-utils
    const dirs = filePath.split('/').slice(0, -1);
    const depth = dirs.length;
    const relativePath = '../'.repeat(depth) + 'test-utils';
    
    // Replace the import statement
    const oldImport = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@testing-library\/react['"];?/g;
    const newImport = `import { $1 } from '${relativePath}';`;
    
    if (oldImport.test(content)) {
      content = content.replace(oldImport, newImport);
      fs.writeFileSync(fullPath, content, 'utf8');
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
console.log('Finding test files...');
const testFiles = findTestFiles();
console.log(`Found ${testFiles.length} test files`);

let fixedCount = 0;
testFiles.forEach(file => {
  if (fixImports(file)) {
    fixedCount++;
  }
});

console.log(`Fixed ${fixedCount} files`);
