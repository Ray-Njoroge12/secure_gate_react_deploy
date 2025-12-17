/**
 * @fileoverview Gradient Card Component
 * @description Enhanced card with gradient backgrounds, hover effects, and animations
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import './GradientCard.css';

/**
 * GradientCard Component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} props.variant - Card variant (primary, secondary, success, info, warning, danger, neutral)
 * @param {boolean} props.hoverable - Enable hover effects
 * @param {boolean} props.clickable - Enable click effects
 * @param {Function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Inline styles
 * @param {string} props.padding - Padding size (none, sm, md, lg)
 * @param {boolean} props.shadow - Enable shadow
 * @param {boolean} props.border - Enable border
 * @param {Object} props.rest - Additional props
 */
const GradientCard = ({
  children,
  variant = 'neutral',
  hoverable = false,
  clickable = false,
  onClick,
  className = '',
  style = {},
  padding = 'md',
  shadow = true,
  border = true,
  ...rest
}) => {
  // Determine card classes
  const cardClasses = [
    'gradient-card',
    `gradient-card--${variant}`,
    `gradient-card--padding-${padding}`,
    hoverable && 'gradient-card--hoverable',
    clickable && 'gradient-card--clickable',
    shadow && 'gradient-card--shadow',
    border && 'gradient-card--border',
    className
  ].filter(Boolean).join(' ');

  // Handle click
  const handleClick = (e) => {
    if (clickable && onClick) {
      onClick(e);
    }
  };

  // Handle keyboard interaction
  const handleKeyDown = (e) => {
    if (clickable && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e);
    }
  };

  const Component = clickable ? 'div' : 'div';

  return (
    <Component
      className={cardClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={style}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-pressed={clickable ? false : undefined}
      {...rest}
    >
      {children}
    </Component>
  );
};

/**
 * GradientCard.Header Component
 */
GradientCard.Header = ({ children, className = '', ...rest }) => (
  <div className={`gradient-card__header ${className}`} {...rest}>
    {children}
  </div>
);

/**
 * GradientCard.Body Component
 */
GradientCard.Body = ({ children, className = '', ...rest }) => (
  <div className={`gradient-card__body ${className}`} {...rest}>
    {children}
  </div>
);

/**
 * GradientCard.Footer Component
 */
GradientCard.Footer = ({ children, className = '', ...rest }) => (
  <div className={`gradient-card__footer ${className}`} {...rest}>
    {children}
  </div>
);

/**
 * GradientCard.Title Component
 */
GradientCard.Title = ({ children, className = '', as: Component = 'h3', ...rest }) => (
  <Component className={`gradient-card__title ${className}`} {...rest}>
    {children}
  </Component>
);

/**
 * GradientCard.Description Component
 */
GradientCard.Description = ({ children, className = '', ...rest }) => (
  <p className={`gradient-card__description ${className}`} {...rest}>
    {children}
  </p>
);

/**
 * GradientCard.Icon Component
 */
GradientCard.Icon = ({ children, className = '', ...rest }) => (
  <div className={`gradient-card__icon ${className}`} {...rest}>
    {children}
  </div>
);

export default GradientCard;
