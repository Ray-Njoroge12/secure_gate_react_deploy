/**
 * @fileoverview Unified Icon component for SecureGate Access
 * @description Centralized icon wrapper that ensures consistent sizing,
 * accessibility attributes, and theme-aware coloring for all icons.
 * Uses lucide-react as the underlying icon library.
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { memo } from 'react';

/**
 * Icon size presets mapped to pixel values.
 * All sizes ensure minimum 16px for visibility.
 * @constant {Object.<string, number>}
 */
const ICON_SIZES = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

/**
 * Unified Icon component that wraps lucide-react icons with
 * consistent sizing, color, and accessibility support.
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ComponentType} props.icon - A lucide-react icon component (required)
 * @param {string} [props.size='md'] - Preset size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @param {number} [props.sizeOverride] - Explicit pixel size override
 * @param {string} [props.className=''] - Additional CSS classes for the icon
 * @param {string} [props.color] - CSS color string. Defaults to 'currentColor'
 * @param {number} [props.strokeWidth=2] - Stroke width for the icon
 * @param {string} [props['aria-label']] - Accessible label. If provided, icon is treated as meaningful.
 * @param {boolean} [props['aria-hidden']] - Explicitly hide from screen readers. Defaults to true when no aria-label.
 * @returns {JSX.Element|null} Icon component
 *
 * @example
 * // Decorative icon (hidden from screen readers)
 * import { Search } from 'lucide-react';
 * <Icon icon={Search} size="md" />
 *
 * @example
 * // Meaningful icon with accessible label
 * import { AlertCircle } from 'lucide-react';
 * <Icon icon={AlertCircle} size="lg" aria-label="Warning" color="var(--color-warning)" />
 *
 * @example
 * // Custom pixel size
 * import { Shield } from 'lucide-react';
 * <Icon icon={Shield} sizeOverride={28} className="text-brand-500" />
 */
const Icon = memo(({
  icon: IconComponent,
  size = 'md',
  sizeOverride,
  className = '',
  color = 'currentColor',
  strokeWidth = 2,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHiddenProp,
  ...props
}) => {
  if (!IconComponent) {
    return null;
  }

  const pixelSize = sizeOverride || ICON_SIZES[size] || ICON_SIZES.md;
  const isDecorative = !ariaLabel;
  const ariaHidden = ariaHiddenProp !== undefined ? ariaHiddenProp : isDecorative;

  return (
    <IconComponent
      width={pixelSize}
      height={pixelSize}
      color={color}
      strokeWidth={strokeWidth}
      className={`sg-icon sg-icon--${size} ${className}`.trim()}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      role={ariaLabel ? 'img' : undefined}
      focusable="false"
      {...props}
    />
  );
});

Icon.displayName = 'Icon';

export { ICON_SIZES };
export default Icon;
