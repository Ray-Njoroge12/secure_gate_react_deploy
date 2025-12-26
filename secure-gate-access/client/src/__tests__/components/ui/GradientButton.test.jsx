import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GradientButton from '../../../components/ui/GradientButton';

describe('GradientButton', () => {
  test('renders children text', () => {
    render(<GradientButton>Click Me</GradientButton>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  test('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<GradientButton onClick={handleClick}>Click</GradientButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('does not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<GradientButton onClick={handleClick} disabled>Click</GradientButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('does not call onClick when loading', () => {
    const handleClick = jest.fn();
    render(<GradientButton onClick={handleClick} loading>Click</GradientButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('shows loading spinner when loading', () => {
    render(<GradientButton loading>Submit</GradientButton>);
    
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  test('applies variant class', () => {
    render(<GradientButton variant="secondary">Button</GradientButton>);
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('gradient-button--secondary');
  });

  test('applies size class', () => {
    render(<GradientButton size="lg">Button</GradientButton>);
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('gradient-button--lg');
  });

  test('applies fullWidth class when fullWidth is true', () => {
    render(<GradientButton fullWidth>Button</GradientButton>);
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('gradient-button--full-width');
  });

  test('renders with correct type attribute', () => {
    render(<GradientButton type="submit">Submit</GradientButton>);
    
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  test('renders left icon when provided', () => {
    const LeftIcon = () => <span data-testid="left-icon">←</span>;
    render(<GradientButton leftIcon={<LeftIcon />}>Button</GradientButton>);
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  test('renders right icon when provided', () => {
    const RightIcon = () => <span data-testid="right-icon">→</span>;
    render(<GradientButton rightIcon={<RightIcon />}>Button</GradientButton>);
    
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  test('hides icons when loading', () => {
    const LeftIcon = () => <span data-testid="left-icon">←</span>;
    render(<GradientButton leftIcon={<LeftIcon />} loading>Button</GradientButton>);
    
    expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
  });

  test('is disabled when disabled prop is true', () => {
    render(<GradientButton disabled>Button</GradientButton>);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  test('applies custom className', () => {
    render(<GradientButton className="custom-class">Button</GradientButton>);
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('custom-class');
  });
});
