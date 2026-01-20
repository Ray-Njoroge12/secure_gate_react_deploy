/**
 * @fileoverview Main application component for Secure Gate Access
 * @description This is the root component that sets up routing, context providers,
 * and global functionality for the visitor management system.
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { Suspense, lazy, useEffect, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./layouts/AppShell"; // Import AppShell for route wrapping
import "./polyfills/index.js"; // Added for Task 3.4
import "./design-system/styles.css"; // Design system CSS variables
import "./styles.css"; // Additional app styles
// BUG-003 FIX: httpInterceptor removed - using httpOnly cookies instead
// import "./utils/httpInterceptor.js"; // HTTP interceptor for automatic auth headers
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import AuthErrorBoundary from "./components/ErrorBoundary/AuthErrorBoundary.jsx";
import BrowserCompatibilityWarning from "./components/BrowserCompatibilityWarning.jsx"; // Added for Task 3.4
import CookieConsentBanner from "./components/CookieConsentBanner.jsx"; // Privacy: Cookie consent for KDPA compliance
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary.jsx";
import NetworkErrorBoundary from "./components/ErrorBoundary/NetworkErrorBoundary.jsx";
import ErrorQueue from "./components/ErrorQueue.jsx";
import GlobalKeyboardShortcuts from "./components/GlobalKeyboardShortcuts.jsx"; // BUG-002 FIX
import OfflineRetryBanner from "./components/common/OfflineRetryBanner.jsx";
import SessionTimeoutWarning from "./components/common/SessionTimeoutWarning.jsx";
import GlobalStyles, { SkipLink } from "./components/ui/GlobalStyles.jsx";
import Loading from "./components/ui/Loading.jsx";
import ToastContainer from "./components/ToastContainer.jsx";
import RootProvider from "./contexts/RootProvider.jsx";
import { refreshCSRFToken } from "./utils/apiClient.js";
import { initializeAllKeyboardFeatures } from "./utils/focusManagement.js"; // Added for Task 1.5

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
const EstateRequired = lazy(() => import("./pages/EstateRequired.jsx"));
const EstateSelection = lazy(() => import("./pages/EstateSelection.jsx"));

// Security and Privacy pages - MFA and Data Privacy
const MFASetup = lazy(() => import("./pages/MFASetup.jsx"));
const MFAVerify = lazy(() => import("./pages/MFAVerify.jsx"));
const PrivacyDashboard = lazy(() => import("./pages/PrivacyDashboard.jsx"));

// Resident pages - Visitor management functionality for residents
const BulkInvite = lazy(() => import("./pages/resident/BulkInvite.jsx"));
const BulkInviteWizard = lazy(() => import("./pages/resident/BulkInviteWizard.jsx")); // Added for Task 2.3
const Settings = lazy(() => import("./pages/resident/Settings.jsx"));
const ResidentDashboard = lazy(() => import("./pages/resident/ResidentDashboard.jsx"));

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
    refreshCSRFToken().catch(() => { });
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
          <OfflineRetryBanner />
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
                    <Route path="/estate-required" element={<EstateRequired />} />
                    <Route path="/estate-selection" element={<EstateSelection />} />

                    {/* MFA routes */}
                    <Route
                      path="/mfa/setup"
                      element={
                        <ProtectedRoute allowedRoles={["resident", "guard", "admin"]}>
                          <AppShell role="user">
                            <MFASetup />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/mfa/verify" element={<MFAVerify />} />

                    {/* Guest & Visitor Public Routes */}
                    <Route path="/invite/:inviteCode" element={<GuestInvite />} />
                    <Route path="/v/:token" element={<VisitorInvitePage />} />
                    <Route path="/kiosk" element={<SelfCheckInKiosk />} />
                    <Route path="/visitor/confirm/:token" element={<VisitorConfirmation />} />
                    <Route path="/visitor/confirm" element={<VisitorConfirmation />} />

                    {/* RESIDENT ROUTES */}
                    <Route
                      path="/dashboard/resident"
                      element={
                        <ProtectedRoute allowedRoles={["resident"]}>
                          <AppShell role="resident" title="Resident Dashboard">
                            <ResidentDashboard />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    {/* Resident Sub-routes - Wrapped in AppShell individually for now (Plan: Refactor to Layout Route in future cleanup) */}
                    <Route
                      path="/resident/generate-pass"
                      element={
                        <ProtectedRoute allowedRoles={["resident"]}>
                          <AppShell role="resident" title="Generate Pass">
                            <GeneratePass />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/resident/visitor-history"
                      element={
                        <ProtectedRoute allowedRoles={["resident"]}>
                          <AppShell role="resident" title="Visitor History">
                            <VisitorHistory />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/resident/bulk-invite"
                      element={
                        <ProtectedRoute allowedRoles={["resident"]}>
                          <AppShell role="resident" title="Bulk Invite">
                            <BulkInvite />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/resident/settings"
                      element={
                        <ProtectedRoute allowedRoles={["resident"]}>
                          <AppShell role="resident" title="Settings">
                            <Settings />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/resident/bulk-invite-wizard"
                      element={
                        <ProtectedRoute allowedRoles={["resident"]}>
                          <AppShell role="resident" title="Bulk Invite">
                            <BulkInviteWizard />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/resident/favorite-visitors"
                      element={
                        <ProtectedRoute allowedRoles={["resident"]}>
                          <AppShell role="resident" title="Favorite Visitors">
                            <FavoriteVisitors />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/resident/quick-invite"
                      element={
                        <ProtectedRoute allowedRoles={["resident"]}>
                          <AppShell role="resident" title="Quick Invite">
                            <QuickInvite />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/resident/recurring-passes"
                      element={
                        <ProtectedRoute allowedRoles={["resident"]}>
                          <AppShell role="resident" title="Recurring Passes">
                            <RecurringPasses />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/resident/rideshare"
                      element={
                        <ProtectedRoute allowedRoles={["resident"]}>
                          <AppShell role="resident" title="Rideshare">
                            <RideshareEntry />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/privacy"
                      element={
                        <ProtectedRoute allowedRoles={["resident", "guard", "admin"]}>
                          <AppShell role="user" title="Privacy Dashboard">
                            <PrivacyDashboard />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />


                    {/* GUARD ROUTES */}
                    <Route
                      path="/dashboard/guard"
                      element={
                        <ProtectedRoute allowedRoles={["guard"]}>
                          <AppShell role="guard" title="Guard Station">
                            <GuardDashboard />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/guard/manual-check"
                      element={
                        <ProtectedRoute allowedRoles={["guard"]}>
                          <AppShell role="guard" title="Manual Check">
                            <ManualCheck />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/guard/scan-qr"
                      element={
                        <ProtectedRoute allowedRoles={["guard"]}>
                          <AppShell role="guard" title="Scan QR">
                            <ScanQR />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/guard/visitor-history"
                      element={
                        <ProtectedRoute allowedRoles={["guard"]}>
                          <AppShell role="guard" title="Visitor History">
                            <GuardVisitorHistory />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/guard/settings"
                      element={
                        <ProtectedRoute allowedRoles={["guard"]}>
                          <AppShell role="guard" title="Settings">
                            <GuardSettings />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/guard/walk-in"
                      element={
                        <ProtectedRoute allowedRoles={["guard"]}>
                          <AppShell role="guard" title="Walk-In Registration">
                            <WalkInRegistration />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/guard/incidents"
                      element={
                        <ProtectedRoute allowedRoles={["guard"]}>
                          <AppShell role="guard" title="Incidents">
                            <IncidentList />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/guard/analytics"
                      element={
                        <ProtectedRoute allowedRoles={["guard", "admin"]}>
                          <AppShell role="guard" title="Analytics">
                            <GuardAnalytics />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />


                    {/* ADMIN ROUTES */}
                    {/* Main Dashboard with Nested Route Parameter for Tabs */}
                    <Route
                      path="/dashboard/admin/:tab?"
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <AppShell role="admin" title="Admin Dashboard">
                            <AdminDashboard />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />

                    {/* Specific admin sub-routes mapped to dashboard with tab selection */}
                    <Route
                      path="/dashboard/admin/users"
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <AppShell role="admin" title="Admin Dashboard">
                            <AdminDashboard initialTab="users" />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/admin/visitors"
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <AppShell role="admin" title="Admin Dashboard">
                            <AdminDashboard initialTab="visitors" />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/admin/reports"
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <AppShell role="admin" title="Admin Dashboard">
                            <AdminDashboard initialTab="reports" />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/admin/settings"
                      element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                          <AppShell role="admin" title="Admin Dashboard">
                            <AdminDashboard initialTab="settings" />
                          </AppShell>
                        </ProtectedRoute>
                      }
                    />
                    {/* Other admin routes that might be separate pages eventually, mapping to dashboard for now if they exist as tabs */}
                    {/* If new standalone admin pages exist, list them here */}

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
