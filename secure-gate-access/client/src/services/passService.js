// client/src/services/passService.js

import { http } from './_http.js';

export function createVisitor(payload) {
  return http.post('/api/visitors', payload);
}

export function getMyVisitors() {
  return http.get('/api/visitors');
}



// The following endpoints depend on backend implementation; keep but note may 404 until server supports them.
export const listMyPasses = () => http.get('/api/passes/mine');
export const verifyOtp = (passId, otp) => http.post('/api/passes/verify-otp', { passId, otp });
export const regenerateOtp = (passId) => http.post('/api/passes/regenerate-otp', { passId });
export const scanToken = (token) => http.post('/api/passes/scan', { token });
export const checkIn = (token) => http.post('/api/passes/check-in', { token });
export const checkOut = (token) => http.post('/api/passes/check-out', { token });

export function bulkInvite(eventDetails) {
  // Server expects camelCase keys
  const payload = {
    eventName: eventDetails.eventName,
    date: eventDetails.date,
    time: eventDetails.time,
    numGuests: eventDetails.numGuests
  };
  return http.post('/api/visitors/bulk-invite', payload);
}

export function getBulkInvite(inviteCode) {
  return http.get(`/api/visitors/bulk-invite/${inviteCode}`);
}

export function completeInvite(inviteCode, guestDetails) {
  return http.post(`/api/visitors/complete/${inviteCode}`, guestDetails);
}

// Visitor OTP endpoints
export function visitorVerifyOtp(visitorId, otp) {
  return http.post(`/api/visitors/${visitorId}/verify-otp`, { otp });
}

export function resendVisitorOtp(visitorId) {
  return http.post(`/api/visitors/${visitorId}/resend-otp`, {});
}
