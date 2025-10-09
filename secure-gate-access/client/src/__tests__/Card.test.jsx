import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Card from '../Card';

describe('Card Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Card>Card content</Card>);
      const card = screen.getByText('Card content');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('bg-slate-800', 'border-slate-700');
    });

    it('renders with different variants', () => {
      const { rerender } = render(<Card variant="outlined">Outlined</Card>);
      expect(screen.getByText('Outlined')).toHaveClass('border-slate-700');

      rerender(<Card variant="elevated">Elevated</Card>);
      expect(screen.getByText('Elevated')).toHaveClass('shadow-lg');

      rerender(<Card variant="flat">Flat</Card>);
      expect(screen.getByText('Flat')).toHaveClass('shadow-none');
    });

    it('renders with different sizes', () => {
      const { rerender } = render(<Card size="sm">Small</Card>);
      expect(screen.getByText('Small')).toHaveClass('p-4');

      rerender(<Card size="lg">Large</Card>);
      expect(screen.getByText('Large')).toHaveClass('p-8');
    });

    it('renders with header and footer', () => {
      render(
        <Card>
          <Card.Header>Header</Card.Header>
          <Card.Content>Content</Card.Content>
          <Card.Footer>Footer</Card.Footer>
        </Card>
      );
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });

    it('renders as clickable when onClick is provided', () => {
      const handleClick = jest.fn();
      render(<Card onClick={handleClick}>Clickable card</Card>);
      const card = screen.getByText('Clickable card');
      expect(card).toHaveClass('cursor-pointer', 'hover:shadow-md');
    });
  });

  describe('Accessibility', () => {
    it('has proper role when clickable', () => {
      const handleClick = jest.fn();
      render(<Card onClick={handleClick}>Clickable card</Card>);
      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
    });

    it('supports keyboard navigation when clickable', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<Card onClick={handleClick}>Clickable card</Card>);
      
      const card = screen.getByRole('button');
      await user.tab();
      expect(card).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('has proper ARIA attributes', () => {
      render(<Card aria-label="User profile card">Profile</Card>);
      const card = screen.getByLabelText('User profile card');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClick when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<Card onClick={handleClick}>Clickable card</Card>);
      
      await user.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard activation', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<Card onClick={handleClick}>Clickable card</Card>);
      
      const card = screen.getByRole('button');
      await user.click(card);
      await user.keyboard('{Space}');
      expect(handleClick).toHaveBeenCalledTimes(2); // Once for click, once for space
    });

    it('does not call onClick when disabled', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<Card onClick={handleClick} disabled>Disabled card</Card>);
      
      await user.click(screen.getByText('Disabled card'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Card Subcomponents', () => {
    it('renders Card.Header with proper styling', () => {
      render(
        <Card>
          <Card.Header>Header content</Card.Header>
        </Card>
      );
      const header = screen.getByText('Header content');
      expect(header).toHaveClass('px-6', 'py-4', 'border-b', 'border-slate-700');
    });

    it('renders Card.Content with proper styling', () => {
      render(
        <Card>
          <Card.Content>Content</Card.Content>
        </Card>
      );
      const content = screen.getByText('Content');
      expect(content).toHaveClass('px-6', 'py-4');
    });

    it('renders Card.Footer with proper styling', () => {
      render(
        <Card>
          <Card.Footer>Footer content</Card.Footer>
        </Card>
      );
      const footer = screen.getByText('Footer content');
      expect(footer).toHaveClass('px-6', 'py-4', 'border-t', 'border-slate-700');
    });
  });

  describe('Custom Props', () => {
    it('forwards custom props to card element', () => {
      render(<Card data-testid="custom-card" className="custom-class">Custom</Card>);
      const card = screen.getByTestId('custom-card');
      expect(card).toHaveClass('custom-class');
    });

    it('applies custom className', () => {
      render(<Card className="my-custom-card">Custom</Card>);
      const card = screen.getByText('Custom');
      expect(card).toHaveClass('my-custom-card');
    });
  });
});

