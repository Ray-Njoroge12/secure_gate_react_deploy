/**
 * GlobalKeyboardShortcuts Component
 * 
 * Handles global keyboard shortcuts with access to AuthContext.
 * Must be rendered inside RootProvider to access auth hooks.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useCurrentRole } from '../hooks/useCurrentRole';
import { getRoleBasedRedirect } from '../utils/navigationFlow';

const GlobalKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const role = useCurrentRole();

  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Ctrl/Cmd + K to focus search (if available)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"], input[type="text"]');
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Ctrl/Cmd + H to go to home/dashboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        if (role) {
          navigate(getRoleBasedRedirect(role, '/login'));
        } else {
          navigate('/login');
        }
      }

      // Ctrl/Cmd + L to logout
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        await logout();
        navigate('/login');
      }

      // Ctrl/Cmd + B to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        const sidebarToggle = document.querySelector('[aria-label*="menu"]');
        if (sidebarToggle) {
          sidebarToggle.click();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, logout, role]);

  return null; // This component doesn't render anything
};

export default GlobalKeyboardShortcuts;
