// API endpoints configuration
const BASE_URL = process.env.REACT_APP_API_URL || '';

export const API_ENDPOINTS = {
  // Base API URL
  BASE: `${BASE_URL}/api`,
  
  // Authentication
  LOGIN: `${BASE_URL}/api/users/login`,
  REGISTER: `${BASE_URL}/api/users/register`,
  FORGOT_PASSWORD: `${BASE_URL}/api/auth/forgot-password`,
  RESET_PASSWORD: `${BASE_URL}/api/auth/reset-password`,
  
  // Visitors
  VISITORS: `${BASE_URL}/api/visitors`,
  BULK_INVITE: `${BASE_URL}/api/visitors/bulk-invite`,
  COMPLETE_INVITE: (inviteCode) => `${BASE_URL}/api/visitors/complete/${inviteCode}`,
  VISITOR_PASS: (visitorId) => `${BASE_URL}/api/visitors/${visitorId}/pass`,
  VERIFY_OTP: (visitorId) => `${BASE_URL}/api/visitors/${visitorId}/verify-otp`,
  RESEND_OTP: (visitorId) => `${BASE_URL}/api/visitors/${visitorId}/resend-otp`,
  
  // Visitor management
  CHECK_IN: (visitorId) => `${BASE_URL}/api/visitors/${visitorId}/check-in`,
  CHECK_OUT: (visitorId) => `${BASE_URL}/api/visitors/${visitorId}/check-out`,
  REVOKE: (visitorId) => `${BASE_URL}/api/visitors/${visitorId}/revoke`,
  ACTIVE_VISITORS: `${BASE_URL}/api/visitors/active`,
  VISITOR_REPORTS: `${BASE_URL}/api/visitors/reports`,
  
  // Access logs
  ACCESS_LOGS: `${BASE_URL}/api/access-logs`,
  
  // Dashboard
  DASHBOARD_STATS: `${BASE_URL}/api/dashboard/stats`
};