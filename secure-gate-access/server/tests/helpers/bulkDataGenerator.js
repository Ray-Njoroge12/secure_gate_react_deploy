/**
 * Bulk Data Generator
 * Generate large datasets for performance testing, load testing, and CSV exports
 */

import {
  generateRealisticUser,
  generateRealisticVisitor,
  generateKenyanName,
  generateKenyanPhone,
  generateNairobiAddress
} from './mockData.enhanced.js';

/**
 * Generate bulk users with realistic distribution
 * @param {number} count - Total number of users
 * @param {Object} options - Configuration options
 * @returns {Array} Array of user objects
 */
export function generateBulkUsers(count, options = {}) {
  const users = [];
  
  // Default role distribution
  const roleDistribution = options.roleDistribution || {
    resident: 0.85,  // 85% residents
    guard: 0.10,     // 10% guards
    admin: 0.05      // 5% admins
  };

  let residentCount = Math.floor(count * roleDistribution.resident);
  let guardCount = Math.floor(count * roleDistribution.guard);
  let adminCount = count - residentCount - guardCount;

  // Generate residents
  for (let i = 0; i < residentCount; i++) {
    users.push(generateRealisticUser('resident', {
      ...options,
      metadata: {
        batch: 'bulk_generation',
        index: i,
        ...options.metadata
      }
    }));
  }

  // Generate guards
  for (let i = 0; i < guardCount; i++) {
    users.push(generateRealisticUser('guard', {
      ...options,
      metadata: {
        batch: 'bulk_generation',
        index: residentCount + i,
        shift: ['morning', 'afternoon', 'night'][i % 3],
        ...options.metadata
      }
    }));
  }

  // Generate admins
  for (let i = 0; i < adminCount; i++) {
    users.push(generateRealisticUser('admin', {
      ...options,
      metadata: {
        batch: 'bulk_generation',
        index: residentCount + guardCount + i,
        department: ['General', 'Security', 'Maintenance', 'Finance'][i % 4],
        ...options.metadata
      }
    }));
  }

  return users;
}

/**
 * Generate bulk visitors
 * @param {number} count - Number of visitors
 * @param {Object} options - Configuration options
 * @returns {Array} Array of visitor objects
 */
export function generateBulkVisitors(count, options = {}) {
  const visitors = [];
  
  // Visitor type distribution
  const typeDistribution = options.typeDistribution || {
    personal: 0.40,    // 40% personal visits
    business: 0.25,    // 25% business
    service: 0.20,     // 20% service/maintenance
    delivery: 0.15     // 15% deliveries
  };

  const types = [
    { type: 'personal', count: Math.floor(count * typeDistribution.personal) },
    { type: 'business', count: Math.floor(count * typeDistribution.business) },
    { type: 'service', count: Math.floor(count * typeDistribution.service) },
    { type: 'delivery', count: Math.floor(count * typeDistribution.delivery) }
  ];

  // Adjust last type to match exact count
  const totalAllocated = types.reduce((sum, t) => sum + t.count, 0);
  types[types.length - 1].count += (count - totalAllocated);

  types.forEach(({ type, count: typeCount }) => {
    for (let i = 0; i < typeCount; i++) {
      visitors.push(generateRealisticVisitor({
        ...options,
        visitor_type: type,
        metadata: {
          batch: 'bulk_generation',
          type,
          ...options.metadata
        }
      }));
    }
  });

  return visitors;
}

/**
 * Generate performance test dataset
 * @param {Object} config - Configuration for the dataset
 * @returns {Object} Complete dataset with users, visitors, passes
 */
export function generatePerformanceTestDataset(config = {}) {
  const {
    userCount = 1000,
    visitorsPerUser = 2,
    includePassesAndLogs = true
  } = config;

  const dataset = {
    users: generateBulkUsers(userCount, { verified: true }),
    visitors: [],
    passes: [],
    accessLogs: [],
    metadata: {
      generated_at: new Date(),
      config,
      stats: {}
    }
  };

  // Generate visitors for residents
  const residents = dataset.users.filter(u => u.role === 'resident');
  
  residents.forEach((resident, index) => {
    const visitorCount = Math.floor(Math.random() * visitorsPerUser) + 1;
    
    for (let v = 0; v < visitorCount; v++) {
      const visitor = generateRealisticVisitor({
        host_id: resident.email, // Will be mapped to actual ID in tests
        status: ['invited', 'approved', 'checked-in'][Math.floor(Math.random() * 3)]
      });
      
      dataset.visitors.push(visitor);

      // Generate pass if requested
      if (includePassesAndLogs) {
        dataset.passes.push({
          visitor_email: visitor.email,
          pass_code: `PASS-PERF-${String(dataset.passes.length + 1).padStart(6, '0')}`,
          qr_code: `QR-PERF-${String(dataset.passes.length + 1).padStart(6, '0')}`,
          status: 'active',
          valid_from: new Date(Date.now() - 3600000),
          valid_until: new Date(Date.now() + 86400000),
          uses_remaining: 1,
          max_uses: 1
        });
      }
    }
  });

  // Calculate stats
  dataset.metadata.stats = {
    total_users: dataset.users.length,
    residents: residents.length,
    guards: dataset.users.filter(u => u.role === 'guard').length,
    admins: dataset.users.filter(u => u.role === 'admin').length,
    total_visitors: dataset.visitors.length,
    total_passes: dataset.passes.length,
    avg_visitors_per_resident: (dataset.visitors.length / residents.length).toFixed(2)
  };

  return dataset;
}

/**
 * Generate CSV data for bulk import testing
 * @param {string} type - 'users' or 'visitors'
 * @param {number} count - Number of records
 * @returns {string} CSV formatted string
 */
export function generateCSVData(type, count) {
  let csv = '';
  
  if (type === 'users') {
    // CSV Header
    csv = 'email,username,phone,role,area,house,notify_email,notify_sms,verified\n';
    
    // Generate rows
    for (let i = 0; i < count; i++) {
      const user = generateRealisticUser('resident', {});
      csv += `${user.email},${user.username},${user.phone},${user.role},`;
      csv += `"${user.area}",${user.house},${user.notify_email},${user.notify_sms},${user.verified}\n`;
    }
  } else if (type === 'visitors') {
    // CSV Header
    csv = 'name,email,phone,id_number,purpose,visit_date,duration_hours,status\n';
    
    // Generate rows
    for (let i = 0; i < count; i++) {
      const visitor = generateRealisticVisitor({});
      csv += `"${visitor.name}",${visitor.email},${visitor.phone},${visitor.id_number},`;
      csv += `"${visitor.purpose}",${visitor.visit_date.toISOString()},${visitor.duration_hours},${visitor.status}\n`;
    }
  }
  
  return csv;
}

/**
 * Generate load test scenarios
 * @param {string} scenario - Scenario type
 * @param {Object} options - Scenario options
 * @returns {Object} Load test data and configuration
 */
export function generateLoadTestScenario(scenario, options = {}) {
  const scenarios = {
    // Normal day operation
    normal_day: {
      description: 'Typical weekday with standard traffic',
      duration: '8 hours',
      data: {
        morning_visitors: generateBulkVisitors(50, { visit_date: new Date() }),
        afternoon_visitors: generateBulkVisitors(30, { visit_date: new Date() }),
        evening_visitors: generateBulkVisitors(20, { visit_date: new Date() }),
        deliveries: generateBulkVisitors(25, { visitor_type: 'delivery' })
      },
      expectedLoad: {
        concurrent_users: 20,
        requests_per_minute: 100,
        peak_requests_per_minute: 200
      }
    },

    // Peak hour rush
    peak_hour: {
      description: 'Morning/Evening rush hour with high traffic',
      duration: '2 hours',
      data: {
        residents_leaving: generateBulkUsers(200, { role: 'resident' }),
        visitors_arriving: generateBulkVisitors(100),
        service_personnel: generateBulkVisitors(30, { visitor_type: 'service' }),
        deliveries: generateBulkVisitors(40, { visitor_type: 'delivery' })
      },
      expectedLoad: {
        concurrent_users: 50,
        requests_per_minute: 300,
        peak_requests_per_minute: 500
      }
    },

    // Special event
    special_event: {
      description: 'Large event with many visitors',
      duration: '4 hours',
      data: {
        event_attendees: generateBulkVisitors(500, {
          purpose: 'Corporate Event',
          metadata: { event_id: 'EVENT-LOAD-001' }
        }),
        vip_guests: generateBulkVisitors(50, {
          purpose: 'VIP Event Access',
          metadata: { vip: true, event_id: 'EVENT-LOAD-001' }
        })
      },
      expectedLoad: {
        concurrent_users: 100,
        requests_per_minute: 500,
        peak_requests_per_minute: 1000
      }
    },

    // System stress test
    stress_test: {
      description: 'Maximum load to test system limits',
      duration: '1 hour',
      data: {
        users: generateBulkUsers(5000),
        visitors: generateBulkVisitors(10000),
        concurrent_operations: 1000
      },
      expectedLoad: {
        concurrent_users: 500,
        requests_per_minute: 2000,
        peak_requests_per_minute: 5000
      }
    }
  };

  const selectedScenario = scenarios[scenario] || scenarios.normal_day;
  
  return {
    scenario,
    ...selectedScenario,
    generated_at: new Date(),
    options
  };
}

/**
 * Generate time-series data for analytics testing
 * @param {number} days - Number of days of data
 * @param {Object} options - Configuration options
 * @returns {Array} Time-series data points
 */
export function generateTimeSeriesData(days = 30, options = {}) {
  const data = [];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  for (let day = 0; day < days; day++) {
    const date = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    // Different patterns for weekdays vs weekends
    const baseVisitors = isWeekend ? 30 : 80;
    const variance = Math.floor(Math.random() * 20) - 10;
    
    data.push({
      date: date.toISOString().split('T')[0],
      day_of_week: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
      total_visitors: baseVisitors + variance,
      checked_in: Math.floor((baseVisitors + variance) * 0.9),
      checked_out: Math.floor((baseVisitors + variance) * 0.85),
      deliveries: Math.floor(Math.random() * 20) + 10,
      service_visits: Math.floor(Math.random() * 15) + 5,
      incidents: Math.floor(Math.random() * 3), // 0-2 incidents per day
      avg_wait_time_minutes: Math.floor(Math.random() * 10) + 5,
      peak_hour: isWeekend ? '2:00 PM' : '8:00 AM'
    });
  }

  return data;
}

/**
 * Export dataset to JSON file format
 * @param {Object} dataset - Dataset to export
 * @param {string} filename - Filename (without extension)
 * @returns {string} JSON string ready for file write
 */
export function exportDatasetToJSON(dataset, filename = 'bulk-data') {
  return JSON.stringify({
    filename,
    generated_at: new Date().toISOString(),
    version: '1.0.0',
    dataset
  }, null, 2);
}

// Export all functions
export default {
  generateBulkUsers,
  generateBulkVisitors,
  generatePerformanceTestDataset,
  generateCSVData,
  generateLoadTestScenario,
  generateTimeSeriesData,
  exportDatasetToJSON
};
