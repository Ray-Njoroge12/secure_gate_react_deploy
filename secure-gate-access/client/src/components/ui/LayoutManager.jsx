/**
 * LayoutManager - Enhanced dashboard layout system with drag-and-drop and resize
 * 
 * Provides a comprehensive grid-based layout system that supports:
 * - Drag and drop widget arrangement with collision detection
 * - Widget resize capabilities with constraints
 * - Responsive grid layouts with breakpoint adaptation
 * - Real-time layout persistence with conflict resolution
 * - Role-based widget restrictions and catalogs
 * - Accessibility-compliant interactions with keyboard navigation
 * - Performance optimizations for large dashboards
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { useResponsive } from '../../hooks/useResponsive.js';
import { useAccessibility } from '../../hooks/useAccessibility.js';

/**
 * Enhanced grid configuration with resize constraints
 */
const DEFAULT_GRID_CONFIG = {
  columns: 12,
  rowHeight: 60,
  margin: [16, 16],
  containerPadding: [16, 16],
  breakpoints: {
    lg: 1200,
    md: 996,
    sm: 768,
    xs: 480,
    xxs: 0
  },
  cols: {
    lg: 12,
    md: 10,
    sm: 6,
    xs: 4,
    xxs: 2
  },
  // Widget size constraints
  minW: 2,
  minH: 2,
  maxW: 12,
  maxH: 10,
  // Collision detection
  preventCollision: true,
  compactType: 'vertical' // 'vertical', 'horizontal', null
};

/**
 * Enhanced LayoutManager Component with resize capabilities
 */
export const LayoutManager = ({
  children,
  layout = [],
  onLayoutChange,
  onWidgetResize,
  gridConfig = DEFAULT_GRID_CONFIG,
  isDraggable = true,
  isResizable = true,
  widgetCatalog = [],
  roleRestrictions = {},
  className = '',
  ...props
}) => {
  const { user } = useAuth();
  const { breakpoint, isMobile, isTablet } = useResponsive();
  const { isScreenReaderActive, isReducedMotionMode, announce } = useAccessibility();
  
  const [currentLayout, setCurrentLayout] = useState(layout);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [resizedItem, setResizedItem] = useState(null);
  const [dropZone, setDropZone] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null);
  const containerRef = useRef(null);
  const resizeStartRef = useRef(null);

  // Disable drag and drop for accessibility or reduced motion
  const dragEnabled = isDraggable && !isScreenReaderActive && !isReducedMotionMode;
  const resizeEnabled = isResizable && !isScreenReaderActive && !isReducedMotionMode;

  // Memoized collision detection
  const collisionDetection = useMemo(() => {
    return {
      checkCollision: (item, layout) => {
        if (!gridConfig.preventCollision) return false;
        
        return layout.some(layoutItem => {
          if (layoutItem.i === item.i) return false;
          
          return !(
            item.x >= layoutItem.x + layoutItem.w ||
            layoutItem.x >= item.x + item.w ||
            item.y >= layoutItem.y + layoutItem.h ||
            layoutItem.y >= item.y + item.h
          );
        });
      },
      
      findAvailablePosition: (item, layout) => {
        const columns = getColumns();
        let testItem = { ...item };
        
        // Try to find a position without collision
        for (let y = 0; y < 50; y++) {
          for (let x = 0; x <= columns - item.w; x++) {
            testItem = { ...item, x, y };
            if (!this.checkCollision(testItem, layout)) {
              return testItem;
            }
          }
        }
        
        return item; // Return original if no position found
      }
    };
  }, [gridConfig.preventCollision]);

  // Update layout when prop changes
  useEffect(() => {
    setCurrentLayout(layout);
  }, [layout]);

  // Handle layout changes with collision detection
  const handleLayoutChange = useCallback((newLayout, source = 'user') => {
    let validatedLayout = newLayout;
    
    if (gridConfig.preventCollision) {
      validatedLayout = newLayout.map(item => {
        const otherItems = newLayout.filter(other => other.i !== item.i);
        if (collisionDetection.checkCollision(item, otherItems)) {
          return collisionDetection.findAvailablePosition(item, otherItems);
        }
        return item;
      });
    }
    
    setCurrentLayout(validatedLayout);
    if (onLayoutChange) {
      onLayoutChange(validatedLayout, source);
    }
    
    // Announce layout change for accessibility
    if (source === 'user') {
      announce(`Dashboard layout updated`);
    }
  }, [onLayoutChange, gridConfig.preventCollision, collisionDetection, announce]);

  // Get responsive columns based on breakpoint
  const getColumns = useCallback(() => {
    return gridConfig.cols[breakpoint] || gridConfig.cols.lg;
  }, [breakpoint, gridConfig.cols]);

  // Calculate grid item styles with enhanced positioning
  const getItemStyle = useCallback((item) => {
    const columns = getColumns();
    const containerWidth = containerRef.current?.offsetWidth || 1200;
    const margin = gridConfig.margin[0];
    const padding = gridConfig.containerPadding[0];
    
    const colWidth = (containerWidth - padding * 2 - margin * (columns - 1)) / columns;
    const rowHeight = gridConfig.rowHeight;
    
    const style = {
      position: 'absolute',
      left: `${item.x * (colWidth + margin) + padding}px`,
      top: `${item.y * (rowHeight + margin) + padding}px`,
      width: `${item.w * colWidth + (item.w - 1) * margin}px`,
      height: `${item.h * rowHeight + (item.h - 1) * margin}px`,
      transition: (isDragging || isResizing) ? 'none' : 'all 0.2s ease',
      zIndex: (draggedItem?.i === item.i || resizedItem?.i === item.i) ? 1000 : 1
    };
    
    // Add visual feedback for dragging/resizing
    if (draggedItem?.i === item.i) {
      style.opacity = 0.8;
      style.transform = 'rotate(2deg)';
    }
    
    if (resizedItem?.i === item.i) {
      style.boxShadow = '0 0 0 2px var(--color-info, #3b82f6)';
    }
    
    return style;
  }, [getColumns, gridConfig, isDragging, isResizing, draggedItem, resizedItem]);

  // Enhanced drag start with role restrictions
  const handleDragStart = useCallback((e, item) => {
    if (!dragEnabled) return;
    
    // Check role restrictions
    const userRole = user?.role || 'visitor';
    if (roleRestrictions[userRole]?.preventDrag?.includes(item.i)) {
      e.preventDefault();
      announce(`Widget ${item.i} cannot be moved`);
      return;
    }
    
    setIsDragging(true);
    setDraggedItem(item);
    
    // Set drag data for accessibility
    e.dataTransfer.setData('text/plain', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
    
    announce(`Started dragging widget ${item.i}`);
  }, [dragEnabled, user?.role, roleRestrictions, announce]);

  // Enhanced drag over with improved drop zone calculation
  const handleDragOver = useCallback((e) => {
    if (!dragEnabled || !isDragging) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Calculate drop position with snap-to-grid
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect && draggedItem) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Convert to grid coordinates
      const columns = getColumns();
      const containerWidth = rect.width;
      const margin = gridConfig.margin[0];
      const padding = gridConfig.containerPadding[0];
      const colWidth = (containerWidth - padding * 2 - margin * (columns - 1)) / columns;
      const rowHeight = gridConfig.rowHeight;
      
      let gridX = Math.round((x - padding) / (colWidth + margin));
      let gridY = Math.round((y - padding) / (rowHeight + margin));
      
      // Constrain to grid bounds
      gridX = Math.max(0, Math.min(columns - draggedItem.w, gridX));
      gridY = Math.max(0, gridY);
      
      setDropZone({ x: gridX, y: gridY });
    }
  }, [dragEnabled, isDragging, getColumns, gridConfig, draggedItem]);

  // Enhanced drop with collision detection
  const handleDrop = useCallback((e) => {
    if (!dragEnabled || !isDragging || !draggedItem || !dropZone) return;
    
    e.preventDefault();
    
    const newItem = { ...draggedItem, x: dropZone.x, y: dropZone.y };
    const otherItems = currentLayout.filter(item => item.i !== draggedItem.i);
    
    // Check for collision
    if (gridConfig.preventCollision && collisionDetection.checkCollision(newItem, otherItems)) {
      announce(`Cannot place widget here - position occupied`);
      setIsDragging(false);
      setDraggedItem(null);
      setDropZone(null);
      return;
    }
    
    // Update layout with new position
    const newLayout = currentLayout.map(item => 
      item.i === draggedItem.i ? newItem : item
    );
    
    handleLayoutChange(newLayout, 'drag');
    announce(`Widget ${draggedItem.i} moved to position ${dropZone.x}, ${dropZone.y}`);
    
    // Reset drag state
    setIsDragging(false);
    setDraggedItem(null);
    setDropZone(null);
  }, [dragEnabled, isDragging, draggedItem, dropZone, currentLayout, gridConfig.preventCollision, collisionDetection, handleLayoutChange, announce]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedItem(null);
    setDropZone(null);
  }, []);

  // New resize functionality
  const handleResizeStart = useCallback((e, item, handle) => {
    if (!resizeEnabled) return;
    
    // Check role restrictions
    const userRole = user?.role || 'visitor';
    if (roleRestrictions[userRole]?.preventResize?.includes(item.i)) {
      e.preventDefault();
      announce(`Widget ${item.i} cannot be resized`);
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizedItem(item);
    setResizeHandle(handle);
    
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: item.w,
      startH: item.h
    };
    
    announce(`Started resizing widget ${item.i}`);
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [resizeEnabled, user?.role, roleRestrictions, announce]);

  const handleResizeMove = useCallback((e) => {
    if (!isResizing || !resizedItem || !resizeStartRef.current) return;
    
    const { startX, startY, startW, startH } = resizeStartRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    // Calculate new dimensions based on grid
    const colWidth = (containerRef.current?.offsetWidth || 1200) / getColumns();
    const rowHeight = gridConfig.rowHeight;
    
    const deltaW = Math.round(deltaX / colWidth);
    const deltaH = Math.round(deltaY / rowHeight);
    
    let newW = startW;
    let newH = startH;
    
    // Apply resize based on handle direction
    if (resizeHandle.includes('e')) newW = startW + deltaW;
    if (resizeHandle.includes('s')) newH = startH + deltaH;
    if (resizeHandle.includes('w')) newW = startW - deltaW;
    if (resizeHandle.includes('n')) newH = startH - deltaH;
    
    // Apply constraints
    newW = Math.max(gridConfig.minW || 1, Math.min(gridConfig.maxW || 12, newW));
    newH = Math.max(gridConfig.minH || 1, Math.min(gridConfig.maxH || 10, newH));
    
    // Ensure widget doesn't exceed grid bounds
    const columns = getColumns();
    if (resizedItem.x + newW > columns) {
      newW = columns - resizedItem.x;
    }
    
    // Update layout with new size
    const newLayout = currentLayout.map(item => 
      item.i === resizedItem.i 
        ? { ...item, w: newW, h: newH }
        : item
    );
    
    setCurrentLayout(newLayout);
  }, [isResizing, resizedItem, resizeHandle, getColumns, gridConfig, currentLayout]);

  const handleResizeEnd = useCallback(() => {
    if (!isResizing || !resizedItem) return;
    
    // Remove global event listeners
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    
    // Finalize layout change
    handleLayoutChange(currentLayout, 'resize');
    
    if (onWidgetResize) {
      const resizedWidget = currentLayout.find(item => item.i === resizedItem.i);
      onWidgetResize(resizedItem.i, resizedWidget);
    }
    
    announce(`Widget ${resizedItem.i} resized to ${resizedItem.w} by ${resizedItem.h}`);
    
    setIsResizing(false);
    setResizedItem(null);
    setResizeHandle(null);
    resizeStartRef.current = null;
  }, [isResizing, resizedItem, currentLayout, handleLayoutChange, onWidgetResize, announce]);

  // Enhanced keyboard navigation for accessibility
  const handleKeyDown = useCallback((e, item) => {
    if (!isScreenReaderActive) return;
    
    const { key, shiftKey, ctrlKey } = e;
    let newLayout = [...currentLayout];
    let changed = false;
    
    // Movement with arrow keys
    if (!ctrlKey && !shiftKey) {
      let newX = item.x;
      let newY = item.y;
      
      switch (key) {
        case 'ArrowLeft':
          newX = Math.max(0, item.x - 1);
          break;
        case 'ArrowRight':
          newX = Math.min(getColumns() - item.w, item.x + 1);
          break;
        case 'ArrowUp':
          newY = Math.max(0, item.y - 1);
          break;
        case 'ArrowDown':
          newY = item.y + 1;
          break;
        default:
          return;
      }
      
      if (newX !== item.x || newY !== item.y) {
        newLayout = newLayout.map(layoutItem => 
          layoutItem.i === item.i 
            ? { ...layoutItem, x: newX, y: newY }
            : layoutItem
        );
        changed = true;
        announce(`Widget moved to position ${newX}, ${newY}`);
      }
    }
    
    // Resize with Ctrl + arrow keys
    if (ctrlKey && resizeEnabled) {
      let newW = item.w;
      let newH = item.h;
      
      switch (key) {
        case 'ArrowLeft':
          newW = Math.max(gridConfig.minW || 1, item.w - 1);
          break;
        case 'ArrowRight':
          newW = Math.min(gridConfig.maxW || 12, Math.min(getColumns() - item.x, item.w + 1));
          break;
        case 'ArrowUp':
          newH = Math.max(gridConfig.minH || 1, item.h - 1);
          break;
        case 'ArrowDown':
          newH = Math.min(gridConfig.maxH || 10, item.h + 1);
          break;
        default:
          return;
      }
      
      if (newW !== item.w || newH !== item.h) {
        newLayout = newLayout.map(layoutItem => 
          layoutItem.i === item.i 
            ? { ...layoutItem, w: newW, h: newH }
            : layoutItem
        );
        changed = true;
        announce(`Widget resized to ${newW} by ${newH}`);
      }
    }
    
    if (changed) {
      e.preventDefault();
      handleLayoutChange(newLayout, 'keyboard');
    }
  }, [isScreenReaderActive, currentLayout, getColumns, gridConfig, resizeEnabled, handleLayoutChange, announce]);

  // Calculate container height with improved algorithm
  const containerHeight = useMemo(() => {
    const maxY = currentLayout.reduce((maxY, item) => {
      return Math.max(maxY, item.y + item.h);
    }, 0);
    
    return maxY * (gridConfig.rowHeight + gridConfig.margin[1]) + gridConfig.containerPadding[1];
  }, [currentLayout, gridConfig]);

  // Render resize handles
  const renderResizeHandles = useCallback((item) => {
    if (!resizeEnabled || isScreenReaderActive) return null;
    
    const handles = ['se', 'e', 's']; // Southeast, East, South handles
    
    return handles.map(handle => (
      <div
        key={handle}
        className={`resize-handle resize-handle-${handle} absolute cursor-${handle}-resize opacity-0 hover:opacity-100 transition-opacity bg-blue-500 hover:bg-blue-600`}
        style={getResizeHandleStyle(handle)}
        onMouseDown={(e) => handleResizeStart(e, item, handle)}
        aria-hidden="true"
      />
    ));
  }, [resizeEnabled, isScreenReaderActive, handleResizeStart]);

  // Get resize handle styles
  const getResizeHandleStyle = (handle) => {
    const size = 8;
    const offset = -size / 2;
    
    const styles = {
      se: { bottom: offset, right: offset, width: size, height: size, borderRadius: '50%' },
      e: { top: '50%', right: offset, width: size, height: '20px', transform: 'translateY(-50%)' },
      s: { bottom: offset, left: '50%', width: '20px', height: size, transform: 'translateX(-50%)' }
    };
    
    return styles[handle] || {};
  };

  return (
    <div
      ref={containerRef}
      className={`layout-manager relative ${className}`}
      style={{ height: `${containerHeight}px`, minHeight: '400px' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      {...props}
    >
      {currentLayout.map((item, index) => {
        const child = React.Children.toArray(children)[index];
        if (!child) return null;

        return (
          <div
            key={item.i}
            className={`layout-item ${isDragging && draggedItem?.i === item.i ? 'dragging' : ''} ${isResizing && resizedItem?.i === item.i ? 'resizing' : ''}`}
            style={getItemStyle(item)}
            draggable={dragEnabled}
            onDragStart={(e) => handleDragStart(e, item)}
            onDragEnd={handleDragEnd}
            onKeyDown={(e) => handleKeyDown(e, item)}
            tabIndex={isScreenReaderActive ? 0 : -1}
            role={isScreenReaderActive ? 'button' : undefined}
            aria-label={isScreenReaderActive ? `Widget ${item.i}, position ${item.x}, ${item.y}, size ${item.w} by ${item.h}. Use arrow keys to move, Ctrl+arrow keys to resize.` : undefined}
          >
            {child}
            {renderResizeHandles(item)}
          </div>
        );
      })}
      
      {/* Drop zone indicator */}
      {isDragging && dropZone && draggedItem && (
        <div
          className="drop-zone absolute border-2 border-dashed border-blue-400 bg-blue-50 dark:bg-blue-900 opacity-50 rounded-lg"
          style={getItemStyle({ 
            ...draggedItem, 
            x: dropZone.x, 
            y: dropZone.y 
          })}
        />
      )}
      
      {/* Resize preview */}
      {isResizing && resizedItem && (
        <div
          className="resize-preview absolute border-2 border-solid border-blue-500 bg-blue-100 dark:bg-blue-800 opacity-30 rounded-lg pointer-events-none"
          style={getItemStyle(resizedItem)}
        />
      )}
    </div>
  );
};

/**
 * Enhanced LayoutItem - Individual layout item wrapper with resize capabilities
 */
export const LayoutItem = ({ 
  children, 
  className = '',
  onResize,
  onConfigure,
  isResizable = true,
  isConfigurable = true,
  widgetId,
  ...props 
}) => {
  const { isScreenReaderActive } = useAccessibility();
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  
  const handleConfigure = useCallback(() => {
    if (onConfigure && widgetId) {
      onConfigure(widgetId);
    }
    setShowConfigMenu(false);
  }, [onConfigure, widgetId]);
  
  return (
    <div 
      className={`layout-item-content bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow ${className}`}
      {...props}
    >
      {/* Widget configuration menu */}
      {isConfigurable && !isScreenReaderActive && (
        <div className="widget-config-menu absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowConfigMenu(!showConfigMenu)}
            className="p-1 rounded bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300"
            aria-label="Configure widget"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
          
          {showConfigMenu && (
            <div className="absolute top-full right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={handleConfigure}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                Configure
              </button>
            </div>
          )}
        </div>
      )}
      
      {children}
    </div>
  );
};

/**
 * Enhanced useLayoutPersistence - Hook for persisting layout changes with conflict resolution
 */
export const useLayoutPersistence = (layoutKey, defaultLayout = [], options = {}) => {
  const { user } = useAuth();
  const [layout, setLayout] = useState(defaultLayout);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const saveTimeoutRef = useRef(null);
  
  const {
    autoSave = true,
    saveDelay = 1000, // Debounce save operations
    enableConflictResolution = true,
    maxVersions = 10
  } = options;

  // Load layout from localStorage on mount
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    
    const storageKey = `layout-${user.id}-${layoutKey}`;
    const versionsKey = `${storageKey}-versions`;
    
    try {
      const saved = localStorage.getItem(storageKey);
      const versions = JSON.parse(localStorage.getItem(versionsKey) || '[]');
      
      if (saved) {
        const parsedLayout = JSON.parse(saved);
        
        // Validate layout structure
        if (Array.isArray(parsedLayout) && parsedLayout.every(item => 
          item.i && typeof item.x === 'number' && typeof item.y === 'number' &&
          typeof item.w === 'number' && typeof item.h === 'number'
        )) {
          setLayout(parsedLayout);
          setLastSaved(new Date());
        } else {
          console.warn('Invalid layout structure, using default');
          setLayout(defaultLayout);
        }
      } else {
        setLayout(defaultLayout);
      }
    } catch (error) {
      console.warn('Failed to parse saved layout:', error);
      setLayout(defaultLayout);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, layoutKey, defaultLayout]);

  // Save layout changes with debouncing
  const saveLayout = useCallback((newLayout, immediate = false) => {
    if (!user?.id || !Array.isArray(newLayout)) return;
    
    setLayout(newLayout);
    
    if (!autoSave && !immediate) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    const performSave = () => {
      const storageKey = `layout-${user.id}-${layoutKey}`;
      const versionsKey = `${storageKey}-versions`;
      
      try {
        // Save current layout
        localStorage.setItem(storageKey, JSON.stringify(newLayout));
        
        // Manage versions for conflict resolution
        if (enableConflictResolution) {
          const versions = JSON.parse(localStorage.getItem(versionsKey) || '[]');
          const newVersion = {
            layout: newLayout,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          };
          
          versions.unshift(newVersion);
          
          // Keep only the latest versions
          if (versions.length > maxVersions) {
            versions.splice(maxVersions);
          }
          
          localStorage.setItem(versionsKey, JSON.stringify(versions));
        }
        
        setLastSaved(new Date());
      } catch (error) {
        console.error('Failed to save layout:', error);
        
        // Handle storage quota exceeded
        if (error.name === 'QuotaExceededError') {
          // Clear old versions and try again
          localStorage.removeItem(versionsKey);
          try {
            localStorage.setItem(storageKey, JSON.stringify(newLayout));
            setLastSaved(new Date());
          } catch (retryError) {
            console.error('Failed to save layout after cleanup:', retryError);
          }
        }
      }
    };
    
    if (immediate) {
      performSave();
    } else {
      saveTimeoutRef.current = setTimeout(performSave, saveDelay);
    }
  }, [user?.id, layoutKey, autoSave, saveDelay, enableConflictResolution, maxVersions]);

  // Reset to default layout
  const resetLayout = useCallback(() => {
    if (!user?.id) return;
    
    setLayout(defaultLayout);
    const storageKey = `layout-${user.id}-${layoutKey}`;
    const versionsKey = `${storageKey}-versions`;
    
    localStorage.removeItem(storageKey);
    localStorage.removeItem(versionsKey);
    setLastSaved(null);
  }, [user?.id, layoutKey, defaultLayout]);

  // Get layout versions for conflict resolution
  const getLayoutVersions = useCallback(() => {
    if (!user?.id || !enableConflictResolution) return [];
    
    const versionsKey = `layout-${user.id}-${layoutKey}-versions`;
    try {
      return JSON.parse(localStorage.getItem(versionsKey) || '[]');
    } catch (error) {
      console.warn('Failed to parse layout versions:', error);
      return [];
    }
  }, [user?.id, layoutKey, enableConflictResolution]);

  // Restore from a specific version
  const restoreVersion = useCallback((versionIndex) => {
    const versions = getLayoutVersions();
    if (versions[versionIndex]) {
      const versionLayout = versions[versionIndex].layout;
      saveLayout(versionLayout, true);
    }
  }, [getLayoutVersions, saveLayout]);

  // Export layout configuration
  const exportLayout = useCallback(() => {
    return {
      layout,
      metadata: {
        layoutKey,
        userId: user?.id,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };
  }, [layout, layoutKey, user?.id]);

  // Import layout configuration
  const importLayout = useCallback((importData) => {
    if (!importData?.layout || !Array.isArray(importData.layout)) {
      throw new Error('Invalid import data format');
    }
    
    // Validate imported layout
    const isValid = importData.layout.every(item => 
      item.i && typeof item.x === 'number' && typeof item.y === 'number' &&
      typeof item.w === 'number' && typeof item.h === 'number'
    );
    
    if (!isValid) {
      throw new Error('Invalid layout structure in import data');
    }
    
    saveLayout(importData.layout, true);
  }, [saveLayout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    layout,
    saveLayout,
    resetLayout,
    isLoading,
    lastSaved,
    getLayoutVersions,
    restoreVersion,
    exportLayout,
    importLayout
  };
};

export default LayoutManager;