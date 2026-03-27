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

// FIX: Substituted direct Lucide icons with Icon component usage in render method
// import { 
//   RefreshCw, 
//   Settings, 
//   Trash2, 
//   ChevronUp, 
//   ChevronDown, 
//   MoreVertical,
//   BarChart2, 
//   TrendingUp, 
//   Activity, 
//   AlertTriangle, 
//   Home, 
//   UserCheck, 
//   Users, 
//   Shield, 
//   QrCode, 
//   Clock, 
//   HelpCircle, 
//   UserPlus, 
//   Calendar 
// } from 'lucide-react';
import Button from '../ui/Button';
import Dropdown from '../ui/Dropdown.jsx';
import ErrorDisplay from '../ui/ErrorDisplay.jsx';
import Icon from '../ui/Icon.jsx';
import IconButton from '../ui/IconButton.jsx';
import Loading from '../ui/Loading.jsx';

/**
 * Icon mapping for dashboard widgets
 */
const ICON_MAP = {
  // Using strings to map to Icon component names
  'bar-chart': 'bar-chart-2',
  'trending-up': 'trending-up',
  'activity': 'activity',
  'alert-triangle': 'alert-triangle',
  'home': 'home',
  'user-check': 'user-check',
  'users': 'users',
  'shield': 'shield',
  'qr-code': 'qr-code',
  'clock': 'clock',
  'help-circle': 'help-circle',
  'user-plus': 'user-plus',
  'calendar': 'calendar',
  'refresh-cw': 'refresh-cw',
  'settings': 'settings',
  'trash-2': 'trash-2',
  'chevron-up': 'chevron-up',
  'chevron-down': 'chevron-down',
  'more-vertical': 'more-vertical'
};

/**
 * DashboardWidget Component
 */
export const DashboardWidget = ({
  id: _id,
  title,
  type,
  icon,
  children,
  onRemove,
  onRefresh,
  onSettings,
  isDraggable: _isDraggable = true,
  isLoading = false,
  error = null,
  headerActions = [],
  className = '',
  minHeight = '200px',
  ...props
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Get icon component
  // FIX: Using Icon component directly instead of looking up in ICON_MAP
  const iconName = ICON_MAP[icon] || 'activity';

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const defaultActions = [
    {
      label: 'Refresh',
      icon: <Icon name="refresh-cw" size={16} />,
      onClick: onRefresh,
      show: !!onRefresh
    },
    {
      label: 'Settings',
      icon: <Icon name="settings" size={16} />,
      onClick: onSettings,
      show: !!onSettings
    },
    {
      label: 'Remove',
      icon: <Icon name="trash-2" size={16} className="text-red-500" />,
      onClick: onRemove,
      show: !!onRemove
    }
  ];

  const actions = [...defaultActions, ...headerActions].filter(action => action.show);

  if (error) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-red-200 dark:border-red-900 ${className}`}>
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Icon name="alert-triangle" size={20} />
            <h3 className="font-semibold">{title}</h3>
          </div>
          <IconButton 
            icon={<Icon name="refresh-cw" size={16} />} 
            onClick={onRefresh} 
            label="Retry"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          />
        </div>
        <div className="p-6">
          <ErrorDisplay 
            message={error.message || 'Widget failed to load'} 
            onRetry={onRefresh}
          />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`
        flex flex-col bg-white dark:bg-slate-800 rounded-lg shadow-sm 
        border border-gray-100 dark:border-slate-700 transition-all duration-200
        ${isExpanded ? '' : 'h-auto'}
        ${className}
      `}
      style={{ minHeight: isExpanded ? minHeight : 'auto' }}
      {...props}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <Icon name={iconName} size={20} />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {title}
          </h3>
          {/* Tooltip/Help Icon */}
          <div className="group relative ml-1">
             <Icon name="help-circle" size={14} className="text-gray-400 cursor-help" />
             <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-100">
               {type} Widget
             </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {actions.length > 0 && (
            <Dropdown
              trigger={
                <IconButton 
                  icon={<Icon name="more-vertical" size={18} />} 
                  label="Widget options"
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                />
              }
              items={actions.map((action, index) => ({
                id: index,
                label: action.label,
                icon: action.icon,
                onClick: action.onClick,
                className: action.label === 'Remove' ? 'text-red-600 dark:text-red-400' : ''
              }))}
            />
          )}

          <IconButton
            icon={<Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} />}
            onClick={handleToggleExpand}
            label={isExpanded ? 'Collapse widget' : 'Expand widget'}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          />
        </div>
      </div>

      {/* Widget Content */}
      {isExpanded && (
        <div className="flex-1 p-4 overflow-hidden relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-800/50 z-10">
              <Loading size="md" />
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
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
                  className="bg-blue-200 dark:bg-blue-600/60 rounded-sm flex-1"
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
  options: _options = {},
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
                <Button
                  onClick={onViewAll}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  View all {items.length} items
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardWidget>
  );
};

export default DashboardWidget;