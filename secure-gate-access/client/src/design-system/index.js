/**
 * SecureGate Design System
 * 
 * A comprehensive design system for the SecureGate Access Control application.
 * This system provides consistent design tokens, components, and guidelines
 * for building accessible, responsive, and maintainable user interfaces.
 * 
 * @version 1.0.0
 * @author SecureGate Development Team
 */

// Core design tokens
export { default as tokens } from './tokens';
export { default as theme } from './theme';

// Component design tokens
export { default as componentTokens } from './component-tokens';

// Design system utilities
export { default as utilities } from './utilities';

// Design system guidelines
export { default as guidelines } from './guidelines';

// Design system showcase component
export { default as DesignSystemShowcase } from './DesignSystemShowcase';

// Re-export specific items to avoid conflicts
export { colors, typography, spacing, borderRadius, shadows, breakpoints, zIndex, transitions } from './tokens';
export { generateCSSCustomProperties } from './theme';
export { getColor, getSpacing, getBorderRadius, getShadow, getFontSize, getFontWeight, getLineHeight, createTransition, createMediaQuery, createFocusRing } from './utilities';
