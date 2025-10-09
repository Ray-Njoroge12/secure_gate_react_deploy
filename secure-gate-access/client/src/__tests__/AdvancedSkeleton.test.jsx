/**
 * AdvancedSkeleton Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import '@testing-library/jest-dom';
import AdvancedSkeleton from '../AdvancedSkeleton';

describe('AdvancedSkeleton', () => {
  describe('Base Skeleton', () => {
    it('renders with default props', () => {
      render(<AdvancedSkeleton.Base />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<AdvancedSkeleton.Base className="custom-class" />);
      expect(screen.getByRole('status')).toHaveClass('custom-class');
    });

    it('renders with custom width and height', () => {
      render(<AdvancedSkeleton.Base width="200px" height="50px" />);
      const element = screen.getByRole('status');
      expect(element).toHaveStyle({ width: '200px', height: '50px' });
    });

    it('renders with numeric width and height', () => {
      render(<AdvancedSkeleton.Base width={200} height={50} />);
      const element = screen.getByRole('status');
      expect(element).toHaveStyle({ width: '200px', height: '50px' });
    });

    it('renders circle variant', () => {
      render(<AdvancedSkeleton.Base variant="circle" width={40} height={40} />);
      const element = screen.getByRole('status');
      expect(element).toHaveClass('rounded-full');
    });

    it('renders text variant with multiple lines', () => {
      render(<AdvancedSkeleton.Base variant="text" lines={3} />);
      const container = screen.getByRole('status').parentElement;
      expect(container).toBeInTheDocument();
    });

    it('applies shimmer effect when enabled', () => {
      render(<AdvancedSkeleton.Base shimmer={true} />);
      const element = screen.getByRole('status');
      expect(element).toHaveClass('relative', 'overflow-hidden');
    });

    it('does not apply shimmer effect when disabled', () => {
      render(<AdvancedSkeleton.Base shimmer={false} />);
      const element = screen.getByRole('status');
      expect(element).not.toHaveClass('relative', 'overflow-hidden');
    });

    it('applies animation when animated is true', () => {
      render(<AdvancedSkeleton.Base animated={true} />);
      const element = screen.getByRole('status');
      expect(element).toHaveClass('animate-pulse');
    });

    it('does not apply animation when animated is false', () => {
      render(<AdvancedSkeleton.Base animated={false} />);
      const element = screen.getByRole('status');
      expect(element).not.toHaveClass('animate-pulse');
    });
  });

  describe('Card Skeleton', () => {
    it('renders card skeleton with default props', () => {
      render(<AdvancedSkeleton.Card />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders card skeleton with avatar', () => {
      render(<AdvancedSkeleton.Card showAvatar={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders card skeleton with actions', () => {
      render(<AdvancedSkeleton.Card showActions={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders card skeleton with image', () => {
      render(<AdvancedSkeleton.Card showImage={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders card skeleton with custom lines', () => {
      render(<AdvancedSkeleton.Card lines={5} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders compact variant', () => {
      render(<AdvancedSkeleton.Card variant="compact" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders minimal variant', () => {
      render(<AdvancedSkeleton.Card variant="minimal" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Table Skeleton', () => {
    it('renders table skeleton with default props', () => {
      render(<AdvancedSkeleton.Table />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders table skeleton with custom rows and columns', () => {
      render(<AdvancedSkeleton.Table rows={10} columns={6} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders table skeleton without header', () => {
      render(<AdvancedSkeleton.Table showHeader={false} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders table skeleton with pagination', () => {
      render(<AdvancedSkeleton.Table showPagination={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders compact variant', () => {
      render(<AdvancedSkeleton.Table variant="compact" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Form Skeleton', () => {
    it('renders form skeleton with default props', () => {
      render(<AdvancedSkeleton.Form />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders form skeleton with custom fields', () => {
      render(<AdvancedSkeleton.Form fields={8} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders form skeleton without submit button', () => {
      render(<AdvancedSkeleton.Form showSubmit={false} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders form skeleton without labels', () => {
      render(<AdvancedSkeleton.Form showLabels={false} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders inline variant', () => {
      render(<AdvancedSkeleton.Form variant="inline" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders compact variant', () => {
      render(<AdvancedSkeleton.Form variant="compact" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('List Skeleton', () => {
    it('renders list skeleton with default props', () => {
      render(<AdvancedSkeleton.List />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders list skeleton with custom items', () => {
      render(<AdvancedSkeleton.List items={8} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders list skeleton with avatar', () => {
      render(<AdvancedSkeleton.List showAvatar={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders list skeleton with actions', () => {
      render(<AdvancedSkeleton.List showActions={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders compact variant', () => {
      render(<AdvancedSkeleton.List variant="compact" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders minimal variant', () => {
      render(<AdvancedSkeleton.List variant="minimal" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Dashboard Skeleton', () => {
    it('renders dashboard skeleton with default props', () => {
      render(<AdvancedSkeleton.Dashboard />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders compact variant', () => {
      render(<AdvancedSkeleton.Dashboard variant="compact" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Chart Skeleton', () => {
    it('renders line chart skeleton', () => {
      render(<AdvancedSkeleton.Chart type="line" />);
      expect(screen.getAllByRole('status')).toHaveLength(1);
    });

    it('renders bar chart skeleton', () => {
      render(<AdvancedSkeleton.Chart type="bar" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders pie chart skeleton', () => {
      render(<AdvancedSkeleton.Chart type="pie" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders with custom height', () => {
      render(<AdvancedSkeleton.Chart type="line" height="400px" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Animation and Visibility', () => {
    it('becomes visible after a delay', async () => {
      render(<AdvancedSkeleton.Base />);
      const element = screen.getByRole('status');
      
      // Initially should have opacity-0
      expect(element).toHaveClass('opacity-0');
      
      // Wait for the visibility change
      await waitFor(() => {
        expect(element).toHaveClass('opacity-100');
      }, { timeout: 300 });
    });

    it('applies staggered animation delays', () => {
      render(
        <div>
          <AdvancedSkeleton.Base />
          <AdvancedSkeleton.Base />
          <AdvancedSkeleton.Base />
        </div>
      );
      
      const elements = screen.getAllByRole('status');
      expect(elements).toHaveLength(3);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<AdvancedSkeleton.Base />);
      const element = screen.getByRole('status');
      expect(element).toHaveAttribute('aria-label', 'Loading...');
    });

    it('has proper ARIA attributes for different variants', () => {
      render(<AdvancedSkeleton.Card />);
      const element = screen.getByRole('status');
      expect(element).toHaveAttribute('aria-label', 'Loading...');
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className to all variants', () => {
      const { rerender } = render(<AdvancedSkeleton.Base className="custom" />);
      expect(screen.getByRole('status')).toHaveClass('custom');

      rerender(<AdvancedSkeleton.Card className="custom" />);
      expect(screen.getByRole('status')).toHaveClass('custom');

      rerender(<AdvancedSkeleton.Table className="custom" />);
      expect(screen.getByRole('status')).toHaveClass('custom');

      rerender(<AdvancedSkeleton.Form className="custom" />);
      expect(screen.getByRole('status')).toHaveClass('custom');

      rerender(<AdvancedSkeleton.List className="custom" />);
      expect(screen.getByRole('status')).toHaveClass('custom');

      rerender(<AdvancedSkeleton.Dashboard className="custom" />);
      expect(screen.getByRole('status')).toHaveClass('custom');

      rerender(<AdvancedSkeleton.Chart className="custom" />);
      expect(screen.getByRole('status')).toHaveClass('custom');
    });
  });
});




