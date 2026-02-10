/**
 * @fileoverview Modal component for Secure Gate Access
 * @description Accessible modal with focus trap and keyboard navigation
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useEffect, useRef, useId, useCallback } from 'react';
import { createFocusTrap, focusManager } from '../../utils/focusManagement';
import Icon from './Icon.jsx';

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
  const titleId = useId();
  const titleRef = useRef(null);
  const cleanupRef = useRef(null);
  const resolvedAriaLabelledBy = ariaLabelledBy || (title ? titleId : undefined);

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
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={resolvedAriaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={handleOverlayClick}
        aria-hidden="true"
        role="presentation" // Add role for accessibility to indicate it's not interactive content but presentation
        tabIndex={-1} // Ensure it's not focused by keyboard navigation
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className={`
          relative bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg transform transition-all
          ${sizeClasses[size] || sizeClasses.md}
        `}
        tabIndex="-1"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          {title && (
            <h2
              id={titleId}
              ref={titleRef}
              className="text-lg font-semibold text-gray-900 dark:text-white outline-none"
              tabIndex="-1"
            >
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
            aria-label="Close modal"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
