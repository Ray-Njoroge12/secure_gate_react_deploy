# SecureGate Design System

A comprehensive design system for the SecureGate Access Control application, providing consistent design tokens, components, and guidelines for building accessible, responsive, and maintainable user interfaces.

## 🎨 Overview

The SecureGate Design System is built on the principles of consistency, accessibility, clarity, efficiency, and flexibility. It provides a unified visual language that ensures a cohesive user experience across all parts of the application.

## 📦 Installation

```javascript
import { tokens, theme, componentTokens, utilities, guidelines } from './design-system';
```

## 🎯 Core Principles

### 1. Consistency
- Use consistent patterns, spacing, and visual elements
- Maintain uniform component behavior across the application
- Apply the same color meanings and typography hierarchy

### 2. Accessibility
- WCAG 2.1 AA compliance for color contrast
- Keyboard navigation support
- Screen reader compatibility
- Touch-friendly target sizes (44px minimum)

### 3. Clarity
- Clear, descriptive labels and text
- Helpful error messages and feedback
- Appropriate visual hierarchy
- Minimal cognitive load

### 4. Efficiency
- Minimize clicks and interactions
- Keyboard shortcuts for power users
- Progressive disclosure for complex forms
- Clear loading and error states

### 5. Flexibility
- Responsive design across all screen sizes
- Reusable component variants
- Support for different content lengths
- Adaptable to user preferences

## 🎨 Design Tokens

### Colors

Our color palette is built around a professional green (brand) and slate (neutral) color scheme that conveys security, trust, and professionalism.

```javascript
import { tokens } from './design-system';

// Primary brand colors
tokens.colors.brand[500] // #10b981 - Main brand color
tokens.colors.brand[600] // #059669 - Hover states
tokens.colors.brand[700] // #047857 - Active states

// Neutral colors
tokens.colors.slate[50]  // #f8fafc - Lightest
tokens.colors.slate[900] // #0f172a - Darkest

// Semantic colors
tokens.colors.success[500] // #10b981 - Success states
tokens.colors.warning[500] // #f59e0b - Warning states
tokens.colors.error[500]   // #ef4444 - Error states
tokens.colors.info[500]    // #3b82f6 - Info states
```

### Typography

The typography system uses Inter as the primary font with a carefully crafted scale that ensures readability and hierarchy.

```javascript
// Font families
tokens.typography.fontFamily.sans // Inter, system fonts
tokens.typography.fontFamily.mono // Fira Code, monospace fonts

// Font sizes
tokens.typography.fontSize.xs    // 12px - Small text
tokens.typography.fontSize.base  // 16px - Body text
tokens.typography.fontSize.lg    // 18px - Large text
tokens.typography.fontSize['4xl'] // 36px - Headings

// Font weights
tokens.typography.fontWeight.normal   // 400 - Regular
tokens.typography.fontWeight.medium   // 500 - Medium
tokens.typography.fontWeight.semibold // 600 - Semibold
tokens.typography.fontWeight.bold     // 700 - Bold
```

### Spacing

Our spacing system is based on a 4px grid that ensures consistent spacing throughout the application.

```javascript
// Spacing scale (4px base unit)
tokens.spacing[1]  // 4px  - Tight spacing
tokens.spacing[4]  // 16px - Standard spacing
tokens.spacing[6]  // 24px - Large spacing
tokens.spacing[8]  // 32px - Extra large spacing
```

### Shadows

A carefully crafted shadow system provides depth and hierarchy.

```javascript
tokens.shadows.sm  // Subtle shadow
tokens.shadows.md  // Standard shadow
tokens.shadows.lg  // Prominent shadow
tokens.shadows.xl  // Dramatic shadow
```

## 🧩 Component Tokens

Component-specific design tokens define the visual properties of UI components.

### Buttons

```javascript
import { componentTokens } from './design-system';

// Button sizes
componentTokens.button.size.sm  // Small button
componentTokens.button.size.md  // Medium button (44px - touch-friendly)
componentTokens.button.size.lg  // Large button

// Button variants
componentTokens.button.variant.primary   // Primary action
componentTokens.button.variant.secondary // Secondary action
componentTokens.button.variant.danger    // Destructive action
componentTokens.button.variant.ghost     // Subtle action
```

### Inputs

```javascript
// Input sizes
componentTokens.input.size.sm  // Small input
componentTokens.input.size.md  // Medium input (44px - touch-friendly)
componentTokens.input.size.lg  // Large input

// Input variants
componentTokens.input.variant.default // Standard input
componentTokens.input.variant.filled  // Filled background
```

### Cards

```javascript
// Card sizes
componentTokens.card.size.sm  // Small card
componentTokens.card.size.md  // Medium card
componentTokens.card.size.lg  // Large card

// Card variants
componentTokens.card.variant.default  // Standard card
componentTokens.card.variant.elevated // Elevated card
componentTokens.card.variant.outlined // Outlined card
componentTokens.card.variant.filled   // Filled card
```

## 🛠️ Utilities

The design system includes utility functions for working with design tokens.

```javascript
import { utilities } from './design-system';

// Theme access
utilities.getColor('brand.500')           // Get color value
utilities.getSpacing(4)                   // Get spacing value
utilities.getShadow('md')                 // Get shadow value
utilities.getBorderRadius('lg')           // Get border radius value

// Responsive utilities
utilities.createResponsiveValue({
  base: '16px',
  sm: '20px',
  lg: '24px'
})

// Color utilities
utilities.getContrastColor('#10b981')     // Get contrasting text color
utilities.createColorScale('#10b981', 9)  // Create color scale

// Layout utilities
utilities.createContainer('1200px', '0 16px')
utilities.createGrid(12, '16px')
utilities.createFlexbox('row', 'space-between', 'center')

// Accessibility utilities
utilities.createFocusRing('#10b981', '2px', '2px')
utilities.createScreenReaderOnly()
utilities.createReducedMotion(true)
```

## 📱 Responsive Design

The design system is built mobile-first with responsive breakpoints.

```javascript
// Breakpoints
tokens.breakpoints.xs  // 0px    - Mobile
tokens.breakpoints.sm  // 640px  - Large Mobile
tokens.breakpoints.md  // 768px  - Tablet
tokens.breakpoints.lg  // 1024px - Desktop
tokens.breakpoints.xl  // 1280px - Large Desktop

// Responsive utilities
utilities.createMediaQuery('md') // @media (min-width: 768px)
utilities.createMediaQueries()   // All breakpoint queries
```

## ♿ Accessibility

The design system prioritizes accessibility with built-in WCAG 2.1 AA compliance.

### Color Contrast
- Normal text: 4.5:1 contrast ratio
- Large text: 3:1 contrast ratio
- UI components: 3:1 contrast ratio

### Touch Targets
- Minimum 44px touch target size
- Recommended 48px for better usability
- Adequate spacing between targets

### Keyboard Navigation
- All interactive elements are focusable
- Logical tab order
- Visible focus indicators
- Standard keyboard shortcuts

## 🎨 Usage Examples

### Buttons

```jsx
// Primary button
<button className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-3 rounded-md font-medium transition-colors">
  Submit
</button>

// Secondary button
<button className="bg-transparent hover:bg-slate-700 text-slate-300 border border-slate-600 px-5 py-3 rounded-md font-medium transition-colors">
  Cancel
</button>

// Danger button
<button className="bg-error-500 hover:bg-error-600 text-white px-5 py-3 rounded-md font-medium transition-colors">
  Delete
</button>
```

### Forms

```jsx
// Basic input
<input 
  className="bg-slate-800 border border-slate-600 text-slate-50 px-4 py-3 rounded-md focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
  placeholder="Enter your email"
/>

// Input with label
<div className="space-y-2">
  <label className="block text-sm font-medium text-slate-300">
    Email Address
  </label>
  <input 
    className="w-full bg-slate-800 border border-slate-600 text-slate-50 px-4 py-3 rounded-md focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
    placeholder="Enter your email"
  />
</div>
```

### Cards

```jsx
// Basic card
<div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-md">
  <h3 className="text-lg font-semibold text-slate-50 mb-2">Card Title</h3>
  <p className="text-slate-300">Card content goes here.</p>
</div>

// Elevated card
<div className="bg-slate-800 border border-slate-600 rounded-lg p-6 shadow-lg">
  <h3 className="text-lg font-semibold text-slate-50 mb-2">Elevated Card</h3>
  <p className="text-slate-300">This card has more prominent shadow.</p>
</div>
```

## 🚀 Getting Started

1. **Import the design system:**
   ```javascript
   import { tokens, theme, componentTokens, utilities, guidelines } from './design-system';
   ```

2. **Use design tokens in your components:**
   ```javascript
   const buttonStyles = {
     backgroundColor: tokens.colors.brand[500],
     padding: `${tokens.spacing[3]} ${tokens.spacing[5]}`,
     borderRadius: tokens.borderRadius.md,
   };
   ```

3. **Apply responsive design:**
   ```javascript
   const responsiveStyles = utilities.createResponsiveValue({
     base: '16px',
     sm: '20px',
     lg: '24px'
   });
   ```

4. **Follow accessibility guidelines:**
   ```javascript
   const focusStyles = utilities.createFocusRing(tokens.colors.brand[500]);
   ```

## 📚 Guidelines

For detailed usage guidelines, best practices, and examples, see the [Guidelines Documentation](./guidelines.js).

## 🔧 Customization

The design system is designed to be flexible and customizable. You can:

- Override theme values for specific components
- Create custom component variants
- Add new design tokens
- Extend utility functions

## 🤝 Contributing

When contributing to the design system:

1. Follow the established patterns and conventions
2. Ensure all changes maintain accessibility standards
3. Test across different screen sizes and devices
4. Update documentation for any new features
5. Consider backward compatibility

## 📄 License

This design system is part of the SecureGate application and follows the same licensing terms.




