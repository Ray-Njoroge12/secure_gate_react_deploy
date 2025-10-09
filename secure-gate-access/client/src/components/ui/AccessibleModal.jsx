// client/src/components/ui/AccessibleModal.jsx
import React, { useEffect, useRef } from 'react';
import { useAccessibility, useFocusManagement } from '../../hooks/useAccessibility';
import AccessibleButton from './AccessibleButton';

const AccessibleModal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  overlayClassName = '',
  contentClassName = '',
  titleClassName = '',
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  const { announce, createFocusTrap } = useAccessibility();
  const { containerRef } = useFocusManagement({ 
    trapFocus: true, 
    restoreFocus: true 
  });
  
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      // Store previous focus
      previousFocusRef.current = document.activeElement;
      
      // Announce modal opening
      announce(`Modal ${title || 'dialog'} opened`);
      
      // Focus first focusable element
      const timer = setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 100);

      return () => clearTimeout(timer);
    } else {
      // Restore previous focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
  }, [isOpen, title, announce]);

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle close
  const handleClose = () => {
    announce(`Modal ${title || 'dialog'} closed`);
    onClose();
  };

  // Size classes
  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    xlarge: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  if (!isOpen) return null;

  return (
    <div
      className={[
        'fixed',
        'inset-0',
        'z-50',
        'flex',
        'items-center',
        'justify-center',
        'p-4',
        'bg-black',
        'bg-opacity-50',
        'backdrop-blur-sm',
        overlayClassName
      ].join(' ')}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy || `${title?.replace(/\s+/g, '-').toLowerCase()}-title`}
      aria-describedby={ariaDescribedBy}
    >
      <div
        ref={containerRef}
        className={[
          'bg-white',
          'rounded-lg',
          'shadow-xl',
          'w-full',
          sizeClasses[size],
          'max-h-[90vh]',
          'overflow-hidden',
          'focus:outline-none',
          className
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            {title && (
              <h2
                id={ariaLabelledBy || `${title.replace(/\s+/g, '-').toLowerCase()}-title`}
                className={[
                  'text-lg',
                  'font-semibold',
                  'text-gray-900',
                  'm-0',
                  titleClassName
                ].join(' ')}
              >
                {title}
              </h2>
            )}
            
            {showCloseButton && (
              <AccessibleButton
                variant="ghost"
                size="small"
                onClick={handleClose}
                aria-label="Close modal"
                className="ml-auto"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </AccessibleButton>
            )}
          </div>
        )}

        {/* Content */}
        <div
          ref={modalRef}
          className={[
            'p-6',
            'overflow-y-auto',
            'max-h-[calc(90vh-120px)]',
            contentClassName
          ].join(' ')}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default AccessibleModal;




