/**
 * @fileoverview Modal component for Secure Gate Access
 * @description Accessible modal with focus trap and keyboard navigation
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createFocusTrap, focusManager } from '../../utils/focusManagement';
import { X } from 'lucide-react';

/**
 * Modal component with focus trap and keyboard navigation
 * 
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Function to call when modal should close
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} [props.title] - Modal title
 * @param {string} [props.size='md'] - Modal size ('sm', 'md', 'lg', 'xl', 'full')
 * @param {boolean} [props.closeOnOverlayClick=true] - Whether to close on overlay click
 * @param {boolean} [props.closeOnEscape=true] - Whether to close on Escape key
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {string} [props.ariaLabel] - ARIA label for the modal
 * @param {string} [props.ariaLabelledBy] - ID of element that labels the modal
 * @param {string} [props.ariaDescribedBy] - ID of element that describes the modal
 * @returns {JSX.Element} Modal component
 * 
 * @example
 * <Modal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   title="Confirm Action"
 *   size="md"
 * >
 *   <p>Are you sure you want to proceed?</p>
 * </Modal>
 */
const Modal = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy
}) => {
  const modalRef = useRef(null);
  const titleRef = useRef(null);
  const cleanupRef = useRef(null);

  // Size classes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full mx-4'
  };

  // Handle escape key
  const handleKeyDown = useCallback((event) => {
    if (closeOnEscape && event.key === 'Escape') {
      onClose();
    }
  }, [closeOnEscape, onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((event) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // Set up focus trap when modal opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Save current focus
      focusManager.saveFocus();

      // Create focus trap
      cleanupRef.current = createFocusTrap(modalRef.current, titleRef.current);

      // Focus the title or first focusable element
      if (titleRef.current) {
        titleRef.current.focus();
      } else {
        focusManager.focusFirst(modalRef.current);
      }

      // Add escape key listener
      document.addEventListener('keydown', handleKeyDown);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      return () => {
        // Cleanup
        if (cleanupRef.current) {
          cleanupRef.current();
        }
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, handleKeyDown]);

  // Restore focus when modal closes
  useEffect(() => {
    if (!isOpen) {
      focusManager.restoreFocus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`
          relative bg-slate-800 rounded-lg shadow-xl w-full
          ${sizeClasses[size]}
          ${className}
        `}
        role="document"
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            {title && (
              <h2
                ref={titleRef}
                id={ariaLabelledBy}
                className="text-xl font-semibold text-slate-200"
                tabIndex={-1}
              >
                {title}
              </h2>
            )}
            
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
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

export default Modal;