import logger from './logger';
/**
 * Tailwind Migration Utility
 * 
 * Utility functions to help migrate custom CSS to Tailwind classes:
 * - CSS class mapping
 * - Component migration helpers
 * - Style conversion utilities
 * - Migration validation
 */

// CSS to Tailwind class mappings
export const cssToTailwindMap = {
  // Layout & Display
  'display: flex': 'flex',
  'display: grid': 'grid',
  'display: block': 'block',
  'display: inline': 'inline',
  'display: inline-block': 'inline-block',
  'display: none': 'hidden',
  'display: table': 'table',
  'display: table-cell': 'table-cell',
  
  // Flexbox
  'flex-direction: row': 'flex-row',
  'flex-direction: column': 'flex-col',
  'flex-wrap: wrap': 'flex-wrap',
  'justify-content: center': 'justify-center',
  'justify-content: flex-start': 'justify-start',
  'justify-content: flex-end': 'justify-end',
  'justify-content: space-between': 'justify-between',
  'justify-content: space-around': 'justify-around',
  'align-items: center': 'items-center',
  'align-items: flex-start': 'items-start',
  'align-items: flex-end': 'items-end',
  'align-items: stretch': 'items-stretch',
  'flex: 1': 'flex-1',
  'flex-grow: 1': 'flex-grow',
  'flex-shrink: 0': 'flex-shrink-0',
  
  // Grid
  'grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))': 'grid-responsive',
  'gap: 1rem': 'gap-4',
  'gap: 0.5rem': 'gap-2',
  'gap: 2rem': 'gap-8',
  
  // Spacing
  'margin: 0': 'm-0',
  'margin: auto': 'mx-auto',
  'margin-top: 1rem': 'mt-4',
  'margin-bottom: 1rem': 'mb-4',
  'margin-left: 1rem': 'ml-4',
  'margin-right: 1rem': 'mr-4',
  'padding: 1rem': 'p-4',
  'padding: 0.5rem': 'p-2',
  'padding: 2rem': 'p-8',
  'padding-top: 1rem': 'pt-4',
  'padding-bottom: 1rem': 'pb-4',
  'padding-left: 1rem': 'pl-4',
  'padding-right: 1rem': 'pr-4',
  
  // Colors (using design system colors)
  'background-color: #0f172a': 'bg-background-primary',
  'background-color: #1e293b': 'bg-background-secondary',
  'background-color: #334155': 'bg-background-tertiary',
  'background-color: #f8fafc': 'bg-background-inverse',
  'color: #f8fafc': 'text-text-primary',
  'color: #cbd5e1': 'text-text-secondary',
  'color: #94a3b8': 'text-text-tertiary',
  'color: #64748b': 'text-text-muted',
  'color: #475569': 'text-text-disabled',
  'border-color: #334155': 'border-border-primary',
  'border-color: #475569': 'border-border-secondary',
  'border-color: #10b981': 'border-border-focus',
  'border-color: #ef4444': 'border-border-error',
  
  // Typography
  'font-family: Inter': 'font-sans',
  'font-size: 0.75rem': 'text-xs',
  'font-size: 0.875rem': 'text-sm',
  'font-size: 1rem': 'text-base',
  'font-size: 1.125rem': 'text-lg',
  'font-size: 1.25rem': 'text-xl',
  'font-size: 1.5rem': 'text-2xl',
  'font-size: 1.875rem': 'text-3xl',
  'font-size: 2.25rem': 'text-4xl',
  'font-weight: 300': 'font-light',
  'font-weight: 400': 'font-normal',
  'font-weight: 500': 'font-medium',
  'font-weight: 600': 'font-semibold',
  'font-weight: 700': 'font-bold',
  'line-height: 1': 'leading-none',
  'line-height: 1.25': 'leading-tight',
  'line-height: 1.5': 'leading-normal',
  'line-height: 1.75': 'leading-relaxed',
  'text-align: center': 'text-center',
  'text-align: left': 'text-left',
  'text-align: right': 'text-right',
  'text-decoration: underline': 'underline',
  'text-decoration: none': 'no-underline',
  
  // Borders
  'border: 1px solid': 'border',
  'border: 2px solid': 'border-2',
  'border-radius: 4px': 'rounded-sm',
  'border-radius: 8px': 'rounded-md',
  'border-radius: 12px': 'rounded-lg',
  'border-radius: 16px': 'rounded-xl',
  'border-radius: 50%': 'rounded-full',
  
  // Shadows
  'box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)': 'shadow-sm',
  'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)': 'shadow-md',
  'box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)': 'shadow-lg',
  'box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)': 'shadow-xl',
  
  // Positioning
  'position: relative': 'relative',
  'position: absolute': 'absolute',
  'position: fixed': 'fixed',
  'position: sticky': 'sticky',
  'top: 0': 'top-0',
  'bottom: 0': 'bottom-0',
  'left: 0': 'left-0',
  'right: 0': 'right-0',
  'z-index: 10': 'z-10',
  'z-index: 20': 'z-20',
  'z-index: 30': 'z-30',
  'z-index: 40': 'z-40',
  'z-index: 50': 'z-50',
  
  // Sizing
  'width: 100%': 'w-full',
  'width: 50%': 'w-1/2',
  'width: 25%': 'w-1/4',
  'width: 75%': 'w-3/4',
  'height: 100%': 'h-full',
  'height: 100vh': 'h-screen',
  'min-height: 100vh': 'min-h-screen',
  'max-width: 1200px': 'max-w-7xl',
  'max-width: 1000px': 'max-w-6xl',
  'max-width: 800px': 'max-w-4xl',
  'max-width: 600px': 'max-w-2xl',
  'max-width: 400px': 'max-w-xl',
  
  // Overflow
  'overflow: hidden': 'overflow-hidden',
  'overflow: auto': 'overflow-auto',
  'overflow: scroll': 'overflow-scroll',
  'overflow-x: hidden': 'overflow-x-hidden',
  'overflow-y: auto': 'overflow-y-auto',
  
  // Cursor
  'cursor: pointer': 'cursor-pointer',
  'cursor: not-allowed': 'cursor-not-allowed',
  'cursor: default': 'cursor-default',
  
  // Opacity
  'opacity: 0': 'opacity-0',
  'opacity: 0.5': 'opacity-50',
  'opacity: 0.75': 'opacity-75',
  'opacity: 1': 'opacity-100',
  
  // Transforms
  'transform: translateX(-50%)': '-translate-x-1/2',
  'transform: translateY(-50%)': '-translate-y-1/2',
  'transform: scale(0.95)': 'scale-95',
  'transform: scale(1.05)': 'scale-105',
  
  // Transitions
  'transition: all 0.2s ease-in-out': 'transition-all duration-200 ease-in-out',
  'transition: opacity 0.3s ease-out': 'transition-opacity duration-300 ease-out',
  'transition: transform 0.2s ease-in-out': 'transition-transform duration-200 ease-in-out',
  
  // Animations
  'animation: fadeIn 0.3s ease-out': 'animate-fade-in',
  'animation: slideIn 0.2s ease-out': 'animate-slide-in',
  'animation: scaleIn 0.15s ease-out': 'animate-scale-in',
  'animation: pulse 1.5s ease-in-out infinite': 'animate-loading-pulse',
  
  // Custom Utilities
  'min-height: 44px': 'touch-target',
  'min-width: 44px': 'touch-target',
  'outline: 2px solid #10b981': 'focus-ring-brand',
  'outline-offset: 2px': 'focus-ring-brand',
  'text-wrap: balance': 'text-balance',
  'scrollbar-width: none': 'scrollbar-hide',
  'background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%)': 'gradient-bg',
};

// Component-specific migration patterns
export const componentMigrationPatterns = {
  // Button components
  button: {
    'btn-primary': 'bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md font-medium transition-colors',
    'btn-secondary': 'bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-md font-medium transition-colors',
    'btn-outline': 'border border-brand-600 text-brand-600 hover:bg-brand-600 hover:text-white px-4 py-2 rounded-md font-medium transition-colors',
    'btn-ghost': 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-md font-medium transition-colors',
    'btn-sm': 'px-3 py-1.5 text-sm',
    'btn-lg': 'px-6 py-3 text-lg',
  },
  
  // Card components
  card: {
    'card': 'bg-background-secondary border border-border-primary rounded-lg shadow-md',
    'card-header': 'px-6 py-4 border-b border-border-primary',
    'card-body': 'px-6 py-4',
    'card-footer': 'px-6 py-4 border-t border-border-primary',
  },
  
  // Form components
  form: {
    'form-group': 'mb-4',
    'form-label': 'block text-sm font-medium text-text-primary mb-2',
    'form-input': 'w-full px-3 py-2 border border-border-primary rounded-md bg-background-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
    'form-error': 'text-error-500 text-sm mt-1',
    'form-help': 'text-text-muted text-sm mt-1',
  },
  
  // Layout components
  layout: {
    'container': 'container-app',
    'sidebar': 'bg-background-secondary border-r border-border-primary',
    'main-content': 'flex-1 p-6',
    'header': 'bg-background-secondary border-b border-border-primary px-6 py-4',
  },
  
  // Navigation components
  navigation: {
    'nav': 'flex space-x-4',
    'nav-link': 'navlink text-text-secondary hover:text-text-primary px-3 py-2 rounded-md transition-colors',
    'nav-link-active': 'navlink text-brand-600 bg-brand-50 px-3 py-2 rounded-md',
    'breadcrumb': 'flex items-center space-x-2 text-sm text-text-muted',
  },
  
  // Table components
  table: {
    'table': 'w-full border-collapse',
    'table-header': 'bg-background-tertiary',
    'table-cell': 'px-4 py-3 border-b border-border-primary text-left',
    'table-row': 'hover:bg-background-tertiary transition-colors',
  },
  
  // Modal components
  modal: {
    'modal-overlay': 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal',
    'modal-content': 'bg-background-secondary rounded-lg shadow-xl max-w-md w-full mx-4',
    'modal-header': 'px-6 py-4 border-b border-border-primary',
    'modal-body': 'px-6 py-4',
    'modal-footer': 'px-6 py-4 border-t border-border-primary flex justify-end space-x-2',
  },
};

// Utility functions for migration
export const migrationUtils = {
  // Convert CSS properties to Tailwind classes
  convertCssToTailwind: (cssProperties) => {
    const classes = [];
    
    Object.entries(cssProperties).forEach(([property, value]) => {
      const key = `${property}: ${value}`;
      if (cssToTailwindMap[key]) {
        classes.push(cssToTailwindMap[key]);
      } else {
        logger.warn(`No Tailwind equivalent found for: ${key}`);
      }
    });
    
    return classes.join(' ');
  },
  
  // Convert component class to Tailwind classes
  convertComponentClass: (componentType, className) => {
    if (componentMigrationPatterns[componentType] && componentMigrationPatterns[componentType][className]) {
      return componentMigrationPatterns[componentType][className];
    }
    logger.warn(`No migration pattern found for ${componentType}.${className}`);
    return className;
  },
  
  // Validate Tailwind classes
  validateTailwindClasses: (classes) => {
    const validClasses = [];
    const invalidClasses = [];
    
    classes.split(' ').forEach(className => {
      if (className.trim()) {
        // Basic validation - check if it looks like a Tailwind class
        if (className.match(/^(bg-|text-|border-|p-|m-|w-|h-|flex|grid|hidden|block|inline|relative|absolute|fixed|sticky|top-|bottom-|left-|right-|z-|opacity-|transform|transition|animate-|hover:|focus:|sm:|md:|lg:|xl:|2xl:)/)) {
          validClasses.push(className);
        } else {
          invalidClasses.push(className);
        }
      }
    });
    
    return { validClasses, invalidClasses };
  },
  
  // Generate migration report
  generateMigrationReport: (originalClasses, migratedClasses) => {
    const originalCount = originalClasses.split(' ').filter(c => c.trim()).length;
    const migratedCount = migratedClasses.split(' ').filter(c => c.trim()).length;
    const validation = migrationUtils.validateTailwindClasses(migratedClasses);
    
    return {
      originalClassCount: originalCount,
      migratedClassCount: migratedCount,
      validClasses: validation.validClasses,
      invalidClasses: validation.invalidClasses,
      migrationRate: (migratedCount / originalCount) * 100,
      isValid: validation.invalidClasses.length === 0,
    };
  },
  
  // Extract inline styles and convert to Tailwind
  convertInlineStyles: (styleString) => {
    const styles = {};
    const declarations = styleString.split(';').filter(decl => decl.trim());
    
    declarations.forEach(decl => {
      const [property, value] = decl.split(':').map(s => s.trim());
      if (property && value) {
        styles[property] = value;
      }
    });
    
    return migrationUtils.convertCssToTailwind(styles);
  },
  
  // Convert CSS custom properties to Tailwind classes
  convertCustomProperties: (cssString) => {
    const customPropertyMap = {
      'var(--color-background-primary)': 'bg-background-primary',
      'var(--color-background-secondary)': 'bg-background-secondary',
      'var(--color-background-tertiary)': 'bg-background-tertiary',
      'var(--color-text-primary)': 'text-text-primary',
      'var(--color-text-secondary)': 'text-text-secondary',
      'var(--color-text-muted)': 'text-text-muted',
      'var(--color-border-primary)': 'border-border-primary',
      'var(--color-border-focus)': 'border-border-focus',
      'var(--color-status-online)': 'status-online',
      'var(--color-status-offline)': 'status-offline',
      'var(--color-status-pending)': 'status-pending',
      'var(--color-status-error)': 'status-error',
      'var(--color-status-info)': 'status-info',
    };
    
    let converted = cssString;
    Object.entries(customPropertyMap).forEach(([cssVar, tailwindClass]) => {
      converted = converted.replace(new RegExp(cssVar, 'g'), tailwindClass);
    });
    
    return converted;
  },
};

// Migration helpers for specific components
export const componentMigrationHelpers = {
  // Convert Button component
  convertButton: (props) => {
    const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors touch-target';
    const variantClasses = {
      primary: 'bg-brand-600 hover:bg-brand-700 text-white',
      secondary: 'bg-slate-600 hover:bg-slate-700 text-white',
      outline: 'border border-brand-600 text-brand-600 hover:bg-brand-600 hover:text-white',
      ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
    };
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };
    
    const variant = variantClasses[props.variant] || variantClasses.primary;
    const size = sizeClasses[props.size] || sizeClasses.md;
    const disabled = props.disabled ? 'opacity-50 cursor-not-allowed' : '';
    
    return `${baseClasses} ${variant} ${size} ${disabled}`.trim();
  },
  
  // Convert Card component
  convertCard: (props) => {
    const baseClasses = 'bg-background-secondary border border-border-primary rounded-lg shadow-md';
    const paddingClasses = {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };
    
    const padding = paddingClasses[props.padding] || paddingClasses.md;
    const hover = props.hover ? 'hover:shadow-lg transition-shadow' : '';
    
    return `${baseClasses} ${padding} ${hover}`.trim();
  },
  
  // Convert Input component
  convertInput: (props) => {
    const baseClasses = 'w-full px-3 py-2 border rounded-md bg-background-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors';
    const sizeClasses = {
      sm: 'text-sm px-2 py-1.5 min-h-[40px]',
      md: 'text-base px-3 py-2 min-h-[44px]',
      lg: 'text-lg px-4 py-3 min-h-[48px]',
    };
    const stateClasses = {
      error: 'border-border-error focus:ring-error-500',
      success: 'border-border-success focus:ring-success-500',
      warning: 'border-warning-500 focus:ring-warning-500',
    };
    
    const size = sizeClasses[props.size] || sizeClasses.md;
    const state = props.error ? stateClasses.error : 
                  props.success ? stateClasses.success : 
                  props.warning ? stateClasses.warning : 'border-border-primary';
    const disabled = props.disabled ? 'opacity-50 cursor-not-allowed' : '';
    
    return `${baseClasses} ${size} ${state} ${disabled}`.trim();
  },
};

export default {
  cssToTailwindMap,
  componentMigrationPatterns,
  migrationUtils,
  componentMigrationHelpers,
};




