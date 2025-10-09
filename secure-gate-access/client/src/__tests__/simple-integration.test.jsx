/**
 * @fileoverview Simple Integration Test
 * @description Minimal test to debug integration test issues
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen } from '../../test-utils';

// Simple test component
const SimpleComponent = () => {
  return <div data-testid="simple-component">Simple Component</div>;
};

describe('Simple Integration Test', () => {
  test('renders simple component with providers', () => {
    render(<SimpleComponent />);
    
    expect(screen.getByTestId('simple-component')).toBeInTheDocument();
  });

  test('renders div element', () => {
    render(<div data-testid="test-div">Test Div</div>);
    
    expect(screen.getByTestId('test-div')).toBeInTheDocument();
  });
});



