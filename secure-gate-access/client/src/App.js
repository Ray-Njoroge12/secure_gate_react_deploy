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
import "./styles/accessibility.css"; // WCAG 2.1 AA compliance styles
import "./styles/high-contrast.css"; // Explicit high-contrast mode styles
import "./styles.css"; // Additional app styles
// BUG-003 FIX: httpInterceptor removed - using httpOnly cookies instead
// import "./utils/httpInterceptor.js"; // HTTP interceptor for automatic auth headers
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import { closeAudioContext } from "./utils/notificationAudio";
import AuthErrorBoundary from "./components/ErrorBoundary/AuthErrorBoundary.jsx";
import BrowserCompatibilityWarning from "./components/BrowserCompatibilityWarning.jsx"; // Added for Task 3.4
import CookieConsentBanner from "./components/CookieConsentBanner.jsx"; // Privacy: Cookie consent for KDPA compliance
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary.jsx";
import NetworkErrorBoundary from "./components/ErrorBoundary/NetworkErrorBoundary.jsx";
import ErrorQueue from "./components/ErrorQueue.jsx";
import GlobalKeyboardShortcuts from "./components/GlobalKeyboardShortcuts.jsx"; // BUG-002 FIX
import OfflineRetryBanner from "./components/common/OfflineRetryBanner.jsx";
import RateLimitIndicator from "./components/common/RateLimitIndicator.jsx"; // Rate limit feedback
import SessionTimeoutWarning from "./components/common/SessionTimeoutWarning.jsx";
import GlobalStyles, { SkipLink } from "./components/ui/GlobalStyles.jsx";
import Loading from "./components/ui/Loading.jsx";
import ToastContainer from "./components/ToastContainer.jsx";
import RootProvider from "./contexts/RootProvider.jsx";
import PWAManager from "./components/pwa/PWAManager.jsx"; // Added for Task 4.4
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
const PrivacySettings = lazy(() => import("./components/privacy/PrivacySettings.jsx")); // Added for Task 17.3
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

// GeneratePass removed - using QuickInvite instead
const VisitorHistory = lazy(() => import("./pages/resident/VisitorHistory.jsx"));
const FavoriteVisitors = lazy(() => import("./pages/resident/FavoriteVisitors.jsx")); // Added for Task 2.3
const DeliveryList = lazy(() => import("./components/resident/DeliveryList.jsx"));
const ResidentApprovalsPanel = lazy(() => import("./pages/resident/ResidentApprovalsPanel.jsx")); // Phase 3: Walk-in approvals
const AutoApprovalRules = lazy(() => import("./components/resident/AutoApprovalRules.jsx")); // Phase 2.2: Auto-approval rules

// Guard pages - Security and access control for guards
const GuardDashboard = lazy(() => import("./pages/guard/GuardDashboard.jsx"));
const ManualCheck = lazy(() => import("./pages/guard/ManualCheck.jsx"));
const ScanQR = lazy(() => import("./pages/guard/ScanQR.jsx"));
const GuardSettings = lazy(() => import("./pages/guard/Settings.jsx"));
const GuardVisitorHistory = lazy(() => import("./pages/guard/VisitorHistory.jsx"));
const WalkInRegistration = lazy(() => import("./pages/guard/WalkInRegistration.jsx"));
const IncidentList = lazy(() => import("./pages/guard/IncidentList.jsx"));
const ShiftHandover = lazy(() => import("./pages/guard/ShiftHandover.jsx")); // Phase 3: Shift handover management
const ActivityLog = lazy(() => import("./pages/guard/ActivityLog.jsx")); // Phase 3: Guard activity log
const BulkCheckout = lazy(() => import("./pages/guard/BulkCheckout.jsx")); // Phase 3: Bulk checkout & EOD operations
const MFASetupGuide = lazy(() => import("./pages/guard/MFASetupGuide.jsx")); // Guard in-app documentation

// Company admin pages - Company and worker management
const CompanyRegistration = lazy(() => import("./pages/company/CompanyRegistration.jsx"));
const CompanyDashboard = lazy(() => import("./pages/company/CompanyDashboard.jsx"));
const WorkerManagement = lazy(() => import("./pages/company/WorkerManagement.jsx"));
const BulkWorkerRegistration = lazy(() => import("./pages/company/BulkWorkerRegistration.jsx"));
const CompanySettings = lazy(() => import("./pages/company/CompanySettings.jsx"));
const CompanyApprovals = lazy(() => import("./pages/admin/CompanyApprovals.jsx"));
const WorkerCheckIn = lazy(() => import("./pages/guard/WorkerCheckIn.jsx"));

// Admin pages - System administration and reporting
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx"));
// MessageViewer removed - file missing // Dev Tool
const SuperAdminDashboard = lazy(() => import("./pages/admin/SuperAdminDashboard.jsx"));
const Reports = lazy(() => import("./pages/admin/Reports.jsx"));
const AdminSettings = lazy(() => import("./pages/admin/Settings.jsx"));
const ManageResidents = lazy(() => import("./pages/admin/ManageResidents.jsx"));
const ManageGuards = lazy(() => import("./pages/admin/ManageGuards.jsx"));
const VisitorLog = lazy(() => import("./pages/admin/VisitorLog.jsx"));
const IntegrationsHub = lazy(() => import("./pages/admin/IntegrationsHub.jsx"));
// NotificationPreferences and ActivityDashboard removed - files missing
// const NotificationPreferences = lazy(() => import("./pages/admin/NotificationPreferences.jsx"));
// const ActivityDashboard = lazy(() => import("./pages/admin/ActivityDashboard.jsx"));

// Public visitor pages - Accessible via token URL
const VisitorInvitePage = lazy(() => import("./pages/public/VisitorInvitePage.jsx"));
// SelfCheckInKiosk removed - file missing
const VisitorConfirmation = lazy(() => import("./pages/public/VisitorInvitePage.jsx"));

// Resident additional pages
const QuickInvite = lazy(() => import("./pages/resident/QuickInvite.jsx"));

// P4/P5 New Feature Pages - Recurring Passes and Rideshare
const RecurringPasses = lazy(() => import("./components/resident/RecurringPasses.jsx"));
const RideshareEntry = lazy(() => import("./components/resident/RideshareEntry.jsx"));

// PWA Components - Added for Task 4.4
const PWASettings = lazy(() => import("./components/pwa/PWASettings.jsx"));
const OfflineVisitorList = lazy(() => import("./components/pwa/OfflineVisitorList.jsx"));

// Notification Components - Added for Task 7.3
const NotificationAnalyticsDashboard = lazy(() => import("./components/notifications/NotificationAnalyticsDashboard.jsx"));
const NotificationHistory = lazy(() => import("./components/notifications/NotificationHistory.jsx"));

// Dashboard Customization Components - Added for Task 3
const DashboardFoundation = lazy(() => import("./components/dashboard/DashboardFoundation.jsx"));
const PreferencePanel = lazy(() => import("./components/settings/PreferencePanel.jsx"));

// Collaboration Components - Added for Task 11
const CollaborationMessaging = lazy(() => import("./components/collaboration/MessagingSystem.jsx"));
const WorkflowHandoffs = lazy(() => import("./components/collaboration/WorkflowHandoffs.jsx"));
const ApprovalWorkflows = lazy(() => import("./components/collaboration/ApprovalWorkflows.jsx"));

// Bulk Operations - Added for Task 13
const BulkOperationsPanel = lazy(() => import("./components/bulk/BulkOperationsPanel.jsx"));

// Advanced Search - Added for Task 14
const AdvancedSearchPanel = lazy(() => import("./components/search/AdvancedSearchPanel.jsx"));

// Data Export - Added for Task 15
const DataExportPanel = lazy(() => import("./components/export/DataExportPanel.jsx"));

// Guard additional pages
// GuardAnalytics removed - Guards do not need analytics functionality

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

  useEffect(() => {
    return () => {
      closeAudioContext();
    };
  }, []);

  return (
    <AppErrorBoundary>
      <div ref={appRef}>
        <RootProvider>
          <PWAManager>
            {/* Global Styles & Animations */}
            <GlobalStyles />

            {/* BUG-002 FIX: Global Keyboard Shortcuts (uses AuthContext, no localStorage) */}
            <GlobalKeyboardShortcuts />

            {/* Session Timeout Warning - Global (uses role-based configuration) */}
            <SessionTimeoutWarning />
            <OfflineRetryBanner />
            <RateLimitIndicator threshold={15} position="bottom-right" />
            <ErrorBoundary level="page">
              <NetworkErrorBoundary>
                <AuthErrorBoundary>
                  <Suspense fallback={<Loading />}>
                    <Routes>
                      {/* Default route - redirect to login */}
                      <Route path="/" element={<Navigate to="/login" replace />} />

                      {/* Public routes */}
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/forgot-password" element={<LoginPage />} />
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
                      {/* GeneratePass route removed - using QuickInvite */}
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
                        path="/resident/deliveries"
                        element={
                          <ProtectedRoute allowedRoles={["resident"]}>
                            <AppShell role="resident" title="My Deliveries">
                              <DeliveryList />
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
                      {/* Phase 3: Resident Approvals for Walk-in Visitors */}
                      <Route
                        path="/resident/approvals"
                        element={
                          <ProtectedRoute allowedRoles={["resident"]}>
                            <AppShell role="resident" title="Visitor Approvals">
                              <ResidentApprovalsPanel />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      {/* Phase 2.2: Auto-Approval Rules Management */}
                      <Route
                        path="/resident/auto-approval"
                        element={
                          <ProtectedRoute allowedRoles={["resident"]}>
                            <AppShell role="resident" title="Auto-Approval Rules">
                              <AutoApprovalRules />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      {/* Phase 3: Resident Privacy Dashboard */}
                      <Route
                        path="/resident/privacy"
                        element={
                          <ProtectedRoute allowedRoles={["resident"]}>
                            <AppShell role="resident" title="Privacy Dashboard">
                              <PrivacyDashboard />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      {/* Phase 4: Favorites shortcut (alias for /resident/favorite-visitors) */}
                      <Route
                        path="/resident/favorites"
                        element={
                          <ProtectedRoute allowedRoles={["resident"]}>
                            <AppShell role="resident" title="Favorite Visitors">
                              <FavoriteVisitors />
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
                      <Route
                        path="/privacy/settings"
                        element={
                          <ProtectedRoute allowedRoles={["resident", "guard", "admin"]}>
                            <AppShell role="user" title="Privacy Settings">
                              <PrivacySettings />
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
                        path="/dashboard/guard/help/mfa-setup"
                        element={
                          <ProtectedRoute allowedRoles={["guard"]}>
                            <AppShell role="guard" title="MFA Setup Guide">
                              <MFASetupGuide />
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
                      {/* Phase 3 Cleanup: GuardAnalytics route removed */}
                      <Route
                        path="/dashboard/guard/shift-handover"
                        element={
                          <ProtectedRoute allowedRoles={["guard"]}>
                            <AppShell role="guard" title="Shift Handover">
                              <ShiftHandover />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/dashboard/guard/activity-log"
                        element={
                          <ProtectedRoute allowedRoles={["guard"]}>
                            <AppShell role="guard" title="Activity Log">
                              <ActivityLog />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/dashboard/guard/bulk-checkout"
                        element={
                          <ProtectedRoute allowedRoles={["guard"]}>
                            <AppShell role="guard" title="Bulk Checkout">
                              <BulkCheckout />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />


                      {/* Guard: Worker Check-in */}
                      <Route
                        path="/dashboard/guard/worker-check-in"
                        element={
                          <ProtectedRoute allowedRoles={["guard"]}>
                            <AppShell role="guard" title="Worker Access">
                              <WorkerCheckIn />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />

                      {/* Company Registration (any authenticated user) */}
                      <Route
                        path="/company/register"
                        element={
                          <ProtectedRoute allowedRoles={["resident", "admin", "super_admin", "company_admin"]}>
                            <AppShell role="user" title="Register Company">
                              <CompanyRegistration />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />

                      {/* COMPANY ADMIN ROUTES */}
                      <Route
                        path="/dashboard/company"
                        element={
                          <ProtectedRoute allowedRoles={["company_admin"]}>
                            <AppShell role="company_admin" title="Company Dashboard">
                              <CompanyDashboard />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/company/workers"
                        element={
                          <ProtectedRoute allowedRoles={["company_admin"]}>
                            <AppShell role="company_admin" title="Worker Management">
                              <WorkerManagement />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/company/workers/bulk-register"
                        element={
                          <ProtectedRoute allowedRoles={["company_admin"]}>
                            <AppShell role="company_admin" title="Bulk Worker Registration">
                              <BulkWorkerRegistration />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/company/settings"
                        element={
                          <ProtectedRoute allowedRoles={["company_admin"]}>
                            <AppShell role="company_admin" title="Company Settings">
                              <CompanySettings />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />

                      {/* ADMIN ROUTES */}
                      <Route
                        path="/dashboard/super-admin"
                        element={
                          <ProtectedRoute allowedRoles={["super_admin"]}>
                            <AppShell role="admin" title="Super Admin Dashboard">
                              <SuperAdminDashboard />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />

                      {/* Dev Tools - Message Viewer */}
                      {/* MessageViewer route removed */}

                      {/* Main Dashboard with Nested Route Parameter for Tabs */}
                      <Route
                        path="/dashboard/admin/:tab?"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                            <AppShell role="admin" title="Admin Dashboard">
                              <AdminDashboard />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />

                      {/* Specific admin sub-routes mapped to dashboard with tab selection */}
                      <Route
                        path="/dashboard/admin/approvals"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                            <AppShell role="admin" title="Admin Dashboard">
                              <AdminDashboard initialTab="approvals" />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/dashboard/admin/guards"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                            <AppShell role="admin" title="Admin Dashboard">
                              <AdminDashboard initialTab="guards" />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/dashboard/admin/residents"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                            <AppShell role="admin" title="Admin Dashboard">
                              <AdminDashboard initialTab="residents" />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/dashboard/admin/users"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                            <Navigate to="/dashboard/admin/approvals" replace />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/dashboard/admin/visitors"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                            <AppShell role="admin" title="Admin Dashboard">
                              <AdminDashboard initialTab="visitors" />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/dashboard/admin/reports"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                            <AppShell role="admin" title="Admin Dashboard">
                              <AdminDashboard initialTab="reports" />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/dashboard/admin/settings"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                            <AppShell role="admin" title="Admin Dashboard">
                              <AdminDashboard initialTab="settings" />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      {/* Admin: Company Management */}
                      <Route
                        path="/dashboard/admin/companies"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                            <AppShell role="admin" title="Company Management">
                              <CompanyApprovals />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      {/* Admin: Integrations Hub */}
                      <Route
                        path="/dashboard/admin/integrations"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                            <AppShell role="admin" title="Integrations">
                              <IntegrationsHub />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      {/* NotificationPreferences and ActivityDashboard routes removed */}
                      <Route
                        path="/dashboard/admin/help/security"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                            <AppShell role="admin" title="Security Help">
                              <MFASetupGuide />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      {/* Other admin routes that might be separate pages eventually, mapping to dashboard for now if they exist as tabs */}

                      {/* PWA Routes - Added for Task 4.4 */}
                      <Route
                        path="/pwa/settings"
                        element={
                          <ProtectedRoute allowedRoles={["resident", "guard", "admin"]}>
                            <AppShell role="user" title="PWA Settings">
                              <PWASettings />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/offline/visitors"
                        element={
                          <ProtectedRoute allowedRoles={["resident", "guard", "admin"]}>
                            <AppShell role="user" title="Offline Visitors">
                              <OfflineVisitorList />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />

                      {/* Notification Routes - Added for Task 7.3 */}
                      <Route
                        path="/notifications/analytics"
                        element={
                          <ProtectedRoute allowedRoles={["resident", "guard", "admin"]}>
                            <AppShell role="user" title="Notification Analytics">
                              <NotificationAnalyticsDashboard />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/notifications/history"
                        element={
                          <ProtectedRoute allowedRoles={["resident", "guard", "admin"]}>
                            <AppShell role="user" title="Notification History">
                              <NotificationHistory />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />

                      {/* Dashboard Customization Routes - Added for Task 3 */}
                      <Route
                        path="/dashboard/customize"
                        element={
                          <ProtectedRoute allowedRoles={["resident", "guard", "admin", "super_admin"]}>
                            <AppShell role="user" title="Customize Dashboard">
                              <DashboardFoundation />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/settings/preferences"
                        element={
                          <ProtectedRoute allowedRoles={["resident", "guard", "admin", "super_admin"]}>
                            <AppShell role="user" title="Preferences">
                              <PreferencePanel />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />

                      {/* Collaboration Routes - Added for Task 11 */}
                      <Route
                        path="/collaboration/messaging"
                        element={
                          <ProtectedRoute allowedRoles={["resident", "guard", "admin", "super_admin"]}>
                            <AppShell role="user" title="Messaging">
                              <CollaborationMessaging />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/collaboration/handoffs"
                        element={
                          <ProtectedRoute allowedRoles={["guard", "admin", "super_admin"]}>
                            <AppShell role="user" title="Workflow Handoffs">
                              <WorkflowHandoffs />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/collaboration/approvals"
                        element={
                          <ProtectedRoute allowedRoles={["resident", "guard", "admin", "super_admin"]}>
                            <AppShell role="user" title="Approval Workflows">
                              <ApprovalWorkflows />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />

                      {/* Admin Tools Routes - Tasks 13-15 */}
                      <Route
                        path="/admin/bulk-operations"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                            <AppShell role="admin" title="Bulk Operations">
                              <BulkOperationsPanel />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/search"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                            <AppShell role="admin" title="Advanced Search">
                              <AdvancedSearchPanel />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/export"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                            <AppShell role="admin" title="Data Export">
                              <DataExportPanel />
                            </AppShell>
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
          </PWAManager>
        </RootProvider>
      </div>
    </AppErrorBoundary>
  );
}

export default App;
// Cache clear trigger - Fri Nov  7 18:10:34 EAT 2025
