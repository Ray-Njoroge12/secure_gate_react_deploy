# Secure Gate Access - Design System

## Overview

This design system provides a comprehensive set of design tokens, components, and guidelines for the Secure Gate Access application. It ensures consistency, accessibility, and maintainability across all user interfaces.

## Design Principles

1. **Accessibility First**: All components meet WCAG 2.1 AA standards
2. **Mobile-First**: Responsive design with touch-friendly interactions
3. **Consistency**: Unified visual language across all interfaces
4. **Performance**: Optimized for fast loading and smooth interactions
5. **Scalability**: Easy to maintain and extend

## Color Palette

### Primary Colors
- **Brand Primary**: `#059669` (Green-600) - Main brand color for CTAs and highlights
- **Brand Secondary**: `#10b981` (Green-500) - Hover states and secondary actions
- **Brand Accent**: `#34d399` (Green-400) - Success states and positive feedback

### Neutral Colors
- **Slate 900**: `#0f172a` - Primary background and text
- **Slate 800**: `#1e293b` - Secondary background and cards
- **Slate 700**: `#334155` - Borders and dividers
- **Slate 600**: `#475569` - Muted text and icons
- **Slate 500**: `#64748b` - Placeholder text
- **Slate 400**: `#94a3b8` - Disabled text
- **Slate 300**: `#cbd5e1` - Light borders
- **Slate 200**: `#e2e8f0` - Very light borders
- **Slate 100**: `#f1f5f9` - Light backgrounds
- **Slate 50**: `#f8fafc` - Very light backgrounds

### Semantic Colors
- **Success**: `#10b981` (Green-500) - Success messages and positive actions
- **Warning**: `#f59e0b` (Amber-500) - Warning messages and caution states
- **Error**: `#ef4444` (Red-500) - Error messages and destructive actions
- **Info**: `#3b82f6` (Blue-500) - Information messages and neutral actions

## Typography

### Font Families
- **Primary**: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Monospace**: `"Fira Code", "JetBrains Mono", "SF Mono", Consolas, monospace`

### Font Sizes
- **xs**: `0.75rem` (12px) - Small labels and captions
- **sm**: `0.875rem` (14px) - Body text and form labels
- **base**: `1rem` (16px) - Default body text
- **lg**: `1.125rem` (18px) - Large body text
- **xl**: `1.25rem` (20px) - Small headings
- **2xl**: `1.5rem` (24px) - Medium headings
- **3xl**: `1.875rem` (30px) - Large headings
- **4xl**: `2.25rem` (36px) - Extra large headings

### Font Weights
- **Light**: `300` - Light text
- **Normal**: `400` - Regular text
- **Medium**: `500` - Medium emphasis
- **Semibold**: `600` - Strong emphasis
- **Bold**: `700` - Strong headings

### Line Heights
- **Tight**: `1.25` - Headings and short text
- **Normal**: `1.5` - Body text
- **Relaxed**: `1.75` - Long-form content

## Spacing System

### Base Unit
4px (0.25rem) - All spacing is based on multiples of 4px

### Spacing Scale
- **0**: `0px` - No spacing
- **1**: `4px` - Very tight spacing
- **2**: `8px` - Tight spacing
- **3**: `12px` - Small spacing
- **4**: `16px` - Medium spacing
- **5**: `20px` - Large spacing
- **6**: `24px` - Extra large spacing
- **8**: `32px` - Very large spacing
- **10**: `40px` - Huge spacing
- **12**: `48px` - Massive spacing
- **16**: `64px` - Section spacing
- **20**: `80px` - Page spacing

## Border Radius

- **None**: `0px` - Sharp corners
- **Small**: `4px` - Subtle rounding
- **Medium**: `8px` - Standard rounding
- **Large**: `12px` - Prominent rounding
- **XLarge**: `16px` - Very rounded
- **Full**: `9999px` - Circular elements

## Shadows

### Elevation Levels
- **None**: `none` - No shadow
- **Small**: `0 1px 2px 0 rgb(0 0 0 / 0.05)` - Subtle elevation
- **Medium**: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` - Standard elevation
- **Large**: `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` - High elevation
- **XLarge**: `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` - Very high elevation

## Component Tokens

### Buttons
- **Height**: Minimum 44px for touch targets
- **Padding**: Horizontal 16px, Vertical 12px (base)
- **Border Radius**: 8px (medium)
- **Font Weight**: 500 (medium)
- **Transition**: All properties 200ms ease-in-out

### Inputs
- **Height**: Minimum 44px for touch targets
- **Padding**: Horizontal 12px, Vertical 12px
- **Border Radius**: 8px (medium)
- **Border Width**: 1px
- **Focus Ring**: 2px solid brand color

### Cards
- **Padding**: 24px (large)
- **Border Radius**: 12px (large)
- **Shadow**: Medium elevation
- **Background**: Slate-800

### Modals
- **Max Width**: 500px (small), 700px (medium), 900px (large)
- **Border Radius**: 16px (xlarge)
- **Shadow**: XLarge elevation
- **Backdrop**: Semi-transparent black

## Accessibility Standards

### Color Contrast
- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **UI Components**: Minimum 3:1 contrast ratio

### Touch Targets
- **Minimum Size**: 44px × 44px
- **Spacing**: Minimum 8px between targets
- **Visual Feedback**: Clear active/hover states

### Focus Management
- **Visible Focus**: 2px solid outline
- **Focus Order**: Logical tab sequence
- **Skip Links**: Available for keyboard navigation

## Responsive Breakpoints

- **xs**: `0px` - Mobile phones (portrait)
- **sm**: `640px` - Mobile phones (landscape)
- **md**: `768px` - Tablets
- **lg**: `1024px` - Laptops
- **xl**: `1280px` - Desktops
- **2xl**: `1536px` - Large desktops

## Animation Guidelines

### Duration
- **Fast**: `150ms` - Micro-interactions
- **Normal**: `200ms` - Standard transitions
- **Slow**: `300ms` - Complex animations

### Easing
- **Ease In**: `cubic-bezier(0.4, 0, 1, 1)` - Entering animations
- **Ease Out**: `cubic-bezier(0, 0, 0.2, 1)` - Exiting animations
- **Ease In Out**: `cubic-bezier(0.4, 0, 0.2, 1)` - Standard transitions

## Usage Guidelines

### Do's
- Use consistent spacing based on the 4px grid
- Maintain proper color contrast ratios
- Ensure all interactive elements meet touch target requirements
- Use semantic colors appropriately
- Follow the established typography hierarchy

### Don'ts
- Don't use arbitrary spacing values
- Don't compromise on accessibility for aesthetics
- Don't use colors that don't meet contrast requirements
- Don't create custom components without following the design system
- Don't ignore responsive breakpoints

## Component Library

### Base Components
- Button (Primary, Secondary, Outline, Ghost, Danger)
- Input (Text, Email, Password, Number, Select, Textarea)
- Card (Default, Elevated, Outlined)
- Modal (Small, Medium, Large)
- Badge (Info, Success, Warning, Error)
- Loading (Spinner, Skeleton, Progress)

### Layout Components
- Container (Fluid, Fixed, Centered)
- Grid (1-12 columns, Responsive)
- Stack (Vertical, Horizontal, Spaced)
- Sidebar (Collapsible, Fixed, Responsive)

### Navigation Components
- Breadcrumbs (Hierarchical navigation)
- Tabs (Horizontal, Vertical)
- Pagination (Numbered, Simple)
- Menu (Dropdown, Context)

## Implementation

This design system is implemented using:
- **Tailwind CSS** for utility-first styling
- **CSS Custom Properties** for dynamic theming
- **Design Tokens** for consistent values
- **Component Props** for variant management

## Maintenance

- Review and update tokens quarterly
- Test accessibility compliance monthly
- Update documentation with new components
- Maintain version control for breaking changes
- Regular cross-browser testing
