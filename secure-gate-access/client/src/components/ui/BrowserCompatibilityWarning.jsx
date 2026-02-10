/**
 * @fileoverview Browser Compatibility Warning Component
 * @description Displays browser compatibility warnings and recommendations
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { memo, useState, useCallback } from 'react';
import Icon from './Icon';
import { useBrowserCompatibility } from '../../contexts/BrowserCompatibilityContext';

/**
 * BrowserCompatibilityWarning component
 * 
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.show - Whether to show the warning
 * @param {Function} props.onDismiss - Function called when warning is dismissed
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} BrowserCompatibilityWarning component
 */
const BrowserCompatibilityWarning = memo(({
  show = true,
  onDismiss,
  className = '',
  ...props
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const {
    browserInfo,
    compatibility,
    warnings,
    recommendations,
    isCompatible,
    isOutdated,
    getBrowserDetails,
    getDeviceType
  } = useBrowserCompatibility();

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  }, [onDismiss]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  // Don't show if dismissed or not compatible
  if (!show || isDismissed || !browserInfo) return null;

  const browserDetails = getBrowserDetails();
  const deviceType = getDeviceType();
  const isBrowserOutdated = isOutdated();

  // Don't show warning if browser is compatible and not outdated
  if (isCompatible() && !isBrowserOutdated) return null;

  // Get warning level
  const getWarningLevel = () => {
    if (!isCompatible()) return 'error';
    if (isBrowserOutdated) return 'warning';
    if (warnings.length > 0) return 'info';
    return 'success';
  };

  const warningLevel = getWarningLevel();

  // Get warning icon
  const getWarningIcon = () => {
    switch (warningLevel) {
      case 'error':
        return <Icon name="alert-triangle" className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <Icon name="alert-triangle" className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Icon name="info" className="w-5 h-5 text-blue-500" />;
      default:
        return <Icon name="check-circle" className="w-5 h-5 text-green-500" />;
    }
  };

  // Get warning message
  const getWarningMessage = () => {
    if (!isCompatible()) {
      return `Your browser (${browserDetails.name} ${browserDetails.version || 'Unknown'}) is not supported. Please use a modern browser for the best experience.`;
    }
    if (isBrowserOutdated) {
      return `Your ${browserDetails.name} browser is outdated (version ${browserDetails.version}). Please update to the latest version for better performance and security.`;
    }
    if (warnings.length > 0) {
      return `Some features may not work correctly on your ${browserDetails.name} browser. Consider updating for the best experience.`;
    }
    return 'Your browser is compatible with this application.';
  };

  // Get warning color classes
  const getWarningClasses = () => {
    switch (warningLevel) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-green-50 border-green-200 text-green-800';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getWarningClasses()} ${className}`} {...props}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getWarningIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">
            Browser Compatibility {warningLevel === 'error' ? 'Error' : warningLevel === 'warning' ? 'Warning' : 'Notice'}
          </h3>
          <p className="mt-1 text-sm">
            {getWarningMessage()}
          </p>
          
          {/* Browser details */}
          <div className="mt-2 text-xs opacity-75">
            <p>Browser: {browserDetails.name} {browserDetails.version || 'Unknown'}</p>
            <p>Device: {deviceType}</p>
            <p>Platform: {browserInfo.platform}</p>
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            {!isCompatible() && (
              <a
                href="https://browsehappy.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-white dark:bg-slate-800 bg-opacity-50 dark:bg-opacity-50 hover:bg-opacity-75 rounded transition-colors"
              >
                <Icon name="external-link" className="w-3 h-3" />
                Download Modern Browser
              </a>
            )}
            
            {isBrowserOutdated && (
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-white dark:bg-slate-800 bg-opacity-50 dark:bg-opacity-50 hover:bg-opacity-75 rounded transition-colors"
              >
                <Icon name="refresh-cw" className="w-3 h-3" />
                Refresh Page
              </button>
            )}

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-white dark:bg-slate-800 bg-opacity-50 dark:bg-opacity-50 hover:bg-opacity-75 rounded transition-colors"
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </button>

            <button
              onClick={handleDismiss}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-white dark:bg-slate-800 bg-opacity-50 dark:bg-opacity-50 hover:bg-opacity-75 rounded transition-colors"
            >
              <Icon name="x" className="w-3 h-3" />
              Dismiss
            </button>
          </div>

          {/* Detailed information */}
          {showDetails && (
            <div className="mt-4 space-y-3">
              {/* Warnings */}
              {warnings.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium mb-2">Warnings:</h4>
                  <ul className="space-y-1">
                    {warnings.map((warning, index) => (
                      <li key={index} className="text-xs flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>{warning.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {recommendations && (
                <div>
                  <h4 className="text-xs font-medium mb-2">Recommendations:</h4>
                  <div className="space-y-2">
                    {recommendations.performance && recommendations.performance.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-600 dark:text-gray-200">Performance:</h5>
                        <ul className="space-y-1">
                          {recommendations.performance.map((rec, index) => (
                            <li key={index} className="text-xs flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {recommendations.security && recommendations.security.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-600 dark:text-gray-200">Security:</h5>
                        <ul className="space-y-1">
                          {recommendations.security.map((rec, index) => (
                            <li key={index} className="text-xs flex items-start gap-2">
                              <span className="text-red-500 mt-0.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {recommendations.features && recommendations.features.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-600 dark:text-gray-200">Features:</h5>
                        <ul className="space-y-1">
                          {recommendations.features.map((rec, index) => (
                            <li key={index} className="text-xs flex items-start gap-2">
                              <span className="text-yellow-500 mt-0.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

BrowserCompatibilityWarning.displayName = 'BrowserCompatibilityWarning';

export default BrowserCompatibilityWarning;



