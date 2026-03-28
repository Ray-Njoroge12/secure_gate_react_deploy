import PropTypes from 'prop-types';
import React from 'react';

/**
 * Progress component for displaying progress bars
 * @param {Object} props - Component props
 * @param {number} props.value - Current progress value (0-100)
 * @param {number} props.max - Maximum progress value (default: 100)
 * @param {string} props.size - Size variant (sm, md, lg)
 * @param {string} props.variant - Color variant (primary, secondary, success, warning, error)
 * @param {boolean} props.animated - Whether to show animation
 * @param {string} props.label - Optional label text
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Progress component
 */
const Progress = ({
  value = 0,
  max = 100,
  size = 'md',
  variant = 'primary',
  animated = false,
  label,
  className = '',
  ...props
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantClasses = {
    primary: 'bg-brand-600',
    secondary: 'bg-slate-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600',
  };

  const baseClasses = 'w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden';
  const progressClasses = `h-full transition-all duration-300 ease-in-out ${variantClasses[variant]} ${
    animated ? 'animate-pulse' : ''
  }`;

  return (
    <div className={`${baseClasses} ${sizeClasses[size]} ${className}`} {...props}>
      <div
        className={progressClasses}
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || `Progress: ${Math.round(percentage)}%`}
      />
    </div>
  );
};

Progress.propTypes = {
  value: PropTypes.number,
  max: PropTypes.number,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'warning', 'error']),
  animated: PropTypes.bool,
  label: PropTypes.string,
  className: PropTypes.string,
};

export default Progress;



