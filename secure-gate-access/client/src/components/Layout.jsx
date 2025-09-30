import React from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ title, right, children, role }) {
  return (
    <div className="app-grid" role="application" aria-label="Secure Gate Application">
      {/* Skip Navigation Link for Accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-green-600 focus:text-white focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>
      
      <Sidebar role={role} />
      
      <div className="flex flex-col min-h-screen">
        <Topbar title={title} right={right} />
        <main 
          id="main-content"
          className="main flex-1" 
          role="main"
          aria-label={title ? `${title} content` : "Main content"}
          tabIndex="-1"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
