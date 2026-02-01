import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import TeamCoordination from '../../../components/collaboration/TeamCoordination';
import * as collaborationService from '../../../services/collaborationService';

// Mock the collaboration service
jest.mock('../../../services/collaborationService');

// Mock user context
const mockUser = {
  id: 1,
  role: 'admin',
  estate_id: 1,
  username: 'admin_user'
};

jest.mock('../../../contexts/UserContext', () => ({
  useUser: () => ({ user: mockUser })
}));

describe('TeamCoordination', () => {
  const mockCalendars = [
    {
      id: 1,
      calendar_name: 'Security Team Schedule',
      description: 'Guard shifts and security activities',
      color: '#3B82F6',
      owner_id: 1,
      owner_name: 'Admin User',
      shared_with_roles: ['guard', 'admin'],
      default_permission: 'read',
      active: true,
      created_at: '2025-01-29T10:00:00Z'
    },
    {
      id: 2,
      calendar_name: 'Maintenance Calendar',
      description: 'Scheduled maintenance and repairs',
      color: '#10B981',
      owner_id: 1,
      owner_name: 'Admin User',
      shared_with_roles: ['admin', 'resident'],
      default_permission: 'read',
      active: true,
      created_at: '2025-01-29T09:00:00Z'
    }
  ];

  const mockEvents = [
    {
      id: 1,
      calendar_id: 1,
      title: 'Morning Security Shift',
      description: 'Regular morning security patrol',
      location: 'Main Gate',
      start_time: '2025-01-30T08:00:00Z',
      end_time: '2025-01-30T16:00:00Z',
      all_day: false,
      organizer_id: 1,
      organizer_name: 'Admin User',
      attendees: [
        { user_id: 3, user_name: 'Security Guard', status: 'confirmed' }
      ],
      status: 'confirmed',
      created_at: '2025-01-29T10:00:00Z'
    },
    {
      id: 2,
      calendar_id: 2,
      title: 'HVAC Maintenance',
      description: 'Quarterly HVAC system maintenance',
      location: 'Building A',
      start_time: '2025-01-31T10:00:00Z',
      end_time: '2025-01-31T14:00:00Z',
      all_day: false,
      organizer_id: 1,
      organizer_name: 'Admin User',
      attendees: [
        { user_id: 4, user_name: 'Maintenance Staff', status: 'tentative' }
      ],
      status: 'confirmed',
      created_at: '2025-01-29T09:00:00Z'
    }
  ];

  const mockUsers = [
    { id: 2, username: 'john_doe', role: 'resident', estate_id: 1 },
    { id: 3, username: 'security_guard', role: 'guard', estate_id: 1 },
    { id: 4, username: 'maintenance_staff', role: 'admin', estate_id: 1 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    collaborationService.getSharedCalendars.mockResolvedValue({
      success: true,
      data: { calendars: mockCalendars, pagination: { total: 2, page: 1, pages: 1 } }
    });
    
    collaborationService.getCalendarEvents.mockResolvedValue({
      success: true,
      data: { events: mockEvents, pagination: { total: 2, page: 1, pages: 1 } }
    });
    
    collaborationService.getUsers.mockResolvedValue({
      success: true,
      data: { users: mockUsers }
    });
    
    collaborationService.createSharedCalendar.mockResolvedValue({
      success: true,
      data: { calendar: { id: 3, ...mockCalendars[0] } }
    });
    
    collaborationService.createCalendarEvent.mockResolvedValue({
      success: true,
      data: { event: { id: 3, ...mockEvents[0] } }
    });
    
    collaborationService.updateEventStatus.mockResolvedValue({
      success: true,
      data: { event: { ...mockEvents[0], status: 'confirmed' } }
    });
  });

  describe('Component Rendering', () => {
    test('should render team coordination with calendar and event sections', async () => {
      render(<TeamCoordination />);

      // Check for main sections
      expect(screen.getByText('Team Coordination')).toBeInTheDocument();
      expect(screen.getByText('Shared Calendars')).toBeInTheDocument();
      expect(screen.getByText('Create Calendar')).toBeInTheDocument();
      
      // Wait for calendars to load
      await waitFor(() => {
        expect(screen.getByText('Security Team Schedule')).toBeInTheDocument();
        expect(screen.getByText('Maintenance Calendar')).toBeInTheDocument();
      });
    });

    test('should display calendar list with correct information', async () => {
      render(<TeamCoordination />);

      await waitFor(() => {
        // Check calendar names
        expect(screen.getByText('Security Team Schedule')).toBeInTheDocument();
        expect(screen.getByText('Maintenance Calendar')).toBeInTheDocument();
        
        // Check descriptions
        expect(screen.getByText('Guard shifts and security activities')).toBeInTheDocument();
        expect(screen.getByText('Scheduled maintenance and repairs')).toBeInTheDocument();
        
        // Check owner information
        expect(screen.getAllByText('Admin User')).toHaveLength(2);
      });
    });

    test('should show shared roles and permissions', async () => {
      render(<TeamCoordination />);

      await waitFor(() => {
        // Check shared roles
        expect(screen.getByText('Shared with: guard, admin')).toBeInTheDocument();
        expect(screen.getByText('Shared with: admin, resident')).toBeInTheDocument();
        
        // Check permissions
        expect(screen.getAllByText('Read Access')).toHaveLength(2);
      });
    });
  });

  describe('Calendar Management', () => {
    test('should allow creating a new shared calendar', async () => {
      const user = userEvent.setup();
      
      render(<TeamCoordination />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Create Calendar')).toBeInTheDocument();
      });

      // Fill out the calendar form
      const calendarNameInput = screen.getByLabelText('Calendar Name');
      const descriptionTextarea = screen.getByLabelText('Description');
      const colorInput = screen.getByLabelText('Color');
      const createButton = screen.getByText('Create Calendar');

      await user.type(calendarNameInput, 'Test Team Calendar');
      await user.type(descriptionTextarea, 'Test calendar for team coordination');
      await user.clear(colorInput);
      await user.type(colorInput, '#FF5722');
      
      await user.click(createButton);

      // Verify the service was called with correct data
      await waitFor(() => {
        expect(collaborationService.createSharedCalendar).toHaveBeenCalledWith({
          calendarName: 'Test Team Calendar',
          description: 'Test calendar for team coordination',
          color: '#FF5722',
          sharedWithRoles: [],
          sharedWithUsers: [],
          defaultPermission: 'read'
        });
      });
    });

    test('should validate required fields before creating calendar', async () => {
      const user = userEvent.setup();
      
      render(<TeamCoordination />);

      await waitFor(() => {
        expect(screen.getByText('Create Calendar')).toBeInTheDocument();
      });

      // Try to create without filling required fields
      const createButton = screen.getByText('Create Calendar');
      await user.click(createButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText('Calendar name is required')).toBeInTheDocument();
      });

      // Service should not be called
      expect(collaborationService.createSharedCalendar).not.toHaveBeenCalled();
    });

    test('should support configuring sharing settings', async () => {
      const user = userEvent.setup();
      
      render(<TeamCoordination />);

      await waitFor(() => {
        expect(screen.getByLabelText('Share with Roles')).toBeInTheDocument();
      });

      // Configure sharing settings
      const shareWithRolesSelect = screen.getByLabelText('Share with Roles');
      const permissionSelect = screen.getByLabelText('Default Permission');

      await user.selectOptions(shareWithRolesSelect, ['guard', 'resident']);
      await user.selectOptions(permissionSelect, 'write');

      // Fill other required fields and submit
      const calendarNameInput = screen.getByLabelText('Calendar Name');
      const createButton = screen.getByText('Create Calendar');

      await user.type(calendarNameInput, 'Shared Team Calendar');
      await user.click(createButton);

      // Verify correct sharing settings
      await waitFor(() => {
        expect(collaborationService.createSharedCalendar).toHaveBeenCalledWith({
          calendarName: 'Shared Team Calendar',
          description: '',
          color: '#3B82F6', // default
          sharedWithRoles: ['guard', 'resident'],
          sharedWithUsers: [],
          defaultPermission: 'write'
        });
      });
    });
  });

  describe('Event Management', () => {
    test('should display calendar events with correct information', async () => {
      render(<TeamCoordination />);

      await waitFor(() => {
        // Check event titles
        expect(screen.getByText('Morning Security Shift')).toBeInTheDocument();
        expect(screen.getByText('HVAC Maintenance')).toBeInTheDocument();
        
        // Check event details
        expect(screen.getByText('Main Gate')).toBeInTheDocument();
        expect(screen.getByText('Building A')).toBeInTheDocument();
        
        // Check organizer information
        expect(screen.getAllByText('Admin User')).toHaveLength(4); // 2 calendars + 2 events
        
        // Check attendee information
        expect(screen.getByText('Security Guard')).toBeInTheDocument();
        expect(screen.getByText('Maintenance Staff')).toBeInTheDocument();
      });
    });

    test('should allow creating a new calendar event', async () => {
      const user = userEvent.setup();
      
      render(<TeamCoordination />);

      await waitFor(() => {
        expect(screen.getByText('Add Event')).toBeInTheDocument();
      });

      // Click add event button
      const addEventButton = screen.getByText('Add Event');
      await user.click(addEventButton);

      // Should show event creation form
      await waitFor(() => {
        expect(screen.getByText('Create Event')).toBeInTheDocument();
        expect(screen.getByLabelText('Event Title')).toBeInTheDocument();
      });

      // Fill out the event form
      const titleInput = screen.getByLabelText('Event Title');
      const descriptionTextarea = screen.getByLabelText('Description');
      const locationInput = screen.getByLabelText('Location');
      const startTimeInput = screen.getByLabelText('Start Time');
      const endTimeInput = screen.getByLabelText('End Time');
      const calendarSelect = screen.getByLabelText('Calendar');
      const createEventButton = screen.getByText('Create Event');

      await user.type(titleInput, 'Test Team Meeting');
      await user.type(descriptionTextarea, 'Weekly team coordination meeting');
      await user.type(locationInput, 'Conference Room');
      await user.type(startTimeInput, '2025-02-01T10:00');
      await user.type(endTimeInput, '2025-02-01T11:00');
      await user.selectOptions(calendarSelect, '1');
      
      await user.click(createEventButton);

      // Verify the service was called with correct data
      await waitFor(() => {
        expect(collaborationService.createCalendarEvent).toHaveBeenCalledWith({
          calendarId: 1,
          title: 'Test Team Meeting',
          description: 'Weekly team coordination meeting',
          location: 'Conference Room',
          startTime: '2025-02-01T10:00:00.000Z',
          endTime: '2025-02-01T11:00:00.000Z',
          allDay: false,
          attendees: [],
          reminders: []
        });
      });
    });

    test('should support adding attendees to events', async () => {
      const user = userEvent.setup();
      
      render(<TeamCoordination />);

      await waitFor(() => {
        expect(screen.getByText('Add Event')).toBeInTheDocument();
      });

      // Open event creation form
      const addEventButton = screen.getByText('Add Event');
      await user.click(addEventButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Attendees')).toBeInTheDocument();
      });

      // Add attendees
      const attendeesSelect = screen.getByLabelText('Attendees');
      await user.selectOptions(attendeesSelect, ['2', '3']);

      // Fill other required fields and submit
      const titleInput = screen.getByLabelText('Event Title');
      const startTimeInput = screen.getByLabelText('Start Time');
      const endTimeInput = screen.getByLabelText('End Time');
      const calendarSelect = screen.getByLabelText('Calendar');
      const createEventButton = screen.getByText('Create Event');

      await user.type(titleInput, 'Team Meeting with Attendees');
      await user.type(startTimeInput, '2025-02-01T14:00');
      await user.type(endTimeInput, '2025-02-01T15:00');
      await user.selectOptions(calendarSelect, '1');
      await user.click(createEventButton);

      // Verify attendees were included
      await waitFor(() => {
        expect(collaborationService.createCalendarEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            attendees: [2, 3]
          })
        );
      });
    });

    test('should allow updating event attendance status', async () => {
      const user = userEvent.setup();
      
      render(<TeamCoordination />);

      await waitFor(() => {
        expect(screen.getByTestId('update-attendance-1')).toBeInTheDocument();
      });

      // Click update attendance button
      const updateButton = screen.getByTestId('update-attendance-1');
      await user.click(updateButton);

      // Should show attendance options
      await waitFor(() => {
        expect(screen.getByText('Update Attendance')).toBeInTheDocument();
        expect(screen.getByLabelText('Attendance Status')).toBeInTheDocument();
      });

      // Select attendance status
      const statusSelect = screen.getByLabelText('Attendance Status');
      const confirmButton = screen.getByText('Update Status');

      await user.selectOptions(statusSelect, 'confirmed');
      await user.click(confirmButton);

      // Should call update service
      await waitFor(() => {
        expect(collaborationService.updateEventStatus).toHaveBeenCalledWith({
          eventId: 1,
          userId: 1,
          status: 'confirmed'
        });
      });
    });
  });

  describe('Calendar Views', () => {
    test('should support different calendar view modes', async () => {
      const user = userEvent.setup();
      
      render(<TeamCoordination />);

      await waitFor(() => {
        expect(screen.getByText('Month View')).toBeInTheDocument();
        expect(screen.getByText('Week View')).toBeInTheDocument();
        expect(screen.getByText('Day View')).toBeInTheDocument();
      });

      // Switch to week view
      const weekViewButton = screen.getByText('Week View');
      await user.click(weekViewButton);

      // Should update the calendar display
      await waitFor(() => {
        expect(screen.getByText('Week of')).toBeInTheDocument();
      });
    });

    test('should allow navigating between time periods', async () => {
      const user = userEvent.setup();
      
      render(<TeamCoordination />);

      await waitFor(() => {
        expect(screen.getByTestId('calendar-prev')).toBeInTheDocument();
        expect(screen.getByTestId('calendar-next')).toBeInTheDocument();
      });

      // Navigate to next month
      const nextButton = screen.getByTestId('calendar-next');
      await user.click(nextButton);

      // Should load events for next period
      await waitFor(() => {
        expect(collaborationService.getCalendarEvents).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: expect.any(String),
            endDate: expect.any(String)
          })
        );
      });
    });

    test('should filter events by calendar', async () => {
      const user = userEvent.setup();
      
      render(<TeamCoordination />);

      await waitFor(() => {
        expect(screen.getByLabelText('Filter by Calendar')).toBeInTheDocument();
      });

      // Filter by specific calendar
      const calendarFilter = screen.getByLabelText('Filter by Calendar');
      await user.selectOptions(calendarFilter, '1');

      // Should call service with calendar filter
      await waitFor(() => {
        expect(collaborationService.getCalendarEvents).toHaveBeenCalledWith(
          expect.objectContaining({
            calendarId: 1
          })
        );
      });
    });
  });

  describe('Notifications and Reminders', () => {
    test('should display upcoming events and reminders', async () => {
      // Mock upcoming events
      const upcomingEvents = [
        {
          ...mockEvents[0],
          start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
          reminders: [{ minutes_before: 15, type: 'notification' }]
        }
      ];

      collaborationService.getCalendarEvents.mockResolvedValue({
        success: true,
        data: { events: upcomingEvents, pagination: { total: 1, page: 1, pages: 1 } }
      });
      
      render(<TeamCoordination />);

      await waitFor(() => {
        expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
        expect(screen.getByText('Starts in 1 hour')).toBeInTheDocument();
      });
    });

    test('should allow configuring event reminders', async () => {
      const user = userEvent.setup();
      
      render(<TeamCoordination />);

      await waitFor(() => {
        expect(screen.getByText('Add Event')).toBeInTheDocument();
      });

      // Open event creation form
      const addEventButton = screen.getByText('Add Event');
      await user.click(addEventButton);

      await waitFor(() => {
        expect(screen.getByText('Add Reminder')).toBeInTheDocument();
      });

      // Add reminder
      const addReminderButton = screen.getByText('Add Reminder');
      await user.click(addReminderButton);

      // Configure reminder
      const reminderMinutesInput = screen.getByLabelText('Minutes Before');
      const reminderTypeSelect = screen.getByLabelText('Reminder Type');

      await user.type(reminderMinutesInput, '30');
      await user.selectOptions(reminderTypeSelect, 'email');

      // Fill other required fields and submit
      const titleInput = screen.getByLabelText('Event Title');
      const startTimeInput = screen.getByLabelText('Start Time');
      const endTimeInput = screen.getByLabelText('End Time');
      const calendarSelect = screen.getByLabelText('Calendar');
      const createEventButton = screen.getByText('Create Event');

      await user.type(titleInput, 'Event with Reminder');
      await user.type(startTimeInput, '2025-02-01T16:00');
      await user.type(endTimeInput, '2025-02-01T17:00');
      await user.selectOptions(calendarSelect, '1');
      await user.click(createEventButton);

      // Verify reminders were included
      await waitFor(() => {
        expect(collaborationService.createCalendarEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            reminders: [{ minutesBefore: 30, type: 'email' }]
          })
        );
      });
    });
  });

  describe('Role-Based Access', () => {
    test('should show appropriate actions based on user permissions', async () => {
      render(<TeamCoordination />);

      await waitFor(() => {
        // Admin should see create calendar and event options
        expect(screen.getByText('Create Calendar')).toBeInTheDocument();
        expect(screen.getByText('Add Event')).toBeInTheDocument();
      });
    });

    test('should filter calendars based on sharing permissions', async () => {
      render(<TeamCoordination />);

      await waitFor(() => {
        expect(collaborationService.getSharedCalendars).toHaveBeenCalledWith(
          expect.objectContaining({
            estateId: 1,
            userId: 1
          })
        );
      });
    });

    test('should show different permissions for calendar owners vs shared users', async () => {
      render(<TeamCoordination />);

      await waitFor(() => {
        // Should show owner controls for owned calendars
        expect(screen.getByTestId('edit-calendar-1')).toBeInTheDocument();
        expect(screen.getByTestId('delete-calendar-1')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle calendar loading errors gracefully', async () => {
      collaborationService.getSharedCalendars.mockRejectedValue(new Error('Network error'));
      
      render(<TeamCoordination />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load calendars. Please try again.')).toBeInTheDocument();
      });
    });

    test('should handle event creation errors', async () => {
      collaborationService.createCalendarEvent.mockRejectedValue(new Error('Creation failed'));
      const user = userEvent.setup();
      
      render(<TeamCoordination />);

      await waitFor(() => {
        expect(screen.getByText('Add Event')).toBeInTheDocument();
      });

      // Try to create event
      const addEventButton = screen.getByText('Add Event');
      await user.click(addEventButton);

      await waitFor(() => {
        const titleInput = screen.getByLabelText('Event Title');
        const startTimeInput = screen.getByLabelText('Start Time');
        const endTimeInput = screen.getByLabelText('End Time');
        const calendarSelect = screen.getByLabelText('Calendar');
        const createEventButton = screen.getByText('Create Event');

        await user.type(titleInput, 'Test Event');
        await user.type(startTimeInput, '2025-02-01T10:00');
        await user.type(endTimeInput, '2025-02-01T11:00');
        await user.selectOptions(calendarSelect, '1');
        await user.click(createEventButton);
      });

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to create event. Please try again.')).toBeInTheDocument();
      });
    });

    test('should handle empty calendar and event lists', async () => {
      collaborationService.getSharedCalendars.mockResolvedValue({
        success: true,
        data: { calendars: [], pagination: { total: 0, page: 1, pages: 0 } }
      });
      
      collaborationService.getCalendarEvents.mockResolvedValue({
        success: true,
        data: { events: [], pagination: { total: 0, page: 1, pages: 0 } }
      });
      
      render(<TeamCoordination />);

      await waitFor(() => {
        expect(screen.getByText('No calendars found')).toBeInTheDocument();
        expect(screen.getByText('No events scheduled')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async () => {
      render(<TeamCoordination />);

      await waitFor(() => {
        // Check for proper ARIA labels
        expect(screen.getByLabelText('Calendar Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Description')).toBeInTheDocument();
        expect(screen.getByLabelText('Color')).toBeInTheDocument();
        
        // Check for proper roles
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('form')).toBeInTheDocument();
      });
    });

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<TeamCoordination />);

      await waitFor(() => {
        expect(screen.getByLabelText('Calendar Name')).toBeInTheDocument();
      });

      // Tab through form elements
      const calendarNameInput = screen.getByLabelText('Calendar Name');
      const descriptionTextarea = screen.getByLabelText('Description');
      const colorInput = screen.getByLabelText('Color');

      calendarNameInput.focus();
      expect(document.activeElement).toBe(calendarNameInput);

      await user.tab();
      expect(document.activeElement).toBe(descriptionTextarea);

      await user.tab();
      expect(document.activeElement).toBe(colorInput);
    });

    test('should provide calendar navigation for screen readers', async () => {
      render(<TeamCoordination />);

      await waitFor(() => {
        // Check for calendar navigation ARIA labels
        expect(screen.getByLabelText('Previous month')).toBeInTheDocument();
        expect(screen.getByLabelText('Next month')).toBeInTheDocument();
        expect(screen.getByRole('grid')).toBeInTheDocument(); // Calendar grid
      });
    });
  });
});