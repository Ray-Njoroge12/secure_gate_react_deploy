// Component Library Auditor
// Scans for inconsistencies in UI component usage

const fs = require('fs').promises;
const path = require('path');

class ComponentLibraryAuditor {
    constructor(options = {}) {
        this.projectRoot = options.projectRoot || path.resolve(__dirname, '../../secure-gate-access/client/src');
        this.issues = [];
    }

    async validate() {
        const files = await this.getFiles(this.projectRoot);
        const elementAnalysis = {
            rawButtons: 0,
            rawInputs: 0,
            customButtons: 0,
            customInputs: 0
        };

        for (const file of files) {
            const content = await fs.readFile(file, 'utf-8');
            
            // Naive regex matching for JSX elements
            const rawButtonMatches = (content.match(/<button/g) || []).length;
            const customButtonMatches = (content.match(/<Button/g) || []).length;
            
            const rawInputMatches = (content.match(/<input/g) || []).length;
            const customInputMatches = (content.match(/<Input/g) || []).length; // Assuming Input component exists

            elementAnalysis.rawButtons += rawButtonMatches;
            elementAnalysis.customButtons += customButtonMatches;
            elementAnalysis.rawInputs += rawInputMatches;
            elementAnalysis.customInputs += customInputMatches;

            if (rawButtonMatches > 0 && !file.includes('/ui/') && !file.includes('test')) {
                this.issues.push({
                    file: path.relative(this.projectRoot, file),
                    type: 'raw-element',
                    message: `Found ${rawButtonMatches} raw <button> tags. Prefer using the <Button> component from the design system.`
                });
            }
        }

        return {
            success: this.issues.length < 20, // Allow some, but warn
            metrics: elementAnalysis,
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
                if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
                    results.push(filePath);
                }
            }
        }
        return results;
    }
}

module.exports = ComponentLibraryAuditor;
