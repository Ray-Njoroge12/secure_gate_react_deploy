/**
 * DashboardControls - Dashboard management controls
 * 
 * Provides dashboard management functionality with:
 * - Widget catalog access
 * - Layout reset and management
 * - Import/export capabilities
 * - Save status indicators
 * - Role-appropriate control visibility
 */

import React, { useRef } from 'react';
import { useAccessibility } from '../../hooks/useAccessibility.js';

/**
 * DashboardControls Component
 */
export const DashboardControls = ({
  onAddWidget,
  onResetLayout,
  onExportDashboard,
  onImportDashboard,
  lastSaved,
  role,
  simplified = false,
  className = ''
}) => {
  const { announce } = useAccessibility();
  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const formatLastSaved = (date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className={`dashboard-controls flex items-center space-x-3 ${className}`}>
      {/* Save Status */}
      {lastSaved && (
        <div className="save-status text-sm text-gray-500 dark:text-gray-300">
          <span className="hidden sm:inline">Last saved: </span>
          <span className="font-medium">{formatLastSaved(lastSaved)}</span>
        </div>
      )}

      {/* Add Widget Button */}
      {onAddWidget && (
        <button
          onClick={onAddWidget}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label="Add new widget to dashboard"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="hidden sm:inline">Add Widget</span>
          <span className="sm:hidden">Add</span>
        </button>
      )}

      {/* Dashboard Actions Dropdown */}
      <div className="relative inline-block text-left">
        <div className="group">
          <button
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-label="Dashboard actions menu"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
            <span className="ml-2 hidden sm:inline">Actions</span>
          </button>

          {/* Dropdown Menu */}
          <div className="absolute right-0 z-10 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
            <div className="py-1" role="menu">
              {/* Reset Layout */}
              {onResetLayout && (
                <button
                  onClick={onResetLayout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                  role="menuitem"
                >
                  <svg className="w-4 h-4 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset Layout
                </button>
              )}

              {/* Export/Import - Only for non-simplified mode */}
              {!simplified && (
                <>
                  <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                  
                  {onExportDashboard && (
                    <button
                      onClick={onExportDashboard}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                      role="menuitem"
                    >
                      <svg className="w-4 h-4 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export Dashboard
                    </button>
                  )}

                  {onImportDashboard && (
                    <>
                      <button
                        onClick={handleImportClick}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                        role="menuitem"
                      >
                        <svg className="w-4 h-4 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                        Import Dashboard
                      </button>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={onImportDashboard}
                        className="hidden"
                        aria-label="Import dashboard configuration file"
                      />
                    </>
                  )}
                </>
              )}

              {/* Help/Info */}
              <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
              <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-300">
                <div>Role: {role}</div>
                {lastSaved && (
                  <div>Saved: {formatLastSaved(lastSaved)}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardControls;