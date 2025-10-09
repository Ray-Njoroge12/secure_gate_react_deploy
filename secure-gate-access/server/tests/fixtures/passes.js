/**
 * Pass/Invite Test Fixtures
 * Predefined pass data for consistent testing
 * Note: visitor_id will be set during seeding based on created visitors
 */

/**
 * Active pass fixtures
 */
export const activePasses = {
  activePass1: {
    pass_id: `PASS${Date.now()}01`,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    status: 'active',
    qr_code: null // Will be generated during seeding
  },
  
  activePass2: {
    pass_id: `PASS${Date.now()}02`,
    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
    status: 'active',
    qr_code: null
  },
  
  multiUsePass: {
    pass_id: `PASS${Date.now()}03`,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    status: 'active',
    qr_code: null
  }
};

/**
 * Used pass fixtures
 */
export const usedPasses = {
  usedPass1: {
    pass_id: `PASS${Date.now()}04`,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
    status: 'used',
    qr_code: null
  },
  
  partiallyUsedPass: {
    pass_id: `PASS${Date.now()}05`,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'active',
    qr_code: null
  }
};

/**
 * Expired pass fixtures
 */
export const expiredPasses = {
  expiredPass1: {
    pass_id: `PASS${Date.now()}06`,
    expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago (expired)
    status: 'expired',
    qr_code: null
  },
  
  expiredPass2: {
    pass_id: `PASS${Date.now()}07`,
    expires_at: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago (expired)
    status: 'expired',
    qr_code: null
  }
};

/**
 * Revoked pass fixtures
 */
export const revokedPasses = {
  revokedPass1: {
    pass_id: `PASS${Date.now()}08`,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'revoked',
    qr_code: null
  }
};

/**
 * Future pass fixtures
 */
export const futurePasses = {
  futurePass1: {
    pass_id: `PASS${Date.now()}09`,
    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days from now
    status: 'active',
    qr_code: null
  }
};

/**
 * All pass fixtures combined
 */
export const allPasses = {
  ...activePasses,
  ...usedPasses,
  ...expiredPasses,
  ...revokedPasses,
  ...futurePasses
};

/**
 * Get all passes as array
 */
export const getAllPassesArray = () => {
  return Object.values(allPasses);
};

/**
 * Get passes by status
 */
export const getPassesByStatus = (status) => {
  return getAllPassesArray().filter(pass => pass.status === status);
};

/**
 * Get active passes
 */
export const getActivePasses = () => {
  return getPassesByStatus('active');
};

/**
 * Get valid passes (active and not expired)
 */
export const getValidPasses = () => {
  const now = new Date();
  return getAllPassesArray().filter(pass => 
    pass.status === 'active' && 
    new Date(pass.expires_at) >= now
  );
};

// Export default
export default {
  activePasses,
  usedPasses,
  expiredPasses,
  revokedPasses,
  futurePasses,
  allPasses,
  getAllPassesArray,
  getPassesByStatus,
  getActivePasses,
  getValidPasses
};
