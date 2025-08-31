// client/src/components/PrivateRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

/**
 * allowed: array of allowed roles e.g. ["admin","guard"]
 * role is taken from localStorage "role"
 */
export default function PrivateRoute({ children, allowed = [] }) {
  const role = localStorage.getItem("role");
  if (!role) return <Navigate to="/" replace />;
  if (allowed.length > 0 && !allowed.includes(role)) return <Navigate to="/" replace />;
  return children;
}
