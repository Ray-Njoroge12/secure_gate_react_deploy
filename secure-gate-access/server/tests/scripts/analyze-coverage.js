#!/usr/bin/env node
/**
 * Coverage Analysis Script
 * 
 * Analyzes test coverage and identifies critical gaps
 * Part of Phase 1, Week 1, Day 4 - Phase B
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, statSync, existsSync, readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverRoot = join(__dirname, '../..');

/**
 * Recursively get all JS files in a directory
 */
function getAllJsFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip certain directories
      if (!['node_modules', 'coverage', 'tests', 'dist', '.git'].includes(file)) {
        getAllJsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js') && !file.endsWith('.test.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Get all test files
 */
function getAllTestFiles(testDir) {
  const testFiles = [];
  
  function recurse(dir) {
    const files = readdirSync(dir);
    files.forEach(file => {
      const filePath = join(dir, file);
      const stat = statSync(filePath);
      
      if (stat.isDirectory()) {
        recurse(filePath);
      } else if (file.endsWith('.test.js')) {
        testFiles.push(filePath);
      }
    });
  }
  
  recurse(testDir);
  return testFiles;
}

/**
 * Analyze which source files have test coverage
 */
function analyzeCoverage() {
  console.log('🔍 Analyzing Test Coverage...\n');
  
  const srcDir = join(serverRoot, 'src');
  const testDir = join(serverRoot, 'tests');
  
  // Get all source files
  const sourceFiles = getAllJsFiles(srcDir);
  const testFiles = getAllTestFiles(testDir);
  
  console.log(`📊 Source Files: ${sourceFiles.length}`);
  console.log(`🧪 Test Files: ${testFiles.length}\n`);
  
  // Categorize source files
  const categories = {
    controllers: [],
    services: [],
    middleware: [],
    routes: [],
    models: [],
    utils: [],
    config: [],
    other: []
  };
  
  sourceFiles.forEach(file => {
    const relativePath = file.replace(srcDir + '/', '');
    
    if (relativePath.includes('controllers/')) categories.controllers.push(relativePath);
    else if (relativePath.includes('services/')) categories.services.push(relativePath);
    else if (relativePath.includes('middleware/')) categories.middleware.push(relativePath);
    else if (relativePath.includes('routes/')) categories.routes.push(relativePath);
    else if (relativePath.includes('models/')) categories.models.push(relativePath);
    else if (relativePath.includes('utils/')) categories.utils.push(relativePath);
    else if (relativePath.includes('config/')) categories.config.push(relativePath);
    else categories.other.push(relativePath);
  });
  
  // Display breakdown
  console.log('📁 Source File Breakdown:');
  console.log(`  Controllers: ${categories.controllers.length}`);
  console.log(`  Services: ${categories.services.length}`);
  console.log(`  Middleware: ${categories.middleware.length}`);
  console.log(`  Routes: ${categories.routes.length}`);
  console.log(`  Models: ${categories.models.length}`);
  console.log(`  Utils: ${categories.utils.length}`);
  console.log(`  Config: ${categories.config.length}`);
  console.log(`  Other: ${categories.other.length}\n`);
  
  // Identify critical files that need tests
  const criticalFiles = {
    highPriority: [],
    mediumPriority: [],
    lowPriority: []
  };
  
  // High priority: Controllers, Services, Middleware
  categories.controllers.forEach(f => {
    if (!f.includes('index.js')) {
      criticalFiles.highPriority.push({ file: f, category: 'controller' });
    }
  });
  
  categories.services.forEach(f => {
    if (!f.includes('index.js')) {
      criticalFiles.highPriority.push({ file: f, category: 'service' });
    }
  });
  
  categories.middleware.forEach(f => {
    if (!f.includes('index.js')) {
      criticalFiles.highPriority.push({ file: f, category: 'middleware' });
    }
  });
  
  // Medium priority: Routes, Utils
  categories.routes.forEach(f => {
    if (!f.includes('index.js')) {
      criticalFiles.mediumPriority.push({ file: f, category: 'route' });
    }
  });
  
  categories.utils.forEach(f => {
    if (!f.includes('index.js')) {
      criticalFiles.mediumPriority.push({ file: f, category: 'util' });
    }
  });
  
  // Low priority: Models, Config
  categories.models.forEach(f => {
    if (!f.includes('index.js')) {
      criticalFiles.lowPriority.push({ file: f, category: 'model' });
    }
  });
  
  return {
    sourceFiles,
    testFiles,
    categories,
    criticalFiles,
    summary: {
      totalSourceFiles: sourceFiles.length,
      totalTestFiles: testFiles.length,
      highPriorityFiles: criticalFiles.highPriority.length,
      mediumPriorityFiles: criticalFiles.mediumPriority.length,
      lowPriorityFiles: criticalFiles.lowPriority.length
    }
  };
}

/**
 * Generate coverage report
 */
function generateReport(analysis) {
  const report = {
    timestamp: new Date().toISOString(),
    phase: 'Phase 1, Week 1, Day 4 - Phase B',
    ...analysis.summary,
    breakdown: analysis.categories,
    criticalGaps: analysis.criticalFiles
  };
  
  const reportPath = join(serverRoot, 'tests/results/coverage-analysis.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n✅ Coverage Analysis Complete!');
  console.log(`📄 Report saved to: tests/results/coverage-analysis.json\n`);
  
  // Display recommendations
  console.log('🎯 Recommendations:\n');
  console.log(`HIGH PRIORITY (${analysis.criticalFiles.highPriority.length} files):`);
  analysis.criticalFiles.highPriority.slice(0, 10).forEach(item => {
    console.log(`  ⚠️  ${item.category}: ${item.file}`);
  });
  
  if (analysis.criticalFiles.highPriority.length > 10) {
    console.log(`  ... and ${analysis.criticalFiles.highPriority.length - 10} more\n`);
  } else {
    console.log('');
  }
  
  console.log(`MEDIUM PRIORITY (${analysis.criticalFiles.mediumPriority.length} files):`);
  analysis.criticalFiles.mediumPriority.slice(0, 5).forEach(item => {
    console.log(`  📝 ${item.category}: ${item.file}`);
  });
  
  if (analysis.criticalFiles.mediumPriority.length > 5) {
    console.log(`  ... and ${analysis.criticalFiles.mediumPriority.length - 5} more\n`);
  } else {
    console.log('');
  }
  
  return report;
}

/**
 * Main execution
 */
async function main() {
  console.log('═'.repeat(80));
  console.log('  COVERAGE ANALYSIS - Phase 1, Week 1, Day 4, Phase B');
  console.log('═'.repeat(80));
  console.log('');
  
  try {
    const analysis = analyzeCoverage();
    const report = generateReport(analysis);
    
    console.log('🎯 Next Steps:');
    console.log('  1. Review coverage-analysis.json');
    console.log('  2. Run npm run test:unit:coverage for detailed metrics');
    console.log('  3. Create tests for high-priority files');
    console.log('  4. Aim for 70%+ coverage threshold\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during coverage analysis:', error);
    process.exit(1);
  }
}

main();
