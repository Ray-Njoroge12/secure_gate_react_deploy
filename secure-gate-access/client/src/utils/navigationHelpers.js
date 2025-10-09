/**
 * Navigation Helper Utilities
 * 
 * Additional utilities for navigation including:
 * - Deep linking support
 * - Navigation state persistence
 * - Route validation
 * - Navigation shortcuts
 * - Breadcrumb utilities
 */

import { NAVIGATION_FLOWS, ROLE_REDIRECTS } from './navigationFlow';

import logger from './logger';
// Deep linking utilities
export const deepLinkUtils = {
  // Parse deep link parameters
  parseDeepLink: (url) => {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      
      return {
        path: urlObj.pathname,
        params: Object.fromEntries(params.entries()),
        hash: urlObj.hash,
        isValid: true
      };
    } catch (error) {
      return {
        path: url,
        params: {},
        hash: '',
        isValid: false,
        error: error.message
      };
    }
  },

  // Create deep link
  createDeepLink: (path, params = {}, hash = '') => {
    const url = new URL(path, window.location.origin);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    
    if (hash) {
      url.hash = hash;
    }
    
    return url.toString();
  },

  // Check if URL is a deep link
  isDeepLink: (url) => {
    return url.includes('?') || url.includes('#');
  }
};

// Navigation state persistence
export const navigationStateUtils = {
  // Save navigation state to localStorage
  saveNavigationState: (state) => {
    try {
      const stateToSave = {
        ...state,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      };
      localStorage.setItem('navigationState', JSON.stringify(stateToSave));
      return true;
    } catch (error) {
      logger.error('Failed to save navigation state:', error);
      return false;
    }
  },

  // Load navigation state from localStorage
  loadNavigationState: () => {
    try {
      const saved = localStorage.getItem('navigationState');
      if (!saved) return null;
      
      const state = JSON.parse(saved);
      
      // Check if state is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - state.timestamp > maxAge) {
        localStorage.removeItem('navigationState');
        return null;
      }
      
      return state;
    } catch (error) {
      logger.error('Failed to load navigation state:', error);
      return null;
    }
  },

  // Clear navigation state
  clearNavigationState: () => {
    localStorage.removeItem('navigationState');
  }
};

// Route validation utilities
export const routeValidationUtils = {
  // Validate route path
  validateRoute: (path, allowedRoutes = []) => {
    if (!path || typeof path !== 'string') return false;
    
    // Check if path starts with /
    if (!path.startsWith('/')) return false;
    
    // Check against allowed routes if provided
    if (allowedRoutes.length > 0) {
      return allowedRoutes.some(route => {
        if (typeof route === 'string') {
          return path === route || path.startsWith(route + '/');
        }
        if (route instanceof RegExp) {
          return route.test(path);
        }
        return false;
      });
    }
    
    return true;
  },

  // Check if route requires authentication
  requiresAuth: (path) => {
    const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
    return !publicRoutes.includes(path);
  },

  // Check if route is accessible by role
  isAccessibleByRole: (path, userRole) => {
    if (!userRole) return false;
    
    // Define role-based route patterns
    const rolePatterns = {
      resident: [/^\/resident/, /^\/dashboard\/resident/],
      guard: [/^\/guard/, /^\/dashboard\/guard/],
      admin: [/^\/admin/, /^\/dashboard\/admin/]
    };
    
    const patterns = rolePatterns[userRole] || [];
    return patterns.some(pattern => pattern.test(path));
  }
};

// Navigation shortcuts
export const navigationShortcuts = {
  // Register keyboard shortcuts
  registerShortcuts: (shortcuts) => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const modifiers = {
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey
      };
      
      const shortcutKey = Object.entries(modifiers)
        .filter(([_, pressed]) => pressed)
        .map(([key]) => key)
        .concat(key)
        .join('+');
      
      const shortcut = shortcuts[shortcutKey];
      if (shortcut) {
        event.preventDefault();
        shortcut.handler(event);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => document.removeEventListener('keydown', handleKeyDown);
  },

  // Default navigation shortcuts
  getDefaultShortcuts: (navigate, goBack, goForward) => ({
    'alt+arrowleft': {
      description: 'Go back',
      handler: goBack
    },
    'alt+arrowright': {
      description: 'Go forward',
      handler: goForward
    },
    'ctrl+h': {
      description: 'Go to home',
      handler: () => navigate('/dashboard')
    },
    'ctrl+shift+h': {
      description: 'Go to role-based home',
      handler: (event) => {
        const role = localStorage.getItem('role');
        const homePath = ROLE_REDIRECTS[role] || '/dashboard';
        navigate(homePath);
      }
    }
  })
};

// Breadcrumb utilities
export const breadcrumbUtils = {
  // Generate breadcrumb from path
  generateFromPath: (path, userRole) => {
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs = [];
    
    // Add home breadcrumb
    const homePath = ROLE_REDIRECTS[userRole] || '/dashboard';
    breadcrumbs.push({
      label: 'Home',
      path: homePath,
      isCurrent: path === homePath
    });
    
    // Build breadcrumb path
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      if (currentPath !== homePath) {
        const label = segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        breadcrumbs.push({
          label,
          path: currentPath,
          isCurrent: index === segments.length - 1
        });
      }
    });
    
    return breadcrumbs;
  },

  // Merge breadcrumbs
  mergeBreadcrumbs: (breadcrumbs1, breadcrumbs2) => {
    const merged = [...breadcrumbs1];
    
    breadcrumbs2.forEach(crumb2 => {
      const existingIndex = merged.findIndex(crumb1 => crumb1.path === crumb2.path);
      if (existingIndex >= 0) {
        merged[existingIndex] = { ...merged[existingIndex], ...crumb2 };
      } else {
        merged.push(crumb2);
      }
    });
    
    return merged;
  },

  // Filter breadcrumbs by depth
  filterByDepth: (breadcrumbs, maxDepth) => {
    if (breadcrumbs.length <= maxDepth) return breadcrumbs;
    
    return [
      breadcrumbs[0], // Always keep first (home)
      ...breadcrumbs.slice(-maxDepth + 1) // Keep last N-1 items
    ];
  }
};

// Navigation analytics utilities
export const navigationAnalyticsUtils = {
  // Track navigation event
  trackNavigation: (from, to, metadata = {}) => {
    const event = {
      from,
      to,
      timestamp: Date.now(),
      metadata
    };
    
    // Store in session storage for current session
    const sessionData = JSON.parse(sessionStorage.getItem('navigationEvents') || '[]');
    sessionData.push(event);
    sessionStorage.setItem('navigationEvents', JSON.stringify(sessionData));
    
    // Send to analytics service (if configured)
    if (window.gtag) {
      window.gtag('event', 'navigation', {
        event_category: 'navigation',
        event_label: `${from} -> ${to}`,
        value: 1
      });
    }
  },

  // Get navigation analytics
  getAnalytics: () => {
    const events = JSON.parse(sessionStorage.getItem('navigationEvents') || '[]');
    
    const uniqueRoutes = [...new Set(events.map(e => e.to))];
    const routeCounts = events.reduce((acc, event) => {
      acc[event.to] = (acc[event.to] || 0) + 1;
      return acc;
    }, {});
    
    const mostVisited = Object.entries(routeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    return {
      totalEvents: events.length,
      uniqueRoutes: uniqueRoutes.length,
      mostVisited,
      averageTimePerRoute: events.length > 0 
        ? (events[events.length - 1].timestamp - events[0].timestamp) / events.length 
        : 0
    };
  },

  // Clear analytics data
  clearAnalytics: () => {
    sessionStorage.removeItem('navigationEvents');
  }
};

// Navigation flow utilities
export const navigationFlowUtils = {
  // Get available flows for role
  getAvailableFlows: (userRole) => {
    const roleConfig = NAVIGATION_FLOWS[userRole];
    if (!roleConfig) return [];
    
    return Object.entries(roleConfig.flows).map(([name, steps]) => ({
      name,
      steps,
      description: `Flow with ${steps.length} steps`
    }));
  },

  // Get flow progress
  getFlowProgress: (userRole, currentPath) => {
    const roleConfig = NAVIGATION_FLOWS[userRole];
    if (!roleConfig) return null;
    
    for (const [flowName, steps] of Object.entries(roleConfig.flows)) {
      const stepIndex = steps.indexOf(currentPath);
      if (stepIndex >= 0) {
        return {
          flowName,
          currentStep: stepIndex + 1,
          totalSteps: steps.length,
          progress: ((stepIndex + 1) / steps.length) * 100,
          isFirstStep: stepIndex === 0,
          isLastStep: stepIndex === steps.length - 1,
          nextStep: stepIndex < steps.length - 1 ? steps[stepIndex + 1] : null,
          previousStep: stepIndex > 0 ? steps[stepIndex - 1] : null
        };
      }
    }
    
    return null;
  }
};

// Export all utilities
export const navigationHelpers = {
  deepLink: deepLinkUtils,
  state: navigationStateUtils,
  validation: routeValidationUtils,
  shortcuts: navigationShortcuts,
  breadcrumbs: breadcrumbUtils,
  analytics: navigationAnalyticsUtils,
  flows: navigationFlowUtils
};

export default navigationHelpers;
