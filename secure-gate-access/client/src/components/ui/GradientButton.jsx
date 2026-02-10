/**
 * @fileoverview Gradient Button Component
 * @description Enhanced button with gradient backgrounds, loading states, and animations
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';

import Icon from './Icon';
import './GradientButton.css';

/**
 * GradientButton Component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.variant - Button variant (primary, secondary, success, danger, outline)
 * @param {string} props.size - Button size (sm, md, lg)
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.fullWidth - Full width button
 * @param {React.ReactNode} props.leftIcon - Left icon component
 * @param {React.ReactNode} props.rightIcon - Right icon component
 * @param {string} props.type - Button type (button, submit, reset)
 * @param {Function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.rest - Additional props
 */
const GradientButton = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon = null,
  rightIcon = null,
  icon = null,
  type = 'button',
  onClick,
  className = '',
  ...rest
}) => {
  const normalizeIcon = (iconNode, sizeOverride = 18) => {
    if (!iconNode) return null;
    if (typeof iconNode === 'string') {
      return <Icon name={iconNode} size={sizeOverride} aria-hidden="true" />;
    }
    return iconNode;
  };

  const resolvedLeftIcon = normalizeIcon(leftIcon);
  const resolvedRightIcon = normalizeIcon(rightIcon || icon);

  // Determine button classes
  const buttonClasses = [
    'gradient-button',
    `gradient-button--${variant}`,
    `gradient-button--${size}`,
    fullWidth && 'gradient-button--full-width',
    loading && 'gradient-button--loading',
    disabled && 'gradient-button--disabled',
  ].filter(Boolean).join(' ');

  return (
    // eslint-disable-next-line react/forbid-elements
    <button
      type={type}
      className={`${buttonClasses} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="gradient-button__loader" aria-hidden="true">
          <Icon name="loader-2" className="gradient-button__spinner" />
        </span>
      )}

      <span className={`gradient-button__content ${loading ? 'gradient-button__content--hidden' : ''}`}>
        {!loading && resolvedLeftIcon && (
          <span className="gradient-button__icon gradient-button__icon--left">{resolvedLeftIcon}</span>
        )}

        <span className="gradient-button__text">{children}</span>

        {!loading && resolvedRightIcon && (
          <span className="gradient-button__icon gradient-button__icon--right">{resolvedRightIcon}</span>
        )}
      </span>
    </button>
  );
};

export default GradientButton;
