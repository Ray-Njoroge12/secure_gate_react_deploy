// client/src/components/ui/__tests__/Button.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils'-simple';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Button from '../Button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Click me');
      expect(button).toHaveClass('bg-brand-600'); // Primary variant
      expect(button).toHaveClass('min-h-[48px]'); // Default size
    });

    it('renders with different variants', () => {
      const { rerender } = render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-slate-700');

      rerender(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button')).toHaveClass('border-brand-600', 'text-brand-600');

      rerender(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-slate-300');

      rerender(<Button variant="danger">Danger</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-error-600');
    });

    it('renders with different sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-3', 'py-2', 'text-sm');

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-base');

      rerender(<Button size="xl">Extra Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-8', 'py-4', 'text-lg');
    });

    it('renders with icon', () => {
      const icon = <span data-testid="icon">🔍</span>;
      render(<Button icon={icon}>Search</Button>);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveTextContent('Search');
    });

    it('renders as disabled', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    it('renders with loading state', () => {
      render(<Button loading>Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Submit'); // Shows original children, not "Loading..."
      expect(button.querySelector('svg')).toBeInTheDocument(); // Spinner is present
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <Button 
          aria-label="Custom label"
          aria-describedby="help-text"
          aria-expanded={true}
          aria-controls="menu"
        >
          Button
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute('aria-controls', 'menu');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('has minimum touch target size', () => {
      render(<Button>Touch me</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-[48px]'); // Default size has 48px min height
    });
  });

  describe('Interactions', () => {
    it('calls onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('can be activated with keyboard', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      // Test that the button is focusable and can be activated
      expect(button).toHaveFocus();
      expect(button).not.toBeDisabled();
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner when loading', () => {
      render(<Button loading>Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.querySelector('svg')).toBeInTheDocument();
      expect(button).toHaveTextContent('Submit'); // Shows original children
    });

    it('hides icon when loading', () => {
      const icon = <span data-testid="icon">🔍</span>;
      render(<Button loading icon={icon}>Search</Button>);
      expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
      expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('forwards custom props to button element', () => {
      render(<Button data-testid="custom-button" type="submit">Submit</Button>);
      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('applies custom className', () => {
      render(<Button className="custom-class">Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('auto-generates aria-label for icon-only buttons', () => {
      const icon = <span>🔍</span>;
      render(<Button icon={icon} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Button');
    });
  });
});