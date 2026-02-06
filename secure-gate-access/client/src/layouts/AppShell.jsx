import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { BottomNav, FAB } from '../components/ui';
import PanicButton from '../components/guard/PanicButton';
import { NavigationProvider } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { navigateToLogin } from '../utils/authNavigation';

export default function AppShell({ 
  role, 
  title, 
  onLogout, 
  children, 
  className = "" 
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const appShellRef = useRef(null);

  // Use AuthContext for consistent logout state management
  const { logout } = useAuth();

  const handleLogout = onLogout || (async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      // Navigation is handled by AuthContext or calling component, 
      // but ensure we go to login if not handled
      navigateToLogin();
    }
  });

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + B to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      // Escape to close sidebar
      if (e.key === 'Escape' && sidebarOpen) {
        closeSidebar();
      }
      // Ctrl/Cmd + L to logout
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        handleLogout();
      }
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"], input[type="text"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    const appShell = appShellRef.current;
    if (appShell) {
      appShell.addEventListener('keydown', handleKeyDown);
      return () => appShell.removeEventListener('keydown', handleKeyDown);
    }
  }, [sidebarOpen, handleLogout]);

  return (
    <NavigationProvider>
      <div ref={appShellRef} className="min-h-screen bg-gray-50 dark:bg-slate-900 flex">
        {/* Skip Navigation Link - Hidden except on keyboard focus for accessibility */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:bg-brand-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:font-medium focus:shadow-lg"
        >
          Skip to main content
        </a>
        
        <Sidebar 
          role={role} 
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          onClose={closeSidebar}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar 
            title={title} 
            onLogout={handleLogout}
            onMenuToggle={toggleSidebar}
            sidebarOpen={sidebarOpen}
          />
          
          <main id="main-content" className={`flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-900 ${className}`} role="main">
            {/* Add bottom padding on mobile for bottom nav */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
              {children}
            </div>
          </main>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <BottomNav role={role} />
        
        {/* Floating Action Button */}
        <FAB role={role} />

        {/* Panic Button - Bottom Left for Residents and Guards */}
        {(role === 'resident' || role === 'guard') && (
          <div className="fixed bottom-24 md:bottom-6 left-4 md:left-6 z-50">
            <PanicButton 
              floating={false} 
              size="default"
              className="shadow-lg hover:shadow-xl"
            />
          </div>
        )}
      </div>
    </NavigationProvider>
  );
}
