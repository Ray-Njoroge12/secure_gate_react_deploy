import { createContext, useState, useEffect, useContext } from "react";
import logger from 'utils/logger';

// API base URL for cross-site deployment (Netlify frontend + Render backend)
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

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

  // Initialize auth state on app start
  useEffect(() => {
    initializeAuth();
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
        }
      }
    } catch (error) {
      // User not authenticated - this is normal for first-time visitors
      logger.debug('User not authenticated');
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

    // Check if MFA is required
    if (data.data?.mfaRequired) {
      return {
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

    // Do not persist auth/session data in storage; rely on httpOnly cookies only
    return { user: userData };
  };

  const logout = async () => {
    try {
      // Call logout endpoint to clear httpOnly cookies and server session
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      logger.error('Logout error', error);
    }

    // Clear in-memory auth state; no localStorage/sessionStorage usage
    setUser(null);
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Register new user
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
      const response = await fetch('/api/auth/register', {
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
    hasAnyRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
