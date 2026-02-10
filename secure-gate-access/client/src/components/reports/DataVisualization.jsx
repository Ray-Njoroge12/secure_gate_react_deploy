/**
 * DataVisualization Component - Interactive charts and graphs with export capabilities
 * Provides various chart types for data analysis and reporting
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import exportService from '../../services/exportService';
import './DataVisualization.css';
import Button from '../ui/Button';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DataVisualization = ({ 
  data = [], 
  title = 'Data Visualization',
  className = '',
  onExport 
}) => {
  const [chartType, setChartType] = useState('bar');
  const [chartConfig, setChartConfig] = useState({
    xAxis: '',
    yAxis: '',
    groupBy: '',
    aggregation: 'count',
    // Chart palette — aligned with design-system.css tokens
    colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'] // info, error, success, warning, accent
  });
  const [processedData, setProcessedData] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const chartRef = useRef(null);

  // Available chart types
  const chartTypes = [
    { value: 'bar', label: 'Bar Chart', icon: '📊' },
    { value: 'line', label: 'Line Chart', icon: '📈' },
    { value: 'pie', label: 'Pie Chart', icon: '🥧' },
    { value: 'doughnut', label: 'Doughnut Chart', icon: '🍩' }
  ];

  // Available aggregation methods
  const aggregationMethods = [
    { value: 'count', label: 'Count' },
    { value: 'sum', label: 'Sum' },
    { value: 'average', label: 'Average' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' }
  ];

  // Get available fields from data
  const availableFields = data.length > 0 ? Object.keys(data[0]) : [];

  // Process data for visualization
  const processDataForChart = useCallback(() => {
    if (!data.length || !chartConfig.xAxis) {
      setProcessedData(null);
      return;
    }

    try {
      let processedData;

      if (chartType === 'pie' || chartType === 'doughnut') {
        // For pie/doughnut charts, group by x-axis field
        const grouped = data.reduce((acc, item) => {
          const key = item[chartConfig.xAxis] || 'Unknown';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        processedData = {
          labels: Object.keys(grouped),
          datasets: [{
            data: Object.values(grouped),
            backgroundColor: chartConfig.colors,
            borderColor: chartConfig.colors.map(color => color + '80'),
            borderWidth: 2
          }]
        };
      } else {
        // For bar/line charts
        if (chartConfig.groupBy) {
          // Group data by groupBy field
          const grouped = data.reduce((acc, item) => {
            const groupKey = item[chartConfig.groupBy] || 'Unknown';
            const xValue = item[chartConfig.xAxis] || 'Unknown';
            
            if (!acc[groupKey]) {
              acc[groupKey] = {};
            }
            
            if (chartConfig.yAxis && chartConfig.aggregation !== 'count') {
              const yValue = parseFloat(item[chartConfig.yAxis]) || 0;
              if (!acc[groupKey][xValue]) {
                acc[groupKey][xValue] = [];
              }
              acc[groupKey][xValue].push(yValue);
            } else {
              acc[groupKey][xValue] = (acc[groupKey][xValue] || 0) + 1;
            }
            
            return acc;
          }, {});

          // Get all unique x-axis values
          const allXValues = [...new Set(data.map(item => item[chartConfig.xAxis] || 'Unknown'))];
          
          // Create datasets for each group
          const datasets = Object.keys(grouped).map((groupKey, index) => {
            const groupData = grouped[groupKey];
            const dataPoints = allXValues.map(xValue => {
              if (chartConfig.yAxis && chartConfig.aggregation !== 'count') {
                const values = groupData[xValue] || [];
                if (values.length === 0) return 0;
                
                switch (chartConfig.aggregation) {
                  case 'sum':
                    return values.reduce((sum, val) => sum + val, 0);
                  case 'average':
                    return values.reduce((sum, val) => sum + val, 0) / values.length;
                  case 'min':
                    return Math.min(...values);
                  case 'max':
                    return Math.max(...values);
                  default:
                    return values.length;
                }
              } else {
                return groupData[xValue] || 0;
              }
            });

            return {
              label: groupKey,
              data: dataPoints,
              backgroundColor: chartConfig.colors[index % chartConfig.colors.length] + '80',
              borderColor: chartConfig.colors[index % chartConfig.colors.length],
              borderWidth: 2,
              fill: chartType === 'line' ? false : true
            };
          });

          processedData = {
            labels: allXValues,
            datasets
          };
        } else {
          // Simple aggregation without grouping
          const aggregated = data.reduce((acc, item) => {
            const key = item[chartConfig.xAxis] || 'Unknown';
            
            if (chartConfig.yAxis && chartConfig.aggregation !== 'count') {
              const value = parseFloat(item[chartConfig.yAxis]) || 0;
              if (!acc[key]) {
                acc[key] = [];
              }
              acc[key].push(value);
            } else {
              acc[key] = (acc[key] || 0) + 1;
            }
            
            return acc;
          }, {});

          const labels = Object.keys(aggregated);
          const dataPoints = labels.map(label => {
            if (chartConfig.yAxis && chartConfig.aggregation !== 'count') {
              const values = aggregated[label];
              switch (chartConfig.aggregation) {
                case 'sum':
                  return values.reduce((sum, val) => sum + val, 0);
                case 'average':
                  return values.reduce((sum, val) => sum + val, 0) / values.length;
                case 'min':
                  return Math.min(...values);
                case 'max':
                  return Math.max(...values);
                default:
                  return values.length;
              }
            } else {
              return aggregated[label];
            }
          });

          processedData = {
            labels,
            datasets: [{
              label: chartConfig.yAxis || 'Count',
              data: dataPoints,
              backgroundColor: chartConfig.colors[0] + '80',
              borderColor: chartConfig.colors[0],
              borderWidth: 2,
              fill: chartType === 'line' ? false : true
            }]
          };
        }
      }

      setProcessedData(processedData);
    } catch (error) {
      console.error('Error processing chart data:', error);
      setProcessedData(null);
    }
  }, [data, chartType, chartConfig]);

  // Update processed data when configuration changes
  useEffect(() => {
    processDataForChart();
  }, [processDataForChart]);

  // Update chart configuration
  const updateConfig = useCallback((key, value) => {
    setChartConfig(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Chart options
  const getChartOptions = useCallback(() => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          position: 'top'
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1
        }
      }
    };

    if (chartType === 'bar' || chartType === 'line') {
      baseOptions.scales = {
        x: {
          title: {
            display: true,
            text: chartConfig.xAxis
          }
        },
        y: {
          title: {
            display: true,
            text: chartConfig.yAxis || 'Count'
          },
          beginAtZero: true
        }
      };
    }

    return baseOptions;
  }, [chartType, chartConfig, title]);

  // Export chart as image
  const exportChart = useCallback(async (format = 'png') => {
    if (!chartRef.current) return;

    setIsExporting(true);
    try {
      const canvas = chartRef.current.canvas;
      const dataURL = canvas.toDataURL(`image/${format}`);
      
      // Convert data URL to blob
      const response = await fetch(dataURL);
      const blob = await response.blob();
      
      // Download the image
      const filename = `${title.replace(/\s+/g, '_').toLowerCase()}_chart.${format}`;
      exportService.downloadBlob(blob, filename);

      if (onExport) {
        onExport({
          type: 'chart',
          format,
          filename,
          chartType,
          config: chartConfig
        });
      }
    } catch (error) {
      console.error('Error exporting chart:', error);
      alert('Error exporting chart. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [title, chartType, chartConfig, onExport]);

  // Export chart data
  const exportData = useCallback(async (format = 'csv') => {
    if (!processedData) return;

    setIsExporting(true);
    try {
      // Convert chart data to exportable format
      const exportData = processedData.labels.map((label, index) => {
        const row = { [chartConfig.xAxis || 'Category']: label };
        
        processedData.datasets.forEach(dataset => {
          row[dataset.label || 'Value'] = dataset.data[index];
        });
        
        return row;
      });

      const blob = await exportService.exportData({
        data: exportData,
        format,
        filename: `${title.replace(/\s+/g, '_').toLowerCase()}_data.${format}`,
        metadata: {
          title: `${title} - Chart Data`,
          description: `Data from ${chartType} chart`,
          generatedAt: new Date().toISOString(),
          chartType,
          xAxis: chartConfig.xAxis,
          yAxis: chartConfig.yAxis,
          aggregation: chartConfig.aggregation
        }
      });

      exportService.downloadBlob(blob, `${title.replace(/\s+/g, '_').toLowerCase()}_data.${format}`);

      if (onExport) {
        onExport({
          type: 'data',
          format,
          filename: `${title.replace(/\s+/g, '_').toLowerCase()}_data.${format}`,
          recordCount: exportData.length
        });
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [processedData, title, chartType, chartConfig, onExport]);

  // Render chart component
  const renderChart = () => {
    if (!processedData) {
      return (
        <div className="chart-placeholder">
          <p>Configure the chart settings to display visualization</p>
        </div>
      );
    }

    const options = getChartOptions();

    switch (chartType) {
      case 'bar':
        return <Bar ref={chartRef} data={processedData} options={options} />;
      case 'line':
        return <Line ref={chartRef} data={processedData} options={options} />;
      case 'pie':
        return <Pie ref={chartRef} data={processedData} options={options} />;
      case 'doughnut':
        return <Doughnut ref={chartRef} data={processedData} options={options} />;
      default:
        return <Bar ref={chartRef} data={processedData} options={options} />;
    }
  };

  return (
    <div className={`data-visualization ${className}`}>
      <div className="visualization-header">
        <h3>{title}</h3>
        <div className="export-actions">
          <Button
            type="button"
            onClick={() => exportChart('png')}
            disabled={!processedData || isExporting}
            className="btn btn-sm btn-secondary"
          >
            Export Chart
          </Button>
          <Button
            type="button"
            onClick={() => exportData('csv')}
            disabled={!processedData || isExporting}
            className="btn btn-sm btn-secondary"
          >
            Export Data
          </Button>
        </div>
      </div>

      <div className="visualization-config">
        <div className="config-row">
          <div className="config-group">
            <label>Chart Type</label>
            <div className="chart-type-selector">
              {chartTypes.map(type => (
                <Button
                  key={type.value}
                  type="button"
                  onClick={() => setChartType(type.value)}
                  className={`chart-type-btn ${chartType === type.value ? 'active' : ''}`}
                  title={type.label}
                >
                  <span className="chart-icon">{type.icon}</span>
                  <span className="chart-label">{type.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="config-row">
          <div className="config-group">
            <label htmlFor="x-axis-select">X-Axis</label>
            <select
              id="x-axis-select"
              value={chartConfig.xAxis}
              onChange={(e) => updateConfig('xAxis', e.target.value)}
              className="form-control"
            >
              <option value="">Select field</option>
              {availableFields.map(field => (
                <option key={field} value={field}>{field}</option>
              ))}
            </select>
          </div>

          {(chartType === 'bar' || chartType === 'line') && (
            <>
              <div className="config-group">
                <label htmlFor="y-axis-select">Y-Axis (Optional)</label>
                <select
                  id="y-axis-select"
                  value={chartConfig.yAxis}
                  onChange={(e) => updateConfig('yAxis', e.target.value)}
                  className="form-control"
                >
                  <option value="">Count records</option>
                  {availableFields.filter(field => field !== chartConfig.xAxis).map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>

              <div className="config-group">
                <label htmlFor="aggregation-select">Aggregation</label>
                <select
                  id="aggregation-select"
                  value={chartConfig.aggregation}
                  onChange={(e) => updateConfig('aggregation', e.target.value)}
                  className="form-control"
                  disabled={!chartConfig.yAxis}
                >
                  {aggregationMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="config-group">
                <label htmlFor="group-by-select">Group By (Optional)</label>
                <select
                  id="group-by-select"
                  value={chartConfig.groupBy}
                  onChange={(e) => updateConfig('groupBy', e.target.value)}
                  className="form-control"
                >
                  <option value="">No grouping</option>
                  {availableFields.filter(field => 
                    field !== chartConfig.xAxis && field !== chartConfig.yAxis
                  ).map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="visualization-chart">
        {renderChart()}
      </div>

      {processedData && (
        <div className="visualization-summary">
          <p>
            Showing {processedData.labels.length} categories
            {processedData.datasets.length > 1 && ` across ${processedData.datasets.length} series`}
          </p>
        </div>
      )}
    </div>
  );
};

export default DataVisualization;