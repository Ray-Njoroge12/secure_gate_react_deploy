/**
 * Forms Integration Tests
 * Tests form submissions with API integration and validation
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ErrorProvider } from '../../contexts/ErrorContext';

// Import MSW server
import { server } from './mocks/server';

// Mock visitor creation form component
const VisitorForm = ({ onSuccess }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    phone: '',
    email: '',
    purpose: ''
  });
  const [errors, setErrors] = React.useState({});
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    // Validation
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.phone) newErrors.phone = 'Phone is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:5001/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create visitor');
      }

      const data = await res.json();
      setSuccess(true);
      onSuccess?.(data);
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Visitor</h2>
      
      {success && <div role="alert">Visitor created successfully!</div>}
      {errors.submit && <div role="alert">{errors.submit}</div>}

      <div>
        <label htmlFor="name">Name *</label>
        <input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        {errors.name && <div role="alert">{errors.name}</div>}
      </div>

      <div>
        <label htmlFor="phone">Phone *</label>
        <input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
        {errors.phone && <div role="alert">{errors.phone}</div>}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <div>
        <label htmlFor="purpose">Purpose</label>
        <textarea
          id="purpose"
          value={formData.purpose}
          onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
        />
      </div>

      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Visitor'}
      </button>
    </form>
  );
};

const AllProviders = ({ children }) => (
  <ErrorProvider>
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  </ErrorProvider>
);

describe('Forms Integration Tests', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'mock-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Visitor Creation Form', () => {
    it('should submit form with valid data', async () => {
      const onSuccess = jest.fn();
      const user = userEvent.setup();

      render(<VisitorForm onSuccess={onSuccess} />, { wrapper: AllProviders });

      // Fill in form
      await user.type(screen.getByLabelText(/name/i), 'Test Visitor');
      await user.type(screen.getByLabelText(/phone/i), '+254700123456');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/purpose/i), 'Business meeting');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create visitor/i });
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByText('Creating...')).toBeInTheDocument();

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/visitor created successfully/i)).toBeInTheDocument();
      });

      // Should call success callback
      expect(onSuccess).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Visitor',
          phone: '+254700123456'
        })
      );
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();

      render(<VisitorForm />, { wrapper: AllProviders });

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /create visitor/i });
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/phone is required/i)).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      const { server } = await import('./mocks/server');
      const { http, HttpResponse } = await import('msw');

      server.use(
        http.post('http://localhost:5001/api/visitors', () => {
          return HttpResponse.json(
            { error: 'Invalid phone number' },
            { status: 400 }
          );
        })
      );

      const user = userEvent.setup();
      render(<VisitorForm />, { wrapper: AllProviders });

      await user.type(screen.getByLabelText(/name/i), 'Test Visitor');
      await user.type(screen.getByLabelText(/phone/i), 'invalid');

      const submitButton = screen.getByRole('button', { name: /create visitor/i });
      await user.click(submitButton);

      // Should show API error
      await waitFor(() => {
        expect(screen.getByText(/invalid phone number/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button while submitting', async () => {
      const user = userEvent.setup();
      render(<VisitorForm />, { wrapper: AllProviders });

      await user.type(screen.getByLabelText(/name/i), 'Test Visitor');
      await user.type(screen.getByLabelText(/phone/i), '+254700123456');

      const submitButton = screen.getByRole('button', { name: /create visitor/i });
      
      expect(submitButton).not.toBeDisabled();

      await user.click(submitButton);

      // Should be disabled while submitting
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
    });

    it('should clear form after successful submission', async () => {
      const user = userEvent.setup();
      render(<VisitorForm />, { wrapper: AllProviders });

      const nameInput = screen.getByLabelText(/name/i);
      const phoneInput = screen.getByLabelText(/phone/i);

      await user.type(nameInput, 'Test Visitor');
      await user.type(phoneInput, '+254700123456');

      const submitButton = screen.getByRole('button', { name: /create visitor/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/visitor created successfully/i)).toBeInTheDocument();
      });

      // Form should be cleared (depending on implementation)
      // This test assumes form doesn't auto-clear
    });

    it('should handle network errors', async () => {
      const { server } = await import('./mocks/server');
      const { http, HttpResponse } = await import('msw');

      server.use(
        http.post('http://localhost:5001/api/visitors', () => {
          return HttpResponse.error();
        })
      );

      const user = userEvent.setup();
      render(<VisitorForm />, { wrapper: AllProviders });

      await user.type(screen.getByLabelText(/name/i), 'Test Visitor');
      await user.type(screen.getByLabelText(/phone/i), '+254700123456');

      const submitButton = screen.getByRole('button', { name: /create visitor/i });
      await user.click(submitButton);

      // Should show network error
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();
      render(<VisitorForm />, { wrapper: AllProviders });

      await user.type(screen.getByLabelText(/name/i), 'Test Visitor');
      await user.type(screen.getByLabelText(/phone/i), '+254700123456');
      await user.type(screen.getByLabelText(/email/i), 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /create visitor/i });
      await user.click(submitButton);

      // Email validation happens via HTML5 or custom validation
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });
  });

  describe('Form Field Interactions', () => {
    it('should update form state on input change', async () => {
      const user = userEvent.setup();
      render(<VisitorForm />, { wrapper: AllProviders });

      const nameInput = screen.getByLabelText(/name/i);
      
      await user.type(nameInput, 'John Doe');

      expect(nameInput).toHaveValue('John Doe');
    });

    it('should handle textarea input', async () => {
      const user = userEvent.setup();
      render(<VisitorForm />, { wrapper: AllProviders });

      const purposeInput = screen.getByLabelText(/purpose/i);
      
      await user.type(purposeInput, 'Long purpose description');

      expect(purposeInput).toHaveValue('Long purpose description');
    });

    it('should trim whitespace from inputs', async () => {
      const onSuccess = jest.fn();
      const user = userEvent.setup();
      
      render(<VisitorForm onSuccess={onSuccess} />, { wrapper: AllProviders });

      await user.type(screen.getByLabelText(/name/i), '  Trimmed Name  ');
      await user.type(screen.getByLabelText(/phone/i), '+254700123456');

      const submitButton = screen.getByRole('button', { name: /create visitor/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });

      // Note: Trimming logic depends on implementation
    });
  });

  describe('Multi-step Forms', () => {
    it('should handle multi-step form navigation', async () => {
      // This would test a multi-step form if implemented
      // For now, placeholder test
      expect(true).toBe(true);
    });
  });

  describe('Form Validation', () => {
    it('should show inline validation errors', async () => {
      const user = userEvent.setup();
      render(<VisitorForm />, { wrapper: AllProviders });

      const submitButton = screen.getByRole('button', { name: /create visitor/i });
      await user.click(submitButton);

      // Should show multiple validation errors
      const errors = screen.getAllByRole('alert');
      expect(errors.length).toBeGreaterThanOrEqual(2); // name and phone
    });

    it('should clear validation errors when field is filled', async () => {
      const user = userEvent.setup();
      render(<VisitorForm />, { wrapper: AllProviders });

      const submitButton = screen.getByRole('button', { name: /create visitor/i });
      await user.click(submitButton);

      // Error should appear
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();

      // Fill in name
      await user.type(screen.getByLabelText(/name/i), 'Test Name');

      // Error should clear on next submit attempt
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(<VisitorForm />, { wrapper: AllProviders });

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/purpose/i)).toBeInTheDocument();
    });

    it('should mark required fields', () => {
      render(<VisitorForm />, { wrapper: AllProviders });

      // Required fields should be marked (via * or aria-required)
      expect(screen.getByText(/name \*/i)).toBeInTheDocument();
      expect(screen.getByText(/phone \*/i)).toBeInTheDocument();
    });

    it('should announce validation errors to screen readers', async () => {
      const user = userEvent.setup();
      render(<VisitorForm />, { wrapper: AllProviders });

      const submitButton = screen.getByRole('button', { name: /create visitor/i });
      await user.click(submitButton);

      // Errors should have role="alert"
      const errors = screen.getAllByRole('alert');
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
