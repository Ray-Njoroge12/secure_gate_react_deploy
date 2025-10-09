/**
 * Component Migration Example
 * 
 * This file demonstrates the migration process from custom CSS to Tailwind CSS
 * using the SecureGate application as an example.
 */

import React, { useState } from 'react';
import logger from 'utils/logger';
import { migrationUtils, componentMigrationHelpers } from '../utils/tailwindMigration';

// ============================================================================
// BEFORE: Component with Custom CSS Classes
// ============================================================================

const OldButtonComponent = ({ variant = 'primary', size = 'md', disabled = false, children, ...props }) => {
  // Old approach: Using custom CSS classes
  const getButtonClasses = () => {
    let classes = 'btn';
    
    if (variant === 'primary') classes += ' btn-primary';
    if (variant === 'secondary') classes += ' btn-secondary';
    if (variant === 'outline') classes += ' btn-outline';
    if (variant === 'ghost') classes += ' btn-ghost';
    
    if (size === 'sm') classes += ' btn-sm';
    if (size === 'lg') classes += ' btn-lg';
    
    if (disabled) classes += ' btn-disabled';
    
    return classes;
  };

  return (
    <button
      className={getButtonClasses()}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// ============================================================================
// AFTER: Component with Tailwind Classes
// ============================================================================

const NewButtonComponent = ({ variant = 'primary', size = 'md', disabled = false, children, ...props }) => {
  // New approach: Using Tailwind classes with migration helpers
  const getButtonClasses = () => {
    return componentMigrationHelpers.convertButton({
      variant,
      size,
      disabled
    });
  };

  return (
    <button
      className={getButtonClasses()}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// ============================================================================
// MIGRATION PROCESS DEMONSTRATION
// ============================================================================

const MigrationProcessExample = () => {
  const [migrationStep, setMigrationStep] = useState(0);
  
  const migrationSteps = [
    {
      title: "1. Identify Custom CSS Classes",
      description: "Find all custom CSS classes used in the component",
      code: `
// Old CSS classes found:
.btn { /* base button styles */ }
.btn-primary { background: #10b981; color: white; }
.btn-secondary { background: #64748b; color: white; }
.btn-outline { border: 1px solid #10b981; color: #10b981; }
.btn-ghost { color: #64748b; background: transparent; }
.btn-sm { padding: 0.5rem 0.75rem; font-size: 0.875rem; }
.btn-lg { padding: 0.75rem 1.5rem; font-size: 1.125rem; }
.btn-disabled { opacity: 0.5; cursor: not-allowed; }
      `,
      tailwind: `
// Equivalent Tailwind classes:
// .btn -> px-4 py-2 rounded-md font-medium transition-colors touch-target
// .btn-primary -> bg-brand-600 hover:bg-brand-700 text-white
// .btn-secondary -> bg-slate-600 hover:bg-slate-700 text-white
// .btn-outline -> border border-brand-600 text-brand-600 hover:bg-brand-600 hover:text-white
// .btn-ghost -> text-slate-600 hover:text-slate-900 hover:bg-slate-100
// .btn-sm -> px-3 py-1.5 text-sm
// .btn-lg -> px-6 py-3 text-lg
// .btn-disabled -> opacity-50 cursor-not-allowed
      `
    },
    {
      title: "2. Use Migration Utilities",
      description: "Convert CSS properties to Tailwind classes using utilities",
      code: `
// Convert CSS properties to Tailwind
const cssProperties = {
  'display': 'flex',
  'justify-content': 'center',
  'align-items': 'center',
  'padding': '1rem',
  'background-color': '#1e293b',
  'color': '#f8fafc',
  'border-radius': '8px',
  'font-weight': '500',
  'transition': 'all 0.2s ease-in-out'
};

const tailwindClasses = migrationUtils.convertCssToTailwind(cssProperties);
// Result: "flex justify-center items-center p-4 bg-background-secondary text-text-primary rounded-md font-medium transition-all duration-200 ease-in-out"
      `,
      tailwind: `
// The migration utility automatically converts:
// display: flex -> flex
// justify-content: center -> justify-center
// align-items: center -> items-center
// padding: 1rem -> p-4
// background-color: #1e293b -> bg-background-secondary
// color: #f8fafc -> text-text-primary
// border-radius: 8px -> rounded-md
// font-weight: 500 -> font-medium
// transition: all 0.2s ease-in-out -> transition-all duration-200 ease-in-out
      `
    },
    {
      title: "3. Apply Component Migration Helpers",
      description: "Use component-specific migration helpers for complex components",
      code: `
// Use component migration helper
const buttonClasses = componentMigrationHelpers.convertButton({
  variant: 'primary',
  size: 'md',
  disabled: false
});

// Result: "px-4 py-2 rounded-md font-medium transition-colors touch-target bg-brand-600 hover:bg-brand-700 text-white"
      `,
      tailwind: `
// The helper automatically combines:
// - Base classes: px-4 py-2 rounded-md font-medium transition-colors touch-target
// - Variant classes: bg-brand-600 hover:bg-brand-700 text-white
// - Size classes: (default md size)
// - State classes: (not disabled)
      `
    },
    {
      title: "4. Validate Migration",
      description: "Validate that all Tailwind classes are correct and working",
      code: `
// Validate Tailwind classes
const classes = "px-4 py-2 rounded-md font-medium transition-colors touch-target bg-brand-600 hover:bg-brand-700 text-white";
const validation = migrationUtils.validateTailwindClasses(classes);

logger.debug(validation);
// {
//   validClasses: ["px-4", "py-2", "rounded-md", "font-medium", "transition-colors", "touch-target", "bg-brand-600", "hover:bg-brand-700", "text-white"],
//   invalidClasses: []
// }
      `,
      tailwind: `
// All classes are valid Tailwind classes:
// ✅ px-4 - padding-left: 1rem; padding-right: 1rem;
// ✅ py-2 - padding-top: 0.5rem; padding-bottom: 0.5rem;
// ✅ rounded-md - border-radius: 0.375rem;
// ✅ font-medium - font-weight: 500;
// ✅ transition-colors - transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
// ✅ touch-target - min-height: 44px; min-width: 44px;
// ✅ bg-brand-600 - background-color: #059669;
// ✅ hover:bg-brand-700 - hover:background-color: #047857;
// ✅ text-white - color: #ffffff;
      `
    },
    {
      title: "5. Test and Refine",
      description: "Test the migrated component and refine as needed",
      code: `
// Test the migrated component
const TestButton = () => (
  <div className="p-8 space-y-4">
    <h2 className="text-2xl font-bold text-text-primary mb-4">Button Variants</h2>
    
    <div className="flex flex-wrap gap-4">
      <NewButtonComponent variant="primary" size="sm">Primary Small</NewButtonComponent>
      <NewButtonComponent variant="primary" size="md">Primary Medium</NewButtonComponent>
      <NewButtonComponent variant="primary" size="lg">Primary Large</NewButtonComponent>
    </div>
    
    <div className="flex flex-wrap gap-4">
      <NewButtonComponent variant="secondary">Secondary</NewButtonComponent>
      <NewButtonComponent variant="outline">Outline</NewButtonComponent>
      <NewButtonComponent variant="ghost">Ghost</NewButtonComponent>
    </div>
    
    <div className="flex flex-wrap gap-4">
      <NewButtonComponent disabled>Disabled</NewButtonComponent>
    </div>
  </div>
);
      `,
      tailwind: `
// The migrated component now uses:
// - Consistent design system colors
// - Proper touch targets for accessibility
// - Responsive sizing
// - Hover and focus states
// - Smooth transitions
// - Semantic class names
      `
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-8 bg-background-primary text-text-primary">
      <h1 className="text-3xl font-bold mb-8">Component Migration Example</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Migration Steps</h2>
        <div className="flex space-x-2 mb-4">
          {migrationSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setMigrationStep(index)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                migrationStep === index
                  ? 'bg-brand-600 text-white'
                  : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-background-secondary rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">{migrationSteps[migrationStep].title}</h3>
        <p className="text-text-secondary mb-4">{migrationSteps[migrationStep].description}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-text-primary mb-2">Before (Custom CSS)</h4>
            <pre className="bg-background-tertiary p-4 rounded-md text-sm overflow-x-auto">
              <code>{migrationSteps[migrationStep].code}</code>
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium text-text-primary mb-2">After (Tailwind CSS)</h4>
            <pre className="bg-background-tertiary p-4 rounded-md text-sm overflow-x-auto">
              <code>{migrationSteps[migrationStep].tailwind}</code>
            </pre>
          </div>
        </div>
      </div>

      <div className="bg-background-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Live Example</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-text-primary mb-2">Old Component (Custom CSS)</h4>
            <div className="flex flex-wrap gap-4">
              <OldButtonComponent variant="primary" size="sm">Primary Small</OldButtonComponent>
              <OldButtonComponent variant="secondary">Secondary</OldButtonComponent>
              <OldButtonComponent variant="outline">Outline</OldButtonComponent>
              <OldButtonComponent variant="ghost">Ghost</OldButtonComponent>
              <OldButtonComponent disabled>Disabled</OldButtonComponent>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-text-primary mb-2">New Component (Tailwind CSS)</h4>
            <div className="flex flex-wrap gap-4">
              <NewButtonComponent variant="primary" size="sm">Primary Small</NewButtonComponent>
              <NewButtonComponent variant="secondary">Secondary</NewButtonComponent>
              <NewButtonComponent variant="outline">Outline</NewButtonComponent>
              <NewButtonComponent variant="ghost">Ghost</NewButtonComponent>
              <NewButtonComponent disabled>Disabled</NewButtonComponent>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-brand-50 border border-brand-200 rounded-lg">
        <h3 className="text-lg font-semibold text-brand-800 mb-2">Migration Benefits</h3>
        <ul className="space-y-2 text-brand-700">
          <li>✅ <strong>Consistency:</strong> All components use the same design system</li>
          <li>✅ <strong>Maintainability:</strong> Easier to update and modify styles</li>
          <li>✅ <strong>Performance:</strong> Smaller CSS bundle size with purging</li>
          <li>✅ <strong>Accessibility:</strong> Built-in accessibility features</li>
          <li>✅ <strong>Responsiveness:</strong> Mobile-first responsive design</li>
          <li>✅ <strong>Developer Experience:</strong> Better IntelliSense and autocomplete</li>
        </ul>
      </div>
    </div>
  );
};

export default MigrationProcessExample;




