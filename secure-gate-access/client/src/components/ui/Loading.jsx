// client/src/components/ui/Loading.jsx
import React, { useEffect, useRef } from 'react';

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
      <svg 
        className={`animate-spin ${sizeClasses[size]} text-green-500`} 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4" 
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
        />
      </svg>
      {text && <span className="text-slate-400 animate-pulse">{text}</span>}
    </div>
  );
  
  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
          {spinner}
        </div>
      </div>
    );
  }
  
  return spinner;
};

export default Loading;