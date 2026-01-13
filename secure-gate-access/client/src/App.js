/**
 * @fileoverview Main application component for Secure Gate Access
 * @description This is the root component that sets up routing, context providers,
 * and global functionality for the visitor management system.
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { Suspense, lazy, useEffect, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import RootProvider from "./contexts/RootProvider.jsx";
import "./polyfills/index.js"; // Added for Task 3.4
import "./design-system/styles.css"; // Design system CSS variables
import "./styles.css"; // Additional app styles
// BUG-003 FIX: httpInterceptor removed - using httpOnly cookies instead
// import "./utils/httpInterceptor.js"; // HTTP interceptor for automatic auth headers
import Loading from "./components/ui/Loading.jsx";
import GlobalKeyboardShortcuts from "./components/GlobalKeyboardShortcuts.jsx"; // BUG-002 FIX
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary.jsx";
import NetworkErrorBoundary from "./components/ErrorBoundary/NetworkErrorBoundary.jsx";
import AuthErrorBoundary from "./components/ErrorBoundary/AuthErrorBoundary.jsx";
import ToastContainer from "./components/ToastContainer.jsx";
import ErrorQueue from "./components/ErrorQueue.jsx";
import BrowserCompatibilityWarning from "./components/BrowserCompatibilityWarning.jsx"; // Added for Task 3.4
import CookieConsentBanner from "./components/CookieConsentBanner.jsx"; // Privacy: Cookie consent for KDPA compliance
import { initializeAllKeyboardFeatures } from "./utils/focusManagement.js"; // Added for Task 1.5
import SessionTimeoutWarning from "./components/common/SessionTimeoutWarning.jsx";
import { refreshCSRFToken } from "./utils/apiClient.js";
import GlobalStyles, { SkipLink } from "./components/ui/GlobalStyles.jsx";

/**
 * Lazy load all page components for better build performance
 * This reduces the initial bundle size by splitting code at the route level
 */

// Public pages - Accessible without authentication
const LoginPage = lazy(() => import("./pages/Login.jsx"));
const RegistrationPage = lazy(() => import("./pages/Register.js"));
const GuestInvite = lazy(() => import("./pages/GuestInvite.jsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.jsx"));
const TermsOfService = lazy(() => import("./pages/TermsOfService.jsx"));
const ProtectedRoute = lazy(() => import("./routes/ProtectedRoute.jsx"));

// Security and Privacy pages - MFA and Data Privacy
const MFASetup = lazy(() => import("./pages/MFASetup.jsx"));
const MFAVerify = lazy(() => import("./pages/MFAVerify.jsx"));
const PrivacyDashboard = lazy(() => import("./pages/PrivacyDashboard.jsx"));

// Resident pages - Visitor management functionality for residents
const BulkInvite = lazy(() => import("./pages/resident/BulkInvite.jsx"));
const BulkInviteWizard = lazy(() => import("./pages/resident/BulkInviteWizard.jsx")); // Added for Task 2.3
const Settings = lazy(() => import("./pages/resident/Settings.jsx"));
const ResidentDashboard = lazy(() => import("./pages/resident/ResidentDashboard.jsx"));
const AddVisitor = lazy(() => import("./pages/resident/AddVisitor.jsx"));
const AddVisitorWizard = lazy(() => import("./pages/resident/AddVisitorWizard.jsx")); // Added for Task 2.3
const GeneratePass = lazy(() => import("./pages/resident/GeneratePass.jsx"));
const VisitorHistory = lazy(() => import("./pages/resident/VisitorHistory.jsx"));
const FavoriteVisitors = lazy(() => import("./pages/resident/FavoriteVisitors.jsx")); // Added for Task 2.3

// Guard pages - Security and access control for guards
const GuardDashboard = lazy(() => import("./pages/guard/GuardDashboard.jsx"));
const ManualCheck = lazy(() => import("./pages/guard/ManualCheck.jsx"));
const ScanQR = lazy(() => import("./pages/guard/ScanQR.jsx"));
const GuardSettings = lazy(() => import("./pages/guard/Settings.jsx"));
const GuardVisitorHistory = lazy(() => import("./pages/guard/VisitorHistory.jsx"));
const WalkInRegistration = lazy(() => import("./pages/guard/WalkInRegistration.jsx"));
const IncidentList = lazy(() => import("./pages/guard/IncidentList.jsx"));

// Admin pages - System administration and reporting
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx"));
const Reports = lazy(() => import("./pages/admin/Reports.jsx"));
const AdminSettings = lazy(() => import("./pages/admin/Settings.jsx"));
const AdminOperations = lazy(() => import("./pages/admin/AdminOperationsDashboard.jsx"));
const WatchlistManagement = lazy(() => import("./pages/admin/WatchlistManagement.jsx"));
const IncidentManagement = lazy(() => import("./pages/admin/IncidentManagement.jsx"));
const ManageResidents = lazy(() => import("./pages/admin/ManageResidents.jsx"));
const ManageGuards = lazy(() => import("./pages/admin/ManageGuards.jsx"));
const AccessControl = lazy(() => import("./pages/admin/AccessControl.jsx"));
const VisitorLog = lazy(() => import("./pages/admin/VisitorLog.jsx"));
const IntegrationsHub = lazy(() => import("./pages/admin/IntegrationsHub.jsx"));
const SiteManagement = lazy(() => import("./pages/admin/SiteManagement.jsx"));

// Public visitor pages - Accessible via token URL
const VisitorInvitePage = lazy(() => import("./pages/public/VisitorInvitePage.jsx"));
const SelfCheckInKiosk = lazy(() => import("./pages/public/SelfCheckInKiosk.jsx"));
const VisitorConfirmation = lazy(() => import("./pages/VisitorConfirmation.jsx"));

// Resident additional pages
const QuickInvite = lazy(() => import("./pages/resident/QuickInvite.jsx"));

// P4/P5 New Feature Pages - Recurring Passes and Rideshare
const RecurringPasses = lazy(() => import("./components/resident/RecurringPasses.jsx"));
const RideshareEntry = lazy(() => import("./components/resident/RideshareEntry.jsx"));

// Guard additional pages
const GuardAnalytics = lazy(() => import("./pages/guard/GuardAnalytics.jsx"));

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
    // BUG-002 FIX: Removed localStorage-based keyboard shortcuts
    // Now handled by GlobalKeyboardShortcuts component inside RootProvider
  }, []);

  useEffect(() => {
    refreshCSRFToken().catch(() => {});
  }, []);

  return (
    <AppErrorBoundary>
      <div ref={appRef}>
        <RootProvider>
          {/* Global Styles & Animations */}
          <GlobalStyles />
          
          {/* BUG-002 FIX: Global Keyboard Shortcuts (uses AuthContext, no localStorage) */}
          <GlobalKeyboardShortcuts />
          
          {/* Skip to Main Content - Accessibility */}
          <SkipLink mainContentId="main-content" />
          
          {/* Session Timeout Warning - Global */}
          <SessionTimeoutWarning 
            warningTime={5 * 60 * 1000}  // 5 minutes before expiry
            sessionTimeout={30 * 60 * 1000}  // 30 minutes total session
          />
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

            {/* Privacy and Terms routes */}
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />

            {/* MFA routes - Multi-Factor Authentication */}
            <Route
              path="/mfa/setup"
              element={
                <ProtectedRoute allowedRoles={["resident", "guard", "admin"]}>
                  <MFASetup />
                </ProtectedRoute>
              }
            />
            <Route path="/mfa/verify" element={<MFAVerify />} />

            {/* Privacy Dashboard - Kenya DPA Compliance */}
            <Route
              path="/privacy"
              element={
                <ProtectedRoute allowedRoles={["resident", "guard", "admin"]}>
                  <PrivacyDashboard />
                </ProtectedRoute>
              }
            />

            {/* Guest invitation routes */}
            <Route path="/invite/:inviteCode" element={<GuestInvite />} />
            
            {/* Public visitor pages - Token-based access */}
            <Route path="/v/:token" element={<VisitorInvitePage />} />
            <Route path="/kiosk" element={<SelfCheckInKiosk />} />
            <Route path="/visitor/confirm/:token" element={<VisitorConfirmation />} />
            <Route path="/visitor/confirm" element={<VisitorConfirmation />} />

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
            <Route
              path="/resident/favorite-visitors"
              element={
                <ProtectedRoute allowedRoles={["resident"]}>
                  <FavoriteVisitors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resident/quick-invite"
              element={
                <ProtectedRoute allowedRoles={["resident"]}>
                  <QuickInvite />
                </ProtectedRoute>
              }
            />
            {/* P4: Recurring Passes - Daily workers, caregivers, contractors */}
            <Route
              path="/resident/recurring-passes"
              element={
                <ProtectedRoute allowedRoles={["resident"]}>
                  <RecurringPasses />
                </ProtectedRoute>
              }
            />
            {/* P5: Rideshare Quick Entry - Uber/Bolt/Taxi */}
            <Route
              path="/resident/rideshare"
              element={
                <ProtectedRoute allowedRoles={["resident"]}>
                  <RideshareEntry />
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
                  <GuardVisitorHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/guard/settings"
              element={
                <ProtectedRoute allowedRoles={["guard"]}>
                  <GuardSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/guard/walk-in"
              element={
                <ProtectedRoute allowedRoles={["guard"]}>
                  <WalkInRegistration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/guard/incidents"
              element={
                <ProtectedRoute allowedRoles={["guard"]}>
                  <IncidentList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/guard/analytics"
              element={
                <ProtectedRoute allowedRoles={["guard", "admin"]}>
                  <GuardAnalytics />
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
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/analytics"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminOperations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/security"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <WatchlistManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/incidents"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <IncidentManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/audit-logs"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminOperations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/residents"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <ManageResidents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/guards"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <ManageGuards />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/access-control"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AccessControl />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/visitor-log"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <VisitorLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/integrations"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <IntegrationsHub />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/sites"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <SiteManagement />
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
          <BrowserCompatibilityWarning />
          <CookieConsentBanner />
        </RootProvider>
      </div>
    </AppErrorBoundary>
  );
}

export default App;
// Cache clear trigger - Fri Nov  7 18:10:34 EAT 2025
