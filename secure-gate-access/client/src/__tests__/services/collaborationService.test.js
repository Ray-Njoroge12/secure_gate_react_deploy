import { jest } from '@jest/globals';
import * as collaborationService from '../../services/collaborationService';

// Mock fetch globally
global.fetch = jest.fn();

describe('CollaborationService', () => {
  const mockApiResponse = (data, success = true) => ({
    ok: success,
    status: success ? 200 : 400,
    json: jest.fn().mockResolvedValue({
      success,
      data,
      message: success ? 'Success' : 'Error'
    })
  });

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('Message Management', () => {
    describe('getMessages', () => {
      test('should fetch messages with default parameters', async () => {
        const mockMessages = [
          { id: 1, subject: 'Test Message', sender_name: 'John Doe' }
        ];
        
        fetch.mockResolvedValue(mockApiResponse({ 
          messages: mockMessages, 
          pagination: { total: 1, page: 1, pages: 1 } 
        }));

        const result = await collaborationService.getMessages();

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/messages?page=1&limit=20', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        expect(result.success).toBe(true);
        expect(result.data.messages).toEqual(mockMessages);
      });

      test('should fetch messages with custom parameters', async () => {
        const mockMessages = [];
        
        fetch.mockResolvedValue(mockApiResponse({ 
          messages: mockMessages, 
          pagination: { total: 0, page: 1, pages: 0 } 
        }));

        const params = {
          page: 2,
          limit: 10,
          messageType: 'broadcast',
          status: 'unread',
          search: 'test'
        };

        await collaborationService.getMessages(params);

        expect(fetch).toHaveBeenCalledWith(
          '/api/collaboration/messages?page=2&limit=10&messageType=broadcast&status=unread&search=test',
          expect.any(Object)
        );
      });

      test('should handle fetch errors', async () => {
        fetch.mockRejectedValue(new Error('Network error'));

        const result = await collaborationService.getMessages();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to fetch messages');
      });
    });

    describe('sendMessage', () => {
      test('should send message with correct data', async () => {
        const mockMessage = { id: 1, subject: 'New Message' };
        
        fetch.mockResolvedValue(mockApiResponse({ message: mockMessage }));

        const messageData = {
          recipientId: 2,
          subject: 'Test Subject',
          content: 'Test Content',
          messageType: 'direct',
          priority: 'normal'
        };

        const result = await collaborationService.sendMessage(messageData);

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(messageData)
        });

        expect(result.success).toBe(true);
        expect(result.data.message).toEqual(mockMessage);
      });

      test('should handle send message errors', async () => {
        fetch.mockResolvedValue(mockApiResponse(null, false));

        const result = await collaborationService.sendMessage({});

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to send message');
      });
    });

    describe('markMessageAsRead', () => {
      test('should mark message as read', async () => {
        fetch.mockResolvedValue(mockApiResponse({ success: true }));

        const result = await collaborationService.markMessageAsRead(1);

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/messages/1/read', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Workflow Handoffs', () => {
    describe('getWorkflowHandoffs', () => {
      test('should fetch workflow handoffs', async () => {
        const mockHandoffs = [
          { id: 1, workflow_type: 'visitor_approval', status: 'pending' }
        ];
        
        fetch.mockResolvedValue(mockApiResponse({ 
          handoffs: mockHandoffs, 
          pagination: { total: 1, page: 1, pages: 1 } 
        }));

        const result = await collaborationService.getWorkflowHandoffs();

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/handoffs?page=1&limit=20', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        expect(result.success).toBe(true);
        expect(result.data.handoffs).toEqual(mockHandoffs);
      });

      test('should fetch handoffs with filters', async () => {
        fetch.mockResolvedValue(mockApiResponse({ handoffs: [], pagination: {} }));

        const params = {
          status: 'pending',
          workflowType: 'visitor_approval',
          search: 'test'
        };

        await collaborationService.getWorkflowHandoffs(params);

        expect(fetch).toHaveBeenCalledWith(
          '/api/collaboration/handoffs?page=1&limit=20&status=pending&workflowType=visitor_approval&search=test',
          expect.any(Object)
        );
      });
    });

    describe('createWorkflowHandoff', () => {
      test('should create workflow handoff', async () => {
        const mockHandoff = { id: 1, workflow_type: 'visitor_approval' };
        
        fetch.mockResolvedValue(mockApiResponse({ handoff: mockHandoff }));

        const handoffData = {
          toUserId: 2,
          workflowType: 'visitor_approval',
          entityType: 'visitor',
          entityId: '123',
          contextData: { visitor_name: 'John Doe' },
          handoffNotes: 'Please review',
          priority: 'normal'
        };

        const result = await collaborationService.createWorkflowHandoff(handoffData);

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/handoffs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(handoffData)
        });

        expect(result.success).toBe(true);
        expect(result.data.handoff).toEqual(mockHandoff);
      });
    });

    describe('acceptWorkflowHandoff', () => {
      test('should accept workflow handoff', async () => {
        const mockHandoff = { id: 1, status: 'accepted' };
        
        fetch.mockResolvedValue(mockApiResponse({ handoff: mockHandoff }));

        const result = await collaborationService.acceptWorkflowHandoff(1);

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/handoffs/1/accept', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        expect(result.success).toBe(true);
        expect(result.data.handoff).toEqual(mockHandoff);
      });
    });

    describe('completeWorkflowHandoff', () => {
      test('should complete workflow handoff', async () => {
        const mockHandoff = { id: 1, status: 'completed' };
        
        fetch.mockResolvedValue(mockApiResponse({ handoff: mockHandoff }));

        const result = await collaborationService.completeWorkflowHandoff(1);

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/handoffs/1/complete', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        expect(result.success).toBe(true);
        expect(result.data.handoff).toEqual(mockHandoff);
      });
    });
  });

  describe('Approval Workflows', () => {
    describe('getApprovalWorkflows', () => {
      test('should fetch approval workflows', async () => {
        const mockWorkflows = [
          { id: 1, workflow_name: 'Visitor Approval', status: 'pending' }
        ];
        
        fetch.mockResolvedValue(mockApiResponse({ 
          workflows: mockWorkflows, 
          pagination: { total: 1, page: 1, pages: 1 } 
        }));

        const result = await collaborationService.getApprovalWorkflows();

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/workflows?page=1&limit=20', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        expect(result.success).toBe(true);
        expect(result.data.workflows).toEqual(mockWorkflows);
      });
    });

    describe('createApprovalWorkflow', () => {
      test('should create approval workflow', async () => {
        const mockWorkflow = { id: 1, workflow_name: 'Test Workflow' };
        
        fetch.mockResolvedValue(mockApiResponse({ workflow: mockWorkflow }));

        const workflowData = {
          workflowName: 'Test Workflow',
          workflowType: 'visitor_approval',
          description: 'Test description',
          entityType: 'visitor',
          entityId: '123',
          approvalSteps: [
            { stepName: 'Review', approverRole: 'admin', required: true }
          ],
          expiresAt: '2025-02-01T00:00:00Z'
        };

        const result = await collaborationService.createApprovalWorkflow(workflowData);

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/workflows', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(workflowData)
        });

        expect(result.success).toBe(true);
        expect(result.data.workflow).toEqual(mockWorkflow);
      });
    });

    describe('approveWorkflowStep', () => {
      test('should approve workflow step', async () => {
        const mockWorkflow = { id: 1, status: 'approved' };
        
        fetch.mockResolvedValue(mockApiResponse({ workflow: mockWorkflow }));

        const approvalData = {
          workflowId: 1,
          stepOrder: 1,
          comments: 'Approved'
        };

        const result = await collaborationService.approveWorkflowStep(approvalData);

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/workflows/1/steps/1/approve', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ comments: 'Approved' })
        });

        expect(result.success).toBe(true);
        expect(result.data.workflow).toEqual(mockWorkflow);
      });
    });

    describe('rejectWorkflowStep', () => {
      test('should reject workflow step', async () => {
        const mockWorkflow = { id: 1, status: 'rejected' };
        
        fetch.mockResolvedValue(mockApiResponse({ workflow: mockWorkflow }));

        const rejectionData = {
          workflowId: 1,
          stepOrder: 1,
          rejectionReason: 'Insufficient information'
        };

        const result = await collaborationService.rejectWorkflowStep(rejectionData);

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/workflows/1/steps/1/reject', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ rejectionReason: 'Insufficient information' })
        });

        expect(result.success).toBe(true);
        expect(result.data.workflow).toEqual(mockWorkflow);
      });
    });
  });

  describe('Conflict Resolution', () => {
    describe('getConflicts', () => {
      test('should fetch conflicts', async () => {
        const mockConflicts = [
          { id: 1, title: 'Test Conflict', status: 'active' }
        ];
        
        fetch.mockResolvedValue(mockApiResponse({ 
          conflicts: mockConflicts, 
          pagination: { total: 1, page: 1, pages: 1 } 
        }));

        const result = await collaborationService.getConflicts();

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/conflicts?page=1&limit=20', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        expect(result.success).toBe(true);
        expect(result.data.conflicts).toEqual(mockConflicts);
      });
    });

    describe('createConflict', () => {
      test('should create conflict', async () => {
        const mockConflict = { id: 1, title: 'Test Conflict' };
        
        fetch.mockResolvedValue(mockApiResponse({ conflict: mockConflict }));

        const conflictData = {
          title: 'Test Conflict',
          description: 'Test description',
          conflictType: 'interpersonal',
          severity: 'medium',
          involvedParties: [2, 3],
          requestedMediator: 1,
          urgentResolution: false
        };

        const result = await collaborationService.createConflict(conflictData);

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/conflicts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(conflictData)
        });

        expect(result.success).toBe(true);
        expect(result.data.conflict).toEqual(mockConflict);
      });
    });

    describe('assignMediator', () => {
      test('should assign mediator to conflict', async () => {
        const mockConflict = { id: 1, mediator_id: 2 };
        
        fetch.mockResolvedValue(mockApiResponse({ conflict: mockConflict }));

        const result = await collaborationService.assignMediator(1, 2);

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/conflicts/1/mediator', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ mediatorId: 2 })
        });

        expect(result.success).toBe(true);
        expect(result.data.conflict).toEqual(mockConflict);
      });
    });

    describe('escalateConflict', () => {
      test('should escalate conflict', async () => {
        const mockConflict = { id: 1, escalation_level: 1 };
        
        fetch.mockResolvedValue(mockApiResponse({ conflict: mockConflict }));

        const escalationData = {
          conflictId: 1,
          reason: 'Unable to resolve',
          escalatedBy: 1
        };

        const result = await collaborationService.escalateConflict(escalationData);

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/conflicts/1/escalate', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            reason: 'Unable to resolve',
            escalatedBy: 1
          })
        });

        expect(result.success).toBe(true);
        expect(result.data.conflict).toEqual(mockConflict);
      });
    });

    describe('resolveConflict', () => {
      test('should resolve conflict', async () => {
        const mockConflict = { id: 1, status: 'resolved' };
        
        fetch.mockResolvedValue(mockApiResponse({ conflict: mockConflict }));

        const resolutionData = {
          conflictId: 1,
          resolutionType: 'agreement',
          resolutionNotes: 'Parties reached agreement',
          resolvedBy: 1
        };

        const result = await collaborationService.resolveConflict(resolutionData);

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/conflicts/1/resolve', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            resolutionType: 'agreement',
            resolutionNotes: 'Parties reached agreement',
            resolvedBy: 1
          })
        });

        expect(result.success).toBe(true);
        expect(result.data.conflict).toEqual(mockConflict);
      });
    });
  });

  describe('Team Coordination', () => {
    describe('getSharedCalendars', () => {
      test('should fetch shared calendars', async () => {
        const mockCalendars = [
          { id: 1, calendar_name: 'Team Calendar', owner_id: 1 }
        ];
        
        fetch.mockResolvedValue(mockApiResponse({ 
          calendars: mockCalendars, 
          pagination: { total: 1, page: 1, pages: 1 } 
        }));

        const result = await collaborationService.getSharedCalendars();

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/calendars?page=1&limit=20', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        expect(result.success).toBe(true);
        expect(result.data.calendars).toEqual(mockCalendars);
      });
    });

    describe('createSharedCalendar', () => {
      test('should create shared calendar', async () => {
        const mockCalendar = { id: 1, calendar_name: 'New Calendar' };
        
        fetch.mockResolvedValue(mockApiResponse({ calendar: mockCalendar }));

        const calendarData = {
          calendarName: 'New Calendar',
          description: 'Test calendar',
          color: '#3B82F6',
          sharedWithRoles: ['admin', 'guard'],
          sharedWithUsers: [],
          defaultPermission: 'read'
        };

        const result = await collaborationService.createSharedCalendar(calendarData);

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/calendars', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(calendarData)
        });

        expect(result.success).toBe(true);
        expect(result.data.calendar).toEqual(mockCalendar);
      });
    });

    describe('getCalendarEvents', () => {
      test('should fetch calendar events', async () => {
        const mockEvents = [
          { id: 1, title: 'Team Meeting', calendar_id: 1 }
        ];
        
        fetch.mockResolvedValue(mockApiResponse({ 
          events: mockEvents, 
          pagination: { total: 1, page: 1, pages: 1 } 
        }));

        const result = await collaborationService.getCalendarEvents();

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/events?page=1&limit=20', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        expect(result.success).toBe(true);
        expect(result.data.events).toEqual(mockEvents);
      });

      test('should fetch events with date range and calendar filter', async () => {
        fetch.mockResolvedValue(mockApiResponse({ events: [], pagination: {} }));

        const params = {
          calendarId: 1,
          startDate: '2025-01-01',
          endDate: '2025-01-31'
        };

        await collaborationService.getCalendarEvents(params);

        expect(fetch).toHaveBeenCalledWith(
          '/api/collaboration/events?page=1&limit=20&calendarId=1&startDate=2025-01-01&endDate=2025-01-31',
          expect.any(Object)
        );
      });
    });

    describe('createCalendarEvent', () => {
      test('should create calendar event', async () => {
        const mockEvent = { id: 1, title: 'New Event' };
        
        fetch.mockResolvedValue(mockApiResponse({ event: mockEvent }));

        const eventData = {
          calendarId: 1,
          title: 'New Event',
          description: 'Test event',
          location: 'Conference Room',
          startTime: '2025-02-01T10:00:00Z',
          endTime: '2025-02-01T11:00:00Z',
          allDay: false,
          attendees: [2, 3],
          reminders: [{ minutesBefore: 15, type: 'notification' }]
        };

        const result = await collaborationService.createCalendarEvent(eventData);

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(eventData)
        });

        expect(result.success).toBe(true);
        expect(result.data.event).toEqual(mockEvent);
      });
    });

    describe('updateEventStatus', () => {
      test('should update event attendance status', async () => {
        const mockEvent = { id: 1, status: 'confirmed' };
        
        fetch.mockResolvedValue(mockApiResponse({ event: mockEvent }));

        const statusData = {
          eventId: 1,
          userId: 2,
          status: 'confirmed'
        };

        const result = await collaborationService.updateEventStatus(statusData);

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/events/1/status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            userId: 2,
            status: 'confirmed'
          })
        });

        expect(result.success).toBe(true);
        expect(result.data.event).toEqual(mockEvent);
      });
    });
  });

  describe('User Management', () => {
    describe('getUsers', () => {
      test('should fetch users', async () => {
        const mockUsers = [
          { id: 1, username: 'admin', role: 'admin' },
          { id: 2, username: 'guard', role: 'guard' }
        ];
        
        fetch.mockResolvedValue(mockApiResponse({ users: mockUsers }));

        const result = await collaborationService.getUsers();

        expect(fetch).toHaveBeenCalledWith('/api/collaboration/users', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        expect(result.success).toBe(true);
        expect(result.data.users).toEqual(mockUsers);
      });

      test('should fetch users with filters', async () => {
        fetch.mockResolvedValue(mockApiResponse({ users: [] }));

        const params = {
          estateId: 1,
          roles: ['admin', 'guard'],
          excludeCurrentUser: true
        };

        await collaborationService.getUsers(params);

        expect(fetch).toHaveBeenCalledWith(
          '/api/collaboration/users?estateId=1&roles=admin,guard&excludeCurrentUser=true',
          expect.any(Object)
        );
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const result = await collaborationService.getMessages();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch messages');
    });

    test('should handle API errors', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          success: false,
          message: 'Bad request',
          error: { code: 'VALIDATION_ERROR' }
        })
      });

      const result = await collaborationService.sendMessage({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send message');
    });

    test('should handle malformed responses', async () => {
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      const result = await collaborationService.getMessages();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch messages');
    });
  });
});