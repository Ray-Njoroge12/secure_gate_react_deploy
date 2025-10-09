/**
 * EnhancedLoading Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import '@testing-library/jest-dom';
import EnhancedLoading from '../EnhancedLoading';
import { LOADING_TYPES, LOADING_PRIORITIES } from '../../../hooks/useLoadingStates';

describe('EnhancedLoading', () => {
  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<EnhancedLoading />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders with custom message', () => {
      render(<EnhancedLoading message="Loading data..." />);
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('renders with different variants', () => {
      const { rerender } = render(<EnhancedLoading variant="spinner" />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(<EnhancedLoading variant="dots" />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(<EnhancedLoading variant="pulse" />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(<EnhancedLoading variant="wave" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders with different sizes', () => {
      const { rerender } = render(<EnhancedLoading size="sm" />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(<EnhancedLoading size="md" />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(<EnhancedLoading size="lg" />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(<EnhancedLoading size="xl" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading state when active', () => {
      render(<EnhancedLoading isActive={true} message="Loading..." />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows success state', () => {
      render(<EnhancedLoading success={true} />);
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    it('shows error state', () => {
      render(<EnhancedLoading error="Something went wrong" />);
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });

    it('shows cancelled state', () => {
      render(<EnhancedLoading cancelled={true} />);
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('shows progress bar when progress is provided', () => {
      render(<EnhancedLoading progress={50} variant="progress" />);
      const progressBar = screen.getByRole('progressbar', { hidden: true });
      expect(progressBar).toBeInTheDocument();
    });

    it('displays correct progress percentage', () => {
      render(<EnhancedLoading progress={75} variant="progress" />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('clamps progress between 0 and 100', () => {
      const { rerender } = render(<EnhancedLoading progress={150} variant="progress" />);
      expect(screen.getByText('100%')).toBeInTheDocument();

      rerender(<EnhancedLoading progress={-10} variant="progress" />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Overlay Mode', () => {
    it('renders as overlay when overlay prop is true', () => {
      render(<EnhancedLoading overlay={true} message="Loading..." />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders as fullscreen when fullscreen prop is true', () => {
      render(<EnhancedLoading fullscreen={true} message="Loading..." />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Cancel Functionality', () => {
    it('shows cancel button when allowCancel is true', () => {
      render(<EnhancedLoading allowCancel={true} isActive={true} />);
      expect(screen.getByLabelText('Cancel loading')).toBeInTheDocument();
    });

    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = jest.fn();
      render(<EnhancedLoading allowCancel={true} isActive={true} onCancel={onCancel} />);
      
      fireEvent.click(screen.getByLabelText('Cancel loading'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('handles escape key for cancellation', () => {
      const onCancel = jest.fn();
      render(<EnhancedLoading allowCancel={true} isActive={true} onCancel={onCancel} />);
      
      fireEvent.keyDown(screen.getByRole('status'), { key: 'Escape' });
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<EnhancedLoading message="Loading data" ariaLabel="Custom loading" />);
      const element = screen.getByRole('status');
      expect(element).toHaveAttribute('aria-label', 'Custom loading');
      expect(element).toHaveAttribute('aria-live', 'polite');
    });

    it('has proper tabindex when cancelable', () => {
      render(<EnhancedLoading allowCancel={true} isActive={true} />);
      const element = screen.getByRole('status');
      expect(element).toHaveAttribute('tabIndex', '0');
    });

    it('has proper tabindex when not cancelable', () => {
      render(<EnhancedLoading allowCancel={false} isActive={true} />);
      const element = screen.getByRole('status');
      expect(element).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Loading Types', () => {
    it('renders with different loading types', () => {
      const { rerender } = render(<EnhancedLoading type={LOADING_TYPES.SUBMIT} />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(<EnhancedLoading type={LOADING_TYPES.UPLOAD} />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      rerender(<EnhancedLoading type={LOADING_TYPES.SEARCH} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(<EnhancedLoading className="custom-class" />);
      expect(screen.getByRole('status')).toHaveClass('custom-class');
    });

    it('applies custom message className', () => {
      render(<EnhancedLoading message="Loading..." messageClassName="custom-message" />);
      expect(screen.getByText('Loading...')).toHaveClass('custom-message');
    });

    it('applies custom progress className', () => {
      render(<EnhancedLoading progress={50} variant="progress" progressClassName="custom-progress" />);
      const progressContainer = screen.getByText('50%').closest('div');
      expect(progressContainer).toHaveClass('custom-progress');
    });
  });

  describe('Button Component', () => {
    it('renders loading button with loading state', () => {
      render(
        <EnhancedLoading.Button loading={true} loadingText="Saving...">
          Save
        </EnhancedLoading.Button>
      );
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('renders loading button with normal state', () => {
      render(
        <EnhancedLoading.Button loading={false}>
          Save
        </EnhancedLoading.Button>
      );
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('disables button when loading', () => {
      render(
        <EnhancedLoading.Button loading={true} loadingText="Saving...">
          Save
        </EnhancedLoading.Button>
      );
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('calls onClick when not loading', () => {
      const onClick = jest.fn();
      render(
        <EnhancedLoading.Button loading={false} onClick={onClick}>
          Save
        </EnhancedLoading.Button>
      );
      
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalled();
    });

    it('does not call onClick when loading', () => {
      const onClick = jest.fn();
      render(
        <EnhancedLoading.Button loading={true} onClick={onClick}>
          Save
        </EnhancedLoading.Button>
      );
      
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Card Component', () => {
    it('renders loading card with skeleton when loading', () => {
      render(
        <EnhancedLoading.Card loading={true} showSkeleton={true}>
          <div>Content</div>
        </EnhancedLoading.Card>
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders loading card with spinner when loading without skeleton', () => {
      render(
        <EnhancedLoading.Card loading={true} showSkeleton={false}>
          <div>Content</div>
        </EnhancedLoading.Card>
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders children when not loading', () => {
      render(
        <EnhancedLoading.Card loading={false}>
          <div>Content</div>
        </EnhancedLoading.Card>
      );
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Table Component', () => {
    it('renders loading table with skeleton when loading', () => {
      render(
        <EnhancedLoading.Table loading={true} showSkeleton={true}>
          <div>Table Content</div>
        </EnhancedLoading.Table>
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders loading table with spinner when loading without skeleton', () => {
      render(
        <EnhancedLoading.Table loading={true} showSkeleton={false}>
          <div>Table Content</div>
        </EnhancedLoading.Table>
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders children when not loading', () => {
      render(
        <EnhancedLoading.Table loading={false}>
          <div>Table Content</div>
        </EnhancedLoading.Table>
      );
      expect(screen.getByText('Table Content')).toBeInTheDocument();
    });
  });
});




