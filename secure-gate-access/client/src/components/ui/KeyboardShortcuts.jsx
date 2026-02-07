/**
 * @fileoverview Keyboard shortcuts help component for Secure Gate Access
 * @description Displays available keyboard shortcuts and navigation help
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { keyboardShortcuts } from '../../utils/focusManagement';
import Modal from './Modal';
import Button from './Button';
import { HelpCircle, Keyboard, X } from '../icons';

/**
 * Keyboard shortcuts help component
 * 
 * @component
 * @param {Object} props - Component props
 * @param {boolean} [props.showOnMount=false] - Whether to show on component mount
 * @param {string} [props.triggerText='Keyboard Shortcuts'] - Text for trigger button
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {JSX.Element} Keyboard shortcuts component
 * 
 * @example
 * <KeyboardShortcuts showOnMount={true} />
 */
const KeyboardShortcuts = ({ 
  showOnMount = false, 
  triggerText = 'Keyboard Shortcuts',
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(showOnMount);
  const [shortcuts, setShortcuts] = useState([]);

  // Load shortcuts on mount
  useEffect(() => {
    setShortcuts(keyboardShortcuts.getAllShortcuts());
  }, []);

  // Register F1 shortcut to open help
  useEffect(() => {
    const handleF1 = (event) => {
      if (event.key === 'F1') {
        event.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleF1);
    return () => document.removeEventListener('keydown', handleF1);
  }, []);

  const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
    const category = shortcut.description.split(' ')[0] || 'General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(shortcut);
    return groups;
  }, {});

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 ${className}`}
        aria-label="Show keyboard shortcuts help"
      >
        <Keyboard className="w-4 h-4" />
        {triggerText}
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Keyboard Shortcuts"
        size="lg"
        ariaLabel="Keyboard shortcuts help"
      >
        <div className="space-y-6">
          {/* Introduction */}
          <div className="text-gray-600 dark:text-slate-300 text-sm">
            <p className="mb-2">
              Use these keyboard shortcuts to navigate the application more efficiently:
            </p>
            <div className="flex items-center gap-2 text-brand-400">
              <HelpCircle className="w-4 h-4" />
              <span className="text-xs">Press F1 anytime to open this help</span>
            </div>
          </div>

          {/* Shortcuts by Category */}
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 border-b border-gray-200 dark:border-slate-700 pb-2">
                {category}
              </h3>
              
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 bg-gray-100/50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <span className="text-gray-600 dark:text-slate-300 text-sm">
                      {shortcut.description}
                    </span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-slate-200 text-xs rounded border border-gray-300 dark:border-slate-500 font-mono">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Navigation Help */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 border-b border-gray-200 dark:border-slate-700 pb-2">
              Navigation
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-600 dark:text-slate-300">General Navigation</h4>
                <div className="space-y-1 text-sm text-gray-500 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Move between elements</span>
                    <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-slate-600 text-xs rounded">Tab</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Move backwards</span>
                    <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-slate-600 text-xs rounded">Shift + Tab</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Activate element</span>
                    <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-slate-600 text-xs rounded">Enter</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Close dialogs</span>
                    <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-slate-600 text-xs rounded">Escape</kbd>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-600 dark:text-slate-300">Menu Navigation</h4>
                <div className="space-y-1 text-sm text-gray-500 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Next menu item</span>
                    <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-slate-600 text-xs rounded">↓</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Previous menu item</span>
                    <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-slate-600 text-xs rounded">↑</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>First menu item</span>
                    <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-slate-600 text-xs rounded">Home</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Last menu item</span>
                    <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-slate-600 text-xs rounded">End</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Accessibility Info */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-300 mb-2">
              Accessibility Features
            </h4>
            <ul className="text-sm text-blue-200 space-y-1">
              <li>• All interactive elements are keyboard accessible</li>
              <li>• Focus indicators are visible when navigating with keyboard</li>
              <li>• Screen reader announcements for dynamic content</li>
              <li>• Skip links available for quick navigation</li>
            </ul>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t border-slate-700">
            <Button
              variant="primary"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default KeyboardShortcuts;

