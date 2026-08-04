/**
 * ReportBuilder Component - Drag-and-drop report builder interface
 * Allows users to create custom reports with flexible field selection and formatting
 */

import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import exportService from '../../services/exportService';
import './ReportBuilder.css';
import Button from '../ui/Button';

const ReportBuilder = ({ 
  availableFields = [], 
  onReportGenerated,
  className = '' 
}) => {
  const [selectedFields, setSelectedFields] = useState([]);
  const [reportConfig, setReportConfig] = useState({
    title: '',
    description: '',
    format: 'excel',
    filters: [],
    sorting: { field: '', direction: 'asc' },
    groupBy: '',
    includeMetadata: true
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Handle drag and drop for field selection
  const handleDragEnd = useCallback((result) => {
    if (!result.destination) return;

    const { source, destination } = result;

    // Moving from available fields to selected fields
    if (source.droppableId === 'available' && destination.droppableId === 'selected') {
      const field = availableFields[source.index];
      if (!selectedFields.find(f => f.key === field.key)) {
        const newSelectedFields = [...selectedFields];
        newSelectedFields.splice(destination.index, 0, field);
        setSelectedFields(newSelectedFields);
      }
    }
    // Reordering selected fields
    else if (source.droppableId === 'selected' && destination.droppableId === 'selected') {
      const newSelectedFields = [...selectedFields];
      const [removed] = newSelectedFields.splice(source.index, 1);
      newSelectedFields.splice(destination.index, 0, removed);
      setSelectedFields(newSelectedFields);
    }
    // Moving from selected back to available (remove)
    else if (source.droppableId === 'selected' && destination.droppableId === 'available') {
      const newSelectedFields = [...selectedFields];
      newSelectedFields.splice(source.index, 1);
      setSelectedFields(newSelectedFields);
    }
  }, [availableFields, selectedFields]);

  // Remove field from selection
  const removeField = useCallback((fieldKey) => {
    setSelectedFields(prev => prev.filter(field => field.key !== fieldKey));
  }, []);

  // Update report configuration
  const updateConfig = useCallback((key, value) => {
    setReportConfig(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Add filter
  const addFilter = useCallback(() => {
    const newFilter = {
      id: Date.now(),
      field: '',
      operator: 'equals',
      value: '',
      type: 'string'
    };
    updateConfig('filters', [...reportConfig.filters, newFilter]);
  }, [reportConfig.filters, updateConfig]);

  // Update filter
  const updateFilter = useCallback((filterId, key, value) => {
    const updatedFilters = reportConfig.filters.map(filter =>
      filter.id === filterId ? { ...filter, [key]: value } : filter
    );
    updateConfig('filters', updatedFilters);
  }, [reportConfig.filters, updateConfig]);

  // Remove filter
  const removeFilter = useCallback((filterId) => {
    const updatedFilters = reportConfig.filters.filter(filter => filter.id !== filterId);
    updateConfig('filters', updatedFilters);
  }, [reportConfig.filters, updateConfig]);

  // Generate preview
  const generatePreview = useCallback(async () => {
    if (selectedFields.length === 0) {
      alert('Please select at least one field for the report');
      return;
    }

    try {
      // This would typically fetch data from the API
      // For now, we'll use mock data
      const mockData = Array.from({ length: 10 }, (_, index) => {
        const row = {};
        selectedFields.forEach(field => {
          row[field.key] = `Sample ${field.label} ${index + 1}`;
        });
        return row;
      });

      setPreviewData(mockData);
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Error generating preview. Please try again.');
    }
  }, [selectedFields]);

  // Generate and download report
  const generateReport = useCallback(async () => {
    if (selectedFields.length === 0) {
      alert('Please select at least one field for the report');
      return;
    }

    setIsGenerating(true);
    try {
      // Prepare export options
      const exportOptions = {
        data: previewData || [], // In real implementation, fetch actual data
        format: reportConfig.format,
        fields: selectedFields.map(field => field.key),
        filename: `${reportConfig.title || 'report'}_${Date.now()}.${reportConfig.format}`,
        metadata: {
          title: reportConfig.title,
          description: reportConfig.description,
          generatedAt: new Date().toISOString(),
          fields: selectedFields.map(field => field.label).join(', '),
          filters: reportConfig.filters.length > 0 ? 
            reportConfig.filters.map(f => `${f.field} ${f.operator} ${f.value}`).join(', ') : 
            'None'
        }
      };

      // Generate export
      const blob = await exportService.exportData(exportOptions);
      exportService.downloadBlob(blob, exportOptions.filename);

      // Notify parent component
      if (onReportGenerated) {
        onReportGenerated({
          config: reportConfig,
          fields: selectedFields,
          filename: exportOptions.filename
        });
      }

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedFields, reportConfig, previewData, onReportGenerated]);

  return (
    <div className={`report-builder ${className}`}>
      <div className="report-builder__header">
        <h2>Custom Report Builder</h2>
        <p>Drag fields from available to selected to build your custom report</p>
      </div>

      <div className="report-builder__config">
        <div className="config-section">
          <h3>Report Information</h3>
          <div className="form-group">
            <label htmlFor="report-title">Report Title</label>
            <input
              id="report-title"
              type="text"
              value={reportConfig.title}
              onChange={(e) => updateConfig('title', e.target.value)}
              placeholder="Enter report title"
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label htmlFor="report-description">Description</label>
            <textarea
              id="report-description"
              value={reportConfig.description}
              onChange={(e) => updateConfig('description', e.target.value)}
              placeholder="Enter report description"
              className="form-control"
              rows="3"
            />
          </div>
          <div className="form-group">
            <label htmlFor="report-format">Export Format</label>
            <select
              id="report-format"
              value={reportConfig.format}
              onChange={(e) => updateConfig('format', e.target.value)}
              className="form-control"
            >
              {exportService.getSupportedFormats().map(format => (
                <option key={format.value} value={format.value}>
                  {format.label} - {format.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="config-section">
          <h3>Filters</h3>
          <Button 
            type="button" 
            onClick={addFilter}
            className="btn btn-secondary btn-sm"
          >
            Add Filter
          </Button>
          {reportConfig.filters.map(filter => (
            <div key={filter.id} className="filter-row">
              <select
                value={filter.field}
                onChange={(e) => updateFilter(filter.id, 'field', e.target.value)}
                className="form-control form-control-sm"
              >
                <option value="">Select Field</option>
                {availableFields.map(field => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>
              <select
                value={filter.operator}
                onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                className="form-control form-control-sm"
              >
                <option value="equals">Equals</option>
                <option value="contains">Contains</option>
                <option value="starts_with">Starts With</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
              </select>
              <input
                type="text"
                value={filter.value}
                onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                placeholder="Filter value"
                className="form-control form-control-sm"
              />
              <Button
                type="button"
                onClick={() => removeFilter(filter.id)}
                className="btn btn-danger btn-sm"
                aria-label="Remove filter"
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="report-builder__fields">
          <div className="fields-section">
            <h3>Available Fields</h3>
            <Droppable droppableId="available">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`fields-list ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                >
                  {availableFields.map((field, index) => (
                    <Draggable key={field.key} draggableId={field.key} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`field-item ${snapshot.isDragging ? 'dragging' : ''}`}
                        >
                          <span className="field-label">{field.label}</span>
                          <span className="field-type">{field.type}</span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          <div className="fields-section">
            <h3>Selected Fields</h3>
            <Droppable droppableId="selected">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`fields-list selected-fields ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                >
                  {selectedFields.map((field, index) => (
                    <Draggable key={field.key} draggableId={`selected-${field.key}`} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`field-item selected ${snapshot.isDragging ? 'dragging' : ''}`}
                        >
                          <span className="field-label">{field.label}</span>
                          <Button
                            type="button"
                            onClick={() => removeField(field.key)}
                            className="remove-field"
                            aria-label={`Remove ${field.label}`}
                          >
                            ×
                          </Button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {selectedFields.length === 0 && (
                    <div className="empty-state">
                      Drag fields here to include in your report
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>

      {previewData && (
        <div className="report-builder__preview">
          <h3>Preview</h3>
          <div className="preview-table">
            <table>
              <thead>
                <tr>
                  {selectedFields.map(field => (
                    <th key={field.key}>{field.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 5).map((row, index) => (
                  <tr key={index}>
                    {selectedFields.map(field => (
                      <td key={field.key}>{row[field.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 5 && (
              <p className="preview-note">
                Showing first 5 rows of {previewData.length} total records
              </p>
            )}
          </div>
        </div>
      )}

      <div className="report-builder__actions">
        <Button
          type="button"
          onClick={generatePreview}
          className="btn btn-secondary"
          disabled={selectedFields.length === 0}
        >
          Generate Preview
        </Button>
        <Button
          type="button"
          onClick={generateReport}
          className="btn btn-primary"
          disabled={selectedFields.length === 0 || isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Report'}
        </Button>
      </div>
    </div>
  );
};

export default ReportBuilder;