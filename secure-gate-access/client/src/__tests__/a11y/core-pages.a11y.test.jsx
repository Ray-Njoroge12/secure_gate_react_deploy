/**
 * @file core-pages.a11y.test.jsx
 * @description Automated WCAG accessibility tests for core pages using axe-core via jest-axe.
 * These tests catch common a11y violations (missing labels, landmark structure, etc.)
 * that would otherwise require manual audit.
 *
 * Rules disabled in all tests:
 *  - color-contrast: jsdom cannot compute CSS custom properties / Tailwind utility values,
 *    so color-contrast always produces false positives in unit test environments.
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { axe, toHaveNoViolations } from 'jest-axe';

import GradientButton from '../../components/ui/GradientButton.jsx';
import GradientCard from '../../components/ui/GradientCard.jsx';
import FloatingLabelInput from '../../components/ui/FloatingLabelInput.jsx';

import { renderWithAuth } from '../../test-utils';

// ---------------------------------------------------------------------------
// Global axe extension
// ---------------------------------------------------------------------------
expect.extend(toHaveNoViolations);

// ---------------------------------------------------------------------------
// Shared axe options: disable rules that reliably produce false positives in
// jsdom (color-contrast requires a real rendering engine to be meaningful).
// ---------------------------------------------------------------------------
const AXE_OPTIONS = {
  rules: {
    'color-contrast': { enabled: false },
  },
};

// ---------------------------------------------------------------------------
// Mocks – keep the mock surface minimal; only mock what the tested components
// actually import so that real a11y markup is preserved wherever possible.
// ---------------------------------------------------------------------------

// ErrorContext is used by Login and other pages.
jest.mock('../../contexts/ErrorContext.jsx', () => {
  const handlers = {
    handleError: jest.fn(),
    handleSuccess: jest.fn(),
    handleWarning: jest.fn(),
    clearAllErrors: jest.fn(),
    handleApiError: jest.fn(),
  };
  return {
    __esModule: true,
    ErrorProvider: ({ children }) => <>{children}</>,
    useError: () => handlers,
  };
});

// The `components/ui` barrel re-exports many heavy sub-trees. We replace the
// entire barrel with real implementations for the components used by Login,
// and stub the rest so that imports resolve without crashing.
jest.mock('../../components/ui', () => {
  const FloatingLabelInput =
    require('../../components/ui/FloatingLabelInput.jsx').default;
  const GradientButton =
    require('../../components/ui/GradientButton.jsx').default;
  const GradientCard =
    require('../../components/ui/GradientCard.jsx').default;

  const CheckboxModule = require('../../components/ui/Checkbox.jsx');
  const Checkbox = CheckboxModule.Checkbox || CheckboxModule.default;

  const Card = require('../../components/ui/Card.jsx').default;
  const Button = require('../../components/ui/Button.jsx').default;
  const Badge = require('../../components/ui/Badge.jsx').default;

  // Icon: render a plain <span> with the name as text so axe can evaluate
  // surrounding landmark / label structure without crashing.
  const Icon = ({ name, className, 'aria-hidden': ariaHidden, ...rest }) => (
    <span
      className={className}
      aria-hidden={ariaHidden ?? 'true'}
      data-icon={name}
      {...rest}
    />
  );

  const Skeleton = () => <div />;
  Skeleton.List = () => <div />;

  return {
    __esModule: true,
    FloatingLabelInput,
    GradientButton,
    GradientCard,
    Checkbox,
    Card,
    Button,
    Badge,
    Icon,
    SearchFilter: () => <div />,
    SearchResults: () => <div />,
    Pagination: () => <div />,
    LoadingStates: () => <div />,
    Skeleton,
    UpcomingVisitsEmpty: () => <div />,
    RecentVisitorsEmpty: () => <div />,
  };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Accessibility – core pages (axe-core / jest-axe)', () => {
  // -------------------------------------------------------------------------
  // 1. Login page
  // -------------------------------------------------------------------------
  test('LoginPage has no critical a11y violations', async () => {
    // Dynamic import so the module is resolved after mocks are set up.
    const { default: LoginPage } = await import('../../pages/Login.jsx');

    const { container } = renderWithAuth(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login', auth: { isAuthenticated: false, user: null } }
    );

    // Wait for the page heading to appear before running axe.
    await screen.findByText('Welcome Back');

    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  // -------------------------------------------------------------------------
  // 2. Core UI components used across the whole app
  //    Validates that our base design-system components are accessible in
  //    isolation (correct label association, button roles, etc.).
  // -------------------------------------------------------------------------
  test('Core UI components have no critical a11y violations', async () => {
    const { container } = render(
      <div>
        <GradientButton>Submit</GradientButton>

        <GradientCard>
          <GradientCard.Title>Card Title</GradientCard.Title>
          <GradientCard.Description>Card description text.</GradientCard.Description>
        </GradientCard>

        {/* FloatingLabelInput must receive an id so axe can verify label association */}
        <FloatingLabelInput id="email-field" label="Email Address" type="email" />
        <FloatingLabelInput id="password-field" label="Password" type="password" />
      </div>
    );

    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  // -------------------------------------------------------------------------
  // 3. Forgot-password view (same Login component, different route)
  //    Ensures the password-reset form is also accessible.
  //    Must use renderWithAuth because LoginPage calls useAuth() unconditionally.
  // -------------------------------------------------------------------------
  test('Forgot-password view has no critical a11y violations', async () => {
    const { default: LoginPage } = await import('../../pages/Login.jsx');

    const { container } = renderWithAuth(
      <Routes>
        <Route path="/forgot-password" element={<LoginPage />} />
      </Routes>,
      { route: '/forgot-password', auth: { isAuthenticated: false, user: null } }
    );

    // The forgot-password heading distinguishes this route from /login.
    await screen.findByText('Reset Password');

    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });
});
