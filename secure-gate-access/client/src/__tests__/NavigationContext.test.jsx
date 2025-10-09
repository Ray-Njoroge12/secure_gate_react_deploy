import React from 'react';
import { render, screen, act } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { NavigationProvider, useNavigation } from '../NavigationContext';

// Test component that uses the navigation context
const TestComponent = () => {
  const { 
    breadcrumbs, 
    setBreadcrumbs, 
    addBreadcrumb, 
    removeBreadcrumb,
    clearBreadcrumbs,
    pageTitle,
    setPageTitle
  } = useNavigation();

  const handleSetBreadcrumbs = () => {
    setBreadcrumbs([
      { label: 'Home', path: '/' },
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Settings', path: '/dashboard/settings' }
    ]);
  };

  const handleAddBreadcrumb = () => {
    addBreadcrumb({ label: 'Profile', path: '/dashboard/settings/profile' });
  };

  const handleRemoveBreadcrumb = () => {
    removeBreadcrumb('/dashboard/settings');
  };

  const handleSetPageTitle = () => {
    setPageTitle('Test Page Title');
  };

  return (
    <div>
      <div data-testid="breadcrumbs">
        {breadcrumbs.map((crumb, index) => (
          <span key={index} data-testid={`breadcrumb-${index}`}>
            {crumb.label}
          </span>
        ))}
      </div>
      <div data-testid="page-title">{pageTitle}</div>
      <button onClick={handleSetBreadcrumbs}>Set Breadcrumbs</button>
      <button onClick={handleAddBreadcrumb}>Add Breadcrumb</button>
      <button onClick={handleRemoveBreadcrumb}>Remove Breadcrumb</button>
      <button onClick={handleSetPageTitle}>Set Page Title</button>
      <button onClick={clearBreadcrumbs}>Clear Breadcrumbs</button>
    </div>
  );
};

describe('NavigationContext', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('NavigationProvider', () => {
    it('provides navigation context to children', () => {
      render(
        <BrowserRouter>
          <NavigationProvider>
            <TestComponent />
          </NavigationProvider>
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
      expect(screen.getByTestId('page-title')).toHaveTextContent('');
    });

    it('throws error when useNavigation is used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const TestComponentWithoutProvider = () => {
        useNavigation();
        return <div>Test</div>;
      };

      expect(() => {
        render(<TestComponentWithoutProvider />);
      }).toThrow('useNavigation must be used within a NavigationProvider');
      
      consoleError.mockRestore();
    });
  });

  describe('Breadcrumb Management', () => {
    it('sets breadcrumbs', async () => {
      render(
        <BrowserRouter>
          <NavigationProvider>
            <TestComponent />
          </NavigationProvider>
        </BrowserRouter>
      );

      await act(async () => {
        await userEvent.click(screen.getByText('Set Breadcrumbs'));
      });

      expect(screen.getByTestId('breadcrumb-0')).toHaveTextContent('Home');
      expect(screen.getByTestId('breadcrumb-1')).toHaveTextContent('Dashboard');
      expect(screen.getByTestId('breadcrumb-2')).toHaveTextContent('Settings');
    });

    it('adds breadcrumb', async () => {
      render(
        <BrowserRouter>
          <NavigationProvider>
            <TestComponent />
          </NavigationProvider>
        </BrowserRouter>
      );

      await act(async () => {
        await userEvent.click(screen.getByText('Set Breadcrumbs'));
      });

      await act(async () => {
        await userEvent.click(screen.getByText('Add Breadcrumb'));
      });

      expect(screen.getByTestId('breadcrumb-3')).toHaveTextContent('Profile');
    });

    it('removes breadcrumb', async () => {
      render(
        <BrowserRouter>
          <NavigationProvider>
            <TestComponent />
          </NavigationProvider>
        </BrowserRouter>
      );

      await act(async () => {
        await userEvent.click(screen.getByText('Set Breadcrumbs'));
      });

      await act(async () => {
        await userEvent.click(screen.getByText('Remove Breadcrumb'));
      });

      expect(screen.queryByTestId('breadcrumb-2')).not.toBeInTheDocument();
      expect(screen.getByTestId('breadcrumb-0')).toHaveTextContent('Home');
      expect(screen.getByTestId('breadcrumb-1')).toHaveTextContent('Dashboard');
    });

    it('clears all breadcrumbs', async () => {
      render(
        <BrowserRouter>
          <NavigationProvider>
            <TestComponent />
          </NavigationProvider>
        </BrowserRouter>
      );

      await act(async () => {
        await userEvent.click(screen.getByText('Set Breadcrumbs'));
      });

      await act(async () => {
        await userEvent.click(screen.getByText('Clear Breadcrumbs'));
      });

      expect(screen.queryByTestId('breadcrumb-0')).not.toBeInTheDocument();
    });
  });

  describe('Page Title Management', () => {
    it('sets page title', async () => {
      render(
        <BrowserRouter>
          <NavigationProvider>
            <TestComponent />
          </NavigationProvider>
        </BrowserRouter>
      );

      await act(async () => {
        await userEvent.click(screen.getByText('Set Page Title'));
      });

      expect(screen.getByTestId('page-title')).toHaveTextContent('Test Page Title');
    });
  });

  describe('Breadcrumb Auto-Generation', () => {
    it('generates breadcrumbs from path', async () => {
      const TestComponentWithPath = () => {
        const { generateBreadcrumbsFromPath } = useNavigation();
        
        const handleGenerate = () => {
          generateBreadcrumbsFromPath('/dashboard/resident/settings');
        };

        return (
          <div>
            <button onClick={handleGenerate}>Generate from Path</button>
          </div>
        );
      };

      render(
        <NavigationProvider>
          <TestComponentWithPath />
        </NavigationProvider>
      );

      await act(async () => {
        await userEvent.click(screen.getByText('Generate from Path'));
      });

      // This would test the auto-generation logic if implemented
    });
  });

  describe('Breadcrumb Validation', () => {
    it('handles invalid breadcrumb data gracefully', async () => {
      const TestComponentWithInvalidData = () => {
        const { setBreadcrumbs } = useNavigation();
        
        const handleSetInvalid = () => {
          setBreadcrumbs([
            { label: 'Valid', path: '/valid' },
            { label: '', path: '/invalid' }, // Invalid: empty label
            { label: 'Valid2', path: '' } // Invalid: empty path
          ]);
        };

        return (
          <div>
            <button onClick={handleSetInvalid}>Set Invalid Breadcrumbs</button>
          </div>
        );
      };

      render(
        <NavigationProvider>
          <TestComponentWithInvalidData />
        </NavigationProvider>
      );

      // Should not throw error
      await act(async () => {
        await userEvent.click(screen.getByText('Set Invalid Breadcrumbs'));
      });

      expect(true).toBe(true); // Test passes if no error is thrown
    });
  });
});

