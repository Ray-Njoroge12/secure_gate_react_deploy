import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const role = localStorage.getItem("role") || sessionStorage.getItem("role");
  const location = useLocation();

  // If no token, always send to login
  if (!token) return <Navigate to="/login" replace />;

  // If user has a role not allowed here, redirect to their correct dashboard
  if (allowedRoles && !allowedRoles.includes(role)) {
    switch (role) {
      case "resident":
        return <Navigate to="/dashboard/resident" replace />;
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
