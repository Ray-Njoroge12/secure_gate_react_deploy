/**
 * Unit Tests for ValidationFeedback Component
 * 
 * Tests validation feedback and correction suggestions
 * Requirements: 7.1, 7.2
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ValidationFeedback from '../../../components/error/ValidationFeedback';

describe('ValidationFeedback Component', () => {
  const defaultProps = {
    field: 'email',
    errors: [],
    warnings: [],
    suggestions: [],
    isValid: false,
    isValidating: false,
    showSuggestions: true,
    className: ''
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Display', () => {
    test('should display error messages correctly', () => {
      const errors = ['Email is required', 'Invalid email format'];
      
      render(
        <ValidationFeedback
          {...defaultProps}
          errors={errors}
        />
      );

      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      expect(screen.getByText('❌')).toBeInTheDocument();
    });

    test('should display warning messages correctly', () => {
      const warnings = ['Email domain not commonly used'];
      
      render(
        <ValidationFeedback
          {...defaultProps}
          warnings={warnings}
        />
      );

      expect(screen.getByText('Email domain not commonly used')).toBeInTheDocument();
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    test('should display validation success state', () => {
      render(
        <ValidationFeedback
          {...defaultProps}
          isValid={true}
        />
      );

      expect(screen.getByText('email looks good!')).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
    });

    test('should display validating state', () => {
      render(
        <ValidationFeedback
          {...defaultProps}
          isValidating={true}
        />
      );

      expect(screen.getByText('Checking email...')).toBeInTheDocument();
      expect(screen.getByText('⏳')).toBeInTheDocument();
    });
  });

  describe('Correction Suggestions', () => {
    test('should display correction suggestions', () => {
      const suggestions = [
        'Try using a valid email format like user@example.com',
        'Make sure there are no spaces in the email address'
      ];
      
      render(
        <ValidationFeedback
          {...defaultProps}
          suggestions={suggestions}
        />
      );

      expect(screen.getByText('Suggestions:')).toBeInTheDocument();
      expect(screen.getByText('Try using a valid email format like user@example.com')).toBeInTheDocument();
      expect(screen.getByText('Make sure there are no spaces in the email address')).toBeInTheDocument();
      expect(screen.getByText('💡')).toBeInTheDocument();
    });

    test('should show limited suggestions initially and expand on click', () => {
      const suggestions = [
        'Suggestion 1',
        'Suggestion 2',
        'Suggestion 3',
        'Suggestion 4'
      ];
      
      render(
        <ValidationFeedback
          {...defaultProps}
          suggestions={suggestions}
        />
      );

      // Should show only first 2 suggestions initially
      expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
      expect(screen.getByText('Suggestion 2')).toBeInTheDocument();
      expect(screen.queryByText('Suggestion 3')).not.toBeInTheDocument();
      expect(screen.queryByText('Suggestion 4')).not.toBeInTheDocument();

      // Should show "Show more" button
      const showMoreButton = screen.getByText('Show 2 more suggestions');
      expect(showMoreButton).toBeInTheDocument();

      // Click to show all suggestions
      fireEvent.click(showMoreButton);

      expect(screen.getByText('Suggestion 3')).toBeInTheDocument();
      expect(screen.getByText('Suggestion 4')).toBeInTheDocument();
      expect(screen.queryByText('Show 2 more suggestions')).not.toBeInTheDocument();
    });

    test('should hide suggestions when showSuggestions is false', () => {
      const suggestions = ['Some suggestion'];
      
      render(
        <ValidationFeedback
          {...defaultProps}
          suggestions={suggestions}
          showSuggestions={false}
        />
      );

      expect(screen.queryByText('Suggestions:')).not.toBeInTheDocument();
      expect(screen.queryByText('Some suggestion')).not.toBeInTheDocument();
    });
  });

  describe('CSS Classes and Styling', () => {
    test('should apply correct CSS classes for error state', () => {
      const { container } = render(
        <ValidationFeedback
          {...defaultProps}
          errors={['Error message']}
        />
      );

      const feedbackElement = container.querySelector('.validation-feedback');
      expect(feedbackElement).toHaveClass('validation-feedback--error');
    });

    test('should apply correct CSS classes for warning state', () => {
      const { container } = render(
        <ValidationFeedback
          {...defaultProps}
          warnings={['Warning message']}
        />
      );

      const feedbackElement = container.querySelector('.validation-feedback');
      expect(feedbackElement).toHaveClass('validation-feedback--warning');
    });

    test('should apply correct CSS classes for valid state', () => {
      const { container } = render(
        <ValidationFeedback
          {...defaultProps}
          isValid={true}
        />
      );

      const feedbackElement = container.querySelector('.validation-feedback');
      expect(feedbackElement).toHaveClass('validation-feedback--valid');
    });

    test('should apply correct CSS classes for validating state', () => {
      const { container } = render(
        <ValidationFeedback
          {...defaultProps}
          isValidating={true}
        />
      );

      const feedbackElement = container.querySelector('.validation-feedback');
      expect(feedbackElement).toHaveClass('validation-feedback--validating');
    });

    test('should apply custom className', () => {
      const { container } = render(
        <ValidationFeedback
          {...defaultProps}
          className="custom-class"
          errors={['Error']}
        />
      );

      const feedbackElement = container.querySelector('.validation-feedback');
      expect(feedbackElement).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA attributes', () => {
      render(
        <ValidationFeedback
          {...defaultProps}
          errors={['Error message']}
        />
      );

      const feedbackElement = screen.getByRole('status');
      expect(feedbackElement).toHaveAttribute('aria-live', 'polite');
      expect(feedbackElement).toHaveAttribute('aria-label', 'Validation feedback for email');
    });

    test('should be accessible to screen readers', () => {
      render(
        <ValidationFeedback
          {...defaultProps}
          field="password"
          errors={['Password is too short']}
        />
      );

      const feedbackElement = screen.getByRole('status');
      expect(feedbackElement).toHaveAttribute('aria-label', 'Validation feedback for password');
    });
  });

  describe('Conditional Rendering', () => {
    test('should not render when no feedback to show', () => {
      const { container } = render(
        <ValidationFeedback
          {...defaultProps}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    test('should render when there are errors', () => {
      const { container } = render(
        <ValidationFeedback
          {...defaultProps}
          errors={['Error message']}
        />
      );

      expect(container.firstChild).not.toBeNull();
    });

    test('should render when there are warnings', () => {
      const { container } = render(
        <ValidationFeedback
          {...defaultProps}
          warnings={['Warning message']}
        />
      );

      expect(container.firstChild).not.toBeNull();
    });

    test('should render when validating', () => {
      const { container } = render(
        <ValidationFeedback
          {...defaultProps}
          isValidating={true}
        />
      );

      expect(container.firstChild).not.toBeNull();
    });

    test('should render when valid', () => {
      const { container } = render(
        <ValidationFeedback
          {...defaultProps}
          isValid={true}
        />
      );

      expect(container.firstChild).not.toBeNull();
    });

    test('should render when there are suggestions', () => {
      const { container } = render(
        <ValidationFeedback
          {...defaultProps}
          suggestions={['Suggestion']}
        />
      );

      expect(container.firstChild).not.toBeNull();
    });
  });

  describe('Message Priority', () => {
    test('should prioritize errors over warnings', () => {
      render(
        <ValidationFeedback
          {...defaultProps}
          errors={['Error message']}
          warnings={['Warning message']}
        />
      );

      expect(screen.getByText('❌')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    test('should show warnings when no errors', () => {
      render(
        <ValidationFeedback
          {...defaultProps}
          warnings={['Warning message']}
        />
      );

      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    test('should not show valid message when there are errors or warnings', () => {
      render(
        <ValidationFeedback
          {...defaultProps}
          errors={['Error message']}
          isValid={true}
        />
      );

      expect(screen.queryByText('email looks good!')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });
});