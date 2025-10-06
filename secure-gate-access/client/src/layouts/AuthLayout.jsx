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
    <div ref={authRef} className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        <div className="bg-white border border-gray-200 rounded-smooth shadow-card p-6">
          {children}
        </div>
        <p className="text-xs text-gray-500 text-center mt-4">
          Secure Gate Access System
        </p>
      </div>
    </div>
  );
}