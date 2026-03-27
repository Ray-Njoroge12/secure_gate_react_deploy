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

// FIX: Substituted direct Lucide icons with Icon component usage in render method
// import { 
//   Plus, 
//   MoreHorizontal, 
//   RotateCcw, 
//   Download, 
//   Upload,
//   Clock 
// } from 'lucide-react';
import Button from '../ui/Button';
import Icon from '../ui/Icon.jsx';

/**
 * DashboardControls Component
 */
export const DashboardControls = ({
  onAddWidget,
  onResetLayout,
  onExportDashboard,
  lastSaved,
  simplified = false,
  className = ''
}) => {
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
    <div className={`flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm ${className}`}>
      <div className="flex items-center gap-4">
        {/* Last saved indicator */}
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <Icon name="clock" className="w-4 h-4 mr-2" />
          <span>Saved {formatLastSaved(lastSaved)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Add Widget Button */}
        {!simplified && (
          <Button
            onClick={onAddWidget}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            aria-label="Add widget to dashboard"
          >
            <Icon name="plus" className="w-4 h-4" />
            <span>Add Widget</span>
          </Button>
        )}

        {/* More Actions Dropdown */}
        <div className="relative group">
          <Button
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="More dashboard options"
          >
            <Icon name="more-horizontal" className="w-5 h-5" />
          </Button>

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-gray-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <div className="py-1">
              <Button
                onClick={onResetLayout}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <Icon name="rotate-ccw" className="w-4 h-4 mr-2" />
                Reset Layout
              </Button>
              
              {!simplified && (
                <>
                  <Button
                    onClick={onExportDashboard}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    <Icon name="download" className="w-4 h-4 mr-2" />
                    Export Config
                  </Button>
                  <Button
                    onClick={handleImportClick}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    <Icon name="upload" className="w-4 h-4 mr-2" />
                    Import Config
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardControls;