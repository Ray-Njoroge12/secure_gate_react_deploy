import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import ConflictResolution from '../../../components/collaboration/ConflictResolution';
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

describe('ConflictResolution', () => {
  const mockConflicts = [
    {
      id: 1,
      title: 'Parking Space Dispute',
      description: 'Disagreement over assigned parking spaces',
      conflict_type: 'resource',
      severity: 'medium',
      reporter_id: 2,
      reporter_name: 'John Doe',
      involved_parties: [2, 3],
      involved_party_names: ['John Doe', 'Jane Smith'],
      mediator_id: null,
      status: 'active',
      escalation_level: 0,
      urgent_resolution: false,
      created_at: '2025-01-29T10:00:00Z'
    },
    {
      id: 2,
      title: 'Noise Complaint',
      description: 'Excessive noise during quiet hours',
      conflict_type: 'interpersonal',
      severity: 'high',
      reporter_id: 4,
      reporter_name: 'Bob Wilson',
      involved_parties: [4, 5],
      involved_party_names: ['Bob Wilson', 'Alice Brown'],
      mediator_id: 1,
      mediator_name: 'Admin User',
      status: 'mediation',
      escalation_level: 1,
      urgent_resolution: true,
      created_at: '2025-01-29T09:00:00Z'
    }
  ];

  const mockUsers = [
    { id: 2, username: 'john_doe', role: 'resident', estate_id: 1 },
    { id: 3, username: 'jane_smith', role: 'resident', estate_id: 1 },
    { id: 4, username: 'bob_wilson', role: 'resident', estate_id: 1 },
    { id: 5, username: 'alice_brown', role: 'resident', estate_id: 1 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    collaborationService.getConflicts.mockResolvedValue({
      success: true,
      data: { conflicts: mockConflicts, pagination: { total: 2, page: 1, pages: 1 } }
    });
    
    collaborationService.getUsers.mockResolvedValue({
      success: true,
      data: { users: mockUsers }
    });
    
    collaborationService.createConflict.mockResolvedValue({
      success: true,
      data: { conflict: { id: 3, ...mockConflicts[0] } }
    });
    
    collaborationService.assignMediator.mockResolvedValue({
      success: true,
      data: { conflict: { ...mockConflicts[0], mediator_id: 1 } }
    });
    
    collaborationService.escalateConflict.mockResolvedValue({
      success: true,
      data: { conflict: { ...mockConflicts[0], escalation_level: 1 } }
    });
    
    collaborationService.resolveConflict.mockResolvedValue({
      success: true,
      data: { conflict: { ...mockConflicts[0], status: 'resolved' } }
    });
  });

  describe('Component Rendering', () => {
    test('should render conflict resolution with active and resolved sections', async () => {
      render(<ConflictResolution />);

      // Check for main sections
      expect(screen.getByText('Conflict Resolution')).toBeInTheDocument();
      expect(screen.getByText('Report Conflict')).toBeInTheDocument();
      
      // Wait for conflicts to load
      await waitFor(() => {
        expect(screen.getByText('Active Conflicts')).toBeInTheDocument();
        expect(screen.getByText('Recent Resolutions')).toBeInTheDocument();
      });
    });

    test('should display conflict list with correct information', async () => {
      render(<ConflictResolution />);

      await waitFor(() => {
        // Check conflict titles
        expect(screen.getByText('Parking Space Dispute')).toBeInTheDocument();
        expect(screen.getByText('Noise Complaint')).toBeInTheDocument();
        
        // Check reporter information
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
        
        // Check severity indicators
        expect(screen.getByText('Medium')).toBeInTheDocument();
        expect(screen.getByText('High')).toBeInTheDocument();
        
        // Check status indicators
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Mediation')).toBeInTheDocument();
      });
    });

    test('should show involved parties and mediator information', async () => {
      render(<ConflictResolution />);

      await waitFor(() => {
        // Check involved parties
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Alice Brown')).toBeInTheDocument();
        
        // Check mediator assignment
        expect(screen.getByText('Mediator: Admin User')).toBeInTheDocument();
        
        // Check urgent resolution indicator
        expect(screen.getByText('Urgent')).toBeInTheDocument();
      });
    });
  });

  describe('Conflict Reporting', () => {
    test('should allow reporting a new conflict', async () => {
      const user = userEvent.setup();
      
      render(<ConflictResolution />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Report Conflict')).toBeInTheDocument();
      });

      // Fill out the conflict form
      const titleInput = screen.getByLabelText('Conflict Title');
      const descriptionTextarea = screen.getByLabelText('Description');
      const conflictTypeSelect = screen.getByLabelText('Conflict Type');
      const severitySelect = screen.getByLabelText('Severity');
      const reportButton = screen.getByText('Report Conflict');

      await user.type(titleInput, 'Test Conflict');
      await user.type(descriptionTextarea, 'This is a test conflict description');
      await user.selectOptions(conflictTypeSelect, 'interpersonal');
      await user.selectOptions(severitySelect, 'high');
      
      await user.click(reportButton);

      // Verify the service was called with correct data
      await waitFor(() => {
        expect(collaborationService.createConflict).toHaveBeenCalledWith({
          title: 'Test Conflict',
          description: 'This is a test conflict description',
          conflictType: 'interpersonal',
          severity: 'high',
          involvedParties: [],
          requestedMediator: null,
          urgentResolution: false
        });
      });
    });

    test('should validate required fields before reporting conflict', async () => {
      const user = userEvent.setup();
      
      render(<ConflictResolution />);

      await waitFor(() => {
        expect(screen.getByText('Report Conflict')).toBeInTheDocument();
      });

      // Try to report without filling required fields
      const reportButton = screen.getByText('Report Conflict');
      await user.click(reportButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
        expect(screen.getByText('Description is required')).toBeInTheDocument();
        expect(screen.getByText('Conflict type is required')).toBeInTheDocument();
      });

      // Service should not be called
      expect(collaborationService.createConflict).not.toHaveBeenCalled();
    });

    test('should support selecting involved parties and mediator', async () => {
      const user = userEvent.setup();
      
      render(<ConflictResolution />);

      await waitFor(() => {
        expect(screen.getByLabelText('Involved Parties')).toBeInTheDocument();
      });

      // Select involved parties
      const involvedPartiesSelect = screen.getByLabelText('Involved Parties');
      await user.selectOptions(involvedPartiesSelect, ['2', '3']);

      // Select requested mediator
      const mediatorSelect = screen.getByLabelText('Requested Mediator');
      await user.selectOptions(mediatorSelect, '1');

      // Mark as urgent
      const urgentCheckbox = screen.getByLabelText('Urgent Resolution Required');
      await user.click(urgentCheckbox);

      // Fill other required fields and submit
      const titleInput = screen.getByLabelText('Conflict Title');
      const descriptionTextarea = screen.getByLabelText('Description');
      const conflictTypeSelect = screen.getByLabelText('Conflict Type');
      const reportButton = screen.getByText('Report Conflict');

      await user.type(titleInput, 'Complex Conflict');
      await user.type(descriptionTextarea, 'Complex conflict with multiple parties');
      await user.selectOptions(conflictTypeSelect, 'resource');
      await user.click(reportButton);

      // Verify correct data was sent
      await waitFor(() => {
        expect(collaborationService.createConflict).toHaveBeenCalledWith({
          title: 'Complex Conflict',
          description: 'Complex conflict with multiple parties',
          conflictType: 'resource',
          severity: 'medium', // default
          involvedParties: [2, 3],
          requestedMediator: 1,
          urgentResolution: true
        });
      });
    });
  });

  describe('Conflict Management Actions', () => {
    test('should allow assigning a mediator to a conflict', async () => {
      const user = userEvent.setup();
      
      render(<ConflictResolution />);

      await waitFor(() => {
        expect(screen.getByTestId('assign-mediator-1')).toBeInTheDocument();
      });

      // Click assign mediator button
      const assignButton = screen.getByTestId('assign-mediator-1');
      await user.click(assignButton);

      // Should show mediator selection dialog
      await waitFor(() => {
        expect(screen.getByText('Assign Mediator')).toBeInTheDocument();
        expect(screen.getByLabelText('Select Mediator')).toBeInTheDocument();
      });

      // Select mediator and confirm
      const mediatorSelect = screen.getByLabelText('Select Mediator');
      const confirmButton = screen.getByText('Assign Mediator');

      await user.selectOptions(mediatorSelect, '1');
      await user.click(confirmButton);

      // Should call assign mediator service
      await waitFor(() => {
        expect(collaborationService.assignMediator).toHaveBeenCalledWith(1, 1);
      });
    });

    test('should allow escalating a conflict', async () => {
      const user = userEvent.setup();
      
      render(<ConflictResolution />);

      await waitFor(() => {
        expect(screen.getByTestId('escalate-conflict-1')).toBeInTheDocument();
      });

      // Click escalate button
      const escalateButton = screen.getByTestId('escalate-conflict-1');
      await user.click(escalateButton);

      // Should show escalation confirmation dialog
      await waitFor(() => {
        expect(screen.getByText('Escalate Conflict')).toBeInTheDocument();
        expect(screen.getByLabelText('Escalation Reason')).toBeInTheDocument();
      });

      // Add reason and confirm
      const reasonTextarea = screen.getByLabelText('Escalation Reason');
      const confirmButton = screen.getByText('Escalate Conflict');

      await user.type(reasonTextarea, 'Unable to resolve at current level');
      await user.click(confirmButton);

      // Should call escalate service
      await waitFor(() => {
        expect(collaborationService.escalateConflict).toHaveBeenCalledWith({
          conflictId: 1,
          reason: 'Unable to resolve at current level',
          escalatedBy: 1
        });
      });
    });

    test('should allow resolving a conflict', async () => {
      const user = userEvent.setup();
      
      render(<ConflictResolution />);

      await waitFor(() => {
        expect(screen.getByTestId('resolve-conflict-2')).toBeInTheDocument();
      });

      // Click resolve button
      const resolveButton = screen.getByTestId('resolve-conflict-2');
      await user.click(resolveButton);

      // Should show resolution dialog
      await waitFor(() => {
        expect(screen.getByText('Resolve Conflict')).toBeInTheDocument();
        expect(screen.getByLabelText('Resolution Type')).toBeInTheDocument();
        expect(screen.getByLabelText('Resolution Notes')).toBeInTheDocument();
      });

      // Fill resolution details and confirm
      const resolutionTypeSelect = screen.getByLabelText('Resolution Type');
      const resolutionNotesTextarea = screen.getByLabelText('Resolution Notes');
      const confirmButton = screen.getByText('Resolve Conflict');

      await user.selectOptions(resolutionTypeSelect, 'agreement');
      await user.type(resolutionNotesTextarea, 'Parties reached mutual agreement');
      await user.click(confirmButton);

      // Should call resolve service
      await waitFor(() => {
        expect(collaborationService.resolveConflict).toHaveBeenCalledWith({
          conflictId: 2,
          resolutionType: 'agreement',
          resolutionNotes: 'Parties reached mutual agreement',
          resolvedBy: 1
        });
      });
    });

    test('should show conflict details in expandable view', async () => {
      const user = userEvent.setup();
      
      render(<ConflictResolution />);

      await waitFor(() => {
        expect(screen.getByTestId('expand-conflict-1')).toBeInTheDocument();
      });

      // Click to expand conflict details
      const expandButton = screen.getByTestId('expand-conflict-1');
      await user.click(expandButton);

      // Should show detailed conflict information
      await waitFor(() => {
        expect(screen.getByText('Conflict Details:')).toBeInTheDocument();
        expect(screen.getByText('Disagreement over assigned parking spaces')).toBeInTheDocument();
        expect(screen.getByText('Escalation Level: 0')).toBeInTheDocument();
      });
    });
  });

  describe('Escalation Management', () => {
    test('should display escalation level indicators', async () => {
      render(<ConflictResolution />);

      await waitFor(() => {
        // Check escalation level displays
        expect(screen.getByText('Level 0')).toBeInTheDocument();
        expect(screen.getByText('Level 1')).toBeInTheDocument();
      });
    });

    test('should show escalation history', async () => {
      const conflictWithHistory = {
        ...mockConflicts[1],
        escalation_history: [
          {
            escalated_by: 1,
            escalated_by_name: 'Admin User',
            escalation_level: 1,
            reason: 'Initial escalation due to urgency',
            created_at: '2025-01-29T09:30:00Z'
          }
        ]
      };

      collaborationService.getConflicts.mockResolvedValue({
        success: true,
        data: { conflicts: [conflictWithHistory], pagination: { total: 1, page: 1, pages: 1 } }
      });
      
      render(<ConflictResolution />);

      await waitFor(() => {
        expect(screen.getByText('Escalation History:')).toBeInTheDocument();
        expect(screen.getByText('Initial escalation due to urgency')).toBeInTheDocument();
      });
    });

    test('should handle automatic escalation rules', async () => {
      // Mock conflict that triggers automatic escalation
      const autoEscalationConflict = {
        ...mockConflicts[0],
        auto_escalation_triggered: true,
        next_escalation_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
      };

      collaborationService.getConflicts.mockResolvedValue({
        success: true,
        data: { conflicts: [autoEscalationConflict], pagination: { total: 1, page: 1, pages: 1 } }
      });
      
      render(<ConflictResolution />);

      await waitFor(() => {
        expect(screen.getByText('Auto-escalation scheduled')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Search', () => {
    test('should filter conflicts by status', async () => {
      const user = userEvent.setup();
      
      render(<ConflictResolution />);

      await waitFor(() => {
        expect(screen.getByLabelText('Filter by Status')).toBeInTheDocument();
      });

      // Filter by active status
      const statusFilter = screen.getByLabelText('Filter by Status');
      await user.selectOptions(statusFilter, 'active');

      // Should call service with filter
      await waitFor(() => {
        expect(collaborationService.getConflicts).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'active'
          })
        );
      });
    });

    test('should filter conflicts by severity', async () => {
      const user = userEvent.setup();
      
      render(<ConflictResolution />);

      await waitFor(() => {
        expect(screen.getByLabelText('Filter by Severity')).toBeInTheDocument();
      });

      // Filter by high severity
      const severityFilter = screen.getByLabelText('Filter by Severity');
      await user.selectOptions(severityFilter, 'high');

      // Should call service with filter
      await waitFor(() => {
        expect(collaborationService.getConflicts).toHaveBeenCalledWith(
          expect.objectContaining({
            severity: 'high'
          })
        );
      });
    });

    test('should search conflicts by title or description', async () => {
      const user = userEvent.setup();
      
      render(<ConflictResolution />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search conflicts...')).toBeInTheDocument();
      });

      // Enter search term
      const searchInput = screen.getByPlaceholderText('Search conflicts...');
      await user.type(searchInput, 'parking');

      // Should call service with search term
      await waitFor(() => {
        expect(collaborationService.getConflicts).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'parking'
          })
        );
      }, { timeout: 1000 });
    });

    test('should filter by urgent conflicts only', async () => {
      const user = userEvent.setup();
      
      render(<ConflictResolution />);

      await waitFor(() => {
        expect(screen.getByLabelText('Show Urgent Only')).toBeInTheDocument();
      });

      // Toggle urgent filter
      const urgentToggle = screen.getByLabelText('Show Urgent Only');
      await user.click(urgentToggle);

      // Should call service with urgent filter
      await waitFor(() => {
        expect(collaborationService.getConflicts).toHaveBeenCalledWith(
          expect.objectContaining({
            urgentOnly: true
          })
        );
      });
    });
  });

  describe('Role-Based Access', () => {
    test('should show appropriate actions based on user role', async () => {
      render(<ConflictResolution />);

      await waitFor(() => {
        // Admin should see all management actions
        expect(screen.getByTestId('assign-mediator-1')).toBeInTheDocument();
        expect(screen.getByTestId('escalate-conflict-1')).toBeInTheDocument();
        expect(screen.getByTestId('resolve-conflict-2')).toBeInTheDocument();
      });
    });

    test('should filter available mediators based on role permissions', async () => {
      render(<ConflictResolution />);

      await waitFor(() => {
        expect(collaborationService.getUsers).toHaveBeenCalledWith(
          expect.objectContaining({
            estateId: 1,
            roles: ['admin', 'guard'] // Only certain roles can be mediators
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle conflict loading errors gracefully', async () => {
      collaborationService.getConflicts.mockRejectedValue(new Error('Network error'));
      
      render(<ConflictResolution />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load conflicts. Please try again.')).toBeInTheDocument();
      });
    });

    test('should handle conflict reporting errors', async () => {
      collaborationService.createConflict.mockRejectedValue(new Error('Report failed'));
      const user = userEvent.setup();
      
      render(<ConflictResolution />);

      await waitFor(() => {
        expect(screen.getByText('Report Conflict')).toBeInTheDocument();
      });

      // Fill and submit form
      const titleInput = screen.getByLabelText('Conflict Title');
      const descriptionTextarea = screen.getByLabelText('Description');
      const conflictTypeSelect = screen.getByLabelText('Conflict Type');
      const reportButton = screen.getByText('Report Conflict');

      await user.type(titleInput, 'Test Conflict');
      await user.type(descriptionTextarea, 'Test Description');
      await user.selectOptions(conflictTypeSelect, 'interpersonal');
      await user.click(reportButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to report conflict. Please try again.')).toBeInTheDocument();
      });
    });

    test('should handle empty conflict list', async () => {
      collaborationService.getConflicts.mockResolvedValue({
        success: true,
        data: { conflicts: [], pagination: { total: 0, page: 1, pages: 0 } }
      });
      
      render(<ConflictResolution />);

      await waitFor(() => {
        expect(screen.getByText('No conflicts found')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async () => {
      render(<ConflictResolution />);

      await waitFor(() => {
        // Check for proper ARIA labels
        expect(screen.getByLabelText('Conflict Title')).toBeInTheDocument();
        expect(screen.getByLabelText('Description')).toBeInTheDocument();
        expect(screen.getByLabelText('Conflict Type')).toBeInTheDocument();
        
        // Check for proper roles
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('form')).toBeInTheDocument();
      });
    });

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<ConflictResolution />);

      await waitFor(() => {
        expect(screen.getByLabelText('Conflict Title')).toBeInTheDocument();
      });

      // Tab through form elements
      const titleInput = screen.getByLabelText('Conflict Title');
      const descriptionTextarea = screen.getByLabelText('Description');
      const conflictTypeSelect = screen.getByLabelText('Conflict Type');

      titleInput.focus();
      expect(document.activeElement).toBe(titleInput);

      await user.tab();
      expect(document.activeElement).toBe(descriptionTextarea);

      await user.tab();
      expect(document.activeElement).toBe(conflictTypeSelect);
    });

    test('should announce conflict status changes to screen readers', async () => {
      render(<ConflictResolution />);

      await waitFor(() => {
        // Check for ARIA live regions for status updates
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });
  });
});