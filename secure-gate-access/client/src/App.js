import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login";
import RegistrationPage from "./pages/Register";
import ResidentDashboard from "./pages/resident/ResidentDashboard";
import AddVisitor from "./pages/resident/AddVisitor";
import GeneratePass from "./pages/resident/GeneratePass";
import VisitorHistory from "./pages/resident/VisitorHistory";
import GuardDashboard from "./pages/guard/GuardDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        {/* Root redirect */}
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
          path="/dashboard/resident/add-visitor"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <AddVisitor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/resident/generate-pass"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <GeneratePass />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/resident/visitor-history"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <VisitorHistory />
            </ProtectedRoute>
          }
        />

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
      </Routes>
    </Router>
  );
}

export default App;
