// Theme Compliance Validator
// Ensures correct implementation of Dark/Light modes and usage of design tokens

const fs = require('fs').promises;
const path = require('path');

class ThemeComplianceValidator {
    constructor(options = {}) {
        this.projectRoot = options.projectRoot || path.resolve(__dirname, '../../secure-gate-access/client/src');
        this.issues = [];
    }

    async validate() {
        const files = await this.getFiles(this.projectRoot);
        const hardcodedColorPattern = /#[0-9A-Fa-f]{3,6}/g;
        // legitimate token file
        const tokenFile = path.resolve(this.projectRoot, 'design-system/tokens.js');

        const results = {
            totalFilesScanned: 0,
            hardcodedColors: [],
            darkModeClasses: 0,
            themeContextUsage: 0
        };

        for (const file of files) {
            if (file === tokenFile) continue; // Skip token definition itself

            const content = await fs.readFile(file, 'utf-8');
            results.totalFilesScanned++;

            // 1. Check for Hardcoded Colors
            let match;
            while ((match = hardcodedColorPattern.exec(content)) !== null) {
                // Ignore some common white/black if acceptable, but generally we want tokens
                if (!['#fff', '#ffffff', '#000', '#000000'].includes(match[0].toLowerCase())) {
                    this.issues.push({
                        file: path.relative(this.projectRoot, file),
                        type: 'hardcoded-color',
                        value: match[0],
                        message: `Avoid hardcoded color ${match[0]}. Use design tokens or Tailwind classes.`
                    });
                    results.hardcodedColors.push({ file: path.relative(this.projectRoot, file), color: match[0] });
                }
            }

            // 2. Check for Dark Mode usage (Tailwind)
            const darkModeMatches = (content.match(/dark:/g) || []).length;
            results.darkModeClasses += darkModeMatches;

            // 3. Check for ThemeContext usage
            if (content.includes('useTheme') || content.includes('ThemeContext')) {
                results.themeContextUsage++;
            }
        }

        return {
            success: this.issues.filter(i => i.type === 'hardcoded-color').length < 50, // Threshold
            metrics: results,
            issues: this.issues
        };
    }

    async getFiles(dir) {
        let results = [];
        const list = await fs.readdir(dir);
        for (const file of list) {
            const filePath = path.join(dir, file);
            const stat = await fs.stat(filePath);
            if (stat && stat.isDirectory()) {
                results = results.concat(await this.getFiles(filePath));
            } else {
                if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.css')) {
                    results.push(filePath);
                }
            }
        }
        return results;
    }
}

module.exports = ThemeComplianceValidator;
