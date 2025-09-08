import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login.jsx";
import RegistrationPage from "./pages/Register.js";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import BulkInvite from "./pages/resident/BulkInvite.jsx";
import Settings from "./pages/resident/Settings.jsx";
import ResidentDashboard from "./pages/resident/ResidentDashboard.jsx";
import AddVisitor from "./pages/resident/AddVisitor.jsx";
import GeneratePass from "./pages/resident/GeneratePass.jsx";
import VisitorHistory from "./pages/resident/VisitorHistory.jsx";
import GuardDashboard from "./pages/guard/GuardDashboard.jsx";
import ManualCheck from "./pages/guard/ManualCheck.jsx";
import ScanQR from "./pages/guard/ScanQR.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />

        {/* Resident routes */}
        <Route
          path="/dashboard/resident"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <ResidentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pages/resident/AddVisitor"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <ResidentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pages/resident/GeneratePass"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <ResidentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pages/resident/VisitorHistory"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <VisitorHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pages/resident/BulkInvite"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <ResidentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pages/resident/Settings"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <ResidentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Guard routes */}
        <Route
          path="/dashboard/guard"
          element={
            <ProtectedRoute allowedRoles={["guard"]}>
              <GuardDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/guard/ManualCheck"
          element={
            <ProtectedRoute allowedRoles={["guard"]}>
              <GuardDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/guard/ScanQR"
          element={
            <ProtectedRoute allowedRoles={["guard"]}>
              <GuardDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/guard/Settings"
          element={
            <ProtectedRoute allowedRoles={["guard"]}>
              <GuardDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/guard/VisitorHistory"
          element={
            <ProtectedRoute allowedRoles={["guard"]}>
              <VisitorHistory />
            </ProtectedRoute>
          }
        />

        {/* Admin routes (blank for now) */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/visitors"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/manage-staff"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/reports"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/settings"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Default/fallback */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
