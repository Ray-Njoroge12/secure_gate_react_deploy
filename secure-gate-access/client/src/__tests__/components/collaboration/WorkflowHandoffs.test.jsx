import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import WorkflowHandoffs from '../../../components/collaboration/WorkflowHandoffs';
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

describe('WorkflowHandoffs', () => {
  const mockHandoffs = [
    {
      id: 1,
      from_user_id: 2,
      from_user_name: 'John Doe',
      from_role: 'resident',
      to_user_id: 1,
      to_user_name: 'Admin User',
      to_role: 'admin',
      workflow_type: 'visitor_approval',
      entity_type: 'visitor',
      entity_id: '123',
      context_data: {
        visitor_name: 'Jane Smith',
        expected_arrival: '2025-01-29T14:00:00Z',
        purpose: 'Meeting'
      },
      handoff_notes: 'Please review and approve this visitor',
      priority: 'normal',
      status: 'pending',
      created_at: '2025-01-29T10:00:00Z'
    },
    {
      id: 2,
      from_user_id: 1,
      from_user_name: 'Admin User',
      from_role: 'admin',
      to_user_id: 3,
      to_user_name: 'Security Guard',
      to_role: 'guard',
      workflow_type: 'incident_escalation',
      entity_type: 'incident',
      entity_id: '456',
      context_data: {
        incident_type: 'security',
        severity: 'high',
        description: 'Unauthorized access attempt'
      },
      handoff_notes: 'Urgent: Please investigate immediately',
      priority: 'urgent',
      status: 'accepted',
      accepted_at: '2025-01-29T10:30:00Z',
      created_at: '2025-01-29T10:00:00Z'
    }
  ];

  const mockUsers = [
    { id: 2, username: 'john_doe', role: 'resident', estate_id: 1 },
    { id: 3, username: 'security_guard', role: 'guard', estate_id: 1 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    collaborationService.getWorkflowHandoffs.mockResolvedValue({
      success: true,
      data: { handoffs: mockHandoffs, pagination: { total: 2, page: 1, pages: 1 } }
    });
    
    collaborationService.getUsers.mockResolvedValue({
      success: true,
      data: { users: mockUsers }
    });
    
    collaborationService.createWorkflowHandoff.mockResolvedValue({
      success: true,
      data: { handoff: { id: 3, ...mockHandoffs[0] } }
    });
    
    collaborationService.acceptWorkflowHandoff.mockResolvedValue({
      success: true,
      data: { handoff: { ...mockHandoffs[0], status: 'accepted' } }
    });
    
    collaborationService.completeWorkflowHandoff.mockResolvedValue({
      success: true,
      data: { handoff: { ...mockHandoffs[0], status: 'completed' } }
    });
  });

  describe('Component Rendering', () => {
    test('should render workflow handoffs with pending and completed sections', async () => {
      render(<WorkflowHandoffs />);

      // Check for main sections
      expect(screen.getByText('Workflow Handoffs')).toBeInTheDocument();
      expect(screen.getByText('Create Handoff')).toBeInTheDocument();
      
      // Wait for handoffs to load
      await waitFor(() => {
        expect(screen.getByText('Pending Handoffs')).toBeInTheDocument();
        expect(screen.getByText('Recent Handoffs')).toBeInTheDocument();
      });
    });

    test('should display handoff list with correct information', async () => {
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        // Check handoff details
        expect(screen.getByText('visitor_approval')).toBeInTheDocument();
        expect(screen.getByText('incident_escalation')).toBeInTheDocument();
        
        // Check user information
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Security Guard')).toBeInTheDocument();
        
        // Check priority indicators
        expect(screen.getByText('Urgent')).toBeInTheDocument();
        expect(screen.getByText('Normal')).toBeInTheDocument();
      });
    });

    test('should show context data for each handoff', async () => {
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        // Check visitor context
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Meeting')).toBeInTheDocument();
        
        // Check incident context
        expect(screen.getByText('Unauthorized access attempt')).toBeInTheDocument();
        expect(screen.getByText('High Severity')).toBeInTheDocument();
      });
    });
  });

  describe('Handoff Creation', () => {
    test('should allow creating a new workflow handoff', async () => {
      const user = userEvent.setup();
      
      render(<WorkflowHandoffs />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Create Handoff')).toBeInTheDocument();
      });

      // Fill out the handoff form
      const recipientSelect = screen.getByLabelText('Handoff To');
      const workflowTypeSelect = screen.getByLabelText('Workflow Type');
      const entityTypeSelect = screen.getByLabelText('Entity Type');
      const entityIdInput = screen.getByLabelText('Entity ID');
      const notesTextarea = screen.getByLabelText('Handoff Notes');
      const createButton = screen.getByText('Create Handoff');

      await user.selectOptions(recipientSelect, '3');
      await user.selectOptions(workflowTypeSelect, 'visitor_approval');
      await user.selectOptions(entityTypeSelect, 'visitor');
      await user.type(entityIdInput, '789');
      await user.type(notesTextarea, 'Please handle this visitor approval');
      
      await user.click(createButton);

      // Verify the service was called with correct data
      await waitFor(() => {
        expect(collaborationService.createWorkflowHandoff).toHaveBeenCalledWith({
          toUserId: 3,
          workflowType: 'visitor_approval',
          entityType: 'visitor',
          entityId: '789',
          contextData: {},
          handoffNotes: 'Please handle this visitor approval',
          priority: 'normal'
        });
      });
    });

    test('should validate required fields before creating handoff', async () => {
      const user = userEvent.setup();
      
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        expect(screen.getByText('Create Handoff')).toBeInTheDocument();
      });

      // Try to create without filling required fields
      const createButton = screen.getByText('Create Handoff');
      await user.click(createButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText('Recipient is required')).toBeInTheDocument();
        expect(screen.getByText('Workflow type is required')).toBeInTheDocument();
        expect(screen.getByText('Entity type is required')).toBeInTheDocument();
        expect(screen.getByText('Entity ID is required')).toBeInTheDocument();
      });

      // Service should not be called
      expect(collaborationService.createWorkflowHandoff).not.toHaveBeenCalled();
    });

    test('should support different workflow types and priorities', async () => {
      const user = userEvent.setup();
      
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        expect(screen.getByLabelText('Workflow Type')).toBeInTheDocument();
      });

      // Select incident escalation workflow
      const workflowTypeSelect = screen.getByLabelText('Workflow Type');
      await user.selectOptions(workflowTypeSelect, 'incident_escalation');

      // Select high priority
      const prioritySelect = screen.getByLabelText('Priority');
      await user.selectOptions(prioritySelect, 'high');

      // Fill other required fields
      const recipientSelect = screen.getByLabelText('Handoff To');
      const entityTypeSelect = screen.getByLabelText('Entity Type');
      const entityIdInput = screen.getByLabelText('Entity ID');
      const notesTextarea = screen.getByLabelText('Handoff Notes');

      await user.selectOptions(recipientSelect, '3');
      await user.selectOptions(entityTypeSelect, 'incident');
      await user.type(entityIdInput, '999');
      await user.type(notesTextarea, 'Urgent incident escalation');
      
      const createButton = screen.getByText('Create Handoff');
      await user.click(createButton);

      // Verify correct workflow type and priority
      await waitFor(() => {
        expect(collaborationService.createWorkflowHandoff).toHaveBeenCalledWith({
          toUserId: 3,
          workflowType: 'incident_escalation',
          entityType: 'incident',
          entityId: '999',
          contextData: {},
          handoffNotes: 'Urgent incident escalation',
          priority: 'high'
        });
      });
    });
  });

  describe('Handoff Actions', () => {
    test('should allow accepting a pending handoff', async () => {
      const user = userEvent.setup();
      
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        expect(screen.getByText('visitor_approval')).toBeInTheDocument();
      });

      // Click accept button for pending handoff
      const acceptButton = screen.getByTestId('accept-handoff-1');
      await user.click(acceptButton);

      // Should call accept service
      await waitFor(() => {
        expect(collaborationService.acceptWorkflowHandoff).toHaveBeenCalledWith(1);
      });
    });

    test('should allow completing an accepted handoff', async () => {
      const user = userEvent.setup();
      
      // Mock handoff with accepted status
      const acceptedHandoff = { ...mockHandoffs[0], status: 'accepted' };
      collaborationService.getWorkflowHandoffs.mockResolvedValue({
        success: true,
        data: { handoffs: [acceptedHandoff], pagination: { total: 1, page: 1, pages: 1 } }
      });
      
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        expect(screen.getByTestId('complete-handoff-1')).toBeInTheDocument();
      });

      // Click complete button
      const completeButton = screen.getByTestId('complete-handoff-1');
      await user.click(completeButton);

      // Should call complete service
      await waitFor(() => {
        expect(collaborationService.completeWorkflowHandoff).toHaveBeenCalledWith(1);
      });
    });

    test('should show handoff details in expandable view', async () => {
      const user = userEvent.setup();
      
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        expect(screen.getByTestId('expand-handoff-1')).toBeInTheDocument();
      });

      // Click to expand handoff details
      const expandButton = screen.getByTestId('expand-handoff-1');
      await user.click(expandButton);

      // Should show detailed context data
      await waitFor(() => {
        expect(screen.getByText('Context Data:')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Meeting')).toBeInTheDocument();
      });
    });
  });

  describe('Context Preservation', () => {
    test('should display preserved context data correctly', async () => {
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        // Check visitor context preservation
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Meeting')).toBeInTheDocument();
        
        // Check incident context preservation
        expect(screen.getByText('Unauthorized access attempt')).toBeInTheDocument();
      });
    });

    test('should handle complex context data structures', async () => {
      const complexHandoff = {
        ...mockHandoffs[0],
        context_data: {
          visitor: {
            name: 'Complex Visitor',
            details: {
              company: 'Test Corp',
              purpose: 'Business Meeting',
              duration: '2 hours'
            }
          },
          metadata: {
            source: 'mobile_app',
            timestamp: '2025-01-29T10:00:00Z'
          }
        }
      };

      collaborationService.getWorkflowHandoffs.mockResolvedValue({
        success: true,
        data: { handoffs: [complexHandoff], pagination: { total: 1, page: 1, pages: 1 } }
      });
      
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        expect(screen.getByText('Complex Visitor')).toBeInTheDocument();
        expect(screen.getByText('Test Corp')).toBeInTheDocument();
        expect(screen.getByText('Business Meeting')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Search', () => {
    test('should filter handoffs by status', async () => {
      const user = userEvent.setup();
      
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        expect(screen.getByLabelText('Filter by Status')).toBeInTheDocument();
      });

      // Filter by pending status
      const statusFilter = screen.getByLabelText('Filter by Status');
      await user.selectOptions(statusFilter, 'pending');

      // Should call service with filter
      await waitFor(() => {
        expect(collaborationService.getWorkflowHandoffs).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'pending'
          })
        );
      });
    });

    test('should filter handoffs by workflow type', async () => {
      const user = userEvent.setup();
      
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        expect(screen.getByLabelText('Filter by Type')).toBeInTheDocument();
      });

      // Filter by visitor approval
      const typeFilter = screen.getByLabelText('Filter by Type');
      await user.selectOptions(typeFilter, 'visitor_approval');

      // Should call service with filter
      await waitFor(() => {
        expect(collaborationService.getWorkflowHandoffs).toHaveBeenCalledWith(
          expect.objectContaining({
            workflowType: 'visitor_approval'
          })
        );
      });
    });

    test('should search handoffs by entity ID or notes', async () => {
      const user = userEvent.setup();
      
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search handoffs...')).toBeInTheDocument();
      });

      // Enter search term
      const searchInput = screen.getByPlaceholderText('Search handoffs...');
      await user.type(searchInput, 'visitor');

      // Should call service with search term
      await waitFor(() => {
        expect(collaborationService.getWorkflowHandoffs).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'visitor'
          })
        );
      }, { timeout: 1000 });
    });
  });

  describe('Role-Based Access', () => {
    test('should show appropriate actions based on user role', async () => {
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        // Admin should see create handoff form
        expect(screen.getByText('Create Handoff')).toBeInTheDocument();
        
        // Should see accept/complete buttons for relevant handoffs
        expect(screen.getByTestId('accept-handoff-1')).toBeInTheDocument();
      });
    });

    test('should filter handoff recipients based on role permissions', async () => {
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        expect(collaborationService.getUsers).toHaveBeenCalledWith(
          expect.objectContaining({
            estateId: 1,
            excludeCurrentUser: true
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle handoff loading errors gracefully', async () => {
      collaborationService.getWorkflowHandoffs.mockRejectedValue(new Error('Network error'));
      
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load handoffs. Please try again.')).toBeInTheDocument();
      });
    });

    test('should handle handoff creation errors', async () => {
      collaborationService.createWorkflowHandoff.mockRejectedValue(new Error('Creation failed'));
      const user = userEvent.setup();
      
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        expect(screen.getByText('Create Handoff')).toBeInTheDocument();
      });

      // Fill and submit form
      const recipientSelect = screen.getByLabelText('Handoff To');
      const workflowTypeSelect = screen.getByLabelText('Workflow Type');
      const entityTypeSelect = screen.getByLabelText('Entity Type');
      const entityIdInput = screen.getByLabelText('Entity ID');
      const createButton = screen.getByText('Create Handoff');

      await user.selectOptions(recipientSelect, '3');
      await user.selectOptions(workflowTypeSelect, 'visitor_approval');
      await user.selectOptions(entityTypeSelect, 'visitor');
      await user.type(entityIdInput, '123');
      await user.click(createButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to create handoff. Please try again.')).toBeInTheDocument();
      });
    });

    test('should handle empty handoff list', async () => {
      collaborationService.getWorkflowHandoffs.mockResolvedValue({
        success: true,
        data: { handoffs: [], pagination: { total: 0, page: 1, pages: 0 } }
      });
      
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        expect(screen.getByText('No handoffs found')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async () => {
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        // Check for proper ARIA labels
        expect(screen.getByLabelText('Handoff To')).toBeInTheDocument();
        expect(screen.getByLabelText('Workflow Type')).toBeInTheDocument();
        expect(screen.getByLabelText('Entity Type')).toBeInTheDocument();
        
        // Check for proper roles
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('form')).toBeInTheDocument();
      });
    });

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<WorkflowHandoffs />);

      await waitFor(() => {
        expect(screen.getByLabelText('Handoff To')).toBeInTheDocument();
      });

      // Tab through form elements
      const recipientSelect = screen.getByLabelText('Handoff To');
      const workflowTypeSelect = screen.getByLabelText('Workflow Type');
      const entityTypeSelect = screen.getByLabelText('Entity Type');

      recipientSelect.focus();
      expect(document.activeElement).toBe(recipientSelect);

      await user.tab();
      expect(document.activeElement).toBe(workflowTypeSelect);

      await user.tab();
      expect(document.activeElement).toBe(entityTypeSelect);
    });
  });
});