/**
 * @fileoverview Main application component for Secure Gate Access
 * @description This is the root component that sets up routing, context providers,
 * and global functionality for the visitor management system.
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { Suspense, lazy, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.js";
import { ErrorProvider } from "./contexts/ErrorContext.jsx";
import { NavigationProvider } from "./contexts/NavigationContext.jsx";
import { LoadingProvider } from "./contexts/LoadingContext.jsx"; // Added for Task 2.6
import { SearchProvider } from "./contexts/SearchContext.jsx"; // Added for Task 3.3
import { BrowserCompatibilityProvider } from "./contexts/BrowserCompatibilityContext.jsx"; // Added for Task 3.4
import "./polyfills/index.js"; // Added for Task 3.4
import "./design-system/styles.css"; // Design system CSS variables
import Loading from "./components/ui/Loading.jsx";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary.jsx";
import NetworkErrorBoundary from "./components/ErrorBoundary/NetworkErrorBoundary.jsx";
import AuthErrorBoundary from "./components/ErrorBoundary/AuthErrorBoundary.jsx";
import ToastContainer from "./components/ToastContainer.jsx";
import ErrorQueue from "./components/ErrorQueue.jsx";
import BrowserCompatibilityWarning from "./components/BrowserCompatibilityWarning.jsx"; // Added for Task 3.4
import { initializeAllKeyboardFeatures } from "./utils/focusManagement.js"; // Added for Task 1.5

/**
 * Lazy load all page components for better build performance
 * This reduces the initial bundle size by splitting code at the route level
 */

// Public pages - Accessible without authentication
const LoginPage = lazy(() => import("./pages/Login.jsx"));
const RegistrationPage = lazy(() => import("./pages/Register.js"));
const GuestInvite = lazy(() => import("./pages/GuestInvite.jsx"));
const ProtectedRoute = lazy(() => import("./routes/ProtectedRoute.jsx"));

// Resident pages - Visitor management functionality for residents
const BulkInvite = lazy(() => import("./pages/resident/BulkInvite.jsx"));
const BulkInviteWizard = lazy(() => import("./pages/resident/BulkInviteWizard.jsx")); // Added for Task 2.3
const Settings = lazy(() => import("./pages/resident/Settings.jsx"));
const ResidentDashboard = lazy(() => import("./pages/resident/ResidentDashboard.jsx"));
const AddVisitor = lazy(() => import("./pages/resident/AddVisitor.jsx"));
const AddVisitorWizard = lazy(() => import("./pages/resident/AddVisitorWizard.jsx")); // Added for Task 2.3
const GeneratePass = lazy(() => import("./pages/resident/GeneratePass.jsx"));
const VisitorHistory = lazy(() => import("./pages/resident/VisitorHistory.jsx"));

// Guard pages - Security and access control for guards
const GuardDashboard = lazy(() => import("./pages/guard/GuardDashboard.jsx"));
const ManualCheck = lazy(() => import("./pages/guard/ManualCheck.jsx"));
const ScanQR = lazy(() => import("./pages/guard/ScanQR.jsx"));

// Admin pages - System administration and reporting
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx"));
const Reports = lazy(() => import("./pages/admin/Reports.jsx"));

/**
 * Main App component that renders the entire application
 * 
 * @description This component sets up the application structure with:
 * - Context providers for global state management
 * - Routing configuration for all pages
 * - Global keyboard shortcuts
 * - Error boundaries for error handling
 * - Browser compatibility warnings
 * 
 * @component
 * @returns {JSX.Element} The main application component
 * 
 * @example
 * // The App component is rendered at the root level
 * ReactDOM.render(<App />, document.getElementById('root'));
 */
function App() {
  const appRef = useRef(null);

  /**
   * Global keyboard shortcuts for improved accessibility and user experience
   * 
   * @description Provides keyboard shortcuts for common actions:
   * - Ctrl/Cmd + K: Focus search input
   * - Ctrl/Cmd + H: Navigate to home/dashboard
   * - Ctrl/Cmd + L: Logout user
   * - Ctrl/Cmd + B: Toggle sidebar
   * 
   * @effect
   * @listens keydown
   */
  useEffect(() => {
    // Initialize keyboard navigation features
    initializeAllKeyboardFeatures();

    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K to focus search (if available)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"], input[type="text"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
      // Ctrl/Cmd + H to go to home/dashboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        const role = localStorage.getItem('role');
        if (role) {
          window.location.href = `/dashboard/${role}`;
        } else {
          window.location.href = '/login';
        }
      }
      // Ctrl/Cmd + L to logout
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '/login';
      }
      // Ctrl/Cmd + B to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        const sidebarToggle = document.querySelector('[aria-label*="menu"]');
        if (sidebarToggle) {
          sidebarToggle.click();
        }
      }
    };

    const app = appRef.current;
    if (app) {
      app.addEventListener('keydown', handleKeyDown);
      return () => app.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  return (
    <div ref={appRef}>
            <ErrorProvider>
              <AuthProvider>
                <LoadingProvider> {/* Added for Task 2.6 */}
                  <SearchProvider> {/* Added for Task 3.3 */}
                    <BrowserCompatibilityProvider> {/* Added for Task 3.4 */}
                      <Router>
                        <NavigationProvider>
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
            <Route
              path="/resident/add-visitor-wizard"
              element={
                <ProtectedRoute allowedRoles={["resident"]}>
                  <AddVisitorWizard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resident/bulk-invite-wizard"
              element={
                <ProtectedRoute allowedRoles={["resident"]}>
                  <BulkInviteWizard />
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
                        <ErrorQueue />
                        <BrowserCompatibilityWarning /> {/* Added for Task 3.4 */}
                        </NavigationProvider>
                      </Router>
                      </BrowserCompatibilityProvider> {/* Closed for Task 3.4 */}
                    </SearchProvider> {/* Closed for Task 3.3 */}
                    </LoadingProvider> {/* Closed for Task 2.6 */}
                </AuthProvider>
              </ErrorProvider>
    </div>
  );
}

export default App;
