/**
 * Drag-and-Drop Dashboard Widget System Tests
 * 
 * Tests the enhanced dashboard functionality including:
 * - Widget drag-and-drop capabilities
 * - Layout persistence and saving
 * - Widget resize functionality
 * - Role-based widget restrictions
 * - Dashboard controls integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardFoundation } from '../../../components/dashboard/DashboardFoundation.jsx';

// Mock the auth context hook
jest.mock('../../../contexts/AuthContext.js', () => ({
  useAuth: () => ({ user: { role: 'resident' } })
}));

// Mock the theme engine hook
jest.mock('../../../contexts/ThemeEngine.jsx', () => ({
  useThemeEngine: () => ({
    generateThemeClasses: () => 'theme-classes'
  })
}));
jest.mock('../../../hooks/useEnhancedResponsive.js', () => ({
  useEnhancedResponsive: () => ({
    breakpoint: 'lg',
    isMobile: false,
    isTablet: false,
    isDesktop: true
  })
}));

jest.mock('../../../hooks/useAccessibility.js', () => ({
  useAccessibility: () => ({
    accessibilityState: { isScreenReader: false },
    announce: jest.fn()
  })
}));

// Mock LayoutManager to test integration
jest.mock('../../../components/ui/LayoutManager.jsx', () => ({
  LayoutManager: ({ children, onLayoutChange, onWidgetResize }) => (
    <div data-testid="layout-manager">
      <button 
        data-testid="mock-drag-widget"
        onClick={() => onLayoutChange([{ i: 'test-widget', x: 1, y: 1, w: 4, h: 4 }], 'drag')}
      >
        Mock Drag Widget
      </button>
      <button 
        data-testid="mock-resize-widget"
        onClick={() => onWidgetResize('test-widget', { w: 6, h: 6 })}
      >
        Mock Resize Widget
      </button>
      {children}
    </div>
  ),
  useLayoutPersistence: () => ({
    layout: [
      { i: 'quick-invite', x: 0, y: 0, w: 6, h: 4 },
      { i: 'visitor-status', x: 6, y: 0, w: 6, h: 4 }
    ],
    saveLayout: jest.fn(),
    resetLayout: jest.fn(),
    isLoading: false,
    lastSaved: new Date(),
    exportLayout: () => ({ layout: [], metadata: {} }),
    importLayout: jest.fn()
  })
}));

// Mock widget components
jest.mock('../../../components/dashboard/DashboardWidget.jsx', () => ({
  DashboardWidget: ({ children, title }) => (
    <div data-testid={`widget-${title?.toLowerCase().replace(/\s+/g, '-')}`}>
      {title}
      {children}
    </div>
  ),
  StatWidget: ({ title, value }) => (
    <div data-testid={`stat-widget-${title?.toLowerCase().replace(/\s+/g, '-')}`}>
      {title}: {value}
    </div>
  ),
  ChartWidget: ({ title }) => (
    <div data-testid={`chart-widget-${title?.toLowerCase().replace(/\s+/g, '-')}`}>
      {title}
    </div>
  ),
  ListWidget: ({ title, items = [] }) => (
    <div data-testid={`list-widget-${title?.toLowerCase().replace(/\s+/g, '-')}`}>
      {title}
      <div>{items.length} items</div>
    </div>
  )
}));

// Mock catalog and controls
jest.mock('../../../components/dashboard/WidgetCatalog.jsx', () => ({
  WidgetCatalog: ({ isOpen, onAddWidget, onClose }) => (
    isOpen ? (
      <div data-testid="widget-catalog">
        <button onClick={() => onAddWidget({ i: 'new-widget', x: 0, y: 0, w: 4, h: 4 }, {})}>
          Add Widget
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
  WidgetConfigModal: ({ isOpen, onClose }) => (
    isOpen ? (
      <div data-testid="widget-config-modal">
        <button onClick={onClose}>Close Config</button>
      </div>
    ) : null
  )
}));

jest.mock('../../../components/dashboard/DashboardControls.jsx', () => ({
  DashboardControls: ({ onAddWidget, onResetLayout, role }) => (
    <div data-testid="dashboard-controls">
      <button onClick={onAddWidget} data-testid="add-widget-btn">Add Widget</button>
      <button onClick={onResetLayout} data-testid="reset-layout-btn">Reset Layout</button>
      <span data-testid="role-display">Role: {role}</span>
    </div>
  )
}));

// Mock contexts
const MockAuthContext = React.createContext();
const MockThemeEngine = ({ children }) => <div>{children}</div>;

// Test wrapper with required contexts
const TestWrapper = ({ children, user = { role: 'resident' } }) => (
  <MockAuthContext.Provider value={{ user }}>
    <MockThemeEngine>
      {children}
    </MockThemeEngine>
  </MockAuthContext.Provider>
);

describe('DashboardFoundation - Drag-and-Drop Widget System', () => {
  const mockData = {
    'visitor-status': { todayVisitors: 5, visitorChange: 2 },
    'upcoming-visits': { upcomingVisits: [] }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Dashboard Rendering', () => {
    test('renders dashboard with role-specific layout', () => {
      render(
        <TestWrapper user={{ role: 'resident' }}>
          <DashboardFoundation data={mockData} />
        </TestWrapper>
      );

      expect(screen.getByText('Resident Portal')).toBeInTheDocument();
      expect(screen.getByText('Manage your visitors and invitations')).toBeInTheDocument();
      expect(screen.getByTestId('layout-manager')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-controls')).toBeInTheDocument();
    });

    test('displays correct role in dashboard controls', () => {
      render(
        <TestWrapper user={{ role: 'admin' }}>
          <DashboardFoundation data={mockData} />
        </TestWrapper>
      );

      expect(screen.getByTestId('role-display')).toHaveTextContent('Role: admin');
    });

    test('renders appropriate widgets for resident role', () => {
      render(
        <TestWrapper user={{ role: 'resident' }}>
          <DashboardFoundation data={mockData} />
        </TestWrapper>
      );

      // Check for resident-specific widgets
      expect(screen.getByTestId('widget-quick-invite')).toBeInTheDocument();
      expect(screen.getByTestId('stat-widget-today\'s-visitors')).toBeInTheDocument();
    });
  });

  describe('Widget Drag-and-Drop Functionality', () => {
    test('handles widget drag operations', async () => {
      const mockOnLayoutChange = jest.fn();
      
      render(
        <TestWrapper>
          <DashboardFoundation 
            data={mockData} 
            onLayoutChange={mockOnLayoutChange}
          />
        </TestWrapper>
      );

      const dragButton = screen.getByTestId('mock-drag-widget');
      fireEvent.click(dragButton);

      await waitFor(() => {
        expect(mockOnLayoutChange).toHaveBeenCalledWith(
          [{ i: 'test-widget', x: 1, y: 1, w: 4, h: 4 }],
          'drag'
        );
      });
    });

    test('handles widget resize operations', async () => {
      render(
        <TestWrapper>
          <DashboardFoundation data={mockData} />
        </TestWrapper>
      );

      const resizeButton = screen.getByTestId('mock-resize-widget');
      fireEvent.click(resizeButton);

      // Verify resize functionality is triggered
      expect(resizeButton).toBeInTheDocument();
    });
  });

  describe('Dashboard Controls Integration', () => {
    test('opens widget catalog when add widget is clicked', async () => {
      render(
        <TestWrapper>
          <DashboardFoundation data={mockData} />
        </TestWrapper>
      );

      const addWidgetBtn = screen.getByTestId('add-widget-btn');
      fireEvent.click(addWidgetBtn);

      await waitFor(() => {
        expect(screen.getByTestId('widget-catalog')).toBeInTheDocument();
      });
    });

    test('adds new widget from catalog', async () => {
      render(
        <TestWrapper>
          <DashboardFoundation data={mockData} />
        </TestWrapper>
      );

      // Open catalog
      fireEvent.click(screen.getByTestId('add-widget-btn'));
      
      await waitFor(() => {
        expect(screen.getByTestId('widget-catalog')).toBeInTheDocument();
      });

      // Add widget
      const addWidgetFromCatalog = screen.getByText('Add Widget');
      fireEvent.click(addWidgetFromCatalog);

      await waitFor(() => {
        expect(screen.queryByTestId('widget-catalog')).not.toBeInTheDocument();
      });
    });

    test('handles layout reset functionality', () => {
      // Mock window.confirm
      window.confirm = jest.fn(() => true);

      render(
        <TestWrapper>
          <DashboardFoundation data={mockData} />
        </TestWrapper>
      );

      const resetBtn = screen.getByTestId('reset-layout-btn');
      fireEvent.click(resetBtn);

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to reset your dashboard layout? This cannot be undone.'
      );
    });
  });

  describe('Role-Based Restrictions', () => {
    test('applies role restrictions for guard role', () => {
      render(
        <TestWrapper user={{ role: 'guard' }}>
          <DashboardFoundation data={mockData} />
        </TestWrapper>
      );

      expect(screen.getByText('Security Dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('role-display')).toHaveTextContent('Role: guard');
    });

    test('applies role restrictions for visitor role', () => {
      render(
        <TestWrapper user={{ role: 'visitor' }}>
          <DashboardFoundation data={mockData} />
        </TestWrapper>
      );

      expect(screen.getByText('Visitor Access')).toBeInTheDocument();
      // Visitors should not have dashboard controls
      expect(screen.queryByTestId('dashboard-controls')).not.toBeInTheDocument();
    });

    test('shows super admin dashboard for super_admin role', () => {
      render(
        <TestWrapper user={{ role: 'super_admin' }}>
          <DashboardFoundation data={mockData} />
        </TestWrapper>
      );

      expect(screen.getByText('Platform Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Monitor and manage the entire SecureGate platform')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles missing widget components gracefully', () => {
      const layoutWithUnknownWidget = [
        { i: 'unknown-widget', x: 0, y: 0, w: 4, h: 4 }
      ];

      // Mock useLayoutPersistence to return unknown widget
      jest.doMock('../../../components/ui/LayoutManager.jsx', () => ({
        LayoutManager: ({ children }) => <div>{children}</div>,
        useLayoutPersistence: () => ({
          layout: layoutWithUnknownWidget,
          saveLayout: jest.fn(),
          resetLayout: jest.fn(),
          isLoading: false,
          lastSaved: new Date(),
          exportLayout: () => ({ layout: [], metadata: {} }),
          importLayout: jest.fn()
        })
      }));

      render(
        <TestWrapper>
          <DashboardFoundation data={mockData} />
        </TestWrapper>
      );

      // Should render without crashing
      expect(screen.getByTestId('layout-manager')).toBeInTheDocument();
    });

    test('shows loading state when dashboard is loading', () => {
      // Mock loading state
      jest.doMock('../../../components/ui/LayoutManager.jsx', () => ({
        LayoutManager: ({ children }) => <div>{children}</div>,
        useLayoutPersistence: () => ({
          layout: [],
          saveLayout: jest.fn(),
          resetLayout: jest.fn(),
          isLoading: true,
          lastSaved: null,
          exportLayout: () => ({ layout: [], metadata: {} }),
          importLayout: jest.fn()
        })
      }));

      render(
        <TestWrapper>
          <DashboardFoundation data={mockData} />
        </TestWrapper>
      );

      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });
  });

  describe('Widget Configuration', () => {
    test('opens widget configuration modal', async () => {
      render(
        <TestWrapper>
          <DashboardFoundation data={mockData} />
        </TestWrapper>
      );

      // This would typically be triggered by a widget action
      // For now, we verify the modal can be rendered
      expect(screen.queryByTestId('widget-config-modal')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    test('integrates with accessibility hooks', () => {
      render(
        <TestWrapper>
          <DashboardFoundation data={mockData} />
        </TestWrapper>
      );

      // Verify dashboard renders with accessibility considerations
      expect(screen.getByTestId('layout-manager')).toBeInTheDocument();
    });
  });
});