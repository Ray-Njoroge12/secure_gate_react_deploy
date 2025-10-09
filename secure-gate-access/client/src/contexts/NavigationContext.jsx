/**
 * Navigation Context
 * 
 * Provides centralized navigation state and utilities for:
 * - Breadcrumb management
 * - Navigation history tracking
 * - Route-based navigation state
 * - Navigation analytics
 * - Deep linking support
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateBreadcrumbs } from '../utils/navigationFlow';

// Navigation state types
const NAVIGATION_ACTIONS = {
  SET_BREADCRUMBS: 'SET_BREADCRUMBS',
  ADD_BREADCRUMB: 'ADD_BREADCRUMB',
  REMOVE_BREADCRUMB: 'REMOVE_BREADCRUMB',
  UPDATE_BREADCRUMB: 'UPDATE_BREADCRUMB',
  SET_NAVIGATION_HISTORY: 'SET_NAVIGATION_HISTORY',
  ADD_NAVIGATION_HISTORY: 'ADD_NAVIGATION_HISTORY',
  SET_CURRENT_ROUTE: 'SET_CURRENT_ROUTE',
  SET_NAVIGATION_STATE: 'SET_NAVIGATION_STATE',
  CLEAR_NAVIGATION: 'CLEAR_NAVIGATION'
};

// Initial state
const initialState = {
  breadcrumbs: [],
  navigationHistory: [],
  currentRoute: null,
  previousRoute: null,
  navigationState: {
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    depth: 0
  },
  userRole: null,
  customBreadcrumbs: null
};

// Navigation reducer
function navigationReducer(state, action) {
  switch (action.type) {
    case NAVIGATION_ACTIONS.SET_BREADCRUMBS:
      return {
        ...state,
        breadcrumbs: action.payload
      };

    case NAVIGATION_ACTIONS.ADD_BREADCRUMB:
      return {
        ...state,
        breadcrumbs: [...state.breadcrumbs, action.payload]
      };

    case NAVIGATION_ACTIONS.REMOVE_BREADCRUMB:
      return {
        ...state,
        breadcrumbs: state.breadcrumbs.filter((_, index) => index !== action.payload)
      };

    case NAVIGATION_ACTIONS.UPDATE_BREADCRUMB:
      return {
        ...state,
        breadcrumbs: state.breadcrumbs.map((crumb, index) => 
          index === action.payload.index ? { ...crumb, ...action.payload.updates } : crumb
        )
      };

    case NAVIGATION_ACTIONS.SET_NAVIGATION_HISTORY:
      return {
        ...state,
        navigationHistory: action.payload
      };

    case NAVIGATION_ACTIONS.ADD_NAVIGATION_HISTORY:
      return {
        ...state,
        navigationHistory: [...state.navigationHistory, action.payload]
      };

    case NAVIGATION_ACTIONS.SET_CURRENT_ROUTE:
      return {
        ...state,
        previousRoute: state.currentRoute,
        currentRoute: action.payload
      };

    case NAVIGATION_ACTIONS.SET_NAVIGATION_STATE:
      return {
        ...state,
        navigationState: { ...state.navigationState, ...action.payload }
      };

    case NAVIGATION_ACTIONS.CLEAR_NAVIGATION:
      return {
        ...initialState,
        userRole: state.userRole
      };

    default:
      return state;
  }
}

// Create context
const NavigationContext = createContext();

// Navigation provider component
export function NavigationProvider({ children, userRole = null }) {
  const [state, dispatch] = useReducer(navigationReducer, {
    ...initialState,
    userRole
  });
  
  const location = useLocation();
  const navigate = useNavigate();

  // Update breadcrumbs when route changes
  useEffect(() => {
    if (userRole) {
      const breadcrumbs = generateBreadcrumbs(location.pathname, userRole);
      dispatch({
        type: NAVIGATION_ACTIONS.SET_BREADCRUMBS,
        payload: breadcrumbs
      });
    }
  }, [location.pathname, userRole]);

  // Update current route
  useEffect(() => {
    dispatch({
      type: NAVIGATION_ACTIONS.SET_CURRENT_ROUTE,
      payload: {
        path: location.pathname,
        search: location.search,
        hash: location.hash,
        state: location.state,
        timestamp: Date.now()
      }
    });
  }, [location]);

  // Add to navigation history
  useEffect(() => {
    if (state.currentRoute) {
      dispatch({
        type: NAVIGATION_ACTIONS.ADD_NAVIGATION_HISTORY,
        payload: state.currentRoute
      });
    }
  }, [state.currentRoute]);

  // Navigation utilities
  const setBreadcrumbs = useCallback((breadcrumbs) => {
    dispatch({
      type: NAVIGATION_ACTIONS.SET_BREADCRUMBS,
      payload: breadcrumbs
    });
  }, []);

  const addBreadcrumb = useCallback((breadcrumb) => {
    dispatch({
      type: NAVIGATION_ACTIONS.ADD_BREADCRUMB,
      payload: breadcrumb
    });
  }, []);

  const removeBreadcrumb = useCallback((index) => {
    dispatch({
      type: NAVIGATION_ACTIONS.REMOVE_BREADCRUMB,
      payload: index
    });
  }, []);

  const updateBreadcrumb = useCallback((index, updates) => {
    dispatch({
      type: NAVIGATION_ACTIONS.UPDATE_BREADCRUMB,
      payload: { index, updates }
    });
  }, []);

  const navigateTo = useCallback((path, options = {}) => {
    dispatch({
      type: NAVIGATION_ACTIONS.SET_NAVIGATION_STATE,
      payload: { isLoading: true }
    });

    navigate(path, options);

    // Reset loading state after navigation
    setTimeout(() => {
      dispatch({
        type: NAVIGATION_ACTIONS.SET_NAVIGATION_STATE,
        payload: { isLoading: false }
      });
    }, 100);
  }, [navigate]);

  const goBack = useCallback(() => {
    if (state.navigationHistory.length > 1) {
      const previousRoute = state.navigationHistory[state.navigationHistory.length - 2];
      navigate(previousRoute.path);
    } else {
      navigate(-1);
    }
  }, [navigate, state.navigationHistory]);

  const goForward = useCallback(() => {
    navigate(1);
  }, [navigate]);

  const goToBreadcrumb = useCallback((index) => {
    if (state.breadcrumbs[index]) {
      navigateTo(state.breadcrumbs[index].path);
    }
  }, [state.breadcrumbs, navigateTo]);

  const clearNavigation = useCallback(() => {
    dispatch({
      type: NAVIGATION_ACTIONS.CLEAR_NAVIGATION
    });
  }, []);

  const setNavigationState = useCallback((updates) => {
    dispatch({
      type: NAVIGATION_ACTIONS.SET_NAVIGATION_STATE,
      payload: updates
    });
  }, []);

  // Get navigation analytics
  const getNavigationAnalytics = useCallback(() => {
    const history = state.navigationHistory;
    const uniqueRoutes = [...new Set(history.map(route => route.path))];
    
    return {
      totalNavigations: history.length,
      uniqueRoutes: uniqueRoutes.length,
      mostVisitedRoute: history.reduce((acc, route) => {
        acc[route.path] = (acc[route.path] || 0) + 1;
        return acc;
      }, {}),
      averageSessionTime: history.length > 1 
        ? (history[history.length - 1].timestamp - history[0].timestamp) / history.length 
        : 0,
      currentDepth: state.breadcrumbs.length,
      canGoBack: history.length > 1,
      canGoForward: false // Browser history forward is not easily trackable
    };
  }, [state.navigationHistory, state.breadcrumbs.length]);

  // Get breadcrumb path for a specific route
  const getBreadcrumbPath = useCallback((path) => {
    return generateBreadcrumbs(path, userRole);
  }, [userRole]);

  // Check if user can access a route
  const canAccessRoute = useCallback((path) => {
    // This would integrate with your auth system
    // For now, just return true
    return true;
  }, []);

  // Get suggested next routes based on current context
  const getSuggestedRoutes = useCallback(() => {
    const currentPath = state.currentRoute?.path;
    if (!currentPath || !userRole) return [];

    // This would be based on your navigation flows
    const suggestions = [];
    
    // Add role-based suggestions
    if (userRole === 'resident') {
      if (currentPath.includes('/dashboard/resident')) {
        suggestions.push(
          { path: '/resident/add-visitor', label: 'Add Visitor', description: 'Invite a new visitor' },
          { path: '/resident/visitor-history', label: 'Visitor History', description: 'View past visitors' }
        );
      }
    } else if (userRole === 'guard') {
      if (currentPath.includes('/dashboard/guard')) {
        suggestions.push(
          { path: '/guard/scan-qr', label: 'Scan QR Code', description: 'Verify visitor QR codes' },
          { path: '/guard/manual-check', label: 'Manual Check', description: 'Manual visitor verification' }
        );
      }
    }

    return suggestions;
  }, [state.currentRoute, userRole]);

  const contextValue = {
    // State
    breadcrumbs: state.breadcrumbs,
    navigationHistory: state.navigationHistory,
    currentRoute: state.currentRoute,
    previousRoute: state.previousRoute,
    navigationState: state.navigationState,
    userRole: state.userRole,

    // Actions
    setBreadcrumbs,
    addBreadcrumb,
    removeBreadcrumb,
    updateBreadcrumb,
    navigateTo,
    goBack,
    goForward,
    goToBreadcrumb,
    clearNavigation,
    setNavigationState,

    // Utilities
    getNavigationAnalytics,
    getBreadcrumbPath,
    canAccessRoute,
    getSuggestedRoutes
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
}

// Hook to use navigation context
export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

// Hook for breadcrumb-specific functionality
export function useBreadcrumbs() {
  const { breadcrumbs, setBreadcrumbs, addBreadcrumb, removeBreadcrumb, updateBreadcrumb, goToBreadcrumb } = useNavigation();
  
  return {
    breadcrumbs,
    setBreadcrumbs,
    addBreadcrumb,
    removeBreadcrumb,
    updateBreadcrumb,
    goToBreadcrumb
  };
}

// Hook for navigation history
export function useNavigationHistory() {
  const { navigationHistory, goBack, goForward, getNavigationAnalytics } = useNavigation();
  
  return {
    navigationHistory,
    goBack,
    goForward,
    getNavigationAnalytics
  };
}

// Hook for route suggestions
export function useRouteSuggestions() {
  const { getSuggestedRoutes, canAccessRoute } = useNavigation();
  
  return {
    getSuggestedRoutes,
    canAccessRoute
  };
}

export { NavigationContext };
export default NavigationContext;