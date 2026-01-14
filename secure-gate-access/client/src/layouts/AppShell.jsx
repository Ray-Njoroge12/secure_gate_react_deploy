import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { BottomNav, FAB } from '../components/ui';
import { NavigationProvider } from '../contexts/NavigationContext';
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

  const handleLogout = onLogout || (async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error', error);
    } finally {
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
        {/* Skip Navigation Link */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-brand-600 text-white px-4 py-2 rounded-md font-medium"
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
      </div>
    </NavigationProvider>
  );
}
