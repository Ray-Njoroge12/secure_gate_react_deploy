/**
 * Relationship Test Fixtures
 * User relationships, associations, and hierarchies for comprehensive testing
 */

/**
 * Resident-Visitor Relationships
 * Defines which visitors belong to which residents
 */
export const residentVisitorRelationships = {
  // Single resident with one visitor
  oneToOne: {
    resident: {
      email: 'resident.single@test.com',
      username: 'residentsingle',
      role: 'resident',
      area: 'Block A',
      house: 'A101'
    },
    visitor: {
      name: 'Single Visitor',
      email: 'single.visitor@test.com',
      phone: '+254730000001',
      purpose: 'Visit'
    }
  },

  // Resident with multiple visitors
  oneToMany: {
    resident: {
      email: 'resident.multi@test.com',
      username: 'residentmulti',
      role: 'resident',
      area: 'Block A',
      house: 'A102'
    },
    visitors: [
      {
        name: 'Visitor One',
        email: 'visitor.one@test.com',
        phone: '+254730000002',
        purpose: 'Business Meeting'
      },
      {
        name: 'Visitor Two',
        email: 'visitor.two@test.com',
        phone: '+254730000003',
        purpose: 'Personal Visit'
      },
      {
        name: 'Visitor Three',
        email: 'visitor.three@test.com',
        phone: '+254730000004',
        purpose: 'Delivery'
      }
    ]
  },

  // Multiple residents hosting same visitor (shared contractor)
  manyToOne: {
    residents: [
      {
        email: 'resident.a@test.com',
        username: 'residenta',
        role: 'resident',
        area: 'Block B',
        house: 'B101'
      },
      {
        email: 'resident.b@test.com',
        username: 'residentb',
        role: 'resident',
        area: 'Block B',
        house: 'B102'
      },
      {
        email: 'resident.c@test.com',
        username: 'residentc',
        role: 'resident',
        area: 'Block B',
        house: 'B103'
      }
    ],
    visitor: {
      name: 'Shared Contractor',
      email: 'contractor.shared@company.com',
      phone: '+254730000005',
      purpose: 'HVAC Maintenance',
      visitor_type: 'contractor'
    }
  },

  // Family network (residents with family visitors)
  familyNetwork: {
    primaryResident: {
      email: 'family.primary@test.com',
      username: 'familyprimary',
      role: 'resident',
      area: 'Block C',
      house: 'C201'
    },
    familyMembers: [
      {
        name: 'Family Member - Spouse',
        email: 'family.spouse@test.com',
        phone: '+254730000006',
        purpose: 'Family Visit',
        relationship: 'spouse'
      },
      {
        name: 'Family Member - Parent',
        email: 'family.parent@test.com',
        phone: '+254730000007',
        purpose: 'Family Visit',
        relationship: 'parent'
      },
      {
        name: 'Family Member - Sibling',
        email: 'family.sibling@test.com',
        phone: '+254730000008',
        purpose: 'Family Visit',
        relationship: 'sibling'
      }
    ]
  }
};

/**
 * Admin-Resident Relationships
 * Administrative oversight and management relationships
 */
export const adminResidentRelationships = {
  // Block admin managing residents
  blockAdministration: {
    admin: {
      email: 'admin.blocka@test.com',
      username: 'adminblocka',
      role: 'admin',
      area: 'Block A',
      house: 'Admin Office A',
      metadata: {
        responsibility: 'Block A Management'
      }
    },
    residents: [
      { area: 'Block A', house: 'A101', email: 'resident.a101@test.com' },
      { area: 'Block A', house: 'A102', email: 'resident.a102@test.com' },
      { area: 'Block A', house: 'A103', email: 'resident.a103@test.com' },
      { area: 'Block A', house: 'A104', email: 'resident.a104@test.com' },
      { area: 'Block A', house: 'A105', email: 'resident.a105@test.com' }
    ]
  },

  // Department hierarchy
  departmentHierarchy: {
    superAdmin: {
      email: 'superadmin@test.com',
      username: 'superadmin',
      role: 'admin',
      area: 'Main Office',
      house: 'Executive Suite',
      metadata: {
        level: 'super_admin',
        permissions: ['all']
      }
    },
    departmentAdmins: [
      {
        email: 'admin.security@test.com',
        username: 'adminsecurity',
        role: 'admin',
        area: 'Security Office',
        house: 'Security HQ',
        metadata: {
          department: 'security',
          reports_to: 'superadmin@test.com'
        }
      },
      {
        email: 'admin.maintenance@test.com',
        username: 'adminmaintenance',
        role: 'admin',
        area: 'Maintenance Office',
        house: 'Maintenance HQ',
        metadata: {
          department: 'maintenance',
          reports_to: 'superadmin@test.com'
        }
      },
      {
        email: 'admin.finance@test.com',
        username: 'adminfinance',
        role: 'admin',
        area: 'Finance Office',
        house: 'Finance HQ',
        metadata: {
          department: 'finance',
          reports_to: 'superadmin@test.com'
        }
      }
    ]
  }
};

/**
 * Guard-Gate Assignments
 * Security personnel assigned to specific gates and shifts
 */
export const guardGateAssignments = {
  // Main gate shifts
  mainGateShifts: {
    gate: 'Main Gate',
    guards: [
      {
        email: 'guard.main.morning@test.com',
        username: 'guardmainmorning',
        role: 'guard',
        area: 'Main Gate',
        house: 'Gate 1',
        metadata: {
          shift: 'morning',
          shift_hours: '6:00 AM - 2:00 PM',
          gate_code: 'GATE-001'
        }
      },
      {
        email: 'guard.main.afternoon@test.com',
        username: 'guardmainafternoon',
        role: 'guard',
        area: 'Main Gate',
        house: 'Gate 1',
        metadata: {
          shift: 'afternoon',
          shift_hours: '2:00 PM - 10:00 PM',
          gate_code: 'GATE-001'
        }
      },
      {
        email: 'guard.main.night@test.com',
        username: 'guardmainnight',
        role: 'guard',
        area: 'Main Gate',
        house: 'Gate 1',
        metadata: {
          shift: 'night',
          shift_hours: '10:00 PM - 6:00 AM',
          gate_code: 'GATE-001'
        }
      }
    ]
  },

  // Multiple gates coverage
  allGatesCoverage: {
    gates: [
      {
        name: 'Main Gate',
        code: 'GATE-001',
        guards: ['guard.main1@test.com', 'guard.main2@test.com']
      },
      {
        name: 'Back Gate',
        code: 'GATE-002',
        guards: ['guard.back1@test.com', 'guard.back2@test.com']
      },
      {
        name: 'Side Gate',
        code: 'GATE-003',
        guards: ['guard.side1@test.com', 'guard.side2@test.com']
      },
      {
        name: 'Emergency Exit',
        code: 'GATE-004',
        guards: ['guard.emergency@test.com']
      }
    ]
  }
};

/**
 * Incident-User Relationships
 * Incidents and the users involved
 */
export const incidentUserRelationships = {
  // Security incident
  securityIncident: {
    incident: {
      id: 'INC-SEC-001',
      type: 'security',
      severity: 'high',
      title: 'Unauthorized Access Attempt',
      description: 'Visitor attempted entry with revoked pass',
      timestamp: new Date(Date.now() - 3600000)
    },
    reporter: {
      email: 'guard.main@test.com',
      role: 'guard',
      area: 'Main Gate'
    },
    involved_parties: [
      {
        email: 'visitor.unauthorized@test.com',
        role: 'visitor',
        involvement: 'perpetrator'
      }
    ],
    reviewers: [
      {
        email: 'admin.security@test.com',
        role: 'admin',
        reviewed_at: new Date(Date.now() - 1800000)
      }
    ]
  },

  // Visitor complaint
  visitorComplaint: {
    incident: {
      id: 'INC-COMP-001',
      type: 'complaint',
      severity: 'medium',
      title: 'Long Wait Time at Gate',
      description: 'Visitor reported 30-minute wait for entry',
      timestamp: new Date(Date.now() - 7200000)
    },
    reporter: {
      email: 'visitor.complaining@test.com',
      role: 'visitor'
    },
    host: {
      email: 'resident.host@test.com',
      role: 'resident',
      area: 'Block A',
      house: 'A101'
    },
    reviewers: [
      {
        email: 'admin.general@test.com',
        role: 'admin',
        reviewed_at: new Date(Date.now() - 3600000),
        resolution: 'Improved gate procedures'
      }
    ]
  }
};

/**
 * Helper Functions
 */

/**
 * Generate complete household
 * @param {string} block - Block letter
 * @param {number} houseNumber - House number
 * @param {number} familySize - Number of family members
 * @returns {Object} Household with primary resident and family
 */
export function generateHousehold(block, houseNumber, familySize = 1) {
  const area = `Block ${block}`;
  const house = `${block}${houseNumber}`;
  
  const household = {
    primary: {
      email: `resident.${block.toLowerCase()}${houseNumber}@test.com`,
      username: `resident${block.toLowerCase()}${houseNumber}`,
      role: 'resident',
      area,
      house,
      notify_email: true,
      notify_sms: true,
      verified: true,
      metadata: {
        household_role: 'primary',
        family_size: familySize
      }
    },
    members: []
  };

  for (let i = 1; i < familySize; i++) {
    household.members.push({
      email: `resident.${block.toLowerCase()}${houseNumber}.member${i}@test.com`,
      username: `resident${block.toLowerCase()}${houseNumber}m${i}`,
      role: 'resident',
      area,
      house,
      notify_email: true,
      notify_sms: false,
      verified: true,
      metadata: {
        household_role: 'member',
        primary_contact: household.primary.email
      }
    });
  }

  return household;
}

/**
 * Generate security team structure
 * @param {number} gateCount - Number of gates
 * @param {number} shiftsPerGate - Number of shifts per gate
 * @returns {Array} Security team structure
 */
export function generateSecurityTeam(gateCount = 3, shiftsPerGate = 3) {
  const team = [];
  const shifts = ['morning', 'afternoon', 'night'];
  const shiftHours = ['6:00 AM - 2:00 PM', '2:00 PM - 10:00 PM', '10:00 PM - 6:00 AM'];

  for (let g = 0; g < gateCount; g++) {
    const gate = {
      name: `Gate ${g + 1}`,
      code: `GATE-${String(g + 1).padStart(3, '0')}`,
      guards: []
    };

    for (let s = 0; s < shiftsPerGate; s++) {
      gate.guards.push({
        email: `guard.gate${g + 1}.${shifts[s]}@test.com`,
        username: `guard_g${g + 1}_${shifts[s]}`,
        role: 'guard',
        area: gate.name,
        house: gate.name,
        metadata: {
          shift: shifts[s],
          shift_hours: shiftHours[s],
          gate_code: gate.code
        }
      });
    }

    team.push(gate);
  }

  return team;
}

/**
 * Generate resident-visitor network
 * @param {number} residentCount - Number of residents
 * @param {number} visitorsPerResident - Average visitors per resident
 * @returns {Object} Network of resident-visitor relationships
 */
export function generateResidentVisitorNetwork(residentCount = 10, visitorsPerResident = 2) {
  const network = [];

  for (let r = 0; r < residentCount; r++) {
    const block = String.fromCharCode(65 + (r % 5)); // A-E
    const houseNum = 100 + r;
    
    const relationship = {
      resident: {
        email: `resident.${block.toLowerCase()}${houseNum}@test.com`,
        username: `resident${block.toLowerCase()}${houseNum}`,
        role: 'resident',
        area: `Block ${block}`,
        house: `${block}${houseNum}`
      },
      visitors: []
    };

    for (let v = 0; v < visitorsPerResident; v++) {
      relationship.visitors.push({
        name: `Visitor ${r}-${v}`,
        email: `visitor.r${r}.v${v}@test.com`,
        phone: `+2547${String(31000000 + r * 100 + v).substring(0, 8)}`,
        purpose: ['Meeting', 'Visit', 'Delivery', 'Maintenance'][v % 4]
      });
    }

    network.push(relationship);
  }

  return network;
}

// Export all collections
export default {
  residentVisitorRelationships,
  adminResidentRelationships,
  guardGateAssignments,
  incidentUserRelationships,
  generateHousehold,
  generateSecurityTeam,
  generateResidentVisitorNetwork
};
