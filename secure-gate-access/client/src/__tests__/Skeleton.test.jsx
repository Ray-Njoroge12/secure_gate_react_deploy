import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import '@testing-library/jest-dom';
import Skeleton from '../Skeleton';

describe('Skeleton Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Basic Skeleton', () => {
    it('renders with default props', () => {
      render(<Skeleton />);
      const skeleton = screen.getByRole('generic');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('bg-slate-700', 'rounded', 'animate-pulse');
    });

    it('renders with custom className', () => {
      render(<Skeleton className="custom-skeleton" />);
      const skeleton = screen.getByRole('generic');
      expect(skeleton).toHaveClass('custom-skeleton');
    });

    it('renders without animation when animated is false', () => {
      render(<Skeleton animated={false} />);
      const skeleton = screen.getByRole('generic');
      expect(skeleton).not.toHaveClass('animate-pulse');
    });

    it('renders with custom width and height', () => {
      render(<Skeleton width="200px" height="50px" />);
      const skeleton = screen.getByRole('generic');
      expect(skeleton).toHaveStyle('width: 200px; height: 50px');
    });

    it('renders multiple lines for text variant', () => {
      render(<Skeleton variant="text" lines={3} />);
      const skeletons = screen.getAllByRole('generic');
      expect(skeletons).toHaveLength(3);
    });
  });

  describe('SkeletonCard', () => {
    it('renders card skeleton with default props', () => {
      render(<Skeleton.Card />);
      const card = screen.getByRole('generic');
      expect(card).toHaveClass('bg-slate-800', 'rounded-lg', 'border', 'border-slate-700');
    });

    it('renders card skeleton with avatar', () => {
      render(<Skeleton.Card showAvatar />);
      const avatar = screen.getByRole('generic');
      expect(avatar).toHaveClass('flex-shrink-0');
    });

    it('renders card skeleton with actions', () => {
      render(<Skeleton.Card showActions />);
      const actions = screen.getAllByRole('generic');
      expect(actions).toHaveLength(2); // Two action buttons
    });

    it('renders card skeleton with custom lines', () => {
      render(<Skeleton.Card lines={5} />);
      const skeletons = screen.getAllByRole('generic');
      expect(skeletons.length).toBeGreaterThan(3); // Header + content lines + actions
    });
  });

  describe('SkeletonTable', () => {
    it('renders table skeleton with default props', () => {
      render(<Skeleton.Table />);
      const table = screen.getByRole('generic');
      expect(table).toHaveClass('bg-slate-800', 'rounded-lg', 'border', 'border-slate-700');
    });

    it('renders table skeleton with custom rows and columns', () => {
      render(<Skeleton.Table rows={3} columns={4} />);
      const skeletons = screen.getAllByRole('generic');
      expect(skeletons.length).toBeGreaterThan(10); // Header + rows * columns
    });

    it('renders table skeleton without header', () => {
      render(<Skeleton.Table showHeader={false} />);
      const skeletons = screen.getAllByRole('generic');
      expect(skeletons.length).toBeLessThan(10); // Only rows, no header
    });
  });

  describe('SkeletonForm', () => {
    it('renders form skeleton with default props', () => {
      render(<Skeleton.Form />);
      const form = screen.getByRole('generic');
      expect(form).toHaveClass('space-y-6');
    });

    it('renders form skeleton with custom fields', () => {
      render(<Skeleton.Form fields={6} />);
      const skeletons = screen.getAllByRole('generic');
      expect(skeletons.length).toBeGreaterThan(10); // Labels + inputs + submit buttons
    });

    it('renders form skeleton without submit buttons', () => {
      render(<Skeleton.Form showSubmit={false} />);
      const skeletons = screen.getAllByRole('generic');
      expect(skeletons.length).toBeLessThan(15); // No submit buttons
    });
  });

  describe('SkeletonList', () => {
    it('renders list skeleton with default props', () => {
      render(<Skeleton.List />);
      const list = screen.getByRole('generic');
      expect(list).toHaveClass('space-y-3');
    });

    it('renders list skeleton with custom items', () => {
      render(<Skeleton.List items={8} />);
      const skeletons = screen.getAllByRole('generic');
      expect(skeletons.length).toBeGreaterThan(8); // Items + content within each
    });

    it('renders list skeleton with avatars', () => {
      render(<Skeleton.List showAvatar />);
      const avatars = screen.getAllByRole('generic');
      expect(avatars.length).toBeGreaterThan(5); // Items + avatars
    });
  });

  describe('SkeletonDashboard', () => {
    it('renders dashboard skeleton', () => {
      render(<Skeleton.Dashboard />);
      const dashboard = screen.getAllByRole('generic')[0];
      expect(dashboard).toHaveClass('space-y-6');
    });

    it('renders dashboard skeleton with all components', () => {
      render(<Skeleton.Dashboard />);
      const skeletons = screen.getAllByRole('generic');
      expect(skeletons.length).toBeGreaterThan(15); // Header + stats + content
    });
  });

  describe('SkeletonOverlay', () => {
    it('renders overlay when loading is true', () => {
      render(
        <Skeleton.Overlay loading>
          <div>Content</div>
        </Skeleton.Overlay>
      );
      expect(screen.getByText('Content')).toBeInTheDocument();
      const overlay = screen.getByText('Loading...');
      expect(overlay).toBeInTheDocument();
    });

    it('does not render overlay when loading is false', () => {
      render(
        <Skeleton.Overlay loading={false}>
          <div>Content</div>
        </Skeleton.Overlay>
      );
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('renders custom loading message', () => {
      render(
        <Skeleton.Overlay loading message="Custom loading...">
          <div>Content</div>
        </Skeleton.Overlay>
      );
      expect(screen.getByText('Custom loading...')).toBeInTheDocument();
    });
  });

  describe('SkeletonProgress', () => {
    it('renders progress skeleton with default progress', () => {
      render(<Skeleton.Progress />);
      const progress = screen.getAllByRole('generic')[0];
      expect(progress).toHaveClass('space-y-2');
    });

    it('renders progress skeleton with custom progress', () => {
      render(<Skeleton.Progress progress={75} />);
      const progressBar = screen.getAllByRole('generic').find(el => 
        el.style.width === '75%'
      );
      expect(progressBar).toHaveStyle('width: 75%');
    });

    it('renders progress skeleton with percentage', () => {
      render(<Skeleton.Progress progress={50} showPercentage />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('renders progress skeleton with different sizes', () => {
      const { rerender } = render(<Skeleton.Progress size="sm" />);
      const progressContainer = screen.getAllByRole('generic').find(el => 
        el.className.includes('h-1')
      );
      expect(progressContainer).toHaveClass('h-1');

      rerender(<Skeleton.Progress size="lg" />);
      const progressContainerLg = screen.getAllByRole('generic').find(el => 
        el.className.includes('h-3')
      );
      expect(progressContainerLg).toHaveClass('h-3');
    });
  });
});
