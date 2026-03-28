/**
 * @fileoverview Browser Compatibility Context
 * @description Context for managing browser compatibility and feature detection
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import logger from 'utils/logger';

import { browserDetection } from '../utils/browserDetection';

const BrowserCompatibilityContext = createContext(null);

export const BrowserCompatibilityProvider = ({ children }) => {
  const [browserInfo, setBrowserInfo] = useState(null);
  const [featureSupport, setFeatureSupport] = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [warnings, setWarnings] = useState([]);
  const [recommendations, setRecommendations] = useState(null);

  // Initialize browser detection
  const initializeBrowserDetection = useCallback(() => {
    try {
      const compat = browserDetection.checkCompatibility();
      const browser = compat.browser;
      const features = compat.features;
      const warns = compat.warnings;
      const recs = browserDetection.getRecommendations();

      setBrowserInfo(browser);
      setFeatureSupport(features);
      setCompatibility(compat);
      setWarnings(warns);
      setRecommendations(recs);
      setIsLoading(false);

      // Log compatibility status in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[BROWSER] Compatibility check:', compat);
        if (warns && warns.length > 0) {
          logger.warn('[BROWSER] Warnings:', warns);
        }
      }
    } catch (error) {
      logger.error('[BROWSER] Failed to initialize browser detection:', error);
      setIsLoading(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeBrowserDetection();
  }, [initializeBrowserDetection]);

  // Check if a specific feature is supported
  const isFeatureSupported = useCallback((feature) => {
    return featureSupport ? featureSupport[feature] : false;
  }, [featureSupport]);

  // Check if browser is compatible
  const isCompatible = useCallback(() => {
    return compatibility ? compatibility.isCompatible : false;
  }, [compatibility]);

  // Get browser-specific recommendations
  const getRecommendations = useCallback(() => {
    return recommendations || {};
  }, [recommendations]);

  // Get warnings for current browser
  const getWarnings = useCallback(() => {
    return warnings || [];
  }, [warnings]);

  // Check if running on mobile
  const isMobile = useCallback(() => {
    return browserInfo ? browserInfo.isMobile : false;
  }, [browserInfo]);

  // Check if running on tablet
  const isTablet = useCallback(() => {
    return browserInfo ? browserInfo.isTablet : false;
  }, [browserInfo]);

  // Check if running on desktop
  const isDesktop = useCallback(() => {
    return browserInfo ? browserInfo.isDesktop : false;
  }, [browserInfo]);

  // Get device type
  const getDeviceType = useCallback(() => {
    if (!browserInfo) return 'unknown';
    if (browserInfo.isMobile) return 'mobile';
    if (browserInfo.isTablet) return 'tablet';
    if (browserInfo.isDesktop) return 'desktop';
    return 'unknown';
  }, [browserInfo]);

  // Get browser name and version
  const getBrowserDetails = useCallback(() => {
    if (!browserInfo) return { name: 'Unknown', version: null };
    return {
      name: browserInfo.name,
      version: browserInfo.version
    };
  }, [browserInfo]);

  // Check if browser is outdated
  const isOutdated = useCallback(() => {
    if (!browserInfo || !browserInfo.version) return false;
    
    const { name, version } = browserInfo;
    
    // Define minimum supported versions
    const minVersions = {
      'Chrome': 60,
      'Firefox': 60,
      'Safari': 12,
      'Edge': 79
    };
    
    const minVersion = minVersions[name];
    return minVersion ? version < minVersion : false;
  }, [browserInfo]);

  // Get performance recommendations
  const getPerformanceRecommendations = useCallback(() => {
    if (!recommendations) return [];
    return recommendations.performance || [];
  }, [recommendations]);

  // Get security recommendations
  const getSecurityRecommendations = useCallback(() => {
    if (!recommendations) return [];
    return recommendations.security || [];
  }, [recommendations]);

  // Get feature recommendations
  const getFeatureRecommendations = useCallback(() => {
    if (!recommendations) return [];
    return recommendations.features || [];
  }, [recommendations]);

  // Check if specific CSS feature is supported
  const isCSSFeatureSupported = useCallback((feature) => {
    if (!featureSupport) return false;
    
    const cssFeatures = {
      'grid': 'cssGrid',
      'flexbox': 'cssFlexbox',
      'custom-properties': 'cssCustomProperties',
      'transforms': 'cssTransforms',
      'transitions': 'cssTransitions',
      'animations': 'cssAnimations'
    };
    
    const featureKey = cssFeatures[feature];
    return featureKey ? featureSupport[featureKey] : false;
  }, [featureSupport]);

  // Check if specific Web API is supported
  const isWebAPISupported = useCallback((api) => {
    if (!featureSupport) return false;
    
    const webAPIs = {
      'fetch': 'fetch',
      'promises': 'promises',
      'webworkers': 'webWorkers',
      'serviceworkers': 'serviceWorkers',
      'webrtc': 'webRTC',
      'geolocation': 'geolocation',
      'notifications': 'notifications',
      'localStorage': 'localStorage',
      'sessionStorage': 'sessionStorage',
      'indexedDB': 'indexedDB'
    };
    
    const apiKey = webAPIs[api];
    return apiKey ? featureSupport[apiKey] : false;
  }, [featureSupport]);

  // Get capabilities summary
  const getCapabilitiesSummary = useCallback(() => {
    return browserDetection.getCapabilitiesSummary();
  }, []);

  // Refresh browser detection (useful for testing)
  const refreshDetection = useCallback(() => {
    setIsLoading(true);
    browserDetection.clearFeatureSupportCache();
    initializeBrowserDetection();
  }, [initializeBrowserDetection]);

  const value = {
    // State
    browserInfo,
    featureSupport,
    compatibility,
    isLoading,
    warnings,
    recommendations,

    // Actions
    isFeatureSupported,
    isCompatible,
    getRecommendations,
    getWarnings,
    isMobile,
    isTablet,
    isDesktop,
    getDeviceType,
    getBrowserDetails,
    isOutdated,
    getPerformanceRecommendations,
    getSecurityRecommendations,
    getFeatureRecommendations,
    isCSSFeatureSupported,
    isWebAPISupported,
    getCapabilitiesSummary,
    refreshDetection
  };

  return (
    <BrowserCompatibilityContext.Provider value={value}>
      {children}
    </BrowserCompatibilityContext.Provider>
  );
};

export const useBrowserCompatibility = () => {
  const context = useContext(BrowserCompatibilityContext);
  if (!context) {
    throw new Error('useBrowserCompatibility must be used within a BrowserCompatibilityProvider');
  }
  return context;
};

export { BrowserCompatibilityContext };
export default BrowserCompatibilityContext;