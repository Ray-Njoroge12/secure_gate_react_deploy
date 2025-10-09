// Minimal Button test without complex wrappers
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button from '../Button';

describe('Button Component - Minimal Test', () => {
  it('renders without crashing', () => {
    const { container } = render(<Button>Test Button</Button>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with text content', () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeInTheDocument();
  });
});
