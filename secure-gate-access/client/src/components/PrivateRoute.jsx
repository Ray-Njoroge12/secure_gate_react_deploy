// client/src/components/PrivateRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Card, Badge } from "./ui";

/**
 * Enhanced PrivateRoute component with proper authentication and role checking
 * @param {React.ReactNode} children - Component to render if authorized
 * @param {string[]} roles - Array of allowed roles (optional, defaults to any authenticated user)
 * @param {string} redirectTo - Where to redirect if unauthorized (defaults to login)
 */
export default function PrivateRoute({ 
  children, 
  roles = [], 
  redirectTo = "/login",
  showUnauthorized = true 
}) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Show loading while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role restrictions if specified
  if (roles.length > 0 && !roles.includes(user?.role)) {
    if (showUnauthorized) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md mx-auto">
            <Card>
              <Card.Header>
                <div className="text-center">
                  <div className="mx-auto mb-4 w-12 h-12 text-red-600">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H8m13-9a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Access Restricted</h2>
                </div>
              </Card.Header>
              
              <Card.Content>
                <div className="text-center space-y-3">
                  <p className="text-gray-600">
                    You don't have permission to access this area.
                  </p>
                  
                  <div className="flex justify-center space-x-2">
                    <Badge variant="info">Your Role: {user?.role}</Badge>
                    <Badge variant="warning">Required: {roles.join(' or ')}</Badge>
                  </div>
                  
                  <p className="text-sm text-gray-500">
                    Please contact your administrator if you believe this is an error.
                  </p>
                </div>
              </Card.Content>
              
              <Card.Footer>
                <div className="flex justify-center">
                  <button
                    onClick={() => window.history.back()}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Go Back
                  </button>
                </div>
              </Card.Footer>
            </Card>
          </div>
        </div>
      );
    } else {
      // Silent redirect for unauthorized access
      return <Navigate to="/dashboard" replace />;
    }
  }

  // User is authenticated and authorized
  return children;
}
