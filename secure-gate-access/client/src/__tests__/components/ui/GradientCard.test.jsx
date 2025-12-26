import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GradientCard from '../../../components/ui/GradientCard';

describe('GradientCard', () => {
  test('renders children content', () => {
    render(<GradientCard>Card Content</GradientCard>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  test('applies variant class', () => {
    const { container } = render(<GradientCard variant="primary">Content</GradientCard>);
    expect(container.firstChild.className).toContain('gradient-card--primary');
  });

  test('applies padding class', () => {
    const { container } = render(<GradientCard padding="lg">Content</GradientCard>);
    expect(container.firstChild.className).toContain('gradient-card--padding-lg');
  });

  test('applies hoverable class when hoverable is true', () => {
    const { container } = render(<GradientCard hoverable>Content</GradientCard>);
    expect(container.firstChild.className).toContain('gradient-card--hoverable');
  });

  test('applies clickable class and calls onClick when clickable', () => {
    const handleClick = jest.fn();
    const { container } = render(
      <GradientCard clickable onClick={handleClick}>Content</GradientCard>
    );
    
    expect(container.firstChild.className).toContain('gradient-card--clickable');
    
    fireEvent.click(container.firstChild);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('handles keyboard interaction when clickable', () => {
    const handleClick = jest.fn();
    const { container } = render(
      <GradientCard clickable onClick={handleClick}>Content</GradientCard>
    );
    
    fireEvent.keyDown(container.firstChild, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(container.firstChild, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  test('applies shadow class when shadow is true', () => {
    const { container } = render(<GradientCard shadow>Content</GradientCard>);
    expect(container.firstChild.className).toContain('gradient-card--shadow');
  });

  test('applies border class when border is true', () => {
    const { container } = render(<GradientCard border>Content</GradientCard>);
    expect(container.firstChild.className).toContain('gradient-card--border');
  });

  test('applies custom className', () => {
    const { container } = render(<GradientCard className="custom-class">Content</GradientCard>);
    expect(container.firstChild.className).toContain('custom-class');
  });

  test('applies inline styles', () => {
    const { container } = render(
      <GradientCard style={{ backgroundColor: 'red' }}>Content</GradientCard>
    );
    expect(container.firstChild).toHaveStyle({ backgroundColor: 'red' });
  });

  test('sets role="button" when clickable', () => {
    const { container } = render(<GradientCard clickable>Content</GradientCard>);
    expect(container.firstChild).toHaveAttribute('role', 'button');
  });

  test('sets tabIndex when clickable', () => {
    const { container } = render(<GradientCard clickable>Content</GradientCard>);
    expect(container.firstChild).toHaveAttribute('tabIndex', '0');
  });
});

describe('GradientCard.Header', () => {
  test('renders header content', () => {
    render(
      <GradientCard>
        <GradientCard.Header>Header Text</GradientCard.Header>
      </GradientCard>
    );
    expect(screen.getByText('Header Text')).toBeInTheDocument();
  });
});

describe('GradientCard.Body', () => {
  test('renders body content', () => {
    render(
      <GradientCard>
        <GradientCard.Body>Body Content</GradientCard.Body>
      </GradientCard>
    );
    expect(screen.getByText('Body Content')).toBeInTheDocument();
  });
});

describe('GradientCard.Footer', () => {
  test('renders footer content', () => {
    render(
      <GradientCard>
        <GradientCard.Footer>Footer Text</GradientCard.Footer>
      </GradientCard>
    );
    expect(screen.getByText('Footer Text')).toBeInTheDocument();
  });
});

describe('GradientCard.Title', () => {
  test('renders title as h3 by default', () => {
    render(
      <GradientCard>
        <GradientCard.Title>Card Title</GradientCard.Title>
      </GradientCard>
    );
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Card Title');
  });

  test('renders title with custom heading level', () => {
    render(
      <GradientCard>
        <GradientCard.Title as="h2">Card Title</GradientCard.Title>
      </GradientCard>
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Card Title');
  });
});

describe('GradientCard.Description', () => {
  test('renders description text', () => {
    render(
      <GradientCard>
        <GradientCard.Description>Description text</GradientCard.Description>
      </GradientCard>
    );
    expect(screen.getByText('Description text')).toBeInTheDocument();
  });
});
