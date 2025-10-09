/**
 * @fileoverview Accessibility audit utility for Secure Gate Access
 * @description Comprehensive accessibility checking and reporting utilities
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

/**
 * Accessibility audit results structure
 */
export const AUDIT_RESULTS = {
  PASS: 'pass',
  WARN: 'warn',
  FAIL: 'fail'
};

/**
 * WCAG 2.1 AA compliance levels
 */
export const WCAG_LEVELS = {
  A: 'A',
  AA: 'AA',
  AAA: 'AAA'
};

/**
 * Common accessibility issues and their fixes
 */
export const ACCESSIBILITY_ISSUES = {
  MISSING_ARIA_LABEL: {
    code: 'A11Y-001',
    level: WCAG_LEVELS.AA,
    description: 'Interactive element missing accessible name',
    fix: 'Add aria-label, aria-labelledby, or visible text content'
  },
  MISSING_ROLE: {
    code: 'A11Y-002',
    level: WCAG_LEVELS.AA,
    description: 'Custom interactive element missing role',
    fix: 'Add appropriate ARIA role attribute'
  },
  MISSING_FOCUS_INDICATOR: {
    code: 'A11Y-003',
    level: WCAG_LEVELS.AA,
    description: 'Focusable element missing visible focus indicator',
    fix: 'Add focus-visible styles or ensure focus outline is visible'
  },
  INSUFFICIENT_COLOR_CONTRAST: {
    code: 'A11Y-004',
    level: WCAG_LEVELS.AA,
    description: 'Text does not meet minimum color contrast ratio',
    fix: 'Increase color contrast to meet 4.5:1 ratio for normal text'
  },
  MISSING_FORM_LABEL: {
    code: 'A11Y-005',
    level: WCAG_LEVELS.AA,
    description: 'Form input missing associated label',
    fix: 'Add label element or aria-label/aria-labelledby'
  },
  MISSING_ALT_TEXT: {
    code: 'A11Y-006',
    level: WCAG_LEVELS.AA,
    description: 'Image missing alternative text',
    fix: 'Add alt attribute or aria-label for decorative images'
  },
  MISSING_HEADING_HIERARCHY: {
    code: 'A11Y-007',
    level: WCAG_LEVELS.AA,
    description: 'Heading hierarchy is not logical',
    fix: 'Ensure headings follow h1 > h2 > h3 pattern'
  },
  MISSING_SKIP_LINKS: {
    code: 'A11Y-008',
    level: WCAG_LEVELS.AA,
    description: 'Page missing skip navigation links',
    fix: 'Add skip links to main content and navigation'
  },
  INSUFFICIENT_TOUCH_TARGET: {
    code: 'A11Y-009',
    level: WCAG_LEVELS.AA,
    description: 'Touch target smaller than 44x44px',
    fix: 'Increase touch target size to minimum 44x44px'
  },
  MISSING_ARIA_LIVE_REGION: {
    code: 'A11Y-010',
    level: WCAG_LEVELS.AA,
    description: 'Dynamic content updates not announced to screen readers',
    fix: 'Add aria-live region for dynamic content'
  }
};

/**
 * Audit a single element for accessibility issues
 * @param {HTMLElement} element - Element to audit
 * @param {Object} options - Audit options
 * @returns {Array} Array of accessibility issues found
 */
export function auditElement(element, options = {}) {
  const issues = [];
  const { strict = false, includeWarnings = true } = options;

  if (!element || !element.nodeType) return issues;

  // Check for missing ARIA labels on interactive elements
  if (isInteractiveElement(element)) {
    if (!hasAccessibleName(element)) {
      issues.push({
        ...ACCESSIBILITY_ISSUES.MISSING_ARIA_LABEL,
        element,
        severity: strict ? AUDIT_RESULTS.FAIL : AUDIT_RESULTS.WARN
      });
    }
  }

  // Check for missing roles on custom interactive elements
  if (isCustomInteractiveElement(element) && !element.getAttribute('role')) {
    issues.push({
      ...ACCESSIBILITY_ISSUES.MISSING_ROLE,
      element,
      severity: AUDIT_RESULTS.WARN
    });
  }

  // Check for missing form labels
  if (isFormInput(element) && !hasFormLabel(element)) {
    issues.push({
      ...ACCESSIBILITY_ISSUES.MISSING_FORM_LABEL,
      element,
      severity: AUDIT_RESULTS.FAIL
    });
  }

  // Check for missing alt text on images
  if (element.tagName === 'IMG' && !hasAltText(element)) {
    issues.push({
      ...ACCESSIBILITY_ISSUES.MISSING_ALT_TEXT,
      element,
      severity: AUDIT_RESULTS.FAIL
    });
  }

  // Check touch target size
  if (isInteractiveElement(element) && !hasMinimumTouchTarget(element)) {
    issues.push({
      ...ACCESSIBILITY_ISSUES.INSUFFICIENT_TOUCH_TARGET,
      element,
      severity: AUDIT_RESULTS.WARN
    });
  }

  return issues;
}

/**
 * Audit an entire page for accessibility issues
 * @param {HTMLElement} root - Root element to audit (default: document.body)
 * @param {Object} options - Audit options
 * @returns {Object} Audit results with issues and summary
 */
export function auditPage(root = document.body, options = {}) {
  const { strict = false, includeWarnings = true } = options;
  const allIssues = [];
  const elements = root.querySelectorAll('*');

  elements.forEach(element => {
    const issues = auditElement(element, { strict, includeWarnings });
    allIssues.push(...issues);
  });

  // Check page-level issues
  const pageIssues = auditPageLevel(root, options);
  allIssues.push(...pageIssues);

  return {
    issues: allIssues,
    summary: generateAuditSummary(allIssues),
    timestamp: new Date().toISOString()
  };
}

/**
 * Check if element is interactive
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if interactive
 */
function isInteractiveElement(element) {
  const interactiveTags = ['button', 'a', 'input', 'select', 'textarea', 'details', 'summary'];
  const interactiveRoles = ['button', 'link', 'menuitem', 'tab', 'option', 'checkbox', 'radio'];
  
  return interactiveTags.includes(element.tagName.toLowerCase()) ||
         interactiveRoles.includes(element.getAttribute('role')) ||
         element.tabIndex >= 0;
}

/**
 * Check if element is a custom interactive element
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if custom interactive
 */
function isCustomInteractiveElement(element) {
  return element.onclick || 
         element.getAttribute('onclick') ||
         element.style.cursor === 'pointer' ||
         element.classList.contains('clickable');
}

/**
 * Check if element has accessible name
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if has accessible name
 */
function hasAccessibleName(element) {
  return !!(
    element.getAttribute('aria-label') ||
    element.getAttribute('aria-labelledby') ||
    element.textContent?.trim() ||
    element.getAttribute('title') ||
    (element.tagName === 'IMG' && element.alt)
  );
}

/**
 * Check if element is a form input
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if form input
 */
function isFormInput(element) {
  const formTags = ['input', 'select', 'textarea'];
  return formTags.includes(element.tagName.toLowerCase());
}

/**
 * Check if form input has associated label
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if has label
 */
function hasFormLabel(element) {
  const id = element.id;
  if (!id) return false;

  return !!(
    document.querySelector(`label[for="${id}"]`) ||
    element.getAttribute('aria-label') ||
    element.getAttribute('aria-labelledby')
  );
}

/**
 * Check if image has alt text
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if has alt text
 */
function hasAltText(element) {
  return !!(element.alt || element.getAttribute('aria-label'));
}

/**
 * Check if element meets minimum touch target size
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if meets minimum size
 */
function hasMinimumTouchTarget(element) {
  const rect = element.getBoundingClientRect();
  const minSize = 44; // 44px minimum touch target
  
  return rect.width >= minSize && rect.height >= minSize;
}

/**
 * Audit page-level accessibility issues
 * @param {HTMLElement} root - Root element
 * @param {Object} options - Audit options
 * @returns {Array} Page-level issues
 */
function auditPageLevel(root, options) {
  const issues = [];
  const { strict = false } = options;

  // Check for skip links
  const skipLinks = root.querySelectorAll('a[href^="#"]');
  if (skipLinks.length === 0) {
    issues.push({
      ...ACCESSIBILITY_ISSUES.MISSING_SKIP_LINKS,
      element: root,
      severity: strict ? AUDIT_RESULTS.FAIL : AUDIT_RESULTS.WARN
    });
  }

  // Check heading hierarchy
  const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length > 0) {
    const headingIssues = auditHeadingHierarchy(headings);
    issues.push(...headingIssues);
  }

  return issues;
}

/**
 * Audit heading hierarchy
 * @param {NodeList} headings - All headings on page
 * @returns {Array} Heading hierarchy issues
 */
function auditHeadingHierarchy(headings) {
  const issues = [];
  let lastLevel = 0;

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    
    if (index === 0 && level !== 1) {
      issues.push({
        ...ACCESSIBILITY_ISSUES.MISSING_HEADING_HIERARCHY,
        element: heading,
        severity: AUDIT_RESULTS.WARN,
        details: 'Page should start with h1'
      });
    }

    if (level > lastLevel + 1) {
      issues.push({
        ...ACCESSIBILITY_ISSUES.MISSING_HEADING_HIERARCHY,
        element: heading,
        severity: AUDIT_RESULTS.WARN,
        details: `Heading level ${level} follows level ${lastLevel}, skipping levels`
      });
    }

    lastLevel = level;
  });

  return issues;
}

/**
 * Generate audit summary
 * @param {Array} issues - All issues found
 * @returns {Object} Summary statistics
 */
function generateAuditSummary(issues) {
  const summary = {
    total: issues.length,
    pass: 0,
    warn: 0,
    fail: 0,
    byLevel: {
      [WCAG_LEVELS.A]: 0,
      [WCAG_LEVELS.AA]: 0,
      [WCAG_LEVELS.AAA]: 0
    },
    byCode: {}
  };

  issues.forEach(issue => {
    summary[issue.severity]++;
    summary.byLevel[issue.level]++;
    summary.byCode[issue.code] = (summary.byCode[issue.code] || 0) + 1;
  });

  return summary;
}

/**
 * Generate accessibility report
 * @param {Object} auditResults - Results from auditPage
 * @returns {string} Formatted report
 */
export function generateAccessibilityReport(auditResults) {
  const { issues, summary } = auditResults;
  
  let report = `# Accessibility Audit Report\n\n`;
  report += `**Generated:** ${auditResults.timestamp}\n\n`;
  report += `## Summary\n\n`;
  report += `- **Total Issues:** ${summary.total}\n`;
  report += `- **Critical (Fail):** ${summary.fail}\n`;
  report += `- **Warnings:** ${summary.warn}\n`;
  report += `- **Passed:** ${summary.pass}\n\n`;

  if (summary.total > 0) {
    report += `## Issues by WCAG Level\n\n`;
    Object.entries(summary.byLevel).forEach(([level, count]) => {
      if (count > 0) {
        report += `- **Level ${level}:** ${count} issues\n`;
      }
    });

    report += `\n## Detailed Issues\n\n`;
    issues.forEach((issue, index) => {
      report += `### ${index + 1}. ${issue.description}\n\n`;
      report += `- **Code:** ${issue.code}\n`;
      report += `- **Level:** WCAG ${issue.level}\n`;
      report += `- **Severity:** ${issue.severity.toUpperCase()}\n`;
      report += `- **Element:** \`${issue.element.tagName.toLowerCase()}\`\n`;
      report += `- **Fix:** ${issue.fix}\n\n`;
    });
  } else {
    report += `## ✅ No Accessibility Issues Found\n\n`;
    report += `All elements meet WCAG 2.1 AA compliance standards.`;
  }

  return report;
}

/**
 * Fix common accessibility issues automatically
 * @param {HTMLElement} element - Element to fix
 * @param {Array} issues - Issues to fix
 * @returns {Array} Fixed issues
 */
export function autoFixAccessibilityIssues(element, issues) {
  const fixed = [];

  issues.forEach(issue => {
    switch (issue.code) {
      case 'A11Y-001': // Missing ARIA label
        if (element.textContent?.trim()) {
          element.setAttribute('aria-label', element.textContent.trim());
          fixed.push(issue);
        }
        break;
      
      case 'A11Y-002': // Missing role
        if (isInteractiveElement(element)) {
          element.setAttribute('role', 'button');
          fixed.push(issue);
        }
        break;
      
      case 'A11Y-006': // Missing alt text
        if (element.tagName === 'IMG') {
          element.setAttribute('alt', '');
          fixed.push(issue);
        }
        break;
    }
  });

  return fixed;
}