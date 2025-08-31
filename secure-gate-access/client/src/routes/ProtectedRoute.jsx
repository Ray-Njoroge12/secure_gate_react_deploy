// client/src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, role }) {
  const storedRole = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  // If no token, redirect to login
  if (!token) return <Navigate to="/login" />;

  // If role is specified and doesn't match, redirect to login
  if (role && storedRole !== role) return <Navigate to="/login" />;

  return children;
}
