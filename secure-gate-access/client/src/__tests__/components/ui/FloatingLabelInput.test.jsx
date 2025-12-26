import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FloatingLabelInput from '../../../components/ui/FloatingLabelInput';

describe('FloatingLabelInput', () => {
  test('renders input with label', () => {
    render(<FloatingLabelInput id="test" label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  test('shows floating label when focused', () => {
    render(<FloatingLabelInput id="test" label="Email" />);
    
    const input = screen.getByLabelText('Email');
    fireEvent.focus(input);
    
    const label = screen.getByText('Email');
    expect(label.className).toContain('floating-input__label--float');
  });

  test('shows floating label when has value', () => {
    render(<FloatingLabelInput id="test" label="Email" value="test@example.com" onChange={() => {}} />);
    
    const label = screen.getByText('Email');
    expect(label.className).toContain('floating-input__label--float');
  });

  test('calls onChange when input value changes', () => {
    const handleChange = jest.fn();
    render(<FloatingLabelInput id="test" label="Email" onChange={handleChange} />);
    
    const input = screen.getByLabelText('Email');
    fireEvent.change(input, { target: { value: 'test' } });
    
    expect(handleChange).toHaveBeenCalled();
  });

  test('calls onBlur when input loses focus', () => {
    const handleBlur = jest.fn();
    render(<FloatingLabelInput id="test" label="Email" onBlur={handleBlur} />);
    
    const input = screen.getByLabelText('Email');
    fireEvent.focus(input);
    fireEvent.blur(input);
    
    expect(handleBlur).toHaveBeenCalled();
  });

  test('shows error message when error prop is provided', () => {
    render(<FloatingLabelInput id="test" label="Email" error="Invalid email" />);
    
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
  });

  test('shows helper text when provided and no error', () => {
    render(<FloatingLabelInput id="test" label="Email" helperText="Enter your email" />);
    
    expect(screen.getByText('Enter your email')).toBeInTheDocument();
  });

  test('error takes precedence over helper text', () => {
    render(
      <FloatingLabelInput 
        id="test" 
        label="Email" 
        error="Error message" 
        helperText="Helper text" 
      />
    );
    
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
  });

  test('renders left icon when provided', () => {
    const LeftIcon = () => <span data-testid="left-icon">@</span>;
    render(<FloatingLabelInput id="test" label="Email" leftIcon={<LeftIcon />} />);
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  test('renders right icon when provided and no error/success', () => {
    const RightIcon = () => <span data-testid="right-icon">✓</span>;
    render(<FloatingLabelInput id="test" label="Email" rightIcon={<RightIcon />} />);
    
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  test('applies error state class when error is provided', () => {
    const { container } = render(
      <FloatingLabelInput id="test" label="Email" error="Error" />
    );
    
    expect(container.querySelector('.floating-input--error')).toBeInTheDocument();
  });

  test('applies success state class when success is true', () => {
    const { container } = render(
      <FloatingLabelInput id="test" label="Email" success />
    );
    
    expect(container.querySelector('.floating-input--success')).toBeInTheDocument();
  });

  test('is disabled when disabled prop is true', () => {
    render(<FloatingLabelInput id="test" label="Email" disabled />);
    
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  test('shows required indicator when required', () => {
    render(<FloatingLabelInput id="test" label="Email" required />);
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  test('sets aria-invalid when there is an error', () => {
    render(<FloatingLabelInput id="test" label="Email" error="Error" />);
    
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  test('sets aria-required when required', () => {
    render(<FloatingLabelInput id="test" label="Email" required />);
    
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-required', 'true');
  });

  test('focuses input when label is clicked', () => {
    render(<FloatingLabelInput id="test" label="Email" />);
    
    const label = screen.getByText('Email');
    fireEvent.click(label);
    
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  test('applies correct input type', () => {
    render(<FloatingLabelInput id="test" label="Password" type="password" />);
    
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });
});
