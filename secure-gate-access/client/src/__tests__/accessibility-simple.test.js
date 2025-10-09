/**
 * @fileoverview Simple Accessibility Test
 * @description Test useAccessibility hook in isolation
 */

import React from 'react';
import { render  } from '../../test-utils';
import { useAccessibility } from '../hooks/useAccessibility';

// Test component that uses useAccessibility
const TestComponent = () => {
  const accessibility = useAccessibility();
  return <div data-testid="test">Accessibility hook loaded</div>;
};

describe('useAccessibility Hook - Simple Test', () => {
  test('useAccessibility hook works in isolation', () => {
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('test')).toHaveTextContent('Accessibility hook loaded');
  });
});
