/**
 * Advanced ValidatedInput Component Tests
 * 
 * Comprehensive test suite for the AdvancedValidatedInput component:
 * - Basic rendering and functionality
 * - Validation state display
 * - User interactions
 * - Accessibility compliance
 * - Mobile responsiveness
 * - Error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import AdvancedValidatedInput from '../../components/ui/AdvancedValidatedInput';

// Mock the useAdvancedValidation hook
jest.mock('../../hooks/useAdvancedValidation', () => ({
  useAdvancedValidation: () => ({
    registerField: jest.fn(),
    validateField: jest.fn(),
    getFieldState: jest.fn(() => ({
      hasErrors: false,
      hasWarnings: false,
      hasSuccesses: false,
      isValid: true,
      isTouched: true, // Set to true so validation messages show
      isValidating: false,
      state: 'idle',
      errors: [],
      warnings: [],
      successes: []
    })),
    VALIDATION_STATES: {
      IDLE: 'idle',
      VALIDATING: 'validating',
      VALID: 'valid',
      INVALID: 'invalid',
      WARNING: 'warning',
      SUCCESS: 'success'
    }
  })
}));

describe('AdvancedValidatedInput', () => {
  const defaultProps = {
    name: 'testField',
    value: '',
    onChange: jest.fn(),
    label: 'Test Field',
    placeholder: 'Enter test value'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with basic props', () => {
      render(<AdvancedValidatedInput {...defaultProps} />);
      
      expect(screen.getByLabelText('Test Field')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter test value')).toBeInTheDocument();
    });

    it('should render with required indicator', () => {
      render(<AdvancedValidatedInput {...defaultProps} required />);
      
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByLabelText('required')).toBeInTheDocument();
    });

    it('should render with help text', () => {
      render(<AdvancedValidatedInput {...defaultProps} helpText="This is help text" />);
      
      expect(screen.getByText('This is help text')).toBeInTheDocument();
    });

    it('should render with icon', () => {
      const TestIcon = () => <div data-testid="test-icon">Icon</div>;
      render(<AdvancedValidatedInput {...defaultProps} icon={<TestIcon />} />);
      
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });
  });

  describe('Input Types', () => {
    it('should render text input by default', () => {
      render(<AdvancedValidatedInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should render email input', () => {
      render(<AdvancedValidatedInput {...defaultProps} type="email" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should render password input', () => {
      render(<AdvancedValidatedInput {...defaultProps} type="password" />);
      
      const input = screen.getByLabelText('Test Field');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should render number input', () => {
      render(<AdvancedValidatedInput {...defaultProps} type="number" />);
      
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('should render tel input', () => {
      render(<AdvancedValidatedInput {...defaultProps} type="tel" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'tel');
    });

    it('should render url input', () => {
      render(<AdvancedValidatedInput {...defaultProps} type="url" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'url');
    });
  });

  describe('Password Toggle', () => {
    it('should show password toggle for password type', () => {
      render(<AdvancedValidatedInput {...defaultProps} type="password" showPasswordToggle />);
      
      expect(screen.getByLabelText('Show password')).toBeInTheDocument();
    });

    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      render(<AdvancedValidatedInput {...defaultProps} type="password" showPasswordToggle />);
      
      const input = screen.getByLabelText('Test Field');
      const toggleButton = screen.getByLabelText('Show password');
      
      expect(input).toHaveAttribute('type', 'password');
      
      await user.click(toggleButton);
      
      expect(input).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText('Hide password')).toBeInTheDocument();
    });

    it('should not show password toggle for non-password types', () => {
      render(<AdvancedValidatedInput {...defaultProps} type="text" showPasswordToggle />);
      
      expect(screen.queryByLabelText('Show password')).not.toBeInTheDocument();
    });
  });

  describe('Clear Button', () => {
    it('should show clear button when clearable and has value', () => {
      render(<AdvancedValidatedInput {...defaultProps} value="test value" clearable />);
      
      expect(screen.getByLabelText('Clear input')).toBeInTheDocument();
    });

    it('should not show clear button when no value', () => {
      render(<AdvancedValidatedInput {...defaultProps} value="" clearable />);
      
      expect(screen.queryByLabelText('Clear input')).not.toBeInTheDocument();
    });

    it('should clear input when clear button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<AdvancedValidatedInput {...defaultProps} value="test value" clearable onChange={onChange} />);
      
      const clearButton = screen.getByLabelText('Clear input');
      await user.click(clearButton);
      
      expect(onChange).toHaveBeenCalledWith('');
    });

    it('should focus input after clearing', async () => {
      const user = userEvent.setup();
      render(<AdvancedValidatedInput {...defaultProps} value="test value" clearable />);
      
      const input = screen.getByRole('textbox');
      const clearButton = screen.getByLabelText('Clear input');
      
      await user.click(clearButton);
      
      // Wait for focus to be applied
      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });
  });

  describe('Character Count', () => {
    it('should show character count when enabled', () => {
      render(<AdvancedValidatedInput {...defaultProps} value="test" showCharacterCount maxLength={10} />);
      
      expect(screen.getByText('4/10')).toBeInTheDocument();
    });

    it('should show warning when near limit', () => {
      render(<AdvancedValidatedInput {...defaultProps} value="test" showCharacterCount maxLength={5} />);
      
      const countElement = screen.getByText('4/5');
      expect(countElement).toHaveClass('text-yellow-400');
    });

    it('should show error when over limit', () => {
      render(<AdvancedValidatedInput {...defaultProps} value="test" showCharacterCount maxLength={3} />);
      
      const countElement = screen.getByText('4/3');
      expect(countElement).toHaveClass('text-red-400');
    });
  });

  describe('Validation States', () => {
    it('should show validation indicator when validating', () => {
      render(<AdvancedValidatedInput {...defaultProps} touched={true} isValidating={true} />);
      
      // Check for the loading spinner by its class
      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();
      
      // Also check that the validation state is correct
      const input = screen.getByLabelText('Test Field');
      expect(input).toHaveClass('pr-20'); // Should have extra padding when validating
    });

    it('should show success indicator when valid', () => {
      render(<AdvancedValidatedInput {...defaultProps} touched={true} success="Valid input" />);
      
      expect(screen.getByText('Valid input')).toBeInTheDocument();
    });

    it('should show warning indicator when warning', () => {
      render(<AdvancedValidatedInput {...defaultProps} touched={true} warning="Warning message" />);
      
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    it('should show error indicator when error', () => {
      render(<AdvancedValidatedInput {...defaultProps} touched={true} error="Error message" />);
      
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onChange when input value changes', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<AdvancedValidatedInput {...defaultProps} onChange={onChange} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      
      expect(onChange).toHaveBeenCalledWith('test');
    });

    it('should call onBlur when input loses focus', async () => {
      const user = userEvent.setup();
      const onBlur = jest.fn();
      render(<AdvancedValidatedInput {...defaultProps} onBlur={onBlur} />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab();
      
      expect(onBlur).toHaveBeenCalled();
    });

    it('should call onFocus when input gains focus', async () => {
      const user = userEvent.setup();
      const onFocus = jest.fn();
      render(<AdvancedValidatedInput {...defaultProps} onFocus={onFocus} />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      
      expect(onFocus).toHaveBeenCalled();
    });

    it('should call onValidationChange when validation state changes', () => {
      const onValidationChange = jest.fn();
      render(<AdvancedValidatedInput {...defaultProps} onValidationChange={onValidationChange} />);
      
      expect(onValidationChange).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<AdvancedValidatedInput {...defaultProps} required error="Error message" helpText="Help text" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('should have proper labels', () => {
      render(<AdvancedValidatedInput {...defaultProps} label="Test Field" />);
      
      expect(screen.getByLabelText('Test Field')).toBeInTheDocument();
    });

    it('should have proper error announcements', () => {
      render(<AdvancedValidatedInput {...defaultProps} touched={true} error="Error message" />);
      
      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper success announcements', () => {
      render(<AdvancedValidatedInput {...defaultProps} touched={true} success="Success message" />);
      
      const successElement = screen.getByRole('status');
      expect(successElement).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Sizing and Variants', () => {
    it('should apply small size styles', () => {
      render(<AdvancedValidatedInput {...defaultProps} size="sm" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('text-sm');
    });

    it('should apply medium size styles', () => {
      render(<AdvancedValidatedInput {...defaultProps} size="md" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('text-base');
    });

    it('should apply large size styles', () => {
      render(<AdvancedValidatedInput {...defaultProps} size="lg" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('text-lg');
    });
  });

  describe('Disabled and ReadOnly States', () => {
    it('should render disabled input', () => {
      render(<AdvancedValidatedInput {...defaultProps} disabled />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should render read-only input', () => {
      render(<AdvancedValidatedInput {...defaultProps} readOnly />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('readonly');
    });

    it('should not show clear button when disabled', () => {
      render(<AdvancedValidatedInput {...defaultProps} value="test" clearable disabled />);
      
      expect(screen.queryByLabelText('Clear input')).not.toBeInTheDocument();
    });

    it('should not show clear button when read-only', () => {
      render(<AdvancedValidatedInput {...defaultProps} value="test" clearable readOnly />);
      
      expect(screen.queryByLabelText('Clear input')).not.toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(<AdvancedValidatedInput {...defaultProps} className="custom-class" />);
      
      const container = screen.getByRole('textbox').closest('.advanced-validated-input');
      expect(container).toHaveClass('custom-class');
    });

    it('should apply custom input className', () => {
      render(<AdvancedValidatedInput {...defaultProps} inputClassName="custom-input-class" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-input-class');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing onChange gracefully', () => {
      const { name, ...propsWithoutOnChange } = defaultProps;
      render(<AdvancedValidatedInput {...propsWithoutOnChange} name={name} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should handle missing label gracefully', () => {
      const { label, ...propsWithoutLabel } = defaultProps;
      render(<AdvancedValidatedInput {...propsWithoutLabel} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('should focus input when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<AdvancedValidatedInput {...defaultProps} value="test" clearable />);
      
      const input = screen.getByRole('textbox');
      const clearButton = screen.getByLabelText('Clear input');
      
      await user.click(clearButton);
      
      expect(input).toHaveFocus();
    });
  });

  describe('Validation Messages', () => {
    it('should display multiple error messages', () => {
      render(<AdvancedValidatedInput {...defaultProps} touched={true} error={['Error 1', 'Error 2']} />);
      
      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Error 2')).toBeInTheDocument();
    });

    it('should display multiple warning messages', () => {
      render(<AdvancedValidatedInput {...defaultProps} touched={true} warning={['Warning 1', 'Warning 2']} />);
      
      expect(screen.getByText('Warning 1')).toBeInTheDocument();
      expect(screen.getByText('Warning 2')).toBeInTheDocument();
    });

    it('should display multiple success messages', () => {
      render(<AdvancedValidatedInput {...defaultProps} touched={true} success={['Success 1', 'Success 2']} />);
      
      expect(screen.getByText('Success 1')).toBeInTheDocument();
      expect(screen.getByText('Success 2')).toBeInTheDocument();
    });
  });
});




