import React from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function AppShell({ 
  role, 
  title, 
  onLogout, 
  children, 
  className = "" 
}) {
  const handleLogout = onLogout || (() => {
    // Default logout behavior
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_token");
    window.location.href = "/login";
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role={role} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} onLogout={handleLogout} />
        
        <main className={`flex-1 overflow-y-auto bg-gray-50 ${className}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}