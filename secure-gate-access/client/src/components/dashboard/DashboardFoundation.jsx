/**
 * Enhanced Dashboard Foundation with drag-and-drop widget system
 * 
 * Provides the foundational dashboard system with:
 * - Role-based dashboard layouts with customization
 * - Drag-and-drop widget arrangement with collision detection
 * - Widget resize capabilities with constraints
 * - Real-time layout saving and persistence
 * - Widget catalog and configuration system
 * - Accessibility compliance with keyboard navigation
 * - Performance optimizations for large dashboards
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { useThemeEngine } from '../../contexts/ThemeEngine.jsx';
import { useEnhancedResponsive } from '../../hooks/useEnhancedResponsive.js';
import { useAccessibility } from '../../hooks/useAccessibility.js';
import { AdaptiveComponent } from '../ui/AdaptiveComponent.jsx';
import { LayoutManager, useLayoutPersistence } from '../ui/LayoutManager.jsx';
import { DashboardWidget, StatWidget, ChartWidget, ListWidget } from './DashboardWidget.jsx';
import { WidgetCatalog, WidgetConfigModal } from './WidgetCatalog.jsx';
import { DashboardControls } from './DashboardControls.jsx';
import Button from '../ui/Button';

/**
 * Default dashboard layouts for each role
 */
const DEFAULT_LAYOUTS = {
  super_admin: [
    { i: 'platform-overview', x: 0, y: 0, w: 12, h: 4 },
    { i: 'estate-metrics', x: 0, y: 4, w: 6, h: 6 },
    { i: 'system-health', x: 6, y: 4, w: 6, h: 6 },
    { i: 'user-activity', x: 0, y: 10, w: 8, h: 4 },
    { i: 'alert-center', x: 8, y: 10, w: 4, h: 4 }
  ],
  admin: [
    { i: 'estate-overview', x: 0, y: 0, w: 8, h: 4 },
    { i: 'pending-approvals', x: 8, y: 0, w: 4, h: 4 },
    { i: 'visitor-analytics', x: 0, y: 4, w: 6, h: 6 },
    { i: 'security-alerts', x: 6, y: 4, w: 6, h: 6 },
    { i: 'user-management', x: 0, y: 10, w: 12, h: 4 }
  ],
  guard: [
    { i: 'qr-scanner', x: 0, y: 0, w: 6, h: 8 },
    { i: 'visitor-queue', x: 6, y: 0, w: 6, h: 8 },
    { i: 'emergency-panel', x: 0, y: 8, w: 4, h: 4 },
    { i: 'shift-info', x: 4, y: 8, w: 8, h: 4 }
  ],
  resident: [
    { i: 'quick-invite', x: 0, y: 0, w: 6, h: 4 },
    { i: 'visitor-status', x: 6, y: 0, w: 6, h: 4 },
    { i: 'upcoming-visits', x: 0, y: 4, w: 8, h: 6 },
    { i: 'recent-activity', x: 8, y: 4, w: 4, h: 6 },
    { i: 'favorites', x: 0, y: 10, w: 12, h: 4 }
  ],
  visitor: [
    { i: 'visit-status', x: 0, y: 0, w: 12, h: 6 },
    { i: 'qr-display', x: 0, y: 6, w: 6, h: 6 },
    { i: 'visit-details', x: 6, y: 6, w: 6, h: 6 }
  ]
};

/**
 * Role-based widget restrictions and permissions
 */
const ROLE_RESTRICTIONS = {
  super_admin: {
    preventDrag: [], // Super admins can drag all widgets
    preventResize: [],
    preventRemove: []
  },
  admin: {
    preventDrag: [], // Admins can drag all their widgets
    preventResize: [],
    preventRemove: ['estate-overview'] // Can't remove main overview
  },
  guard: {
    preventDrag: ['emergency-panel'], // Emergency panel stays fixed
    preventResize: ['emergency-panel', 'qr-scanner'],
    preventRemove: ['emergency-panel', 'qr-scanner'] // Core widgets can't be removed
  },
  resident: {
    preventDrag: [],
    preventResize: [],
    preventRemove: ['quick-invite'] // Quick invite is essential
  },
  visitor: {
    preventDrag: ['visit-status', 'qr-display'], // Visitors can't customize
    preventResize: ['visit-status', 'qr-display'],
    preventRemove: ['visit-status', 'qr-display']
  }
};

/**
 * Widget component mapping
 */
const WIDGET_COMPONENTS = {
  // Super Admin Widgets
  'platform-overview': ({ data }) => (
    <StatWidget
      title="Platform Overview"
      value={data?.totalEstates || 0}
      format="number"
      change={data?.estateGrowth || 0}
      changeType={data?.estateGrowth > 0 ? 'positive' : 'neutral'}
      icon="building"
    />
  ),
  'estate-metrics': ({ data }) => (
    <ChartWidget
      title="Estate Metrics"
      chartType="line"
      data={data?.metrics || []}
    />
  ),
  'system-health': ({ data }) => (
    <StatWidget
      title="System Health"
      value={data?.uptime || 99.9}
      format="percentage"
      changeType="positive"
      icon="activity"
    />
  ),
  'user-activity': ({ data }) => (
    <ListWidget
      title="Recent User Activity"
      items={data?.activities || []}
      renderItem={(activity) => (
        <div className="flex justify-between items-center">
          <span>{activity.user}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{activity.action}</span>
        </div>
      )}
    />
  ),
  'alert-center': ({ data }) => (
    <ListWidget
      title="System Alerts"
      items={data?.alerts || []}
      renderItem={(alert) => (
        <div className={`p-2 rounded ${alert.severity === 'high' ? 'bg-red-100' : 'bg-yellow-100'}`}>
          <div className="font-medium">{alert.title}</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">{alert.message}</div>
        </div>
      )}
    />
  ),

  // Admin Widgets
  'estate-overview': ({ data }) => (
    <StatWidget
      title="Estate Overview"
      value={data?.totalVisitors || 0}
      format="number"
      change={data?.visitorGrowth || 0}
      changeType={data?.visitorGrowth > 0 ? 'positive' : 'neutral'}
      icon="users"
    />
  ),
  'pending-approvals': ({ data }) => (
    <ListWidget
      title="Pending Approvals"
      items={data?.pendingUsers || []}
      renderItem={(user) => (
        <div className="flex justify-between items-center">
          <div>
            <div className="font-medium">{user.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{user.role}</div>
          </div>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" className="text-brand-600 hover:text-brand-800">Approve</Button>
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800">Reject</Button>
          </div>
        </div>
      )}
    />
  ),
  'visitor-analytics': ({ data }) => (
    <ChartWidget
      title="Visitor Analytics"
      chartType="bar"
      data={data?.visitorStats || []}
    />
  ),
  'security-alerts': ({ data }) => (
    <ListWidget
      title="Security Alerts"
      items={data?.securityAlerts || []}
      renderItem={(alert) => (
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${alert.level === 'high' ? 'bg-red-500' : 'bg-yellow-500'}`} />
          <div>
            <div className="font-medium">{alert.type}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{alert.time}</div>
          </div>
        </div>
      )}
    />
  ),

  // Guard Widgets
  'qr-scanner': () => (
    <DashboardWidget title="QR Scanner" icon="qr-code">
      <div className="flex flex-col items-center justify-center h-48">
        <div className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg flex items-center justify-center">
          <span className="text-gray-500 dark:text-gray-400">QR Scanner</span>
        </div>
        <Button variant="primary" className="mt-4 px-4 py-2">
          Start Scanning
        </Button>
      </div>
    </DashboardWidget>
  ),
  'visitor-queue': ({ data }) => (
    <ListWidget
      title="Visitor Queue"
      items={data?.queue || []}
      renderItem={(visitor) => (
        <div className="flex justify-between items-center">
          <div>
            <div className="font-medium">{visitor.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Expected: {visitor.expectedTime}</div>
          </div>
          <div className="flex space-x-2">
            <Button variant="success" size="sm">Check In</Button>
          </div>
        </div>
      )}
    />
  ),
  'emergency-panel': () => (
    <DashboardWidget title="Emergency" icon="alert-triangle">
      <div className="flex flex-col space-y-3">
        <Button variant="danger" className="w-full py-3 font-semibold">
          EMERGENCY ALERT
        </Button>
        <Button variant="warning" className="w-full py-2">
          Security Incident
        </Button>
        <Button variant="warning" className="w-full py-2 bg-yellow-600 hover:bg-yellow-700">
          Maintenance Request
        </Button>
      </div>
    </DashboardWidget>
  ),

  // Resident Widgets
  'quick-invite': () => (
    <DashboardWidget title="Quick Invite" icon="user-plus">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Visitor name"
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="tel"
          placeholder="Phone number"
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <Button variant="primary" className="w-full py-2">
          Send Invitation
        </Button>
      </div>
    </DashboardWidget>
  ),
  'visitor-status': ({ data }) => (
    <StatWidget
      title="Today's Visitors"
      value={data?.todayVisitors || 0}
      format="number"
      change={data?.visitorChange || 0}
      changeType={data?.visitorChange > 0 ? 'positive' : 'neutral'}
      icon="users"
    />
  ),
  'upcoming-visits': ({ data }) => (
    <ListWidget
      title="Upcoming Visits"
      items={data?.upcomingVisits || []}
      renderItem={(visit) => (
        <div className="flex justify-between items-center">
          <div>
            <div className="font-medium">{visit.visitorName}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{visit.expectedTime}</div>
          </div>
          <span className={`px-2 py-1 rounded text-xs ${
            visit.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {visit.status}
          </span>
        </div>
      )}
    />
  ),

  // Visitor Widgets
  'visit-status': ({ data }) => (
    <DashboardWidget title="Visit Status" icon="calendar">
      <div className="text-center space-y-4">
        <div className="text-3xl font-bold text-blue-600">
          {data?.status || 'Pending'}
        </div>
        <div className="text-gray-600 dark:text-gray-300">
          Visit to {data?.estateName || 'Estate'}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Expected: {data?.expectedTime || 'TBD'}
        </div>
      </div>
    </DashboardWidget>
  ),
  'qr-display': ({ data }) => (
    <DashboardWidget title="Access Pass" icon="qr-code">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="w-32 h-32 bg-gray-100 dark:bg-slate-700 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg flex items-center justify-center">
          <span className="text-gray-500 dark:text-gray-400">QR Code</span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 text-center">
          Show this code at the gate
        </div>
      </div>
    </DashboardWidget>
  )
};

/**
 * Enhanced Dashboard Foundation Component with widget management
 */
export const DashboardFoundation = ({ 
  data = {},
  onWidgetAction,
  onLayoutChange,
  customWidgets = {},
  className = ''
}) => {
  const { user } = useAuth();
  const themeEngine = useThemeEngine();
  const responsive = useEnhancedResponsive({ enableContainerQueries: true });
  const { accessibilityState, announce } = useAccessibility();

  const role = user?.role || 'visitor';
  const layoutKey = `dashboard-${role}`;
  
  // Enhanced layout persistence with conflict resolution
  const { 
    layout, 
    saveLayout, 
    resetLayout, 
    isLoading,
    lastSaved,
    exportLayout,
    importLayout 
  } = useLayoutPersistence(layoutKey, DEFAULT_LAYOUTS[role] || [], {
    autoSave: true,
    saveDelay: 1000,
    enableConflictResolution: true
  });

  // Widget management state
  const [showWidgetCatalog, setShowWidgetCatalog] = useState(false);
  const [configureWidget, setConfigureWidget] = useState(null);
  const [widgetConfigs, setWidgetConfigs] = useState({});

  // Combined widget components (built-in + custom)
  const widgetComponents = useMemo(() => {
    return { ...WIDGET_COMPONENTS, ...customWidgets };
  }, [customWidgets]);

  // Role restrictions for current user
  const roleRestrictions = useMemo(() => {
    return ROLE_RESTRICTIONS[role] || ROLE_RESTRICTIONS.visitor;
  }, [role]);

  // Enhanced layout change handler with performance optimization
  const handleLayoutChange = useCallback((newLayout, source = 'user') => {
    saveLayout(newLayout);
    if (onLayoutChange) {
      onLayoutChange(newLayout, source);
    }
    
    // Announce significant layout changes
    if (source === 'drag') {
      announce('Widget moved');
    } else if (source === 'resize') {
      announce('Widget resized');
    }
  }, [saveLayout, onLayoutChange, announce]);

  // Handle widget resize with configuration updates
  const handleWidgetResize = useCallback((widgetId, newSize) => {
    // Update widget configuration if needed
    const currentConfig = widgetConfigs[widgetId] || {};
    const updatedConfig = {
      ...currentConfig,
      size: { w: newSize.w, h: newSize.h }
    };
    
    setWidgetConfigs(prev => ({
      ...prev,
      [widgetId]: updatedConfig
    }));
    
    announce(`Widget ${widgetId} resized to ${newSize.w} by ${newSize.h}`);
  }, [widgetConfigs, announce]);

  // Handle widget actions with enhanced functionality
  const handleWidgetAction = useCallback((widgetId, action, ...args) => {
    switch (action) {
      case 'configure':
        setConfigureWidget(widgetId);
        break;
      case 'remove':
        if (!roleRestrictions.preventRemove?.includes(widgetId)) {
          const newLayout = layout.filter(item => item.i !== widgetId);
          handleLayoutChange(newLayout, 'remove');
          announce(`Widget ${widgetId} removed from dashboard`);
        } else {
          announce(`Widget ${widgetId} cannot be removed`);
        }
        break;
      case 'refresh':
        // Trigger widget data refresh
        if (onWidgetAction) {
          onWidgetAction(widgetId, action, ...args);
        }
        announce(`Widget ${widgetId} refreshed`);
        break;
      default:
        if (onWidgetAction) {
          onWidgetAction(widgetId, action, ...args);
        }
    }
  }, [layout, roleRestrictions, handleLayoutChange, onWidgetAction, announce]);

  // Handle adding new widgets from catalog
  const handleAddWidget = useCallback((newItem, widgetInfo) => {
    const updatedLayout = [...layout, newItem];
    handleLayoutChange(updatedLayout, 'add');
    
    // Initialize widget configuration
    if (widgetInfo.configurable) {
      setWidgetConfigs(prev => ({
        ...prev,
        [newItem.i]: {}
      }));
    }
    
    setShowWidgetCatalog(false);
  }, [layout, handleLayoutChange]);

  // Handle widget configuration save
  const handleWidgetConfigSave = useCallback((config) => {
    if (configureWidget) {
      setWidgetConfigs(prev => ({
        ...prev,
        [configureWidget]: config
      }));
      announce(`Configuration saved for widget ${configureWidget}`);
    }
  }, [configureWidget, announce]);

  // Reset dashboard layout with confirmation
  const handleResetLayout = useCallback(() => {
    if (window.confirm('Are you sure you want to reset your dashboard layout? This cannot be undone.')) {
      resetLayout();
      setWidgetConfigs({});
      announce('Dashboard layout reset to default');
    }
  }, [resetLayout, announce]);

  // Export dashboard configuration
  const handleExportDashboard = useCallback(() => {
    try {
      const exportData = {
        ...exportLayout(),
        widgetConfigs,
        role,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-${role}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      announce('Dashboard configuration exported');
    } catch (error) {
      console.error('Failed to export dashboard:', error);
      announce('Failed to export dashboard configuration');
    }
  }, [exportLayout, widgetConfigs, role, announce]);

  // Import dashboard configuration
  const handleImportDashboard = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        
        if (importData.metadata?.role !== role) {
          if (!window.confirm(`This configuration is for ${importData.metadata?.role} role. Import anyway?`)) {
            return;
          }
        }
        
        importLayout(importData);
        if (importData.widgetConfigs) {
          setWidgetConfigs(importData.widgetConfigs);
        }
        
        announce('Dashboard configuration imported successfully');
      } catch (error) {
        console.error('Failed to import dashboard:', error);
        announce('Failed to import dashboard configuration');
      }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  }, [role, importLayout, announce]);

  // Render widgets based on layout with enhanced error handling
  const renderWidgets = useCallback(() => {
    return layout.map((item) => {
      const WidgetComponent = widgetComponents[item.i];
      
      if (!WidgetComponent) {
        return (
          <DashboardWidget
            key={item.i}
            id={item.i}
            title="Unknown Widget"
            error="Widget component not found"
            onRemove={() => handleWidgetAction(item.i, 'remove')}
          />
        );
      }

      const widgetConfig = widgetConfigs[item.i] || {};
      const widgetData = data[item.i];

      return (
        <WidgetComponent
          key={item.i}
          data={widgetData}
          config={widgetConfig}
          onAction={(...args) => handleWidgetAction(item.i, ...args)}
          onConfigure={() => handleWidgetAction(item.i, 'configure')}
          onRemove={() => handleWidgetAction(item.i, 'remove')}
          loading={widgetData?.loading}
          error={widgetData?.error}
        />
      );
    });
  }, [layout, widgetComponents, widgetConfigs, data, handleWidgetAction]);

  // Loading state
  if (isLoading) {
    return (
      <div className="dashboard-loading flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Role-specific dashboard variants with enhanced controls
  const dashboardVariants = {
    super_admin: () => (
      <div className="dashboard-super-admin">
        <div className="dashboard-header mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Platform Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Monitor and manage the entire SecureGate platform
              </p>
            </div>
            <DashboardControls
              onAddWidget={() => setShowWidgetCatalog(true)}
              onResetLayout={handleResetLayout}
              onExportDashboard={handleExportDashboard}
              onImportDashboard={handleImportDashboard}
              lastSaved={lastSaved}
              role={role}
            />
          </div>
        </div>
        <LayoutManager
          layout={layout}
          onLayoutChange={handleLayoutChange}
          onWidgetResize={handleWidgetResize}
          isDraggable={!accessibilityState.isScreenReader}
          isResizable={!accessibilityState.isScreenReader}
          roleRestrictions={roleRestrictions}
        >
          {renderWidgets()}
        </LayoutManager>
      </div>
    ),

    admin: () => (
      <div className="dashboard-admin">
        <div className="dashboard-header mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Estate Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage your estate and monitor visitor activity
              </p>
            </div>
            <DashboardControls
              onAddWidget={() => setShowWidgetCatalog(true)}
              onResetLayout={handleResetLayout}
              onExportDashboard={handleExportDashboard}
              onImportDashboard={handleImportDashboard}
              lastSaved={lastSaved}
              role={role}
            />
          </div>
        </div>
        <LayoutManager
          layout={layout}
          onLayoutChange={handleLayoutChange}
          onWidgetResize={handleWidgetResize}
          isDraggable={!accessibilityState.isScreenReader}
          isResizable={!accessibilityState.isScreenReader}
          roleRestrictions={roleRestrictions}
        >
          {renderWidgets()}
        </LayoutManager>
      </div>
    ),

    guard: () => (
      <div className="dashboard-guard">
        <div className="dashboard-header mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Security Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Monitor visitors and manage security operations
              </p>
            </div>
            <DashboardControls
              onAddWidget={() => setShowWidgetCatalog(true)}
              onResetLayout={handleResetLayout}
              lastSaved={lastSaved}
              role={role}
              simplified={true} // Simplified controls for guards
            />
          </div>
        </div>
        <LayoutManager
          layout={layout}
          onLayoutChange={handleLayoutChange}
          onWidgetResize={handleWidgetResize}
          isDraggable={!accessibilityState.isScreenReader}
          isResizable={!accessibilityState.isScreenReader}
          roleRestrictions={roleRestrictions}
          gridConfig={{
            ...LayoutManager.defaultProps?.gridConfig,
            cols: { lg: 12, md: 8, sm: 4, xs: 2, xxs: 1 } // Mobile-optimized for guards
          }}
        >
          {renderWidgets()}
        </LayoutManager>
      </div>
    ),

    resident: () => (
      <div className="dashboard-resident">
        <div className="dashboard-header mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Resident Portal
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage your visitors and invitations
              </p>
            </div>
            <DashboardControls
              onAddWidget={() => setShowWidgetCatalog(true)}
              onResetLayout={handleResetLayout}
              onExportDashboard={handleExportDashboard}
              onImportDashboard={handleImportDashboard}
              lastSaved={lastSaved}
              role={role}
            />
          </div>
        </div>
        <LayoutManager
          layout={layout}
          onLayoutChange={handleLayoutChange}
          onWidgetResize={handleWidgetResize}
          isDraggable={!accessibilityState.isScreenReader}
          isResizable={!accessibilityState.isScreenReader}
          roleRestrictions={roleRestrictions}
        >
          {renderWidgets()}
        </LayoutManager>
      </div>
    ),

    visitor: () => (
      <div className="dashboard-visitor">
        <div className="dashboard-header mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Visitor Access
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Your visit information and access details
          </p>
        </div>
        <LayoutManager
          layout={layout}
          onLayoutChange={handleLayoutChange}
          isDraggable={false} // Visitors can't customize layout
          isResizable={false}
          roleRestrictions={roleRestrictions}
        >
          {renderWidgets()}
        </LayoutManager>
      </div>
    ),

    default: () => (
      <div className="dashboard-default">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Welcome to SecureGate
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Please log in to access your dashboard
          </p>
        </div>
      </div>
    )
  };

  return (
    <div className={`dashboard-foundation ${themeEngine.generateThemeClasses()} ${className}`}>
      {/* Adaptive Dashboard Content */}
      <AdaptiveComponent
        variants={dashboardVariants}
        enableContainerQueries={true}
        className="dashboard-content"
      />

      {/* Widget Catalog */}
      <WidgetCatalog
        isOpen={showWidgetCatalog}
        onClose={() => setShowWidgetCatalog(false)}
        onAddWidget={handleAddWidget}
        currentLayout={layout}
      />

      {/* Widget Configuration Modal */}
      <WidgetConfigModal
        widget={configureWidget ? { id: configureWidget, name: configureWidget } : null}
        config={widgetConfigs[configureWidget] || {}}
        onSave={handleWidgetConfigSave}
        onClose={() => setConfigureWidget(null)}
        isOpen={!!configureWidget}
      />
    </div>
  );
};

export default DashboardFoundation;