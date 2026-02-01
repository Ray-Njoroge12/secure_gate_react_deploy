/**
 * @fileoverview Bulk Operations Panel - Task 13
 * @description Provides bulk action capabilities for admin operations
 * including multi-select, progress tracking, CSV import, and batch processing.
 */

import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import './BulkOperationsPanel.css';

const BulkOperationsPanel = ({
  items = [],
  itemType = 'item',
  actions = [],
  onBulkAction,
  onImport,
  renderItem,
  idField = 'id',
  searchField = 'name',
}) => {
  const { user } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOperation, setActiveOperation] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: 'idle' });
  const [importPreview, setImportPreview] = useState(null);

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const value = item[searchField];
    return value && String(value).toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item[idField])));
    }
    setSelectAll(!selectAll);
  }, [selectAll, filteredItems, idField]);

  const handleToggleItem = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkAction = useCallback(
    async (action) => {
      if (selectedIds.size === 0) {
        toast.warning(`Select at least one ${itemType} first.`);
        return;
      }

      const ids = Array.from(selectedIds);
      setActiveOperation(action.key);
      setProgress({ current: 0, total: ids.length, status: 'running' });

      try {
        if (onBulkAction) {
          await onBulkAction(action.key, ids, (current) => {
            setProgress((prev) => ({ ...prev, current }));
          });
        }
        setProgress((prev) => ({ ...prev, status: 'complete' }));
        toast.success(`${action.label} completed for ${ids.length} ${itemType}(s).`);
        setSelectedIds(new Set());
        setSelectAll(false);
      } catch (err) {
        setProgress((prev) => ({ ...prev, status: 'error' }));
        toast.error(err.message || `${action.label} failed.`);
      } finally {
        setTimeout(() => {
          setActiveOperation(null);
          setProgress({ current: 0, total: 0, status: 'idle' });
        }, 2000);
      }
    },
    [selectedIds, onBulkAction, itemType, toast]
  );

  const handleCancelOperation = useCallback(() => {
    setProgress((prev) => ({ ...prev, status: 'cancelled' }));
    setActiveOperation(null);
  }, []);

  const handleFileSelect = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const lines = text.split('\n').filter((l) => l.trim());
          const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
          const rows = lines.slice(1).map((line) => {
            const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
            const obj = {};
            headers.forEach((h, i) => {
              obj[h] = values[i] || '';
            });
            return obj;
          });

          setImportPreview({ headers, rows, filename: file.name });
        } catch (err) {
          toast.error('Failed to parse CSV file. Please check the format.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [toast]
  );

  const handleConfirmImport = useCallback(async () => {
    if (!importPreview || !onImport) return;

    setActiveOperation('import');
    setProgress({ current: 0, total: importPreview.rows.length, status: 'running' });

    try {
      await onImport(importPreview.rows, (current) => {
        setProgress((prev) => ({ ...prev, current }));
      });
      setProgress((prev) => ({ ...prev, status: 'complete' }));
      toast.success(`Imported ${importPreview.rows.length} ${itemType}(s) successfully.`);
      setImportPreview(null);
    } catch (err) {
      setProgress((prev) => ({ ...prev, status: 'error' }));
      toast.error(err.message || 'Import failed.');
    } finally {
      setTimeout(() => {
        setActiveOperation(null);
        setProgress({ current: 0, total: 0, status: 'idle' });
      }, 2000);
    }
  }, [importPreview, onImport, itemType, toast]);

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="bulk-operations-panel">
      {/* Toolbar */}
      <div className="bulk-toolbar">
        <div className="bulk-toolbar-left">
          <label className="select-all-checkbox">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAll}
              aria-label={`Select all ${itemType}s`}
            />
            <span>
              {selectedIds.size > 0
                ? `${selectedIds.size} selected`
                : `Select all`}
            </span>
          </label>

          <input
            type="text"
            className="bulk-search"
            placeholder={`Search ${itemType}s...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={`Search ${itemType}s`}
          />
        </div>

        <div className="bulk-toolbar-right">
          {actions.map((action) => (
            <button
              key={action.key}
              className={`bulk-action-btn ${action.variant || 'default'}`}
              onClick={() => handleBulkAction(action)}
              disabled={selectedIds.size === 0 || activeOperation !== null}
              aria-label={action.label}
            >
              {action.icon && <span className="action-icon">{action.icon}</span>}
              {action.label}
            </button>
          ))}

          {onImport && (
            <>
              <button
                className="bulk-action-btn import"
                onClick={() => fileInputRef.current?.click()}
                disabled={activeOperation !== null}
              >
                Import CSV
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                aria-label="Import CSV file"
              />
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {activeOperation && (
        <div className="bulk-progress" role="progressbar" aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100">
          <div className="progress-header">
            <span className="progress-label">
              {progress.status === 'running'
                ? `Processing ${progress.current} of ${progress.total}...`
                : progress.status === 'complete'
                ? 'Complete!'
                : progress.status === 'error'
                ? 'Error occurred'
                : 'Cancelled'}
            </span>
            {progress.status === 'running' && (
              <button className="cancel-btn" onClick={handleCancelOperation}>
                Cancel
              </button>
            )}
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${progress.status}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Import Preview */}
      {importPreview && (
        <div className="import-preview">
          <div className="import-header">
            <h4>Import Preview: {importPreview.filename}</h4>
            <span>{importPreview.rows.length} rows found</span>
          </div>
          <div className="import-table-wrapper">
            <table className="import-table">
              <thead>
                <tr>
                  {importPreview.headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importPreview.rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {importPreview.headers.map((h) => (
                      <td key={h}>{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {importPreview.rows.length > 5 && (
              <p className="import-more">
                ...and {importPreview.rows.length - 5} more rows
              </p>
            )}
          </div>
          <div className="import-actions">
            <button className="cancel-btn" onClick={() => setImportPreview(null)}>
              Cancel
            </button>
            <button className="confirm-btn" onClick={handleConfirmImport}>
              Confirm Import ({importPreview.rows.length} rows)
            </button>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="bulk-items-list" role="list">
        {filteredItems.length === 0 ? (
          <div className="bulk-empty">
            <p>No {itemType}s found{searchQuery ? ` matching "${searchQuery}"` : ''}.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item[idField]}
              className={`bulk-item ${selectedIds.has(item[idField]) ? 'selected' : ''}`}
              role="listitem"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(item[idField])}
                onChange={() => handleToggleItem(item[idField])}
                aria-label={`Select ${item[searchField] || item[idField]}`}
              />
              {renderItem ? renderItem(item) : (
                <span className="item-label">{item[searchField] || item[idField]}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BulkOperationsPanel;
