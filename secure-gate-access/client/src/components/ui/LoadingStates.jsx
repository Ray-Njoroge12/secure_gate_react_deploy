// Enhanced loading states and progress indicators
import React, { useEffect, useRef, useState } from 'react';

import Button from './Button';
import Icon from './Icon';
import Skeleton from './Skeleton';

// Enhanced loading component with multiple variants
const Loading = ({ 
  size = 'md', 
  variant = 'spinner',
  text = '',
  className = '',
  overlay = false,
  progress = null,
  onCancel,
  ...props 
}) => {
  const loadingRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to cancel loading (if supported)
      if (e.key === 'Escape' && onCancel) {
        onCancel();
      }
    };

    const loading = loadingRef.current;
    if (loading) {
      loading.addEventListener('keydown', handleKeyDown);
      return () => loading.removeEventListener('keydown', handleKeyDown);
    }
  }, [onCancel]);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const renderSpinner = () => (
    <Icon 
      name="loader-2" 
      className={`animate-spin text-brand-500 ${sizeClasses[size]}`} 
      sizeOverride={size === 'sm' ? 16 : size === 'md' ? 32 : size === 'lg' ? 48 : 64}
      aria-hidden="true"
    />
  );

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${sizeClasses[size]} bg-brand-500 rounded-full animate-pulse`}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div className={`${sizeClasses[size]} bg-brand-500 rounded-full animate-pulse`} />
  );

  const renderProgress = () => (
    <div className="w-full max-w-xs">
      <div className="bg-gray-200 dark:bg-slate-700 rounded-full h-2">
        <div 
          className="bg-brand-500 rounded-full h-2 transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress || 0))}%` }}
        />
      </div>
      {progress !== null && (
        <div className="text-center text-sm text-gray-500 dark:text-slate-400 mt-1">
          {Math.round(progress)}%
        </div>
      )}
    </div>
  );

  const renderVariant = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'progress':
        return renderProgress();
      default:
        return renderSpinner();
    }
  };

  const content = (
    <div ref={loadingRef} className={`inline-flex items-center gap-3 ${className}`} {...props}>
      {renderVariant()}
      {text && <span className="text-gray-500 dark:text-slate-400 animate-pulse">{text}</span>}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-slate-900/75 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 text-center">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

// Loading button component
const LoadingButton = ({ 
  loading = false,
  loadingText = 'Loading...',
  children,
  disabled,
  ...props 
}) => (
  <Button 
    disabled={disabled || loading}
    loading={loading}
    {...props}
  >
    {loading ? loadingText : children}
  </Button>
);

// Loading card component
const LoadingCard = ({ 
  loading = false,
  skeleton = true,
  children,
  className = '',
  ...props 
}) => {
  if (loading && skeleton) {
    return <Skeleton.Card className={className} {...props} />;
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 ${className}`} {...props}>
        <div className="flex items-center justify-center py-8">
          <Loading text="Loading..." />
        </div>
      </div>
    );
  }

  return <div className={className} {...props}>{children}</div>;
};

// Loading table component
const LoadingTable = ({ 
  loading = false,
  skeleton = true,
  children,
  className = '',
  rows = 5,
  columns = 4,
  ...props 
}) => {
  if (loading && skeleton) {
    return <Skeleton.Table className={className} rows={rows} columns={columns} {...props} />;
  }

  if (loading) {
    return (
      <div className={`bg-slate-800 rounded-lg border border-slate-700 ${className}`} {...props}>
        <div className="flex items-center justify-center py-8">
          <Loading text="Loading data..." />
        </div>
      </div>
    );
  }

  return <div className={className} {...props}>{children}</div>;
};

// Loading form component
const LoadingForm = ({ 
  loading = false,
  skeleton = true,
  children,
  className = '',
  fields = 4,
  ...props 
}) => {
  if (loading && skeleton) {
    return <Skeleton.Form className={className} fields={fields} {...props} />;
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`} {...props}>
        <div className="flex items-center justify-center py-8">
          <Loading text="Loading form..." />
        </div>
      </div>
    );
  }

  return <div className={className} {...props}>{children}</div>;
};

// Loading list component
const LoadingList = ({ 
  loading = false,
  skeleton = true,
  children,
  className = '',
  items = 5,
  showAvatar = false,
  ...props 
}) => {
  if (loading && skeleton) {
    return <Skeleton.List className={className} items={items} showAvatar={showAvatar} {...props} />;
  }

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`} {...props}>
        <div className="flex items-center justify-center py-8">
          <Loading text="Loading items..." />
        </div>
      </div>
    );
  }

  return <div className={className} {...props}>{children}</div>;
};

// Loading dashboard component
const LoadingDashboard = ({ 
  loading = false,
  skeleton = true,
  children,
  className = '',
  ...props 
}) => {
  if (loading && skeleton) {
    return <Skeleton.Dashboard className={className} {...props} />;
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`} {...props}>
        <div className="flex items-center justify-center py-16">
          <Loading size="lg" text="Loading dashboard..." />
        </div>
      </div>
    );
  }

  return <div className={className} {...props}>{children}</div>;
};

// Loading overlay component
const LoadingOverlay = ({ 
  loading = false,
  children,
  message = 'Loading...',
  className = '',
  ...props 
}) => {
  if (!loading) return children;

  return (
    <div className={`relative ${className}`} {...props}>
      {children}
      <div className="absolute inset-0 bg-black/50 dark:bg-slate-900/75 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 text-center">
          <Loading size="lg" />
          <p className="text-gray-600 dark:text-slate-300 mt-4">{message}</p>
        </div>
      </div>
    </div>
  );
};

// Progress loading component
const ProgressLoading = ({ 
  progress = 0,
  message = 'Loading...',
  showPercentage = true,
  className = '',
  ...props 
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className={`text-center ${className}`} {...props}>
      <div className="mb-4">
        <div className="w-full max-w-xs mx-auto bg-gray-200 dark:bg-slate-700 rounded-full h-2">
          <div 
            className="bg-brand-500 rounded-full h-2 transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, displayProgress))}%` }}
          />
        </div>
        {showPercentage && (
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-2">
            {Math.round(displayProgress)}%
          </div>
        )}
      </div>
      <p className="text-gray-600 dark:text-slate-300">{message}</p>
    </div>
  );
};

// Export all loading components
Loading.Button = LoadingButton;
Loading.Card = LoadingCard;
Loading.Table = LoadingTable;
Loading.Form = LoadingForm;
Loading.List = LoadingList;
Loading.Dashboard = LoadingDashboard;
Loading.Overlay = LoadingOverlay;
Loading.Progress = ProgressLoading;

export default Loading;

