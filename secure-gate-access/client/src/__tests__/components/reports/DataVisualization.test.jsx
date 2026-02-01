/**
 * Unit tests for DataVisualization component
 * Tests compliance reporting with audit trail generation and data lineage tracking
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DataVisualization from '../../../components/reports/DataVisualization';

// Mock Chart.js
jest.mock('chart.js/auto', () => ({
  Chart: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    update: jest.fn(),
    resize: jest.fn()
  }))
}));

const mockData = [
  { month: 'Jan', visitors: 120, approved: 100, rejected: 20 },
  { month: 'Feb', visitors: 150, approved: 130, rejected: 20 },
  { month: 'Mar', visitors: 180, approved: 160, rejected: 20 },
  { month: 'Apr', visitors: 200, approved: 180, rejected: 20 }
];

const mockProps = {
  data: mockData,
  chartType: 'line',
  title: 'Visitor Statistics',
  onExport: jest.fn(),
  onConfigChange: jest.fn()
};

describe('DataVisualization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('should render chart container with title', () => {
      render(<DataVisualization {...mockProps} />);

      expect(screen.getByText('Visitor Statistics')).toBeInTheDocument();
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    test('should render chart controls', () => {
      render(<DataVisualization {...mockProps} />);

      expect(screen.getByLabelText('Chart Type')).toBeInTheDocument();
      expect(screen.getByText('Export Chart')).toBeInTheDocument();
      expect(screen.getByText('Configure')).toBeInTheDocument();
    });

    test('should display data summary', () => {
      render(<DataVisualization {...mockProps} />);

      expect(screen.getByText('Data Points: 4')).toBeInTheDocument();
      expect(screen.getByText('Total Visitors: 650')).toBeInTheDocument();
    });
  });

  describe('Chart Type Selection', () => {
    test('should change chart type when selected', async () => {
      render(<DataVisualization {...mockProps} />);

      const chartTypeSelect = screen.getByLabelText('Chart Type');
      fireEvent.change(chartTypeSelect, { target: { value: 'bar' } });

      await waitFor(() => {
        expect(mockProps.onConfigChange).toHaveBeenCalledWith({
          chartType: 'bar'
        });
      });
    });

    test('should support all chart types', () => {
      render(<DataVisualization {...mockProps} />);

      const chartTypeSelect = screen.getByLabelText('Chart Type');
      const options = Array.from(chartTypeSelect.options).map(option => option.value);

      expect(options).toContain('line');
      expect(options).toContain('bar');
      expect(options).toContain('pie');
      expect(options).toContain('doughnut');
      expect(options).toContain('area');
    });
  });

  describe('Chart Configuration', () => {
    test('should open configuration modal', async () => {
      render(<DataVisualization {...mockProps} />);

      const configButton = screen.getByText('Configure');
      fireEvent.click(configButton);

      await waitFor(() => {
        expect(screen.getByText('Chart Configuration')).toBeInTheDocument();
        expect(screen.getByLabelText('Show Legend')).toBeInTheDocument();
        expect(screen.getByLabelText('Show Grid')).toBeInTheDocument();
      });
    });

    test('should update chart configuration', async () => {
      render(<DataVisualization {...mockProps} />);

      fireEvent.click(screen.getByText('Configure'));

      await waitFor(() => {
        const showLegendCheckbox = screen.getByLabelText('Show Legend');
        fireEvent.click(showLegendCheckbox);

        const applyButton = screen.getByText('Apply');
        fireEvent.click(applyButton);
      });

      expect(mockProps.onConfigChange).toHaveBeenCalledWith({
        showLegend: false
      });
    });

    test('should configure color scheme', async () => {
      render(<DataVisualization {...mockProps} />);

      fireEvent.click(screen.getByText('Configure'));

      await waitFor(() => {
        const colorSchemeSelect = screen.getByLabelText('Color Scheme');
        fireEvent.change(colorSchemeSelect, { target: { value: 'dark' } });

        const applyButton = screen.getByText('Apply');
        fireEvent.click(applyButton);
      });

      expect(mockProps.onConfigChange).toHaveBeenCalledWith({
        colorScheme: 'dark'
      });
    });
  });

  describe('Data Export', () => {
    test('should export chart as image', async () => {
      render(<DataVisualization {...mockProps} />);

      const exportButton = screen.getByText('Export Chart');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Export Options')).toBeInTheDocument();
        expect(screen.getByText('PNG Image')).toBeInTheDocument();
        expect(screen.getByText('SVG Vector')).toBeInTheDocument();
        expect(screen.getByText('PDF Document')).toBeInTheDocument();
      });
    });

    test('should export chart data as CSV', async () => {
      render(<DataVisualization {...mockProps} />);

      fireEvent.click(screen.getByText('Export Chart'));

      await waitFor(() => {
        const csvExportButton = screen.getByText('CSV Data');
        fireEvent.click(csvExportButton);
      });

      expect(mockProps.onExport).toHaveBeenCalledWith({
        format: 'csv',
        data: mockData,
        chartConfig: expect.any(Object)
      });
    });

    test('should include compliance metadata in export', async () => {
      const propsWithCompliance = {
        ...mockProps,
        complianceMetadata: {
          auditTrail: { reportId: 'test-123' },
          dataLineage: { sourceSystem: 'secure-gate' }
        }
      };

      render(<DataVisualization {...propsWithCompliance} />);

      fireEvent.click(screen.getByText('Export Chart'));
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('PNG Image'));
      });

      expect(mockProps.onExport).toHaveBeenCalledWith({
        format: 'png',
        data: mockData,
        chartConfig: expect.any(Object),
        complianceMetadata: propsWithCompliance.complianceMetadata
      });
    });
  });

  describe('Data Processing', () => {
    test('should handle empty data gracefully', () => {
      const emptyProps = { ...mockProps, data: [] };
      render(<DataVisualization {...emptyProps} />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
      expect(screen.getByText('Data Points: 0')).toBeInTheDocument();
    });

    test('should calculate data statistics', () => {
      render(<DataVisualization {...mockProps} />);

      expect(screen.getByText('Total Visitors: 650')).toBeInTheDocument();
      expect(screen.getByText('Average: 162.5')).toBeInTheDocument();
      expect(screen.getByText('Max: 200')).toBeInTheDocument();
      expect(screen.getByText('Min: 120')).toBeInTheDocument();
    });

    test('should handle data updates', async () => {
      const { rerender } = render(<DataVisualization {...mockProps} />);

      const updatedData = [
        ...mockData,
        { month: 'May', visitors: 220, approved: 200, rejected: 20 }
      ];

      rerender(<DataVisualization {...mockProps} data={updatedData} />);

      await waitFor(() => {
        expect(screen.getByText('Data Points: 5')).toBeInTheDocument();
        expect(screen.getByText('Total Visitors: 870')).toBeInTheDocument();
      });
    });
  });

  describe('Audit Trail Generation', () => {
    test('should generate audit trail for chart interactions', async () => {
      const propsWithAudit = {
        ...mockProps,
        onAuditLog: jest.fn()
      };

      render(<DataVisualization {...propsWithAudit} />);

      // Change chart type
      const chartTypeSelect = screen.getByLabelText('Chart Type');
      fireEvent.change(chartTypeSelect, { target: { value: 'bar' } });

      await waitFor(() => {
        expect(propsWithAudit.onAuditLog).toHaveBeenCalledWith({
          action: 'chart_type_changed',
          details: {
            from: 'line',
            to: 'bar',
            timestamp: expect.any(String)
          }
        });
      });
    });

    test('should log export actions for compliance', async () => {
      const propsWithAudit = {
        ...mockProps,
        onAuditLog: jest.fn()
      };

      render(<DataVisualization {...propsWithAudit} />);

      fireEvent.click(screen.getByText('Export Chart'));
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('PNG Image'));
      });

      expect(propsWithAudit.onAuditLog).toHaveBeenCalledWith({
        action: 'chart_exported',
        details: {
          format: 'png',
          dataPoints: 4,
          chartType: 'line',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('Data Lineage Tracking', () => {
    test('should display data lineage information', () => {
      const propsWithLineage = {
        ...mockProps,
        dataLineage: {
          sourceSystem: 'secure-gate-access',
          extractionTime: '2025-01-01T10:00:00Z',
          transformations: ['aggregation', 'filtering']
        }
      };

      render(<DataVisualization {...propsWithLineage} />);

      expect(screen.getByText('Data Source: secure-gate-access')).toBeInTheDocument();
      expect(screen.getByText('Extracted: 2025-01-01T10:00:00Z')).toBeInTheDocument();
      expect(screen.getByText('Transformations: aggregation, filtering')).toBeInTheDocument();
    });

    test('should include lineage in export metadata', async () => {
      const propsWithLineage = {
        ...mockProps,
        dataLineage: {
          sourceSystem: 'secure-gate-access',
          extractionTime: '2025-01-01T10:00:00Z'
        }
      };

      render(<DataVisualization {...propsWithLineage} />);

      fireEvent.click(screen.getByText('Export Chart'));
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('CSV Data'));
      });

      expect(mockProps.onExport).toHaveBeenCalledWith({
        format: 'csv',
        data: mockData,
        chartConfig: expect.any(Object),
        dataLineage: propsWithLineage.dataLineage
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<DataVisualization {...mockProps} />);

      expect(screen.getByRole('img', { name: 'Visitor Statistics chart' })).toBeInTheDocument();
      expect(screen.getByLabelText('Chart Type')).toBeInTheDocument();
    });

    test('should provide data table alternative', async () => {
      render(<DataVisualization {...mockProps} />);

      const tableToggle = screen.getByText('View as Table');
      fireEvent.click(tableToggle);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByText('Month')).toBeInTheDocument();
        expect(screen.getByText('Visitors')).toBeInTheDocument();
      });
    });

    test('should support keyboard navigation', () => {
      render(<DataVisualization {...mockProps} />);

      const chartTypeSelect = screen.getByLabelText('Chart Type');
      chartTypeSelect.focus();
      expect(document.activeElement).toBe(chartTypeSelect);

      fireEvent.keyDown(chartTypeSelect, { key: 'Tab' });
      // Should move to next focusable element
    });
  });

  describe('Error Handling', () => {
    test('should handle chart rendering errors', () => {
      const Chart = require('chart.js/auto').Chart;
      Chart.mockImplementation(() => {
        throw new Error('Chart rendering failed');
      });

      render(<DataVisualization {...mockProps} />);

      expect(screen.getByText('Error rendering chart')).toBeInTheDocument();
      expect(screen.getByText('Chart rendering failed')).toBeInTheDocument();
    });

    test('should handle invalid data gracefully', () => {
      const invalidProps = {
        ...mockProps,
        data: [{ invalid: 'data' }]
      };

      render(<DataVisualization {...invalidProps} />);

      expect(screen.getByText('Invalid data format')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('should debounce configuration changes', async () => {
      jest.useFakeTimers();
      render(<DataVisualization {...mockProps} />);

      fireEvent.click(screen.getByText('Configure'));

      await waitFor(() => {
        const showLegendCheckbox = screen.getByLabelText('Show Legend');
        
        // Rapid changes
        fireEvent.click(showLegendCheckbox);
        fireEvent.click(showLegendCheckbox);
        fireEvent.click(showLegendCheckbox);
      });

      // Fast-forward timers
      jest.advanceTimersByTime(500);

      // Should only call once due to debouncing
      expect(mockProps.onConfigChange).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    test('should handle large datasets efficiently', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        month: `Month ${i}`,
        visitors: Math.floor(Math.random() * 1000)
      }));

      const largeDataProps = { ...mockProps, data: largeData };
      
      const startTime = performance.now();
      render(<DataVisualization {...largeDataProps} />);
      const endTime = performance.now();

      // Should render within reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});