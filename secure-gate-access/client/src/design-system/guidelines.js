/**
 * Design System Guidelines
 * 
 * Comprehensive guidelines for using the SecureGate design system,
 * including best practices, accessibility standards, and usage examples.
 */

import { tokens } from './tokens';

// Design Principles
export const designPrinciples = {
  consistency: {
    title: 'Consistency',
    description: 'Use consistent patterns, spacing, and visual elements throughout the application.',
    examples: [
      'Use the same button styles for similar actions',
      'Maintain consistent spacing between elements',
      'Apply the same color meanings across components',
    ],
  },
  
  accessibility: {
    title: 'Accessibility',
    description: 'Ensure all components are accessible to users with disabilities.',
    examples: [
      'Maintain WCAG 2.1 AA color contrast ratios',
      'Provide keyboard navigation support',
      'Include proper ARIA labels and roles',
      'Ensure touch targets meet minimum size requirements',
    ],
  },
  
  clarity: {
    title: 'Clarity',
    description: 'Make interfaces clear and easy to understand.',
    examples: [
      'Use clear, descriptive labels and text',
      'Provide helpful error messages',
      'Use appropriate visual hierarchy',
      'Avoid unnecessary complexity',
    ],
  },
  
  efficiency: {
    title: 'Efficiency',
    description: 'Help users complete tasks quickly and efficiently.',
    examples: [
      'Minimize the number of clicks required',
      'Provide keyboard shortcuts for power users',
      'Use progressive disclosure for complex forms',
      'Show loading states for long operations',
    ],
  },
  
  flexibility: {
    title: 'Flexibility',
    description: 'Design components that work across different contexts and screen sizes.',
    examples: [
      'Use responsive design principles',
      'Create reusable component variants',
      'Support different content lengths',
      'Adapt to different user preferences',
    ],
  },
};

// Color Usage Guidelines
export const colorGuidelines = {
  primary: {
    usage: 'Primary actions, links, and brand elements',
    examples: [
      'Submit buttons',
      'Active navigation items',
      'Brand logos and headers',
      'Success states',
    ],
    do: [
      'Use for the most important actions',
      'Maintain sufficient contrast with backgrounds',
      'Use consistently across the application',
    ],
    dont: [
      'Use for secondary or destructive actions',
      'Overuse - reserve for key interactions',
      'Use on backgrounds with insufficient contrast',
    ],
  },
  
  secondary: {
    usage: 'Secondary actions and supporting elements',
    examples: [
      'Cancel buttons',
      'Secondary navigation',
      'Borders and dividers',
      'Placeholder text',
    ],
    do: [
      'Use for less important actions',
      'Provide clear visual hierarchy',
      'Ensure adequate contrast ratios',
    ],
    dont: [
      'Use for primary actions',
      'Make text too light to read',
      'Use for critical information',
    ],
  },
  
  semantic: {
    success: {
      usage: 'Success states, confirmations, and positive feedback',
      examples: ['Success messages', 'Completed states', 'Valid form fields'],
    },
    warning: {
      usage: 'Warnings, cautions, and attention-grabbing elements',
      examples: ['Warning messages', 'Pending states', 'Caution indicators'],
    },
    error: {
      usage: 'Errors, failures, and destructive actions',
      examples: ['Error messages', 'Invalid form fields', 'Delete buttons'],
    },
    info: {
      usage: 'Informational content and neutral states',
      examples: ['Info messages', 'Help text', 'Neutral indicators'],
    },
  },
};

// Typography Guidelines
export const typographyGuidelines = {
  hierarchy: {
    h1: {
      usage: 'Page titles and main headings',
      fontSize: tokens.typography.fontSize['4xl'],
      fontWeight: tokens.typography.fontWeight.bold,
      lineHeight: tokens.typography.lineHeight.tight,
    },
    h2: {
      usage: 'Section headings',
      fontSize: tokens.typography.fontSize['3xl'],
      fontWeight: tokens.typography.fontWeight.semibold,
      lineHeight: tokens.typography.lineHeight.tight,
    },
    h3: {
      usage: 'Subsection headings',
      fontSize: tokens.typography.fontSize['2xl'],
      fontWeight: tokens.typography.fontWeight.semibold,
      lineHeight: tokens.typography.lineHeight.snug,
    },
    h4: {
      usage: 'Component headings',
      fontSize: tokens.typography.fontSize.xl,
      fontWeight: tokens.typography.fontWeight.medium,
      lineHeight: tokens.typography.lineHeight.snug,
    },
    body: {
      usage: 'Body text and general content',
      fontSize: tokens.typography.fontSize.base,
      fontWeight: tokens.typography.fontWeight.normal,
      lineHeight: tokens.typography.lineHeight.normal,
    },
    small: {
      usage: 'Captions, labels, and secondary text',
      fontSize: tokens.typography.fontSize.sm,
      fontWeight: tokens.typography.fontWeight.normal,
      lineHeight: tokens.typography.lineHeight.normal,
    },
  },
  
  bestPractices: [
    'Use consistent font sizes and weights',
    'Maintain proper line height for readability',
    'Limit the number of font weights used',
    'Ensure sufficient color contrast',
    'Use appropriate text alignment',
    'Consider text length and wrapping',
  ],
};

// Spacing Guidelines
export const spacingGuidelines = {
  scale: {
    description: 'Use the 4px base unit spacing scale for consistency',
    examples: [
      '4px (1) - Tight spacing between related elements',
      '8px (2) - Small spacing between form elements',
      '16px (4) - Standard spacing between components',
      '24px (6) - Large spacing between sections',
      '32px (8) - Extra large spacing for major sections',
    ],
  },
  
  patterns: {
    padding: {
      description: 'Use consistent padding patterns',
      examples: [
        'Cards: 16px (4) or 24px (6)',
        'Buttons: 12px 20px (3 5)',
        'Inputs: 12px 16px (3 4)',
        'Modals: 24px (6) or 32px (8)',
      ],
    },
    margins: {
      description: 'Use consistent margin patterns',
      examples: [
        'Between form elements: 16px (4)',
        'Between sections: 32px (8)',
        'Between major components: 48px (12)',
      ],
    },
  },
  
  responsive: {
    description: 'Adjust spacing for different screen sizes',
    examples: [
      'Mobile: Reduce padding by 25%',
      'Tablet: Use standard spacing',
      'Desktop: Increase spacing for better visual hierarchy',
    ],
  },
};

// Component Guidelines
export const componentGuidelines = {
  buttons: {
    hierarchy: {
      primary: 'Most important actions (Submit, Save, Continue)',
      secondary: 'Secondary actions (Cancel, Back, Edit)',
      danger: 'Destructive actions (Delete, Remove, Clear)',
      ghost: 'Subtle actions (Close, Dismiss, Skip)',
    },
    sizing: {
      sm: 'Compact spaces, dense interfaces',
      md: 'Standard size for most use cases',
      lg: 'Prominent actions, mobile interfaces',
      xl: 'Hero actions, call-to-action buttons',
    },
    states: {
      default: 'Normal state',
      hover: 'Mouse over state',
      active: 'Pressed/clicked state',
      focus: 'Keyboard focus state',
      disabled: 'Inactive state',
    },
  },
  
  forms: {
    layout: {
      description: 'Use consistent form layouts and spacing',
      examples: [
        'Stack form fields vertically',
        'Use consistent label positioning',
        'Group related fields together',
        'Provide clear visual hierarchy',
      ],
    },
    validation: {
      description: 'Provide clear validation feedback',
      examples: [
        'Show validation errors immediately',
        'Use consistent error styling',
        'Provide helpful error messages',
        'Indicate required fields clearly',
      ],
    },
  },
  
  navigation: {
    structure: {
      description: 'Use clear navigation structure',
      examples: [
        'Primary navigation in the sidebar',
        'Secondary actions in the topbar',
        'Breadcrumbs for deep navigation',
        'Consistent navigation patterns',
      ],
    },
    states: {
      description: 'Show clear navigation states',
      examples: [
        'Active page highlighting',
        'Hover states for interactive elements',
        'Disabled states for unavailable options',
        'Loading states for async operations',
      ],
    },
  },
};

// Accessibility Guidelines
export const accessibilityGuidelines = {
  colorContrast: {
    description: 'Maintain WCAG 2.1 AA color contrast ratios',
    requirements: [
      'Normal text: 4.5:1 contrast ratio',
      'Large text: 3:1 contrast ratio',
      'UI components: 3:1 contrast ratio',
    ],
    tools: [
      'Use browser dev tools to check contrast',
      'Test with color blindness simulators',
      'Verify with accessibility testing tools',
    ],
  },
  
  keyboardNavigation: {
    description: 'Ensure all interactive elements are keyboard accessible',
    requirements: [
      'All interactive elements must be focusable',
      'Focus order should be logical and predictable',
      'Provide visible focus indicators',
      'Support standard keyboard shortcuts',
    ],
    patterns: [
      'Tab to move between elements',
      'Enter/Space to activate buttons',
      'Arrow keys for menu navigation',
      'Escape to close modals/dropdowns',
    ],
  },
  
  screenReaders: {
    description: 'Provide proper information for screen readers',
    requirements: [
      'Use semantic HTML elements',
      'Provide descriptive labels and alt text',
      'Use ARIA attributes appropriately',
      'Ensure proper heading hierarchy',
    ],
    patterns: [
      'Use <button> for interactive elements',
      'Provide aria-label for icon buttons',
      'Use aria-describedby for help text',
      'Implement proper form labeling',
    ],
  },
  
  touchTargets: {
    description: 'Ensure touch targets meet minimum size requirements',
    requirements: [
      'Minimum 44px touch target size',
      'Recommended 48px for better usability',
      'Adequate spacing between touch targets',
    ],
    considerations: [
      'Test on actual mobile devices',
      'Consider thumb reach on larger screens',
      'Account for different hand sizes',
    ],
  },
};

// Responsive Design Guidelines
export const responsiveGuidelines = {
  breakpoints: {
    xs: '0px - 639px (Mobile)',
    sm: '640px - 767px (Large Mobile)',
    md: '768px - 1023px (Tablet)',
    lg: '1024px - 1279px (Desktop)',
    xl: '1280px+ (Large Desktop)',
  },
  
  mobileFirst: {
    description: 'Design for mobile first, then enhance for larger screens',
    approach: [
      'Start with mobile layout',
      'Add complexity for larger screens',
      'Use progressive enhancement',
      'Test on actual devices',
    ],
  },
  
  patterns: {
    navigation: {
      mobile: 'Hamburger menu or bottom navigation',
      tablet: 'Collapsible sidebar or top navigation',
      desktop: 'Full sidebar navigation',
    },
    forms: {
      mobile: 'Single column, full-width inputs',
      tablet: 'Two-column layout where appropriate',
      desktop: 'Multi-column layouts with proper spacing',
    },
    tables: {
      mobile: 'Card-based layout or horizontal scroll',
      tablet: 'Condensed table with priority columns',
      desktop: 'Full table with all columns visible',
    },
  },
};

// Performance Guidelines
export const performanceGuidelines = {
  images: {
    description: 'Optimize images for performance',
    bestPractices: [
      'Use appropriate image formats (WebP, AVIF)',
      'Implement lazy loading',
      'Provide multiple sizes for responsive images',
      'Use proper alt text for accessibility',
    ],
  },
  
  animations: {
    description: 'Use animations judiciously for performance',
    bestPractices: [
      'Prefer CSS animations over JavaScript',
      'Use transform and opacity for smooth animations',
      'Respect prefers-reduced-motion',
      'Keep animations under 300ms',
    ],
  },
  
  loading: {
    description: 'Provide appropriate loading states',
    patterns: [
      'Skeleton screens for content loading',
      'Progress indicators for long operations',
      'Optimistic updates where appropriate',
      'Error states with retry options',
    ],
  },
};

// Usage Examples
export const usageExamples = {
  button: {
    primary: `
      <button className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-3 rounded-md font-medium transition-colors">
        Submit
      </button>
    `,
    secondary: `
      <button className="bg-transparent hover:bg-slate-700 text-slate-300 border border-slate-600 px-5 py-3 rounded-md font-medium transition-colors">
        Cancel
      </button>
    `,
  },
  
  input: {
    basic: `
      <input 
        className="bg-slate-800 border border-slate-600 text-slate-50 px-4 py-3 rounded-md focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        placeholder="Enter your email"
      />
    `,
    withLabel: `
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">
          Email Address
        </label>
        <input 
          className="w-full bg-slate-800 border border-slate-600 text-slate-50 px-4 py-3 rounded-md focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          placeholder="Enter your email"
        />
      </div>
    `,
  },
  
  card: {
    basic: `
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-md">
        <h3 className="text-lg font-semibold text-slate-50 mb-2">Card Title</h3>
        <p className="text-slate-300">Card content goes here.</p>
      </div>
    `,
  },
};

// Export all guidelines
export const guidelines = {
  principles: designPrinciples,
  colors: colorGuidelines,
  typography: typographyGuidelines,
  spacing: spacingGuidelines,
  components: componentGuidelines,
  accessibility: accessibilityGuidelines,
  responsive: responsiveGuidelines,
  performance: performanceGuidelines,
  examples: usageExamples,
};

export default guidelines;




