/**
 * Visitor Test Fixtures
 * Predefined visitor data for consistent testing
 */

/**
 * Pending visitor fixtures
 */
export const pendingVisitors = {
  visitor1: {
    name: 'John Visitor',
    email: 'john.visitor@test.com',
    phone: '+254712100001',
    id_number: '12345678',
    vehicle_plate: 'KAA 123X',
    purpose: 'Business meeting',
    status: 'PENDING',
    date_of_visit: new Date().toISOString().split('T')[0],
    time_of_visit: '14:00:00'
  },
  
  visitor2: {
    name: 'Jane Guest',
    email: 'jane.guest@test.com',
    phone: '+254712100002',
    id_number: '87654321',
    vehicle_plate: 'KBB 456Y',
    purpose: 'Personal visit',
    status: 'PENDING',
    date_of_visit: new Date().toISOString().split('T')[0],
    time_of_visit: '15:00:00'
  }
};

/**
 * Approved visitor fixtures
 */
export const approvedVisitors = {
  approvedVisitor1: {
    name: 'Mike Johnson',
    email: 'mike.johnson@test.com',
    phone: '+254712100010',
    id_number: '11112222',
    vehicle_plate: 'KCC 789Z',
    purpose: 'Delivery',
    status: 'APPROVED',
    date_of_visit: new Date().toISOString().split('T')[0],
    time_of_visit: '10:00:00',
    invite_code: `INV${Date.now()}01`
  },
  
  approvedVisitor2: {
    name: 'Sarah Williams',
    email: 'sarah.williams@test.com',
    phone: '+254712100011',
    id_number: '33334444',
    vehicle_plate: 'KDD 321A',
    purpose: 'Maintenance',
    status: 'APPROVED',
    date_of_visit: new Date().toISOString().split('T')[0],
    time_of_visit: '11:00:00',
    invite_code: `INV${Date.now()}02`
  }
};

/**
 * Checked-in visitor fixtures
 */
export const checkedInVisitors = {
  checkedIn1: {
    name: 'David Brown',
    email: 'david.brown@test.com',
    phone: '+254712100020',
    id_number: '55556666',
    vehicle_plate: 'KEE 654B',
    purpose: 'Interview',
    status: 'CHECKED_IN',
    date_of_visit: new Date().toISOString().split('T')[0],
    time_of_visit: '09:00:00',
    check_in: new Date(),
    invite_code: `INV${Date.now()}03`
  },
  
  checkedIn2: {
    name: 'Emma Davis',
    email: 'emma.davis@test.com',
    phone: '+254712100021',
    id_number: '77778888',
    vehicle_plate: 'KFF 987C',
    purpose: 'Business meeting',
    status: 'CHECKED_IN',
    date_of_visit: new Date().toISOString().split('T')[0],
    time_of_visit: '10:30:00',
    check_in: new Date(),
    invite_code: `INV${Date.now()}04`
  }
};

/**
 * Checked-out visitor fixtures
 */
export const checkedOutVisitors = {
  checkedOut1: {
    name: 'Robert Miller',
    email: 'robert.miller@test.com',
    phone: '+254712100030',
    id_number: '99990000',
    vehicle_plate: 'KGG 135D',
    purpose: 'Personal visit',
    status: 'COMPLETED',
    date_of_visit: new Date().toISOString().split('T')[0],
    time_of_visit: '08:00:00',
    check_in: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    check_out: new Date(),
    invite_code: `INV${Date.now()}05`
  }
};

/**
 * Rejected visitor fixtures
 */
export const rejectedVisitors = {
  rejected1: {
    name: 'Tom Anderson',
    email: 'tom.anderson@test.com',
    phone: '+254712100040',
    id_number: '12129999',
    vehicle_plate: 'KHH 246E',
    purpose: 'Unknown',
    status: 'REJECTED',
    date_of_visit: new Date().toISOString().split('T')[0],
    time_of_visit: '16:00:00'
  }
};

/**
 * All visitor fixtures combined
 */
export const allVisitors = {
  ...pendingVisitors,
  ...approvedVisitors,
  ...checkedInVisitors,
  ...checkedOutVisitors,
  ...rejectedVisitors
};

/**
 * Get all visitors as array
 */
export const getAllVisitorsArray = () => {
  return Object.values(allVisitors);
};

/**
 * Get visitors by status
 */
export const getVisitorsByStatus = (status) => {
  return getAllVisitorsArray().filter(visitor => visitor.status === status);
};

/**
 * Get active visitors (checked-in)
 */
export const getActiveVisitors = () => {
  return getVisitorsByStatus('checked-in');
};

// Export default
export default {
  pendingVisitors,
  approvedVisitors,
  checkedInVisitors,
  checkedOutVisitors,
  rejectedVisitors,
  allVisitors,
  getAllVisitorsArray,
  getVisitorsByStatus,
  getActiveVisitors
};
