// Static Accessibility Validator
// checks for common accessibility issues without running the app (Static Analysis)

const fs = require('fs').promises;
const path = require('path');

class StaticAccessibilityValidator {
    constructor(options = {}) {
        this.projectRoot = options.projectRoot || path.resolve(__dirname, '../../secure-gate-access/client/src');
        this.issues = [];
    }

    async validate() {
        const files = await this.getFiles(this.projectRoot);
        const stats = {
            imagesWithoutAlt: 0,
            buttonsWithoutLabel: 0, // Simplified check
            inputsWithoutLabel: 0,   // Simplified check
            totalImages: 0
        };

        for (const file of files) {
            // Skip test files for all checks
            if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) continue;

            const content = await fs.readFile(file, 'utf-8');
            
            // 1. Check images for alt text
            // Naive Regex is okay for simple attributes, but keeping consistent
            const imgRegex = /<img\s+[^>]*>/g;
            let match;
            while ((match = imgRegex.exec(content)) !== null) {
                stats.totalImages++;
                // Handle split lines or extra spaces
                if (!match[0].includes('alt=')) {
                    this.issues.push({
                        file: path.relative(this.projectRoot, file),
                        type: 'a11y-img-alt',
                        message: 'Image tag missing alt attribute.'
                    });
                    stats.imagesWithoutAlt++;
                }
            }

            // 2. Check for click handlers on non-interactive elements using a smarter parser
            // Find all <div ... starts
            let searchIndex = 0;
            while (true) {
                const divStart = content.indexOf('<div', searchIndex);
                if (divStart === -1) break;

                // Find the closing > respecting {} depth
                let tagEnd = -1;
                let depth = 0;
                let inString = false;
                let stringChar = '';
                
                for (let i = divStart + 4; i < content.length; i++) {
                    const char = content[i];
                    if (inString) {
                        if (char === stringChar && content[i-1] !== '\\') {
                            inString = false;
                        }
                    } else {
                        if (char === '"' || char === "'") {
                            inString = true;
                            stringChar = char;
                        } else if (char === '{') {
                            depth++;
                        } else if (char === '}') {
                            if (depth > 0) depth--;
                        } else if (char === '>' && depth === 0) {
                            tagEnd = i;
                            break;
                        }
                    }
                }

                if (tagEnd !== -1) {
                    const divTag = content.substring(divStart, tagEnd + 1);
                    if (divTag.includes('onClick=')) {
                        // Check for role
                        const hasRole = divTag.includes('role="button"') || 
                                      divTag.includes('role="presentation"') ||
                                      divTag.includes('role="option"') ||
                                      divTag.includes('role="menuitem"') ||
                                      divTag.includes('role="tab"') ||
                                      divTag.includes('role="link"') ||
                                      divTag.includes('role="listbox"') ||
                                      divTag.includes('role="dialog"') ||
                                      divTag.includes('role="alertdialog"') ||
                                      divTag.includes('role="document"') ||
                                      divTag.includes('role={'); // Allow dynamic roles
                        
                        if (!hasRole) {
                             this.issues.push({
                                file: path.relative(this.projectRoot, file),
                                type: 'a11y-click-events',
                                message: 'div with onClick handler missing role="button".'
                            });
                        }
                    }
                    searchIndex = tagEnd + 1;
                } else {
                    // Could not find end of tag (malformed or cut off), skip
                    searchIndex = divStart + 4;
                }
            }
        }

        return {
            success: this.issues.length === 0,
            metrics: stats,
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

module.exports = StaticAccessibilityValidator;
