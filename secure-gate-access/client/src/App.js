import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.js";
import { ErrorProvider } from "./contexts/ErrorContext.jsx";
import Loading from "./components/ui/Loading.jsx";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary.jsx";
import NetworkErrorBoundary from "./components/ErrorBoundary/NetworkErrorBoundary.jsx";
import AuthErrorBoundary from "./components/ErrorBoundary/AuthErrorBoundary.jsx";
import ToastContainer from "./components/ToastContainer.jsx";

// Lazy load all page components for better build performance
const LoginPage = lazy(() => import("./pages/Login.jsx"));
const RegistrationPage = lazy(() => import("./pages/Register.js"));
const GuestInvite = lazy(() => import("./pages/GuestInvite.jsx"));
const ProtectedRoute = lazy(() => import("./routes/ProtectedRoute.jsx"));

// Resident pages
const BulkInvite = lazy(() => import("./pages/resident/BulkInvite.jsx"));
const Settings = lazy(() => import("./pages/resident/Settings.jsx"));
const ResidentDashboard = lazy(() => import("./pages/resident/ResidentDashboard.jsx"));
const AddVisitor = lazy(() => import("./pages/resident/AddVisitor.jsx"));
const GeneratePass = lazy(() => import("./pages/resident/GeneratePass.jsx"));
const VisitorHistory = lazy(() => import("./pages/resident/VisitorHistory.jsx"));

// Guard pages
const GuardDashboard = lazy(() => import("./pages/guard/GuardDashboard.jsx"));
const ManualCheck = lazy(() => import("./pages/guard/ManualCheck.jsx"));
const ScanQR = lazy(() => import("./pages/guard/ScanQR.jsx"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx"));
const Reports = lazy(() => import("./pages/admin/Reports.jsx"));

function App() {
  return (
    <ErrorProvider>
      <AuthProvider>
        <Router>
          <ErrorBoundary level="page">
            <NetworkErrorBoundary>
              <AuthErrorBoundary>
                <Suspense fallback={<Loading />}>
            <Routes>
            {/* Default route - redirect to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/register/:inviteCode" element={<RegistrationPage />} />
            <Route path="/bulk-register/:inviteCode" element={<RegistrationPage />} />

            {/* Guest invitation routes */}
            <Route path="/invite/:inviteCode" element={<GuestInvite />} />

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
                <ProtectedRoute allowedRoles={["guard"]}>
                  <GuardDashboard />
                </ProtectedRoute>
              }
            />
            {/* Guard auxiliary routes */}
            <Route
              path="/dashboard/guard/manual-check"
              element={
                <ProtectedRoute allowedRoles={["guard"]}>
                  <ManualCheck />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/guard/scan-qr"
              element={
                <ProtectedRoute allowedRoles={["guard"]}>
                  <ScanQR />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/guard/visitor-history"
              element={
                <ProtectedRoute allowedRoles={["guard"]}>
                  <VisitorHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/guard/settings"
              element={
                <ProtectedRoute allowedRoles={["guard"]}>
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
                  <Reports />
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

            {/* Catch-all route for unmatched paths */}
            <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
                </Suspense>
              </AuthErrorBoundary>
            </NetworkErrorBoundary>
          </ErrorBoundary>
          <ToastContainer />
        </Router>
      </AuthProvider>
    </ErrorProvider>
  );
}

export default App;
