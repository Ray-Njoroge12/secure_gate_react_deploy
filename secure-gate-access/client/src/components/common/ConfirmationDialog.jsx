/**
 * @file ConfirmationDialog.jsx
 * @description Reusable confirmation dialog with undo integration
 * Phase 4: UI/UX Improvements - Destructive Action Protection
 * 
 * Features:
 * - Multiple variants (danger, warning, info)
 * - Undo support integration
 * - Keyboard accessible
 * - Animation support
 * - Double-confirm for critical actions
 */

import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import Button from '../ui/Button';

const variants = {
  danger: {
    icon: '⚠️',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    buttonBg: 'bg-red-600 hover:bg-red-700',
    buttonFocusRing: 'focus-visible:ring-red-500',
    title: 'Confirm Deletion',
  },
  warning: {
    icon: '⚡',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    buttonBg: 'bg-amber-600 hover:bg-amber-700',
    buttonFocusRing: 'focus-visible:ring-amber-500',
    title: 'Confirm Action',
  },
  info: {
    icon: 'ℹ️',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    buttonBg: 'bg-blue-600 hover:bg-blue-700',
    buttonFocusRing: 'focus-visible:ring-blue-500',
    title: 'Confirmation',
  },
  success: {
    icon: '✅',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    buttonBg: 'bg-green-600 hover:bg-green-700',
    buttonFocusRing: 'focus-visible:ring-green-500',
    title: 'Confirm',
  },
};

/**
 * Confirmation Dialog Component
 */
const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  variant = 'danger',
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonProps = {},
  cancelButtonProps = {},
  showUndo = false,
  undoText = 'You can undo this action for 30 seconds',
  requireDoubleConfirm = false,
  doubleConfirmText = 'Type DELETE to confirm',
  doubleConfirmValue = 'DELETE',
  isLoading = false,
  icon,
  children,
  requiresMFA = false,
  mfaWarning = 'This operation requires Multi-Factor Authentication to be enabled.',
  consequences = [],
}) => {
  const [doubleConfirmInput, setDoubleConfirmInput] = useState('');
  const [isConfirmEnabled, setIsConfirmEnabled] = useState(!requireDoubleConfirm);
  const dialogRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const inputRef = useRef(null);
  const uniqueId = useId();
  const titleId = `dialog-title-${uniqueId}`;
  const descId = `dialog-description-${uniqueId}`;

  const variantStyle = variants[variant] || variants.info;

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setDoubleConfirmInput('');
      setIsConfirmEnabled(!requireDoubleConfirm);
      // Focus first focusable element
      setTimeout(() => {
        if (requireDoubleConfirm) {
          inputRef.current?.focus();
        } else {
          cancelButtonRef.current?.focus();
        }
      }, 100);
    }
  }, [isOpen, requireDoubleConfirm]);

  // Handle double confirm input
  useEffect(() => {
    if (requireDoubleConfirm) {
      setIsConfirmEnabled(
        doubleConfirmInput.toLowerCase() === doubleConfirmValue.toLowerCase()
      );
    }
  }, [doubleConfirmInput, requireDoubleConfirm, doubleConfirmValue]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
      if (e.key === 'Tab') {
        // Trap focus within dialog
        const focusableElements = dialogRef.current?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const firstEl = focusableElements?.[0];
        const lastEl = focusableElements?.[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    if (isConfirmEnabled && !isLoading) {
      onConfirm?.();
    }
  }, [isConfirmEnabled, isLoading, onConfirm]);

  if (!isOpen) return null;

  const dialog = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        role="presentation" // Correct role for backdrop that is just visual but interactive for convenience
        aria-hidden="true"
      />
      
      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="
            relative w-full max-w-md
            bg-white dark:bg-slate-800 rounded-xl shadow-2xl
            transform transition-all
            animate-scale-in
          "
        >
          <div className="p-6">
            {/* Icon */}
            <div className={`
              mx-auto w-12 h-12 rounded-full
              flex items-center justify-center
              ${variantStyle.iconBg}
              mb-4
            `}>
              <span className={`text-2xl ${variantStyle.iconColor}`}>
                {icon || variantStyle.icon}
              </span>
            </div>

            {/* Title */}
            <h3 
              id={titleId}
              className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2"
            >
              {title || variantStyle.title}
            </h3>

            {/* Message */}
            <p 
              id={descId}
              className="text-gray-600 dark:text-gray-200 text-center mb-4"
            >
              {message}
            </p>

            {/* Custom content */}
            {children}

            {/* Double confirm input */}
            {requireDoubleConfirm && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {doubleConfirmText}
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={doubleConfirmInput}
                  onChange={(e) => setDoubleConfirmInput(e.target.value)}
                  placeholder={doubleConfirmValue}
                  className="
                    w-full px-3 py-2 
                    border border-gray-300 dark:border-slate-600 rounded-lg
                    focus:ring-2 focus:ring-red-500 focus:border-red-500
                    text-center font-mono
                  "
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
            )}

            {/* Undo notice */}
            {showUndo && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg mb-4">
                <span className="text-blue-600">↩️</span>
                <span className="text-sm text-blue-700">{undoText}</span>
              </div>
            )}

            {/* MFA Warning */}
            {requiresMFA && (
              <div className="p-4 mb-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {mfaWarning}
                </p>
                {consequences.length > 0 && (
                  <ul className="mt-2 pl-5 list-disc text-sm text-yellow-800">
                    {consequences.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <Button
                ref={cancelButtonRef}
                onClick={onClose}
                disabled={isLoading}
                className="
                  flex-1 px-4 py-2.5
                  bg-gray-100 dark:bg-slate-700 hover:bg-gray-200
                  text-gray-700 dark:text-gray-300 font-medium
                  rounded-lg
                  transition-colors
                  focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                {...cancelButtonProps}
              >
                {cancelText}
              </Button>
              <Button
                ref={confirmButtonRef}
                onClick={handleConfirm}
                disabled={!isConfirmEnabled || isLoading}
                className={`
                  flex-1 px-4 py-2.5
                  ${variantStyle.buttonBg}
                  text-white font-medium
                  rounded-lg
                  transition-colors
                  focus-visible:ring-2 ${variantStyle.buttonFocusRing} focus-visible:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                `}
                {...confirmButtonProps}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Processing...
                  </>
                ) : (
                  confirmText
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' 
    ? createPortal(dialog, document.body) 
    : null;
};

/**
 * Hook for managing confirmation dialog state
 */
export const useConfirmation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({});
  const resolveRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfig(options);
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    setIsOpen(false);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    setIsOpen(false);
  }, []);

  const dialogProps = {
    isOpen,
    onClose: handleCancel,
    onConfirm: handleConfirm,
    ...config,
  };

  return { confirm, dialogProps, Dialog: ConfirmationDialog };
};

/**
 * Pre-configured delete confirmation
 */
export const DeleteConfirmation = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName = 'this item',
  showUndo = true,
  requireDoubleConfirm = false,
  ...props 
}) => (
  <ConfirmationDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    variant="danger"
    title="Delete Confirmation"
    message={`Are you sure you want to delete ${itemName}? This action cannot be easily undone.`}
    confirmText="Delete"
    showUndo={showUndo}
    requireDoubleConfirm={requireDoubleConfirm}
    {...props}
  />
);

/**
 * Pre-configured revoke confirmation
 */
export const RevokeConfirmation = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName = 'this pass',
  showUndo = true,
  ...props 
}) => (
  <ConfirmationDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    variant="warning"
    title="Revoke Access"
    message={`Are you sure you want to revoke ${itemName}? The visitor will no longer be able to enter.`}
    confirmText="Revoke"
    showUndo={showUndo}
    {...props}
  />
);

/**
 * Pre-configured logout confirmation
 */
export const LogoutConfirmation = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  ...props 
}) => (
  <ConfirmationDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    variant="info"
    title="Sign Out"
    message="Are you sure you want to sign out? You'll need to log in again to access your account."
    confirmText="Sign Out"
    cancelText="Stay Logged In"
    icon="🚪"
    {...props}
  />
);

export default ConfirmationDialog;
