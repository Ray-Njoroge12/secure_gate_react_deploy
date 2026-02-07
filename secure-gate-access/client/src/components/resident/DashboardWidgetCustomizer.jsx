/**
 * @file DashboardWidgetCustomizer.jsx
 * @description Widget customization for resident dashboard
 * Allows users to show/hide, reorder, and resize dashboard widgets
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  GripVertical, 
  Eye, 
  EyeOff, 
  RotateCcw,
  X,
  Check
} from 'lucide-react';
import { Button, Card } from '../ui';

// Default widget configuration
const DEFAULT_WIDGETS = [
  { id: 'stats', name: 'Statistics Overview', icon: '📊', visible: true, order: 0 },
  { id: 'quick-invite', name: 'Quick Invite', icon: '✉️', visible: true, order: 1 },
  { id: 'upcoming-invites', name: 'Upcoming Invites', icon: '📅', visible: true, order: 2 },
  { id: 'recent-visitors', name: 'Recent Visitors', icon: '👥', visible: true, order: 3 },
  { id: 'quick-actions', name: 'Quick Actions', icon: '⚡', visible: true, order: 4 },
  { id: 'favorites', name: 'Favorite Visitors', icon: '⭐', visible: true, order: 5 },
  { id: 'deliveries', name: 'Pending Deliveries', icon: '📦', visible: true, order: 6 },
  { id: 'auto-approval', name: 'Auto-Approval Rules', icon: '🤖', visible: false, order: 7 },
  { id: 'insights', name: 'Visitor Insights', icon: '📈', visible: false, order: 8 },
  { id: 'live-feed', name: 'Live Visitor Feed', icon: '🔴', visible: true, order: 9 },
];

const STORAGE_KEY = 'dashboard_widget_config';

// Load widget configuration from localStorage
const loadWidgetConfig = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to handle new widgets
      return DEFAULT_WIDGETS.map(defaultWidget => {
        const saved = parsed.find(w => w.id === defaultWidget.id);
        return saved ? { ...defaultWidget, ...saved } : defaultWidget;
      });
    }
  } catch (e) {
    console.error('Failed to load widget config:', e);
  }
  return DEFAULT_WIDGETS;
};

// Save widget configuration to localStorage
const saveWidgetConfig = (config) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save widget config:', e);
  }
};

// Widget item for drag and drop
const WidgetItem = ({ widget, onToggleVisibility, onDragStart, onDragOver, onDrop, isDragging }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, widget.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, widget.id)}
      className={`
        flex items-center gap-3 p-3 rounded-lg border transition-all
        ${isDragging ? 'opacity-50 border-dashed border-brand-500' : 'border-gray-200 dark:border-slate-700'}
        ${widget.visible 
          ? 'bg-white dark:bg-slate-800' 
          : 'bg-gray-50 dark:bg-slate-900 opacity-60'
        }
        hover:shadow-sm cursor-grab active:cursor-grabbing
      `}
    >
      <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-300 flex-shrink-0" />
      
      <span className="text-lg">{widget.icon}</span>
      
      <span className={`flex-1 text-sm font-medium ${
        widget.visible ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-300'
      }`}>
        {widget.name}
      </span>
      
      <button
        onClick={() => onToggleVisibility(widget.id)}
        className={`p-1.5 rounded-md transition-colors ${
          widget.visible 
            ? 'text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20' 
            : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
        }`}
        aria-label={widget.visible ? `Hide ${widget.name}` : `Show ${widget.name}`}
      >
        {widget.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
    </div>
  );
};

// Main customizer modal
const DashboardWidgetCustomizer = ({ isOpen, onClose, onSave }) => {
  const [widgets, setWidgets] = useState([]);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load config on open
  useEffect(() => {
    if (isOpen) {
      setWidgets(loadWidgetConfig());
      setHasChanges(false);
    }
  }, [isOpen]);

  const handleToggleVisibility = (widgetId) => {
    setWidgets(prev => prev.map(w => 
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    ));
    setHasChanges(true);
  };

  const handleDragStart = (e, widgetId) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetId) return;

    setWidgets(prev => {
      const newWidgets = [...prev];
      const dragIndex = newWidgets.findIndex(w => w.id === draggedWidget);
      const dropIndex = newWidgets.findIndex(w => w.id === targetId);
      
      const [removed] = newWidgets.splice(dragIndex, 1);
      newWidgets.splice(dropIndex, 0, removed);
      
      // Update order
      return newWidgets.map((w, i) => ({ ...w, order: i }));
    });
    
    setDraggedWidget(null);
    setHasChanges(true);
  };

  const handleReset = () => {
    setWidgets(DEFAULT_WIDGETS);
    setHasChanges(true);
  };

  const handleSave = () => {
    saveWidgetConfig(widgets);
    onSave?.(widgets);
    onClose();
  };

  const visibleCount = widgets.filter(w => w.visible).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50">
        <Card className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Customize Dashboard
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Drag to reorder widgets. Click the eye icon to show/hide.
            </p>
            
            <div className="text-xs text-gray-500 dark:text-gray-300 mb-3">
              {visibleCount} of {widgets.length} widgets visible
            </div>
            
            <div className="space-y-2">
              {widgets
                .sort((a, b) => a.order - b.order)
                .map(widget => (
                  <WidgetItem
                    key={widget.id}
                    widget={widget}
                    onToggleVisibility={handleToggleVisibility}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    isDragging={draggedWidget === widget.id}
                  />
                ))}
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:text-gray-300"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Default
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges}
                className="bg-brand-600 hover:bg-brand-700 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};

// Hook to use widget configuration
export const useWidgetConfig = () => {
  const [widgets, setWidgets] = useState(loadWidgetConfig);
  
  const refreshConfig = () => {
    setWidgets(loadWidgetConfig());
  };
  
  const isWidgetVisible = (widgetId) => {
    const widget = widgets.find(w => w.id === widgetId);
    return widget?.visible ?? true;
  };
  
  const getWidgetOrder = (widgetId) => {
    const widget = widgets.find(w => w.id === widgetId);
    return widget?.order ?? 99;
  };
  
  const getVisibleWidgets = () => {
    return widgets
      .filter(w => w.visible)
      .sort((a, b) => a.order - b.order)
      .map(w => w.id);
  };
  
  return {
    widgets,
    refreshConfig,
    isWidgetVisible,
    getWidgetOrder,
    getVisibleWidgets,
  };
};

export default DashboardWidgetCustomizer;
