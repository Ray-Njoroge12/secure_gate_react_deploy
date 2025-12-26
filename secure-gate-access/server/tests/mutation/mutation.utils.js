/**
 * Mutation Testing Utilities
 * ==========================
 * 
 * Comprehensive utilities for running, analyzing, and reporting
 * mutation testing results. Provides baseline management, trend
 * analysis, and integration with CI/CD pipelines.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  reportsDir: path.join(__dirname, 'reports'),
  baselinesDir: path.join(__dirname, 'baselines'),
  thresholds: {
    critical: 85,    // Critical security code must have >85% mutation score
    high: 75,        // High-importance code must have >75%
    standard: 60,    // Standard code must have >60%
    break: 50,       // Build fails if any module falls below 50%
  },
  moduleCategories: {
    critical: [
      'encryptionService',
      'tokenService',
      'authMiddleware',
      'mfaService',
      'secretsManagerService',
      'sessionSecurityService',
    ],
    high: [
      'validationMiddleware',
      'roleMiddleware',
      'rateLimitMiddleware',
      'securityHeaders',
      'complianceService',
    ],
    standard: [
      'auditService',
      'gdprComplianceService',
      'securityMonitoringService',
    ],
  },
};

// ============================================================================
// Mutation Score Calculator
// ============================================================================

export class MutationScoreCalculator {
  constructor(report) {
    this.report = report;
  }

  /**
   * Calculate overall mutation score
   */
  getOverallScore() {
    const { killed, survived, noCoverage, timeout, error } = this.getMutantCounts();
    const total = killed + survived + noCoverage + timeout + error;
    
    if (total === 0) return 0;
    
    // Mutation Score = (Killed + Timeout) / Total Mutants * 100
    return ((killed + timeout) / total) * 100;
  }

  /**
   * Get mutant counts by status
   */
  getMutantCounts() {
    const counts = {
      killed: 0,
      survived: 0,
      noCoverage: 0,
      timeout: 0,
      error: 0,
      ignored: 0,
    };

    if (!this.report?.files) return counts;

    Object.values(this.report.files).forEach(file => {
      file.mutants?.forEach(mutant => {
        const status = mutant.status?.toLowerCase() || 'unknown';
        if (counts.hasOwnProperty(status)) {
          counts[status]++;
        }
      });
    });

    return counts;
  }

  /**
   * Calculate score per file
   */
  getScoreByFile() {
    const scores = {};

    if (!this.report?.files) return scores;

    Object.entries(this.report.files).forEach(([filePath, file]) => {
      const mutants = file.mutants || [];
      const total = mutants.length;
      
      if (total === 0) {
        scores[filePath] = { score: 100, killed: 0, survived: 0, total: 0 };
        return;
      }

      const killed = mutants.filter(m => 
        m.status === 'Killed' || m.status === 'Timeout'
      ).length;
      const survived = mutants.filter(m => 
        m.status === 'Survived' || m.status === 'NoCoverage'
      ).length;

      scores[filePath] = {
        score: (killed / total) * 100,
        killed,
        survived,
        total,
        noCoverage: mutants.filter(m => m.status === 'NoCoverage').length,
      };
    });

    return scores;
  }

  /**
   * Get surviving mutants for analysis
   */
  getSurvivingMutants() {
    const survivors = [];

    if (!this.report?.files) return survivors;

    Object.entries(this.report.files).forEach(([filePath, file]) => {
      file.mutants?.forEach(mutant => {
        if (mutant.status === 'Survived' || mutant.status === 'NoCoverage') {
          survivors.push({
            file: filePath,
            line: mutant.location?.start?.line,
            column: mutant.location?.start?.column,
            mutatorName: mutant.mutatorName,
            replacement: mutant.replacement,
            description: mutant.description,
            status: mutant.status,
          });
        }
      });
    });

    return survivors;
  }
}

// ============================================================================
// Baseline Management
// ============================================================================

export class MutationBaseline {
  constructor(baselineDir = CONFIG.baselinesDir) {
    this.baselineDir = baselineDir;
    this.ensureDirectory();
  }

  ensureDirectory() {
    if (!fs.existsSync(this.baselineDir)) {
      fs.mkdirSync(this.baselineDir, { recursive: true });
    }
  }

  /**
   * Save current mutation scores as baseline
   */
  saveBaseline(scoresByFile, metadata = {}) {
    const baseline = {
      timestamp: new Date().toISOString(),
      gitCommit: metadata.commit || 'unknown',
      gitBranch: metadata.branch || 'unknown',
      scores: scoresByFile,
      overallScore: this.calculateOverallFromFiles(scoresByFile),
    };

    const filename = `baseline-${Date.now()}.json`;
    const filepath = path.join(this.baselineDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(baseline, null, 2));
    
    // Also save as latest
    const latestPath = path.join(this.baselineDir, 'baseline-latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(baseline, null, 2));

    return baseline;
  }

  /**
   * Load the latest baseline
   */
  loadLatestBaseline() {
    const latestPath = path.join(this.baselineDir, 'baseline-latest.json');
    
    if (!fs.existsSync(latestPath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(latestPath, 'utf8'));
  }

  /**
   * Compare current scores against baseline
   */
  compareWithBaseline(currentScores) {
    const baseline = this.loadLatestBaseline();
    
    if (!baseline) {
      return { hasBaseline: false, regressions: [], improvements: [] };
    }

    const regressions = [];
    const improvements = [];
    const REGRESSION_THRESHOLD = 5; // 5% drop is a regression

    Object.entries(currentScores).forEach(([file, current]) => {
      const baselineScore = baseline.scores[file]?.score;
      
      if (baselineScore !== undefined) {
        const diff = current.score - baselineScore;
        
        if (diff < -REGRESSION_THRESHOLD) {
          regressions.push({
            file,
            baselineScore,
            currentScore: current.score,
            diff,
          });
        } else if (diff > REGRESSION_THRESHOLD) {
          improvements.push({
            file,
            baselineScore,
            currentScore: current.score,
            diff,
          });
        }
      }
    });

    return {
      hasBaseline: true,
      baselineDate: baseline.timestamp,
      regressions,
      improvements,
      overallDiff: this.calculateOverallFromFiles(currentScores) - baseline.overallScore,
    };
  }

  calculateOverallFromFiles(scoresByFile) {
    const values = Object.values(scoresByFile);
    if (values.length === 0) return 0;
    
    const totalKilled = values.reduce((sum, v) => sum + (v.killed || 0), 0);
    const totalMutants = values.reduce((sum, v) => sum + (v.total || 0), 0);
    
    return totalMutants > 0 ? (totalKilled / totalMutants) * 100 : 0;
  }
}

// ============================================================================
// Threshold Validator
// ============================================================================

export class MutationThresholdValidator {
  constructor(thresholds = CONFIG.thresholds, categories = CONFIG.moduleCategories) {
    this.thresholds = thresholds;
    this.categories = categories;
  }

  /**
   * Validate all scores against thresholds
   */
  validate(scoresByFile) {
    const results = {
      passed: true,
      violations: [],
      warnings: [],
      byCategory: {
        critical: { passed: true, modules: [] },
        high: { passed: true, modules: [] },
        standard: { passed: true, modules: [] },
      },
    };

    Object.entries(scoresByFile).forEach(([filePath, scoreData]) => {
      const moduleName = this.extractModuleName(filePath);
      const category = this.getModuleCategory(moduleName);
      const threshold = this.thresholds[category];
      const score = scoreData.score;

      const moduleResult = {
        module: moduleName,
        file: filePath,
        score,
        threshold,
        category,
        passed: score >= threshold,
      };

      results.byCategory[category].modules.push(moduleResult);

      if (score < threshold) {
        results.byCategory[category].passed = false;
        
        if (score < this.thresholds.break) {
          results.passed = false;
          results.violations.push({
            ...moduleResult,
            severity: 'error',
            message: `${moduleName} mutation score (${score.toFixed(1)}%) is below break threshold (${this.thresholds.break}%)`,
          });
        } else {
          results.warnings.push({
            ...moduleResult,
            severity: 'warning',
            message: `${moduleName} mutation score (${score.toFixed(1)}%) is below ${category} threshold (${threshold}%)`,
          });
        }
      }
    });

    return results;
  }

  extractModuleName(filePath) {
    const basename = path.basename(filePath, '.js');
    return basename;
  }

  getModuleCategory(moduleName) {
    for (const [category, modules] of Object.entries(this.categories)) {
      if (modules.includes(moduleName)) {
        return category;
      }
    }
    return 'standard';
  }
}

// ============================================================================
// Report Generator
// ============================================================================

export class MutationReportGenerator {
  constructor(calculator, baseline, validator) {
    this.calculator = calculator;
    this.baseline = baseline;
    this.validator = validator;
  }

  /**
   * Generate comprehensive mutation testing report
   */
  generateReport() {
    const scoresByFile = this.calculator.getScoreByFile();
    const validation = this.validator.validate(scoresByFile);
    const baselineComparison = this.baseline.compareWithBaseline(scoresByFile);
    const survivors = this.calculator.getSurvivingMutants();

    return {
      summary: {
        overallScore: this.calculator.getOverallScore(),
        mutantCounts: this.calculator.getMutantCounts(),
        passedValidation: validation.passed,
        violations: validation.violations.length,
        warnings: validation.warnings.length,
      },
      scoresByFile,
      validation,
      baselineComparison,
      topSurvivors: survivors.slice(0, 20), // Top 20 survivors to fix
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport() {
    const report = this.generateReport();
    
    let md = `# Mutation Testing Report\n\n`;
    md += `**Generated:** ${report.generatedAt}\n\n`;
    
    // Summary
    md += `## Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Overall Score | ${report.summary.overallScore.toFixed(1)}% |\n`;
    md += `| Killed Mutants | ${report.summary.mutantCounts.killed} |\n`;
    md += `| Survived Mutants | ${report.summary.mutantCounts.survived} |\n`;
    md += `| No Coverage | ${report.summary.mutantCounts.noCoverage} |\n`;
    md += `| Validation | ${report.summary.passedValidation ? '✅ PASSED' : '❌ FAILED'} |\n\n`;
    
    // Baseline comparison
    if (report.baselineComparison.hasBaseline) {
      md += `## Baseline Comparison\n\n`;
      md += `**Baseline Date:** ${report.baselineComparison.baselineDate}\n`;
      md += `**Overall Change:** ${report.baselineComparison.overallDiff > 0 ? '+' : ''}${report.baselineComparison.overallDiff.toFixed(1)}%\n\n`;
      
      if (report.baselineComparison.regressions.length > 0) {
        md += `### ⚠️ Regressions\n\n`;
        report.baselineComparison.regressions.forEach(r => {
          md += `- **${r.file}**: ${r.baselineScore.toFixed(1)}% → ${r.currentScore.toFixed(1)}% (${r.diff.toFixed(1)}%)\n`;
        });
        md += '\n';
      }
    }
    
    // Violations
    if (report.validation.violations.length > 0) {
      md += `## ❌ Threshold Violations\n\n`;
      report.validation.violations.forEach(v => {
        md += `- **${v.module}** (${v.category}): ${v.score.toFixed(1)}% < ${v.threshold}%\n`;
      });
      md += '\n';
    }
    
    // Top survivors
    md += `## Top Surviving Mutants to Fix\n\n`;
    report.topSurvivors.forEach((s, i) => {
      md += `${i + 1}. **${s.file}:${s.line}** - ${s.mutatorName}: ${s.description || s.replacement}\n`;
    });
    
    return md;
  }

  /**
   * Save reports to disk
   */
  async saveReports(reportsDir = CONFIG.reportsDir) {
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const report = this.generateReport();
    const markdownReport = this.generateMarkdownReport();

    // Save JSON report
    fs.writeFileSync(
      path.join(reportsDir, 'mutation-analysis.json'),
      JSON.stringify(report, null, 2)
    );

    // Save markdown report
    fs.writeFileSync(
      path.join(reportsDir, 'mutation-analysis.md'),
      markdownReport
    );

    return { report, markdownReport };
  }
}

// ============================================================================
// Custom Mutant Patterns for Security Code
// ============================================================================

export const SecurityMutationPatterns = {
  /**
   * Patterns that indicate security-critical mutations
   */
  criticalPatterns: [
    // Authentication bypass
    { pattern: /auth.*===.*true/i, severity: 'critical', description: 'Authentication check bypass' },
    { pattern: /role.*===|!==|includes/i, severity: 'critical', description: 'Role verification bypass' },
    { pattern: /token.*verify|validate/i, severity: 'critical', description: 'Token validation bypass' },
    
    // Input validation bypass
    { pattern: /sanitize|escape|validate/i, severity: 'high', description: 'Input validation bypass' },
    { pattern: /xss|injection|sql/i, severity: 'critical', description: 'Injection protection bypass' },
    
    // Cryptographic weaknesses
    { pattern: /encrypt|decrypt|hash/i, severity: 'critical', description: 'Cryptographic operation mutation' },
    { pattern: /secret|key|salt/i, severity: 'critical', description: 'Secret handling mutation' },
    
    // Rate limiting
    { pattern: /limit|throttle|rate/i, severity: 'high', description: 'Rate limiting bypass' },
    
    // Session security
    { pattern: /session.*secure|httpOnly|sameSite/i, severity: 'high', description: 'Session security mutation' },
  ],

  /**
   * Analyze surviving mutants for security implications
   */
  analyzeSurvivors(survivors) {
    return survivors.map(survivor => {
      const analysis = {
        ...survivor,
        securityCritical: false,
        severity: 'low',
        securityImplications: [],
      };

      this.criticalPatterns.forEach(pattern => {
        const context = survivor.description || survivor.replacement || '';
        if (pattern.pattern.test(context) || pattern.pattern.test(survivor.file)) {
          analysis.securityCritical = true;
          if (pattern.severity === 'critical' || 
              (pattern.severity === 'high' && analysis.severity !== 'critical')) {
            analysis.severity = pattern.severity;
          }
          analysis.securityImplications.push(pattern.description);
        }
      });

      return analysis;
    });
  },
};

// ============================================================================
// CI/CD Integration Helpers
// ============================================================================

export const CIIntegration = {
  /**
   * Check if mutation testing should block CI
   */
  shouldBlockCI(report) {
    return !report.summary.passedValidation || 
           report.baselineComparison.regressions?.length > 0;
  },

  /**
   * Generate GitHub Actions annotation format
   */
  generateGitHubAnnotations(validation) {
    const annotations = [];

    validation.violations.forEach(v => {
      annotations.push({
        file: v.file,
        line: 1,
        column: 1,
        type: 'error',
        message: v.message,
      });
    });

    validation.warnings.forEach(w => {
      annotations.push({
        file: w.file,
        line: 1,
        column: 1,
        type: 'warning',
        message: w.message,
      });
    });

    return annotations;
  },

  /**
   * Exit with appropriate code for CI
   */
  getExitCode(report) {
    if (!report.summary.passedValidation) return 1;
    if (report.baselineComparison.regressions?.length > 0) return 1;
    return 0;
  },
};

// ============================================================================
// Main Runner
// ============================================================================

export async function runMutationAnalysis(reportPath) {
  console.log('🧬 Mutation Testing Analysis');
  console.log('=' .repeat(50));

  // Load Stryker report
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ Report not found: ${reportPath}`);
    console.log('Run: npx stryker run --reporters json');
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  // Initialize components
  const calculator = new MutationScoreCalculator(report);
  const baseline = new MutationBaseline();
  const validator = new MutationThresholdValidator();
  const reportGenerator = new MutationReportGenerator(calculator, baseline, validator);

  // Generate and save reports
  const { report: analysisReport, markdownReport } = await reportGenerator.saveReports();

  // Print summary
  console.log(`\n📊 Overall Mutation Score: ${analysisReport.summary.overallScore.toFixed(1)}%`);
  console.log(`   Killed: ${analysisReport.summary.mutantCounts.killed}`);
  console.log(`   Survived: ${analysisReport.summary.mutantCounts.survived}`);
  console.log(`   No Coverage: ${analysisReport.summary.mutantCounts.noCoverage}`);

  // Print validation result
  if (analysisReport.summary.passedValidation) {
    console.log('\n✅ All thresholds passed!');
  } else {
    console.log('\n❌ Threshold violations detected:');
    analysisReport.validation.violations.forEach(v => {
      console.log(`   - ${v.message}`);
    });
  }

  // Analyze security-critical survivors
  const analyzedSurvivors = SecurityMutationPatterns.analyzeSurvivors(
    analysisReport.topSurvivors
  );
  const criticalSurvivors = analyzedSurvivors.filter(s => s.securityCritical);
  
  if (criticalSurvivors.length > 0) {
    console.log(`\n⚠️ Security-Critical Surviving Mutants: ${criticalSurvivors.length}`);
    criticalSurvivors.forEach(s => {
      console.log(`   - ${s.file}:${s.line} [${s.severity}]`);
    });
  }

  return {
    report: analysisReport,
    exitCode: CIIntegration.getExitCode(analysisReport),
  };
}

export default {
  MutationScoreCalculator,
  MutationBaseline,
  MutationThresholdValidator,
  MutationReportGenerator,
  SecurityMutationPatterns,
  CIIntegration,
  runMutationAnalysis,
};
