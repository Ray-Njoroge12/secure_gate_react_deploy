/**
 * DashboardWidget - Reusable dashboard widget component
 * 
 * Provides a consistent widget interface with:
 * - Role-based content adaptation
 * - Accessibility features
 * - Loading and error states
 * - Customizable actions and settings
 */

import React, { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { LayoutItem } from '../ui/LayoutManager.jsx';
import Loading from '../ui/Loading.jsx';
import ErrorDisplay from '../ui/ErrorDisplay.jsx';
import IconButton from '../ui/IconButton.jsx';
import Dropdown from '../ui/Dropdown.jsx';

/**
 * DashboardWidget Component
 */
export const DashboardWidget = ({
  id,
  title,
  subtitle,
  icon,
  children,
  loading = false,
  error = null,
  onRefresh,
  onSettings,
  onRemove,
  actions = [],
  className = '',
  headerClassName = '',
  contentClassName = '',
  showSettings = true,
  showRefresh = true,
  ...props
}) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(true);

  // Handle widget actions
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh(id);
    }
  }, [id, onRefresh]);

  const handleSettings = useCallback(() => {
    if (onSettings) {
      onSettings(id);
    }
  }, [id, onSettings]);

  const handleRemove = useCallback(() => {
    if (onRemove) {
      onRemove(id);
    }
  }, [id, onRemove]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Build widget actions menu
  const widgetActions = [
    ...(showRefresh ? [{
      label: 'Refresh',
      icon: 'refresh',
      onClick: handleRefresh,
      disabled: loading
    }] : []),
    ...(showSettings ? [{
      label: 'Settings',
      icon: 'settings',
      onClick: handleSettings
    }] : []),
    ...actions,
    ...(onRemove ? [{
      label: 'Remove',
      icon: 'trash',
      onClick: handleRemove,
      variant: 'danger'
    }] : [])
  ];

  return (
    <LayoutItem 
      className={`dashboard-widget ${className}`}
      {...props}
    >
      {/* Widget Header */}
      <div className={`widget-header flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 ${headerClassName}`}>
        <div className="flex items-center space-x-3">
          {icon && (
            <div className="widget-icon flex-shrink-0">
              {typeof icon === 'string' ? (
                <div className="w-6 h-6 text-gray-500 dark:text-gray-300">
                  {/* Icon placeholder - replace with actual icon component */}
                  <div className="w-full h-full bg-current opacity-20 rounded" />
                </div>
              ) : (
                icon
              )}
            </div>
          )}
          
          <div className="widget-title-section">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="widget-actions flex items-center space-x-2">
          {/* Expand/Collapse Button */}
          <IconButton
            icon={isExpanded ? 'chevron-up' : 'chevron-down'}
            onClick={handleToggleExpand}
            size="sm"
            variant="ghost"
            aria-label={isExpanded ? 'Collapse widget' : 'Expand widget'}
          />

          {/* Actions Menu */}
          {widgetActions.length > 0 && (
            <Dropdown
              trigger={
                <IconButton
                  icon="more-vertical"
                  size="sm"
                  variant="ghost"
                  aria-label="Widget actions"
                />
              }
              items={widgetActions}
              placement="bottom-end"
            />
          )}
        </div>
      </div>

      {/* Widget Content */}
      {isExpanded && (
        <div className={`widget-content ${contentClassName}`}>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loading size="md" message="Loading widget data..." />
            </div>
          ) : error ? (
            <div className="p-4">
              <ErrorDisplay 
                error={error}
                onRetry={handleRefresh}
                compact
              />
            </div>
          ) : (
            <div className="p-4">
              {children}
            </div>
          )}
        </div>
      )}
    </LayoutItem>
  );
};

/**
 * StatWidget - Specialized widget for displaying statistics
 */
export const StatWidget = ({
  title,
  value,
  change,
  changeType = 'neutral', // 'positive', 'negative', 'neutral'
  icon,
  trend = [],
  format = 'number',
  ...props
}) => {
  const formatValue = (val) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      }).format(val);
    }
    if (format === 'percentage') {
      return `${val}%`;
    }
    if (format === 'number') {
      return new Intl.NumberFormat('en-US').format(val);
    }
    return val;
  };

  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600 dark:text-green-400';
      case 'negative':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-300';
    }
  };

  return (
    <DashboardWidget
      title={title}
      icon={icon}
      {...props}
    >
      <div className="stat-widget-content">
        <div className="flex items-baseline justify-between">
          <div className="stat-value text-3xl font-bold text-gray-900 dark:text-white">
            {formatValue(value)}
          </div>
          
          {change !== undefined && (
            <div className={`stat-change text-sm font-medium ${getChangeColor()}`}>
              {change > 0 ? '+' : ''}{change}
              {format === 'percentage' ? 'pp' : '%'}
            </div>
          )}
        </div>

        {/* Simple trend visualization */}
        {trend.length > 0 && (
          <div className="stat-trend mt-4">
            <div className="flex items-end space-x-1 h-8">
              {trend.map((point, index) => (
                <div
                  key={index}
                  className="bg-blue-200 dark:bg-blue-800 rounded-sm flex-1"
                  style={{ 
                    height: `${Math.max(4, (point / Math.max(...trend)) * 100)}%` 
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardWidget>
  );
};

/**
 * ChartWidget - Widget for displaying charts and graphs
 */
export const ChartWidget = ({
  title,
  chartType = 'line',
  data = [],
  options = {},
  ...props
}) => {
  return (
    <DashboardWidget
      title={title}
      {...props}
    >
      <div className="chart-widget-content">
        {/* Placeholder for chart component */}
        <div className="chart-placeholder bg-gray-100 dark:bg-slate-700 rounded-lg h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 dark:text-gray-300 mb-2">
              Chart Component
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-300">
              {chartType} chart with {data.length} data points
            </div>
          </div>
        </div>
      </div>
    </DashboardWidget>
  );
};

/**
 * ListWidget - Widget for displaying lists of items
 */
export const ListWidget = ({
  title,
  items = [],
  renderItem,
  emptyMessage = 'No items to display',
  maxItems = 5,
  showViewAll = true,
  onViewAll,
  ...props
}) => {
  const displayItems = items.slice(0, maxItems);

  return (
    <DashboardWidget
      title={title}
      {...props}
    >
      <div className="list-widget-content">
        {displayItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-300">
            {emptyMessage}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {displayItems.map((item, index) => (
                <div key={item.id || index} className="list-item">
                  {renderItem ? renderItem(item, index) : (
                    <div className="text-sm text-gray-900 dark:text-white">
                      {item.title || item.name || String(item)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {showViewAll && items.length > maxItems && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={onViewAll}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  View all {items.length} items
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardWidget>
  );
};

export default DashboardWidget;