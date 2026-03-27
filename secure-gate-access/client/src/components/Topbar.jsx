// client/src/components/Topbar.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "./ui";
import { useAuth } from "../contexts/AuthContext";
import ThemeToggle from "./ui/ThemeToggle.jsx";
import NotificationBell from "./ui/NotificationBell.jsx";
import ChangePasswordModal from "./modals/ChangePasswordModal";
import Button from './ui/Button';

export default function Topbar({ title, onLogout, onMenuToggle, sidebarOpen }) {
  const { user } = useAuth(); // Get user from AuthContext instead of localStorage
  const role = user?.role || "guest";
  const [profilePic, setProfilePic] = useState(user?.profilePic || null);
  const navigate = useNavigate();
  const topbarRef = useRef(null);
  const profileMenuRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const getRoleDisplayName = (role) => {
    const roleNames = {
      resident: "Resident",
      security: "Security Guard",
      admin: "Administrator",
      guard: "Security Guard",
      super_admin: "Super Admin"
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

  // Click outside listener for profile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Update profile pic when user changes
  useEffect(() => {
    setProfilePic(user?.profilePic || null);
  }, [user]);

  const handleProfileClick = () => {
    if (role === "resident") navigate("/resident/settings");
    else if (role === "guard") navigate("/dashboard/guard/settings");
    else if (role === "admin") navigate("/dashboard/admin/settings");
    else if (role === "super_admin") navigate("/dashboard/admin/settings");
  };

  return (
    <header
      ref={topbarRef}
      className="topbar bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between sticky top-0 z-40"
      role="banner"
      aria-label="Page header"
    >
      <div className="flex items-center gap-4">
        {/* Mobile Menu Toggle Button */}
        <Button
          onClick={onMenuToggle}
          className="md:hidden p-2 text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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
        </Button>

        <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-200 m-0">
          {title}
        </h1>
        <Badge variant="info" size="sm" aria-label={`Current role: ${getRoleDisplayName(role)}`}>
          {getRoleDisplayName(role)}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggle size="small" />

        {/* Notifications */}
        <NotificationBell />

        <div className="relative" ref={profileMenuRef}>
          <Button
            className="profile-btn focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={`Open profile menu`}
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
            title="Profile Menu"
          >
            <div className="w-10 h-10 relative">
              <div className="w-full h-full rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-green-600 hover:border-green-500 transition-colors">
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
          </Button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50" role="menu">
              <Button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleProfileClick(); // Navigates to settings
                }}
                className="block w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 min-h-[44px] focus:outline-none focus:bg-gray-100 dark:bg-slate-700 dark:focus:bg-slate-700"
                role="menuitem"
              >
                Profile Settings
              </Button>
              <Button
                onClick={() => {
                  setIsMenuOpen(false);
                  setShowChangePassword(true);
                }}
                className="block w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 min-h-[44px] focus:outline-none focus:bg-gray-100 dark:bg-slate-700 dark:focus:bg-slate-700"
                role="menuitem"
              >
                Change Password
              </Button>
              {onLogout && (
                <Button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLogout();
                  }}
                  className="block w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 min-h-[44px] focus:outline-none focus:bg-gray-100 dark:bg-slate-700 dark:focus:bg-slate-700"
                  role="menuitem"
                >
                  Logout
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </header>
  );
}
