/**
 * @file designTokens.js
 * @description Shared design token constants for JavaScript contexts (charts, SVGs, canvas)
 * where CSS custom properties cannot be used directly.
 *
 * These values MUST stay in sync with:
 *   - src/styles/design-system.css  (CSS custom properties)
 *   - tailwind.config.js            (Tailwind theme)
 *
 * Usage:
 *   import { COLORS, CHART_PALETTE } from '../../utils/designTokens';
 *   <Line stroke={COLORS.success} />
 */

// ─── Semantic Colors ────────────────────────────────────────────────────────
export const COLORS = {
  // Brand
  brandPrimary:      '#10b981', // green-500 / --color-brand-primary
  brandPrimaryHover: '#059669', // green-600 / --color-brand-primary-hover
  brandSecondary:    '#3b82f6', // blue-500  / --color-brand-secondary

  // Semantic
  success:     '#10b981', // green-500  / --color-success
  successDark: '#059669', // green-600  / --color-success-dark
  error:       '#ef4444', // red-500    / --color-error
  errorDark:   '#dc2626', // red-600    / --color-error-dark
  warning:     '#f59e0b', // amber-500  / --color-warning
  warningDark: '#d97706', // amber-600  / --color-warning-dark
  info:        '#3b82f6', // blue-500   / --color-info
  infoDark:    '#2563eb', // blue-600   / --color-info-dark

  // Neutral
  gray50:  '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  // Extended palette for charts and data-vis
  accent:  '#8b5cf6', // violet-500
  pink:    '#ec4899', // pink-500
  cyan:    '#06b6d4', // cyan-500
  orange:  '#f97316', // orange-500
  lime:    '#84cc16', // lime-500
  indigo:  '#6366f1', // indigo-500

  // Special
  white:   '#ffffff',
  black:   '#000000',
};

// ─── Chart Palette (ordered for categorical data) ───────────────────────────
export const CHART_PALETTE = [
  COLORS.success,
  COLORS.info,
  COLORS.warning,
  COLORS.error,
  COLORS.accent,
  COLORS.pink,
  COLORS.cyan,
  COLORS.orange,
  COLORS.lime,
  COLORS.indigo,
];

// ─── Status Colors ──────────────────────────────────────────────────────────
export const STATUS_COLORS = {
  online:  COLORS.success,
  offline: COLORS.gray500,
  pending: COLORS.warning,
  error:   COLORS.error,
  info:    COLORS.info,
};

// ─── Threshold Colors (for performance dashboards) ──────────────────────────
export const THRESHOLD_COLORS = {
  critical: COLORS.errorDark,
  warning:  COLORS.warningDark,
  info:     COLORS.infoDark,
};

/**
 * Resolve a CSS custom property at runtime.
 * Useful when you need the *computed* value that may have been overridden by
 * a dark-mode or high-contrast theme layer.
 *
 * @param {string} varName  e.g. '--color-success'
 * @param {string} fallback e.g. '#10b981'
 * @returns {string} The resolved color value
 */
export function getCSSTokenValue(varName, fallback = '') {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
}

export default COLORS;
