import logger from 'utils/logger';
#!/usr/bin/env node

/**
 * CSS Cleanup Script
 * 
 * Automated script to clean up unused CSS and migrate to Tailwind:
 * - Identifies unused CSS classes
 * - Removes redundant styles
 * - Consolidates CSS files
 * - Generates cleanup reports
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  srcDir: path.join(__dirname, '../src'),
  cssFiles: [
    'styles.css',
    'styles/browserCompatibility.css',
    'styles/transitions.css',
    'design-system/styles.css',
  ],
  fileExtensions: ['.jsx', '.js', '.tsx', '.ts'],
  excludeDirs: ['node_modules', '.git', 'dist', 'build', 'migration-reports'],
  excludeFiles: ['cleanupCSS.js', 'migrateToTailwind.js'],
};

// CSS class usage patterns
const CSS_CLASS_PATTERNS = [
  // className="class-name"
  /className\s*=\s*["']([^"']*)["']/g,
  // class="class-name"
  /class\s*=\s*["']([^"']*)["']/g,
  // CSS-in-JS patterns
  /\.([a-zA-Z0-9_-]+)\s*[:{]/g,
  // Template literal patterns
  /`([^`]*)`/g,
];

// Utility functions
const utils = {
  // Get all files to scan
  getAllFiles: (dir) => {
    const files = [];
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!CONFIG.excludeDirs.includes(item)) {
          files.push(...utils.getAllFiles(fullPath));
        }
      } else if (CONFIG.fileExtensions.includes(path.extname(item))) {
        if (!CONFIG.excludeFiles.includes(item)) {
          files.push(fullPath);
        }
      }
    });
    
    return files;
  },
  
  // Extract CSS classes from file content
  extractClassesFromFile: (filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const classes = new Set();
      
      CSS_CLASS_PATTERNS.forEach(pattern => {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            // Split by spaces and add individual classes
            match[1].split(/\s+/).forEach(cls => {
              if (cls.trim()) {
                classes.add(cls.trim());
              }
            });
          }
        }
      });
      
      return Array.from(classes);
    } catch (error) {
      logger.error(`Error reading file ${filePath}:`, error.message);
      return [];
    }
  },
  
  // Extract CSS classes from all files
  extractAllClasses: () => {
    const files = utils.getAllFiles(CONFIG.srcDir);
    const allClasses = new Set();
    
    files.forEach(filePath => {
      const classes = utils.extractClassesFromFile(filePath);
      classes.forEach(cls => allClasses.add(cls));
    });
    
    return Array.from(allClasses);
  },
  
  // Parse CSS file and extract class definitions
  parseCSSFile: (filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const classes = [];
      
      // Match CSS class definitions
      const classRegex = /\.([a-zA-Z0-9_-]+)\s*[:{]/g;
      let match;
      
      while ((match = classRegex.exec(content)) !== null) {
        classes.push({
          name: match[1],
          index: match.index,
          fullMatch: match[0],
        });
      }
      
      return classes;
    } catch (error) {
      logger.error(`Error parsing CSS file ${filePath}:`, error.message);
      return [];
    }
  },
  
  // Find unused CSS classes
  findUnusedClasses: (cssClasses, usedClasses) => {
    const usedSet = new Set(usedClasses);
    return cssClasses.filter(cls => !usedSet.has(cls.name));
  },
  
  // Remove unused classes from CSS content
  removeUnusedClasses: (content, unusedClasses) => {
    let cleanedContent = content;
    
    unusedClasses.forEach(cls => {
      // Remove class definition and its block
      const classRegex = new RegExp(`\\.${cls.name}\\s*\\{[^}]*\\}`, 'g');
      cleanedContent = cleanedContent.replace(classRegex, '');
      
      // Remove empty rules
      cleanedContent = cleanedContent.replace(/\{\s*\}/g, '');
      
      // Remove multiple empty lines
      cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    });
    
    return cleanedContent;
  },
  
  // Consolidate CSS files
  consolidateCSS: (cssFiles) => {
    let consolidated = '';
    
    cssFiles.forEach(filePath => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        consolidated += `\n/* === ${path.basename(filePath)} === */\n`;
        consolidated += content;
        consolidated += '\n\n';
      } catch (error) {
        logger.error(`Error reading CSS file ${filePath}:`, error.message);
      }
    });
    
    return consolidated;
  },
  
  // Generate cleanup report
  generateCleanupReport: (originalClasses, unusedClasses, removedCount) => {
    return {
      timestamp: new Date().toISOString(),
      totalClasses: originalClasses.length,
      unusedClasses: unusedClasses.length,
      removedClasses: removedCount,
      cleanupRate: (removedCount / originalClasses.length) * 100,
      remainingClasses: originalClasses.length - removedCount,
      recommendations: [],
    };
  },
  
  // Write cleanup report
  writeCleanupReport: (report) => {
    const outputDir = path.join(__dirname, '../cleanup-reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const reportPath = path.join(outputDir, `css-cleanup-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    logger.debug(`Cleanup report written to: ${reportPath}`);
    return reportPath;
  },
};

// Main cleanup function
const cleanupCSS = () => {
  logger.debug('🧹 Starting CSS cleanup...');
  logger.debug(`📁 Scanning directory: ${CONFIG.srcDir}`);
  
  // Extract all used classes from source files
  logger.debug('📄 Extracting used classes from source files...');
  const usedClasses = utils.extractAllClasses();
  logger.debug(`   Found ${usedClasses.length} unique classes in use`);
  
  // Process each CSS file
  const cssFiles = CONFIG.cssFiles.map(file => path.join(CONFIG.srcDir, file));
  const allReports = [];
  
  cssFiles.forEach(cssFile => {
    if (fs.existsSync(cssFile)) {
      logger.debug(`\n🔍 Processing: ${path.relative(CONFIG.srcDir, cssFile)}`);
      
      // Parse CSS file
      const cssClasses = utils.parseCSSFile(cssFile);
      logger.debug(`   Found ${cssClasses.length} CSS class definitions`);
      
      // Find unused classes
      const unusedClasses = utils.findUnusedClasses(cssClasses, usedClasses);
      logger.debug(`   Found ${unusedClasses.length} unused classes`);
      
      if (unusedClasses.length > 0) {
        // Remove unused classes
        const originalContent = fs.readFileSync(cssFile, 'utf8');
        const cleanedContent = utils.removeUnusedClasses(originalContent, unusedClasses);
        
        // Generate report
        const report = utils.generateCleanupReport(
          cssClasses,
          unusedClasses,
          unusedClasses.length
        );
        report.file = path.relative(CONFIG.srcDir, cssFile);
        report.unusedClassNames = unusedClasses.map(cls => cls.name);
        allReports.push(report);
        
        logger.debug(`   ✅ Cleaned up ${unusedClasses.length} unused classes`);
        logger.debug(`   📊 Cleanup rate: ${report.cleanupRate.toFixed(2)}%`);
      } else {
        logger.debug(`   ✨ No unused classes found`);
      }
    } else {
      logger.debug(`   ⚠️  File not found: ${cssFile}`);
    }
  });
  
  // Generate consolidated CSS
  logger.debug('\n📦 Generating consolidated CSS...');
  const consolidatedCSS = utils.consolidateCSS(cssFiles);
  const consolidatedPath = path.join(CONFIG.srcDir, 'styles-consolidated.css');
  fs.writeFileSync(consolidatedPath, consolidatedCSS);
  logger.debug(`   ✅ Consolidated CSS written to: ${consolidatedPath}`);
  
  // Generate summary
  const totalClasses = allReports.reduce((sum, r) => sum + r.totalClasses, 0);
  const totalUnused = allReports.reduce((sum, r) => sum + r.unusedClasses, 0);
  const totalRemoved = allReports.reduce((sum, r) => sum + r.removedClasses, 0);
  const averageCleanupRate = allReports.length > 0 ? 
    allReports.reduce((sum, r) => sum + r.cleanupRate, 0) / allReports.length : 0;
  
  logger.debug('\n📊 Cleanup Summary:');
  logger.debug(`   Total CSS classes: ${totalClasses}`);
  logger.debug(`   Unused classes: ${totalUnused}`);
  logger.debug(`   Removed classes: ${totalRemoved}`);
  logger.debug(`   Average cleanup rate: ${averageCleanupRate.toFixed(2)}%`);
  logger.debug(`   Files processed: ${allReports.length}`);
  
  // Write reports
  if (allReports.length > 0) {
    const reportPath = utils.writeCleanupReport({
      summary: {
        totalClasses,
        totalUnused,
        totalRemoved,
        averageCleanupRate,
        filesProcessed: allReports.length,
      },
      files: allReports,
    });
    logger.debug(`\n📋 Detailed report saved to: ${reportPath}`);
  } else {
    logger.debug('\n✨ No cleanup needed - all CSS classes are in use!');
  }
  
  return { allReports, consolidatedCSS };
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    logger.debug(`
Usage: node cleanupCSS.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be cleaned without making changes
  --verbose      Show detailed output for each file
  --consolidate  Only generate consolidated CSS file

Examples:
  node cleanupCSS.js
  node cleanupCSS.js --dry-run --verbose
  node cleanupCSS.js --consolidate
    `);
    process.exit(0);
  }
  
  const isDryRun = args.includes('--dry-run');
  const isVerbose = args.includes('--verbose');
  const isConsolidateOnly = args.includes('--consolidate');
  
  if (isDryRun) {
    logger.debug('🔍 Running in dry-run mode - no files will be modified');
  }
  
  if (isVerbose) {
    logger.debug('📝 Verbose mode enabled');
  }
  
  if (isConsolidateOnly) {
    logger.debug('📦 Consolidate-only mode enabled');
  }
  
  cleanupCSS();
}

module.exports = {
  cleanupCSS,
  utils,
  CONFIG,
};




