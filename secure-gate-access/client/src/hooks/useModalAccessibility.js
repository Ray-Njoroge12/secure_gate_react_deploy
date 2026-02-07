/**
 * @fileoverview useModalAccessibility hook
 * @description Reusable hook that adds focus trap, escape key handling,
 * focus restoration, and body scroll lock to any modal component.
 * Use this when you can't wrap your modal in the base <Modal> component.
 *
 * @example
 * const { modalRef } = useModalAccessibility(isOpen, onClose);
 * return (
 *   <div ref={modalRef} role="dialog" aria-modal="true" tabIndex={-1}>
 *     ...
 *   </div>
 * );
 */

import { useRef, useEffect } from 'react';

export default function useModalAccessibility(isOpen, onClose) {
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save previously focused element for restoration
    previousActiveElementRef.current = document.activeElement;

    // Focus the modal container
    const timer = setTimeout(() => {
      if (modalRef.current) {
        modalRef.current.focus();
      }
    }, 0);

    // Prevent body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      // Escape to close
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      // Tab trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (!focusableElements || focusableElements.length === 0) return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;

      // Restore focus
      if (previousActiveElementRef.current && previousActiveElementRef.current.focus) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  return { modalRef };
}
