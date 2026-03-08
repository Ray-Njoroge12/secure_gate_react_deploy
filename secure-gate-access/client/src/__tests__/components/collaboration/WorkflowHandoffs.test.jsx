import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkflowHandoffs from '../../../components/collaboration/WorkflowHandoffs';
import { collaborationService } from '../../../services/collaborationService';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';

jest.mock('../../../services/collaborationService', () => {
  const mockService = {
    getWorkflowHandoffs: jest.fn(),
    acceptWorkflowHandoff: jest.fn(),
    createWorkflowHandoff: jest.fn(),
    getAvailableRecipients: jest.fn()
  };
  return { collaborationService: mockService, default: mockService };
});

jest.mock('../../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../contexts/NotificationContext', () => ({ useNotification: jest.fn() }));

const mockUser = { id: 1, role: 'admin', estate_id: 1, username: 'admin_user' };
const mockShowNotification = jest.fn();
const mockHandoffs = [{
  id: 1, from_user_id: 2, from_username: 'John Doe', from_role: 'resident',
  to_user_id: 1, to_username: 'Admin User', to_role: 'admin',
  workflow_type: 'visitor_approval', entity_type: 'visitor', entity_id: '123',
  context_data: { visitor_name: 'Jane Smith', purpose: 'Meeting' },
  handoff_notes: 'Please review and approve this visitor', priority: 'normal',
  status: 'pending', created_at: '2025-01-29T10:00:00Z'
}];
const mockRecipients = [{ id: 3, username: 'security_guard', role: 'guard' }];

const renderWorkflowHandoffs = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false }
  } })}>
    <WorkflowHandoffs />
  </QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: mockUser });
  useNotification.mockReturnValue({ showNotification: mockShowNotification });
  collaborationService.getWorkflowHandoffs.mockResolvedValue({ handoffs: mockHandoffs, pagination: { total: 1 } });
  collaborationService.getAvailableRecipients.mockResolvedValue({ users: mockRecipients });
  collaborationService.acceptWorkflowHandoff.mockResolvedValue({ success: true });
  collaborationService.createWorkflowHandoff.mockResolvedValue({ success: true });
});

describe('WorkflowHandoffs', () => {
  test('renders tabs and current handoffs', async () => {
    renderWorkflowHandoffs();
    expect(screen.getByText('Workflow Handoffs')).toBeInTheDocument();
    expect(await screen.findByText('visitor_approval')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Received/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sent/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All Handoffs/i })).toBeInTheDocument();
  });

  test('shows selected handoff details', async () => {
    const user = userEvent.setup();
    renderWorkflowHandoffs();
    await user.click(await screen.findByRole('button', { name: /John Doe/i }));
    expect(await screen.findByText('Handoff Notes')).toBeInTheDocument();
    expect(screen.getByText('Please review and approve this visitor')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('accepts a pending handoff from the current list action', async () => {
    const user = userEvent.setup();
    renderWorkflowHandoffs();
    await user.click(await screen.findByTitle('Accept Handoff'));
    await waitFor(() => expect(collaborationService.acceptWorkflowHandoff).toHaveBeenCalledWith(1, expect.any(Object)));
    expect(mockShowNotification).toHaveBeenCalledWith('Workflow handoff accepted successfully', 'success');
  });

  test('creates a workflow handoff using the current form fields', async () => {
    const user = userEvent.setup();
    renderWorkflowHandoffs();
    await user.click(screen.getByText('Create Handoff').closest('button'));
    expect(await screen.findByText('Create Workflow Handoff')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/^To:/i), '3');
    await user.type(screen.getByLabelText(/^Workflow Type:/i), 'visitor_approval');
    await user.type(screen.getByLabelText(/^Entity Type:/i), 'visitor');
    await user.type(screen.getByLabelText(/^Entity ID:/i), '789');
    await user.type(screen.getByLabelText(/^Handoff Notes:/i), 'Please handle this visitor approval');
    await user.click(screen.getAllByText('Create Handoff').at(-1).closest('button'));
    await waitFor(() => expect(collaborationService.createWorkflowHandoff).toHaveBeenCalledWith({
      toUserId: 3, workflowType: 'visitor_approval', entityType: 'visitor', entityId: '789',
      contextData: {}, handoffNotes: 'Please handle this visitor approval', priority: 'normal'
    }, expect.any(Object)));
  });

  test('shows validation, empty, and load error states', async () => {
    const user = userEvent.setup();
    renderWorkflowHandoffs();
    await user.click(screen.getByText('Create Handoff').closest('button'));
    await user.click(screen.getAllByText('Create Handoff').at(-1).closest('button'));
    expect(await screen.findByText('Please select a recipient')).toBeInTheDocument();
    expect(screen.getByText('Workflow type is required')).toBeInTheDocument();

    collaborationService.getWorkflowHandoffs.mockResolvedValueOnce({ handoffs: [] });
    renderWorkflowHandoffs();
    expect(await screen.findByText('No handoffs')).toBeInTheDocument();

    collaborationService.getWorkflowHandoffs.mockRejectedValueOnce(new Error('Network error'));
    renderWorkflowHandoffs();
    expect(await screen.findByText('Unable to load workflow handoffs')).toBeInTheDocument();
  });
});
