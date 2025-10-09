/**
 * Enhanced Pass & Access Test Fixtures
 * Advanced pass scenarios including expired, revoked, multi-use passes, and access logs
 */

/**
 * Pass States
 * Passes in different states for testing various scenarios
 */
export const passStates = {
  // Active, valid pass
  active: {
    visitor_id: null, // To be set by test
    pass_code: 'PASS-ACTIVE-001',
    qr_code: 'QR-ACTIVE-001',
    status: 'active',
    valid_from: new Date(Date.now() - 3600000), // 1 hour ago
    valid_until: new Date(Date.now() + 86400000), // 24 hours from now
    uses_remaining: 1,
    max_uses: 1,
    generated_at: new Date(Date.now() - 3600000),
    generated_by: null // To be set by test
  },

  // Expired pass
  expired: {
    visitor_id: null,
    pass_code: 'PASS-EXPIRED-002',
    qr_code: 'QR-EXPIRED-002',
    status: 'expired',
    valid_from: new Date(Date.now() - 172800000), // 2 days ago
    valid_until: new Date(Date.now() - 86400000), // 1 day ago
    uses_remaining: 1,
    max_uses: 1,
    generated_at: new Date(Date.now() - 172800000),
    generated_by: null
  },

  // Used pass
  used: {
    visitor_id: null,
    pass_code: 'PASS-USED-003',
    qr_code: 'QR-USED-003',
    status: 'used',
    valid_from: new Date(Date.now() - 7200000), // 2 hours ago
    valid_until: new Date(Date.now() + 79200000), // 22 hours from now
    uses_remaining: 0,
    max_uses: 1,
    used_at: new Date(Date.now() - 3600000), // 1 hour ago
    used_by: null, // Guard ID
    generated_at: new Date(Date.now() - 7200000),
    generated_by: null
  },

  // Revoked pass
  revoked: {
    visitor_id: null,
    pass_code: 'PASS-REVOKED-004',
    qr_code: 'QR-REVOKED-004',
    status: 'revoked',
    valid_from: new Date(Date.now() - 3600000),
    valid_until: new Date(Date.now() + 86400000),
    uses_remaining: 1,
    max_uses: 1,
    revoked_at: new Date(),
    revoked_by: null, // Admin ID
    revocation_reason: 'Security concern',
    generated_at: new Date(Date.now() - 3600000),
    generated_by: null
  },

  // Not yet valid pass (future)
  notYetValid: {
    visitor_id: null,
    pass_code: 'PASS-FUTURE-005',
    qr_code: 'QR-FUTURE-005',
    status: 'active',
    valid_from: new Date(Date.now() + 86400000), // 24 hours from now
    valid_until: new Date(Date.now() + 172800000), // 48 hours from now
    uses_remaining: 1,
    max_uses: 1,
    generated_at: new Date(),
    generated_by: null
  }
};

/**
 * Multi-Use Passes
 * Passes that can be used multiple times
 */
export const multiUsePasses = {
  // 5 uses remaining
  fiveUses: {
    visitor_id: null,
    pass_code: 'PASS-MULTI-001',
    qr_code: 'QR-MULTI-001',
    status: 'active',
    valid_from: new Date(Date.now() - 3600000),
    valid_until: new Date(Date.now() + 604800000), // 7 days
    uses_remaining: 5,
    max_uses: 5,
    generated_at: new Date(Date.now() - 3600000),
    generated_by: null,
    metadata: {
      purpose: 'Contractor - Weekly Access',
      usage_log: []
    }
  },

  // Partially used (3 of 10)
  partiallyUsed: {
    visitor_id: null,
    pass_code: 'PASS-MULTI-002',
    qr_code: 'QR-MULTI-002',
    status: 'active',
    valid_from: new Date(Date.now() - 86400000),
    valid_until: new Date(Date.now() + 2592000000), // 30 days
    uses_remaining: 7,
    max_uses: 10,
    generated_at: new Date(Date.now() - 86400000),
    generated_by: null,
    metadata: {
      purpose: 'Monthly Maintenance',
      usage_log: [
        { used_at: new Date(Date.now() - 86400000), gate: 'Main Gate' },
        { used_at: new Date(Date.now() - 43200000), gate: 'Back Gate' },
        { used_at: new Date(Date.now() - 21600000), gate: 'Main Gate' }
      ]
    }
  },

  // Unlimited uses (until expiry)
  unlimited: {
    visitor_id: null,
    pass_code: 'PASS-MULTI-003',
    qr_code: 'QR-MULTI-003',
    status: 'active',
    valid_from: new Date(Date.now() - 2592000000), // 30 days ago
    valid_until: new Date(Date.now() + 2592000000), // 30 days future
    uses_remaining: -1, // -1 indicates unlimited
    max_uses: -1,
    generated_at: new Date(Date.now() - 2592000000),
    generated_by: null,
    metadata: {
      purpose: 'Permanent Staff',
      badge_number: 'BADGE-PERM-001'
    }
  },

  // Last use remaining
  lastUse: {
    visitor_id: null,
    pass_code: 'PASS-MULTI-004',
    qr_code: 'QR-MULTI-004',
    status: 'active',
    valid_from: new Date(Date.now() - 86400000),
    valid_until: new Date(Date.now() + 86400000),
    uses_remaining: 1,
    max_uses: 5,
    generated_at: new Date(Date.now() - 86400000),
    generated_by: null,
    metadata: {
      purpose: 'Delivery - Multiple Drops',
      usage_log: [
        { used_at: new Date(Date.now() - 86400000), gate: 'Main Gate' },
        { used_at: new Date(Date.now() - 64800000), gate: 'Main Gate' },
        { used_at: new Date(Date.now() - 43200000), gate: 'Back Gate' },
        { used_at: new Date(Date.now() - 21600000), gate: 'Main Gate' }
      ]
    }
  }
};

/**
 * Access Log Entries
 * Sample access log entries for testing reporting and analytics
 */
export const accessLogEntries = {
  // Successful entry
  successfulEntry: {
    pass_id: null, // To be set by test
    visitor_id: null,
    gate: 'Main Gate',
    action: 'entry',
    status: 'success',
    timestamp: new Date(Date.now() - 3600000),
    guard_id: null,
    metadata: {
      method: 'QR Scan',
      device_id: 'SCANNER-001'
    }
  },

  // Successful exit
  successfulExit: {
    pass_id: null,
    visitor_id: null,
    gate: 'Main Gate',
    action: 'exit',
    status: 'success',
    timestamp: new Date(Date.now() - 1800000),
    guard_id: null,
    metadata: {
      method: 'QR Scan',
      device_id: 'SCANNER-001'
    }
  },

  // Failed entry - expired pass
  failedExpired: {
    pass_id: null,
    visitor_id: null,
    gate: 'Main Gate',
    action: 'entry',
    status: 'failed',
    failure_reason: 'Pass expired',
    timestamp: new Date(Date.now() - 3600000),
    guard_id: null,
    metadata: {
      method: 'QR Scan',
      device_id: 'SCANNER-001'
    }
  },

  // Failed entry - revoked pass
  failedRevoked: {
    pass_id: null,
    visitor_id: null,
    gate: 'Main Gate',
    action: 'entry',
    status: 'failed',
    failure_reason: 'Pass revoked',
    timestamp: new Date(Date.now() - 1800000),
    guard_id: null,
    metadata: {
      method: 'Manual Entry',
      device_id: 'TERMINAL-001',
      notes: 'Security alert - pass was revoked'
    }
  },

  // Manual override entry
  manualOverride: {
    pass_id: null,
    visitor_id: null,
    gate: 'Main Gate',
    action: 'entry',
    status: 'success',
    timestamp: new Date(Date.now() - 900000),
    guard_id: null,
    metadata: {
      method: 'Manual Override',
      device_id: 'TERMINAL-001',
      override_reason: 'System issue - QR scanner not working',
      authorized_by: 'ADMIN-001'
    }
  }
};

/**
 * Bulk Pass Generation
 * Generate multiple passes for performance and load testing
 */
export const bulkPassGeneration = {
  // Generate event passes
  eventPasses: (count = 50, eventId = 'EVENT-001') => {
    const passes = [];
    const gates = ['Main Gate', 'Back Gate', 'Side Gate'];
    
    for (let i = 0; i < count; i++) {
      passes.push({
        visitor_id: null,
        pass_code: `PASS-${eventId}-${String(i + 1).padStart(3, '0')}`,
        qr_code: `QR-${eventId}-${String(i + 1).padStart(3, '0')}`,
        status: 'active',
        valid_from: new Date(Date.now() + 82800000), // 23 hours from now
        valid_until: new Date(Date.now() + 115200000), // 32 hours from now
        uses_remaining: 2, // Entry + Exit
        max_uses: 2,
        generated_at: new Date(),
        generated_by: null,
        metadata: {
          event_id: eventId,
          gate_assignment: gates[i % 3],
          category: i % 5 === 0 ? 'VIP' : 'General'
        }
      });
    }
    
    return passes;
  },

  // Generate contractor passes
  contractorPasses: (count = 20) => {
    const passes = [];
    
    for (let i = 0; i < count; i++) {
      passes.push({
        visitor_id: null,
        pass_code: `PASS-CONTRACTOR-${String(i + 1).padStart(3, '0')}`,
        qr_code: `QR-CONTRACTOR-${String(i + 1).padStart(3, '0')}`,
        status: 'active',
        valid_from: new Date(Date.now() - 86400000),
        valid_until: new Date(Date.now() + 2592000000), // 30 days
        uses_remaining: 60, // 2 per day (in/out) for 30 days
        max_uses: 60,
        generated_at: new Date(Date.now() - 86400000),
        generated_by: null,
        metadata: {
          contractor_company: i % 2 === 0 ? 'BuildCo Ltd' : 'FixIt Services',
          badge_number: `BADGE-${String(i + 1).padStart(3, '0')}`,
          site: 'Block E Construction'
        }
      });
    }
    
    return passes;
  },

  // Generate delivery passes
  deliveryPasses: (count = 30) => {
    const passes = [];
    const carriers = ['DHL', 'FedEx', 'Local Courier', 'Swift Delivery'];
    
    for (let i = 0; i < count; i++) {
      passes.push({
        visitor_id: null,
        pass_code: `PASS-DELIVERY-${String(i + 1).padStart(4, '0')}`,
        qr_code: `QR-DELIVERY-${String(i + 1).padStart(4, '0')}`,
        status: 'active',
        valid_from: new Date(Date.now() - 1800000), // 30 min ago
        valid_until: new Date(Date.now() + 5400000), // 1.5 hours from now
        uses_remaining: 1,
        max_uses: 1,
        generated_at: new Date(Date.now() - 1800000),
        generated_by: null,
        metadata: {
          carrier: carriers[i % 4],
          tracking_number: `TRACK${String(Math.random() * 1000000).padStart(8, '0')}`,
          vehicle_plate: `KCA ${String(100 + i).padStart(3, '0')}X`
        }
      });
    }
    
    return passes;
  }
};

/**
 * Generate Bulk Access Logs
 * @param {number} count - Number of log entries to generate
 * @param {Object} options - Additional options
 * @returns {Array} Array of access log objects
 */
export function generateBulkAccessLogs(count, options = {}) {
  const logs = [];
  const gates = ['Main Gate', 'Back Gate', 'Side Gate'];
  const actions = ['entry', 'exit'];
  const statuses = ['success', 'failed'];
  const methods = ['QR Scan', 'Manual Entry', 'OTP Verification'];
  
  for (let i = 0; i < count; i++) {
    const status = i % 10 === 0 ? 'failed' : 'success'; // 10% failure rate
    const action = i % 2 === 0 ? 'entry' : 'exit';
    
    logs.push({
      pass_id: options.pass_id || null,
      visitor_id: options.visitor_id || null,
      gate: gates[i % 3],
      action: action,
      status: status,
      failure_reason: status === 'failed' ? ['Pass expired', 'Invalid pass', 'No access'][i % 3] : null,
      timestamp: new Date(Date.now() - (count - i) * 60000), // 1 minute intervals
      guard_id: options.guard_id || null,
      metadata: {
        method: methods[i % 3],
        device_id: `DEVICE-${String(i % 5).padStart(3, '0')}`,
        ...options.metadata
      }
    });
  }
  
  return logs;
}

/**
 * Helper Functions
 */

/**
 * Generate pass code
 * @param {string} prefix - Prefix for pass code
 * @param {number} index - Index for uniqueness
 * @returns {string} Pass code
 */
export function generatePassCode(prefix = 'PASS', index = 0) {
  return `${prefix}-${String(Date.now()).slice(-8)}-${String(index).padStart(3, '0')}`;
}

/**
 * Generate QR code data
 * @param {string} passCode - Pass code
 * @returns {string} QR code data
 */
export function generateQRCode(passCode) {
  return `QR-${passCode}`;
}

/**
 * Check if pass is valid
 * @param {Object} pass - Pass object
 * @param {Date} checkTime - Time to check validity (default: now)
 * @returns {boolean} Is pass valid
 */
export function isPassValid(pass, checkTime = new Date()) {
  if (pass.status !== 'active') return false;
  if (pass.uses_remaining !== -1 && pass.uses_remaining <= 0) return false;
  if (checkTime < new Date(pass.valid_from)) return false;
  if (checkTime > new Date(pass.valid_until)) return false;
  return true;
}

// Export all collections
export default {
  passStates,
  multiUsePasses,
  accessLogEntries,
  bulkPassGeneration,
  generateBulkAccessLogs,
  generatePassCode,
  generateQRCode,
  isPassValid
};
