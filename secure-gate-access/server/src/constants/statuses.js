// Canonical status constants for passes and visitors
export const PASS_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  ACTIVE: 'active',
  ON_PREMISE: 'on_premise',
  CHECKED_OUT: 'checked_out',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  
  // Phase 3: Walk-in approval flow statuses
  PENDING_APPROVAL: 'pending_approval', // Walk-in visitor waiting for resident approval
  APPROVED: 'approved',                 // Resident approved entry
  REJECTED: 'rejected'                  // Resident rejected entry
};

export default { PASS_STATUS };
