import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login";
import RegistrationPage from "./pages/Register";
import ResidentDashboard from "./pages/resident/ResidentDashboard";
import AddVisitor from "./pages/resident/AddVisitor";
import GeneratePass from "./pages/resident/GeneratePass";
import VisitorHistory from "./pages/resident/VisitorHistory";
import BulkInvite from "./pages/resident/BulkInvite";
import GuardDashboard from "./pages/guard/GuardDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        {/* Default route - redirect to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
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

        {/* Legacy routes for backward compatibility */}
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

        {/* Admin routes */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all route for unmatched paths */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
