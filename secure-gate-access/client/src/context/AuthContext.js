import { createContext, useState, useEffect, useContext } from "react";
import logger from 'utils/logger';

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
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    const storedToken = localStorage.getItem("token") || sessionStorage.getItem("token");
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        // Validate token with server
        const isValid = await validateToken(storedToken);
        if (isValid) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } else {
          // Token is invalid, clear auth data
          clearAuthData();
        }
      } catch (error) {
        logger.warn('Failed to validate stored auth data', error);
        clearAuthData();
      }
    }
    setLoading(false);
  };

  // Validate token with server
  const validateToken = async (token) => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.user) {
          // Update user data with fresh info from server
          const userData = data.data.user;
          setUser(userData);
          
          // Update stored user data
          const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
          storage.setItem('user', JSON.stringify(userData));
          
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.error('Token validation failed', error);
      return false;
    }
  };

  // Clear all auth data
  const clearAuthData = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    localStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_token");
  };

  // login(email, password, remember=false)
  const login = async (email, password, remember = false) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password, remember }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || data.error || "Login failed");
    }

    // Extract token and user from response
    const authToken = data.accessToken || data.token;
    const userData = data.user;
    
    if (!authToken || !userData) {
      throw new Error("Invalid response format from server");
    }
    
    setToken(authToken);
    setUser(userData);

    // Store in appropriate storage
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem("token", authToken);
    storage.setItem("user", JSON.stringify(userData));

    return { token: authToken, user: userData };
  };

  const logout = async () => {
    try {
      // Call logout endpoint if token exists
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      logger.warn('Logout API call failed', error);
    } finally {
      // Always clear local state and storage
      setToken(null);
      setUser(null);
      clearAuthData();
    }
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
    token,
    user,
    loading,
    isAuthenticated: !!token && !!user,
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
