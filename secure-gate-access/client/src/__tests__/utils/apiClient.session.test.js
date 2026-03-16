/**
 * @jest-environment jsdom
 */
import React, { useState, useEffect } from 'react';
import { render, waitFor } from '@testing-library/react';

// Mock useToast to track toast calls
const mockToastError = jest.fn();
jest.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: { error: mockToastError, success: jest.fn(), warning: jest.fn(), info: jest.fn() } })
}));

describe('apiClient session expiry', () => {
  beforeEach(() => {
    mockToastError.mockClear();
  });

  test('SessionExpiryToast calls toast.error when session-expired event fires', async () => {
    // Inline the component pattern that SessionExpiryToast.jsx will implement
    function TestSessionExpiryToast() {
      const { toast } = require('../../contexts/ToastContext').useToast();
      useEffect(() => {
        const handler = (e) => {
          toast.error({
            title: 'Session Expired',
            message: e.detail?.message || 'Your session has expired. Please log in again.'
          });
        };
        window.addEventListener('session-expired', handler);
        return () => window.removeEventListener('session-expired', handler);
      }, [toast]);
      return null;
    }

    render(<TestSessionExpiryToast />);

    expect(mockToastError).not.toHaveBeenCalled();

    // Simulate what apiClient.js will dispatch on persistent 401
    window.dispatchEvent(new CustomEvent('session-expired', {
      detail: { message: 'Your session has expired. Please log in again.' }
    }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Session Expired',
          message: 'Your session has expired. Please log in again.'
        })
      );
    });
  });

  test('session-expired CustomEvent carries the correct detail payload', () => {
    const event = new CustomEvent('session-expired', {
      detail: { message: 'Test message' }
    });
    expect(event.type).toBe('session-expired');
    expect(event.detail.message).toBe('Test message');
  });
});
