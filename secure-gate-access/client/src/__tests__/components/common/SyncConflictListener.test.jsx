import React from 'react';
import { render, waitFor } from '@testing-library/react';

const mockToastWarning = jest.fn();
jest.mock('../../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: { warning: mockToastWarning, error: jest.fn(), success: jest.fn(), info: jest.fn() } })
}));

describe('SyncConflictListener', () => {
  beforeEach(() => {
    mockToastWarning.mockClear();
  });

  test('shows toast.warning when sync-conflict event is dispatched', async () => {
    const SyncConflictListener = (await import('../../../components/common/SyncConflictListener')).default;

    render(<SyncConflictListener />);

    window.dispatchEvent(new CustomEvent('sync-conflict', {
      detail: { conflicts: [{ id: 1, reason: 'Already checked out' }] }
    }));

    await waitFor(() => {
      expect(mockToastWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/sync.*conflict/i)
        })
      );
    });
  });

  test('does not show toast when conflicts array is empty', async () => {
    const SyncConflictListener = (await import('../../../components/common/SyncConflictListener')).default;

    render(<SyncConflictListener />);

    window.dispatchEvent(new CustomEvent('sync-conflict', {
      detail: { conflicts: [] }
    }));

    // Give it a moment
    await new Promise(r => setTimeout(r, 50));
    expect(mockToastWarning).not.toHaveBeenCalled();
  });
});
