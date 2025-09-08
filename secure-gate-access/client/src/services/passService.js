// client/src/services/passService.js

function buildHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'x-resident-email': localStorage.getItem('email') || 'demo@resident.local'
  };
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: buildHeaders(),
    body: body ? JSON.stringify(body) : undefined
  });
  let payload; try { payload = await res.json(); } catch { payload = {}; }
  const { success, data, error } = payload;
  if (!res.ok || success === false) throw new Error(error || payload.message || 'Request failed');
  return data !== undefined ? data : payload;
}

export function createVisitor(payload) {
  return api('POST', '/api/visitors', payload);
}

export function getMyVisitors() {
  return api('GET', '/api/visitors');
}

export function createPass(visitorId) {
  return api('POST', `/api/visitors/${visitorId}/pass`);
}

// The following endpoints depend on backend implementation; keep but note may 404 until server supports them.
export const listMyPasses = () => api('GET', '/api/passes/mine');
export const verifyOtp = (passId, otp) => api('POST', '/api/passes/verify-otp', { passId, otp });
export const regenerateOtp = (passId) => api('POST', '/api/passes/regenerate-otp', { passId });
export const scanToken = (token) => api('POST', '/api/passes/scan', { token });
export const checkIn = (token) => api('POST', '/api/passes/check-in', { token });
export const checkOut = (token) => api('POST', '/api/passes/check-out', { token });

export function bulkInvite(eventDetails) {
  const payload = {
    event_name: eventDetails.eventName,
    date: eventDetails.date,
    time: eventDetails.time,
    num_guests: eventDetails.numGuests
  };
  return api('POST', '/api/visitors/bulk-invite', payload);
}

export function getBulkInvite(inviteCode) {
  return api('GET', `/api/visitors/bulk-invite/${inviteCode}`);
}

export function completeInvite(inviteCode, guestDetails) {
  return api('POST', `/api/visitors/complete/${inviteCode}`, guestDetails);
}
