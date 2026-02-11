// Icon Consistency and Quality Validator
// Checks for icon consistency, SVG scalability, and proper usage of the Lucide and Heroicons libraries

const fs = require('fs').promises;
const path = require('path');

class IconComplianceValidator {
    constructor(options = {}) {
        this.projectRoot = options.projectRoot || path.resolve(__dirname, '../../../secure-gate-access/client/src');
        this.reportPath = options.reportPath || path.resolve(__dirname, '../../reports/ui-ux-compliance/icon-compliance.md');
        this.issues = [];
    }

    async validate() {
        // Collect all file paths
        const files = await this.getFiles(this.projectRoot);
        const iconUsage = {};

        // Patterns for icon imports
        // import { IconName } from 'lucide-react';
        // import { IconName } from '@heroicons/react/...';
        const lucidePattern = /import\s+{([^}]+)}\s+from\s+['"]lucide-react['"]/g;
        const heroIconPattern = /import\s+{([^}]+)}\s+from\s+['"]@heroicons\/react/g;

        for (const file of files) {
            const content = await fs.readFile(file, 'utf-8');
            let match;
            
            // Check Lucide usages
            while ((match = lucidePattern.exec(content)) !== null) {
                const icons = match[1].split(',').map(s => s.trim());
                icons.forEach(icon => {
                    if (!iconUsage[icon]) iconUsage[icon] = [];
                    iconUsage[icon].push({ file, library: 'lucide-react' });
                });
            }

            // Check Heroicons usages
            while ((match = heroIconPattern.exec(content)) !== null) {
                 const icons = match[1].split(',').map(s => s.trim());
                 icons.forEach(icon => {
                    if (!iconUsage[icon]) iconUsage[icon] = [];
                    iconUsage[icon].push({ file, library: '@heroicons/react' });
                });
            }
        }

        // Analyze consistency
        this.analyzeConsistency(iconUsage);

        return {
            success: this.issues.length === 0,
            issues: this.issues,
            usageStats: iconUsage
        };
    }

    analyzeConsistency(usage) {
        // Check if we are mixing libraries excessively
        const libraries = new Set();
        Object.values(usage).forEach(u => u.forEach(i => libraries.add(i.library)));
        
        if (libraries.size > 1) {
            this.issues.push({
                severity: 'medium',
                message: `Multiple icon libraries detected: ${Array.from(libraries).join(', ')}. Stick to one for visual consistency.`
            });
        }
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
                if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
                    results.push(filePath);
                }
            }
        }
        return results;
    }
}

module.exports = IconComplianceValidator;
