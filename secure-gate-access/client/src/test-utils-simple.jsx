/**
 * @fileoverview Simplified test utilities for React Testing Library
 * @description Basic render function without complex providers
 */

import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Simple wrapper without complex context providers
const SimpleWrapper = ({ children }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

// Simple render function
const simpleRender = (ui, options = {}) => {
  return render(ui, { wrapper: SimpleWrapper, ...options });
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { simpleRender as render };
export { default as userEvent } from '@testing-library/user-event';


