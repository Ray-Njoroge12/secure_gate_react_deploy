/**
 * Advanced Skeleton Screen Components
 * 
 * Comprehensive skeleton loading system with:
 * - Realistic content patterns
 * - Responsive design
 * - Accessibility support
 * - Performance optimization
 * - Customizable animations
 */

import React, { useState, useEffect } from 'react';

// Base skeleton component with enhanced animations
const BaseSkeleton = ({ 
  className = '',
  variant = 'rect',
  width = '100%',
  height = '1rem',
  animated = true,
  shimmer = true,
  addAriaAttributes = true,
  ...props 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Stagger animation for better visual effect
    const timer = setTimeout(() => setIsVisible(true), Math.random() * 200);
    return () => clearTimeout(timer);
  }, []);

  const baseClasses = `
    bg-slate-700 rounded
    ${animated ? 'animate-pulse' : ''}
    ${shimmer ? 'relative overflow-hidden' : ''}
    ${isVisible ? 'opacity-100' : 'opacity-0'}
    transition-opacity duration-300
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  // Shimmer effect
  const shimmerEffect = shimmer ? (
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
  ) : null;

  if (variant === 'circle') {
    return (
      <div
        {...(addAriaAttributes && { role: "status", "aria-label": "Loading..." })}
        className={`${baseClasses} rounded-full`}
        style={style}
        {...props}
      >
        {shimmerEffect}
      </div>
    );
  }

  if (variant === 'text' && typeof width === 'string' && width.includes('%')) {
    // Multi-line text skeleton
    const lines = Math.floor(Math.random() * 3) + 2;
    return (
      <div 
        className="space-y-2" 
        {...(addAriaAttributes && { role: "status", "aria-label": "Loading..." })}
        {...props}
      >
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={baseClasses}
            style={{
              ...style,
              width: index === lines - 1 ? '75%' : '100%'
            }}
          >
            {shimmerEffect}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      {...(addAriaAttributes && { role: "status", "aria-label": "Loading..." })}
      className={baseClasses}
      style={style}
      {...props}
    >
      {shimmerEffect}
    </div>
  );
};

// Card skeleton with realistic patterns
const SkeletonCard = ({ 
  className = '',
  showAvatar = false,
  showActions = false,
  showImage = false,
  lines = 3,
  variant = 'default',
  addAriaAttributes = true
}) => {
  const cardVariants = {
    default: (
      <div className="space-y-4">
        {showImage && (
          <BaseSkeleton height="200px" className="w-full rounded-t-lg" addAriaAttributes={false} />
        )}
        <div className="p-6 space-y-4">
          <div className="flex items-start space-x-4">
            {showAvatar && (
              <BaseSkeleton 
                variant="circle" 
                width={48} 
                height={48} 
                className="flex-shrink-0"
                addAriaAttributes={false}
              />
            )}
            <div className="flex-1 space-y-3">
              <BaseSkeleton height="1.25rem" width="60%" addAriaAttributes={false} />
              <BaseSkeleton height="1rem" width="40%" addAriaAttributes={false} />
            </div>
          </div>
          <BaseSkeleton variant="text" lines={lines} addAriaAttributes={false} />
          {showActions && (
            <div className="flex space-x-2 pt-2">
              <BaseSkeleton height="2rem" width="5rem" addAriaAttributes={false} />
              <BaseSkeleton height="2rem" width="5rem" addAriaAttributes={false} />
            </div>
          )}
        </div>
      </div>
    ),
    compact: (
      <div className="p-4 space-y-3">
        <div className="flex items-center space-x-3">
          {showAvatar && (
            <BaseSkeleton variant="circle" width={32} height={32} addAriaAttributes={false} />
          )}
          <div className="flex-1 space-y-2">
            <BaseSkeleton height="1rem" width="70%" addAriaAttributes={false} />
            <BaseSkeleton height="0.75rem" width="50%" addAriaAttributes={false} />
          </div>
        </div>
        <BaseSkeleton variant="text" lines={2} addAriaAttributes={false} />
      </div>
    ),
    minimal: (
      <div className="p-3 space-y-2">
        <BaseSkeleton height="1rem" width="80%" addAriaAttributes={false} />
        <BaseSkeleton height="0.75rem" width="60%" addAriaAttributes={false} />
      </div>
    )
  };

  return (
    <div
      {...(addAriaAttributes && { role: "status", "aria-label": "Loading..." })}
      className={`bg-slate-800 rounded-lg border border-slate-700 overflow-hidden ${className}`}
    >
      {cardVariants[variant] || cardVariants.default}
    </div>
  );
};

// Table skeleton with realistic data patterns
const SkeletonTable = ({ 
  className = '',
  rows = 5,
  columns = 4,
  showHeader = true,
  showPagination = false,
  variant = 'default',
  addAriaAttributes = true
}) => {
  const tableVariants = {
    default: (
      <div className="space-y-4">
        {showHeader && (
          <div className="bg-slate-700 px-4 py-2 border-b border-slate-600">
            <div className="flex space-x-3">
              {Array.from({ length: columns }, (_, index) => (
                <BaseSkeleton 
                  key={index}
                  height="0.875rem" 
                  width={`${Math.random() * 40 + 40}%`} 
                  addAriaAttributes={false}
                />
              ))}
            </div>
          </div>
        )}
        <div className="divide-y divide-slate-700">
          {Array.from({ length: rows }, (_, rowIndex) => (
            <div key={rowIndex} className="px-4 py-2">
              <div className="flex space-x-3">
                {Array.from({ length: columns }, (_, colIndex) => (
                  <BaseSkeleton 
                    key={colIndex}
                    height="0.875rem" 
                    width={`${Math.random() * 30 + 40}%`} 
                    addAriaAttributes={false}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        {showPagination && (
          <div className="flex justify-between items-center px-4 py-2">
            <BaseSkeleton height="0.875rem" width="6rem" addAriaAttributes={false} />
            <div className="flex space-x-2">
              <BaseSkeleton height="2rem" width="2rem" addAriaAttributes={false} />
              <BaseSkeleton height="2rem" width="2rem" addAriaAttributes={false} />
              <BaseSkeleton height="2rem" width="2rem" addAriaAttributes={false} />
            </div>
          </div>
        )}
      </div>
    ),
    compact: (
      <div className="space-y-2">
        {showHeader && (
          <div className="bg-slate-700 px-3 py-1 border-b border-slate-600">
            <div className="flex space-x-2">
              {Array.from({ length: columns }, (_, index) => (
                <BaseSkeleton 
                  key={index}
                  height="0.75rem" 
                  width={`${Math.random() * 30 + 30}%`} 
                  addAriaAttributes={false}
                />
              ))}
            </div>
          </div>
        )}
        <div className="divide-y divide-slate-700">
          {Array.from({ length: rows }, (_, rowIndex) => (
            <div key={rowIndex} className="px-3 py-1">
              <div className="flex space-x-2">
                {Array.from({ length: columns }, (_, colIndex) => (
                  <BaseSkeleton 
                    key={colIndex}
                    height="0.75rem" 
                    width={`${Math.random() * 25 + 25}%`} 
                    addAriaAttributes={false}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  };

  return (
    <div
      {...(addAriaAttributes && { role: "status", "aria-label": "Loading..." })}
      className={`bg-slate-800 rounded-lg border border-slate-700 overflow-hidden ${className}`}
    >
      {tableVariants[variant] || tableVariants.default}
    </div>
  );
};

// Form skeleton with realistic field patterns
const SkeletonForm = ({ 
  className = '',
  fields = 4,
  showSubmitButton = true,
  showLabels = true,
  variant = 'default'
}) => {
  const formVariants = {
    default: (
      <div className="space-y-6">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="space-y-2">
            {showLabels && (
              <BaseSkeleton height="0.875rem" width="25%" addAriaAttributes={false} />
            )}
            <BaseSkeleton height="2.5rem" width="100%" addAriaAttributes={false} />
          </div>
        ))}
        {showSubmitButton && (
          <div className="flex space-x-3">
            <BaseSkeleton height="2.5rem" width="6rem" addAriaAttributes={false} />
            <BaseSkeleton height="2.5rem" width="6rem" addAriaAttributes={false} />
          </div>
        )}
      </div>
    ),
    inline: (
      <div className="space-y-4">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="flex items-center space-x-3">
            {showLabels && (
              <BaseSkeleton height="0.875rem" width="20%" addAriaAttributes={false} />
            )}
            <BaseSkeleton height="2rem" width="60%" addAriaAttributes={false} />
          </div>
        ))}
      </div>
    ),
    compact: (
      <div className="space-y-3">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="space-y-1">
            {showLabels && (
              <BaseSkeleton height="0.75rem" width="30%" addAriaAttributes={false} />
            )}
            <BaseSkeleton height="2rem" width="100%" addAriaAttributes={false} />
          </div>
        ))}
      </div>
    )
  };

  return (
    <div
      role="status"
      aria-label="Loading..."
      className={`bg-slate-800 rounded-lg border border-slate-700 p-6 ${className}`}
    >
      {formVariants[variant] || formVariants.default}
    </div>
  );
};

// List skeleton with realistic item patterns
const SkeletonList = ({ 
  className = '',
  items = 5,
  showAvatar = false,
  showActions = false,
  variant = 'default'
}) => {
  const listVariants = {
    default: (
      <div className="space-y-3">
        {Array.from({ length: items }, (_, index) => (
          <div key={index} className="flex items-center space-x-3 p-3">
            {showAvatar && (
              <BaseSkeleton variant="circle" width={40} height={40} addAriaAttributes={false} />
            )}
            <div className="flex-1 space-y-2">
              <BaseSkeleton height="1rem" width={`${Math.random() * 40 + 40}%`} addAriaAttributes={false} />
              <BaseSkeleton height="0.75rem" width={`${Math.random() * 30 + 30}%`} addAriaAttributes={false} />
            </div>
            {showActions && (
              <div className="flex space-x-2">
                <BaseSkeleton height="1.5rem" width="1.5rem" addAriaAttributes={false} />
                <BaseSkeleton height="1.5rem" width="1.5rem" addAriaAttributes={false} />
              </div>
            )}
          </div>
        ))}
      </div>
    ),
    compact: (
      <div className="space-y-2">
        {Array.from({ length: items }, (_, index) => (
          <div key={index} className="flex items-center space-x-2 p-2">
            {showAvatar && (
              <BaseSkeleton variant="circle" width={24} height={24} addAriaAttributes={false} />
            )}
            <div className="flex-1 space-y-1">
              <BaseSkeleton height="0.875rem" width={`${Math.random() * 30 + 40}%`} addAriaAttributes={false} />
              <BaseSkeleton height="0.75rem" width={`${Math.random() * 20 + 30}%`} addAriaAttributes={false} />
            </div>
          </div>
        ))}
      </div>
    ),
    minimal: (
      <div className="space-y-1">
        {Array.from({ length: items }, (_, index) => (
          <div key={index} className="p-2">
            <BaseSkeleton height="0.875rem" width={`${Math.random() * 40 + 30}%`} addAriaAttributes={false} />
          </div>
        ))}
      </div>
    )
  };

  return (
    <div
      role="status"
      aria-label="Loading..."
      className={`bg-slate-800 rounded-lg border border-slate-700 ${className}`}
    >
      {listVariants[variant] || listVariants.default}
    </div>
  );
};

// Dashboard skeleton with realistic layout patterns
const SkeletonDashboard = ({ 
  className = '',
  variant = 'default'
}) => {
  const dashboardVariants = {
    default: (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <BaseSkeleton height="1.5rem" width="30%" addAriaAttributes={false} />
            <BaseSkeleton height="0.875rem" width="50%" addAriaAttributes={false} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="bg-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <BaseSkeleton height="0.875rem" width="6rem" addAriaAttributes={false} />
                    <BaseSkeleton height="1.5rem" width="3rem" addAriaAttributes={false} />
                  </div>
                  <BaseSkeleton variant="circle" width={48} height={48} addAriaAttributes={false} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard showImage showActions lines={2} addAriaAttributes={false} />
          <SkeletonTable rows={3} columns={2} addAriaAttributes={false} />
        </div>
      </div>
    ),
    compact: (
      <div className="space-y-4">
        <div className="space-y-1">
          <BaseSkeleton height="1.25rem" width="25%" addAriaAttributes={false} />
          <BaseSkeleton height="0.75rem" width="40%" addAriaAttributes={false} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="bg-slate-800 rounded-lg p-3">
              <BaseSkeleton height="0.875rem" width="6rem" addAriaAttributes={false} />
              <BaseSkeleton height="1.5rem" width="3rem" addAriaAttributes={false} />
            </div>
          ))}
        </div>
      </div>
    )
  };

  return (
    <div
      role="status"
      aria-label="Loading..."
      className={`space-y-6 ${className}`}
    >
      {dashboardVariants[variant] || dashboardVariants.default}
    </div>
  );
};

// Chart skeleton with realistic data visualization patterns
const SkeletonChart = ({ 
  className = '',
  type = 'line',
  height = '300px'
}) => {
  const chartVariants = {
    line: (
      <div className="space-y-4">
        <BaseSkeleton height="1.25rem" width="40%" addAriaAttributes={false} />
        <div className="flex items-end space-x-2" style={{ height }}>
          {Array.from({ length: 8 }, (_, index) => (
            <BaseSkeleton 
              key={index}
              height={`${Math.random() * 60 + 20}%`} 
              width="12%" 
              className="rounded-t"
              addAriaAttributes={false}
            />
          ))}
        </div>
      </div>
    ),
    bar: (
      <div className="space-y-4">
        <BaseSkeleton height="1.25rem" width="40%" addAriaAttributes={false} />
        <div className="flex items-end space-x-2" style={{ height }}>
          {Array.from({ length: 8 }, (_, index) => (
            <BaseSkeleton 
              key={index}
              height={`${Math.random() * 60 + 20}%`} 
              width="12%" 
              className="rounded-t"
              addAriaAttributes={false}
            />
          ))}
        </div>
      </div>
    ),
    pie: (
      <div className="flex items-center space-x-6">
        <div className="w-32 h-32 rounded-full bg-slate-700 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex items-center space-x-2">
              <BaseSkeleton height="0.75rem" width="0.75rem" className="rounded-full" addAriaAttributes={false} />
              <BaseSkeleton height="0.875rem" width="6rem" addAriaAttributes={false} />
            </div>
          ))}
        </div>
      </div>
    )
  };

  return (
    <div
      role="status"
      aria-label="Loading..."
      className={`bg-slate-800 rounded-lg border border-slate-700 p-6 ${className}`}
    >
      {chartVariants[type] || chartVariants.line}
    </div>
  );
};

// Export all skeleton components
const AdvancedSkeleton = {
  Base: BaseSkeleton,
  Card: SkeletonCard,
  Table: SkeletonTable,
  Form: SkeletonForm,
  List: SkeletonList,
  Dashboard: SkeletonDashboard,
  Chart: SkeletonChart,
};

export default AdvancedSkeleton;