/**
 * @fileoverview Gradient Button Component
 * @description Enhanced button with gradient backgrounds, loading states, and animations
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
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
  type = 'button',
  onClick,
  className = '',
  ...rest
}) => {
  // Determine button classes
  const buttonClasses = [
    'gradient-button',
    `gradient-button--${variant}`,
    `gradient-button--${size}`,
    fullWidth && 'gradient-button--full-width',
    loading && 'gradient-button--loading',
    disabled && 'gradient-button--disabled',
    className
  ].filter(Boolean).join(' ');

  // Handle click
  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...rest}
    >
      {/* Loading Spinner */}
      {loading && (
        <span className="gradient-button__loader">
          <Loader2 className="gradient-button__spinner" />
        </span>
      )}

      {/* Button Content */}
      <span className={`gradient-button__content ${loading ? 'gradient-button__content--hidden' : ''}`}>
        {/* Left Icon */}
        {leftIcon && !loading && (
          <span className="gradient-button__icon gradient-button__icon--left">
            {leftIcon}
          </span>
        )}

        {/* Text */}
        <span className="gradient-button__text">
          {children}
        </span>

        {/* Right Icon */}
        {rightIcon && !loading && (
          <span className="gradient-button__icon gradient-button__icon--right">
            {rightIcon}
          </span>
        )}
      </span>
    </button>
  );
};

export default GradientButton;
