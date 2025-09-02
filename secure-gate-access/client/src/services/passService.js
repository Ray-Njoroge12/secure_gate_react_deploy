// client/src/services/passService.js
// In-memory backend integration layer (will adapt to real auth later)

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-resident-email': localStorage.getItem('email') || 'demo@resident.local'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  if(!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export function createVisitor(payload){
  return api('POST','/api/visitors', payload);
}
export function getMyVisitors(){
  return api('GET','/api/visitors');
}
export function createPass(visitorId){
  return api('POST', `/api/visitors/${visitorId}/pass`);
}
export function listMyPasses(){
  return api('GET','/api/passes/mine');
}
export function verifyOtp(passId, otp){
  return api('POST','/api/passes/verify-otp',{ passId, otp });
}
export function regenerateOtp(passId){
  return api('POST','/api/passes/regenerate-otp',{ passId });
}
export function scanToken(token){
  return api('POST','/api/passes/scan',{ token });
}
export function checkIn(token){
  return api('POST','/api/passes/check-in',{ token });
}
export function checkOut(token){
  return api('POST','/api/passes/check-out',{ token });
}
export function bulkInvite(eventDetails){
  return api('POST','/api/visitors/bulk-invite', eventDetails);
}
export function getBulkInvite(inviteCode){
  return api('GET', `/api/visitors/bulk-invite/${inviteCode}`);
}
export function completeInvite(inviteCode, guestDetails){
  return api('POST', `/api/visitors/complete/${inviteCode}`, guestDetails);
}
