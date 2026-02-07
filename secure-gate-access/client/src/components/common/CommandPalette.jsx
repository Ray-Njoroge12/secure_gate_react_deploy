/**
 * @file CommandPalette.jsx
 * @description Global command palette for quick navigation and actions (Cmd+K)
 * Phase 3: UI/UX Improvement - High Impact Feature
 * 
 * Features:
 * - Fuzzy search across commands
 * - Recent items
 * - Keyboard navigation
 * - Role-based commands
 * - Categorized results
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Icons
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CommandIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

// Command definitions by role
const getCommands = (role) => {
  const commonCommands = [
    {
      id: 'settings',
      label: 'Settings',
      description: 'Open settings page',
      shortcut: '⌘S',
      category: 'Navigation',
      icon: '⚙️',
      action: 'navigate',
      path: `/${role === 'admin' ? 'dashboard/admin' : role === 'guard' ? 'dashboard/guard' : 'resident'}/settings`
    },
    {
      id: 'privacy',
      label: 'Privacy Dashboard',
      description: 'Manage your privacy settings',
      category: 'Navigation',
      icon: '🔒',
      action: 'navigate',
      path: '/resident/privacy'
    },
    {
      id: 'help',
      label: 'Help & Support',
      description: 'Get help and support',
      category: 'Help',
      icon: '❓',
      action: 'navigate',
      path: '/help'
    },
    {
      id: 'keyboard-shortcuts',
      label: 'Keyboard Shortcuts',
      description: 'View all keyboard shortcuts',
      shortcut: '⌘/',
      category: 'Help',
      icon: '⌨️',
      action: 'modal',
      modal: 'keyboard-shortcuts'
    },
    {
      id: 'logout',
      label: 'Logout',
      description: 'Sign out of your account',
      shortcut: '⌘L',
      category: 'Account',
      icon: '🚪',
      action: 'logout'
    }
  ];

  const residentCommands = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Go to home dashboard',
      shortcut: '⌘H',
      category: 'Navigation',
      icon: '🏠',
      action: 'navigate',
      path: '/dashboard/resident'
    },
    {
      id: 'add-visitor',
      label: 'Add Visitor',
      description: 'Create a new visitor invite',
      shortcut: '⌘A',
      category: 'Actions',
      icon: '👤',
      action: 'navigate',
      path: '/resident/add-visitor'
    },
    {
      id: 'quick-invite',
      label: 'Quick Invite',
      description: 'Send invite in seconds',
      shortcut: '⌘I',
      category: 'Actions',
      icon: '✉️',
      action: 'navigate',
      path: '/resident/quick-invite'
    },
    {
      id: 'bulk-invite',
      label: 'Bulk Invite',
      description: 'Invite multiple guests',
      shortcut: '⌘B',
      category: 'Actions',
      icon: '👥',
      action: 'navigate',
      path: '/resident/bulk-invite'
    },
    {
      id: 'visitor-history',
      label: 'Visitor History',
      description: 'View past visitors',
      category: 'Navigation',
      icon: '📜',
      action: 'navigate',
      path: '/resident/visitor-history'
    },
    {
      id: 'favorites',
      label: 'Favorite Visitors',
      description: 'Quick invite frequent guests',
      category: 'Navigation',
      icon: '⭐',
      action: 'navigate',
      path: '/resident/favorite-visitors'
    },
    {
      id: 'generate-pass',
      label: 'Generate Pass',
      description: 'Create a visitor pass',
      shortcut: '⌘G',
      category: 'Actions',
      icon: '🎫',
      action: 'navigate',
      path: '/resident/generate-pass'
    },
    {
      id: 'deliveries',
      label: 'My Deliveries',
      description: 'View delivery history',
      category: 'Navigation',
      icon: '📦',
      action: 'navigate',
      path: '/resident/deliveries'
    }
  ];

  const guardCommands = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Go to guard station',
      shortcut: '⌘H',
      category: 'Navigation',
      icon: '🏠',
      action: 'navigate',
      path: '/dashboard/guard'
    },
    {
      id: 'scan-qr',
      label: 'Scan QR Code',
      description: 'Scan visitor QR code',
      shortcut: '⌘Q',
      category: 'Actions',
      icon: '📷',
      action: 'navigate',
      path: '/dashboard/guard/scan-qr'
    },
    {
      id: 'manual-check',
      label: 'Manual Check',
      description: 'Search visitor manually',
      shortcut: '⌘M',
      category: 'Actions',
      icon: '🔍',
      action: 'navigate',
      path: '/dashboard/guard/manual-check'
    },
    {
      id: 'walk-in',
      label: 'Walk-in Registration',
      description: 'Register walk-in visitor',
      category: 'Actions',
      icon: '🚶',
      action: 'navigate',
      path: '/dashboard/guard/walk-in'
    },
    {
      id: 'incidents',
      label: 'Incidents',
      description: 'View and report incidents',
      category: 'Navigation',
      icon: '⚠️',
      action: 'navigate',
      path: '/dashboard/guard/incidents'
    },
    {
      id: 'panic-alert',
      label: 'PANIC ALERT',
      description: 'Trigger emergency alert',
      category: 'Emergency',
      icon: '🚨',
      action: 'modal',
      modal: 'panic-confirm'
    }
  ];

  const adminCommands = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Go to admin dashboard',
      shortcut: '⌘H',
      category: 'Navigation',
      icon: '🏠',
      action: 'navigate',
      path: '/dashboard/admin'
    },
    {
      id: 'users',
      label: 'Manage Residents',
      description: 'View and manage residents',
      shortcut: '⌘U',
      category: 'Management',
      icon: '👥',
      action: 'navigate',
      path: '/dashboard/admin/users'
    },
    {
      id: 'staff',
      label: 'Manage Staff',
      description: 'View and manage guards',
      category: 'Management',
      icon: '🛡️',
      action: 'navigate',
      path: '/dashboard/admin/manage-staff'
    },
    {
      id: 'visitors',
      label: 'Visitor Log',
      description: 'View all visitor records',
      category: 'Navigation',
      icon: '📋',
      action: 'navigate',
      path: '/dashboard/admin/visitors'
    },
    {
      id: 'reports',
      label: 'Reports',
      description: 'Generate analytics reports',
      shortcut: '⌘R',
      category: 'Analytics',
      icon: '📊',
      action: 'navigate',
      path: '/dashboard/admin/reports'
    },
    {
      id: 'incidents',
      label: 'Incident Management',
      description: 'Manage security incidents',
      category: 'Management',
      icon: '⚠️',
      action: 'navigate',
      path: '/dashboard/admin/incidents'
    },
    {
      id: 'integrations',
      label: 'Integrations',
      description: 'Manage third-party integrations',
      category: 'Settings',
      icon: '🔌',
      action: 'navigate',
      path: '/dashboard/admin/integrations'
    },
    {
      id: 'announcements',
      label: 'Create Announcement',
      description: 'Post community announcement',
      category: 'Actions',
      icon: '📢',
      action: 'modal',
      modal: 'create-announcement'
    }
  ];

  const roleCommands = {
    resident: residentCommands,
    guard: guardCommands,
    admin: adminCommands
  };

  return [...(roleCommands[role] || []), ...commonCommands];
};

// Fuzzy search function
const fuzzySearch = (items, query) => {
  if (!query) return items;
  
  const lowerQuery = query.toLowerCase();
  return items
    .map(item => {
      const labelMatch = item.label.toLowerCase().includes(lowerQuery);
      const descMatch = item.description.toLowerCase().includes(lowerQuery);
      const categoryMatch = item.category.toLowerCase().includes(lowerQuery);
      
      let score = 0;
      if (item.label.toLowerCase().startsWith(lowerQuery)) score += 100;
      if (labelMatch) score += 50;
      if (descMatch) score += 25;
      if (categoryMatch) score += 10;
      
      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
};

const CommandPalette = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const role = user?.role || 'resident';
  const commands = useMemo(() => getCommands(role), [role]);
  const filteredCommands = useMemo(() => fuzzySearch(commands, query), [commands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  }, [filteredCommands, selectedIndex, onClose]);

  // Execute command
  const executeCommand = useCallback((command) => {
    onClose();
    
    switch (command.action) {
      case 'navigate':
        navigate(command.path);
        break;
      case 'logout':
        logout();
        navigate('/login');
        break;
      case 'modal':
        // Emit custom event for modal opening
        window.dispatchEvent(new CustomEvent('openModal', { 
          detail: { modal: command.modal } 
        }));
        break;
      default:
        console.log('Unknown action:', command.action);
    }
  }, [navigate, logout, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Command Palette */}
      <div 
        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-[101]"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-700">
            <SearchIcon />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400"
              autoComplete="off"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded">
              esc
            </kbd>
          </div>

          {/* Results */}
          <div 
            ref={listRef}
            className="max-h-[400px] overflow-y-auto p-2"
          >
            {filteredCommands.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-300">
                <p>No commands found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, items]) => (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {category}
                  </div>
                  {items.map((command) => {
                    const index = filteredCommands.findIndex(c => c.id === command.id);
                    const isSelected = index === selectedIndex;
                    
                    return (
                      <button
                        key={command.id}
                        data-index={index}
                        onClick={() => executeCommand(command)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isSelected 
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                            : 'hover:bg-gray-50 dark:hover:bg-slate-700/50 text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        <span className="text-xl">{command.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{command.label}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-300 truncate">
                            {command.description}
                          </div>
                        </div>
                        {command.shortcut && (
                          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded">
                            {command.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-300">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded">↑↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded">↵</kbd>
                to select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <CommandIcon />
              SecureGate
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

// Hook to manage command palette
export const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev)
  };
};

export default CommandPalette;
