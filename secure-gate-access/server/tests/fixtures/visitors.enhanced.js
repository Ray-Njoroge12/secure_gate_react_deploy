/**
 * Enhanced Visitor Test Fixtures
 * Advanced visitor scenarios including lifecycle states, recurring visitors, and bulk data
 */

/**
 * Visitor Lifecycle States
 * Visitors in different stages of their visit lifecycle
 */
export const visitorLifecycleStates = {
  // Visitor just invited (pending)
  invited: {
    name: 'John Invited',
    email: 'john.invited@visitor.com',
    phone: '+254723000001',
    id_number: 'ID12345001',
    purpose: 'Meeting',
    host_id: null, // To be set by test
    invite_code: 'INV-INVITED-001',
    status: 'invited',
    visit_date: new Date(Date.now() + 86400000), // Tomorrow
    duration_hours: 2,
    metadata: {
      invited_at: new Date(),
      invitation_method: 'email'
    }
  },

  // Visitor with approved invitation
  approved: {
    name: 'Mary Approved',
    email: 'mary.approved@visitor.com',
    phone: '+254723000002',
    id_number: 'ID12345002',
    purpose: 'Business Meeting',
    host_id: null,
    invite_code: 'INV-APPROVED-002',
    status: 'approved',
    visit_date: new Date(Date.now() + 3600000), // 1 hour from now
    duration_hours: 3,
    approved_at: new Date(),
    approved_by: null, // To be set by test
    otp: '123456',
    otp_expires_at: new Date(Date.now() + 600000) // 10 minutes from now
  },

  // Visitor currently checked in
  checkedIn: {
    name: 'David CheckedIn',
    email: 'david.checkedin@visitor.com',
    phone: '+254723000003',
    id_number: 'ID12345003',
    purpose: 'Delivery',
    host_id: null,
    invite_code: 'INV-CHECKIN-003',
    status: 'checked-in',
    visit_date: new Date(),
    duration_hours: 1,
    approved_at: new Date(Date.now() - 3600000),
    checked_in_at: new Date(Date.now() - 1800000), // 30 min ago
    checked_in_by: null, // Guard ID
    gate: 'Main Gate'
  },

  // Visitor who checked out
  checkedOut: {
    name: 'Grace CheckedOut',
    email: 'grace.checkedout@visitor.com',
    phone: '+254723000004',
    id_number: 'ID12345004',
    purpose: 'Visit',
    host_id: null,
    invite_code: 'INV-CHECKOUT-004',
    status: 'checked-out',
    visit_date: new Date(Date.now() - 7200000), // 2 hours ago
    duration_hours: 2,
    approved_at: new Date(Date.now() - 10800000),
    checked_in_at: new Date(Date.now() - 7200000),
    checked_out_at: new Date(Date.now() - 600000), // 10 min ago
    checked_out_by: null, // Guard ID
    gate: 'Main Gate'
  },

  // Visitor with expired invitation
  expired: {
    name: 'Peter Expired',
    email: 'peter.expired@visitor.com',
    phone: '+254723000005',
    id_number: 'ID12345005',
    purpose: 'Meeting',
    host_id: null,
    invite_code: 'INV-EXPIRED-005',
    status: 'expired',
    visit_date: new Date(Date.now() - 86400000), // Yesterday
    duration_hours: 2,
    approved_at: new Date(Date.now() - 172800000),
    otp_expires_at: new Date(Date.now() - 86400000)
  },

  // Cancelled visitor
  cancelled: {
    name: 'Sarah Cancelled',
    email: 'sarah.cancelled@visitor.com',
    phone: '+254723000006',
    id_number: 'ID12345006',
    purpose: 'Meeting',
    host_id: null,
    invite_code: 'INV-CANCELLED-006',
    status: 'cancelled',
    visit_date: new Date(Date.now() + 86400000),
    duration_hours: 2,
    cancelled_at: new Date(),
    cancelled_by: null, // Host or admin ID
    cancellation_reason: 'Meeting postponed'
  }
};

/**
 * Recurring Visitors
 * Visitors who come regularly (contractors, staff, etc.)
 */
export const recurringVisitors = {
  // Daily contractor
  dailyContractor: {
    name: 'James Contractor',
    email: 'james.contractor@company.com',
    phone: '+254724000001',
    id_number: 'ID12346001',
    purpose: 'Construction Work',
    host_id: null,
    visitor_type: 'contractor',
    recurring: true,
    recurring_pattern: 'daily',
    recurring_start: new Date(Date.now() - 2592000000), // 30 days ago
    recurring_end: new Date(Date.now() + 2592000000), // 30 days future
    approved_at: new Date(Date.now() - 2592000000),
    metadata: {
      company: 'BuildCo Ltd',
      badge_number: 'BADGE001',
      project: 'Block E Construction'
    }
  },

  // Weekly delivery person
  weeklyDelivery: {
    name: 'Lucy Delivery',
    email: 'lucy.delivery@logistics.com',
    phone: '+254724000002',
    id_number: 'ID12346002',
    purpose: 'Package Delivery',
    host_id: null,
    visitor_type: 'delivery',
    recurring: true,
    recurring_pattern: 'weekly',
    recurring_days: [1, 3, 5], // Monday, Wednesday, Friday
    approved_at: new Date(Date.now() - 2592000000),
    metadata: {
      company: 'Swift Logistics',
      vehicle_plate: 'KCA 123X',
      route: 'Route 7'
    }
  },

  // Monthly maintenance staff
  monthlyMaintenance: {
    name: 'Michael Maintenance',
    email: 'michael.maintenance@services.com',
    phone: '+254724000003',
    id_number: 'ID12346003',
    purpose: 'HVAC Maintenance',
    host_id: null,
    visitor_type: 'service',
    recurring: true,
    recurring_pattern: 'monthly',
    recurring_day_of_month: 15,
    approved_at: new Date(Date.now() - 7776000000), // 90 days ago
    metadata: {
      company: 'CoolAir Services',
      certification: 'CERT-HVAC-2024',
      service_area: 'All Blocks'
    }
  }
};

/**
 * Bulk Visitor Scenarios
 * Multiple visitors for different scenarios
 */
export const bulkVisitorScenarios = {
  // Event with multiple visitors
  corporateEvent: () => {
    const attendees = [];
    const companies = ['TechCorp', 'InnovateCo', 'DataSystems', 'CloudServices'];
    
    for (let i = 0; i < 50; i++) {
      attendees.push({
        name: `Attendee ${i + 1}`,
        email: `attendee${i + 1}@company${i % 4}.com`,
        phone: `+2547250${String(i).padStart(5, '0')}`,
        id_number: `ID123470${String(i).padStart(2, '0')}`,
        purpose: 'Corporate Event - Tech Summit',
        host_id: null,
        invite_code: `EVENT-CORP-${String(i + 1).padStart(3, '0')}`,
        status: 'approved',
        visit_date: new Date(Date.now() + 86400000),
        duration_hours: 8,
        approved_at: new Date(),
        event_id: 'CORP-EVENT-001',
        metadata: {
          company: companies[i % 4],
          dietary_requirements: i % 5 === 0 ? 'Vegetarian' : 'None',
          parking_needed: i % 3 === 0
        }
      });
    }
    
    return attendees;
  },

  // Bulk deliveries
  deliveryFleet: () => {
    const deliveries = [];
    const carriers = ['DHL', 'FedEx', 'Local Courier', 'Swift Delivery'];
    
    for (let i = 0; i < 20; i++) {
      deliveries.push({
        name: `Driver ${i + 1}`,
        email: `driver${i + 1}@delivery.com`,
        phone: `+2547260${String(i).padStart(5, '0')}`,
        id_number: `ID123480${String(i).padStart(2, '0')}`,
        purpose: 'Package Delivery',
        host_id: null,
        visitor_type: 'delivery',
        invite_code: `DEL-${String(i + 1).padStart(4, '0')}`,
        status: 'approved',
        visit_date: new Date(),
        duration_hours: 1,
        metadata: {
          carrier: carriers[i % 4],
          vehicle_plate: `KCA ${String(100 + i).padStart(3, '0')}X`,
          tracking_number: `TRACK${String(Math.random() * 1000000).padStart(8, '0')}`,
          package_count: Math.floor(Math.random() * 10) + 1
        }
      });
    }
    
    return deliveries;
  },

  // Contractor team
  constructionCrew: () => {
    const crew = [];
    const roles = ['Foreman', 'Mason', 'Electrician', 'Plumber', 'Carpenter'];
    
    for (let i = 0; i < 15; i++) {
      crew.push({
        name: `Worker ${i + 1}`,
        email: `worker${i + 1}@buildco.com`,
        phone: `+2547270${String(i).padStart(5, '0')}`,
        id_number: `ID123490${String(i).padStart(2, '0')}`,
        purpose: 'Construction Work',
        host_id: null,
        visitor_type: 'contractor',
        recurring: true,
        recurring_pattern: 'daily',
        invite_code: `CREW-${String(i + 1).padStart(3, '0')}`,
        status: 'approved',
        visit_date: new Date(),
        duration_hours: 9,
        metadata: {
          company: 'BuildCo Ltd',
          role: roles[i % 5],
          badge_number: `BADGE${String(i + 1).padStart(3, '0')}`,
          site: 'Block E Construction'
        }
      });
    }
    
    return crew;
  }
};

/**
 * Visitor Edge Cases
 * Visitors with special conditions for edge case testing
 */
export const visitorEdgeCases = {
  // Visitor with no email
  noEmail: {
    name: 'No Email Visitor',
    email: null,
    phone: '+254728000001',
    id_number: 'ID12350001',
    purpose: 'Visit',
    host_id: null,
    status: 'invited',
    visit_date: new Date(Date.now() + 86400000),
    duration_hours: 2
  },

  // Visitor with no phone
  noPhone: {
    name: 'No Phone Visitor',
    email: 'nophone@visitor.com',
    phone: null,
    id_number: 'ID12350002',
    purpose: 'Meeting',
    host_id: null,
    status: 'invited',
    visit_date: new Date(Date.now() + 86400000),
    duration_hours: 2
  },

  // Visitor with very long purpose
  longPurpose: {
    name: 'Long Purpose Visitor',
    email: 'longpurpose@visitor.com',
    phone: '+254728000003',
    id_number: 'ID12350003',
    purpose: 'A'.repeat(500),
    host_id: null,
    status: 'invited',
    visit_date: new Date(Date.now() + 86400000),
    duration_hours: 2
  },

  // Visitor with special characters
  specialChars: {
    name: "O'Brien-Smith, Jr.",
    email: 'special.chars@visitor.com',
    phone: '+254728000004',
    id_number: "ID'12350004",
    purpose: 'Meeting & Discussion',
    host_id: null,
    status: 'invited',
    visit_date: new Date(Date.now() + 86400000),
    duration_hours: 2
  },

  // Multiple visitors same ID (testing uniqueness)
  duplicateId: {
    name: 'Duplicate ID Visitor',
    email: 'duplicate@visitor.com',
    phone: '+254728000005',
    id_number: 'ID12345001', // Same as first visitor
    purpose: 'Visit',
    host_id: null,
    status: 'invited',
    visit_date: new Date(Date.now() + 86400000),
    duration_hours: 2
  }
};

/**
 * Generate Bulk Visitors
 * @param {number} count - Number of visitors to generate
 * @param {Object} options - Additional options
 * @returns {Array} Array of visitor objects
 */
export function generateBulkVisitors(count, options = {}) {
  const visitors = [];
  const purposes = ['Meeting', 'Delivery', 'Visit', 'Business', 'Maintenance', 'Inspection'];
  const kenyanNames = {
    first: ['John', 'Mary', 'David', 'Grace', 'Peter', 'Sarah', 'James', 'Lucy', 'Michael', 'Faith'],
    last: ['Mwangi', 'Ochieng', 'Kamau', 'Wanjiru', 'Otieno', 'Njeri', 'Kipchoge', 'Akinyi', 'Mutua', 'Wambui']
  };

  for (let i = 0; i < count; i++) {
    const firstName = kenyanNames.first[i % kenyanNames.first.length];
    const lastName = kenyanNames.last[i % kenyanNames.last.length];
    
    visitors.push({
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@visitor.com`,
      phone: `+2547${String(29000000 + i).substring(0, 8)}`,
      id_number: `ID${String(20000000 + i)}`,
      purpose: purposes[i % purposes.length],
      host_id: options.host_id || null,
      invite_code: `INV-${String(i + 1).padStart(6, '0')}`,
      status: options.status || 'invited',
      visit_date: options.visit_date || new Date(Date.now() + 86400000),
      duration_hours: options.duration_hours || 2,
      ...options
    });
  }

  return visitors;
}

/**
 * Helper Functions
 */

/**
 * Get visitor by status
 * @param {string} status - Visitor status
 * @returns {Object} Visitor object
 */
export function getVisitorByStatus(status) {
  return visitorLifecycleStates[status] || null;
}

/**
 * Generate invite code
 * @param {string} prefix - Prefix for invite code
 * @param {number} index - Index for uniqueness
 * @returns {string} Invite code
 */
export function generateInviteCode(prefix = 'INV', index = 0) {
  return `${prefix}-${String(Date.now()).slice(-8)}-${String(index).padStart(3, '0')}`;
}

/**
 * Generate OTP
 * @returns {string} 6-digit OTP
 */
export function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Export all collections
export default {
  visitorLifecycleStates,
  recurringVisitors,
  bulkVisitorScenarios,
  visitorEdgeCases,
  generateBulkVisitors,
  getVisitorByStatus,
  generateInviteCode,
  generateOTP
};
