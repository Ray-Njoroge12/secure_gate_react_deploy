#!/usr/bin/env node

/**
 * Mobile App Deployment Validation CLI Runner
 * 
 * Standalone execution tool for mobile app deployment validation
 * with comprehensive reporting and CI/CD integration support.
 * 
 * Usage:
 *   node run-mobile-deployment-validation.js [options]
 * 
 * Options:
 *   --category <category>    Run specific validation category
 *   --format <format>        Output format (console|json|junit)
 *   --output <file>          Output file path
 *   --verbose               Enable verbose logging
 *   --ci                    CI/CD mode with appropriate exit codes
 *   --help                  Show help information
 * 
 * Requirements: 13.3, 13.6, 13.7, 13.8
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';
import MobileDeploymentValidator from './mobile-deployment-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MobileDeploymentValidationRunner {
  constructor() {
    this.validator = new MobileDeploymentValidator();
    this.options = this.parseArguments();
    this.results = null;
  }

  /**
   * Parse command line arguments
   */
  parseArguments() {
    const args = process.argv.slice(2);
    const options = {
      category: null,
      format: 'console',
      output: null,
      verbose: false,
      ci: false,
      help: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--category':
          options.category = args[++i];
          break;
        case '--format':
          options.format = args[++i];
          break;
        case '--output':
          options.output = args[++i];
          break;
        case '--verbose':
          options.verbose = true;
          break;
        case '--ci':
          options.ci = true;
          break;
        case '--help':
          options.help = true;
          break;
        default:
          if (arg.startsWith('--')) {
            console.warn(`Unknown option: ${arg}`);
          }
      }
    }

    return options;
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
Mobile App Deployment Validation Runner

USAGE:
  node run-mobile-deployment-validation.js [options]

OPTIONS:
  --category <category>    Run specific validation category:
                          - app-store: App store deployment readiness
                          - updates: Update mechanisms validation
                          - device-capability: Device adaptation validation
                          - network-optimization: Network condition optimization
                          - pwa: Progressive Web App deployment
                          - cross-platform: Cross-platform consistency
                          - all: Run all validations (default)

  --format <format>        Output format:
                          - console: Human-readable console output (default)
                          - json: JSON format for programmatic use
                          - junit: JUnit XML format for CI/CD integration

  --output <file>          Write results to specified file

  --verbose               Enable verbose logging and detailed output

  --ci                    CI/CD mode:
                          - Appropriate exit codes (0=success, 1=failure)
                          - Structured output for automation
                          - Suppressed interactive elements

  --help                  Show this help information

EXAMPLES:
  # Run all validations with console output
  node run-mobile-deployment-validation.js

  # Run only app store validation with JSON output
  node run-mobile-deployment-validation.js --category app-store --format json

  # Run in CI mode with JUnit output
  node run-mobile-deployment-validation.js --ci --format junit --output results.xml

  # Verbose validation of network optimization
  node run-mobile-deployment-validation.js --category network-optimization --verbose

VALIDATION CATEGORIES:
  app-store              - App store metadata, assets, and compliance validation
  updates               - Version management and update mechanism validation
  device-capability     - Feature detection and graceful degradation validation
  network-optimization  - Offline capability and network adaptation validation
  pwa                   - Progressive Web App deployment validation
  cross-platform        - Cross-platform consistency and feature parity validation

EXIT CODES:
  0  Success - All validations passed
  1  Failure - One or more validations failed
  2  Error - Runtime error or invalid configuration
`);
  }

  /**
   * Run specific validation category
   */
  async runCategory(category) {
    if (this.options.verbose) {
      console.log(`🔍 Running ${category} validation...`);
    }

    switch (category) {
      case 'app-store':
        return await this.validator.validateAppStoreReadiness();
      case 'updates':
        return await this.validator.validateUpdateMechanisms();
      case 'device-capability':
        return await this.validator.validateDeviceCapabilityAdaptation();
      case 'network-optimization':
        return await this.validator.validateNetworkOptimization();
      case 'pwa':
        return await this.validator.validatePWADeployment();
      case 'cross-platform':
        return await this.validator.validateCrossPlatformConsistency();
      case 'all':
      default:
        return await this.validator.runCompleteValidation();
    }
  }

  /**
   * Format results for console output
   */
  formatConsoleOutput(results) {
    const lines = [];
    
    lines.push('📱 Mobile App Deployment Validation Results');
    lines.push('=' .repeat(50));
    lines.push('');

    if (results.summary) {
      lines.push('📊 Summary:');
      lines.push(`   Total Validations: ${results.summary.totalValidations}`);
      lines.push(`   ✅ Passed: ${results.summary.passedValidations}`);
      lines.push(`   ❌ Failed: ${results.summary.failedValidations}`);
      lines.push(`   ⚠️  Warnings: ${results.summary.warningValidations}`);
      lines.push(`   🚀 Deployment Ready: ${results.deploymentReadiness ? '✅ Yes' : '❌ No'}`);
      lines.push('');
    }

    // Category results
    if (results.results) {
      for (const [category, categoryResults] of Object.entries(results.results)) {
        if (categoryResults && Object.keys(categoryResults).length > 0) {
          lines.push(`📋 ${category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1')}:`);
          
          for (const [subcategory, subResults] of Object.entries(categoryResults)) {
            if (subResults && subResults.validations) {
              const errors = subResults.validations.filter(v => v.type === 'error');
              const warnings = subResults.validations.filter(v => v.type === 'warning');
              const infos = subResults.validations.filter(v => v.type === 'info');
              
              lines.push(`   ${subcategory}: ${errors.length} errors, ${warnings.length} warnings, ${infos.length} checks`);
              
              if (this.options.verbose) {
                // Show detailed validation results in verbose mode
                for (const validation of subResults.validations) {
                  const icon = validation.type === 'error' ? '❌' : validation.type === 'warning' ? '⚠️' : 'ℹ️';
                  lines.push(`     ${icon} ${validation.message} (${validation.requirement})`);
                }
              }
            }
          }
          lines.push('');
        }
      }
    }

    // Recommendations
    if (results.recommendations && results.recommendations.length > 0) {
      lines.push('💡 Recommendations:');
      for (const recommendation of results.recommendations) {
        lines.push(`   • ${recommendation}`);
      }
      lines.push('');
    }

    lines.push(`⏰ Completed at: ${results.timestamp}`);
    
    return lines.join('\n');
  }

  /**
   * Format results for JSON output
   */
  formatJsonOutput(results) {
    return JSON.stringify(results, null, 2);
  }

  /**
   * Format results for JUnit XML output
   */
  formatJUnitOutput(results) {
    const escapeXml = (str) => {
      return str.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case "'": return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
    };

    const lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    
    const totalTests = results.summary?.totalValidations || 0;
    const failures = results.summary?.failedValidations || 0;
    const errors = 0; // We don't distinguish between failures and errors in our model
    const time = '0'; // We don't track execution time per test
    
    lines.push(`<testsuite name="MobileDeploymentValidation" tests="${totalTests}" failures="${failures}" errors="${errors}" time="${time}">`);

    // Add test cases for each validation
    if (results.results) {
      for (const [category, categoryResults] of Object.entries(results.results)) {
        if (categoryResults && typeof categoryResults === 'object') {
          for (const [subcategory, subResults] of Object.entries(categoryResults)) {
            if (subResults && subResults.validations) {
              for (const validation of subResults.validations) {
                const testName = `${category}.${subcategory}.${validation.message.replace(/[^a-zA-Z0-9]/g, '_')}`;
                const className = `MobileDeploymentValidation.${category}`;
                
                lines.push(`  <testcase name="${escapeXml(testName)}" classname="${escapeXml(className)}" time="0">`);
                
                if (validation.type === 'error') {
                  lines.push(`    <failure message="${escapeXml(validation.message)}" type="ValidationError">`);
                  lines.push(`      ${escapeXml(validation.message)} (Requirement: ${validation.requirement})`);
                  lines.push('    </failure>');
                } else if (validation.type === 'warning') {
                  lines.push(`    <system-out>${escapeXml(`Warning: ${validation.message} (${validation.requirement})`)}</system-out>`);
                }
                
                lines.push('  </testcase>');
              }
            }
          }
        }
      }
    }

    lines.push('</testsuite>');
    return lines.join('\n');
  }

  /**
   * Write results to file
   */
  writeResults(content, filepath) {
    try {
      writeFileSync(filepath, content, 'utf8');
      if (this.options.verbose) {
        console.log(`📄 Results written to: ${filepath}`);
      }
    } catch (error) {
      console.error(`❌ Failed to write results to ${filepath}:`, error.message);
      process.exit(2);
    }
  }

  /**
   * Determine exit code based on results
   */
  getExitCode(results) {
    if (!results) {
      return 2; // Error
    }

    if (results.summary && results.summary.failedValidations > 0) {
      return 1; // Failure
    }

    return 0; // Success
  }

  /**
   * Run the validation
   */
  async run() {
    try {
      // Show help if requested
      if (this.options.help) {
        this.showHelp();
        return;
      }

      // Validate options
      const validCategories = ['app-store', 'updates', 'device-capability', 'network-optimization', 'pwa', 'cross-platform', 'all'];
      if (this.options.category && !validCategories.includes(this.options.category)) {
        console.error(`❌ Invalid category: ${this.options.category}`);
        console.error(`Valid categories: ${validCategories.join(', ')}`);
        process.exit(2);
      }

      const validFormats = ['console', 'json', 'junit'];
      if (!validFormats.includes(this.options.format)) {
        console.error(`❌ Invalid format: ${this.options.format}`);
        console.error(`Valid formats: ${validFormats.join(', ')}`);
        process.exit(2);
      }

      // Run validation
      if (!this.options.ci) {
        console.log('🚀 Starting Mobile App Deployment Validation...\n');
      }

      const category = this.options.category || 'all';
      this.results = await this.runCategory(category);

      // Format output
      let output;
      switch (this.options.format) {
        case 'json':
          output = this.formatJsonOutput(this.results);
          break;
        case 'junit':
          output = this.formatJUnitOutput(this.results);
          break;
        case 'console':
        default:
          output = this.formatConsoleOutput(this.results);
          break;
      }

      // Write to file or console
      if (this.options.output) {
        this.writeResults(output, this.options.output);
        
        if (!this.options.ci && this.options.format === 'console') {
          console.log(output);
        }
      } else {
        console.log(output);
      }

      // Exit with appropriate code in CI mode
      if (this.options.ci) {
        const exitCode = this.getExitCode(this.results);
        process.exit(exitCode);
      }

    } catch (error) {
      console.error('❌ Mobile App Deployment Validation failed:', error.message);
      
      if (this.options.verbose) {
        console.error(error.stack);
      }
      
      if (this.options.ci) {
        process.exit(2);
      }
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new MobileDeploymentValidationRunner();
  runner.run().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(2);
  });
}

export default MobileDeploymentValidationRunner;