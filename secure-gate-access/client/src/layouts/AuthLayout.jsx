// AuthLayout - Clean, professional authentication layout from original design
import React, { useEffect, useRef } from 'react';

export default function AuthLayout({ title, subtitle, children }) {
  const authRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to clear any error messages
      if (e.key === 'Escape') {
        const errorElements = document.querySelectorAll('.error-message, .alert');
        errorElements.forEach(el => el.style.display = 'none');
      }
      // Ctrl/Cmd + Enter to submit forms
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const form = document.querySelector('form');
        if (form) {
          const submitButton = form.querySelector('button[type="submit"]');
          if (submitButton && !submitButton.disabled) {
            submitButton.click();
          }
        }
      }
      // Tab to navigate between form elements
      if (e.key === 'Tab') {
        const focusableElements = authRef.current?.querySelectorAll(
          'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements && focusableElements.length > 0) {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      }
    };

    const auth = authRef.current;
    if (auth) {
      auth.addEventListener('keydown', handleKeyDown);
      return () => auth.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  return (
    <div ref={authRef} className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 py-12">
      {/* Skip Navigation Link - Accessibility */}
      <a 
        href="#auth-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-green-600 text-white px-4 py-2 rounded-md font-medium"
      >
        Skip to main content
      </a>
      
      <main id="auth-content" role="main" className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl mb-4" aria-hidden="true">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">SecureGate</h2>
        </div>
        
        {/* Auth Card */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
          {/* Green Accent Bar */}
          <div className="h-1 bg-gradient-to-r from-green-400 via-green-500 to-green-600"></div>
          
          <div className="p-8">
            {/* Title & Subtitle */}
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
              {subtitle && <p className="text-lg text-gray-600 dark:text-gray-300">{subtitle}</p>}
            </div>
            
            {/* Content */}
            {children}
          </div>
        </div>
        
        {/* Footer */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6">
          &copy; 2025 SecureGate • Privacy • Terms
        </p>
      </main>
    </div>
  );
}