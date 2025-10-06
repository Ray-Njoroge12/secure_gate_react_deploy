import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function AppShell({ 
  role, 
  title, 
  onLogout, 
  children, 
  className = "" 
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = onLogout || (() => {
    // Default logout behavior
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_token");
    window.location.href = "/login";
  });

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Skip Navigation Link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-green-600 text-white px-4 py-2 rounded-md font-medium"
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
        
        <main id="main-content" className={`flex-1 overflow-y-auto bg-gray-50 ${className}`} role="main">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}