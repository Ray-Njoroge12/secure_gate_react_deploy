/**
 * @file KeyboardShortcutsModal.jsx
 * @description Modal displaying all keyboard shortcuts for the application
 * Phase 4: UI/UX Improvement - Priority 1.3
 * 
 * Triggered by: Cmd+/ or from CommandPalette
 * 
 * Features:
 * - Grouped by category
 * - Searchable
 * - Role-specific shortcuts
 * - Mac/Windows key detection
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// Detect platform for key display
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const cmdKey = isMac ? '⌘' : 'Ctrl';
const altKey = isMac ? '⌥' : 'Alt';
const shiftKey = '⇧';

// Keyboard shortcut definitions
const shortcuts = {
  global: {
    label: 'Global',
    icon: '🌐',
    items: [
      { keys: [`${cmdKey}`, 'K'], description: 'Open command palette' },
      { keys: [`${cmdKey}`, '/'], description: 'Show keyboard shortcuts' },
      { keys: [`${cmdKey}`, 'L'], description: 'Logout' },
      { keys: ['Esc'], description: 'Close modal / Cancel action' },
    ],
  },
  navigation: {
    label: 'Navigation',
    icon: '🧭',
    items: [
      { keys: [`${cmdKey}`, 'H'], description: 'Go to dashboard' },
      { keys: [`${cmdKey}`, 'S'], description: 'Open settings' },
      { keys: [`${cmdKey}`, ','], description: 'Open preferences' },
      { keys: [`${altKey}`, '←'], description: 'Go back' },
      { keys: [`${altKey}`, '→'], description: 'Go forward' },
    ],
  },
  resident: {
    label: 'Resident Actions',
    icon: '🏠',
    roles: ['resident'],
    items: [
      { keys: [`${cmdKey}`, 'A'], description: 'Add new visitor' },
      { keys: [`${cmdKey}`, 'B'], description: 'Bulk invite' },
      { keys: [`${cmdKey}`, 'G'], description: 'Generate access pass' },
      { keys: [`${cmdKey}`, 'F'], description: 'View favorites' },
      { keys: [`${cmdKey}`, 'R'], description: 'Refresh dashboard' },
    ],
  },
  guard: {
    label: 'Guard Actions',
    icon: '🛡️',
    roles: ['guard'],
    items: [
      { keys: [`${cmdKey}`, 'Q'], description: 'Scan QR code' },
      { keys: [`${cmdKey}`, 'M'], description: 'Manual check' },
      { keys: [`${cmdKey}`, 'E'], description: 'Emergency / Panic alert' },
      { keys: [`${cmdKey}`, 'R'], description: 'Refresh active visitors' },
      { keys: [`${cmdKey}`, 'I'], description: 'Quick check-in' },
      { keys: [`${cmdKey}`, 'O'], description: 'Quick check-out' },
    ],
  },
  admin: {
    label: 'Admin Actions',
    icon: '👑',
    roles: ['admin'],
    items: [
      { keys: [`${cmdKey}`, 'U'], description: 'Manage users' },
      { keys: [`${cmdKey}`, 'A'], description: 'View audit logs' },
      { keys: [`${cmdKey}`, 'P'], description: 'Privacy dashboard' },
      { keys: [`${cmdKey}`, 'N'], description: 'Create announcement' },
      { keys: [`${cmdKey}`, 'R'], description: 'Generate reports' },
    ],
  },
  tables: {
    label: 'Table Navigation',
    icon: '📊',
    items: [
      { keys: ['↑', '↓'], description: 'Navigate rows' },
      { keys: ['←', '→'], description: 'Navigate columns' },
      { keys: ['Enter'], description: 'Select / Open row' },
      { keys: ['Space'], description: 'Toggle selection' },
      { keys: [`${cmdKey}`, 'A'], description: 'Select all' },
      { keys: ['Delete'], description: 'Delete selected' },
    ],
  },
  forms: {
    label: 'Form Shortcuts',
    icon: '📝',
    items: [
      { keys: ['Tab'], description: 'Next field' },
      { keys: [`${shiftKey}`, 'Tab'], description: 'Previous field' },
      { keys: [`${cmdKey}`, 'Enter'], description: 'Submit form' },
      { keys: ['Esc'], description: 'Cancel / Reset form' },
    ],
  },
  accessibility: {
    label: 'Accessibility',
    icon: '♿',
    items: [
      { keys: [`${cmdKey}`, '+'], description: 'Zoom in' },
      { keys: [`${cmdKey}`, '-'], description: 'Zoom out' },
      { keys: [`${cmdKey}`, '0'], description: 'Reset zoom' },
      { keys: ['F11'], description: 'Toggle fullscreen' },
    ],
  },
};

// Key component for displaying individual keys
const Key = ({ children }) => (
  <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
    {children}
  </kbd>
);

// Shortcut row component
const ShortcutRow = ({ keys, description }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <span className="text-sm text-gray-600 dark:text-gray-400">{description}</span>
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <Key>{key}</Key>
          {index < keys.length - 1 && <span className="text-gray-400 text-xs mx-0.5">+</span>}
        </React.Fragment>
      ))}
    </div>
  </div>
);

// Category section component
const ShortcutCategory = ({ icon, label, items }) => (
  <div className="mb-6 last:mb-0">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
      <span>{icon}</span>
      <span>{label}</span>
    </h3>
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
      {items.map((item, index) => (
        <ShortcutRow key={index} {...item} />
      ))}
    </div>
  </div>
);

/**
 * Keyboard Shortcuts Modal Component
 */
const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter shortcuts based on user role and search term
  const filteredShortcuts = useMemo(() => {
    const userRole = user?.role?.toLowerCase() || 'resident';
    
    return Object.entries(shortcuts)
      .filter(([key, category]) => {
        // Filter by role
        if (category.roles && !category.roles.includes(userRole)) {
          return false;
        }
        
        // Filter by search term
        if (searchTerm) {
          const matchesLabel = category.label.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesItems = category.items.some(item => 
            item.description.toLowerCase().includes(searchTerm.toLowerCase())
          );
          return matchesLabel || matchesItems;
        }
        
        return true;
      })
      .map(([key, category]) => ({
        ...category,
        items: searchTerm 
          ? category.items.filter(item => 
              item.description.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : category.items
      }))
      .filter(category => category.items.length > 0);
  }, [user?.role, searchTerm]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Register global shortcut (Cmd+/)
  useEffect(() => {
    const handleGlobalShortcut = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalShortcut);
    return () => document.removeEventListener('keydown', handleGlobalShortcut);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden"
          role="dialog"
          aria-labelledby="shortcuts-title"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 
              id="shortcuts-title" 
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
            >
              <span>⌨️</span>
              <span>Keyboard Shortcuts</span>
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close shortcuts modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <svg 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search shortcuts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {filteredShortcuts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredShortcuts.map((category, index) => (
                  <ShortcutCategory 
                    key={index}
                    icon={category.icon}
                    label={category.label}
                    items={category.items}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>No shortcuts found for "{searchTerm}"</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                Press <Key>Esc</Key> to close
              </span>
              <span>
                {isMac ? 'Mac' : 'Windows'} shortcuts shown
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
