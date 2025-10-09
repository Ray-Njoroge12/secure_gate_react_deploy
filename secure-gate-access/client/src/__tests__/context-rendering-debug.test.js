/**
 * @fileoverview Debug test for context rendering issues
 * @description Simple test to isolate context provider rendering problems
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen  } from '../../test-utils';
import { BrowserCompatibilityProvider } from '../contexts/BrowserCompatibilityContext';

// Simple test component
const SimpleTestComponent = () => {
  return <div data-testid="simple-test">Simple Test Component</div>;
};

describe('Context Rendering Debug', () => {
  test('renders simple component without context', () => {
    render(<SimpleTestComponent />);
    expect(screen.getByTestId('simple-test')).toBeInTheDocument();
  });

  test('renders simple component with context provider', () => {
    render(
      <BrowserCompatibilityProvider>
        <SimpleTestComponent />
      </BrowserCompatibilityProvider>
    );
    expect(screen.getByTestId('simple-test')).toBeInTheDocument();
  });

  test('renders context provider with children', () => {
    const { container } = render(
      <BrowserCompatibilityProvider>
        <div>Test Content</div>
      </BrowserCompatibilityProvider>
    );
    
    expect(container.firstChild).toBeInTheDocument();
    expect(container.textContent).toBe('Test Content');
  });
});



