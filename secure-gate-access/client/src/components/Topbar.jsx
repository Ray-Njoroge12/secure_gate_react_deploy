// client/src/components/Topbar.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "./ui";

export default function Topbar({ title, onLogout, onMenuToggle, sidebarOpen }) {
  const role = localStorage.getItem("role") || "guest";
  const [profilePic, setProfilePic] = useState(null);
  const navigate = useNavigate();
  const topbarRef = useRef(null);

  const getRoleDisplayName = (role) => {
    const roleNames = {
      resident: "Resident",
      security: "Security Guard", 
      admin: "Administrator",
      guard: "Security Guard"
    };
    return roleNames[role] || role;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space or Enter to activate profile button
      if ((e.key === ' ' || e.key === 'Enter') && e.target === topbarRef.current) {
        e.preventDefault();
        handleProfileClick();
      }
      // Escape to clear focus
      if (e.key === 'Escape' && topbarRef.current) {
        topbarRef.current.blur();
      }
    };

    const topbar = topbarRef.current;
    if (topbar) {
      topbar.addEventListener('keydown', handleKeyDown);
      return () => topbar.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  useEffect(() => {
    setProfilePic(localStorage.getItem("profilePic"));
    window.addEventListener("profilePicChanged", () => {
      setProfilePic(localStorage.getItem("profilePic"));
    });
    return () => window.removeEventListener("profilePicChanged", () => {});
  }, []);

  const handleProfileClick = () => {
    if (role === "resident") navigate("/pages/resident/Settings");
    else if (role === "guard") navigate("/dashboard/guard/Settings");
    else if (role === "admin") navigate("/dashboard/admin/settings");
  };

  return (
    <header 
      ref={topbarRef}
      className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between sticky top-0 z-40" 
      role="banner"
      aria-label="Page header"
    >
      <div className="flex items-center gap-4">
        {/* Mobile Menu Toggle Button */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={sidebarOpen}
          aria-controls="main-navigation"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {sidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        
        <h1 className="text-lg font-semibold text-slate-200 m-0">
          {title}
        </h1>
        <Badge variant="info" size="sm" aria-label={`Current role: ${getRoleDisplayName(role)}`}>
          {getRoleDisplayName(role)}
        </Badge>
      </div>
      
      <div className="flex items-center gap-3">
        <button
          className="profile-btn focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-full transition-all"
          onClick={handleProfileClick}
          aria-label={`Open ${getRoleDisplayName(role)} settings`}
          title="Profile Settings"
        >
          <div className="w-10 h-10 relative">
            <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-green-600 hover:border-green-500 transition-colors">
              {(profilePic && profilePic !== "") ? (
                <img 
                  src={profilePic} 
                  alt={`${getRoleDisplayName(role)} profile picture`} 
                  className="w-full h-full object-cover rounded-full" 
                />
              ) : (
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className="text-green-500"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              )}
            </div>
          </div>
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-md transition-colors"
            aria-label="Logout from application"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
