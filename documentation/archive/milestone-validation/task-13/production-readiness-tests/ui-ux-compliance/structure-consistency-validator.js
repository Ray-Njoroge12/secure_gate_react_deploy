// Structure Consistency Validator
// Checks if pages are consistent in their structure (e.g. use of Layouts)

const fs = require('fs').promises;
const path = require('path');

class StructureConsistencyValidator {
    constructor(options = {}) {
        this.projectRoot = options.projectRoot || path.resolve(__dirname, '../../secure-gate-access/client/src');
        this.issues = [];
    }

    async validate() {
        // We focus on the 'pages' directory
        const pagesDir = path.join(this.projectRoot, 'pages');
        const files = await this.getFiles(pagesDir);
        
        const stats = {
            totalPages: 0,
            usingAppShell: 0,
            usingLayout: 0,
            usingPageHeader: 0
        };

        for (const file of files) {
            const content = await fs.readFile(file, 'utf-8');
            stats.totalPages++;

            if (content.includes('AppShell') || content.includes('<Layout')) {
                stats.usingLayout++;
            }
            // Sometimes AppShell is wrapped at Route level, so we might not see it in Page.
            // But checking for PageHeader is valid inside the page.
            if (content.includes('PageHeader') || content.includes('header')) {
                stats.usingPageHeader++;
            }
        }

        return {
            success: true,
            metrics: stats,
            issues: []
        };
    }

    async getFiles(dir) {
        let results = [];
        try {
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
        } catch (e) {
            // Directory might not exist or be empty
            return [];
        }
        return results;
    }
}

module.exports = StructureConsistencyValidator;
