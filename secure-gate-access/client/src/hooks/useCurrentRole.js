/**
 * useCurrentRole Hook
 * 
 * Provides the current user's role from AuthContext.
 * Replaces legacy localStorage.getItem('role') usage.
 * 
 * @returns {string|null} Current user role ('resident', 'guard', 'admin') or null if not authenticated
 */

import { useAuth } from '../contexts/AuthContext';

export const useCurrentRole = () => {
  const { user } = useAuth();
  return user?.role || null;
};

export default useCurrentRole;
