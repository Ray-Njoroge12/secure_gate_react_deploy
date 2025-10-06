// Navigation Context for managing breadcrumbs and page titles
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { generateBreadcrumbs } from '../utils/navigationFlow';

const NavigationContext = createContext();

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  const [pageTitle, setPageTitle] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const location = useLocation();

  // Get user role from localStorage
  useEffect(() => {
    const role = localStorage.getItem('role');
    setUserRole(role);
  }, []);

  // Update breadcrumbs when location changes
  useEffect(() => {
    if (userRole) {
      const newBreadcrumbs = generateBreadcrumbs(location.pathname, userRole);
      setBreadcrumbs(newBreadcrumbs);
      
      // Set page title from the last breadcrumb
      const lastBreadcrumb = newBreadcrumbs[newBreadcrumbs.length - 1];
      if (lastBreadcrumb) {
        setPageTitle(lastBreadcrumb.label);
        document.title = `${lastBreadcrumb.label} - Secure Gate Access`;
      }
    }
  }, [location.pathname, userRole]);

  // Set custom page title
  const setCustomPageTitle = (title) => {
    setPageTitle(title);
    document.title = `${title} - Secure Gate Access`;
  };

  // Set custom breadcrumbs
  const setCustomBreadcrumbs = (customBreadcrumbs) => {
    setBreadcrumbs(customBreadcrumbs);
  };

  // Get navigation progress (for multi-step flows)
  const getNavigationProgress = (currentStep, totalSteps) => {
    return {
      current: currentStep,
      total: totalSteps,
      percentage: Math.round((currentStep / totalSteps) * 100)
    };
  };

  // Check if current page is at root level (max 3 levels deep)
  const isAtRootLevel = () => {
    return location.pathname.split('/').filter(Boolean).length <= 2;
  };

  // Get parent page path
  const getParentPath = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    if (pathSegments.length <= 1) return null;
    
    const parentSegments = pathSegments.slice(0, -1);
    return '/' + parentSegments.join('/');
  };

  const value = {
    pageTitle,
    breadcrumbs,
    userRole,
    setPageTitle: setCustomPageTitle,
    setBreadcrumbs: setCustomBreadcrumbs,
    getNavigationProgress,
    isAtRootLevel,
    getParentPath,
    currentPath: location.pathname
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export default NavigationContext;
