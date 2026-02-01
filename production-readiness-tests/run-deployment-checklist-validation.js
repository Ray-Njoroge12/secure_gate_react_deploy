#!/usr/bin/env node

/**
 * Production Deployment Checklist Validation CLI Runner
 * 
 * Standalone CLI tool for running comprehensive deployment checklist validation.
 * Provides pre-deployment verification reporting and CI/CD integration support.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import ProductionDeploymentChecklistValidator from './deployment-checklist-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DeploymentChecklistCLI {
  constructor() {
    this.options = {
      environment: 'production',
      outputFormat: 'console',
      outputFile: null,
      strictMode: true,
      verbose: false,
      exitOnFailure: true,
      generateReport: false,
      reportPath: './deployment-readiness-report.json'
    };
  }

  /**
   * Parse command line arguments
   */
  parseArguments(args) {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--environment':
        case '-e':
          this.options.environment = args[++i];
          break;
          
        case '--output-format':
        case '-f':
          this.options.outputFormat = args[++i];
          break;
          
        case '--output-file':
        case '-o':
          this.options.outputFile = args[++i];
          break;
          
        case '--report':
        case '-r':
          this.options.generateReport = true;
          if (args[i + 1] && !args[i + 1].startsWith('-')) {
            this.options.reportPath = args[++i];
          }
          break;
          
        case '--strict':
        case '-s':
          this.options.strictMode = true;
          break;
          
        case '--no-strict':
          this.options.strictMode = false;
          break;
          
        case '--verbose':
        case '-v':
          this.options.verbose = true;
          break;
          
        case '--no-exit':
          this.options.exitOnFailure = false;
          break;
          
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
          
        default:
          if (arg.startsWith('-')) {
            console.error(`❌ Unknown option: ${arg}`);
            this.showHelp();
            process.exit(1);
          }
      }
    }
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
🚀 Production Deployment Checklist Validation Tool

USAGE:
  node run-deployment-checklist-validation.js [OPTIONS]

OPTIONS:
  -e, --environment <env>     Target environment (production, staging, test)
                              Default: production
  
  -f, --output-format <fmt>   Output format (console, json, junit, markdown)
                              Default: console
  
  -o, --output-file <file>    Output file path (for non-console formats)
  
  -r, --report [path]         Generate detailed report
                              Default path: ./deployment-readiness-report.json
  
  -s, --strict                Enable strict validation mode (default)
      --no-strict             Disable strict validation mode
  
  -v, --verbose               Enable verbose output
  
      --no-exit               Don't exit with error code on validation failure
  
  -h, --help                  Show this help message

EXAMPLES:
  # Basic validation
  node run-deployment-checklist-validation.js

  # Staging environment with report
  node run-deployment-checklist-validation.js -e staging -r

  # JSON output to file
  node run-deployment-checklist-validation.js -f json -o checklist-results.json

  # Verbose validation with custom report path
  node run-deployment-checklist-validation.js -v -r ./reports/deployment-checklist.json

EXIT CODES:
  0  - Deployment ready (all critical checks passed)
  1  - Deployment not ready (critical issues found)
  2  - Validation error or configuration issue
  3  - Conditional deployment (warnings but no critical issues)

DEPLOYMENT READINESS LEVELS:
  ✅ READY        - All critical checks passed, deployment approved
  ⚠️  CONDITIONAL - Minor issues present, deployment can proceed with caution
  ❌ NOT READY    - Critical issues found, deployment must be delayed
`);
  }

  /**
   * Run deployment checklist validation
   */
  async run(args = process.argv.slice(2)) {
    try {
      console.log('🚀 Production Deployment Checklist Validation\n');
      
      // Parse command line arguments
      this.parseArguments(args);
      
      if (this.options.verbose) {
        console.log('📋 Configuration:');
        console.log(`   Environment: ${this.options.environment}`);
        console.log(`   Output Format: ${this.options.outputFormat}`);
        console.log(`   Strict Mode: ${this.options.strictMode}`);
        console.log(`   Generate Report: ${this.options.generateReport}`);
        console.log('');
      }
      
      // Create validator
      const validator = new ProductionDeploymentChecklistValidator({
        environment: this.options.environment,
        strictMode: this.options.strictMode,
        timeoutMs: 30000,
        retryAttempts: 3
      });
      
      // Run validation
      console.log('🔍 Running deployment checklist validation...\n');
      const startTime = Date.now();
      
      const results = await validator.validateDeploymentReadiness();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Validation completed in ${duration}ms\n`);
      
      // Generate report if requested
      let report = null;
      if (this.options.generateReport) {
        report = validator.generateDeploymentReport(results);
        await this.saveReport(report);
      }
      
      // Output results
      await this.outputResults(results, report);
      
      // Determine exit code
      const exitCode = this.getExitCode(results);
      
      if (this.options.verbose) {
        console.log(`\n📊 Validation Summary:`);
        console.log(`   Total Items: ${results.summary.totalItems}`);
        console.log(`   Passed: ${results.summary.passedItems}`);
        console.log(`   Failed: ${results.summary.failedItems}`);
        console.log(`   Warnings: ${results.summary.warningItems}`);
        console.log(`   Critical Issues: ${results.summary.criticalIssues}`);
        console.log(`   Overall Score: ${results.overall.score}%`);
        console.log(`   Exit Code: ${exitCode}`);
      }
      
      if (this.options.exitOnFailure) {
        process.exit(exitCode);
      }
      
      return { results, report, exitCode };
      
    } catch (error) {
      console.error('❌ Deployment checklist validation failed:');
      console.error(`   Error: ${error.message}`);
      
      if (this.options.verbose) {
        console.error(`   Stack: ${error.stack}`);
      }
      
      if (this.options.exitOnFailure) {
        process.exit(2);
      }
      
      throw error;
    }
  }

  /**
   * Output validation results in specified format
   */
  async outputResults(results, report) {
    switch (this.options.outputFormat) {
      case 'console':
        this.outputConsole(results);
        break;
        
      case 'json':
        await this.outputJSON(results, report);
        break;
        
      case 'junit':
        await this.outputJUnit(results);
        break;
        
      case 'markdown':
        await this.outputMarkdown(results, report);
        break;
        
      default:
        throw new Error(`Unsupported output format: ${this.options.outputFormat}`);
    }
  }

  /**
   * Output results to console
   */
  outputConsole(results) {
    const { overall, summary, categories, actionItems } = results;
    
    // Overall status
    console.log('📋 DEPLOYMENT READINESS ASSESSMENT');
    console.log('═'.repeat(50));
    
    const statusIcon = {
      'ready': '✅',
      'conditional': '⚠️',
      'not_ready': '❌'
    }[overall.status] || '❓';
    
    console.log(`${statusIcon} Status: ${overall.status.toUpperCase()}`);
    console.log(`📊 Overall Score: ${overall.score}%`);
    console.log(`💯 Completion Rate: ${overall.completionRate}%`);
    console.log(`🚨 Critical Issues: ${overall.criticalIssuesCount}`);
    console.log(`\n💡 Recommendation:`);
    console.log(`   ${overall.recommendation}\n`);
    
    // Category breakdown
    console.log('📂 CATEGORY BREAKDOWN');
    console.log('─'.repeat(50));
    
    for (const [categoryName, categoryResult] of Object.entries(categories)) {
      const categoryIcon = {
        'passed': '✅',
        'warning': '⚠️',
        'failed': '❌',
        'critical': '🚨'
      }[categoryResult.status] || '❓';
      
      console.log(`${categoryIcon} ${categoryName.toUpperCase()}: ${categoryResult.score}% (${categoryResult.passedItems}/${categoryResult.totalItems})`);
      
      if (this.options.verbose && categoryResult.criticalIssues > 0) {
        console.log(`   🚨 Critical Issues: ${categoryResult.criticalIssues}`);
      }
    }
    
    // Action items
    if (actionItems.length > 0) {
      console.log('\n🔧 ACTION ITEMS');
      console.log('─'.repeat(50));
      
      const criticalItems = actionItems.filter(item => item.priority === 'critical');
      const highItems = actionItems.filter(item => item.priority === 'high');
      const otherItems = actionItems.filter(item => !['critical', 'high'].includes(item.priority));
      
      if (criticalItems.length > 0) {
        console.log('\n🚨 CRITICAL (Must Fix Before Deployment):');
        criticalItems.slice(0, 5).forEach((item, index) => {
          console.log(`   ${index + 1}. [${item.category}] ${item.issue}`);
          console.log(`      💡 ${item.recommendation}`);
          console.log(`      ⏱️  Estimated Effort: ${item.estimatedEffort}`);
        });
        
        if (criticalItems.length > 5) {
          console.log(`   ... and ${criticalItems.length - 5} more critical items`);
        }
      }
      
      if (highItems.length > 0) {
        console.log('\n⚠️ HIGH PRIORITY:');
        highItems.slice(0, 3).forEach((item, index) => {
          console.log(`   ${index + 1}. [${item.category}] ${item.issue}`);
          console.log(`      💡 ${item.recommendation}`);
        });
        
        if (highItems.length > 3) {
          console.log(`   ... and ${highItems.length - 3} more high priority items`);
        }
      }
      
      if (otherItems.length > 0 && this.options.verbose) {
        console.log(`\n📝 OTHER ITEMS: ${otherItems.length} medium/low priority items`);
      }
    } else {
      console.log('\n✅ No action items required!');
    }
    
    console.log('\n' + '═'.repeat(50));
  }

  /**
   * Output results as JSON
   */
  async outputJSON(results, report) {
    const output = {
      timestamp: new Date().toISOString(),
      environment: this.options.environment,
      results,
      report: report || null
    };
    
    const jsonOutput = JSON.stringify(output, null, 2);
    
    if (this.options.outputFile) {
      await fs.writeFile(this.options.outputFile, jsonOutput, 'utf8');
      console.log(`📄 JSON results saved to: ${this.options.outputFile}`);
    } else {
      console.log(jsonOutput);
    }
  }

  /**
   * Output results as JUnit XML
   */
  async outputJUnit(results) {
    const { summary, categories } = results;
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuites name="Deployment Checklist" tests="${summary.totalItems}" failures="${summary.failedItems}" errors="0" time="0">\n`;
    
    for (const [categoryName, categoryResult] of Object.entries(categories)) {
      xml += `  <testsuite name="${categoryName}" tests="${categoryResult.totalItems}" failures="${categoryResult.failedItems}" errors="0" time="0">\n`;
      
      for (const [itemName, itemResult] of Object.entries(categoryResult.items)) {
        xml += `    <testcase name="${itemName}" classname="${categoryName}">\n`;
        
        if (itemResult.status === 'failed') {
          xml += `      <failure message="${itemResult.issues[0]?.issue || 'Validation failed'}">\n`;
          xml += `        ${itemResult.issues.map(issue => issue.issue).join('\n        ')}\n`;
          xml += `      </failure>\n`;
        }
        
        xml += `    </testcase>\n`;
      }
      
      xml += `  </testsuite>\n`;
    }
    
    xml += `</testsuites>\n`;
    
    if (this.options.outputFile) {
      await fs.writeFile(this.options.outputFile, xml, 'utf8');
      console.log(`📄 JUnit XML results saved to: ${this.options.outputFile}`);
    } else {
      console.log(xml);
    }
  }

  /**
   * Output results as Markdown
   */
  async outputMarkdown(results, report) {
    const { overall, summary, categories, actionItems } = results;
    
    let markdown = `# Production Deployment Readiness Report\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n`;
    markdown += `**Environment:** ${this.options.environment}\n\n`;
    
    // Overall status
    const statusEmoji = {
      'ready': '✅',
      'conditional': '⚠️',
      'not_ready': '❌'
    }[overall.status] || '❓';
    
    markdown += `## ${statusEmoji} Overall Status: ${overall.status.toUpperCase()}\n\n`;
    markdown += `- **Score:** ${overall.score}%\n`;
    markdown += `- **Completion Rate:** ${overall.completionRate}%\n`;
    markdown += `- **Critical Issues:** ${overall.criticalIssuesCount}\n\n`;
    markdown += `### Recommendation\n${overall.recommendation}\n\n`;
    
    // Summary
    markdown += `## 📊 Summary\n\n`;
    markdown += `| Metric | Count |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Total Items | ${summary.totalItems} |\n`;
    markdown += `| Passed | ${summary.passedItems} |\n`;
    markdown += `| Failed | ${summary.failedItems} |\n`;
    markdown += `| Warnings | ${summary.warningItems} |\n`;
    markdown += `| Critical Issues | ${summary.criticalIssues} |\n\n`;
    
    // Categories
    markdown += `## 📂 Category Results\n\n`;
    markdown += `| Category | Status | Score | Items Passed |\n`;
    markdown += `|----------|--------|-------|-------------|\n`;
    
    for (const [categoryName, categoryResult] of Object.entries(categories)) {
      const statusEmoji = {
        'passed': '✅',
        'warning': '⚠️',
        'failed': '❌',
        'critical': '🚨'
      }[categoryResult.status] || '❓';
      
      markdown += `| ${categoryName} | ${statusEmoji} ${categoryResult.status} | ${categoryResult.score}% | ${categoryResult.passedItems}/${categoryResult.totalItems} |\n`;
    }
    
    // Action items
    if (actionItems.length > 0) {
      markdown += `\n## 🔧 Action Items\n\n`;
      
      const criticalItems = actionItems.filter(item => item.priority === 'critical');
      const highItems = actionItems.filter(item => item.priority === 'high');
      
      if (criticalItems.length > 0) {
        markdown += `### 🚨 Critical Issues (Must Fix Before Deployment)\n\n`;
        criticalItems.forEach((item, index) => {
          markdown += `${index + 1}. **[${item.category}]** ${item.issue}\n`;
          markdown += `   - **Recommendation:** ${item.recommendation}\n`;
          markdown += `   - **Estimated Effort:** ${item.estimatedEffort}\n\n`;
        });
      }
      
      if (highItems.length > 0) {
        markdown += `### ⚠️ High Priority Issues\n\n`;
        highItems.forEach((item, index) => {
          markdown += `${index + 1}. **[${item.category}]** ${item.issue}\n`;
          markdown += `   - **Recommendation:** ${item.recommendation}\n`;
          markdown += `   - **Estimated Effort:** ${item.estimatedEffort}\n\n`;
        });
      }
    }
    
    if (this.options.outputFile) {
      await fs.writeFile(this.options.outputFile, markdown, 'utf8');
      console.log(`📄 Markdown report saved to: ${this.options.outputFile}`);
    } else {
      console.log(markdown);
    }
  }

  /**
   * Save detailed report to file
   */
  async saveReport(report) {
    try {
      const reportJson = JSON.stringify(report, null, 2);
      await fs.writeFile(this.options.reportPath, reportJson, 'utf8');
      console.log(`📊 Detailed report saved to: ${this.options.reportPath}`);
    } catch (error) {
      console.warn(`⚠️ Failed to save report: ${error.message}`);
    }
  }

  /**
   * Determine appropriate exit code based on results
   */
  getExitCode(results) {
    const { overall } = results;
    
    switch (overall.status) {
      case 'ready':
        return 0; // Success - deployment approved
        
      case 'conditional':
        return 3; // Warning - deployment can proceed with caution
        
      case 'not_ready':
        return 1; // Error - deployment blocked
        
      default:
        return 2; // Configuration or validation error
    }
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new DeploymentChecklistCLI();
  cli.run().catch(error => {
    console.error('❌ CLI execution failed:', error.message);
    process.exit(2);
  });
}

export default DeploymentChecklistCLI;