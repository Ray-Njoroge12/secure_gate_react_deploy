#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📄 COMPREHENSIVE .MD FILES ANALYSIS');
console.log('=====================================\n');

// Get all .md files
const { execSync } = require('child_process');
const mdFilesOutput = execSync('find . -name "*.md" -not -path "./node_modules/*" -not -path "./.git/*"', { encoding: 'utf8' });
const mdFiles = mdFilesOutput.trim().split('\n').filter(Boolean);

console.log(`Found ${mdFiles.length} .md files\n`);

// Categorize files
const categories = {
  essential: [],
  deployment: [], 
  reports: [],
  guides: [],
  testing: [],
  outdated: [],
  duplicates: []
};

const keywordMapping = {
  'README': 'essential',
  'TODO': 'essential', 
  'CHANGELOG': 'essential',
  'DEPLOY': 'deployment',
  'PRODUCTION': 'deployment',
  'AWS': 'deployment',
  'NETLIFY': 'deployment',
  'DIGITALOCEAN': 'deployment',
  'DOCKER': 'deployment',
  'REPORT': 'reports',
  'ANALYSIS': 'reports', 
  'SUMMARY': 'reports',
  'STATUS': 'reports',
  'AUDIT': 'reports',
  'GUIDE': 'guides',
  'SETUP': 'guides',
  'INSTALL': 'guides',
  'TEST': 'testing',
  'PHASE': 'reports'
};

mdFiles.forEach(file => {
  try {
    const stats = fs.statSync(file);
    const filename = path.basename(file, '.md').toUpperCase();
    const sizeKB = (stats.size / 1024).toFixed(1);
    const daysSinceModified = Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24));
    
    const fileInfo = {
      path: file,
      name: filename,
      size: sizeKB + 'KB',
      daysSinceModified,
      lastModified: stats.mtime.toISOString().split('T')[0]
    };
    
    // Categorize by keywords
    let category = 'reports'; // default
    for (const [keyword, cat] of Object.entries(keywordMapping)) {
      if (filename.includes(keyword)) {
        category = cat;
        break;
      }
    }
    
    categories[category].push(fileInfo);
    
    // Mark as outdated if > 14 days old and not essential
    if (daysSinceModified > 14 && category !== 'essential') {
      categories.outdated.push(fileInfo);
    }
  } catch (error) {
    console.log(`Error analyzing ${file}: ${error.message}`);
  }
});

// Display results
console.log('📊 CATEGORIZATION RESULTS:\n');

Object.entries(categories).forEach(([category, files]) => {
  if (files.length > 0 && category !== 'outdated') {
    console.log(`${category.toUpperCase()} (${files.length} files):`);
    files.slice(0, 10).forEach(file => { // Show first 10
      const outdated = file.daysSinceModified > 14 ? ' 🕐' : '';
      console.log(`  📄 ${file.name} (${file.size}, ${file.daysSinceModified}d)${outdated}`);
    });
    if (files.length > 10) {
      console.log(`  ... and ${files.length - 10} more files`);
    }
    console.log('');
  }
});

console.log(`🕐 OUTDATED FILES (${categories.outdated.length} files older than 14 days):`);
categories.outdated.slice(0, 15).forEach(file => {
  console.log(`  ⚠️ ${file.name} (${file.daysSinceModified} days old, ${file.size})`);
});
if (categories.outdated.length > 15) {
  console.log(`  ... and ${categories.outdated.length - 15} more outdated files`);
}

console.log(`\n📈 CLEANUP RECOMMENDATIONS:`);
console.log(`  Keep Essential: ${categories.essential.length} files`);
console.log(`  Consolidate Deployment: ${categories.deployment.length} → ~3 files`);
console.log(`  Archive Reports: ${categories.reports.length} → ~5 key files`);
console.log(`  Merge Guides: ${categories.guides.length} → ~2 files`);
console.log(`  Remove Outdated: ${categories.outdated.length} files`);
console.log(`  Total reduction: ${mdFiles.length} → ~15 files (96% reduction)`);
