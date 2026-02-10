import React from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon';

/**
 * ProgressIndicator Component
 * 
 * A flexible progress indicator that can display progress as a bar, circle, or steps.
 * Supports accessibility features and customizable styling.
 * 
 * Features:
 * - Multiple display modes (bar, circle, steps)
 * - Accessibility compliant with ARIA attributes
 * - Customizable colors and sizes
 * - Optional labels and percentage display
 * - Responsive design
 * 
 * @param {Object} props - Component props
 * @param {number} props.current - Current progress value
 * @param {number} props.total - Total/maximum progress value
 * @param {number} props.percentage - Direct percentage value (0-100)
 * @param {'bar'|'circle'|'steps'} props.variant - Display variant
 * @param {'sm'|'md'|'lg'} props.size - Size variant
 * @param {boolean} props.showLabels - Whether to show current/total labels
 * @param {boolean} props.showPercentage - Whether to show percentage
 * @param {string} props.color - Progress color (CSS class or hex)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.label - Accessible label for the progress
 */
const ProgressIndicator = ({
  current = 0,
  total = 100,
  percentage = null,
  variant = 'bar',
  size = 'md',
  showLabels = false,
  showPercentage = false,
  color = 'blue',
  className = '',
  label = 'Progress indicator',
  ...props
}) => {
  // Calculate percentage if not provided directly
  const progressPercentage = percentage !== null 
    ? Math.max(0, Math.min(100, percentage))
    : Math.max(0, Math.min(100, (current / total) * 100));

  // Size configurations
  const sizeConfig = {
    sm: {
      bar: 'h-1',
      circle: 'w-8 h-8',
      text: 'text-xs',
      step: 'w-6 h-6 text-xs'
    },
    md: {
      bar: 'h-2',
      circle: 'w-12 h-12',
      text: 'text-sm',
      step: 'w-8 h-8 text-sm'
    },
    lg: {
      bar: 'h-3',
      circle: 'w-16 h-16',
      text: 'text-base',
      step: 'w-10 h-10 text-base'
    }
  };

  // Color configurations
  const colorConfig = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    indigo: 'bg-indigo-500'
  };

  const progressColor = colorConfig[color] || color;
  const config = sizeConfig[size];

  // Bar variant
  if (variant === 'bar') {
    return (
      <div className={`progress-indicator progress-indicator--bar ${className}`} {...props}>
        {(showLabels || showPercentage) && (
          <div className="flex items-center justify-between mb-2">
            {showLabels && (
              <span className={`font-medium text-gray-700 dark:text-gray-300 ${config.text}`}>
                {current} of {total}
              </span>
            )}
            {showPercentage && (
              <span className={`font-medium text-gray-700 dark:text-gray-300 ${config.text}`}>
                {Math.round(progressPercentage)}%
              </span>
            )}
          </div>
        )}
        
        <div 
          className={`w-full bg-gray-200 dark:bg-slate-700 rounded-full ${config.bar}`}
          role="progressbar"
          aria-valuenow={Math.round(progressPercentage)}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label={label}
        >
          <div
            className={`${progressColor} ${config.bar} rounded-full transition-all duration-300 ease-out`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    );
  }

  // Circle variant
  if (variant === 'circle') {
    const radius = size === 'sm' ? 14 : size === 'md' ? 20 : 28;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

    return (
      <div className={`progress-indicator progress-indicator--circle ${className} flex flex-col items-center`} {...props}>
        <div className={`relative ${config.circle}`}>
          <svg
            className="transform -rotate-90 w-full h-full"
            viewBox={`0 0 ${radius * 2 + 8} ${radius * 2 + 8}`}
            role="progressbar"
            aria-valuenow={Math.round(progressPercentage)}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label={label}
          >
            {/* Background circle */}
            <circle
              cx={radius + 4}
              cy={radius + 4}
              r={radius}
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-gray-200 dark:text-gray-300"
            />
            {/* Progress circle */}
            <circle
              cx={radius + 4}
              cy={radius + 4}
              r={radius}
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={progressColor.replace('bg-', 'text-')}
              style={{
                transition: 'stroke-dashoffset 0.3s ease-out'
              }}
            />
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-semibold text-gray-900 dark:text-white ${config.text}`}>
              {showPercentage ? `${Math.round(progressPercentage)}%` : current}
            </span>
          </div>
        </div>
        
        {showLabels && (
          <span className={`mt-2 text-gray-600 dark:text-gray-300 ${config.text}`}>
            {current} of {total}
          </span>
        )}
      </div>
    );
  }

  // Steps variant
  if (variant === 'steps') {
    const steps = Array.from({ length: total }, (_, index) => index + 1);
    
    return (
      <div className={`progress-indicator progress-indicator--steps ${className}`} {...props}>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = step <= current;
            const isCurrent = step === current;
            const isLast = index === steps.length - 1;
            
            return (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      ${config.step} rounded-full flex items-center justify-center font-medium transition-all duration-200
                      ${isCompleted 
                        ? `${progressColor} text-white` 
                        : isCurrent
                          ? `border-2 border-${color}-500 text-${color}-500 bg-white dark:bg-slate-800`
                          : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-300'
                      }
                    `}
                    role="progressbar"
                    aria-valuenow={step}
                    aria-valuemin="1"
                    aria-valuemax={total}
                    aria-label={`Step ${step} of ${total}${isCompleted ? ' - completed' : isCurrent ? ' - current' : ''}`}
                  >
                    {isCompleted && step < current ? (
                      <Icon name="check" sizeOverride={16} aria-hidden="true" />
                    ) : (
                      step
                    )}
                  </div>
                  
                  {showLabels && (
                    <span className={`mt-1 text-gray-600 dark:text-gray-300 ${config.text}`}>
                      Step {step}
                    </span>
                  )}
                </div>
                
                {!isLast && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    step < current ? progressColor : 'bg-gray-200 dark:bg-slate-700'
                  } transition-colors duration-200`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        
        {showPercentage && (
          <div className="text-center mt-3">
            <span className={`font-medium text-gray-700 dark:text-gray-300 ${config.text}`}>
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>
        )}
      </div>
    );
  }

  return null;
};

ProgressIndicator.propTypes = {
  current: PropTypes.number,
  total: PropTypes.number,
  percentage: PropTypes.number,
  variant: PropTypes.oneOf(['bar', 'circle', 'steps']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showLabels: PropTypes.bool,
  showPercentage: PropTypes.bool,
  color: PropTypes.string,
  className: PropTypes.string,
  label: PropTypes.string
};

export default ProgressIndicator;