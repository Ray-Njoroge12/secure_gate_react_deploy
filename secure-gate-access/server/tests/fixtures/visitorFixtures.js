/**
 * Visitor fixtures for unit testing
 * Provides reusable visitor test data
 */

export const createEnhancedVisitorFixture = (overrides = {}) => ({
  id: 'visitor_test_123',
  name: 'John Visitor',
  phone: '+254712345678',
  email: 'visitor@example.com',
  inviteCode: 'INVITE-test-visitor-123',
  hostId: 'user_resident_123',
  hostName: 'Jane Resident',
  status: 'pending',
  purpose: 'Business meeting',
  dateOfVisit: new Date('2025-12-01'),
  time: '14:00',
  checkInTime: null,
  checkOutTime: null,
  guardApproval: false,
  guardId: null,
  guardName: null,
  createdAt: new Date('2025-11-21'),
  updatedAt: new Date('2025-11-21'),
  ...overrides
});

export const createPendingVisitor = (overrides = {}) => ({
  ...createEnhancedVisitorFixture(),
  status: 'pending',
  guardApproval: false,
  checkInTime: null,
  checkOutTime: null,
  ...overrides
});

export const createApprovedVisitor = (overrides = {}) => ({
  ...createEnhancedVisitorFixture(),
  status: 'approved',
  guardApproval: true,
  guardId: 'user_guard_123',
  guardName: 'Mike Guard',
  ...overrides
});

export const createCheckedInVisitor = (overrides = {}) => ({
  ...createEnhancedVisitorFixture(),
  status: 'checked_in',
  guardApproval: true,
  guardId: 'user_guard_123',
  guardName: 'Mike Guard',
  checkInTime: new Date('2025-11-21T14:05:00'),
  checkOutTime: null,
  ...overrides
});

export const createCheckedOutVisitor = (overrides = {}) => ({
  ...createEnhancedVisitorFixture(),
  status: 'checked_out',
  guardApproval: true,
  guardId: 'user_guard_123',
  guardName: 'Mike Guard',
  checkInTime: new Date('2025-11-21T14:05:00'),
  checkOutTime: new Date('2025-11-21T16:30:00'),
  ...overrides
});

export const createRejectedVisitor = (overrides = {}) => ({
  ...createEnhancedVisitorFixture(),
  status: 'rejected',
  guardApproval: false,
  guardId: 'user_guard_123',
  guardName: 'Mike Guard',
  ...overrides
});

export default {
  createEnhancedVisitorFixture,
  createPendingVisitor,
  createApprovedVisitor,
  createCheckedInVisitor,
  createCheckedOutVisitor,
  createRejectedVisitor
};
