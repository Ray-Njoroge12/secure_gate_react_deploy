import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { EnhancedBreadcrumbs } from "./ui";
import { useNavigation } from "../contexts/NavigationContext";

export default function Layout({ title, right, children, role, showBreadcrumbs = true }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { breadcrumbs } = useNavigation();

  return (
    <div className="grid md:grid-cols-[260px_1fr] grid-cols-1 min-h-screen" role="application" aria-label="Secure Gate Application">
      {/* Skip Navigation Link for Accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-green-600 focus:text-white focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>
      
      <Sidebar role={role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex flex-col min-h-screen">
        <Topbar 
          title={title} 
          right={right} 
          onMenuToggle={() => setSidebarOpen(prev => !prev)} 
          sidebarOpen={sidebarOpen}
        />
        <main 
          id="main-content"
          className="main flex-1" 
          role="main"
          aria-label={title ? `${title} content` : "Main content"}
          tabIndex="-1"
        >
          {/* Breadcrumbs */}
          {showBreadcrumbs && breadcrumbs.length > 0 && (
            <div className="px-6 pt-6">
              <EnhancedBreadcrumbs 
                breadcrumbs={breadcrumbs}
                userRole={role}
                size="md"
                showProgress={false}
                collapsible={true}
              />
            </div>
          )}
          
          {/* Page Content */}
          <div className="px-6 pb-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
