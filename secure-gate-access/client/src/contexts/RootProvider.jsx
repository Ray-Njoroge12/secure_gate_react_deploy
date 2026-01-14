/**
 * @fileoverview Root Context Provider
 * @description Consolidates all context providers into a single, manageable component
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthContext.js';
import { ErrorProvider } from './ErrorContext.jsx';
import { NavigationProvider } from './NavigationContext.jsx';
import AppNavigationBridge from './AppNavigationBridge.jsx';
import AuthNavigationBridge from './AuthNavigationBridge.jsx';
import { LoadingProvider } from './LoadingContext.jsx';
import { SearchProvider } from './SearchContext.jsx';
import { BrowserCompatibilityProvider } from './BrowserCompatibilityContext.jsx';
import { ThemeProvider } from './ThemeContext.jsx';
import { ToastProvider } from './ToastContext.jsx';
import { UndoProvider } from './UndoContext.jsx';

/**
 * React Query client configuration
 * - staleTime: 30 seconds before data is considered stale
 * - gcTime: 5 minutes before inactive data is garbage collected
 * - retry: 2 retries on failure
 * - refetchOnWindowFocus: true to keep data fresh
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Root Provider Component
 * 
 * @description Wraps the entire application with all necessary context providers
 * in the correct order. This ensures proper initialization and dependency resolution.
 * 
 * Provider Order (outer to inner):
 * 1. ErrorProvider - Must be outermost to catch all errors
 * 2. ThemeProvider - Theme must be early to prevent flash of wrong theme
 * 3. BrowserCompatibilityProvider - Detect browser features early
 * 4. AuthProvider - Core authentication state
 * 5. LoadingProvider - Global loading states
 * 6. ToastProvider - Global toast notifications
 * 7. UndoProvider - Global undo/redo functionality
 * 8. SearchProvider - Search functionality
 * 9. Router - React Router for navigation
 * 10. NavigationProvider - Navigation state (needs Router context)
 * 
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Wrapped component tree
 */
export const RootProvider = ({ children }) => {
  return (
    <ErrorProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserCompatibilityProvider>
            <AuthProvider>
              <LoadingProvider>
                <ToastProvider position="top-right" maxVisible={4}>
                  <UndoProvider maxHistory={10}>
                    <SearchProvider>
                      <Router>
                        <AppNavigationBridge />
                        <AuthNavigationBridge />
                        <NavigationProvider>
                          {children}
                        </NavigationProvider>
                      </Router>
                    </SearchProvider>
                  </UndoProvider>
                </ToastProvider>
              </LoadingProvider>
            </AuthProvider>
          </BrowserCompatibilityProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorProvider>
  );
};

export default RootProvider;
