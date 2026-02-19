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
import ResidentLayout from "./layouts/ResidentLayout";
import GuardLayout from "./layouts/GuardLayout";
import AdminLayout from "./layouts/AdminLayout";
import PageTitle from "./components/common/PageTitle";
import "./polyfills/index.js"; // Added for Task 3.4
import "./design-system/styles.css"; // Design system CSS variables
import "./styles/accessibility.css"; // WCAG 2.1 AA compliance styles
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

// Admin pages - System administration and reporting
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx"));

const SuperAdminDashboard = lazy(() => import("./pages/admin/SuperAdminDashboard.jsx"));
const Reports = lazy(() => import("./pages/admin/Reports.jsx"));
const AdminSettings = lazy(() => import("./pages/admin/Settings.jsx"));
const ManageResidents = lazy(() => import("./pages/admin/ManageResidents.jsx"));
const ManageGuards = lazy(() => import("./pages/admin/ManageGuards.jsx"));
const VisitorLog = lazy(() => import("./pages/admin/VisitorLog.jsx"));



// Public visitor pages - Accessible via token URL
const VisitorInvitePage = lazy(() => import("./pages/public/VisitorInvitePage.jsx"));
// const SelfCheckInKiosk = lazy(() => import("./pages/public/SelfCheckInKiosk.jsx"));
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
                          <ProtectedRoute allowedRoles={["resident", "guard", "admin", "super_admin"]}>
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
                      <Route element={<ResidentLayout />}>
                        <Route
                          path="/dashboard/resident"
                          element={
                            <>
                              <PageTitle title="Resident Dashboard" />
                              <ResidentDashboard />
                            </>
                          }
                        />
                        <Route
                          path="/resident/visitor-history"
                          element={
                            <>
                              <PageTitle title="Visitor History" />
                              <VisitorHistory />
                            </>
                          }
                        />
                        <Route
                          path="/resident/bulk-invite"
                          element={
                            <>
                              <PageTitle title="Bulk Invite" />
                              <BulkInvite />
                            </>
                          }
                        />
                        <Route
                          path="/resident/settings"
                          element={
                            <>
                              <PageTitle title="Settings" />
                              <Settings />
                            </>
                          }
                        />
                        <Route
                          path="/resident/bulk-invite-wizard"
                          element={
                            <>
                              <PageTitle title="Bulk Invite" />
                              <BulkInviteWizard />
                            </>
                          }
                        />
                        <Route
                          path="/resident/favorite-visitors"
                          element={
                            <>
                              <PageTitle title="Favorite Visitors" />
                              <FavoriteVisitors />
                            </>
                          }
                        />
                        <Route
                          path="/resident/deliveries"
                          element={
                            <>
                              <PageTitle title="My Deliveries" />
                              <DeliveryList />
                            </>
                          }
                        />
                        <Route
                          path="/resident/quick-invite"
                          element={
                            <>
                              <PageTitle title="Quick Invite" />
                              <QuickInvite />
                            </>
                          }
                        />
                        <Route
                          path="/resident/recurring-passes"
                          element={
                            <>
                              <PageTitle title="Recurring Passes" />
                              <RecurringPasses />
                            </>
                          }
                        />
                        <Route
                          path="/resident/rideshare"
                          element={
                            <>
                              <PageTitle title="Rideshare" />
                              <RideshareEntry />
                            </>
                          }
                        />
                        <Route
                          path="/resident/approvals"
                          element={
                            <>
                              <PageTitle title="Visitor Approvals" />
                              <ResidentApprovalsPanel />
                            </>
                          }
                        />
                        <Route
                          path="/resident/auto-approval"
                          element={
                            <>
                              <PageTitle title="Auto-Approval Rules" />
                              <AutoApprovalRules />
                            </>
                          }
                        />
                        <Route
                          path="/resident/privacy"
                          element={
                            <>
                              <PageTitle title="Privacy Dashboard" />
                              <PrivacyDashboard />
                            </>
                          }
                        />
                        <Route
                          path="/resident/favorites"
                          element={
                            <>
                              <PageTitle title="Favorite Visitors" />
                              <FavoriteVisitors />
                            </>
                          }
                        />
                      </Route>


                      {/* GUARD ROUTES */}
                      <Route element={<GuardLayout />}>
                        <Route
                          path="/dashboard/guard"
                          element={
                            <>
                              <PageTitle title="Guard Station" />
                              <GuardDashboard />
                            </>
                          }
                        />
                        <Route
                          path="/dashboard/guard/manual-check"
                          element={
                            <>
                              <PageTitle title="Manual Check" />
                              <ManualCheck />
                            </>
                          }
                        />
                        <Route
                          path="/dashboard/guard/scan-qr"
                          element={
                            <>
                              <PageTitle title="Scan QR" />
                              <ScanQR />
                            </>
                          }
                        />
                        <Route
                          path="/dashboard/guard/visitor-history"
                          element={
                            <>
                              <PageTitle title="Visitor History" />
                              <GuardVisitorHistory />
                            </>
                          }
                        />
                        <Route
                          path="/dashboard/guard/settings"
                          element={
                            <>
                              <PageTitle title="Settings" />
                              <GuardSettings />
                            </>
                          }
                        />
                        <Route
                          path="/dashboard/guard/help/mfa-setup"
                          element={
                            <>
                              <PageTitle title="MFA Setup Guide" />
                              <MFASetupGuide />
                            </>
                          }
                        />
                        <Route
                          path="/dashboard/guard/walk-in"
                          element={
                            <>
                              <PageTitle title="Walk-In Registration" />
                              <WalkInRegistration />
                            </>
                          }
                        />
                        <Route
                          path="/dashboard/guard/incidents"
                          element={
                            <>
                              <PageTitle title="Incidents" />
                              <IncidentList />
                            </>
                          }
                        />
                        <Route
                          path="/dashboard/guard/shift-handover"
                          element={
                            <>
                              <PageTitle title="Shift Handover" />
                              <ShiftHandover />
                            </>
                          }
                        />
                        <Route
                          path="/dashboard/guard/activity-log"
                          element={
                            <>
                              <PageTitle title="Activity Log" />
                              <ActivityLog />
                            </>
                          }
                        />
                        <Route
                          path="/dashboard/guard/bulk-checkout"
                          element={
                            <>
                              <PageTitle title="Bulk Checkout" />
                              <BulkCheckout />
                            </>
                          }
                        />
                      </Route>


                      {/* ADMIN & SUPER_ADMIN ROUTES */}
                      <Route element={<AdminLayout />}>
                        <Route
                          path="/dashboard/super-admin"
                          element={
                            <>
                              <PageTitle title="Super Admin Dashboard" />
                              <SuperAdminDashboard />
                            </>
                          }
                        />

                        {/* Main Dashboard with Nested Route Parameter for Tabs */}
                        <Route
                          path="/dashboard/admin/:tab?"
                          element={
                            <>
                              <PageTitle title="Admin Dashboard" />
                              <AdminDashboard />
                            </>
                          }
                        />

                        {/* Specific admin sub-routes mapped to dashboard with tab selection */}
                        <Route
                          path="/dashboard/admin/approvals"
                          element={
                            <>
                              <PageTitle title="Admin Dashboard" />
                              <AdminDashboard initialTab="approvals" />
                            </>
                          }
                        />
                        <Route
                          path="/dashboard/admin/guards"
                          element={
                            <>
                              <PageTitle title="Admin Dashboard" />
                              <AdminDashboard initialTab="guards" />
                            </>
                          }
                        />
                        <Route
                          path="/dashboard/admin/residents"
                          element={
                            <>
                              <PageTitle title="Admin Dashboard" />
                              <AdminDashboard initialTab="residents" />
                            </>
                          }
                        />
                        <Route
                          path="/dashboard/admin/visitors"
                          element={
                            <>
                              <PageTitle title="Admin Dashboard" />
                              <AdminDashboard initialTab="visitors" />
                            </>
                          }
                        />
                        <Route
                          path="/dashboard/admin/incidents"
                          element={
                            <>
                              <PageTitle title="Admin Dashboard" />
                              <AdminDashboard initialTab="incidents" />
                            </>
                          }
                        />
                        <Route
                          path="/dashboard/admin/reports"
                          element={
                            <>
                              <PageTitle title="Admin Dashboard" />
                              <AdminDashboard initialTab="reports" />
                            </>
                          }
                        />
                        <Route
                          path="/dashboard/admin/settings"
                          element={
                            <>
                              <PageTitle title="Admin Dashboard" />
                              <AdminDashboard initialTab="settings" />
                            </>
                          }
                        />

                        <Route
                          path="/dashboard/admin/help/security"
                          element={
                            <>
                              <PageTitle title="Security Help" />
                              <MFASetupGuide />
                            </>
                          }
                        />
                      </Route>

                      <Route
                        path="/dashboard/admin/users"
                        element={
                          <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                            <Navigate to="/dashboard/admin/approvals" replace />
                          </ProtectedRoute>
                        }
                      />
                      {/* GENERAL USER ROUTES (PRIVACY, PWA, NOTIFICATIONS, ETC.) */}
                      <Route
                        path="/privacy"
                        element={
                          <ProtectedRoute allowedRoles={["resident", "guard", "admin", "super_admin"]}>
                            <AppShell role="user" title="Privacy Dashboard">
                              <PrivacyDashboard />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/privacy/settings"
                        element={
                          <ProtectedRoute allowedRoles={["resident", "guard", "admin", "super_admin"]}>
                            <AppShell role="user" title="Privacy Settings">
                              <PrivacySettings />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />

                      {/* PWA & OFFLINE ROUTES */}
                      <Route
                        path="/pwa/settings"
                        element={
                          <ProtectedRoute allowedRoles={["resident", "guard", "admin", "super_admin"]}>
                            <AppShell role="user" title="PWA Settings">
                              <PWASettings />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/offline/visitors"
                        element={
                          <ProtectedRoute allowedRoles={["resident", "guard", "admin", "super_admin"]}>
                            <AppShell role="user" title="Offline Visitors">
                              <OfflineVisitorList />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />

                      {/* NOTIFICATION ROUTES */}
                      <Route
                        path="/notifications/analytics"
                        element={
                          <ProtectedRoute allowedRoles={["resident", "guard", "admin", "super_admin"]}>
                            <AppShell role="user" title="Notification Analytics">
                              <NotificationAnalyticsDashboard />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/notifications/history"
                        element={
                          <ProtectedRoute allowedRoles={["resident", "guard", "admin", "super_admin"]}>
                            <AppShell role="user" title="Notification History">
                              <NotificationHistory />
                            </AppShell>
                          </ProtectedRoute>
                        }
                      />

                      {/* COLLABORATION & CUSTOMIZATION ROUTES */}
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
