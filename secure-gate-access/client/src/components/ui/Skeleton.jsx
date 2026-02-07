// Enhanced skeleton screen components for loading states
import React from 'react';

const Skeleton = ({ 
  className = '',
  variant = 'text',
  width = '100%',
  height = '1rem',
  lines = 1,
  animated = true,
  ...props 
}) => {
  const baseClasses = `
    bg-gray-200 dark:bg-slate-700 rounded
    ${animated ? 'animate-pulse' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2" {...props}>
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={baseClasses}
            style={{
              ...style,
              width: index === lines - 1 ? '75%' : '100%'
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={baseClasses}
      style={style}
      {...props}
    />
  );
};

// Card skeleton component
const SkeletonCard = ({ 
  className = '',
  showAvatar = false,
  showActions = false,
  lines = 3,
  ...props 
}) => (
  <div className={`bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 ${className}`} {...props}>
    <div className="flex items-start space-x-4">
      {showAvatar && (
        <Skeleton 
          variant="circle" 
          width={40} 
          height={40} 
          className="flex-shrink-0"
        />
      )}
      <div className="flex-1 space-y-3">
        <Skeleton height="1.25rem" width="60%" />
        <Skeleton lines={lines} />
        {showActions && (
          <div className="flex space-x-2 pt-2">
            <Skeleton height="2rem" width="5rem" />
            <Skeleton height="2rem" width="5rem" />
          </div>
        )}
      </div>
    </div>
  </div>
);

// Table skeleton component
const SkeletonTable = ({ 
  className = '',
  rows = 5,
  columns = 4,
  showHeader = true,
  ...props 
}) => (
  <div className={`bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden ${className}`} {...props}>
    {showHeader && (
      <div className="bg-gray-100 dark:bg-slate-700 px-6 py-3 border-b border-gray-200 dark:border-slate-600">
        <div className="flex space-x-4">
          {Array.from({ length: columns }, (_, index) => (
            <Skeleton 
              key={index} 
              height="1rem" 
              width={`${Math.random() * 40 + 60}%`}
            />
          ))}
        </div>
      </div>
    )}
    <div className="divide-y divide-gray-200 dark:divide-slate-700">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4">
          <div className="flex space-x-4">
            {Array.from({ length: columns }, (_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                height="1rem" 
                width={`${Math.random() * 40 + 60}%`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Form skeleton component
const SkeletonForm = ({ 
  className = '',
  fields = 4,
  showSubmit = true,
  ...props 
}) => (
  <div className={`space-y-6 ${className}`} {...props}>
    {Array.from({ length: fields }, (_, index) => (
      <div key={index} className="space-y-2">
        <Skeleton height="1rem" width="25%" />
        <Skeleton height="2.5rem" width="100%" />
      </div>
    ))}
    {showSubmit && (
      <div className="flex justify-end space-x-3 pt-4">
        <Skeleton height="2.5rem" width="6rem" />
        <Skeleton height="2.5rem" width="6rem" />
      </div>
    )}
  </div>
);

// List skeleton component
const SkeletonList = ({ 
  className = '',
  items = 5,
  showAvatar = false,
  ...props 
}) => (
  <div className={`space-y-3 ${className}`} {...props}>
    {Array.from({ length: items }, (_, index) => (
      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
        {showAvatar && (
          <Skeleton 
            variant="circle" 
            width={32} 
            height={32} 
            className="flex-shrink-0"
          />
        )}
        <div className="flex-1 space-y-2">
          <Skeleton height="1rem" width={`${Math.random() * 40 + 40}%`} />
          <Skeleton height="0.75rem" width={`${Math.random() * 30 + 30}%`} />
        </div>
      </div>
    ))}
  </div>
);

// Dashboard skeleton component
const SkeletonDashboard = ({ 
  className = '',
  ...props 
}) => (
  <div className={`space-y-6 ${className}`} {...props}>
    {/* Header */}
    <div className="space-y-2">
      <Skeleton height="2rem" width="40%" />
      <Skeleton height="1rem" width="60%" />
    </div>
    
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton height="1rem" width="8rem" />
              <Skeleton height="2rem" width="4rem" />
            </div>
            <Skeleton 
              variant="circle" 
              width={48} 
              height={48} 
            />
          </div>
        </div>
      ))}
    </div>
    
    {/* Content Area */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SkeletonCard lines={4} showActions />
      <SkeletonTable rows={4} columns={3} />
    </div>
  </div>
);

// Loading overlay component
const SkeletonOverlay = ({ 
  className = '',
  children,
  loading = false,
  message = 'Loading...',
  ...props 
}) => {
  if (!loading) return children;

  return (
    <div className={`relative ${className}`} {...props}>
      {children}
      <div className="absolute inset-0 bg-white/75 dark:bg-slate-900/75 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-300">{message}</p>
        </div>
      </div>
    </div>
  );
};

// Progress skeleton component
const SkeletonProgress = ({ 
  className = '',
  progress = 0,
  showPercentage = true,
  size = 'md',
  ...props 
}) => {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={`space-y-2 ${className}`} {...props}>
      <div className={`bg-gray-200 dark:bg-slate-700 rounded-full ${sizeClasses[size]}`}>
        <div 
          className="bg-brand-500 rounded-full transition-all duration-300 ease-out"
          style={{ 
            width: `${Math.min(100, Math.max(0, progress))}%`,
            height: '100%'
          }}
        />
      </div>
      {showPercentage && (
        <div className="text-right text-sm text-gray-600 dark:text-slate-400">
          {Math.round(progress)}%
        </div>
      )}
    </div>
  );
};

// Export all skeleton components
Skeleton.Card = SkeletonCard;
Skeleton.Table = SkeletonTable;
Skeleton.Form = SkeletonForm;
Skeleton.List = SkeletonList;
Skeleton.Dashboard = SkeletonDashboard;
Skeleton.Overlay = SkeletonOverlay;
Skeleton.Progress = SkeletonProgress;

export default Skeleton;

