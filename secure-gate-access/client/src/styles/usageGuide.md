# Design System Usage Guide

## Quick Start

### Import Design Tokens
```javascript
import { theme, colors, spacing, typography } from '../styles/tokens';
```

### Use CSS Variables
```css
.my-component {
  background-color: var(--color-brand-500);
  padding: var(--spacing-4);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}
```

### Use Tailwind Classes
```jsx
<div className="bg-brand-500 p-4 rounded-md shadow-md">
  Content
</div>
```

## Component Guidelines

### Buttons
- Always use minimum 44px height for touch targets
- Use semantic variants (primary, secondary, danger)
- Include loading and disabled states
- Provide clear visual feedback

```jsx
<Button 
  variant="primary" 
  size="md" 
  disabled={loading}
  onClick={handleClick}
>
  {loading ? 'Loading...' : 'Submit'}
</Button>
```

### Inputs
- Always include labels and helper text
- Use proper input types (email, password, etc.)
- Show validation states clearly
- Ensure 44px minimum height

```jsx
<Input
  label="Email Address"
  type="email"
  placeholder="Enter your email"
  error={errors.email}
  helperText="We'll never share your email"
  required
/>
```

### Cards
- Use consistent padding and spacing
- Apply appropriate shadow levels
- Include proper heading hierarchy
- Ensure good contrast ratios

```jsx
<Card>
  <Card.Header>
    <Card.Title>Card Title</Card.Title>
  </Card.Header>
  <Card.Content>
    Card content goes here
  </Card.Content>
</Card>
```

## Color Usage

### Primary Colors
- Use brand-500 for primary actions and highlights
- Use brand-600 for hover states
- Use brand-700 for active states
- Use lighter shades (100-400) for backgrounds and accents

### Semantic Colors
- **Success**: Use for positive actions and success messages
- **Warning**: Use for caution states and warnings
- **Error**: Use for errors and destructive actions
- **Info**: Use for informational content and neutral actions

### Neutral Colors
- Use slate-900 for primary backgrounds
- Use slate-800 for secondary backgrounds and cards
- Use slate-700 for borders and dividers
- Use slate-600 for muted text
- Use slate-500 for placeholder text
- Use slate-400 for disabled text

## Typography

### Headings
- Use proper heading hierarchy (h1-h6)
- Maintain consistent font weights
- Ensure adequate contrast ratios
- Use appropriate line heights

```jsx
<h1 className="text-4xl font-bold text-slate-100">Main Heading</h1>
<h2 className="text-2xl font-semibold text-slate-200">Section Heading</h2>
<h3 className="text-lg font-medium text-slate-300">Subsection Heading</h3>
```

### Body Text
- Use base font size (16px) for body text
- Use sm (14px) for labels and captions
- Use lg (18px) for large body text
- Maintain 1.5 line height for readability

```jsx
<p className="text-base text-slate-200 leading-normal">
  Body text content
</p>
<label className="text-sm text-slate-400">Form Label</label>
```

## Spacing

### Use the 4px Grid
- All spacing should be multiples of 4px
- Use consistent spacing patterns
- Maintain visual rhythm throughout the interface

### Common Spacing Patterns
- **Tight**: 8px (space-2) - Between related elements
- **Normal**: 16px (space-4) - Between sections
- **Loose**: 24px (space-6) - Between major sections
- **Very Loose**: 32px (space-8) - Between page sections

```jsx
<div className="space-y-4"> {/* 16px between children */}
  <div className="p-4"> {/* 16px padding */}
    Content
  </div>
</div>
```

## Responsive Design

### Breakpoints
- **xs**: 0px - Mobile phones (portrait)
- **sm**: 640px - Mobile phones (landscape)
- **md**: 768px - Tablets
- **lg**: 1024px - Laptops
- **xl**: 1280px - Desktops
- **2xl**: 1536px - Large desktops

### Mobile-First Approach
- Start with mobile styles
- Add larger screen styles with prefixes
- Ensure touch targets are at least 44px
- Test on actual devices

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>
```

## Accessibility

### Color Contrast
- Ensure minimum 4.5:1 contrast for normal text
- Ensure minimum 3:1 contrast for large text
- Test with color contrast checkers

### Focus Management
- Provide visible focus indicators
- Use logical tab order
- Include skip navigation links
- Manage focus in modals and dropdowns

### Touch Targets
- Minimum 44px × 44px for all interactive elements
- Minimum 8px spacing between touch targets
- Provide clear visual feedback

```jsx
<button className="touch-target p-3 rounded-md">
  {/* 44px minimum height/width */}
</button>
```

## Animation and Transitions

### Duration
- **Fast**: 150ms - Micro-interactions
- **Normal**: 200ms - Standard transitions
- **Slow**: 300ms - Complex animations

### Easing
- **Ease In**: For entering animations
- **Ease Out**: For exiting animations
- **Ease In Out**: For standard transitions

```jsx
<div className="transition-normal hover:scale-105">
  {/* Smooth hover animation */}
</div>
```

## Best Practices

### Do's
- Use design tokens consistently
- Follow the 4px spacing grid
- Maintain proper color contrast
- Test on multiple devices
- Use semantic HTML elements
- Provide clear visual hierarchy

### Don'ts
- Don't use arbitrary values
- Don't compromise accessibility
- Don't ignore responsive breakpoints
- Don't create custom components without following guidelines
- Don't use colors that don't meet contrast requirements

## Testing

### Visual Testing
- Use browser dev tools to test responsive breakpoints
- Test with different zoom levels
- Verify color contrast ratios
- Check touch target sizes

### Accessibility Testing
- Use screen readers
- Test keyboard navigation
- Verify focus indicators
- Check color contrast

### Cross-Browser Testing
- Test on Chrome, Firefox, Safari, Edge
- Verify CSS custom properties support
- Check animation performance
- Test on mobile devices

## Resources

- [Design System Documentation](./designSystem.md)
- [Design Tokens](./tokens.js)
- [Component Library](../components/ui/)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
