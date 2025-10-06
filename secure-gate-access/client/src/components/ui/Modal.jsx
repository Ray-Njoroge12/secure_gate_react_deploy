// client/src/components/ui/Modal.jsx
import React, { useEffect, useRef } from 'react';
import { Button } from './Button';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  size = 'md',
  showCloseButton = true,
  preventCloseOnBackdrop = false,
  className = '',
  ...props 
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg', 
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };
  
  // Focus trap functionality
  const trapFocus = (e) => {
    if (!modalRef.current) return;
    
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    }
  };
  
  // Handle escape key and focus management
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    
    if (isOpen) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement;
      
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', trapFocus);
      document.body.style.overflow = 'hidden';
      
      // Focus the modal when it opens
      setTimeout(() => {
        modalRef.current?.focus();
      }, 100);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', trapFocus);
      document.body.style.overflow = 'unset';
      
      // Restore focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !preventCloseOnBackdrop) {
      onClose?.();
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div 
        ref={modalRef}
        tabIndex={-1}
        className={`
          bg-slate-800 rounded-lg border border-slate-700 shadow-xl 
          transform transition-all duration-200 
          w-full ${sizeClasses[size]} 
          max-h-[90vh] overflow-auto
          focus:outline-none
          ${className}
        `}
        {...props}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            {title && (
              <h2 id="modal-title" className="text-xl font-semibold text-slate-200">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 transition-colors p-2 -mr-2"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const ModalHeader = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
);

const ModalBody = ({ children, className = '' }) => (
  <div className={className}>
    {children}
  </div>
);

const ModalFooter = ({ children, className = '' }) => (
  <div className={`flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700 ${className}`}>
    {children}
  </div>
);

Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export default Modal;