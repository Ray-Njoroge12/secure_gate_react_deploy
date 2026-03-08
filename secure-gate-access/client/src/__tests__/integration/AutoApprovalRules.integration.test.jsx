import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AutoApprovalRules from '../../components/resident/AutoApprovalRules';
import autoApprovalService from '../../services/autoApprovalService';

jest.mock('../../services/autoApprovalService', () => ({
  __esModule: true,
  default: {
    getRules: jest.fn(), getCategories: jest.fn(), createRule: jest.fn(), updateRule: jest.fn(),
    deleteRule: jest.fn(), toggleRule: jest.fn(), exportRules: jest.fn()
  }
}));

const mockRules = [{
  id: 1, ruleName: 'Mom Weekly Visit',
  matchCriteria: { visitorName: 'Jane Doe', visitorPhone: '+254700111111', category: 'family' },
  timeRestrictions: { days: ['sat', 'sun'], start_time: '09:00', end_time: '18:00' },
  isActive: true, matchCount: 5, lastMatchedAt: '2024-01-15T10:30:00Z'
}];
const mockCategories = [
  { id: 'family', label: 'Family' }, { id: 'service', label: 'Service' }, { id: 'custom', label: 'Custom' }
];

const renderAutoApprovalRules = () => render(<AutoApprovalRules />);

beforeEach(() => {
  jest.clearAllMocks();
  autoApprovalService.getRules.mockResolvedValue({ data: mockRules });
  autoApprovalService.getCategories.mockResolvedValue({ categories: mockCategories });
  autoApprovalService.createRule.mockResolvedValue({ success: true });
  autoApprovalService.exportRules.mockResolvedValue({ rules: mockRules, exportedAt: '2026-03-08T00:00:00Z' });
  autoApprovalService.toggleRule.mockResolvedValue({ success: true });
  autoApprovalService.deleteRule.mockResolvedValue({ success: true });
});

describe('AutoApprovalRules Integration Tests', () => {
  test('renders current header, privacy card, and loaded rules', async () => {
    renderAutoApprovalRules();
    expect(await screen.findByText('🤖 Auto-Approval Rules')).toBeInTheDocument();
    expect(screen.getByText('🔒 Privacy Protection')).toBeInTheDocument();
    expect(screen.getByText('Mom Weekly Visit')).toBeInTheDocument();
    expect(screen.getByText(/Name: Jane Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Phone: \+254700111111/)).toBeInTheDocument();
    expect(screen.getByText(/SAT, SUN/i)).toBeInTheDocument();
    expect(screen.getByText(/09:00 - 18:00/)).toBeInTheDocument();
  });

  test('shows the current empty state when no rules exist', async () => {
    autoApprovalService.getRules.mockResolvedValueOnce({ data: [] });
    renderAutoApprovalRules();
    expect(await screen.findByText('No auto-approval rules yet')).toBeInTheDocument();
    expect(screen.getByText('Create rules to automatically approve trusted visitors')).toBeInTheDocument();
  });

  test('creates a rule using the current modal form contract', async () => {
    const user = userEvent.setup();
    renderAutoApprovalRules();
    await user.click(await screen.findByText('+ Add Rule'));
    expect(await screen.findByText('Create Auto-Approval Rule')).toBeInTheDocument();
    await user.type(document.querySelector('input[name="ruleName"]'), 'Weekend Family');
    await user.selectOptions(document.querySelector('select[name="category"]'), 'family');
    await user.type(document.querySelector('input[name="visitorName"]'), 'Jane Doe');
    await user.type(document.querySelector('input[name="visitorPhone"]'), '+254700333333');
    await user.click(screen.getByText('Sat').closest('button'));
    await user.type(document.querySelector('input[name="startTime"]'), '09:00');
    await user.type(document.querySelector('input[name="endTime"]'), '18:00');
    await user.click(screen.getByText('Create Rule').closest('button'));
    await waitFor(() => expect(autoApprovalService.createRule).toHaveBeenCalledWith({
      ruleName: 'Weekend Family', visitorName: 'Jane Doe', visitorPhone: '+254700333333',
      category: 'family', timeRestrictions: { days: ['sat'], start_time: '09:00', end_time: '18:00' }
    }));
  });

  test('exports rules with the current download flow', async () => {
    const user = userEvent.setup();
    const originalCreateObjectURL = global.URL.createObjectURL;
    const originalCreateElement = document.createElement.bind(document);
    const mockClick = jest.fn();
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    document.createElement = jest.fn((tag) => tag === 'a' ? { href: '', download: '', click: mockClick } : originalCreateElement(tag));
    try {
      renderAutoApprovalRules();
      await user.click(await screen.findByText('📥 Export'));
      await waitFor(() => expect(autoApprovalService.exportRules).toHaveBeenCalled());
      expect(mockClick).toHaveBeenCalled();
    } finally {
      global.URL.createObjectURL = originalCreateObjectURL;
      document.createElement = originalCreateElement;
    }
  });

  test('shows current load and save errors', async () => {
    autoApprovalService.getRules.mockRejectedValueOnce(new Error('boom'));
    renderAutoApprovalRules();
    expect(await screen.findByText('Failed to load rules')).toBeInTheDocument();

    const user = userEvent.setup();
    autoApprovalService.getRules.mockResolvedValueOnce({ data: mockRules });
    autoApprovalService.createRule.mockRejectedValueOnce({ response: { data: { error: 'Invalid rule data' } } });
    renderAutoApprovalRules();
    await user.click(await screen.findByText('+ Add Rule'));
    await user.type(document.querySelector('input[name="ruleName"]'), 'Test Rule');
    await user.click(screen.getByText('Create Rule').closest('button'));
    expect(await screen.findByText('Invalid rule data')).toBeInTheDocument();
  });
});
