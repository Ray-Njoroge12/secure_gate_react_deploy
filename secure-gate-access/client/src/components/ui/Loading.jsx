// client/src/components/ui/Loading.jsx
import React, { useEffect, useRef } from 'react';

import Icon from './Icon';

const Loading = ({ 
  size = 'md', 
  text = '',
  className = '',
  overlay = false,
  ...props 
}) => {
  const loadingRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to cancel loading (if supported)
      if (e.key === 'Escape' && loadingRef.current?.onCancel) {
        loadingRef.current.onCancel();
      }
    };

    const loading = loadingRef.current;
    if (loading) {
      loading.addEventListener('keydown', handleKeyDown);
      return () => loading.removeEventListener('keydown', handleKeyDown);
    }
  }, []);
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };
  
  const spinner = (
    <div ref={loadingRef} className={`inline-flex items-center gap-3 ${className}`} {...props}>
      <Icon 
        name="loader-2"
        className={`animate-spin text-brand-500 ${sizeClasses[size]}`}
        sizeOverride={size === 'sm' ? 16 : size === 'md' ? 32 : size === 'lg' ? 48 : 64}
        aria-hidden="true"
      />
      {text && <span className="text-slate-400 animate-pulse">{text}</span>}
    </div>
  );
  
  if (overlay) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8 border border-gray-200 dark:border-slate-700 shadow-2xl">
          {spinner}
        </div>
      </div>
    );
  }
  
  return spinner;
};

export default Loading;