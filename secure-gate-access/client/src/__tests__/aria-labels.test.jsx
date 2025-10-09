/**
 * @fileoverview ARIA labels and accessibility attributes tests
 * @description Comprehensive tests for WCAG 2.1 AA compliance
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent } from '../test-utils';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ErrorProvider } from '../../contexts/ErrorContext';
import { LoadingProvider } from '../../contexts/LoadingContext';
import { SearchProvider } from '../../contexts/SearchContext';
import { Button, Input, ResponsiveTable, ErrorQueue } from '../../components/ui';
import ValidatedInput from '../../components/ui/ValidatedInput';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import Layout from '../../components/Layout';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Test wrapper with all providers
const TestWrapper = ({ children }) => (
  <ErrorProvider>
    <LoadingProvider>
      <SearchProvider>
        {children}
      </SearchProvider>
    </LoadingProvider>
  </ErrorProvider>
);

describe('ARIA Labels and Accessibility Attributes', () => {
  describe('Button Component', () => {
    it('has proper ARIA attributes for text buttons', () => {
      render(
        <TestWrapper>
          <Button>Click me</Button>
        </TestWrapper>
      );
      
      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
    });

    it('has proper ARIA attributes for icon-only buttons', () => {
      const TestIcon = () => <span data-testid="icon">×</span>;
      
      render(
        <TestWrapper>
          <Button icon={<TestIcon />} aria-label="Close dialog" />
        </TestWrapper>
      );
      
      const button = screen.getByRole('button', { name: 'Close dialog' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Close dialog');
    });

    it('auto-generates aria-label for icon-only buttons without explicit label', () => {
      const TestIcon = () => <span data-testid="icon">×</span>;
      
      render(
        <TestWrapper>
          <Button icon={<TestIcon />} />
        </TestWrapper>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Button');
    });

    it('supports aria-expanded for toggle buttons', () => {
      render(
        <TestWrapper>
          <Button aria-expanded="false" aria-controls="menu">
            Menu
          </Button>
        </TestWrapper>
      );
      
      const button = screen.getByRole('button', { name: 'Menu' });
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-controls', 'menu');
    });

    it('supports aria-describedby for additional context', () => {
      render(
        <TestWrapper>
          <div>
            <Button aria-describedby="help-text">Save</Button>
            <div id="help-text">This will save your changes</div>
          </div>
        </TestWrapper>
      );
      
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('passes accessibility audit', async () => {
      const { container } = render(
        <TestWrapper>
          <Button>Test Button</Button>
        </TestWrapper>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Input Component', () => {
    it('has proper ARIA attributes for labeled inputs', () => {
      render(
        <TestWrapper>
          <Input label="Email" placeholder="Enter your email" />
        </TestWrapper>
      );
      
      const input = screen.getByLabelText('Email');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    it('has proper ARIA attributes for inputs with error states', () => {
      render(
        <TestWrapper>
          <Input 
            label="Email" 
            error="Invalid email format"
            aria-invalid="true"
          />
        </TestWrapper>
      );
      
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby');
      
      const errorMessage = screen.getByText('Invalid email format');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('has proper ARIA attributes for required inputs', () => {
      render(
        <TestWrapper>
          <Input label="Name" required />
        </TestWrapper>
      );
      
      const input = screen.getByLabelText('Name');
      expect(input).toHaveAttribute('aria-required', 'true');
      
      const requiredIndicator = screen.getByLabelText('required');
      expect(requiredIndicator).toBeInTheDocument();
    });

    it('supports custom aria-label', () => {
      render(
        <TestWrapper>
          <Input aria-label="Search query" placeholder="Search..." />
        </TestWrapper>
      );
      
      const input = screen.getByRole('textbox', { name: 'Search query' });
      expect(input).toBeInTheDocument();
    });

    it('passes accessibility audit', async () => {
      const { container } = render(
        <TestWrapper>
          <Input label="Test Input" />
        </TestWrapper>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ValidatedInput Component', () => {
    it('has proper ARIA attributes for validation states', () => {
      render(
        <TestWrapper>
          <ValidatedInput
            name="email"
            label="Email"
            value=""
            onChange={() => {}}
            validationRules={[]}
          />
        </TestWrapper>
      );
      
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-required', 'false');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('announces validation errors to screen readers', () => {
      render(
        <TestWrapper>
          <ValidatedInput
            name="email"
            label="Email"
            value="invalid-email"
            onChange={() => {}}
            validationRules={[(value) => value.includes('@') ? '' : 'Invalid email']}
            touched={true}
          />
        </TestWrapper>
      );
      
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      
      const errorMessage = screen.getByText('Invalid email');
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });

    it('passes accessibility audit', async () => {
      const { container } = render(
        <TestWrapper>
          <ValidatedInput
            name="test"
            label="Test Input"
            value=""
            onChange={() => {}}
            validationRules={[]}
          />
        </TestWrapper>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ResponsiveTable Component', () => {
    const mockColumns = [
      { key: 'name', label: 'Name', priority: 1, sortable: true },
      { key: 'email', label: 'Email', priority: 2, sortable: true }
    ];

    const mockData = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ];

    it('has proper table structure and ARIA attributes', () => {
      render(
        <TestWrapper>
          <ResponsiveTable
            columns={mockColumns}
            data={mockData}
          />
        </TestWrapper>
      );
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders).toHaveLength(2);
      
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(3); // 1 header + 2 data rows
    });

    it('has proper ARIA attributes for sortable columns', () => {
      render(
        <TestWrapper>
          <ResponsiveTable
            columns={mockColumns}
            data={mockData}
            onSort={() => {}}
          />
        </TestWrapper>
      );
      
      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    });

    it('passes accessibility audit', async () => {
      const { container } = render(
        <TestWrapper>
          <ResponsiveTable
            columns={mockColumns}
            data={mockData}
          />
        </TestWrapper>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ErrorQueue Component', () => {
    it('has proper ARIA attributes for error notifications', () => {
      render(
        <TestWrapper>
          <ErrorQueue />
        </TestWrapper>
      );
      
      // ErrorQueue should not render when there are no errors
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });

    it('announces errors to screen readers', () => {
      // Mock error in context
      const TestComponent = () => {
        const { handleError } = useError();
        
        React.useEffect(() => {
          handleError('Test error message');
        }, [handleError]);
        
        return <ErrorQueue />;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );
      
      const errorRegion = screen.getByRole('region', { name: 'Error notifications' });
      expect(errorRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Sidebar Component', () => {
    it('has proper navigation structure and ARIA attributes', () => {
      render(
        <TestWrapper>
          <Sidebar role="resident" />
        </TestWrapper>
      );
      
      const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
      expect(navigation).toBeInTheDocument();
      
      const navList = screen.getByRole('list');
      expect(navList).toBeInTheDocument();
    });

    it('has proper ARIA attributes for navigation links', () => {
      render(
        <TestWrapper>
          <Sidebar role="resident" />
        </TestWrapper>
      );
      
      const dashboardLink = screen.getByRole('link', { name: /navigate to dashboard/i });
      expect(dashboardLink).toBeInTheDocument();
    });

    it('passes accessibility audit', async () => {
      const { container } = render(
        <TestWrapper>
          <Sidebar role="resident" />
        </TestWrapper>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Topbar Component', () => {
    it('has proper header structure and ARIA attributes', () => {
      render(
        <TestWrapper>
          <Topbar title="Test Page" />
        </TestWrapper>
      );
      
      const header = screen.getByRole('banner');
      expect(header).toHaveAttribute('aria-label', 'Page header');
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Test Page');
    });

    it('has proper ARIA attributes for mobile menu toggle', () => {
      render(
        <TestWrapper>
          <Topbar title="Test Page" onMenuToggle={() => {}} />
        </TestWrapper>
      );
      
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      expect(menuButton).toHaveAttribute('aria-controls', 'main-navigation');
    });

    it('passes accessibility audit', async () => {
      const { container } = render(
        <TestWrapper>
          <Topbar title="Test Page" />
        </TestWrapper>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Layout Component', () => {
    it('has proper main content structure and ARIA attributes', () => {
      render(
        <TestWrapper>
          <Layout title="Test Page" role="resident">
            <div>Test content</div>
          </Layout>
        </TestWrapper>
      );
      
      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('aria-label', 'Test Page content');
      
      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(skipLink).toBeInTheDocument();
    });

    it('passes accessibility audit', async () => {
      const { container } = render(
        <TestWrapper>
          <Layout title="Test Page" role="resident">
            <div>Test content</div>
          </Layout>
        </TestWrapper>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Focus Management', () => {
    it('maintains focus order in forms', () => {
      render(
        <TestWrapper>
          <form>
            <Input label="First Name" />
            <Input label="Last Name" />
            <Button type="submit">Submit</Button>
          </form>
        </TestWrapper>
      );
      
      const firstName = screen.getByLabelText('First Name');
      const lastName = screen.getByLabelText('Last Name');
      const submitButton = screen.getByRole('button', { name: 'Submit' });
      
      // Focus should flow naturally through the form
      firstName.focus();
      expect(document.activeElement).toBe(firstName);
      
      lastName.focus();
      expect(document.activeElement).toBe(lastName);
      
      submitButton.focus();
      expect(document.activeElement).toBe(submitButton);
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports keyboard navigation in navigation menu', () => {
      render(
        <TestWrapper>
          <Sidebar role="resident" />
        </TestWrapper>
      );
      
      const dashboardLink = screen.getByRole('link', { name: /navigate to dashboard/i });
      
      // Should be focusable
      dashboardLink.focus();
      expect(document.activeElement).toBe(dashboardLink);
    });

    it('supports keyboard activation of buttons', () => {
      const handleClick = jest.fn();
      
      render(
        <TestWrapper>
          <Button onClick={handleClick}>Test Button</Button>
        </TestWrapper>
      );
      
      const button = screen.getByRole('button', { name: 'Test Button' });
      
      // Should activate on Enter key
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalled();
    });
  });
});

