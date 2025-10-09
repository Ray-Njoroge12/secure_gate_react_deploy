import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Input from '../Input';

describe('Input Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Input placeholder="Enter text" />);
      const input = screen.getByPlaceholderText('Enter text');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('min-h-[44px]');
    });

    it('renders with different types', () => {
      const { rerender } = render(<Input type="email" placeholder="Email" />);
      expect(screen.getByPlaceholderText('Email')).toHaveAttribute('type', 'email');

      rerender(<Input type="password" placeholder="Password" />);
      expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');
    });

    it('renders with label', () => {
      render(<Input label="Username" placeholder="Enter username" />);
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('renders with helper text', () => {
      render(<Input helperText="This field is required" placeholder="Required field" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('renders with error state', () => {
      render(<Input error="Invalid input" placeholder="Error field" />);
      const input = screen.getByPlaceholderText('Error field');
      expect(input).toHaveClass('border-red-500', 'focus:ring-red-500');
      expect(screen.getByText('Invalid input')).toBeInTheDocument();
    });

    it('renders as disabled', () => {
      render(<Input disabled placeholder="Disabled field" />);
      const input = screen.getByPlaceholderText('Disabled field');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    it('renders as required', () => {
      render(<Input required label="Required field" placeholder="Required" />);
      const input = screen.getByPlaceholderText('Required');
      expect(input).toBeRequired();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <Input 
          label="Email"
          helperText="Enter your email address"
          error="Invalid email"
          aria-describedby="email-help email-error"
        />
      );
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-describedby', 'email-help email-error');
    });

    it('associates label with input', () => {
      render(<Input label="Username" id="username" />);
      const input = screen.getByLabelText('Username');
      expect(input).toHaveAttribute('id', 'username');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<Input placeholder="Type here" />);
      
      const input = screen.getByPlaceholderText('Type here');
      await user.tab();
      expect(input).toHaveFocus();
    });

    it('has minimum touch target size', () => {
      render(<Input placeholder="Touch target" />);
      const input = screen.getByPlaceholderText('Touch target');
      expect(input).toHaveClass('min-h-[44px]');
    });
  });

  describe('Interactions', () => {
    it('handles input changes', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} placeholder="Type here" />);
      
      const input = screen.getByPlaceholderText('Type here');
      await user.type(input, 'Hello');
      expect(handleChange).toHaveBeenCalled();
    });

    it('handles focus events', async () => {
      const user = userEvent.setup();
      const handleFocus = jest.fn();
      render(<Input onFocus={handleFocus} placeholder="Focus me" />);
      
      const input = screen.getByPlaceholderText('Focus me');
      await user.click(input);
      expect(handleFocus).toHaveBeenCalled();
    });

    it('handles blur events', async () => {
      const user = userEvent.setup();
      const handleBlur = jest.fn();
      render(<Input onBlur={handleBlur} placeholder="Blur me" />);
      
      const input = screen.getByPlaceholderText('Blur me');
      await user.click(input);
      await user.tab();
      expect(handleBlur).toHaveBeenCalled();
    });

    it('does not handle events when disabled', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Input disabled onChange={handleChange} placeholder="Disabled" />);
      
      const input = screen.getByPlaceholderText('Disabled');
      await user.type(input, 'Hello');
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Validation States', () => {
    it('shows error styling when error prop is provided', () => {
      render(<Input error="This field has an error" placeholder="Error field" />);
      const input = screen.getByPlaceholderText('Error field');
      expect(input).toHaveClass('border-red-500');
    });

    it('shows success styling when success prop is provided', () => {
      render(<Input success placeholder="Success field" />);
      const input = screen.getByPlaceholderText('Success field');
      expect(input).toHaveClass('border-green-500');
    });

    it('shows warning styling when warning prop is provided', () => {
      render(<Input warning placeholder="Warning field" />);
      const input = screen.getByPlaceholderText('Warning field');
      expect(input).toHaveClass('border-yellow-500');
    });
  });

  describe('Custom Props', () => {
    it('forwards custom props to input element', () => {
      render(<Input data-testid="custom-input" autoComplete="email" />);
      const input = screen.getByTestId('custom-input');
      expect(input).toHaveAttribute('autoComplete', 'email');
    });

    it('applies custom className', () => {
      render(<Input className="custom-class" placeholder="Custom" />);
      const input = screen.getByPlaceholderText('Custom');
      expect(input).toHaveClass('custom-class');
    });
  });
});

