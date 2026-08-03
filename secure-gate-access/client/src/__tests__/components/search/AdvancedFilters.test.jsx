/**
 * Unit Tests: AdvancedFilters Component
 * Tests advanced filter builders with complex AND/OR logic
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdvancedFilters from '../../../components/search/AdvancedFilters';

describe('AdvancedFilters Component', () => {
  const mockOnFiltersChange = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderAdvancedFilters = (props = {}) => {
    return render(
      <AdvancedFilters
        onFiltersChange={mockOnFiltersChange}
        onSave={mockOnSave}
        dataTypes={['visitors', 'users', 'incidents']}
        {...props}
      />
    );
  };

  test('renders filter builder interface', () => {
    renderAdvancedFilters();
    
    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add condition/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add group/i })).toBeInTheDocument();
  });

  test('adds new filter condition', async () => {
    renderAdvancedFilters();
    
    const addConditionButton = screen.getByRole('button', { name: /add condition/i });
    await act(async () => {
      await userEvent.click(addConditionButton);
    });

    // Should show condition form
    expect(screen.getByLabelText(/field/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/operator/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/value/i)).toBeInTheDocument();
  });

  test('configures filter condition with field, operator, and value', async () => {
    renderAdvancedFilters();
    
    const addConditionButton = screen.getByRole('button', { name: /add condition/i });
    await act(async () => {
      await userEvent.click(addConditionButton);
    });

    // Select field
    const fieldSelect = screen.getByLabelText(/field/i);
    await act(async () => {
      await userEvent.selectOptions(fieldSelect, 'name');
    });

    // Select operator
    const operatorSelect = screen.getByLabelText(/operator/i);
    await act(async () => {
      await userEvent.selectOptions(operatorSelect, 'contains');
    });

    // Enter value
    const valueInput = screen.getByLabelText(/value/i);
    await act(async () => {
      await userEvent.type(valueInput, 'John');
    });

    // Apply condition
    const applyButton = screen.getByRole('button', { name: /apply/i });
    await act(async () => {
      await userEvent.click(applyButton);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        conditions: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            operator: 'contains',
            value: 'John'
          })
        ])
      })
    );
  });

  test('adds filter group with nested conditions', async () => {
    renderAdvancedFilters();
    
    const addGroupButton = screen.getByRole('button', { name: /add group/i });
    await act(async () => {
      await userEvent.click(addGroupButton);
    });

    // Should show group container
    expect(screen.getByText(/group/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /logic/i })).toBeInTheDocument();
  });

  test('changes logic operator between AND/OR', async () => {
    renderAdvancedFilters();
    
    // Add two conditions first
    const addConditionButton = screen.getByRole('button', { name: /add condition/i });
    await act(async () => {
      await userEvent.click(addConditionButton);
    });

    // Configure first condition
    await act(async () => {
      await userEvent.selectOptions(screen.getByLabelText(/field/i), 'name');
      await userEvent.selectOptions(screen.getByLabelText(/operator/i), 'contains');
      await userEvent.type(screen.getByLabelText(/value/i), 'John');
      await userEvent.click(screen.getByRole('button', { name: /apply/i }));
    });

    // Add second condition
    await act(async () => {
      await userEvent.click(addConditionButton);
    });

    await act(async () => {
      await userEvent.selectOptions(screen.getAllByLabelText(/field/i)[1], 'status');
      await userEvent.selectOptions(screen.getAllByLabelText(/operator/i)[1], 'equals');
      await userEvent.type(screen.getAllByLabelText(/value/i)[1], 'active');
      await userEvent.click(screen.getAllByRole('button', { name: /apply/i })[1]);
    });

    // Change logic operator
    const logicSelect = screen.getByRole('combobox', { name: /main logic/i });
    await act(async () => {
      await userEvent.selectOptions(logicSelect, 'OR');
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        logic: 'OR'
      })
    );
  });

  test('removes filter condition', async () => {
    renderAdvancedFilters();
    
    // Add a condition
    const addConditionButton = screen.getByRole('button', { name: /add condition/i });
    await act(async () => {
      await userEvent.click(addConditionButton);
    });

    await act(async () => {
      await userEvent.selectOptions(screen.getByLabelText(/field/i), 'name');
      await userEvent.selectOptions(screen.getByLabelText(/operator/i), 'contains');
      await userEvent.type(screen.getByLabelText(/value/i), 'John');
      await userEvent.click(screen.getByRole('button', { name: /apply/i }));
    });

    // Remove the condition
    const removeButton = screen.getByRole('button', { name: /remove/i });
    await act(async () => {
      await userEvent.click(removeButton);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        conditions: []
      })
    );
  });

  test('validates filter conditions before applying', async () => {
    renderAdvancedFilters();
    
    const addConditionButton = screen.getByRole('button', { name: /add condition/i });
    await act(async () => {
      await userEvent.click(addConditionButton);
    });

    // Try to apply without filling required fields
    const applyButton = screen.getByRole('button', { name: /apply/i });
    await act(async () => {
      await userEvent.click(applyButton);
    });

    // Should show validation errors
    expect(screen.getByText(/field is required/i)).toBeInTheDocument();
  });

  test('saves filter set with name and description', async () => {
    renderAdvancedFilters({ enableSave: true });
    
    // Add a condition first
    const addConditionButton = screen.getByRole('button', { name: /add condition/i });
    await act(async () => {
      await userEvent.click(addConditionButton);
    });

    await act(async () => {
      await userEvent.selectOptions(screen.getByLabelText(/field/i), 'name');
      await userEvent.selectOptions(screen.getByLabelText(/operator/i), 'contains');
      await userEvent.type(screen.getByLabelText(/value/i), 'John');
      await userEvent.click(screen.getByRole('button', { name: /apply/i }));
    });

    // Save filter set
    const saveButton = screen.getByRole('button', { name: /save filter set/i });
    await act(async () => {
      await userEvent.click(saveButton);
    });

    // Fill save dialog
    const nameInput = screen.getByLabelText(/filter set name/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    
    await act(async () => {
      await userEvent.type(nameInput, 'Active Users');
      await userEvent.type(descriptionInput, 'Filter for active users named John');
    });

    const confirmSaveButton = screen.getByRole('button', { name: /save/i });
    await act(async () => {
      await userEvent.click(confirmSaveButton);
    });

    expect(mockOnSave).toHaveBeenCalledWith({
      name: 'Active Users',
      description: 'Filter for active users named John',
      filters: expect.any(Object)
    });
  });

  test('loads saved filter sets', async () => {
    const savedFilters = [
      {
        id: 1,
        name: 'Active Users',
        description: 'Filter for active users',
        filters: { logic: 'AND', conditions: [] }
      }
    ];

    renderAdvancedFilters({ 
      enableSave: true,
      savedFilters 
    });

    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('Filter for active users')).toBeInTheDocument();
  });

  test('applies saved filter set', async () => {
    const savedFilters = [
      {
        id: 1,
        name: 'Active Users',
        description: 'Filter for active users',
        filters: {
          logic: 'AND',
          conditions: [
            { field: 'status', operator: 'equals', value: 'active' }
          ]
        }
      }
    ];

    renderAdvancedFilters({ 
      enableSave: true,
      savedFilters 
    });

    const applyFilterButton = screen.getByRole('button', { name: /apply active users/i });
    await act(async () => {
      await userEvent.click(applyFilterButton);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith(savedFilters[0].filters);
  });

  test('supports different data types with appropriate fields', async () => {
    renderAdvancedFilters({ 
      dataTypes: ['visitors', 'users'],
      fieldOptions: {
        visitors: ['name', 'phone', 'status', 'date_of_visit'],
        users: ['username', 'email', 'role', 'created_at']
      }
    });
    
    const addConditionButton = screen.getByRole('button', { name: /add condition/i });
    await act(async () => {
      await userEvent.click(addConditionButton);
    });

    // Should show data type selector
    const dataTypeSelect = screen.getByLabelText(/data type/i);
    expect(dataTypeSelect).toBeInTheDocument();

    // Select visitors data type
    await act(async () => {
      await userEvent.selectOptions(dataTypeSelect, 'visitors');
    });

    // Should show visitor-specific fields
    const fieldSelect = screen.getByLabelText(/field/i);
    expect(fieldSelect).toContainHTML('name');
    expect(fieldSelect).toContainHTML('phone');
    expect(fieldSelect).toContainHTML('status');
  });

  test('handles complex nested group logic', async () => {
    renderAdvancedFilters();
    
    // Add main group
    const addGroupButton = screen.getByRole('button', { name: /add group/i });
    await act(async () => {
      await userEvent.click(addGroupButton);
    });

    // Add condition to group
    const groupAddConditionButton = screen.getAllByRole('button', { name: /add condition/i })[1];
    await act(async () => {
      await userEvent.click(groupAddConditionButton);
    });

    // Configure nested condition
    await act(async () => {
      await userEvent.selectOptions(screen.getAllByLabelText(/field/i)[0], 'name');
      await userEvent.selectOptions(screen.getAllByLabelText(/operator/i)[0], 'contains');
      await userEvent.type(screen.getAllByLabelText(/value/i)[0], 'John');
      await userEvent.click(screen.getAllByRole('button', { name: /apply/i })[0]);
    });

    // Set group logic to OR
    const groupLogicSelect = screen.getAllByRole('combobox', { name: /logic/i })[0];
    await act(async () => {
      await userEvent.selectOptions(groupLogicSelect, 'OR');
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        conditions: expect.arrayContaining([
          expect.objectContaining({
            type: 'group',
            logic: 'OR'
          })
        ])
      })
    );
  });

  test('clears all filters', async () => {
    renderAdvancedFilters();
    
    // Add some conditions
    const addConditionButton = screen.getByRole('button', { name: /add condition/i });
    await act(async () => {
      await userEvent.click(addConditionButton);
    });

    await act(async () => {
      await userEvent.selectOptions(screen.getByLabelText(/field/i), 'name');
      await userEvent.selectOptions(screen.getByLabelText(/operator/i), 'contains');
      await userEvent.type(screen.getByLabelText(/value/i), 'John');
      await userEvent.click(screen.getByRole('button', { name: /apply/i }));
    });

    // Clear all filters
    const clearButton = screen.getByRole('button', { name: /clear all/i });
    await act(async () => {
      await userEvent.click(clearButton);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      logic: 'AND',
      conditions: []
    });
  });

  test('shows filter summary', async () => {
    renderAdvancedFilters({ showSummary: true });
    
    // Add a condition
    const addConditionButton = screen.getByRole('button', { name: /add condition/i });
    await act(async () => {
      await userEvent.click(addConditionButton);
    });

    await act(async () => {
      await userEvent.selectOptions(screen.getByLabelText(/field/i), 'name');
      await userEvent.selectOptions(screen.getByLabelText(/operator/i), 'contains');
      await userEvent.type(screen.getByLabelText(/value/i), 'John');
      await userEvent.click(screen.getByRole('button', { name: /apply/i }));
    });

    // Should show filter summary
    expect(screen.getByText(/1 condition applied/i)).toBeInTheDocument();
    expect(screen.getByText(/name contains "john"/i)).toBeInTheDocument();
  });

  test('supports accessibility features', () => {
    renderAdvancedFilters();
    
    // Check ARIA labels and roles
    expect(screen.getByRole('region', { name: /advanced filters/i })).toBeInTheDocument();
    
    const addConditionButton = screen.getByRole('button', { name: /add condition/i });
    expect(addConditionButton).toHaveAttribute('aria-describedby');
  });
});