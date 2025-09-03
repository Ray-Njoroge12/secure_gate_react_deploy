import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login";
import RegistrationPage from "./pages/Register";
import ProtectedRoute from "./routes/ProtectedRoute";
import BulkInvite from "./pages/resident/BulkInvite";
import Settings from "./pages/resident/Settings";
import ResidentDashboard from "./pages/resident/ResidentDashboard";
import AddVisitor from "./pages/resident/AddVisitor";
import GeneratePass from "./pages/resident/GeneratePass";
import VisitorHistory from "./pages/resident/VisitorHistory";
import GuardDashboard from "./pages/guard/GuardDashboard";
import ManualCheck from "./pages/guard/ManualCheck";
import ScanQR from "./pages/guard/ScanQR";
import AdminDashboard from "./pages/admin/AdminDashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* Default route - redirect to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/register/:inviteCode" element={<RegistrationPage />} />
        <Route path="/bulk-register/:inviteCode" element={<RegistrationPage />} />

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
          path="/resident/add-visitor"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <AddVisitor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resident/generate-pass"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <GeneratePass />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resident/visitor-history"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <VisitorHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resident/bulk-invite"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <BulkInvite />
            </ProtectedRoute>
          }
        />
        {/* Optional resident settings (using existing dashboard placeholder) */}
        <Route
          path="/resident/settings"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <Settings />
            </ProtectedRoute>
          }
        />
        {/* Legacy redirects for backward compatibility */}
        <Route path="/pages/resident/AddVisitor" element={<Navigate to="/resident/add-visitor" replace />} />
        <Route path="/pages/resident/GeneratePass" element={<Navigate to="/resident/generate-pass" replace />} />
        <Route path="/pages/resident/VisitorHistory" element={<Navigate to="/resident/visitor-history" replace />} />

        {/* Guard routes */}
        <Route
          path="/dashboard/guard"
          element={
            <ProtectedRoute allowedRoles={["security"]}>
              <GuardDashboard />
            </ProtectedRoute>
          }
        />
        {/* Guard auxiliary routes */}
        <Route
          path="/dashboard/guard/manual-check"
          element={
            <ProtectedRoute allowedRoles={["security"]}>
              <ManualCheck />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/guard/scan-qr"
          element={
            <ProtectedRoute allowedRoles={["security"]}>
              <ScanQR />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/guard/visitor-history"
          element={
            <ProtectedRoute allowedRoles={["security"]}>
              <VisitorHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/guard/settings"
          element={
            <ProtectedRoute allowedRoles={["security"]}>
              <GuardDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin routes (blank for now) */}
  {/* Admin routes */}
  <Route path="/dashboard/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
  <Route path="/dashboard/admin/users" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
  <Route path="/dashboard/admin/visitors" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
  <Route path="/dashboard/admin/manage-staff" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
  <Route path="/dashboard/admin/reports" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
  <Route path="/dashboard/admin/settings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />

  {/* Catch-all route for unmatched paths */}
  <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
