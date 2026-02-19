import { createContext, useState, useEffect, useContext } from "react";
import logger from 'utils/logger';
import { authStateMachine, AUTH_STATES } from '../utils/authStateMachine';

// API base URL for cross-site deployment (Netlify frontend + Render backend)
const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');

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
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        credentials: 'include' // Include cookies
      });

      if (res.ok) {
        const data = await res.json();
        // Response format: { success: true, data: { user: {...} } }
        const userData = data.data?.user || data.user;
        if (userData) {
          setUser(userData);
          authStateMachine.transition('AUTHENTICATED');
        }
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
  const login = async (email, password, remember = false) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include', // Include cookies in request
      body: JSON.stringify({ username: email, password }), // Backend expects 'username' field
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
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

    try {
      // Call logout endpoint to clear httpOnly cookies and server session in background
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      logger.error('Logout error', error);
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
        house: userData.residenceNumber, // Backend expects 'house' not 'residenceNumber'
        area: userData.area || 'General' // Backend expects 'area' field
      };

      // BUG-005 FIX: Changed from /api/register to /api/auth/register
      // Use API_BASE_URL for cross-site deployment (Netlify frontend + Render backend)
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      if (!response.ok) {
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

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    hasRole,
    hasAnyRole,
    authState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
