/**
 * @fileoverview Data Export & Reporting Panel - Task 15
 * @description Multi-format export with field selection, scheduled reports,
 * and template management.
 */

import React, { useState, useCallback } from 'react';

import { useAuth } from '../../contexts/AuthContext.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import './DataExportPanel.css';
import Button from '../ui/Button';

const EXPORT_FORMATS = [
  { key: 'csv', label: 'CSV', icon: '📊', description: 'Comma-separated values, opens in Excel/Sheets' },
  { key: 'pdf', label: 'PDF', icon: '📄', description: 'Formatted document, ideal for reports' },
  { key: 'xlsx', label: 'Excel', icon: '📗', description: 'Native Excel format with formatting' },
  { key: 'json', label: 'JSON', icon: '{ }', description: 'Structured data for integrations' },
];

const DataExportPanel = ({
  dataType = 'data',
  availableFields = [],
  onExport,
  onScheduleReport,
  templates = [],
  onSaveTemplate,
}) => {
  const { user } = useAuth();
  const toast = useToast();

  const [format, setFormat] = useState('csv');
  const [selectedFields, setSelectedFields] = useState(new Set(availableFields.map((f) => f.key)));
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isExporting, setIsExporting] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedule, setSchedule] = useState({
    frequency: 'weekly',
    day: '1',
    time: '08:00',
    email: user?.email || '',
    name: '',
  });
  const [templateName, setTemplateName] = useState('');

  const toggleField = useCallback((key) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAllFields = useCallback(() => {
    setSelectedFields(new Set(availableFields.map((f) => f.key)));
  }, [availableFields]);

  const deselectAllFields = useCallback(() => {
    setSelectedFields(new Set());
  }, []);

  const handleExport = useCallback(async () => {
    if (selectedFields.size === 0) {
      toast.warning('Select at least one field to export.');
      return;
    }

    setIsExporting(true);
    try {
      if (onExport) {
        await onExport({
          format,
          fields: Array.from(selectedFields),
          dateRange: dateRange.start && dateRange.end ? dateRange : null,
        });
      }
      toast.success(`${dataType} exported as ${format.toUpperCase()} successfully.`);
    } catch (err) {
      toast.error(err.message || 'Export failed.');
    } finally {
      setIsExporting(false);
    }
  }, [format, selectedFields, dateRange, onExport, dataType, toast]);

  const handleScheduleReport = useCallback(async () => {
    if (!schedule.name.trim()) {
      toast.warning('Enter a name for this scheduled report.');
      return;
    }
    if (!schedule.email.trim()) {
      toast.warning('Enter an email for delivery.');
      return;
    }

    try {
      if (onScheduleReport) {
        await onScheduleReport({
          ...schedule,
          format,
          fields: Array.from(selectedFields),
          dateRange: dateRange.start && dateRange.end ? dateRange : null,
        });
      }
      toast.success(`Scheduled report "${schedule.name}" created.`);
      setShowSchedule(false);
    } catch (err) {
      toast.error(err.message || 'Failed to schedule report.');
    }
  }, [schedule, format, selectedFields, dateRange, onScheduleReport, toast]);

  const handleSaveTemplate = useCallback(() => {
    if (!templateName.trim()) {
      toast.warning('Enter a template name.');
      return;
    }
    if (onSaveTemplate) {
      onSaveTemplate({
        name: templateName,
        format,
        fields: Array.from(selectedFields),
      });
      toast.success(`Template "${templateName}" saved.`);
      setTemplateName('');
    }
  }, [templateName, format, selectedFields, onSaveTemplate, toast]);

  const loadTemplate = useCallback((tpl) => {
    setFormat(tpl.format || 'csv');
    setSelectedFields(new Set(tpl.fields || []));
    toast.info(`Loaded template "${tpl.name}".`);
  }, [toast]);

  return (
    <div className="data-export-panel">
      <div className="export-header">
        <h3>Export {dataType}</h3>
      </div>

      {/* Format Selection */}
      <div className="format-section">
        <h4 id="format-heading">Format</h4>
        <div className="format-grid" role="radiogroup" aria-labelledby="format-heading">
          {EXPORT_FORMATS.map((f) => (
            <Button
              key={f.key}
              className={`format-card ${format === f.key ? 'active' : ''}`}
              onClick={() => setFormat(f.key)}
              role="radio"
              aria-checked={format === f.key}
              aria-label={`${f.label} format: ${f.description}`}
            >
              <span className="format-icon">{f.icon}</span>
              <span className="format-label">{f.label}</span>
              <span className="format-desc">{f.description}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Field Selection */}
      <div className="fields-section">
        <div className="fields-header">
          <h4>Fields ({selectedFields.size}/{availableFields.length})</h4>
          <div className="fields-actions">
            <Button className="link-btn" onClick={selectAllFields}>Select All</Button>
            <Button className="link-btn" onClick={deselectAllFields}>Deselect All</Button>
          </div>
        </div>
        <div className="fields-grid">
          {availableFields.map((field) => (
            <label key={field.key} className="field-checkbox">
              <input
                type="checkbox"
                checked={selectedFields.has(field.key)}
                onChange={() => toggleField(field.key)}
              />
              <span>{field.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div className="date-section">
        <h4 id="date-range-heading">Date Range (optional)</h4>
        <div className="date-inputs" role="group" aria-labelledby="date-range-heading">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
            aria-label="Start date"
            className="min-h-[44px]"
          />
          <span aria-hidden="true">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
            aria-label="End date"
            className="min-h-[44px]"
          />
        </div>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div className="templates-section">
          <h4>Templates</h4>
          <div className="template-list">
            {templates.map((tpl, i) => (
              <Button key={i} className="template-chip" onClick={() => loadTemplate(tpl)}>
                {tpl.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Save Template */}
      <div className="save-template">
        <input
          type="text"
          placeholder="Save as template..."
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          aria-label="Template name"
        />
        <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>
          Save Template
        </Button>
      </div>

      {/* Actions */}
      <div className="export-actions">
        <Button
          className="export-btn primary"
          onClick={handleExport}
          disabled={isExporting || selectedFields.size === 0}
          aria-busy={isExporting}
          aria-label={isExporting ? 'Exporting data' : `Export data as ${format.toUpperCase()}`}
        >
          {isExporting ? 'Exporting...' : `Export as ${format.toUpperCase()}`}
        </Button>

        {onScheduleReport && (
          <Button
            className="export-btn schedule"
            onClick={() => setShowSchedule(!showSchedule)}
            aria-expanded={showSchedule}
            aria-label={showSchedule ? 'Hide schedule form' : 'Show schedule form'}
          >
            Schedule Report
          </Button>
        )}
      </div>

      {/* Schedule Modal */}
      {showSchedule && (
        <div className="schedule-section">
          <h4>Schedule Recurring Report</h4>
          <div className="schedule-form">
            <div className="schedule-field">
              <label>Report Name</label>
              <input
                type="text"
                value={schedule.name}
                onChange={(e) => setSchedule((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Weekly Visitor Summary"
              />
            </div>
            <div className="schedule-row">
              <div className="schedule-field">
                <label>Frequency</label>
                <select
                  value={schedule.frequency}
                  onChange={(e) => setSchedule((p) => ({ ...p, frequency: e.target.value }))}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="schedule-field">
                <label>Time</label>
                <input
                  type="time"
                  value={schedule.time}
                  onChange={(e) => setSchedule((p) => ({ ...p, time: e.target.value }))}
                />
              </div>
            </div>
            <div className="schedule-field">
              <label>Deliver to Email</label>
              <input
                type="email"
                value={schedule.email}
                onChange={(e) => setSchedule((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className="schedule-actions">
              <Button className="cancel-btn" onClick={() => setShowSchedule(false)}>Cancel</Button>
              <Button className="confirm-btn" onClick={handleScheduleReport}>Create Schedule</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataExportPanel;
