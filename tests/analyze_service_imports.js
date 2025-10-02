#!/usr/bin/env node
/**
 * Script to analyze service imports and identify orphaned services
 * Finds services that are not imported anywhere in the codebase
 */

import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';

async function analyzeServiceImports() {
  console.log('🔍 Analyzing service imports...\n');
  
  const servicesDir = '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server/src/services';
  const srcDir = '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server/src';
  
  try {
    // Get all service files
    const serviceFiles = await readdir(servicesDir);
    const jsServices = serviceFiles.filter(file => extname(file) === '.js');
    
    console.log(`Found ${jsServices.length} service files\n`);
    
    // Get all source files to search through (including integration directory)
    const allFiles = await getAllJsFiles(srcDir);
    const integrationFiles = await getAllJsFiles('/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server/integration');
    const allFilesToSearch = [...allFiles, ...integrationFiles];
    console.log(`Searching through ${allFilesToSearch.length} source files (including integration)\n`);
    
    const orphanedServices = [];
    const usedServices = [];
    
    for (const serviceFile of jsServices) {
      const serviceName = serviceFile.replace('.js', '');
      const servicePath = `services/${serviceFile}`;
      
      let isUsed = false;
      let importCount = 0;
      
      for (const file of allFilesToSearch) {
        try {
          const content = await readFile(file, 'utf8');
          
          // Check for various import patterns
          const importPatterns = [
            new RegExp(`from ['"]\\.\\.?/.*${serviceName}['"]`, 'g'),
            new RegExp(`from ['"]\\.\\.?/.*${servicePath}['"]`, 'g'),
            new RegExp(`import.*${serviceName}`, 'g'),
            new RegExp(`require\\(['"]\\.\\.?/.*${serviceName}['"]\\)`, 'g'),
            new RegExp(`require\\(['"]\\.\\.?/.*${servicePath}['"]\\)`, 'g')
          ];
          
          for (const pattern of importPatterns) {
            const matches = content.match(pattern);
            if (matches) {
              importCount += matches.length;
              isUsed = true;
            }
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
      
      if (isUsed) {
        usedServices.push({ name: serviceName, file: serviceFile, importCount });
        console.log(`✅ ${serviceFile} - Used (${importCount} imports)`);
      } else {
        orphanedServices.push({ name: serviceName, file: serviceFile });
        console.log(`❌ ${serviceFile} - Orphaned (0 imports)`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Analysis Summary:`);
    console.log(`   Total services: ${jsServices.length}`);
    console.log(`   Used services: ${usedServices.length}`);
    console.log(`   Orphaned services: ${orphanedServices.length}`);
    console.log('='.repeat(60));
    
    if (orphanedServices.length > 0) {
      console.log('\n🗑️  Orphaned services that can be removed:');
      orphanedServices.forEach(service => {
        console.log(`   - ${service.file}`);
      });
    }
    
    return { orphanedServices, usedServices };
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    return { orphanedServices: [], usedServices: [] };
  }
}

async function getAllJsFiles(dir) {
  const files = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and other non-source directories
        if (!['node_modules', '.git', 'logs', 'artifacts'].includes(entry.name)) {
          const subFiles = await getAllJsFiles(fullPath);
          files.push(...subFiles);
        }
      } else if (entry.isFile() && extname(entry.name) === '.js') {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }
  
  return files;
}

// Run the analysis if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeServiceImports()
    .then(({ orphanedServices, usedServices }) => {
      console.log(`\n🎯 Ready to remove ${orphanedServices.length} orphaned services`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Analysis failed:', error);
      process.exit(1);
    });
}

export default analyzeServiceImports;
