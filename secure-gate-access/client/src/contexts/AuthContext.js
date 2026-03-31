import { createContext, useState, useEffect, useContext, useMemo } from "react";
import logger from 'utils/logger';

import api from '../utils/apiClient.js';
import { authStateMachine, AUTH_STATES } from '../utils/authStateMachine';

export const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState(authStateMachine.getState());

  // Initialize auth state on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    const unsubscribe = authStateMachine.subscribe(setAuthState);
    return () => unsubscribe();
  }, []);

  const initializeAuth = async () => {
    // Check if user is authenticated by calling a protected endpoint
    try {
      const response = await api.get('/api/auth/me');

      const data = response.data;
      const userData = data.data?.user || data.user;
      if (userData) {
        setUser(userData);
        authStateMachine.transition('AUTHENTICATED');
      } else {
        authStateMachine.transition('UNAUTHENTICATED', { reason: 'unauthorized' });
      }
    } catch (error) {
      // User not authenticated - this is normal for first-time visitors
      logger.debug('User not authenticated');
      authStateMachine.transition('UNAUTHENTICATED', { reason: 'not_authenticated' });
    }
    if (!authStateMachine.getState().status || authStateMachine.getState().status === AUTH_STATES.UNKNOWN) {
      authStateMachine.transition('UNAUTHENTICATED', { reason: 'no_session' });
    }
    setLoading(false);
  };

  // login(email, password, remember=false)
  const login = async (email, password, _remember = false) => {
    const response = await api.post('/api/auth/login', {
      username: email,
      password
    });

    const data = response.data;
    if (!data.success) {
      throw new Error(data.message || data.error || "Login failed");
    }

    // MFA-010 FIX: Check if MFA is required (new response format)
    if (data.data?.requiresMFA) {
      return {
        requiresMFA: true,
        mfaSessionId: data.data.mfaSessionId,
        userId: data.data.userId,
        expiresIn: data.data.expiresIn || 300
      };
    }

    // Legacy support for old mfaRequired format
    if (data.data?.mfaRequired) {
      return {
        requiresMFA: true,
        mfaRequired: true,
        userId: data.data.userId,
        username: email,
        methods: data.data.methods
      };
    }

    // Extract user from response (tokens are now in httpOnly cookies)
    const userData = data.data?.user || data.user;

    if (!userData) {
      throw new Error("Invalid response format from server");
    }

    setUser(userData);
    authStateMachine.transition('AUTHENTICATED');

    // Do not persist auth/session data in storage; rely on httpOnly cookies only
    return { user: userData };
  };

  const logout = async () => {
    // Optimistic update: Clear state immediately for instant UI feedback
    setUser(null);
    authStateMachine.transition('UNAUTHENTICATED', { reason: 'logout' });
    sessionStorage.removeItem('mfa_session');

    try {
      // Call logout endpoint to clear httpOnly cookies and server session in background
      await api.post('/api/auth/logout');
    } catch (error) {
      logger.error('Logout error', error);
    }
  };

  /**
   * Complete MFA verification by updating auth state.
   * Called from MFAVerify after successful /api/mfa/verify.
   * Without this, ProtectedRoute sees isAuthenticated=false and redirects to login.
   */
  const completeMfa = (userData) => {
    if (!userData) {
      logger.error('completeMfa called without user data');
      return;
    }
    setUser(userData);
    authStateMachine.transition('AUTHENTICATED');
    logger.info('MFA completed, user authenticated', { role: userData.role });
  };

  // Verify password for sensitive operations (returns boolean)
  const verifyPassword = async (password) => {
    try {
      const response = await api.post('/api/auth/verify-password', { password });
      const data = response.data;
      return data.success && data.data?.verified;
    } catch (error) {
      logger.error('Password verification error', error);
      return false;
    }
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };
  const register = async (userData) => {
    setLoading(true);
    try {
      // Transform frontend data to match backend expectations
      const registrationData = {
        email: userData.email,
        username: userData.name, // Backend expects 'username' not 'name'
        password: userData.password,
        role: userData.role || 'resident',
        phone: userData.phoneNumber, // Backend expects 'phone' not 'phoneNumber'
        house: userData.houseNumber, // Backend expects 'house' not 'residenceNumber'
        area: userData.area || 'General' // Backend expects 'area' field
      };

      // BUG-005 FIX: Changed from /api/register to /api/auth/register
      // Use API_BASE_URL for cross-site deployment (Netlify frontend + Render backend)
      const response = await api.post('/api/auth/register', registrationData);

      const data = response.data;
      if (!data.success) {
        // Handle validation errors from server
        if (data.errors && Array.isArray(data.errors)) {
          const error = new Error(data.message || 'Registration failed');
          error.response = { data };
          throw error;
        }
        throw new Error(data.message || 'Registration failed');
      }

      return data;
    } catch (error) {
      logger.error('Registration error', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    completeMfa,
    verifyPassword,
    hasRole,
    hasAnyRole,
    authState
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, loading, authState]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
