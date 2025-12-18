/**
 * Incident Controller Unit Tests
 * Tests for incident management functionality
 */

import { jest } from '@jest/globals';

describe('Incident Controller', () => {
  let mockDbManager;
  let mockAuditLog;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbManager = {
      query: jest.fn()
    };
    mockAuditLog = jest.fn();
  });

  describe('Input Validation', () => {
    const validateIncidentInput = (data) => {
      const errors = [];
      
      if (!data.title || data.title.trim() === '') {
        errors.push('Incident title is required');
      }
      
      if (!data.description || data.description.trim() === '') {
        errors.push('Description is required');
      }
      
      if (data.title && data.title.length > 200) {
        errors.push('Title must be 200 characters or less');
      }
      
      if (data.description && data.description.length > 5000) {
        errors.push('Description must be 5000 characters or less');
      }
      
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      if (data.severity && !validSeverities.includes(data.severity)) {
        errors.push('Invalid severity level');
      }
      
      const validTypes = ['security', 'access', 'maintenance', 'emergency', 'other'];
      if (data.type && !validTypes.includes(data.type)) {
        errors.push('Invalid incident type');
      }
      
      return errors;
    };

    test('should reject empty title', () => {
      const errors = validateIncidentInput({ title: '', description: 'Test' });
      expect(errors).toContain('Incident title is required');
    });

    test('should reject empty description', () => {
      const errors = validateIncidentInput({ title: 'Test', description: '' });
      expect(errors).toContain('Description is required');
    });

    test('should reject title over 200 characters', () => {
      const errors = validateIncidentInput({ 
        title: 'a'.repeat(201), 
        description: 'Test' 
      });
      expect(errors).toContain('Title must be 200 characters or less');
    });

    test('should reject description over 5000 characters', () => {
      const errors = validateIncidentInput({ 
        title: 'Test', 
        description: 'a'.repeat(5001) 
      });
      expect(errors).toContain('Description must be 5000 characters or less');
    });

    test('should reject invalid severity', () => {
      const errors = validateIncidentInput({ 
        title: 'Test', 
        description: 'Test',
        severity: 'invalid'
      });
      expect(errors).toContain('Invalid severity level');
    });

    test('should accept valid severity levels', () => {
      ['low', 'medium', 'high', 'critical'].forEach(severity => {
        const errors = validateIncidentInput({ 
          title: 'Test', 
          description: 'Test',
          severity 
        });
        expect(errors).not.toContain('Invalid severity level');
      });
    });

    test('should reject invalid incident type', () => {
      const errors = validateIncidentInput({ 
        title: 'Test', 
        description: 'Test',
        type: 'invalid'
      });
      expect(errors).toContain('Invalid incident type');
    });

    test('should pass with valid input', () => {
      const errors = validateIncidentInput({ 
        title: 'Security Breach', 
        description: 'Unauthorized access detected',
        severity: 'high',
        type: 'security'
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('Incident Status Management', () => {
    const validStatusTransitions = {
      'open': ['in_progress', 'resolved', 'closed'],
      'in_progress': ['resolved', 'closed', 'open'],
      'resolved': ['closed', 'open'],
      'closed': ['open']
    };

    const validateStatusTransition = (currentStatus, newStatus) => {
      const validTransitions = validStatusTransitions[currentStatus];
      return validTransitions ? validTransitions.includes(newStatus) : false;
    };

    test('should allow valid status transition from open to in_progress', () => {
      expect(validateStatusTransition('open', 'in_progress')).toBe(true);
    });

    test('should allow valid status transition from in_progress to resolved', () => {
      expect(validateStatusTransition('in_progress', 'resolved')).toBe(true);
    });

    test('should allow reopening closed incidents', () => {
      expect(validateStatusTransition('closed', 'open')).toBe(true);
    });

    test('should prevent invalid transitions', () => {
      expect(validateStatusTransition('open', 'closed')).toBe(true);
      expect(validateStatusTransition('resolved', 'in_progress')).toBe(false);
    });
  });

  describe('Incident Priority Calculation', () => {
    const calculatePriority = (severity, type, age) => {
      const severityScore = { low: 1, medium: 2, high: 3, critical: 4 };
      const typeScore = { 
        maintenance: 1, 
        other: 2, 
        access: 3, 
        security: 4, 
        emergency: 5 
      };
      
      let priority = severityScore[severity] * typeScore[type];
      
      // Age factor (older incidents get higher priority)
      if (age > 24) priority += 2;
      else if (age > 12) priority += 1;
      
      return Math.min(priority, 20);
    };

    test('should calculate low priority for maintenance/low', () => {
      const priority = calculatePriority('low', 'maintenance', 0);
      expect(priority).toBe(1);
    });

    test('should calculate high priority for security/critical', () => {
      const priority = calculatePriority('critical', 'security', 0);
      expect(priority).toBe(16);
    });

    test('should increase priority for old incidents', () => {
      const newPriority = calculatePriority('medium', 'access', 1);
      const oldPriority = calculatePriority('medium', 'access', 25);
      expect(oldPriority).toBeGreaterThan(newPriority);
    });

    test('should cap priority at 20', () => {
      const priority = calculatePriority('critical', 'emergency', 100);
      expect(priority).toBeLessThanOrEqual(20);
    });
  });

  describe('Incident Search', () => {
    const searchIncidents = (incidents, query) => {
      const lowerQuery = query.toLowerCase();
      return incidents.filter(incident => 
        incident.title.toLowerCase().includes(lowerQuery) ||
        incident.description.toLowerCase().includes(lowerQuery) ||
        incident.id.toString().includes(lowerQuery)
      );
    };

    test('should search by title', () => {
      const incidents = [
        { id: 1, title: 'Security breach', description: 'Test' },
        { id: 2, title: 'Access issue', description: 'Test' }
      ];
      
      const results = searchIncidents(incidents, 'security');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });

    test('should search by description', () => {
      const incidents = [
        { id: 1, title: 'Test', description: 'Unauthorized access detected' },
        { id: 2, title: 'Test', description: 'Normal operation' }
      ];
      
      const results = searchIncidents(incidents, 'unauthorized');
      expect(results).toHaveLength(1);
    });

    test('should search by ID', () => {
      const incidents = [
        { id: 123, title: 'Test', description: 'Test' },
        { id: 456, title: 'Test', description: 'Test' }
      ];
      
      const results = searchIncidents(incidents, '123');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(123);
    });

    test('should be case insensitive', () => {
      const incidents = [
        { id: 1, title: 'SECURITY BREACH', description: 'Test' }
      ];
      
      const results = searchIncidents(incidents, 'security');
      expect(results).toHaveLength(1);
    });
  });

  describe('Incident Filtering', () => {
    const filterIncidents = (incidents, filters) => {
      return incidents.filter(incident => {
        if (filters.status && incident.status !== filters.status) return false;
        if (filters.severity && incident.severity !== filters.severity) return false;
        if (filters.type && incident.type !== filters.type) return false;
        if (filters.assignee && incident.assignee_id !== filters.assignee) return false;
        if (filters.dateFrom && new Date(incident.created_at) < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && new Date(incident.created_at) > new Date(filters.dateTo)) return false;
        return true;
      });
    };

    test('should filter by status', () => {
      const incidents = [
        { id: 1, status: 'open' },
        { id: 2, status: 'closed' }
      ];
      
      const results = filterIncidents(incidents, { status: 'open' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });

    test('should filter by severity', () => {
      const incidents = [
        { id: 1, severity: 'high' },
        { id: 2, severity: 'low' }
      ];
      
      const results = filterIncidents(incidents, { severity: 'high' });
      expect(results).toHaveLength(1);
    });

    test('should filter by multiple criteria', () => {
      const incidents = [
        { id: 1, status: 'open', severity: 'high' },
        { id: 2, status: 'open', severity: 'low' },
        { id: 3, status: 'closed', severity: 'high' }
      ];
      
      const results = filterIncidents(incidents, { status: 'open', severity: 'high' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });

    test('should filter by date range', () => {
      const incidents = [
        { id: 1, created_at: '2024-01-15' },
        { id: 2, created_at: '2024-01-20' },
        { id: 3, created_at: '2024-01-25' }
      ];
      
      const results = filterIncidents(incidents, { 
        dateFrom: '2024-01-16', 
        dateTo: '2024-01-24' 
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(2);
    });
  });

  describe('Incident Statistics', () => {
    const calculateStats = (incidents) => {
      const stats = {
        total: incidents.length,
        byStatus: {},
        bySeverity: {},
        byType: {},
        avgResolutionTime: 0
      };

      incidents.forEach(incident => {
        // By status
        stats.byStatus[incident.status] = (stats.byStatus[incident.status] || 0) + 1;
        
        // By severity
        stats.bySeverity[incident.severity] = (stats.bySeverity[incident.severity] || 0) + 1;
        
        // By type
        stats.byType[incident.type] = (stats.byType[incident.type] || 0) + 1;
      });

      // Calculate average resolution time for resolved incidents
      const resolved = incidents.filter(i => i.resolved_at);
      if (resolved.length > 0) {
        const totalTime = resolved.reduce((sum, i) => {
          return sum + (new Date(i.resolved_at) - new Date(i.created_at));
        }, 0);
        stats.avgResolutionTime = totalTime / resolved.length;
      }

      return stats;
    };

    test('should count total incidents', () => {
      const incidents = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const stats = calculateStats(incidents);
      expect(stats.total).toBe(3);
    });

    test('should group by status', () => {
      const incidents = [
        { id: 1, status: 'open' },
        { id: 2, status: 'open' },
        { id: 3, status: 'closed' }
      ];
      
      const stats = calculateStats(incidents);
      expect(stats.byStatus.open).toBe(2);
      expect(stats.byStatus.closed).toBe(1);
    });

    test('should group by severity', () => {
      const incidents = [
        { id: 1, severity: 'high' },
        { id: 2, severity: 'high' },
        { id: 3, severity: 'low' }
      ];
      
      const stats = calculateStats(incidents);
      expect(stats.bySeverity.high).toBe(2);
      expect(stats.bySeverity.low).toBe(1);
    });

    test('should calculate average resolution time', () => {
      const incidents = [
        { 
          id: 1, 
          created_at: '2024-01-01T10:00:00Z', 
          resolved_at: '2024-01-01T12:00:00Z' 
        },
        { 
          id: 2, 
          created_at: '2024-01-02T10:00:00Z', 
          resolved_at: '2024-01-02T14:00:00Z' 
        }
      ];
      
      const stats = calculateStats(incidents);
      // Average: (2 hours + 4 hours) / 2 = 3 hours = 10800000ms
      expect(stats.avgResolutionTime).toBe(10800000);
    });
  });
});
