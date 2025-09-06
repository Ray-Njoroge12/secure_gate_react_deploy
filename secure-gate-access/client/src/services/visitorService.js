// Visitor Service (client)
// Unified integration for visitors, passes, and invites.
// Server duplicate removed.

const API_BASE = '/api/visitors';

function buildHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  const residentEmail = localStorage.getItem('residentEmail');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(residentEmail ? { 'x-resident-email': residentEmail } : {}),
    ...extra
  };
}

async function apiCall(endpoint, method = 'GET', body = null, headers = {}) {
  const opts = { method, headers: buildHeaders(headers) };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(endpoint, opts);
  let payload;
  try { payload = await res.json(); } catch { payload = {}; }
  const { success, data, error } = payload;
  if (!res.ok || success === false) {
    throw new Error(error || payload.message || 'Request failed');
  }
  return data !== undefined ? data : payload;
}

// === Visitors ===
export const createVisitor = (payload) => apiCall(API_BASE, 'POST', payload);
export const getMyVisitors = () => apiCall(API_BASE, 'GET');
export const listVisitors = getMyVisitors;

// === Passes (basic, leave advanced to passService.js) ===
export const createPass = (visitorId) => apiCall(`${API_BASE}/${visitorId}/pass`, 'POST');

// === Bulk Invites ===
export const bulkInvite = (eventDetails) => apiCall(`${API_BASE}/bulk-invite`, 'POST', eventDetails);
export const getBulkInvite = (inviteCode) => apiCall(`${API_BASE}/bulk-invite/${inviteCode}`, 'GET');
export const completeInvite = (inviteCode, guestDetails) => apiCall(`${API_BASE}/complete/${inviteCode}`, 'POST', guestDetails);

// === Shared Links ===
export const getInviteByCode = (inviteCode) => apiCall(`/api/invite/${inviteCode}`, 'GET');

// === Optional OTP Support ===
export const verifyOtp = (email, otp) => apiCall('/api/verify-otp', 'POST', { email, otp });

// === Utility ===
export function normalizeVisitor(v) {
  if (!v || typeof v !== 'object') return v;
  return {
    id: v.id,
    name: v.name,
    phone: v.phone,
    idType: v.id_type || v.idType,
    idNumber: v.id_number || v.idNumber,
    residentEmail: v.resident_email || v.residentEmail,
    purpose: v.purpose,
    dateOfVisit: v.date_of_visit || v.dateOfVisit,
    timeOfVisit: v.time_of_visit || v.timeOfVisit,
    status: v.status,
    checkIn: v.check_in || v.checkIn,
    checkOut: v.check_out || v.checkOut,
    inviteCode: v.invite_code || v.inviteCode,
    qrCode: v.qr_code || v.qrCode
  };
}
