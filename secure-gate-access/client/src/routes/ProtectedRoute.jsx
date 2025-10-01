import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login with return path
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user has a role not allowed here, redirect to their correct dashboard
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    switch (user?.role) {
      case "resident":
        return <Navigate to="/dashboard/resident" replace />;
      case "security":
      case "guard":
        return <Navigate to="/dashboard/guard" replace />;
      case "admin":
        return <Navigate to="/dashboard/admin" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  // Otherwise allow access
  return children;
}
