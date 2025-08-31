import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
              <AddVisitor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pages/resident/GeneratePass"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <GeneratePass />
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
