import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import MessagingSystem from '../../../components/collaboration/MessagingSystem';
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

// Mock React context
const MockUserProvider = ({ children }) => {
  return (
    <div data-testid="user-context">
      {children}
    </div>
  );
};

jest.mock('../../../contexts/UserContext', () => ({
  useUser: () => ({ user: mockUser })
}));

describe('MessagingSystem', () => {
  const mockMessages = [
    {
      id: 1,
      sender_id: 2,
      sender_name: 'John Doe',
      sender_role: 'resident',
      subject: 'Test Message 1',
      content: 'This is a test message',
      message_type: 'direct',
      priority: 'normal',
      status: 'sent',
      created_at: '2025-01-29T10:00:00Z',
      read_at: null
    },
    {
      id: 2,
      sender_id: 1,
      sender_name: 'Admin User',
      sender_role: 'admin',
      subject: 'Test Message 2',
      content: 'This is another test message',
      message_type: 'broadcast',
      priority: 'high',
      status: 'delivered',
      created_at: '2025-01-29T09:00:00Z',
      read_at: '2025-01-29T09:30:00Z'
    }
  ];

  const mockUsers = [
    { id: 2, username: 'john_doe', role: 'resident', estate_id: 1 },
    { id: 3, username: 'jane_smith', role: 'guard', estate_id: 1 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    collaborationService.getMessages.mockResolvedValue({
      success: true,
      data: { messages: mockMessages, pagination: { total: 2, page: 1, pages: 1 } }
    });
    
    collaborationService.getUsers.mockResolvedValue({
      success: true,
      data: { users: mockUsers }
    });
    
    collaborationService.sendMessage.mockResolvedValue({
      success: true,
      data: { message: { id: 3, ...mockMessages[0] } }
    });
    
    collaborationService.markMessageAsRead.mockResolvedValue({
      success: true
    });
  });

  describe('Component Rendering', () => {
    test('should render messaging system with inbox and compose sections', async () => {
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      // Check for main sections
      expect(screen.getByText('Messages')).toBeInTheDocument();
      expect(screen.getByText('Compose Message')).toBeInTheDocument();
      
      // Wait for messages to load
      await waitFor(() => {
        expect(screen.getByText('Test Message 1')).toBeInTheDocument();
        expect(screen.getByText('Test Message 2')).toBeInTheDocument();
      });
    });

    test('should display message list with correct information', async () => {
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      await waitFor(() => {
        // Check message subjects
        expect(screen.getByText('Test Message 1')).toBeInTheDocument();
        expect(screen.getByText('Test Message 2')).toBeInTheDocument();
        
        // Check sender information
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Admin User')).toBeInTheDocument();
        
        // Check priority indicators
        expect(screen.getByText('High Priority')).toBeInTheDocument();
      });
    });

    test('should show unread message indicators', async () => {
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      await waitFor(() => {
        // First message should be unread (no read_at timestamp)
        const unreadIndicators = screen.getAllByTestId('unread-indicator');
        expect(unreadIndicators).toHaveLength(1);
      });
    });
  });

  describe('Message Composition', () => {
    test('should allow composing and sending a new message', async () => {
      const user = userEvent.setup();
      
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Compose Message')).toBeInTheDocument();
      });

      // Fill out the compose form
      const recipientSelect = screen.getByLabelText('Recipient');
      const subjectInput = screen.getByLabelText('Subject');
      const contentTextarea = screen.getByLabelText('Message');
      const sendButton = screen.getByText('Send Message');

      await user.selectOptions(recipientSelect, '2');
      await user.type(subjectInput, 'New Test Message');
      await user.type(contentTextarea, 'This is a new test message content');
      
      await user.click(sendButton);

      // Verify the service was called with correct data
      await waitFor(() => {
        expect(collaborationService.sendMessage).toHaveBeenCalledWith({
          recipientId: 2,
          subject: 'New Test Message',
          content: 'This is a new test message content',
          messageType: 'direct',
          priority: 'normal'
        });
      });
    });

    test('should validate required fields before sending', async () => {
      const user = userEvent.setup();
      
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Send Message')).toBeInTheDocument();
      });

      // Try to send without filling required fields
      const sendButton = screen.getByText('Send Message');
      await user.click(sendButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText('Recipient is required')).toBeInTheDocument();
        expect(screen.getByText('Subject is required')).toBeInTheDocument();
        expect(screen.getByText('Message content is required')).toBeInTheDocument();
      });

      // Service should not be called
      expect(collaborationService.sendMessage).not.toHaveBeenCalled();
    });

    test('should support different message types and priorities', async () => {
      const user = userEvent.setup();
      
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Message Type')).toBeInTheDocument();
      });

      // Select broadcast message type
      const messageTypeSelect = screen.getByLabelText('Message Type');
      await user.selectOptions(messageTypeSelect, 'broadcast');

      // Select high priority
      const prioritySelect = screen.getByLabelText('Priority');
      await user.selectOptions(prioritySelect, 'high');

      // Fill other required fields
      const recipientSelect = screen.getByLabelText('Recipient');
      const subjectInput = screen.getByLabelText('Subject');
      const contentTextarea = screen.getByLabelText('Message');

      await user.selectOptions(recipientSelect, '2');
      await user.type(subjectInput, 'Broadcast Message');
      await user.type(contentTextarea, 'This is a broadcast message');
      
      const sendButton = screen.getByText('Send Message');
      await user.click(sendButton);

      // Verify correct message type and priority
      await waitFor(() => {
        expect(collaborationService.sendMessage).toHaveBeenCalledWith({
          recipientId: 2,
          subject: 'Broadcast Message',
          content: 'This is a broadcast message',
          messageType: 'broadcast',
          priority: 'high'
        });
      });
    });
  });

  describe('Message Interaction', () => {
    test('should mark message as read when clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Message 1')).toBeInTheDocument();
      });

      // Click on unread message
      const messageItem = screen.getByText('Test Message 1').closest('.message-item');
      await user.click(messageItem);

      // Should call mark as read service
      await waitFor(() => {
        expect(collaborationService.markMessageAsRead).toHaveBeenCalledWith(1);
      });
    });

    test('should expand message to show full content', async () => {
      const user = userEvent.setup();
      
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Message 1')).toBeInTheDocument();
      });

      // Click to expand message
      const expandButton = screen.getByTestId('expand-message-1');
      await user.click(expandButton);

      // Should show full message content
      await waitFor(() => {
        expect(screen.getByText('This is a test message')).toBeInTheDocument();
      });
    });

    test('should support replying to messages', async () => {
      const user = userEvent.setup();
      
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Message 1')).toBeInTheDocument();
      });

      // Click reply button
      const replyButton = screen.getByTestId('reply-message-1');
      await user.click(replyButton);

      // Should populate compose form with reply data
      await waitFor(() => {
        const subjectInput = screen.getByLabelText('Subject');
        expect(subjectInput.value).toBe('Re: Test Message 1');
        
        const recipientSelect = screen.getByLabelText('Recipient');
        expect(recipientSelect.value).toBe('2'); // Original sender
      });
    });
  });

  describe('Filtering and Search', () => {
    test('should filter messages by type', async () => {
      const user = userEvent.setup();
      
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Filter by Type')).toBeInTheDocument();
      });

      // Filter by broadcast messages
      const filterSelect = screen.getByLabelText('Filter by Type');
      await user.selectOptions(filterSelect, 'broadcast');

      // Should call service with filter
      await waitFor(() => {
        expect(collaborationService.getMessages).toHaveBeenCalledWith(
          expect.objectContaining({
            messageType: 'broadcast'
          })
        );
      });
    });

    test('should search messages by content', async () => {
      const user = userEvent.setup();
      
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search messages...')).toBeInTheDocument();
      });

      // Enter search term
      const searchInput = screen.getByPlaceholderText('Search messages...');
      await user.type(searchInput, 'test message');

      // Should call service with search term
      await waitFor(() => {
        expect(collaborationService.getMessages).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'test message'
          })
        );
      }, { timeout: 1000 });
    });

    test('should filter by unread messages', async () => {
      const user = userEvent.setup();
      
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Show Unread Only')).toBeInTheDocument();
      });

      // Toggle unread filter
      const unreadToggle = screen.getByLabelText('Show Unread Only');
      await user.click(unreadToggle);

      // Should call service with unread filter
      await waitFor(() => {
        expect(collaborationService.getMessages).toHaveBeenCalledWith(
          expect.objectContaining({
            unreadOnly: true
          })
        );
      });
    });
  });

  describe('Role-Based Visibility', () => {
    test('should show appropriate message types for admin role', async () => {
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      await waitFor(() => {
        const messageTypeSelect = screen.getByLabelText('Message Type');
        const options = Array.from(messageTypeSelect.options).map(opt => opt.value);
        
        // Admin should see all message types
        expect(options).toContain('direct');
        expect(options).toContain('broadcast');
        expect(options).toContain('system');
      });
    });

    test('should filter recipient list based on user role', async () => {
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

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
    test('should handle message loading errors gracefully', async () => {
      collaborationService.getMessages.mockRejectedValue(new Error('Network error'));
      
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load messages. Please try again.')).toBeInTheDocument();
      });
    });

    test('should handle message sending errors', async () => {
      collaborationService.sendMessage.mockRejectedValue(new Error('Send failed'));
      const user = userEvent.setup();
      
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Send Message')).toBeInTheDocument();
      });

      // Fill and submit form
      const recipientSelect = screen.getByLabelText('Recipient');
      const subjectInput = screen.getByLabelText('Subject');
      const contentTextarea = screen.getByLabelText('Message');
      const sendButton = screen.getByText('Send Message');

      await user.selectOptions(recipientSelect, '2');
      await user.type(subjectInput, 'Test Subject');
      await user.type(contentTextarea, 'Test Content');
      await user.click(sendButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to send message. Please try again.')).toBeInTheDocument();
      });
    });

    test('should handle empty message list', async () => {
      collaborationService.getMessages.mockResolvedValue({
        success: true,
        data: { messages: [], pagination: { total: 0, page: 1, pages: 0 } }
      });
      
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('No messages found')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async () => {
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      await waitFor(() => {
        // Check for proper ARIA labels
        expect(screen.getByLabelText('Recipient')).toBeInTheDocument();
        expect(screen.getByLabelText('Subject')).toBeInTheDocument();
        expect(screen.getByLabelText('Message')).toBeInTheDocument();
        
        // Check for proper roles
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('form')).toBeInTheDocument();
      });
    });

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <MockUserProvider>
          <MessagingSystem />
        </MockUserProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Recipient')).toBeInTheDocument();
      });

      // Tab through form elements
      const recipientSelect = screen.getByLabelText('Recipient');
      const subjectInput = screen.getByLabelText('Subject');
      const contentTextarea = screen.getByLabelText('Message');

      recipientSelect.focus();
      expect(document.activeElement).toBe(recipientSelect);

      await user.tab();
      expect(document.activeElement).toBe(subjectInput);

      await user.tab();
      expect(document.activeElement).toBe(contentTextarea);
    });
  });
});