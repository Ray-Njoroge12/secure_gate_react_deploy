/**
 * Incident Workflow Controller Unit Tests
 * Tests for incident management and workflow API endpoints
 * Priority: P1 - Critical incident management functionality
 *
 * Coverage targets:
 * - Statements: 90%+
 * - Branches: 85%+
 * - Functions: 100%
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockEvaluateAutomationRules = jest.fn();
const mockTriggerWebhooks = jest.fn();

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: mockQuery,
    pool: {
      query: mockQuery
    }
  }
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.unstable_mockModule('../../src/services/automationService.js', () => ({
  evaluateAutomationRules: mockEvaluateAutomationRules
}));

jest.unstable_mockModule('../../src/services/webhookService.js', () => ({
  default: {
    sendWebhook: mockTriggerWebhooks
  }
}));

// Import after mocks
const {
  getIncidentQueue,
  getIncidentStats,
  updateIncidentStatus,
  assignIncident,
  escalateIncident,
  getIncidentComments,
  addIncidentComment,
  getIncidentHistory,
  getIncidentSLA
} = await import('../../src/controllers/incidentWorkflowController.js');

describe('Incident Workflow Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: {
        id: 1,
        email: 'admin@example.com',
        role: 'admin'
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('getIncidentQueue', () => {
    it('should return all non-closed incidents', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            severity: 'critical',
            status: 'open',
            assigned_name: 'John Doe',
            reported_by_name: 'Jane Smith',
            response_sla_met: true,
            resolution_sla_met: true,
            overdue_minutes: 0
          },
          {
            id: 2,
            severity: 'high',
            status: 'under_review',
            assigned_name: 'Bob Wilson',
            reported_by_name: 'Alice Brown',
            response_sla_met: true,
            resolution_sla_met: false,
            overdue_minutes: 30
          }
        ]
      });

      await getIncidentQueue(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE i.status != \'closed\''),
        []
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 1, severity: 'critical' }),
          expect.objectContaining({ id: 2, severity: 'high' })
        ])
      });
    });

    it('should filter by severity', async () => {
      mockReq.query = { severity: 'critical' };

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          severity: 'critical',
          status: 'open'
        }]
      });

      await getIncidentQueue(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND i.severity = $1'),
        ['critical']
      );
    });

    it('should filter by assignedToMe', async () => {
      mockReq.query = { assignedToMe: 'true' };
      mockReq.user.id = 5;

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          assigned_to: 5
        }]
      });

      await getIncidentQueue(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND i.assigned_to = $1'),
        [5]
      );
    });

    it('should filter by unassigned incidents', async () => {
      mockReq.query = { unassigned: 'true' };

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          assigned_to: null
        }]
      });

      await getIncidentQueue(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND i.assigned_to IS NULL'),
        []
      );
    });

    it('should filter by SLA breached incidents', async () => {
      mockReq.query = { slaBreached: 'true' };

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          resolution_sla_met: false
        }]
      });

      await getIncidentQueue(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND sla.resolution_sla_met = FALSE'),
        []
      );
    });

    it('should handle multiple filters', async () => {
      mockReq.query = {
        severity: 'critical',
        assignedToMe: 'true',
        slaBreached: 'true'
      };
      mockReq.user.id = 5;

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await getIncidentQueue(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND i.severity = $1'),
        ['critical', 5]
      );
    });

    it('should return 500 on database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await getIncidentQueue(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to fetch incident queue'
      });
    });
  });

  describe('getIncidentStats', () => {
    it('should return incident statistics', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          open: '10',
          critical: '3',
          under_review: '5',
          sla_breached: '2'
        }]
      });

      await getIncidentStats(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) FILTER')
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          open: '10',
          critical: '3',
          under_review: '5',
          sla_breached: '2'
        })
      });
    });

    it('should return 500 on database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await getIncidentStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to fetch incident stats'
      });
    });
  });

  describe('updateIncidentStatus', () => {
    it('should update incident status to open', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { status: 'open' };

      const updatedIncident = {
        id: 1,
        status: 'open'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [updatedIncident] })
        .mockResolvedValueOnce({ rows: [] });

      mockEvaluateAutomationRules.mockResolvedValueOnce(true);
      mockTriggerWebhooks.mockResolvedValueOnce(true);

      await updateIncidentStatus(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE incidents'),
        ['open', '1']
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('calculate_incident_sla'),
        ['1']
      );
      expect(mockEvaluateAutomationRules).toHaveBeenCalledWith(
        'incident.open',
        updatedIncident
      );
      expect(mockTriggerWebhooks).toHaveBeenCalledWith(
        'incident.open',
        updatedIncident
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: updatedIncident
      });
    });

    it('should update incident status to closed with timestamp', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { status: 'closed' };
      mockReq.user.id = 5;

      const closedIncident = {
        id: 1,
        status: 'closed',
        closed_at: '2026-01-01T12:00:00Z',
        closed_by: 5
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [closedIncident] })
        .mockResolvedValueOnce({ rows: [] });

      mockEvaluateAutomationRules.mockResolvedValueOnce(true);
      mockTriggerWebhooks.mockResolvedValueOnce(true);

      await updateIncidentStatus(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('closed_at = CURRENT_TIMESTAMP'),
        ['closed', 5, '1']
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: closedIncident
      });
    });

    it('should return 400 for invalid status', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { status: 'invalid_status' };

      await updateIncidentStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid status'
      });
    });

    it('should return 404 if incident not found', async () => {
      mockReq.params = { id: '999' };
      mockReq.body = { status: 'open' };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await updateIncidentStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Incident not found'
      });
    });

    it('should return 500 on database error', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { status: 'open' };

      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await updateIncidentStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to update incident status'
      });
    });
  });

  describe('assignIncident', () => {
    it('should assign incident to user', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { assignedTo: 5 };
      mockReq.user.id = 2;

      const assignedIncident = {
        id: 1,
        assigned_to: 5,
        status: 'under_review'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [assignedIncident] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await assignIncident(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE incidents'),
        [5, 2, '1']
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO incident_assignments'),
        ['1', 5, 2]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('calculate_incident_sla'),
        ['1']
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: assignedIncident
      });
    });

    it('should change status to under_review if currently open', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { assignedTo: 5 };

      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            status: 'under_review'
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await assignIncident(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = CASE WHEN status = \'open\' THEN \'under_review\' ELSE status END'),
        expect.any(Array)
      );
    });

    it('should return 404 if incident not found', async () => {
      mockReq.params = { id: '999' };
      mockReq.body = { assignedTo: 5 };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await assignIncident(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Incident not found'
      });
    });

    it('should return 500 on database error', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { assignedTo: 5 };

      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await assignIncident(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to assign incident'
      });
    });
  });

  describe('escalateIncident', () => {
    it('should escalate incident', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { escalateTo: 10 };
      mockReq.user.id = 2;

      const escalatedIncident = {
        id: 1,
        status: 'escalated',
        escalated_to: 10,
        escalated_by: 2
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [escalatedIncident] })
        .mockResolvedValueOnce({ rows: [] });

      mockEvaluateAutomationRules.mockResolvedValueOnce(true);

      await escalateIncident(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = \'escalated\''),
        [10, 2, '1']
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO incident_assignments'),
        ['1', 10, 2]
      );
      expect(mockEvaluateAutomationRules).toHaveBeenCalledWith(
        'incident.escalated',
        escalatedIncident
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: escalatedIncident
      });
    });

    it('should return 404 if incident not found', async () => {
      mockReq.params = { id: '999' };
      mockReq.body = { escalateTo: 10 };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await escalateIncident(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Incident not found'
      });
    });

    it('should return 500 on database error', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { escalateTo: 10 };

      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await escalateIncident(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to escalate incident'
      });
    });
  });

  describe('getIncidentComments', () => {
    it('should return incident comments', async () => {
      mockReq.params = { id: '1' };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            incident_id: 1,
            user_id: 2,
            user_name: 'John Doe',
            comment: 'First comment',
            created_at: '2026-01-01T10:00:00Z'
          },
          {
            id: 2,
            incident_id: 1,
            user_id: 3,
            user_name: 'Jane Smith',
            comment: 'Second comment',
            created_at: '2026-01-01T11:00:00Z'
          }
        ]
      });

      await getIncidentComments(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM incident_comments'),
        ['1']
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ comment: 'First comment' }),
          expect.objectContaining({ comment: 'Second comment' })
        ])
      });
    });

    it('should return 500 on database error', async () => {
      mockReq.params = { id: '1' };
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await getIncidentComments(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to fetch comments'
      });
    });
  });

  describe('addIncidentComment', () => {
    it('should add internal comment by default', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { comment: 'New comment' };
      mockReq.user.id = 2;

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          incident_id: 1,
          user_id: 2,
          comment: 'New comment',
          internal: true
        }]
      });

      await addIncidentComment(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO incident_comments'),
        ['1', 2, 'New comment', true]
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          comment: 'New comment',
          internal: true
        })
      });
    });

    it('should add external comment when specified', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        comment: 'Public comment',
        internal: false
      };
      mockReq.user.id = 2;

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          comment: 'Public comment',
          internal: false
        }]
      });

      await addIncidentComment(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['1', 2, 'Public comment', false]
      );
    });

    it('should return 500 on database error', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { comment: 'Test comment' };

      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await addIncidentComment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to add comment'
      });
    });
  });

  describe('getIncidentHistory', () => {
    it('should return incident history', async () => {
      mockReq.params = { id: '1' };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            action: 'Status Changed',
            description: 'Status changed from open to under_review',
            created_at: '2026-01-01T10:00:00Z'
          },
          {
            action: 'Assignment',
            description: 'Assigned to user 5',
            created_at: '2026-01-01T09:00:00Z'
          }
        ]
      });

      await getIncidentHistory(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UNION ALL'),
        ['1']
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ action: 'Status Changed' }),
          expect.objectContaining({ action: 'Assignment' })
        ])
      });
    });

    it('should return 500 on database error', async () => {
      mockReq.params = { id: '1' };
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await getIncidentHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to fetch history'
      });
    });
  });

  describe('getIncidentSLA', () => {
    it('should return SLA information', async () => {
      mockReq.params = { id: '1' };

      mockQuery.mockResolvedValueOnce({
        rows: [{
          response_sla_minutes: 30,
          resolution_sla_minutes: 120,
          response_minutes: '15',
          resolution_minutes: '90',
          response_sla_met: true,
          resolution_sla_met: true
        }]
      });

      await getIncidentSLA(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM incident_sla_tracking'),
        ['1']
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          response_sla_met: true,
          resolution_sla_met: true
        })
      });
    });

    it('should return null if no SLA data exists', async () => {
      mockReq.params = { id: '1' };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await getIncidentSLA(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: null
      });
    });

    it('should return 500 on database error', async () => {
      mockReq.params = { id: '1' };
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await getIncidentSLA(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to fetch SLA information'
      });
    });
  });
});
