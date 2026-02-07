/**
 * WidgetCatalog - Widget management and configuration system
 * 
 * Provides comprehensive widget management with:
 * - Role-based widget catalogs and restrictions
 * - Widget configuration and customization
 * - Drag-and-drop widget addition
 * - Widget templates and presets
 * - Real-time widget preview
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { useThemeEngine } from '../../contexts/ThemeEngine.jsx';
import { useAccessibility } from '../../hooks/useAccessibility.js';
import { DashboardWidget } from './DashboardWidget.jsx';

/**
 * Widget catalog definitions by role
 */
const WIDGET_CATALOG = {
  super_admin: {
    analytics: [
      {
        id: 'platform-overview',
        name: 'Platform Overview',
        description: 'High-level platform statistics and metrics',
        category: 'analytics',
        icon: 'bar-chart',
        defaultSize: { w: 6, h: 4 },
        minSize: { w: 4, h: 3 },
        maxSize: { w: 12, h: 6 },
        configurable: true,
        preview: 'Platform-wide metrics and KPIs'
      },
      {
        id: 'estate-metrics',
        name: 'Estate Metrics',
        description: 'Individual estate performance data',
        category: 'analytics',
        icon: 'trending-up',
        defaultSize: { w: 6, h: 6 },
        minSize: { w: 4, h: 4 },
        maxSize: { w: 8, h: 8 },
        configurable: true,
        preview: 'Estate-specific analytics and trends'
      }
    ],
    monitoring: [
      {
        id: 'system-health',
        name: 'System Health',
        description: 'Real-time system status and uptime',
        category: 'monitoring',
        icon: 'activity',
        defaultSize: { w: 4, h: 4 },
        minSize: { w: 3, h: 3 },
        maxSize: { w: 6, h: 6 },
        configurable: false,
        preview: 'System uptime and health indicators'
      },
      {
        id: 'alert-center',
        name: 'Alert Center',
        description: 'Critical system alerts and notifications',
        category: 'monitoring',
        icon: 'alert-triangle',
        defaultSize: { w: 4, h: 6 },
        minSize: { w: 3, h: 4 },
        maxSize: { w: 6, h: 8 },
        configurable: true,
        preview: 'System alerts and incident notifications'
      }
    ]
  },
  
  admin: {
    management: [
      {
        id: 'estate-overview',
        name: 'Estate Overview',
        description: 'Estate statistics and key metrics',
        category: 'management',
        icon: 'home',
        defaultSize: { w: 8, h: 4 },
        minSize: { w: 6, h: 3 },
        maxSize: { w: 12, h: 6 },
        configurable: true,
        preview: 'Estate visitor counts and activity'
      },
      {
        id: 'pending-approvals',
        name: 'Pending Approvals',
        description: 'User accounts awaiting approval',
        category: 'management',
        icon: 'user-check',
        defaultSize: { w: 4, h: 6 },
        minSize: { w: 3, h: 4 },
        maxSize: { w: 6, h: 8 },
        configurable: false,
        preview: 'List of users pending approval'
      }
    ],
    analytics: [
      {
        id: 'visitor-analytics',
        name: 'Visitor Analytics',
        description: 'Visitor patterns and statistics',
        category: 'analytics',
        icon: 'users',
        defaultSize: { w: 6, h: 6 },
        minSize: { w: 4, h: 4 },
        maxSize: { w: 8, h: 8 },
        configurable: true,
        preview: 'Visitor trends and analytics charts'
      }
    ],
    security: [
      {
        id: 'security-alerts',
        name: 'Security Alerts',
        description: 'Security incidents and alerts',
        category: 'security',
        icon: 'shield',
        defaultSize: { w: 6, h: 6 },
        minSize: { w: 4, h: 4 },
        maxSize: { w: 8, h: 8 },
        configurable: true,
        preview: 'Security events and incident reports'
      }
    ]
  },
  
  guard: {
    operations: [
      {
        id: 'qr-scanner',
        name: 'QR Scanner',
        description: 'Scan visitor QR codes for check-in',
        category: 'operations',
        icon: 'qr-code',
        defaultSize: { w: 6, h: 8 },
        minSize: { w: 4, h: 6 },
        maxSize: { w: 8, h: 10 },
        configurable: false,
        preview: 'QR code scanning interface'
      },
      {
        id: 'visitor-queue',
        name: 'Visitor Queue',
        description: 'Pending visitors awaiting check-in',
        category: 'operations',
        icon: 'clock',
        defaultSize: { w: 6, h: 8 },
        minSize: { w: 4, h: 6 },
        maxSize: { w: 8, h: 10 },
        configurable: true,
        preview: 'List of expected visitors'
      }
    ],
    security: [
      {
        id: 'emergency-panel',
        name: 'Emergency Panel',
        description: 'Emergency alerts and incident reporting',
        category: 'security',
        icon: 'alert-circle',
        defaultSize: { w: 4, h: 4 },
        minSize: { w: 3, h: 3 },
        maxSize: { w: 6, h: 6 },
        configurable: false,
        preview: 'Emergency alert buttons'
      }
    ]
  },
  
  resident: {
    invitations: [
      {
        id: 'quick-invite',
        name: 'Quick Invite',
        description: 'Send visitor invitations quickly',
        category: 'invitations',
        icon: 'user-plus',
        defaultSize: { w: 6, h: 4 },
        minSize: { w: 4, h: 3 },
        maxSize: { w: 8, h: 6 },
        configurable: true,
        preview: 'Quick visitor invitation form'
      },
      {
        id: 'bulk-invite',
        name: 'Bulk Invite',
        description: 'Invite multiple visitors at once',
        category: 'invitations',
        icon: 'users',
        defaultSize: { w: 6, h: 6 },
        minSize: { w: 4, h: 4 },
        maxSize: { w: 8, h: 8 },
        configurable: true,
        preview: 'Bulk invitation management'
      }
    ],
    tracking: [
      {
        id: 'visitor-status',
        name: 'Visitor Status',
        description: 'Current visitor statistics',
        category: 'tracking',
        icon: 'activity',
        defaultSize: { w: 4, h: 4 },
        minSize: { w: 3, h: 3 },
        maxSize: { w: 6, h: 6 },
        configurable: false,
        preview: 'Today\'s visitor count and status'
      },
      {
        id: 'upcoming-visits',
        name: 'Upcoming Visits',
        description: 'Scheduled visitor arrivals',
        category: 'tracking',
        icon: 'calendar',
        defaultSize: { w: 8, h: 6 },
        minSize: { w: 6, h: 4 },
        maxSize: { w: 12, h: 8 },
        configurable: true,
        preview: 'List of upcoming visitor appointments'
      }
    ]
  }
};

/**
 * Widget configuration schemas
 */
const WIDGET_CONFIGS = {
  'platform-overview': {
    refreshInterval: {
      type: 'select',
      label: 'Refresh Interval',
      options: [
        { value: 30000, label: '30 seconds' },
        { value: 60000, label: '1 minute' },
        { value: 300000, label: '5 minutes' }
      ],
      default: 60000
    },
    showTrends: {
      type: 'boolean',
      label: 'Show Trend Indicators',
      default: true
    }
  },
  'visitor-analytics': {
    chartType: {
      type: 'select',
      label: 'Chart Type',
      options: [
        { value: 'line', label: 'Line Chart' },
        { value: 'bar', label: 'Bar Chart' },
        { value: 'pie', label: 'Pie Chart' }
      ],
      default: 'line'
    },
    timeRange: {
      type: 'select',
      label: 'Time Range',
      options: [
        { value: '24h', label: 'Last 24 Hours' },
        { value: '7d', label: 'Last 7 Days' },
        { value: '30d', label: 'Last 30 Days' }
      ],
      default: '7d'
    }
  }
};

/**
 * WidgetCatalog Component
 */
export const WidgetCatalog = ({
  isOpen = false,
  onClose,
  onAddWidget,
  currentLayout = [],
  className = ''
}) => {
  const { user } = useAuth();
  const themeEngine = useThemeEngine();
  const { announce } = useAccessibility();
  
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewWidget, setPreviewWidget] = useState(null);

  const userRole = user?.role || 'visitor';

  // Get available widgets for current user role
  const availableWidgets = useMemo(() => {
    const roleWidgets = WIDGET_CATALOG[userRole] || {};
    const allWidgets = [];
    
    Object.entries(roleWidgets).forEach(([category, widgets]) => {
      widgets.forEach(widget => {
        allWidgets.push({ ...widget, category });
      });
    });
    
    return allWidgets;
  }, [userRole]);

  // Filter widgets based on search and category
  const filteredWidgets = useMemo(() => {
    let filtered = availableWidgets;
    
    if (searchQuery) {
      filtered = filtered.filter(widget =>
        widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        widget.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(widget => widget.category === selectedCategory);
    }
    
    return filtered;
  }, [availableWidgets, searchQuery, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(availableWidgets.map(widget => widget.category))];
    return cats.map(cat => ({
      id: cat,
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      count: availableWidgets.filter(widget => widget.category === cat).length
    }));
  }, [availableWidgets]);

  // Check if widget is already added
  const isWidgetAdded = useCallback((widgetId) => {
    return currentLayout.some(item => item.i === widgetId);
  }, [currentLayout]);

  // Handle widget addition
  const handleAddWidget = useCallback((widget) => {
    if (isWidgetAdded(widget.id)) {
      announce(`Widget ${widget.name} is already added to dashboard`);
      return;
    }
    
    // Find available position for new widget
    const newItem = {
      i: widget.id,
      x: 0,
      y: 0,
      w: widget.defaultSize.w,
      h: widget.defaultSize.h,
      minW: widget.minSize.w,
      minH: widget.minSize.h,
      maxW: widget.maxSize.w,
      maxH: widget.maxSize.h
    };
    
    // Find first available position
    let placed = false;
    for (let y = 0; y < 20 && !placed; y++) {
      for (let x = 0; x <= 12 - widget.defaultSize.w && !placed; x++) {
        const testItem = { ...newItem, x, y };
        const hasCollision = currentLayout.some(item => 
          !(testItem.x >= item.x + item.w || 
            item.x >= testItem.x + testItem.w || 
            testItem.y >= item.y + item.h || 
            item.y >= testItem.y + testItem.h)
        );
        
        if (!hasCollision) {
          newItem.x = x;
          newItem.y = y;
          placed = true;
        }
      }
    }
    
    if (onAddWidget) {
      onAddWidget(newItem, widget);
    }
    
    announce(`Added ${widget.name} widget to dashboard`);
  }, [currentLayout, isWidgetAdded, onAddWidget, announce]);

  // Handle widget preview
  const handlePreviewWidget = useCallback((widget) => {
    setPreviewWidget(widget);
  }, []);

  if (!isOpen) return null;

  return (
    <div className={`widget-catalog fixed inset-0 z-50 ${className}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Catalog Panel */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Widget Catalog
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100"
            aria-label="Close widget catalog"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <input
            type="text"
            placeholder="Search widgets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
          />
        </div>

        {/* Categories */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedCategory === null
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              All ({availableWidgets.length})
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedCategory === category.id
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </div>

        {/* Widget List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {filteredWidgets.map(widget => (
              <div
                key={widget.id}
                className="border border-gray-200 dark:border-slate-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 text-sm">
                          {widget.icon}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {widget.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {widget.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-300">
                      Size: {widget.defaultSize.w}×{widget.defaultSize.h}
                      {widget.configurable && ' • Configurable'}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => handleAddWidget(widget)}
                      disabled={isWidgetAdded(widget.id)}
                      className={`px-3 py-1 rounded text-sm ${
                        isWidgetAdded(widget.id)
                          ? 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isWidgetAdded(widget.id) ? 'Added' : 'Add'}
                    </button>
                    
                    <button
                      onClick={() => handlePreviewWidget(widget)}
                      className="px-3 py-1 rounded text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredWidgets.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-300">
              {searchQuery ? 'No widgets found matching your search' : 'No widgets available'}
            </div>
          )}
        </div>
      </div>
      
      {/* Widget Preview Modal */}
      {previewWidget && (
        <WidgetPreviewModal
          widget={previewWidget}
          onClose={() => setPreviewWidget(null)}
          onAdd={() => {
            handleAddWidget(previewWidget);
            setPreviewWidget(null);
          }}
          isAdded={isWidgetAdded(previewWidget.id)}
        />
      )}
    </div>
  );
};

/**
 * Widget Preview Modal
 */
const WidgetPreviewModal = ({ widget, onClose, onAdd, isAdded }) => {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {widget.name}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {widget.description}
          </p>
          
          <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4 mb-4">
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Preview:</div>
            <div className="text-gray-800 dark:text-gray-200">
              {widget.preview}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300 mb-6">
            <div>
              <span className="font-medium">Default Size:</span><br />
              {widget.defaultSize.w} × {widget.defaultSize.h}
            </div>
            <div>
              <span className="font-medium">Category:</span><br />
              {widget.category.charAt(0).toUpperCase() + widget.category.slice(1)}
            </div>
            <div>
              <span className="font-medium">Configurable:</span><br />
              {widget.configurable ? 'Yes' : 'No'}
            </div>
            <div>
              <span className="font-medium">Size Range:</span><br />
              {widget.minSize.w}×{widget.minSize.h} - {widget.maxSize.w}×{widget.maxSize.h}
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onAdd}
              disabled={isAdded}
              className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                isAdded
                  ? 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isAdded ? 'Already Added' : 'Add to Dashboard'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Widget Configuration Modal
 */
export const WidgetConfigModal = ({ 
  widget, 
  config = {}, 
  onSave, 
  onClose,
  isOpen = false 
}) => {
  const [formData, setFormData] = useState(config);
  const configSchema = WIDGET_CONFIGS[widget?.id] || {};

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(formData);
    }
    onClose();
  }, [formData, onSave, onClose]);

  if (!isOpen || !widget) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Configure {widget.name}
          </h3>
          
          <div className="space-y-4">
            {Object.entries(configSchema).map(([field, fieldConfig]) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {fieldConfig.label}
                </label>
                
                {fieldConfig.type === 'select' && (
                  <select
                    value={formData[field] || fieldConfig.default}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  >
                    {fieldConfig.options.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                
                {fieldConfig.type === 'boolean' && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData[field] ?? fieldConfig.default}
                      onChange={(e) => handleInputChange(field, e.target.checked)}
                      className="mr-2 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Enable this option
                    </span>
                  </label>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex space-x-3 mt-6">
            <button
              onClick={handleSave}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Configuration
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetCatalog;