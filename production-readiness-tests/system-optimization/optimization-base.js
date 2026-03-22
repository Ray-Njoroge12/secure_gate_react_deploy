const fs = require('fs').promises;
const path = require('path');

class OptimizationBase {
  constructor(config = {}) {
    this.config = {
      projectRoot: config.projectRoot || process.cwd(),
      excludePatterns: config.excludePatterns || [
        'node_modules',
        '.git',
        'dist',
        'build',
        'coverage',
      ],
      ...config,
    };
  }

  isExcluded(name) {
    return this.config.excludePatterns.some((pattern) => name.includes(pattern));
  }

  isTestFile(file) {
    return /\.(test|spec)\.(js|jsx|ts|tsx)$/.test(file) || file.includes('__tests__');
  }

  async getAllFiles(dir, files = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!this.isExcluded(entry.name)) {
          await this.getAllFiles(fullPath, files);
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (Array.isArray(this.config.includeExtensions) && this.config.includeExtensions.length > 0) {
        if (this.config.includeExtensions.includes(path.extname(entry.name))) {
          files.push(fullPath);
        }
        continue;
      }

      files.push(fullPath);
    }

    return files;
  }

  async findPackageFiles() {
    const files = await this.getAllFiles(this.config.projectRoot);
    return files.filter((file) => path.basename(file) === 'package.json');
  }
}

module.exports = OptimizationBase;