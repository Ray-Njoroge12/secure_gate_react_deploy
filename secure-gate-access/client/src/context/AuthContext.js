import { createContext, useState, useEffect, useContext } from "react";

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

  const initializeAuth = () => {
    const storedToken = localStorage.getItem("token") || sessionStorage.getItem("token");
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.warn('Failed to parse stored user data:', error);
        // Clear invalid data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
      }
    }
    setLoading(false);
  };

  // login(email, password, remember=false)
  const login = async (email, password, remember = false) => {
    const res = await fetch("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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

  const logout = () => {
    setToken(null);
    setUser(null);
    
    // Clear all auth data
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    
    // Additional cleanup for legacy tokens
    localStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_token");
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

      const response = await fetch('/api/users/register', { // Correct endpoint
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
      console.error('Registration error:', error);
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
