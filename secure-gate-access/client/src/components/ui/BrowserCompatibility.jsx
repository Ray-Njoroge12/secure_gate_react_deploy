/**
 * @fileoverview Browser Compatibility Test Component
 * @description Development component for testing browser compatibility features
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { memo, useState, useCallback } from 'react';
import Icon from './Icon';
import { useBrowserCompatibility } from '../../contexts/BrowserCompatibilityContext';

/**
 * BrowserCompatibility component for development and testing
 * 
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.show - Whether to show the compatibility panel
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} BrowserCompatibility component
 */
const BrowserCompatibility = memo(({
  show = false,
  className = '',
  ...props
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const {
    browserInfo,
    featureSupport,
    compatibility,
    warnings,
    recommendations,
    isCompatible,
    isOutdated,
    getBrowserDetails,
    getDeviceType,
    getCapabilitiesSummary,
    refreshDetection
  } = useBrowserCompatibility();

  // Don't show in production
  if (process.env.NODE_ENV === 'production' && !show) return null;

  const browserDetails = getBrowserDetails();
  const deviceType = getDeviceType();
  const capabilitiesSummary = getCapabilitiesSummary();

  // Get feature support status
  const getFeatureStatus = (feature) => {
    if (featureSupport && featureSupport[feature]) {
      return { supported: true, icon: 'check-circle', color: 'text-green-500' };
    }
    return { supported: false, icon: 'x-circle', color: 'text-red-500' };
  };

  // Get warning level
  const getWarningLevel = () => {
    if (!isCompatible()) return 'error';
    if (isOutdated()) return 'warning';
    if (warnings.length > 0) return 'info';
    return 'success';
  };

  const warningLevel = getWarningLevel();

  // Render overview tab
  const renderOverview = () => (
    <div className="space-y-4">
      {/* Browser Info */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-200 mb-3">Browser Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Browser:</span>
            <span className="ml-2 text-slate-200">{browserDetails.name} {browserDetails.version || 'Unknown'}</span>
          </div>
          <div>
            <span className="text-slate-400">Device:</span>
            <span className="ml-2 text-slate-200 capitalize">{deviceType}</span>
          </div>
          <div>
            <span className="text-slate-400">Platform:</span>
            <span className="ml-2 text-slate-200">{browserInfo?.platform || 'Unknown'}</span>
          </div>
          <div>
            <span className="text-slate-400">Language:</span>
            <span className="ml-2 text-slate-200">{browserInfo?.language || 'Unknown'}</span>
          </div>
        </div>
      </div>

      {/* Compatibility Status */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-200 mb-3">Compatibility Status</h3>
        <div className="flex items-center gap-3">
          {warningLevel === 'error' && <Icon name="x-circle" className="w-6 h-6 text-red-500" />}
          {warningLevel === 'warning' && <Icon name="alert-triangle" className="w-6 h-6 text-yellow-500" />}
          {warningLevel === 'info' && <Icon name="info" className="w-6 h-6 text-blue-500" />}
          {warningLevel === 'success' && <Icon name="check-circle" className="w-6 h-6 text-green-500" />}
          <div>
            <p className={`text-lg font-medium ${
              warningLevel === 'error' ? 'text-red-400' :
              warningLevel === 'warning' ? 'text-yellow-400' :
              warningLevel === 'info' ? 'text-blue-400' :
              'text-green-400'
            }`}>
              {isCompatible() ? 'Compatible' : 'Not Compatible'}
            </p>
            <p className="text-sm text-slate-400">
              {capabilitiesSummary.supportedFeatures} of {capabilitiesSummary.totalFeatures} features supported
            </p>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-200 mb-3">Warnings</h3>
          <div className="space-y-2">
            {warnings.map((warning, index) => (
              <div key={index} className="flex items-start gap-2 p-2 bg-slate-700 rounded">
                <Icon name="alert-triangle" className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-200">{warning.message}</p>
                  <p className="text-xs text-slate-400 capitalize">{warning.type} • {warning.severity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Render features tab
  const renderFeatures = () => (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-200 mb-3">Feature Support</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featureSupport && Object.entries(featureSupport).map(([feature, supported]) => {
            const status = getFeatureStatus(feature);
            return (
              <div key={feature} className="flex items-center gap-3 p-2 bg-slate-700 rounded">
                <Icon name={status.icon} className={`w-4 h-4 ${status.color} flex-shrink-0`} />
                <span className="text-sm text-slate-200 capitalize">{feature.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  supported ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                }`}>
                  {supported ? 'Supported' : 'Not Supported'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Render recommendations tab
  const renderRecommendations = () => (
    <div className="space-y-4">
      {recommendations && (
        <>
          {recommendations.performance && recommendations.performance.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-200 mb-3">Performance Recommendations</h3>
              <ul className="space-y-2">
                {recommendations.performance.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-200">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendations.security && recommendations.security.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-200 mb-3">Security Recommendations</h3>
              <ul className="space-y-2">
                {recommendations.security.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-200">
                    <span className="text-red-500 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendations.features && recommendations.features.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-200 mb-3">Feature Recommendations</h3>
              <ul className="space-y-2">
                {recommendations.features.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-200">
                    <span className="text-yellow-500 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (!show) return null;

  return (
    <div className={`fixed bottom-4 right-4 w-96 max-h-96 bg-slate-900 border border-slate-600 rounded-lg shadow-lg z-50 ${className}`} {...props}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-600">
        <h2 className="text-lg font-semibold text-slate-200">Browser Compatibility</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshDetection}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh detection"
          >
            <Icon name="refresh-cw" className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.open('https://browsehappy.com/', '_blank')}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            title="Download modern browser"
          >
            <Icon name="download" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-600">
        {['overview', 'features', 'recommendations'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab
                ? 'text-brand-400 border-b-2 border-brand-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-h-80 overflow-y-auto">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'features' && renderFeatures()}
        {activeTab === 'recommendations' && renderRecommendations()}
      </div>
    </div>
  );
});

BrowserCompatibility.displayName = 'BrowserCompatibility';

export default BrowserCompatibility;



