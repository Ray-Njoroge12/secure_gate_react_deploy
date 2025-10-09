/**
 * @fileoverview Tests for ResponsiveTable component
 * @description Comprehensive tests for the ResponsiveTable component including
 * responsive behavior, column priority, virtual scrolling, and accessibility
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import ResponsiveTable from '../ResponsiveTable';

// Mock the responsive hook
jest.mock('../../../utils/responsive', () => ({
  useCurrentBreakpoint: () => 'lg'
}));

// Test data
const mockColumns = [
  {
    key: 'name',
    label: 'Name',
    priority: 1,
    sortable: true
  },
  {
    key: 'email',
    label: 'Email',
    priority: 2,
    sortable: true
  },
  {
    key: 'status',
    label: 'Status',
    priority: 3,
    sortable: false
  },
  {
    key: 'actions',
    label: 'Actions',
    priority: 4,
    sortable: false,
    render: (value) => <button>Edit</button>
  }
];

const mockData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'pending' }
];

describe('ResponsiveTable Component', () => {
  describe('Rendering', () => {
    it('renders with basic props', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          data={mockData}
        />
      );
      
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders data rows correctly', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          data={mockData}
        />
      );
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('renders loading state', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          data={[]}
          loading={true}
        />
      );
      
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('renders empty state when no data', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          data={[]}
        />
      );
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('renders custom empty state', () => {
      const customEmptyState = {
        title: 'No visitors found',
        description: 'Try adjusting your search criteria.',
        icon: <div data-testid="empty-icon">Icon</div>
      };

      render(
        <ResponsiveTable
          columns={mockColumns}
          data={[]}
          emptyState={customEmptyState}
        />
      );
      
      expect(screen.getByText('No visitors found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search criteria.')).toBeInTheDocument();
      expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
    });
  });

  describe('Column Priority', () => {
    it('shows all columns on desktop', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          data={mockData}
        />
      );
      
      // All columns should be visible on desktop
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('renders sortable columns with sort indicators', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          data={mockData}
          onSort={jest.fn()}
        />
      );
      
      // Check for sort indicators (↕ symbol)
      const nameHeader = screen.getByText('Name').closest('th');
      expect(nameHeader).toHaveTextContent('↕');
      
      const emailHeader = screen.getByText('Email').closest('th');
      expect(emailHeader).toHaveTextContent('↕');
    });

    it('calls onSort when sortable column header is clicked', () => {
      const mockOnSort = jest.fn();
      
      render(
        <ResponsiveTable
          columns={mockColumns}
          data={mockData}
          onSort={mockOnSort}
        />
      );
      
      const nameHeader = screen.getByText('Name').closest('th');
      fireEvent.click(nameHeader);
      
      expect(mockOnSort).toHaveBeenCalledWith('name', 'asc');
    });

    it('toggles sort direction on subsequent clicks', () => {
      const mockOnSort = jest.fn();
      
      render(
        <ResponsiveTable
          columns={mockColumns}
          data={mockData}
          onSort={mockOnSort}
          sortBy="name"
          sortDirection="asc"
        />
      );
      
      const nameHeader = screen.getByText('Name').closest('th');
      fireEvent.click(nameHeader);
      
      expect(mockOnSort).toHaveBeenCalledWith('name', 'desc');
    });
  });

  describe('Row Interactions', () => {
    it('calls onRowClick when row is clicked', () => {
      const mockOnRowClick = jest.fn();
      
      render(
        <ResponsiveTable
          columns={mockColumns}
          data={mockData}
          onRowClick={mockOnRowClick}
        />
      );
      
      const firstRow = screen.getByText('John Doe').closest('tr');
      fireEvent.click(firstRow);
      
      expect(mockOnRowClick).toHaveBeenCalledWith(mockData[0]);
    });

    it('applies hover styles when onRowClick is provided', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          data={mockData}
          onRowClick={jest.fn()}
        />
      );
      
      const firstRow = screen.getByText('John Doe').closest('tr');
      expect(firstRow).toHaveClass('cursor-pointer');
    });
  });

  describe('Custom Rendering', () => {
    it('renders custom cell content using render function', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          data={mockData}
        />
      );
      
      expect(screen.getAllByText('Edit')).toHaveLength(3);
    });
  });

  describe('Accessibility', () => {
    it('has proper table structure', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          data={mockData}
        />
      );
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders).toHaveLength(4);
      
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(4); // 1 header + 3 data rows
    });

    it('has proper ARIA attributes for sorting', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          data={mockData}
          onSort={jest.fn()}
          sortBy="name"
          sortDirection="asc"
        />
      );
      
      const nameHeader = screen.getByText('Name').closest('th');
      expect(nameHeader).toHaveAttribute('aria-sort', 'asc');
    });

    it('has proper ARIA attributes for non-sorted columns', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          data={mockData}
          onSort={jest.fn()}
        />
      );
      
      const emailHeader = screen.getByText('Email').closest('th');
      expect(emailHeader).toHaveAttribute('aria-sort', 'none');
    });
  });

  describe('Virtual Scrolling', () => {
    it('enables virtual scrolling for large datasets', () => {
      const largeDataset = Array.from({ length: 150 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        status: 'active'
      }));

      render(
        <ResponsiveTable
          columns={mockColumns}
          data={largeDataset}
          enableVirtualScrolling={true}
          virtualScrollThreshold={100}
        />
      );
      
      // Should render only visible rows, not all 150
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeLessThan(150);
    });

    it('disables virtual scrolling for small datasets', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          data={mockData}
          enableVirtualScrolling={true}
          virtualScrollThreshold={100}
        />
      );
      
      // Should render all rows for small dataset
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(4); // 1 header + 3 data rows
    });
  });

  describe('Error Handling', () => {
    it('handles missing data gracefully', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          data={null}
        />
      );
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('handles empty columns array', () => {
      render(
        <ResponsiveTable
          columns={[]}
          data={mockData}
        />
      );
      
      // Should not crash and should show empty state
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });
});




