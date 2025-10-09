import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import LoadingStates from '../LoadingStates';

describe('LoadingStates Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Basic Loading', () => {
    it('renders with default props', () => {
      render(<LoadingStates />);
      const spinner = screen.getByRole('generic');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    it('renders with different sizes', () => {
      const { rerender } = render(<LoadingStates size="sm" />);
      expect(screen.getByRole('generic')).toHaveClass('w-4', 'h-4');

      rerender(<LoadingStates size="lg" />);
      expect(screen.getByRole('generic')).toHaveClass('w-12', 'h-12');
    });

    it('renders with different variants', () => {
      const { rerender } = render(<LoadingStates variant="dots" />);
      expect(screen.getByRole('generic')).toHaveClass('flex', 'space-x-1');

      rerender(<LoadingStates variant="pulse" />);
      expect(screen.getByRole('generic')).toHaveClass('animate-pulse');

      rerender(<LoadingStates variant="progress" />);
      expect(screen.getByRole('generic')).toHaveClass('w-full', 'max-w-xs');
    });

    it('renders with text', () => {
      render(<LoadingStates text="Loading data..." />);
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('renders as overlay when overlay prop is true', () => {
      render(<LoadingStates overlay />);
      const overlay = screen.getByRole('generic');
      expect(overlay).toHaveClass('fixed', 'inset-0', 'z-50');
    });
  });

  describe('LoadingButton', () => {
    it('renders button with loading state', () => {
      render(<LoadingStates.Button loading>Submit</LoadingStates.Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders button with custom loading text', () => {
      render(<LoadingStates.Button loading loadingText="Saving...">Save</LoadingStates.Button>);
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('renders normal button when not loading', () => {
      render(<LoadingStates.Button>Submit</LoadingStates.Button>);
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });

    it('handles click events when not loading', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<LoadingStates.Button onClick={handleClick}>Click me</LoadingStates.Button>);
      
      await user.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not handle click events when loading', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      render(<LoadingStates.Button loading onClick={handleClick}>Loading</LoadingStates.Button>);
      
      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('LoadingCard', () => {
    it('renders skeleton when loading with skeleton prop', () => {
      render(<LoadingStates.Card loading skeleton>Content</LoadingStates.Card>);
      const card = screen.getByRole('generic');
      expect(card).toHaveClass('bg-slate-800', 'rounded-lg');
    });

    it('renders loading spinner when loading without skeleton', () => {
      render(<LoadingStates.Card loading skeleton={false}>Content</LoadingStates.Card>);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders children when not loading', () => {
      render(<LoadingStates.Card>Content</LoadingStates.Card>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('LoadingTable', () => {
    it('renders skeleton table when loading', () => {
      render(<LoadingStates.Table loading>Table content</LoadingStates.Table>);
      const table = screen.getByRole('generic');
      expect(table).toHaveClass('bg-slate-800', 'rounded-lg');
    });

    it('renders loading spinner when loading without skeleton', () => {
      render(<LoadingStates.Table loading skeleton={false}>Table content</LoadingStates.Table>);
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('renders children when not loading', () => {
      render(<LoadingStates.Table>Table content</LoadingStates.Table>);
      expect(screen.getByText('Table content')).toBeInTheDocument();
    });
  });

  describe('LoadingForm', () => {
    it('renders skeleton form when loading', () => {
      render(<LoadingStates.Form loading>Form content</LoadingStates.Form>);
      const form = screen.getByRole('generic');
      expect(form).toHaveClass('space-y-6');
    });

    it('renders loading spinner when loading without skeleton', () => {
      render(<LoadingStates.Form loading skeleton={false}>Form content</LoadingStates.Form>);
      expect(screen.getByText('Loading form...')).toBeInTheDocument();
    });

    it('renders children when not loading', () => {
      render(<LoadingStates.Form>Form content</LoadingStates.Form>);
      expect(screen.getByText('Form content')).toBeInTheDocument();
    });
  });

  describe('LoadingList', () => {
    it('renders skeleton list when loading', () => {
      render(<LoadingStates.List loading>List content</LoadingStates.List>);
      const list = screen.getByRole('generic');
      expect(list).toHaveClass('space-y-3');
    });

    it('renders loading spinner when loading without skeleton', () => {
      render(<LoadingStates.List loading skeleton={false}>List content</LoadingStates.List>);
      expect(screen.getByText('Loading items...')).toBeInTheDocument();
    });

    it('renders children when not loading', () => {
      render(<LoadingStates.List>List content</LoadingStates.List>);
      expect(screen.getByText('List content')).toBeInTheDocument();
    });
  });

  describe('LoadingDashboard', () => {
    it('renders skeleton dashboard when loading', () => {
      render(<LoadingStates.Dashboard loading>Dashboard content</LoadingStates.Dashboard>);
      const dashboard = screen.getByRole('generic');
      expect(dashboard).toHaveClass('space-y-6');
    });

    it('renders loading spinner when loading without skeleton', () => {
      render(<LoadingStates.Dashboard loading skeleton={false}>Dashboard content</LoadingStates.Dashboard>);
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });

    it('renders children when not loading', () => {
      render(<LoadingStates.Dashboard>Dashboard content</LoadingStates.Dashboard>);
      expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    });
  });

  describe('LoadingOverlay', () => {
    it('renders overlay when loading is true', () => {
      render(
        <LoadingStates.Overlay loading>
          <div>Content</div>
        </LoadingStates.Overlay>
      );
      expect(screen.getByText('Content')).toBeInTheDocument();
      const overlay = screen.getByText('Loading...');
      expect(overlay).toBeInTheDocument();
    });

    it('does not render overlay when loading is false', () => {
      render(
        <LoadingStates.Overlay loading={false}>
          <div>Content</div>
        </LoadingStates.Overlay>
      );
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('renders custom loading message', () => {
      render(
        <LoadingStates.Overlay loading message="Custom loading...">
          <div>Content</div>
        </LoadingStates.Overlay>
      );
      expect(screen.getByText('Custom loading...')).toBeInTheDocument();
    });
  });

  describe('ProgressLoading', () => {
    it('renders progress loading with default progress', () => {
      render(<LoadingStates.Progress />);
      const progress = screen.getByRole('generic');
      expect(progress).toHaveClass('text-center');
    });

    it('renders progress loading with custom progress', () => {
      render(<LoadingStates.Progress progress={75} />);
      const progressBar = screen.getByRole('generic');
      expect(progressBar).toHaveStyle('width: 75%');
    });

    it('renders progress loading with percentage', () => {
      render(<LoadingStates.Progress progress={50} showPercentage />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('renders progress loading with custom message', () => {
      render(<LoadingStates.Progress message="Processing data..." />);
      expect(screen.getByText('Processing data...')).toBeInTheDocument();
    });

    it('updates progress smoothly', async () => {
      const { rerender } = render(<LoadingStates.Progress progress={0} />);
      let progressBar = screen.getByRole('generic');
      expect(progressBar).toHaveStyle('width: 0%');

      rerender(<LoadingStates.Progress progress={100} />);
      progressBar = screen.getByRole('generic');
      expect(progressBar).toHaveStyle('width: 100%');
    });
  });
});

