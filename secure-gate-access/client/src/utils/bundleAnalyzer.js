/**
 * Bundle analyzer utility for monitoring and optimizing bundle size
 */

/**
 * Analyze bundle composition and provide optimization recommendations
 * @param {Object} bundleData - Bundle analysis data
 * @returns {Object} Analysis results and recommendations
 */
export const analyzeBundle = (bundleData) => {
  const analysis = {
    summary: {
      totalSize: 0,
      totalGzippedSize: 0,
      chunkCount: 0,
      moduleCount: 0
    },
    chunks: [],
    modules: [],
    recommendations: [],
    warnings: []
  };

  // Analyze chunks
  if (bundleData.chunks) {
    bundleData.chunks.forEach(chunk => {
      const chunkInfo = {
        name: chunk.name,
        size: chunk.size,
        gzippedSize: chunk.gzippedSize,
        modules: chunk.modules?.length || 0,
        isInitial: chunk.isInitial,
        isEntry: chunk.isEntry
      };

      analysis.chunks.push(chunkInfo);
      analysis.summary.totalSize += chunk.size;
      analysis.summary.totalGzippedSize += chunk.gzippedSize;
      analysis.summary.chunkCount++;
    });
  }

  // Analyze modules
  if (bundleData.modules) {
    bundleData.modules.forEach(module => {
      const moduleInfo = {
        name: module.name,
        size: module.size,
        gzippedSize: module.gzippedSize,
        chunks: module.chunks,
        reasons: module.reasons
      };

      analysis.modules.push(moduleInfo);
      analysis.summary.moduleCount++;
    });
  }

  // Sort modules by size (largest first)
  analysis.modules.sort((a, b) => b.size - a.size);

  // Generate recommendations
  generateRecommendations(analysis);

  return analysis;
};

/**
 * Generate optimization recommendations based on bundle analysis
 * @param {Object} analysis - Bundle analysis object
 */
const generateRecommendations = (analysis) => {
  const { summary, modules, chunks } = analysis;

  // Check total bundle size
  if (summary.totalGzippedSize > 500000) { // 500KB
    analysis.warnings.push({
      type: 'bundle_size',
      message: 'Bundle size is large (>500KB gzipped). Consider implementing code splitting.',
      severity: 'high'
    });
  }

  // Check for large modules
  const largeModules = modules.filter(module => module.size > 100000); // 100KB
  if (largeModules.length > 0) {
    analysis.recommendations.push({
      type: 'large_modules',
      message: `Found ${largeModules.length} large modules (>100KB). Consider splitting them.`,
      modules: largeModules.map(m => m.name),
      severity: 'medium'
    });
  }

  // Check for duplicate modules
  const moduleNames = modules.map(m => m.name);
  const duplicates = moduleNames.filter((name, index) => moduleNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    analysis.warnings.push({
      type: 'duplicate_modules',
      message: 'Found duplicate modules. This increases bundle size unnecessarily.',
      modules: [...new Set(duplicates)],
      severity: 'medium'
    });
  }

  // Check for unused modules
  const unusedModules = modules.filter(module => 
    module.reasons && module.reasons.length === 0
  );
  if (unusedModules.length > 0) {
    analysis.recommendations.push({
      type: 'unused_modules',
      message: `Found ${unusedModules.length} potentially unused modules. Consider removing them.`,
      modules: unusedModules.map(m => m.name),
      severity: 'low'
    });
  }

  // Check chunk distribution
  const initialChunks = chunks.filter(chunk => chunk.isInitial);
  if (initialChunks.length > 1) {
    analysis.recommendations.push({
      type: 'chunk_distribution',
      message: 'Multiple initial chunks detected. Consider consolidating for better loading performance.',
      severity: 'medium'
    });
  }

  // General recommendations
  analysis.recommendations.push({
    type: 'general',
    message: 'Use dynamic imports for non-critical components',
    severity: 'low'
  });

  analysis.recommendations.push({
    type: 'general',
    message: 'Implement tree shaking to eliminate unused code',
    severity: 'low'
  });

  analysis.recommendations.push({
    type: 'general',
    message: 'Consider using smaller alternative libraries where possible',
    severity: 'low'
  });
};

/**
 * Generate bundle optimization report
 * @param {Object} analysis - Bundle analysis object
 * @returns {string} Formatted report
 */
export const generateReport = (analysis) => {
  const { summary, recommendations, warnings } = analysis;

  let report = '# Bundle Analysis Report\n\n';
  
  // Summary
  report += '## Summary\n';
  report += `- Total Size: ${formatBytes(summary.totalSize)} (${formatBytes(summary.totalGzippedSize)} gzipped)\n`;
  report += `- Chunks: ${summary.chunkCount}\n`;
  report += `- Modules: ${summary.moduleCount}\n\n`;

  // Warnings
  if (warnings.length > 0) {
    report += '## Warnings\n';
    warnings.forEach(warning => {
      report += `- **${warning.type}**: ${warning.message}\n`;
    });
    report += '\n';
  }

  // Recommendations
  if (recommendations.length > 0) {
    report += '## Recommendations\n';
    recommendations.forEach(rec => {
      report += `- **${rec.type}**: ${rec.message}\n`;
      if (rec.modules) {
        report += `  - Affected modules: ${rec.modules.join(', ')}\n`;
      }
    });
    report += '\n';
  }

  // Top 10 largest modules
  report += '## Top 10 Largest Modules\n';
  analysis.modules.slice(0, 10).forEach((module, index) => {
    report += `${index + 1}. ${module.name}: ${formatBytes(module.size)} (${formatBytes(module.gzippedSize)} gzipped)\n`;
  });

  return report;
};

/**
 * Format bytes to human readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Monitor bundle size in real-time during development
 * @param {Object} options - Monitoring options
 * @returns {Object} Monitoring utilities
 */
export const createBundleMonitor = (options = {}) => {
  const {
    threshold = 500000, // 500KB
    onThresholdExceeded = null,
    checkInterval = 30000 // 30 seconds
  } = options;

  let isMonitoring = false;
  let intervalId = null;

  const startMonitoring = () => {
    if (isMonitoring) return;

    isMonitoring = true;
    intervalId = setInterval(() => {
      // This would typically check actual bundle size
      // For now, we'll simulate with a mock check
      const mockBundleSize = Math.random() * 1000000; // Random size for demo
      
      if (mockBundleSize > threshold && onThresholdExceeded) {
        onThresholdExceeded({
          size: mockBundleSize,
          threshold,
          timestamp: new Date()
        });
      }
    }, checkInterval);
  };

  const stopMonitoring = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    isMonitoring = false;
  };

  return {
    startMonitoring,
    stopMonitoring,
    isMonitoring: () => isMonitoring
  };
};

/**
 * Bundle size optimization utilities
 */
export const bundleOptimizer = {
  /**
   * Calculate potential savings from code splitting
   * @param {Array} modules - Array of module objects
   * @returns {Object} Potential savings analysis
   */
  calculateCodeSplittingSavings: (modules) => {
    const savings = {
      potentialSavings: 0,
      recommendedSplits: [],
      estimatedLoadTimeReduction: 0
    };

    // Identify large modules that could be split
    const largeModules = modules.filter(module => module.size > 50000); // 50KB
    
    largeModules.forEach(module => {
      const potentialSavings = module.size * 0.3; // Assume 30% reduction
      savings.potentialSavings += potentialSavings;
      savings.recommendedSplits.push({
        module: module.name,
        currentSize: module.size,
        potentialSavings
      });
    });

    // Estimate load time reduction (rough calculation)
    savings.estimatedLoadTimeReduction = savings.potentialSavings / 1000000 * 100; // ms per MB

    return savings;
  },

  /**
   * Analyze dependency usage
   * @param {Array} modules - Array of module objects
   * @returns {Object} Dependency analysis
   */
  analyzeDependencies: (modules) => {
    const dependencies = {};
    const unusedDependencies = [];

    modules.forEach(module => {
      if (module.reasons) {
        module.reasons.forEach(reason => {
          if (reason.type === 'cjs require') {
            const dep = reason.module;
            if (!dependencies[dep]) {
              dependencies[dep] = { count: 0, modules: [] };
            }
            dependencies[dep].count++;
            dependencies[dep].modules.push(module.name);
          }
        });
      }
    });

    // Find potentially unused dependencies
    Object.entries(dependencies).forEach(([dep, info]) => {
      if (info.count === 1) {
        unusedDependencies.push({
          dependency: dep,
          usedBy: info.modules[0]
        });
      }
    });

    return {
      dependencies,
      unusedDependencies,
      totalDependencies: Object.keys(dependencies).length
    };
  }
};

export default {
  analyzeBundle,
  generateReport,
  createBundleMonitor,
  bundleOptimizer
};