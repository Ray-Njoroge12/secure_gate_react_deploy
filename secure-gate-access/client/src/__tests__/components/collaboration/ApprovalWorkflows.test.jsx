import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ApprovalWorkflows from '../../../components/collaboration/ApprovalWorkflows';
import * as collaborationService from '../../../services/collaborationService';

// Mock the collaboration service — expose methods both as direct exports (for test access via * as)
// and on the collaborationService named export (for component access via { collaborationService })
jest.mock('../../../services/collaborationService', () => {
  const mockMethods = {
    getApprovalWorkflows: jest.fn(),
    createApprovalWorkflow: jest.fn(),
    approveWorkflowStep: jest.fn(),
    rejectWorkflowStep: jest.fn(),
    processApprovalStep: jest.fn(),
    getUsers: jest.fn(),
  };
  return {
    __esModule: true,
    ...mockMethods,
    collaborationService: mockMethods,
    default: mockMethods,
  };
});

// Mock auth context
const mockUser = {
  id: 1,
  role: 'admin',
  estate_id: 1,
  username: 'admin_user'
};

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser })
}));

jest.mock('../../../contexts/NotificationContext', () => ({
  useNotification: () => ({ showNotification: jest.fn() })
}));

// Wrapper providing react-query context for components using useQuery/useMutation
const renderWithProviders = (ui) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('ApprovalWorkflows', () => {
  const mockWorkflows = [
    {
      id: 1,
      workflow_name: 'Visitor Approval Process',
      workflow_type: 'visitor_approval',
      description: 'Standard visitor approval workflow',
      entity_type: 'visitor',
      entity_id: '123',
      requested_by: 2,
      requester_name: 'John Doe',
      status: 'pending',
      current_step: 0,
      approval_steps: [
        {
          step_order: 1,
          step_name: 'Security Review',
          approver_role: 'guard',
          required: true,
          status: 'pending'
        },
        {
          step_order: 2,
          step_name: 'Admin Approval',
          approver_role: 'admin',
          required: true,
          status: 'pending'
        }
      ],
      created_at: '2025-01-29T10:00:00Z',
      expires_at: '2025-01-30T10:00:00Z'
    },
    {
      id: 2,
      workflow_name: 'User Registration Approval',
      workflow_type: 'user_registration',
      description: 'New user registration approval',
      entity_type: 'user',
      entity_id: '456',
      requested_by: 3,
      requester_name: 'Jane Smith',
      status: 'approved',
      current_step: 2,
      approval_steps: [
        {
          step_order: 1,
          step_name: 'Document Verification',
          approver_role: 'admin',
          required: true,
          status: 'approved',
          approved_at: '2025-01-29T11:00:00Z'
        },
        {
          step_order: 2,
          step_name: 'Final Approval',
          approver_role: 'admin',
          required: true,
          status: 'approved',
          approved_at: '2025-01-29T11:30:00Z'
        }
      ],
      created_at: '2025-01-29T09:00:00Z',
      approved_at: '2025-01-29T11:30:00Z'
    }
  ];

  const mockUsers = [
    { id: 2, username: 'john_doe', role: 'resident', estate_id: 1 },
    { id: 3, username: 'jane_smith', role: 'guard', estate_id: 1 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    collaborationService.getApprovalWorkflows.mockResolvedValue({
      success: true,
      data: { workflows: mockWorkflows, pagination: { total: 2, page: 1, pages: 1 } }
    });
    
    collaborationService.getUsers.mockResolvedValue({
      success: true,
      data: { users: mockUsers }
    });
    
    collaborationService.createApprovalWorkflow.mockResolvedValue({
      success: true,
      data: { workflow: { id: 3, ...mockWorkflows[0] } }
    });
    
    collaborationService.approveWorkflowStep.mockResolvedValue({
      success: true,
      data: { workflow: { ...mockWorkflows[0], status: 'approved' } }
    });
    
    collaborationService.rejectWorkflowStep.mockResolvedValue({
      success: true,
      data: { workflow: { ...mockWorkflows[0], status: 'rejected' } }
    });
  });

  describe('Component Rendering', () => {
    test('should render approval workflows with pending and completed sections', async () => {
      renderWithProviders(<ApprovalWorkflows />);

      // Check for main sections
      expect(screen.getByText('Approval Workflows')).toBeInTheDocument();
      expect(screen.getByText('Create Workflow')).toBeInTheDocument();
      
      // Wait for workflows to load
      await waitFor(() => {
        expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
        expect(screen.getByText('Recent Workflows')).toBeInTheDocument();
      });
    });

    test('should display workflow list with correct information', async () => {
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        // Check workflow names
        expect(screen.getByText('Visitor Approval Process')).toBeInTheDocument();
        expect(screen.getByText('User Registration Approval')).toBeInTheDocument();
        
        // Check requester information
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        
        // Check status indicators
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Approved')).toBeInTheDocument();
      });
    });

    test('should show approval steps with progress indicators', async () => {
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        // Check step names
        expect(screen.getByText('Security Review')).toBeInTheDocument();
        expect(screen.getByText('Admin Approval')).toBeInTheDocument();
        expect(screen.getByText('Document Verification')).toBeInTheDocument();
        expect(screen.getByText('Final Approval')).toBeInTheDocument();
      });
    });
  });

  describe('Workflow Creation', () => {
    test('should allow creating a new approval workflow', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<ApprovalWorkflows />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Create Workflow')).toBeInTheDocument();
      });

      // Fill out the workflow form
      const workflowNameInput = screen.getByLabelText('Workflow Name');
      const workflowTypeSelect = screen.getByLabelText('Workflow Type');
      const descriptionTextarea = screen.getByLabelText('Description');
      const entityTypeSelect = screen.getByLabelText('Entity Type');
      const entityIdInput = screen.getByLabelText('Entity ID');
      const createButton = screen.getByText('Create Workflow');

      await user.type(workflowNameInput, 'Test Approval Workflow');
      await user.selectOptions(workflowTypeSelect, 'visitor_approval');
      await user.type(descriptionTextarea, 'Test workflow description');
      await user.selectOptions(entityTypeSelect, 'visitor');
      await user.type(entityIdInput, '789');
      
      await user.click(createButton);

      // Verify the service was called with correct data
      await waitFor(() => {
        expect(collaborationService.createApprovalWorkflow).toHaveBeenCalledWith({
          workflowName: 'Test Approval Workflow',
          workflowType: 'visitor_approval',
          description: 'Test workflow description',
          entityType: 'visitor',
          entityId: '789',
          approvalSteps: expect.any(Array),
          expiresAt: expect.any(String)
        });
      });
    });

    test('should validate required fields before creating workflow', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        expect(screen.getByText('Create Workflow')).toBeInTheDocument();
      });

      // Try to create without filling required fields
      const createButton = screen.getByText('Create Workflow');
      await user.click(createButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText('Workflow name is required')).toBeInTheDocument();
        expect(screen.getByText('Workflow type is required')).toBeInTheDocument();
        expect(screen.getByText('Entity type is required')).toBeInTheDocument();
        expect(screen.getByText('Entity ID is required')).toBeInTheDocument();
      });

      // Service should not be called
      expect(collaborationService.createApprovalWorkflow).not.toHaveBeenCalled();
    });

    test('should allow configuring approval steps', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        expect(screen.getByText('Add Approval Step')).toBeInTheDocument();
      });

      // Add first approval step
      const addStepButton = screen.getByText('Add Approval Step');
      await user.click(addStepButton);

      // Fill step details
      const stepNameInput = screen.getByLabelText('Step Name');
      const approverRoleSelect = screen.getByLabelText('Approver Role');
      const requiredCheckbox = screen.getByLabelText('Required');

      await user.type(stepNameInput, 'Initial Review');
      await user.selectOptions(approverRoleSelect, 'guard');
      await user.click(requiredCheckbox);

      // Add second step
      await user.click(addStepButton);
      
      // Should have two steps configured
      expect(screen.getAllByLabelText('Step Name')).toHaveLength(2);
    });
  });

  describe('Workflow Actions', () => {
    test('should allow approving a workflow step', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        expect(screen.getByTestId('approve-step-1-0')).toBeInTheDocument();
      });

      // Click approve button for first step
      const approveButton = screen.getByTestId('approve-step-1-0');
      await user.click(approveButton);

      // Should show approval confirmation dialog
      await waitFor(() => {
        expect(screen.getByText('Approve Step')).toBeInTheDocument();
        expect(screen.getByLabelText('Comments')).toBeInTheDocument();
      });

      // Add comments and confirm
      const commentsTextarea = screen.getByLabelText('Comments');
      const confirmButton = screen.getByText('Confirm Approval');

      await user.type(commentsTextarea, 'Approved after review');
      await user.click(confirmButton);

      // Should call approve service
      await waitFor(() => {
        expect(collaborationService.approveWorkflowStep).toHaveBeenCalledWith({
          workflowId: 1,
          stepOrder: 1,
          comments: 'Approved after review'
        });
      });
    });

    test('should allow rejecting a workflow step', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        expect(screen.getByTestId('reject-step-1-0')).toBeInTheDocument();
      });

      // Click reject button
      const rejectButton = screen.getByTestId('reject-step-1-0');
      await user.click(rejectButton);

      // Should show rejection confirmation dialog
      await waitFor(() => {
        expect(screen.getByText('Reject Step')).toBeInTheDocument();
        expect(screen.getByLabelText('Rejection Reason')).toBeInTheDocument();
      });

      // Add reason and confirm
      const reasonTextarea = screen.getByLabelText('Rejection Reason');
      const confirmButton = screen.getByText('Confirm Rejection');

      await user.type(reasonTextarea, 'Insufficient documentation');
      await user.click(confirmButton);

      // Should call reject service
      await waitFor(() => {
        expect(collaborationService.rejectWorkflowStep).toHaveBeenCalledWith({
          workflowId: 1,
          stepOrder: 1,
          rejectionReason: 'Insufficient documentation'
        });
      });
    });

    test('should show workflow details in expandable view', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        expect(screen.getByTestId('expand-workflow-1')).toBeInTheDocument();
      });

      // Click to expand workflow details
      const expandButton = screen.getByTestId('expand-workflow-1');
      await user.click(expandButton);

      // Should show detailed workflow information
      await waitFor(() => {
        expect(screen.getByText('Workflow Details:')).toBeInTheDocument();
        expect(screen.getByText('Standard visitor approval workflow')).toBeInTheDocument();
        expect(screen.getByText('Expires:')).toBeInTheDocument();
      });
    });
  });

  describe('Status Tracking', () => {
    test('should display workflow progress correctly', async () => {
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        // Check progress indicators
        expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
        expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
        
        // Check step statuses
        expect(screen.getAllByText('Pending')).toHaveLength(2); // Two pending steps in first workflow
        expect(screen.getAllByText('Approved')).toHaveLength(2); // Two approved steps in second workflow
      });
    });

    test('should show expiration warnings for workflows', async () => {
      // Mock workflow expiring soon
      const expiringWorkflow = {
        ...mockWorkflows[0],
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
      };

      collaborationService.getApprovalWorkflows.mockResolvedValue({
        success: true,
        data: { workflows: [expiringWorkflow], pagination: { total: 1, page: 1, pages: 1 } }
      });
      
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        expect(screen.getByText('Expires Soon')).toBeInTheDocument();
      });
    });

    test('should handle expired workflows', async () => {
      // Mock expired workflow
      const expiredWorkflow = {
        ...mockWorkflows[0],
        status: 'expired',
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
      };

      collaborationService.getApprovalWorkflows.mockResolvedValue({
        success: true,
        data: { workflows: [expiredWorkflow], pagination: { total: 1, page: 1, pages: 1 } }
      });
      
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        expect(screen.getByText('Expired')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Search', () => {
    test('should filter workflows by status', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        expect(screen.getByLabelText('Filter by Status')).toBeInTheDocument();
      });

      // Filter by pending status
      const statusFilter = screen.getByLabelText('Filter by Status');
      await user.selectOptions(statusFilter, 'pending');

      // Should call service with filter
      await waitFor(() => {
        expect(collaborationService.getApprovalWorkflows).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'pending'
          })
        );
      });
    });

    test('should filter workflows by type', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        expect(screen.getByLabelText('Filter by Type')).toBeInTheDocument();
      });

      // Filter by visitor approval
      const typeFilter = screen.getByLabelText('Filter by Type');
      await user.selectOptions(typeFilter, 'visitor_approval');

      // Should call service with filter
      await waitFor(() => {
        expect(collaborationService.getApprovalWorkflows).toHaveBeenCalledWith(
          expect.objectContaining({
            workflowType: 'visitor_approval'
          })
        );
      });
    });

    test('should search workflows by name or description', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search workflows...')).toBeInTheDocument();
      });

      // Enter search term
      const searchInput = screen.getByPlaceholderText('Search workflows...');
      await user.type(searchInput, 'visitor');

      // Should call service with search term
      await waitFor(() => {
        expect(collaborationService.getApprovalWorkflows).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'visitor'
          })
        );
      }, { timeout: 1000 });
    });
  });

  describe('Role-Based Access', () => {
    test('should show appropriate actions based on user role and step requirements', async () => {
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        // Admin should see create workflow form
        expect(screen.getByText('Create Workflow')).toBeInTheDocument();
        
        // Should see approve/reject buttons for admin steps
        expect(screen.getByTestId('approve-step-1-1')).toBeInTheDocument(); // Admin step
        expect(screen.getByTestId('reject-step-1-1')).toBeInTheDocument();
      });
    });

    test('should disable actions for steps not assigned to current user role', async () => {
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        // Guard step should be disabled for admin user (if not cross-role approval)
        const guardStepButton = screen.getByTestId('approve-step-1-0');
        expect(guardStepButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle workflow loading errors gracefully', async () => {
      collaborationService.getApprovalWorkflows.mockRejectedValue(new Error('Network error'));
      
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load workflows. Please try again.')).toBeInTheDocument();
      });
    });

    test('should handle workflow creation errors', async () => {
      collaborationService.createApprovalWorkflow.mockRejectedValue(new Error('Creation failed'));
      const user = userEvent.setup();
      
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        expect(screen.getByText('Create Workflow')).toBeInTheDocument();
      });

      // Fill and submit form
      const workflowNameInput = screen.getByLabelText('Workflow Name');
      const workflowTypeSelect = screen.getByLabelText('Workflow Type');
      const entityTypeSelect = screen.getByLabelText('Entity Type');
      const entityIdInput = screen.getByLabelText('Entity ID');
      const createButton = screen.getByText('Create Workflow');

      await user.type(workflowNameInput, 'Test Workflow');
      await user.selectOptions(workflowTypeSelect, 'visitor_approval');
      await user.selectOptions(entityTypeSelect, 'visitor');
      await user.type(entityIdInput, '123');
      await user.click(createButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to create workflow. Please try again.')).toBeInTheDocument();
      });
    });

    test('should handle approval action errors', async () => {
      collaborationService.approveWorkflowStep.mockRejectedValue(new Error('Approval failed'));
      const user = userEvent.setup();
      
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        expect(screen.getByTestId('approve-step-1-1')).toBeInTheDocument();
      });

      // Try to approve step
      const approveButton = screen.getByTestId('approve-step-1-1');
      await user.click(approveButton);

      const confirmButton = await screen.findByText('Confirm Approval');
      await user.click(confirmButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to approve step. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async () => {
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        // Check for proper ARIA labels
        expect(screen.getByLabelText('Workflow Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Workflow Type')).toBeInTheDocument();
        expect(screen.getByLabelText('Entity Type')).toBeInTheDocument();
        
        // Check for proper roles
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('form')).toBeInTheDocument();
      });
    });

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        expect(screen.getByLabelText('Workflow Name')).toBeInTheDocument();
      });

      // Tab through form elements
      const workflowNameInput = screen.getByLabelText('Workflow Name');
      const workflowTypeSelect = screen.getByLabelText('Workflow Type');
      const descriptionTextarea = screen.getByLabelText('Description');

      workflowNameInput.focus();
      expect(document.activeElement).toBe(workflowNameInput);

      await user.tab();
      expect(document.activeElement).toBe(workflowTypeSelect);

      await user.tab();
      expect(document.activeElement).toBe(descriptionTextarea);
    });

    test('should announce workflow status changes to screen readers', async () => {
      renderWithProviders(<ApprovalWorkflows />);

      await waitFor(() => {
        // Check for ARIA live regions for status updates
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });
  });
});