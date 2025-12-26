// Visitor Service (client)
// Unified integration for visitors, passes, and invites.
// Server duplicate removed.

import { http } from './_http.js';

const API_BASE = '/api/visitors';

// === Visitors ===
export const createVisitor = (payload) => http.post(API_BASE, payload);
export const getMyVisitors = () => http.get(API_BASE);
export const listVisitors = getMyVisitors;

// === Passes (basic, leave advanced to passService.js) ===
export const createPass = (visitorId) => http.post(`${API_BASE}/${visitorId}/pass`);

// === Bulk Invites ===
export const bulkInvite = (eventDetails) => http.post(`${API_BASE}/bulk-invite`, eventDetails);
export const getBulkInvite = (inviteCode) => http.get(`${API_BASE}/bulk-invite/${inviteCode}`);
export const completeInvite = (inviteCode, guestDetails) => http.post(`${API_BASE}/complete/${inviteCode}`, guestDetails);

// === Shared Links ===
export const getInviteByCode = (inviteCode) => http.get(`/api/public/invites/${inviteCode}`);

// === Public Invite Lookup (no auth) ===
export const getPublicInvite = (inviteCode) => http.get(`/api/public/invites/${inviteCode}`);

// === Optional OTP Support ===
export const verifyOtp = (email, otp) => http.post('/api/verify-otp', { email, otp });

// === Utility ===
export function normalizeVisitor(v) {
  if (!v || typeof v !== 'object') return v;
  return {
    id: v.id,
    name: v.name,
    phone: v.phone,
    idType: v.id_type !== undefined ? v.id_type : v.idType,
    idNumber: v.id_number !== undefined ? v.id_number : v.idNumber,
    residentEmail: v.resident_email !== undefined ? v.resident_email : v.residentEmail,
    purpose: v.purpose,
    dateOfVisit: v.date_of_visit !== undefined ? v.date_of_visit : v.dateOfVisit,
    timeOfVisit: v.time_of_visit !== undefined ? v.time_of_visit : v.timeOfVisit,
    status: v.status,
    checkIn: v.check_in !== undefined ? v.check_in : v.checkIn,
    checkOut: v.check_out !== undefined ? v.check_out : v.checkOut,
    inviteCode: v.invite_code !== undefined ? v.invite_code : v.inviteCode,
    qrCode: v.qr_code !== undefined ? v.qr_code : v.qrCode
  };
}
