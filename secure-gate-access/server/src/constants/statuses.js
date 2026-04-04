// Canonical status constants for passes and visitors (all lowercase)
export const PASS_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  OTP_SENT: 'otp_sent',
  PENDING_CONFIRMATION: 'pending_confirmation',
  CONFIRMED: 'confirmed',
  ACTIVE: 'active',
  CHECKED_IN: 'checked_in',
  ON_PREMISE: 'on_premise',
  CHECKED_OUT: 'checked_out',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  
  // QR code generation states
  QR_PENDING: 'qr_pending',             // QR generation failed; visitor can regenerate or guard can process manually

  // Phase 3: Walk-in approval flow statuses
  PENDING_APPROVAL: 'pending_approval', // Walk-in visitor waiting for resident approval
  APPROVED: 'approved',                 // Resident approved entry
  REJECTED: 'rejected',                 // Resident rejected entry
  CANCELLED: 'cancelled'                // Invitation cancelled by resident/admin
};

/**
 * Normalize a status string to canonical lowercase format
 * Accepts both legacy uppercase ('PENDING') and canonical lowercase ('pending')
 * @param {string} status - Status string to normalize
 * @returns {string} Lowercase status string
 */
export function normalizeStatus(status) {
  return (status || '').toLowerCase();
}

/**
 * Check if a status matches a canonical PASS_STATUS value
 * Accepts both legacy uppercase and canonical lowercase
 * @param {string} status - Status to check
 * @param {string} expected - Expected PASS_STATUS value
 * @returns {boolean}
 */
export function statusEquals(status, expected) {
  return normalizeStatus(status) === expected;
}

/**
 * Check if a status is in a list of allowed statuses
 * @param {string} status - Status to check
 * @param {string[]} allowedStatuses - Array of PASS_STATUS values
 * @returns {boolean}
 */
export function statusIn(status, allowedStatuses) {
  const normalized = normalizeStatus(status);
  return allowedStatuses.includes(normalized);
}

/**
 * Statuses that allow visitor check-in
 */
export const CHECK_IN_ALLOWED_STATUSES = [
  PASS_STATUS.PENDING,
  PASS_STATUS.VERIFIED,
  PASS_STATUS.OTP_SENT,
  PASS_STATUS.CHECKED_IN,
  PASS_STATUS.ON_PREMISE,
  PASS_STATUS.APPROVED
];

/**
 * Check if visitor can be checked in based on status
 * @param {string} status - Visitor's current status
 * @returns {boolean}
 */
export function canCheckInStatus(status) {
  return statusIn(status, CHECK_IN_ALLOWED_STATUSES);
}

export default { 
  PASS_STATUS, 
  normalizeStatus, 
  statusEquals, 
  statusIn,
  canCheckInStatus,
  CHECK_IN_ALLOWED_STATUSES
};
